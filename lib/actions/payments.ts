"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { convertCurrency } from "@/lib/currency";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

type DB = ReturnType<typeof getServerClient>;

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

async function notifyAdmins(
  db: DB,
  title: string,
  message: string,
  link: string,
  data: Record<string, unknown> = {}
) {
  const { data: admins } = await db.from("profiles").select("user_id").in("role", ["super_admin", "admin"]);
  const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
  if (adminIds.length === 0) return;
  const notifs = adminIds.map((uid) => ({
    user_id: uid,
    type: "system",
    title,
    message,
    link,
    data,
  }));
  await db.from("notifications").insert(notifs as never[]);
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================
const paymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  logo_url: z.string().optional().nullable(),
  currency: z.enum(["usd", "bdt"]).default("usd"),
  qr_code_url: z.string().optional().nullable(),
  instruction: z.string().max(5000).optional().default(""),
  is_active: z.boolean().optional().default(true),
  display_order: z.number().int().optional().default(0),
});

export async function getActivePaymentMethods(): Promise<Record<string, unknown>[]> {
  const db = getServerClient();
  const { data } = await db
    .from("payment_methods")
    .select("*")
    .eq("is_active", true)
    .order("display_order")
    .order("name");
  return (data || []) as Record<string, unknown>[];
}

// Public — doesn't require auth. Used by the signup form to decide whether
// to show plan selection + payment step.
export async function isSubscriptionRequired(): Promise<boolean> {
  const db = getServerClient();
  const { data } = await db.from("settings").select("value").eq("key", "require_subscription").single();
  if (!data) return false;
  const raw = (data as Record<string, unknown>).value;
  return raw === true || raw === "true";
}

// Public — 1 USD = N BDT. Read from settings for live currency conversion.
export async function getUsdToBdtRate(): Promise<number> {
  const db = getServerClient();
  const { data } = await db.from("settings").select("value").eq("key", "usd_to_bdt_rate").single();
  if (!data) return 0;
  let raw: unknown = (data as Record<string, unknown>).value;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = Number(raw); }
  }
  const n = Number(raw || 0);
  return isFinite(n) && n > 0 ? n : 0;
}

// convertCurrency lives in lib/currency.ts — imported above

export async function getAllPaymentMethods(): Promise<Record<string, unknown>[]> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) return [];
  const db = getServerClient();
  const { data } = await db.from("payment_methods").select("*").order("display_order").order("name");
  return (data || []) as Record<string, unknown>[];
}

export async function createPaymentMethod(formData: z.infer<typeof paymentMethodSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage payment methods" };

    const validated = paymentMethodSchema.parse(formData);
    const db = getServerClient();
    const { error } = await db.from("payment_methods").insert(validated as never);
    if (error) return { success: false, error: "Failed to create payment method" };
    return { success: true, message: "Payment method added" };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to create payment method" };
  }
}

export async function updatePaymentMethod(
  id: number,
  formData: Partial<z.infer<typeof paymentMethodSchema>>
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage payment methods" };

    const db = getServerClient();
    const update = { ...formData, updated_at: new Date().toISOString() };
    const { error } = await db.from("payment_methods").update(update as never).eq("id", id);
    if (error) return { success: false, error: "Failed to update payment method" };
    return { success: true, message: "Payment method updated" };
  } catch {
    return { success: false, error: "Failed to update payment method" };
  }
}

export async function deletePaymentMethod(id: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage payment methods" };

    const db = getServerClient();
    const { error } = await db.from("payment_methods").delete().eq("id", id);
    if (error) return { success: false, error: "Failed to delete payment method" };
    return { success: true, message: "Payment method deleted" };
  } catch {
    return { success: false, error: "Failed to delete payment method" };
  }
}

// ============================================================================
// POINT PACKAGES
// ============================================================================
const pointPackageSchema = z.object({
  name: z.string().min(1).max(100),
  points: z.number().positive(),
  price: z.number().positive(),
  currency: z.enum(["usd", "bdt"]).default("usd"),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional().default(true),
  display_order: z.number().int().optional().default(0),
});

export async function getActivePointPackages(): Promise<Record<string, unknown>[]> {
  const db = getServerClient();
  const { data } = await db
    .from("point_packages")
    .select("*")
    .eq("is_active", true)
    .order("display_order")
    .order("price");
  return (data || []) as Record<string, unknown>[];
}

export async function getAllPointPackages(): Promise<Record<string, unknown>[]> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) return [];
  const db = getServerClient();
  const { data } = await db.from("point_packages").select("*").order("display_order").order("price");
  return (data || []) as Record<string, unknown>[];
}

export async function createPointPackage(formData: z.infer<typeof pointPackageSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage point packages" };

    const validated = pointPackageSchema.parse(formData);
    const db = getServerClient();
    const { error } = await db.from("point_packages").insert(validated as never);
    if (error) return { success: false, error: "Failed to create package" };
    return { success: true, message: "Point package added" };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to create package" };
  }
}

export async function updatePointPackage(
  id: number,
  formData: Partial<z.infer<typeof pointPackageSchema>>
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage point packages" };
    const db = getServerClient();
    const update = { ...formData, updated_at: new Date().toISOString() };
    const { error } = await db.from("point_packages").update(update as never).eq("id", id);
    if (error) return { success: false, error: "Failed to update package" };
    return { success: true, message: "Point package updated" };
  } catch {
    return { success: false, error: "Failed to update package" };
  }
}

export async function deletePointPackage(id: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage point packages" };
    const db = getServerClient();
    const { error } = await db.from("point_packages").delete().eq("id", id);
    if (error) return { success: false, error: "Failed to delete package" };
    return { success: true, message: "Point package deleted" };
  } catch {
    return { success: false, error: "Failed to delete package" };
  }
}

// ============================================================================
// PAYMENT SUBMISSIONS (user-facing)
// ============================================================================
const paymentSubmitSchema = z.object({
  purpose: z.enum(["subscription", "points"]),
  plan_id: z.number().int().positive().optional(),
  package_id: z.number().int().positive().optional(),
  period: z.enum(["monthly", "half_yearly", "yearly"]).optional(),
  payment_method_id: z.number().int().positive(),
  transaction_id: z.string().min(1, "Transaction ID is required").max(200),
  notes: z.string().max(2000).optional().nullable(),
});

export async function submitPayment(formData: z.infer<typeof paymentSubmitSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = paymentSubmitSchema.parse(formData);
    const db = getServerClient();

    // Resolve base amount + currency from the referenced record
    let baseAmount = 0;
    let baseCurrency = "usd";
    let pointsAmount: number | null = null;
    let description = "";

    if (validated.purpose === "subscription") {
      if (!validated.plan_id) return { success: false, error: "Plan is required" };
      const { data: plan } = await db
        .from("plans")
        .select("name, price, currency, period, price_monthly, price_half_yearly, price_yearly")
        .eq("id", validated.plan_id)
        .single();
      if (!plan) return { success: false, error: "Plan not found" };
      const p = plan as Record<string, unknown>;
      const period = validated.period || "monthly";
      // Pick the tier price; fall back to the base price column
      const tierPrice =
        period === "yearly" ? p.price_yearly
        : period === "half_yearly" ? p.price_half_yearly
        : p.price_monthly;
      baseAmount = tierPrice != null ? Number(tierPrice) : Number(p.price || 0);
      baseCurrency = String(p.currency || "usd");
      const periodLabel = period === "yearly" ? "Yearly" : period === "half_yearly" ? "6-Month" : "Monthly";
      description = `Subscription — ${String(p.name || "")} (${periodLabel})`;
    } else if (validated.purpose === "points") {
      if (!validated.package_id) return { success: false, error: "Package is required" };
      const { data: pkg } = await db
        .from("point_packages")
        .select("name, points, price, currency")
        .eq("id", validated.package_id)
        .single();
      if (!pkg) return { success: false, error: "Point package not found" };
      const p = pkg as Record<string, unknown>;
      baseAmount = Number(p.price || 0);
      baseCurrency = String(p.currency || "usd");
      pointsAmount = Number(p.points || 0);
      description = `Points — ${String(p.name || "")}`;
    }

    // Convert the base amount into the currency of the selected payment method
    const { data: methodRow } = await db
      .from("payment_methods")
      .select("currency")
      .eq("id", validated.payment_method_id)
      .single();
    const methodCurrency = methodRow ? String((methodRow as Record<string, unknown>).currency || "usd") : "usd";
    const rate = await getUsdToBdtRate();
    const converted = convertCurrency(baseAmount, baseCurrency, methodCurrency, rate);
    const amount = Number(converted.amount.toFixed(2));
    const currency = converted.currency;

    // Block if an identical pending payment already exists
    const { data: existing } = await db
      .from("payments")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("transaction_id", validated.transaction_id)
      .eq("status", "pending")
      .limit(1);
    if (existing && (existing as unknown[]).length > 0) {
      return { success: false, error: "A payment with this transaction ID is already pending review" };
    }

    // Store the chosen period in notes for now (no dedicated column); review
    // flow can parse it back to set subscription expiry.
    const combinedNotes = [
      validated.period ? `[period:${validated.period}]` : null,
      validated.notes ? validated.notes : null,
    ].filter(Boolean).join(" ");

    const { error } = await db.from("payments").insert({
      user_id: session.user.id,
      purpose: validated.purpose,
      plan_id: validated.plan_id || null,
      package_id: validated.package_id || null,
      points_amount: pointsAmount,
      amount,
      currency,
      payment_method_id: validated.payment_method_id,
      transaction_id: validated.transaction_id,
      notes: combinedNotes || null,
      status: "pending",
    } as never);

    if (error) return { success: false, error: "Failed to submit payment" };

    const userName = session.user.name || "A user";
    await notifyAdmins(
      db,
      "New Payment — Review Needed",
      `${userName} submitted a payment: ${description}. Please review.`,
      `/payments`,
      { user_id: session.user.id, purpose: validated.purpose, transaction_id: validated.transaction_id }
    );

    // Acknowledgement to the user
    await db.from("notifications").insert({
      user_id: session.user.id,
      type: "system",
      title: "Payment Received — Processing",
      message: `We've received your payment for ${description}. An admin will review it shortly.`,
      link: "/plans",
      data: { purpose: validated.purpose, transaction_id: validated.transaction_id },
    } as never);

    return { success: true, message: "Payment submitted — awaiting admin review" };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to submit payment" };
  }
}

// Internal helper used by registerUser — creates the signup payment row.
export async function createSignupPayment(data: {
  userId: string;
  planId: number;
  paymentMethodId: number;
  transactionId: string;
  notes?: string;
}): Promise<ApiResponse> {
  try {
    const db = getServerClient();
    const { data: plan } = await db
      .from("plans")
      .select("name, price, currency")
      .eq("id", data.planId)
      .single();
    if (!plan) return { success: false, error: "Plan not found" };
    const pr = plan as Record<string, unknown>;
    const basePrice = Number(pr.price || 0);
    const baseCurrency = String(pr.currency || "usd");

    const { data: methodRow } = await db
      .from("payment_methods")
      .select("currency")
      .eq("id", data.paymentMethodId)
      .single();
    const methodCurrency = methodRow ? String((methodRow as Record<string, unknown>).currency || "usd") : "usd";
    const rate = await getUsdToBdtRate();
    const converted = convertCurrency(basePrice, baseCurrency, methodCurrency, rate);

    const { error } = await db.from("payments").insert({
      user_id: data.userId,
      purpose: "signup",
      plan_id: data.planId,
      amount: Number(converted.amount.toFixed(2)),
      currency: converted.currency,
      payment_method_id: data.paymentMethodId,
      transaction_id: data.transactionId,
      notes: data.notes || null,
      status: "pending",
    } as never);
    if (error) return { success: false, error: "Failed to record signup payment" };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to record signup payment" };
  }
}

export async function getMyPayments(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("payments")
    .select("*, payment_methods(name, logo_url, currency), plans(name), point_packages(name, points)", { count: "exact" })
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ============================================================================
// ADMIN REVIEW QUEUE
// ============================================================================
export async function getAllPayments(
  params?: PaginationParams & { status?: string; purpose?: string }
): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("payments")
    .select(
      "*, users!payments_user_id_fkey(id, name, email, image), payment_methods(name, logo_url, currency), plans(name), point_packages(name, points)",
      { count: "exact" }
    );

  if (params?.status) query = query.eq("status", params.status);
  if (params?.purpose) query = query.eq("purpose", params.purpose);

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function reviewPayment(
  paymentId: number,
  action: "approve" | "reject",
  notes?: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isAdmin(session.user.role)) return { success: false, error: "Only admins can review payments" };

    const db = getServerClient();
    const { data: payment } = await db
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (!payment) return { success: false, error: "Payment not found" };
    const p = payment as Record<string, unknown>;

    if (p.status !== "pending") return { success: false, error: "This payment has already been reviewed" };

    const newStatus = action === "approve" ? "approved" : "rejected";
    await db.from("payments").update({
      status: newStatus,
      review_notes: notes || null,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never).eq("id", paymentId);

    const userId = p.user_id as string | null;

    if (action === "approve" && userId) {
      const purpose = String(p.purpose || "");

      if (purpose === "subscription" || purpose === "signup") {
        const planId = p.plan_id as number | null;
        let includedCredits = 0;
        let planName = "";
        if (planId) {
          // Parse the chosen period out of the stored notes tag (added by submitPayment)
          const notesStr = String(p.notes || "");
          const m = notesStr.match(/\[period:(monthly|half_yearly|yearly)\]/);
          let periodType = m ? m[1] : null;

          // Deactivate existing subs
          await db.from("user_subscriptions").update({ status: "cancelled" } as never).eq("user_id", userId).eq("status", "active");

          // Fetch plan + included credits
          const { data: plan } = await db.from("plans").select("name, period, included_credits").eq("id", planId).single();
          if (plan) {
            const pr = plan as Record<string, unknown>;
            includedCredits = Number(pr.included_credits || 0);
            planName = String(pr.name || "");
            if (!periodType) periodType = String(pr.period || "monthly");
          } else if (!periodType) {
            periodType = "monthly";
          }

          // Compute expiry
          let expiresAt: string | null = null;
          const now = new Date();
          if (periodType === "monthly") { now.setMonth(now.getMonth() + 1); expiresAt = now.toISOString(); }
          else if (periodType === "half_yearly") { now.setMonth(now.getMonth() + 6); expiresAt = now.toISOString(); }
          else if (periodType === "yearly") { now.setFullYear(now.getFullYear() + 1); expiresAt = now.toISOString(); }

          await db.from("user_subscriptions").insert({
            user_id: userId,
            plan_id: planId,
            period_type: periodType,
            status: "active",
            expires_at: expiresAt,
            notified_expiring_7d: false,
            notified_expiring_1d: false,
            notified_expired: false,
          } as never);

          // Credit the plan's included credits to the user's wallet
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
              description: `Plan credits from "${planName}" subscription (+${includedCredits.toFixed(2)} pts)`,
              reference_type: "payment",
              reference_id: String(paymentId),
            } as never);

            // Dedicated notification so the user sees the credit drop
            await db.from("notifications").insert({
              user_id: userId,
              type: "points_earned",
              title: "Plan Credits Added",
              message: `${includedCredits.toFixed(2)} credits from your ${planName} plan have been added to your wallet.`,
              link: "/dashboard",
              data: { payment_id: paymentId, plan_id: planId, credits: includedCredits },
            } as never);
          }
        }

        // For signup payments, also approve the user's profile
        if (purpose === "signup") {
          await db.from("profiles").update({ is_approved: true } as never).eq("user_id", userId);
        }
      } else if (purpose === "points") {
        const points = Number(p.points_amount || 0);
        if (points > 0) {
          const { data: profile } = await db.from("profiles").select("total_points").eq("user_id", userId).single();
          const balance = profile ? Number((profile as Record<string, unknown>).total_points || 0) : 0;
          await db.from("profiles").update({ total_points: balance + points } as never).eq("user_id", userId);

          await db.from("points_history").insert({
            user_id: userId,
            amount: points,
            action: "milestone",
            description: `Points purchase approved (+${points.toFixed(2)} pts)`,
            reference_type: "payment",
            reference_id: String(paymentId),
          } as never);
        }
      }

      await db.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Payment Approved",
        message:
          purpose === "points"
            ? `Your payment was approved — ${Number(p.points_amount || 0).toFixed(2)} points have been added to your wallet.`
            : purpose === "signup"
            ? "Your signup payment was approved — your account is now active."
            : "Your payment was approved — your subscription is now active.",
        link: "/dashboard",
        data: { payment_id: paymentId },
      } as never);

      return { success: true, message: "Payment approved and processed" };
    }

    if (action === "reject" && userId) {
      await db.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Payment Rejected",
        message: `Your payment was rejected${notes ? `: ${notes}` : "."}`,
        link: "/plans",
        data: { payment_id: paymentId },
      } as never);
    }

    return { success: true, message: action === "approve" ? "Payment approved" : "Payment rejected" };
  } catch {
    return { success: false, error: "Failed to review payment" };
  }
}
