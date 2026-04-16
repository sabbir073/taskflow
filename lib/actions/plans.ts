"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { computeExpiresAt } from "@/lib/currency";
import type { ApiResponse } from "@/types";

export async function getPlans() {
  const db = getServerClient();
  const { data } = await db.from("plans").select("*").eq("is_active", true).order("display_order");
  return (data || []) as Record<string, unknown>[];
}

export async function getMySubscription() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getServerClient();
  const { data } = await db
    .from("user_subscriptions")
    .select("*, plans!inner(*)")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Return the row regardless of expiry so the UI can show "expired" state
  return data as Record<string, unknown> | null;
}

// Returns the user's current quota usage for their active plan.
// Used by the plan page to render the quota card.
export async function getMyQuotaUsage(): Promise<{
  tasksUsed: number; tasksLimit: number | null;
  groupsUsed: number; groupsLimit: number | null;
  startsAt: string | null; expiresAt: string | null;
  planName: string | null; periodType: string | null;
  isExpired: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { tasksUsed: 0, tasksLimit: 0, groupsUsed: 0, groupsLimit: 0, startsAt: null, expiresAt: null, planName: null, periodType: null, isExpired: false };
  }

  const db = getServerClient();
  const { data: subs } = await db
    .from("user_subscriptions")
    .select("starts_at, expires_at, period_type, plan_id, plans!inner(name, max_tasks, max_groups)")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = ((subs || []) as Record<string, unknown>[])[0] || null;
  if (!sub) {
    return { tasksUsed: 0, tasksLimit: 0, groupsUsed: 0, groupsLimit: 0, startsAt: null, expiresAt: null, planName: null, periodType: null, isExpired: false };
  }

  const plan = sub.plans as Record<string, unknown> | undefined;
  const tasksLimit = plan?.max_tasks == null ? null : Number(plan.max_tasks);
  const groupsLimit = plan?.max_groups == null ? null : Number(plan.max_groups);
  const startsAt = sub.starts_at ? String(sub.starts_at) : null;
  const expiresAt = sub.expires_at ? String(sub.expires_at) : null;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;

  const windowStart = startsAt || new Date(0).toISOString();
  const [{ count: tasksUsed }, { count: groupsUsed }] = await Promise.all([
    db.from("tasks").select("id", { count: "exact", head: true }).eq("created_by", session.user.id).gte("created_at", windowStart),
    db.from("groups").select("id", { count: "exact", head: true }).eq("created_by", session.user.id).gte("created_at", windowStart),
  ]);

  return {
    tasksUsed: tasksUsed || 0,
    tasksLimit,
    groupsUsed: groupsUsed || 0,
    groupsLimit,
    startsAt,
    expiresAt,
    planName: plan ? String(plan.name || "") : null,
    periodType: (sub.period_type as string | null) || null,
    isExpired,
  };
}

// Returns the subscription gating state for the dashboard UI
export async function getMySubscriptionStatus(): Promise<{
  required: boolean;
  hasActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  planName: string | null;
  periodType: string | null;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { required: false, hasActive: false, isExpired: false, expiresAt: null, planName: null, periodType: null };
  }

  const db = getServerClient();
  const { data: setting } = await db.from("settings").select("value").eq("key", "require_subscription").single();
  const raw = setting ? (setting as Record<string, unknown>).value : false;
  const required = raw === true || raw === "true";

  const { data: subs } = await db
    .from("user_subscriptions")
    .select("expires_at, period_type, plans!inner(name)")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = ((subs || []) as Record<string, unknown>[])[0] || null;
  if (!sub) {
    return { required, hasActive: false, isExpired: false, expiresAt: null, planName: null, periodType: null };
  }

  const expiresAt = (sub.expires_at as string | null) || null;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;
  const plan = sub.plans as Record<string, unknown> | undefined;

  return {
    required,
    hasActive: !isExpired,
    isExpired,
    expiresAt,
    planName: plan ? String(plan.name || "") : null,
    periodType: (sub.period_type as string | null) || null,
  };
}

// computeExpiresAt lives in lib/currency.ts — imported above

export async function subscribe(planId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Get plan details
    const { data: plan } = await db.from("plans").select("*").eq("id", planId).single();
    if (!plan) return { success: false, error: "Plan not found" };
    const p = plan as Record<string, unknown>;

    const expiresAt = computeExpiresAt(String(p.period || "monthly"));

    // Deactivate previous subscriptions
    await db.from("user_subscriptions").update({ status: "cancelled" } as never)
      .eq("user_id", session.user.id).eq("status", "active");

    // Create new subscription
    await db.from("user_subscriptions").insert({
      user_id: session.user.id,
      plan_id: planId,
      period_type: String(p.period || "monthly"),
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
      status: "active",
    } as never);

    return { success: true, message: `Subscribed to ${p.name} plan` };
  } catch {
    return { success: false, error: "Failed to subscribe" };
  }
}

export async function checkSubscriptionRequired(): Promise<{ required: boolean; hasSubscription: boolean }> {
  const db = getServerClient();
  const session = await auth();

  const { data: setting } = await db.from("settings").select("value").eq("key", "require_subscription").single();
  const required = setting && ((setting as Record<string, unknown>).value === true || (setting as Record<string, unknown>).value === "true");

  if (!required) return { required: false, hasSubscription: true };

  if (!session?.user?.id) return { required: true, hasSubscription: false };

  const { data: sub } = await db.from("user_subscriptions").select("id")
    .eq("user_id", session.user.id).eq("status", "active").limit(1);

  return { required: true, hasSubscription: !!sub && (sub as unknown[]).length > 0 };
}

// Admin: fetch every plan regardless of is_active — for plan management UI
export async function getAllPlans() {
  const session = await auth();
  if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role)) return [];
  const db = getServerClient();
  const { data } = await db.from("plans").select("*").order("display_order", { ascending: true }).order("id");
  return (data || []) as Record<string, unknown>[];
}

// ===== Admin: Plan CRUD =====

const planSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  currency: z.enum(["usd", "bdt"]).default("bdt"),
  period: z.enum(["monthly", "yearly", "forever"]).default("monthly"),
  description: z.string().optional().default(""),
  features: z.array(z.string()).default([]),
  max_tasks: z.number().int().nullable().optional(),
  max_groups: z.number().int().nullable().optional(),
  included_credits: z.number().min(0).default(0),
  support_level: z.enum(["none", "community", "priority"]).default("none"),
  price_monthly: z.number().min(0).nullable().optional(),
  price_half_yearly: z.number().min(0).nullable().optional(),
  price_yearly: z.number().min(0).nullable().optional(),
  support_ticket_access: z.enum(["none", "medium", "high"]).default("none"),
  is_active: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export async function createPlan(formData: z.infer<typeof planSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const validated = planSchema.parse(formData);
    const db = getServerClient();

    const { error } = await db.from("plans").insert({
      ...validated,
      features: JSON.stringify(validated.features),
    } as never);
    if (error) return { success: false, error: "Failed to create plan" };
    return { success: true, message: "Plan created" };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to create plan" };
  }
}

export async function updatePlan(planId: number, formData: Partial<z.infer<typeof planSchema>>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const update: Record<string, unknown> = { ...formData };
    if (formData.features) update.features = JSON.stringify(formData.features);

    const { error } = await db.from("plans").update(update as never).eq("id", planId);
    if (error) return { success: false, error: "Failed to update plan" };
    return { success: true, message: "Plan updated" };
  } catch {
    return { success: false, error: "Failed to update plan" };
  }
}

export async function deletePlan(planId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Drop any existing subscriptions that reference this plan so the delete
    // can go through without FK errors. Users will no longer have access,
    // which matches admin intent when explicitly deleting a plan.
    await db.from("user_subscriptions").delete().eq("plan_id", planId);

    // Also drop any pending payments that reference this plan
    await db.from("payments").delete().eq("plan_id", planId);

    const { error } = await db.from("plans").delete().eq("id", planId);
    if (error) return { success: false, error: "Failed to delete plan" };
    return { success: true, message: "Plan deleted" };
  } catch {
    return { success: false, error: "Failed to delete plan" };
  }
}

// Admin: assign subscription to any user. Accepts an optional period
// (monthly / half_yearly / yearly) so the admin can mirror the same
// tier flow as paid self-service subscriptions. Credits the plan's
// included_credits to the user's wallet and notifies them.
export async function adminAssignSubscription(
  userId: string,
  planId: number,
  period?: "monthly" | "half_yearly" | "yearly"
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    const { data: plan } = await db.from("plans").select("*").eq("id", planId).single();
    if (!plan) return { success: false, error: "Plan not found" };
    const p = plan as Record<string, unknown>;

    const periodType = period || String(p.period || "monthly");
    const expiresAt = computeExpiresAt(periodType);

    // Cancel existing active subs
    await db.from("user_subscriptions").update({ status: "cancelled" } as never)
      .eq("user_id", userId).eq("status", "active");

    await db.from("user_subscriptions").insert({
      user_id: userId,
      plan_id: planId,
      period_type: periodType,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
      status: "active",
      notified_expiring_7d: false,
      notified_expiring_1d: false,
      notified_expired: false,
    } as never);

    // Credit the plan's included credits to the user's wallet
    const includedCredits = Number(p.included_credits || 0);
    if (includedCredits > 0) {
      const { data: profile } = await db
        .from("profiles")
        .select("total_points")
        .eq("user_id", userId)
        .single();
      const balance = profile ? Number((profile as Record<string, unknown>).total_points || 0) : 0;
      await db.from("profiles").update({ total_points: balance + includedCredits } as never).eq("user_id", userId);

      await db.from("points_history").insert({
        user_id: userId,
        amount: includedCredits,
        action: "milestone",
        description: `Plan credits from "${String(p.name || "")}" (assigned by admin)`,
        reference_type: "admin",
        reference_id: session.user.id,
      } as never);
    }

    // Notify the user
    const label = periodType === "yearly" ? "Yearly" : periodType === "half_yearly" ? "6 Months" : "Monthly";
    await db.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: "Plan Activated",
      message: `An admin assigned you the ${String(p.name || "")} plan (${label})${includedCredits > 0 ? ` and credited ${includedCredits.toFixed(2)} points to your wallet` : ""}.`,
      link: "/dashboard",
      data: { plan_id: planId, period: periodType, credits: includedCredits },
    } as never);

    return { success: true, message: `${p.name} plan assigned to user` };
  } catch {
    return { success: false, error: "Failed to assign subscription" };
  }
}

// Admin: get user's current subscription
export async function getUserSubscription(userId: string) {
  const db = getServerClient();
  const { data } = await db
    .from("user_subscriptions")
    .select("*, plans!inner(name, price, period)")
    .eq("user_id", userId).eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1).single();
  return data as Record<string, unknown> | null;
}
