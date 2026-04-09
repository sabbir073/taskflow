"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import type { ApiResponse } from "@/types";

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
}): Promise<ApiResponse> {
  try {
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

    if (requireApproval) {
      await db.from("profiles").update({ is_approved: false } as never).eq("user_id", userId);
      return { success: true, message: "Account created! Your account is pending admin approval." };
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.from("verification_tokens").insert({
      identifier: validated.email,
      token,
      expires: expires.toISOString(),
    } as never);

    try {
      await sendVerificationEmail(validated.email, token);
    } catch {
      // Don't fail registration if email fails
    }

    return { success: true, message: "Account created! Please check your email to verify." };
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
