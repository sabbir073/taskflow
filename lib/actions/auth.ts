"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { getServerClient } from "@/lib/db/supabase";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAdminNewSignupAlert,
} from "@/lib/email";
import { checkRate, formatRetryAfter } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

// Caller IP (best-effort — trusted only as a rate-limit key, never for auth).
async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least 1 special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function registerUser(formData: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  planId?: number;
  payment?: {
    payment_method_id: number;
    transaction_id: string;
    notes?: string;
  };
}): Promise<ApiResponse> {
  try {
    // Rate limit per IP — 3 signups/hour prevents trivial account flooding
    const ip = await getIp();
    const rate = checkRate("register", ip, 3, 60 * 60 * 1000);
    if (!rate.allowed) {
      return { success: false, error: `Too many attempts — try again in ${formatRetryAfter(rate.retryAfterSec)}` };
    }

    const validated = registerSchema.parse(formData);
    const db = getServerClient();

    // Check if email already exists
    const { data: existing } = await db
      .from("users")
      .select("id")
      .eq("email", validated.email)
      .single();

    if (existing) {
      return { success: false, error: "An account with this email already exists" };
    }

    // Is subscription required for signup?
    const { data: subSetting } = await db.from("settings").select("value").eq("key", "require_subscription").single();
    const subRequired = subSetting && (
      (subSetting as Record<string, unknown>).value === true ||
      (subSetting as Record<string, unknown>).value === "true"
    );

    const passwordHash = await hash(validated.password, 12);

    // Create user - cast to any since we don't have generated Supabase types
    const { data: user, error } = await (db
      .from("users")
      .insert({ name: validated.name, email: validated.email, password_hash: passwordHash } as never)
      .select("id")
      .single());

    if (error || !user) {
      return { success: false, error: "Failed to create account" };
    }

    // Profile is auto-created by the database trigger
    const userId = ((user as Record<string, unknown>).id) as string;

    // Check if user approval is required
    const { data: approvalSetting } = await db
      .from("settings")
      .select("value")
      .eq("key", "require_user_approval")
      .single();

    const requireApproval = approvalSetting && (
      (approvalSetting as Record<string, unknown>).value === true ||
      (approvalSetting as Record<string, unknown>).value === "true"
    );

    // --- Subscription handling ---
    // If subscriptions are required: honor the plan picked during signup.
    //   - Paid plan with payment info → create PENDING subscription + pending payment row (admin will review)
    //   - Free plan → create active subscription immediately
    // If subscriptions are NOT required: auto-subscribe to the MOST expensive plan (max).
    if (subRequired && formData.planId) {
      const { data: plan } = await db.from("plans").select("price, currency, period").eq("id", formData.planId).single();
      const planRec = plan as Record<string, unknown> | null;
      const price = planRec ? Number(planRec.price || 0) : 0;
      const planCurrency = planRec ? String(planRec.currency || "usd") : "usd";
      const period = planRec ? String(planRec.period || "monthly") : "monthly";

      if (price > 0) {
        if (!formData.payment) {
          return { success: false, error: "Payment details are required for paid plans" };
        }

        // Convert the plan's price into the selected payment method's currency
        const { data: methodRow } = await db
          .from("payment_methods")
          .select("currency")
          .eq("id", formData.payment.payment_method_id)
          .single();
        const methodCurrency = methodRow ? String((methodRow as Record<string, unknown>).currency || "usd") : "usd";

        const { data: rateSetting } = await db.from("settings").select("value").eq("key", "usd_to_bdt_rate").single();
        let rateRaw: unknown = rateSetting ? (rateSetting as Record<string, unknown>).value : 0;
        if (typeof rateRaw === "string") { try { rateRaw = JSON.parse(rateRaw); } catch { rateRaw = Number(rateRaw); } }
        const rate = Number(rateRaw || 0);

        let convertedAmount = price;
        let convertedCurrency = planCurrency;
        if (planCurrency !== methodCurrency && rate > 0) {
          if (planCurrency === "usd" && methodCurrency === "bdt") { convertedAmount = price * rate; convertedCurrency = "bdt"; }
          else if (planCurrency === "bdt" && methodCurrency === "usd") { convertedAmount = price / rate; convertedCurrency = "usd"; }
        }

        // Record the pending payment — admin reviews from /payments
        await db.from("payments").insert({
          user_id: userId,
          purpose: "signup",
          plan_id: formData.planId,
          amount: Number(convertedAmount.toFixed(2)),
          currency: convertedCurrency,
          payment_method_id: formData.payment.payment_method_id,
          transaction_id: formData.payment.transaction_id,
          notes: formData.payment.notes || null,
          status: "pending",
        } as never);

        // Hold subscription inactive until admin approves the payment
        await db.from("user_subscriptions").insert({
          user_id: userId, plan_id: formData.planId,
          starts_at: new Date().toISOString(), expires_at: null, status: "pending",
        } as never);

        // Paid signups always need admin approval regardless of the toggle
        await db.from("profiles").update({ is_approved: false } as never).eq("user_id", userId);
      } else {
        // Free plan — active immediately
        let expiresAt: string | null = null;
        if (period === "monthly") { const d = new Date(); d.setMonth(d.getMonth() + 1); expiresAt = d.toISOString(); }
        else if (period === "yearly") { const d = new Date(); d.setFullYear(d.getFullYear() + 1); expiresAt = d.toISOString(); }
        await db.from("user_subscriptions").insert({
          user_id: userId, plan_id: formData.planId,
          starts_at: new Date().toISOString(), expires_at: expiresAt, status: "active",
        } as never);
      }
    } else if (!subRequired) {
      // Auto-assign the top plan (highest price) so the user has "max" access
      const { data: topPlan } = await db
        .from("plans")
        .select("id, period")
        .eq("is_active", true)
        .order("price", { ascending: false })
        .limit(1);
      const topId = topPlan && (topPlan as Record<string, unknown>[])[0]?.id as number | undefined;
      if (topId) {
        const period = String((topPlan as Record<string, unknown>[])[0]?.period || "forever");
        let expiresAt: string | null = null;
        if (period === "monthly") { const d = new Date(); d.setMonth(d.getMonth() + 1); expiresAt = d.toISOString(); }
        else if (period === "yearly") { const d = new Date(); d.setFullYear(d.getFullYear() + 1); expiresAt = d.toISOString(); }
        await db.from("user_subscriptions").insert({
          user_id: userId, plan_id: topId,
          starts_at: new Date().toISOString(), expires_at: expiresAt, status: "active",
        } as never);
      }
    }

    // Notify admins on any new signup that needs attention (in-app + email)
    if (requireApproval || (subRequired && formData.payment)) {
      const { data: admins } = await db
        .from("users")
        .select("id, email, profiles!inner(role)")
        .in("profiles.role", ["super_admin", "admin"]);
      const adminRows = (admins || []) as Record<string, unknown>[];
      const adminIds = adminRows.map((a) => a.id as string);
      const adminEmails = adminRows.map((a) => a.email as string).filter(Boolean);
      if (adminIds.length > 0) {
        const reason = subRequired && formData.payment
          ? `${validated.name} signed up and submitted a payment. Please review.`
          : `${validated.name} signed up and is pending approval.`;
        const notifs = adminIds.map((uid) => ({
          user_id: uid,
          type: "system",
          title: "New Signup — Review Needed",
          message: reason,
          link: subRequired && formData.payment ? "/payments" : "/users",
          data: { user_id: userId },
        }));
        await db.from("notifications").insert(notifs as never[]);
        if (adminEmails.length > 0) {
          await sendAdminNewSignupAlert(adminEmails, { name: validated.name, email: validated.email });
        }
      }
    }

    if (requireApproval || (subRequired && formData.payment)) {
      await db.from("profiles").update({ is_approved: false } as never).eq("user_id", userId);
      return {
        success: true,
        message: subRequired && formData.payment
          ? "Account created! Your payment is pending admin review."
          : "Account created! Your account is pending admin approval.",
      };
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.from("verification_tokens").insert({
      identifier: validated.email,
      token,
      expires: expires.toISOString(),
    } as never);

    // Welcome email doubles as the verification email — the user can verify
    // now or later (it's optional, not a blocker for login).
    try {
      await sendWelcomeEmail(validated.email, validated.name, token);
    } catch {
      // Don't fail registration if email fails
    }

    return { success: true, message: "Account created! Check your email for your welcome message." };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstIssue = (err as z.ZodError).issues?.[0];
      return { success: false, error: firstIssue?.message || "Validation error" };
    }
    return { success: false, error: "Something went wrong" };
  }
}

export async function verifyEmail(token: string): Promise<ApiResponse> {
  try {
    const db = getServerClient();

    const { data: tokenData, error } = await db
      .from("verification_tokens")
      .select("identifier, expires")
      .eq("token", token)
      .single();

    if (error || !tokenData) {
      return { success: false, error: "Invalid or expired verification link" };
    }

    const record = tokenData as Record<string, unknown>;
    if (new Date(record.expires as string) < new Date()) {
      await db.from("verification_tokens").delete().eq("token", token);
      return { success: false, error: "Verification link has expired" };
    }

    await db
      .from("users")
      .update({ email_verified: new Date().toISOString() } as never)
      .eq("email", record.identifier as string);

    await db.from("verification_tokens").delete().eq("token", token);

    return { success: true, message: "Email verified successfully!" };
  } catch {
    return { success: false, error: "Verification failed" };
  }
}

export async function forgotPassword(email: string): Promise<ApiResponse> {
  try {
    // Rate limit per email — stops spray attempts. Response is always neutral
    // (we don't expose whether the account exists) so the rate limit also
    // doesn't leak that info.
    const rate = checkRate("forgot-password", email.toLowerCase().trim(), 3, 60 * 60 * 1000);
    if (!rate.allowed) {
      return { success: true, message: "If an account exists, a reset link has been sent." };
    }

    const db = getServerClient();

    const { data: user } = await db
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      return { success: true, message: "If an account exists, a reset link has been sent." };
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.from("verification_tokens").insert({
      identifier: email,
      token,
      expires: expires.toISOString(),
    } as never);

    try {
      await sendPasswordResetEmail(email, token);
    } catch {
      // Silent fail
    }

    return { success: true, message: "If an account exists, a reset link has been sent." };
  } catch {
    return { success: false, error: "Something went wrong" };
  }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ApiResponse> {
  try {
    const passwordSchema = z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/);

    passwordSchema.parse(newPassword);

    const db = getServerClient();

    const { data: tokenData, error } = await db
      .from("verification_tokens")
      .select("identifier, expires")
      .eq("token", token)
      .single();

    if (error || !tokenData) {
      return { success: false, error: "Invalid or expired reset link" };
    }

    const record = tokenData as Record<string, unknown>;
    if (new Date(record.expires as string) < new Date()) {
      await db.from("verification_tokens").delete().eq("token", token);
      return { success: false, error: "Reset link has expired" };
    }

    const passwordHash = await hash(newPassword, 12);

    await db
      .from("users")
      .update({ password_hash: passwordHash } as never)
      .eq("email", record.identifier as string);

    await db.from("verification_tokens").delete().eq("token", token);

    return { success: true, message: "Password reset successfully!" };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Password does not meet requirements" };
    }
    return { success: false, error: "Something went wrong" };
  }
}
