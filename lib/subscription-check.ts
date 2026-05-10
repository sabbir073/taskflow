import type { getServerClient } from "@/lib/db/supabase";
import { periodMultiplier } from "@/lib/currency";
import { sendSubscriptionExpiringEmail, sendSubscriptionExpiredEmail } from "@/lib/email";
import { isStaffRole } from "@/lib/constants/roles";

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
    .select("starts_at, expires_at, period_type, plan_id, carry_over_tasks, carry_over_groups, plans!inner(max_tasks, max_groups)")
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
  // Scale the plan's base (monthly) limit by how many months the user paid
  // for. yearly = 12× monthly quota, half_yearly = 6×, monthly = 1×.
  const mult = periodMultiplier(sub.period_type as string | null);
  // Carry-over = leftover quota from the previous subscription that was
  // added to this one at purchase time. It rides on top of the base limit.
  const carry = Number(kind === "task" ? sub.carry_over_tasks : sub.carry_over_groups) || 0;
  const limit = rawLimit == null ? null : Number(rawLimit) * mult + carry;

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
  // Staff (admin + moderator) bypass all quotas
  if (isStaffRole(role)) return null;

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
  if (!expiresAtStr) return; // legacy rows without an expiry — skip

  const expiresAt = new Date(expiresAtStr).getTime();
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((expiresAt - now) / msPerDay);

  const planName = (sub.plans as Record<string, unknown> | undefined)?.name as string | undefined;
  const subId = sub.id as number;
  const plan = planName ? String(planName) : "your plan";

  // Fetch user's email + name once — only used if we actually fire an email.
  async function fetchUser(): Promise<{ email: string; name: string }> {
    const { data: u } = await db.from("users").select("email, name").eq("id", userId).single();
    const row = u as Record<string, unknown> | null;
    return { email: String(row?.email || ""), name: String(row?.name || "there") };
  }

  // Race-safe write pattern: try to flip the flag with a conditional
  // update first; only the caller whose UPDATE actually changed a row
  // proceeds to insert the notification + send the email. Two concurrent
  // dashboard renders that both read the flag as false will see only one
  // of them get rowsAffected=1 — the other gets 0 and bails out.
  async function fireOnce(
    flagColumn: "notified_expired" | "notified_expiring_1d" | "notified_expiring_7d",
    notif: { title: string; message: string; event: string },
    emailSender: () => Promise<void>,
  ) {
    const { data: claimed } = await db
      .from("user_subscriptions")
      .update({ [flagColumn]: true } as never)
      .eq("id", subId)
      .eq(flagColumn, false)
      .select("id");
    if (!claimed || (claimed as Record<string, unknown>[]).length === 0) return;

    await db.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: notif.title,
      message: notif.message,
      link: "/plans",
      data: { subscription_id: subId, event: notif.event },
    } as never);
    await emailSender();
  }

  // Expired
  if (expiresAt <= now && sub.notified_expired !== true) {
    await fireOnce(
      "notified_expired",
      {
        title: "Subscription Expired",
        message: `${plan} has expired. Renew now to keep creating tasks, groups and submitting proofs.`,
        event: "expired",
      },
      async () => {
        const u = await fetchUser();
        if (u.email) await sendSubscriptionExpiredEmail(u.email, u.name, plan);
      },
    );
    return;
  }

  // Expiring within 1 day (and not yet expired)
  if (daysLeft <= 1 && daysLeft > 0 && sub.notified_expiring_1d !== true) {
    await fireOnce(
      "notified_expiring_1d",
      {
        title: "Subscription Expiring Tomorrow",
        message: `${plan} expires in less than a day. Renew now to avoid losing access.`,
        event: "expiring_1d",
      },
      async () => {
        const u = await fetchUser();
        if (u.email) await sendSubscriptionExpiringEmail(u.email, u.name, plan, daysLeft);
      },
    );
    return;
  }

  // Expiring within 7 days
  if (daysLeft <= 7 && daysLeft > 1 && sub.notified_expiring_7d !== true) {
    await fireOnce(
      "notified_expiring_7d",
      {
        title: "Subscription Expiring Soon",
        message: `${plan} expires in ${daysLeft} days. Renew to keep your access.`,
        event: "expiring_7d",
      },
      async () => {
        const u = await fetchUser();
        if (u.email) await sendSubscriptionExpiringEmail(u.email, u.name, plan, daysLeft);
      },
    );
  }
}

// ============================================================================
// QUOTA CARRY-OVER
// ============================================================================
// Called at the moment a new subscription is about to be created (payment
// approved, direct subscribe, admin assign). Returns how many tasks / groups
// the user has LEFT on their current active sub — we then stash those as
// carry_over_X on the new subscription so they aren't lost when the old sub
// is cancelled. Returns zeros if there's no active sub.
export async function computeRemainingQuota(
  db: DB,
  userId: string
): Promise<{ tasks: number; groups: number }> {
  const { data: subs } = await db
    .from("user_subscriptions")
    .select("starts_at, period_type, carry_over_tasks, carry_over_groups, plans!inner(max_tasks, max_groups)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = ((subs || []) as Record<string, unknown>[])[0] || null;
  if (!sub) return { tasks: 0, groups: 0 };

  const plan = sub.plans as Record<string, unknown> | undefined;
  const mult = periodMultiplier(sub.period_type as string | null);
  const carryTasks = Number(sub.carry_over_tasks) || 0;
  const carryGroups = Number(sub.carry_over_groups) || 0;
  const taskLimit = plan?.max_tasks == null ? null : Number(plan.max_tasks) * mult + carryTasks;
  const groupLimit = plan?.max_groups == null ? null : Number(plan.max_groups) * mult + carryGroups;

  const startsAt = sub.starts_at ? String(sub.starts_at) : new Date(0).toISOString();

  const [tasksRes, groupsRes] = await Promise.all([
    db.from("tasks").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", startsAt),
    db.from("groups").select("id", { count: "exact", head: true }).eq("created_by", userId).gte("created_at", startsAt),
  ]);

  const tasksUsed = tasksRes.count || 0;
  const groupsUsed = groupsRes.count || 0;

  return {
    tasks: taskLimit == null ? 0 : Math.max(0, taskLimit - tasksUsed),
    groups: groupLimit == null ? 0 : Math.max(0, groupLimit - groupsUsed),
  };
}
