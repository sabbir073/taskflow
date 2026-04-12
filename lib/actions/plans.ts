"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
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

  return data as Record<string, unknown> | null;
}

export async function subscribe(planId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Get plan details
    const { data: plan } = await db.from("plans").select("*").eq("id", planId).single();
    if (!plan) return { success: false, error: "Plan not found" };
    const p = plan as Record<string, unknown>;

    // Calculate expiry
    let expiresAt: string | null = null;
    if (p.period === "monthly") {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      expiresAt = d.toISOString();
    } else if (p.period === "yearly") {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      expiresAt = d.toISOString();
    }
    // "forever" = null expiry

    // Deactivate previous subscriptions
    await db.from("user_subscriptions").update({ status: "cancelled" } as never)
      .eq("user_id", session.user.id).eq("status", "active");

    // Create new subscription
    await db.from("user_subscriptions").insert({
      user_id: session.user.id,
      plan_id: planId,
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

// ===== Admin: Plan CRUD =====

const planSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  period: z.string().default("monthly"),
  description: z.string().optional().default(""),
  features: z.array(z.string()).default([]),
  display_order: z.number().int().default(0),
});

export async function createPlan(formData: z.infer<typeof planSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const validated = planSchema.parse(formData);
    const db = getServerClient();

    await db.from("plans").insert({ ...validated, features: JSON.stringify(validated.features) } as never);
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

    await db.from("plans").update(update as never).eq("id", planId);
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
    await db.from("plans").update({ is_active: false } as never).eq("id", planId);
    return { success: true, message: "Plan deleted" };
  } catch {
    return { success: false, error: "Failed to delete plan" };
  }
}

// Admin: assign subscription to any user
export async function adminAssignSubscription(userId: string, planId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    const { data: plan } = await db.from("plans").select("*").eq("id", planId).single();
    if (!plan) return { success: false, error: "Plan not found" };
    const p = plan as Record<string, unknown>;

    let expiresAt: string | null = null;
    if (p.period === "monthly") {
      const d = new Date(); d.setMonth(d.getMonth() + 1); expiresAt = d.toISOString();
    } else if (p.period === "yearly") {
      const d = new Date(); d.setFullYear(d.getFullYear() + 1); expiresAt = d.toISOString();
    }

    // Cancel existing active subs
    await db.from("user_subscriptions").update({ status: "cancelled" } as never)
      .eq("user_id", userId).eq("status", "active");

    await db.from("user_subscriptions").insert({
      user_id: userId, plan_id: planId,
      starts_at: new Date().toISOString(), expires_at: expiresAt, status: "active",
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
