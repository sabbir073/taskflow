"use server";

import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { sendAccountApprovedEmail, sendVerificationEmail } from "@/lib/email";
import { escapePgLikeOr } from "@/lib/utils";
import { recordAudit } from "@/lib/audit";
import { checkRate, formatRetryAfter } from "@/lib/rate-limit";
import { handleLeaderRemoval } from "@/lib/actions/groups";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

// ===== Get current user's profile =====
export async function getMyProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getServerClient();
  const { data } = await db
    .from("users")
    .select("id, name, email, email_verified, image, created_at")
    .eq("id", session.user.id)
    .single();

  if (!data) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  return { user: data as Record<string, unknown>, profile: profile as Record<string, unknown> | null };
}

// ===== Update own profile =====
const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().max(20).nullable().default(null),
  social_links: z.record(z.string(), z.string()).optional().default({}),
});

export async function updateProfile(formData: {
  name: string;
  phone?: string | null;
  social_links?: Record<string, string>;
  avatar_url?: string;
}): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = profileUpdateSchema.parse(formData);
    const db = getServerClient();

    await db
      .from("users")
      .update({ name: validated.name } as never)
      .eq("id", session.user.id);

    const profileUpdate: Record<string, unknown> = {};
    if (validated.phone !== undefined) profileUpdate.phone = validated.phone;
    if (validated.social_links) profileUpdate.social_links = validated.social_links;
    if (formData.avatar_url) profileUpdate.avatar_url = formData.avatar_url;

    if (Object.keys(profileUpdate).length > 0) {
      await db
        .from("profiles")
        .update(profileUpdate as never)
        .eq("user_id", session.user.id);
    }

    return { success: true, message: "Profile updated" };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Validation error" };
    }
    return { success: false, error: "Failed to update profile" };
  }
}

// ===== Change password =====
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const passwordSchema = z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/);
    passwordSchema.parse(newPassword);

    const db = getServerClient();
    const { data: user } = await db
      .from("users")
      .select("password_hash")
      .eq("id", session.user.id)
      .single();

    if (!user) return { success: false, error: "User not found" };

    const record = user as Record<string, unknown>;
    const isValid = await compare(currentPassword, record.password_hash as string);
    if (!isValid) return { success: false, error: "Current password is incorrect" };

    const newHash = await hash(newPassword, 12);
    await db
      .from("users")
      .update({ password_hash: newHash } as never)
      .eq("id", session.user.id);

    return { success: true, message: "Password changed successfully" };
  } catch {
    return { success: false, error: "Failed to change password" };
  }
}

// ===== Admin: Get users list =====
export async function getUsers(params: PaginationParams & {
  role?: string;
  status?: string;
  approval?: "pending" | "approved";
}): Promise<PaginatedResponse<Record<string, unknown>>> {
  // Admin-only. Any caller without the role gets an empty result rather than
  // raw data — the page route is also gated, but the action must self-guard
  // so a direct client-side invocation can't enumerate users.
  const session = await auth();
  if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("profiles")
    .select("*, users!inner(id, name, email, email_verified, image, created_at)", { count: "exact" });

  if (params.role) query = query.eq("role", params.role);
  if (params.status) query = query.eq("status", params.status);
  if (params.approval === "pending") query = query.eq("is_approved", false);
  if (params.approval === "approved") query = query.eq("is_approved", true);
  const safeSearch = params.search ? escapePgLikeOr(params.search) : "";
  if (safeSearch) {
    query = query.or(`users.name.ilike.%${safeSearch}%,users.email.ilike.%${safeSearch}%`);
  }

  const sortBy = params.sortBy || "created_at";
  const sortOrder = params.sortOrder === "asc";
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ===== Admin: Get single user =====
export async function getUserById(userId: string) {
  // Gated: admin viewing any user, or a user viewing themselves. This is
  // used by the admin "user profile modal" and by the self profile page.
  const session = await auth();
  if (!session?.user?.id) return null;
  const callerIsAdmin = ["super_admin", "admin"].includes(session.user.role);
  if (!callerIsAdmin && session.user.id !== userId) return null;

  const db = getServerClient();

  const { data: user } = await db
    .from("users")
    .select("id, name, email, email_verified, image, created_at")
    .eq("id", userId)
    .single();

  if (!user) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { count: taskCount } = await db
    .from("task_assignments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: groupCount } = await db
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  // Current active subscription (if any)
  const { data: subRow } = await db
    .from("user_subscriptions")
    .select("period_type, expires_at, status, starts_at, plans!inner(name, currency, max_tasks, max_groups, included_credits)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sub = (subRow as Record<string, unknown> | null) || null;
  let subscription: Record<string, unknown> | null = null;
  if (sub) {
    const plan = sub.plans as Record<string, unknown> | undefined;
    const expiresAt = sub.expires_at ? String(sub.expires_at) : null;
    const isExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;
    subscription = {
      planName: plan ? String(plan.name || "") : null,
      periodType: (sub.period_type as string | null) || null,
      expiresAt,
      startsAt: sub.starts_at ? String(sub.starts_at) : null,
      isExpired,
      maxTasks: plan ? (plan.max_tasks as number | null) : null,
      maxGroups: plan ? (plan.max_groups as number | null) : null,
      includedCredits: plan ? Number(plan.included_credits || 0) : 0,
      currency: plan ? String(plan.currency || "usd") : "usd",
    };
  }

  return {
    user: user as Record<string, unknown>,
    profile: profile as Record<string, unknown> | null,
    stats: { taskCount: taskCount || 0, groupCount: groupCount || 0 },
    subscription,
  };
}

// ===== Admin: Update user role =====
export async function updateUserRole(
  userId: string,
  role: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validRoles = ["super_admin", "admin", "group_leader", "user"];
    if (!validRoles.includes(role)) {
      return { success: false, error: "Invalid role" };
    }

    // Only super_admin can assign super_admin role
    if (role === "super_admin" && session.user.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can assign this role" };
    }

    const db = getServerClient();

    // Capture old role so the audit entry shows the before/after.
    const { data: before } = await db.from("profiles").select("role").eq("user_id", userId).single();
    const oldRole = before ? String((before as Record<string, unknown>).role || "") : null;

    await db
      .from("profiles")
      .update({ role } as never)
      .eq("user_id", userId);

    // If they were demoted OUT of group_leader, transfer any groups they own
    if (oldRole === "group_leader" && role !== "group_leader") {
      await handleLeaderRemoval(userId, "leader role removed");
    }

    await recordAudit(db, session.user.id, "role_change", "user", userId, { old_role: oldRole, new_role: role });

    return { success: true, message: "Role updated" };
  } catch {
    return { success: false, error: "Failed to update role" };
  }
}

// ===== Admin: Update user status =====
export async function updateUserStatus(
  userId: string,
  status: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (userId === session.user.id) {
      return { success: false, error: "Cannot change your own status" };
    }

    const validStatuses = ["active", "suspended", "banned"];
    if (!validStatuses.includes(status)) {
      return { success: false, error: "Invalid status" };
    }

    const db = getServerClient();

    const { data: before } = await db.from("profiles").select("status").eq("user_id", userId).single();
    const oldStatus = before ? String((before as Record<string, unknown>).status || "") : null;

    await db
      .from("profiles")
      .update({ status } as never)
      .eq("user_id", userId);

    // If suspending/banning, transfer any groups they lead so they don't
    // become unreachable to members.
    if ((status === "suspended" || status === "banned") && oldStatus === "active") {
      await handleLeaderRemoval(userId, `leader ${status}`);
    }

    await recordAudit(db, session.user.id, "status_change", "user", userId, { old_status: oldStatus, new_status: status });

    return { success: true, message: "Status updated" };
  } catch {
    return { success: false, error: "Failed to update status" };
  }
}

// ===== Admin: Soft delete user =====
export async function deleteUser(userId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (userId === session.user.id) {
      return { success: false, error: "Cannot delete your own account" };
    }

    const db = getServerClient();
    await db
      .from("profiles")
      .update({ status: "banned" } as never)
      .eq("user_id", userId);

    // Anonymize user data
    await db
      .from("users")
      .update({ name: "Deleted User", email: `deleted_${userId}@taskflow.local`, image: null } as never)
      .eq("id", userId);

    // Any group they led transfers to the next senior member (or is archived)
    await handleLeaderRemoval(userId, "leader deleted");

    await recordAudit(db, session.user.id, "delete_user", "user", userId);

    return { success: true, message: "User deleted" };
  } catch {
    return { success: false, error: "Failed to delete user" };
  }
}

// ===== Admin: Assign points to user =====
export async function assignPoints(
  userId: string,
  amount: number,
  reason: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!["super_admin", "admin"].includes(session.user.role)) {
      return { success: false, error: "Only admins can assign points" };
    }
    if (amount === 0) return { success: false, error: "Amount cannot be zero" };

    const db = getServerClient();

    // Atomic adjust — the RPC updates the balance AND inserts points_history
    // in one transaction. Rejects with insufficient_balance if the deduction
    // would go below zero.
    const { error: rpcErr } = await db.rpc("adjust_user_points", {
      p_user_id: userId,
      p_delta: amount,
      p_action: amount > 0 ? "milestone" : "penalty",
      p_description: reason || (amount > 0 ? "Points assigned by admin" : "Points deducted by admin"),
      p_reference_type: "admin",
      p_reference_id: session.user.id,
    } as never);

    if (rpcErr) {
      const msg = String((rpcErr as { message?: string }).message || "");
      if (msg.includes("insufficient_balance")) {
        return { success: false, error: "Cannot deduct more than user's current balance" };
      }
      if (msg.includes("profile_not_found")) {
        return { success: false, error: "User not found" };
      }
      return { success: false, error: "Failed to adjust points" };
    }

    // Notify the user
    const isAdd = amount > 0;
    const absAmount = Math.abs(amount);
    await db.from("notifications").insert({
      user_id: userId,
      type: "points_earned",
      title: isAdd ? "Points Assigned" : "Points Deducted",
      message: isAdd
        ? `You received ${absAmount.toFixed(2)} points from admin${reason ? `: ${reason}` : ""}`
        : `${absAmount.toFixed(2)} points deducted by admin${reason ? `: ${reason}` : ""}`,
      data: { amount, reason, by_admin: session.user.id },
    } as never);

    await recordAudit(db, session.user.id, "assign_points", "user", userId, { amount, reason: reason || null });

    return { success: true, message: `${isAdd ? "+" : "-"}${absAmount.toFixed(2)} points ${isAdd ? "assigned to" : "deducted from"} user` };
  } catch {
    return { success: false, error: "Failed to assign points" };
  }
}

// ===== Get user's point balance =====
export async function getMyBalance(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const db = getServerClient();
  const { data: profile } = await db
    .from("profiles")
    .select("total_points")
    .eq("user_id", session.user.id)
    .single();

  return profile ? Number((profile as Record<string, unknown>).total_points) : 0;
}

// ===== Admin: Approve user signup =====
export async function approveUser(userId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    await db.from("profiles").update({ is_approved: true } as never).eq("user_id", userId);

    // In-app notification + welcome-back email
    const { data: u } = await db.from("users").select("email, name").eq("id", userId).single();
    const row = u as Record<string, unknown> | null;
    const email = String(row?.email || "");
    const name = String(row?.name || "there");

    await db.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: "Account Approved",
      message: "Your account has been approved. You can now sign in and use all features.",
      link: "/dashboard",
    } as never);

    if (email) await sendAccountApprovedEmail(email, name);

    await recordAudit(db, session.user.id, "approve_user", "user", userId);

    return { success: true, message: "User approved" };
  } catch {
    return { success: false, error: "Failed to approve user" };
  }
}

// ===== Resend verification email (self-service from profile page) =====
export async function resendVerificationEmail(): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // 3 sends/hour — plenty for typos, prevents spamming an inbox
    const rate = checkRate("resend-verification", session.user.id, 3, 60 * 60 * 1000);
    if (!rate.allowed) {
      return { success: false, error: `Please wait ${formatRetryAfter(rate.retryAfterSec)} before requesting another verification email` };
    }

    const db = getServerClient();

    const { data: u } = await db
      .from("users")
      .select("email, name, email_verified")
      .eq("id", session.user.id)
      .single();
    const row = u as Record<string, unknown> | null;
    if (!row) return { success: false, error: "User not found" };
    if (row.email_verified) return { success: false, error: "Your email is already verified" };

    const email = String(row.email || "");
    const name = String(row.name || "there");

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Clear any existing open tokens for this identifier so only the latest works
    await db.from("verification_tokens").delete().eq("identifier", email);
    await db.from("verification_tokens").insert({
      identifier: email,
      token,
      expires: expires.toISOString(),
    } as never);

    await sendVerificationEmail(email, token, name);
    return { success: true, message: "Verification email sent — check your inbox" };
  } catch {
    return { success: false, error: "Failed to send verification email" };
  }
}

// ===== Admin: Reject user signup =====
export async function rejectUser(userId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    await db.from("profiles").update({ status: "banned", is_approved: false } as never).eq("user_id", userId);
    await handleLeaderRemoval(userId, "leader rejected");
    await recordAudit(db, session.user.id, "reject_user", "user", userId);
    return { success: true, message: "User rejected" };
  } catch {
    return { success: false, error: "Failed to reject user" };
  }
}

// ===== Admin: Get pending approval users =====
export async function getPendingApprovalUsers(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("profiles")
    .select("*, users!inner(id, name, email, image, created_at)", { count: "exact" })
    .eq("is_approved", false)
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}
