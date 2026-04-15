import type { getServerClient } from "@/lib/db/supabase";

type DB = ReturnType<typeof getServerClient>;

// ============================================================================
// ACTIVE SUBSCRIPTION GATE
// ============================================================================
// Returns an error string if the user cannot perform write actions, or null
// if they can. Centralises the "do subscriptions gate this action" rule so
// every server action stays consistent.
export async function checkActiveSubscription(db: DB, userId: string): Promise<string | null> {
  const { data: setting } = await db
    .from("settings")
    .select("value")
    .eq("key", "require_subscription")
    .single();
  const raw = setting ? (setting as Record<string, unknown>).value : false;
  const required = raw === true || raw === "true";
  if (!required) return null;

  const { data: subs } = await db
    .from("user_subscriptions")
    .select("id, expires_at, status")
    .eq("user_id", userId)
    .eq("status", "active");

  const now = Date.now();
  const active = ((subs || []) as Record<string, unknown>[]).find((s) => {
    const exp = s.expires_at as string | null;
    if (!exp) return true;
    return new Date(exp).getTime() > now;
  });

  if (!active) return "Your subscription has expired or is inactive. Please renew to continue.";
  return null;
}

// ============================================================================
// QUOTA CHECKS
// ============================================================================
export type Quota = { used: number; limit: number | null; hasRoom: boolean };

// Counts how many rows of <kind> the user has CREATED since their current
// subscription period started, compared against the plan's max limit.
// Admins always return { hasRoom: true, limit: null }.
export async function getQuota(
  db: DB,
  userId: string,
  kind: "task" | "group"
): Promise<Quota & { error?: string }> {
  // Active subscription lookup
  const { data: subs } = await db
    .from("user_subscriptions")
    .select("starts_at, expires_at, plan_id, plans!inner(max_tasks, max_groups)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = ((subs || []) as Record<string, unknown>[])[0] || null;
  if (!sub) return { used: 0, limit: 0, hasRoom: false, error: "No active subscription" };

  // Block if the subscription has already expired
  const exp = sub.expires_at as string | null;
  if (exp && new Date(exp).getTime() <= Date.now()) {
    return { used: 0, limit: 0, hasRoom: false, error: "Subscription expired" };
  }

  const plan = sub.plans as Record<string, unknown> | undefined;
  const rawLimit = plan ? (kind === "task" ? plan.max_tasks : plan.max_groups) : null;
  const limit = rawLimit == null ? null : Number(rawLimit);

  // Count created in the current billing window
  const table = kind === "task" ? "tasks" : "groups";
  const startsAt = sub.starts_at ? String(sub.starts_at) : new Date(0).toISOString();

  const { count } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", startsAt);

  const used = count || 0;
  const hasRoom = limit == null || used < limit;
  return { used, limit, hasRoom };
}

export async function checkQuota(
  db: DB,
  userId: string,
  role: string | undefined,
  kind: "task" | "group"
): Promise<string | null> {
  // Admins bypass all quotas
  if (["super_admin", "admin"].includes(role || "")) return null;

  // Gate only when subscriptions are required
  const { data: setting } = await db
    .from("settings")
    .select("value")
    .eq("key", "require_subscription")
    .single();
  const raw = setting ? (setting as Record<string, unknown>).value : false;
  const required = raw === true || raw === "true";
  if (!required) return null;

  const quota = await getQuota(db, userId, kind);
  if (!quota.hasRoom) {
    if (quota.limit == null) return null;
    return `You have reached your plan's ${kind} limit (${quota.used} / ${quota.limit}). Please renew or upgrade your plan.`;
  }
  return null;
}

// ============================================================================
// LIFECYCLE NOTIFICATIONS (expiring soon / expired)
// ============================================================================
// Called on every dashboard render. Idempotent via flags on user_subscriptions.
export async function dispatchSubscriptionNotifications(db: DB, userId: string): Promise<void> {
  const { data: subs } = await db
    .from("user_subscriptions")
    .select("id, expires_at, notified_expiring_7d, notified_expiring_1d, notified_expired, plan_id, plans!inner(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = ((subs || []) as Record<string, unknown>[])[0] || null;
  if (!sub) return;

  const expiresAtStr = sub.expires_at as string | null;
  if (!expiresAtStr) return; // forever plans have no expiry

  const expiresAt = new Date(expiresAtStr).getTime();
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((expiresAt - now) / msPerDay);

  const planName = (sub.plans as Record<string, unknown> | undefined)?.name as string | undefined;
  const subId = sub.id as number;
  const plan = planName ? String(planName) : "your plan";

  // Expired
  if (expiresAt <= now && sub.notified_expired !== true) {
    await db.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: "Subscription Expired",
      message: `${plan} has expired. Renew now to keep creating tasks, groups and submitting proofs.`,
      link: "/plans",
      data: { subscription_id: subId, event: "expired" },
    } as never);
    await db.from("user_subscriptions").update({ notified_expired: true } as never).eq("id", subId);
    return;
  }

  // Expiring within 1 day (and not yet expired)
  if (daysLeft <= 1 && daysLeft > 0 && sub.notified_expiring_1d !== true) {
    await db.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: "Subscription Expiring Tomorrow",
      message: `${plan} expires in less than a day. Renew now to avoid losing access.`,
      link: "/plans",
      data: { subscription_id: subId, event: "expiring_1d" },
    } as never);
    await db.from("user_subscriptions").update({ notified_expiring_1d: true } as never).eq("id", subId);
    return;
  }

  // Expiring within 7 days
  if (daysLeft <= 7 && daysLeft > 1 && sub.notified_expiring_7d !== true) {
    await db.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: "Subscription Expiring Soon",
      message: `${plan} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew to keep your access.`,
      link: "/plans",
      data: { subscription_id: subId, event: "expiring_7d" },
    } as never);
    await db.from("user_subscriptions").update({ notified_expiring_7d: true } as never).eq("id", subId);
  }
}
