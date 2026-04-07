"use server";

import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
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
}): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("profiles")
    .select("*, users!inner(id, name, email, image, created_at)", { count: "exact" });

  if (params.role) query = query.eq("role", params.role);
  if (params.status) query = query.eq("status", params.status);
  if (params.search) {
    query = query.or(`users.name.ilike.%${params.search}%,users.email.ilike.%${params.search}%`);
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

  return {
    user: user as Record<string, unknown>,
    profile: profile as Record<string, unknown> | null,
    stats: { taskCount: taskCount || 0, groupCount: groupCount || 0 },
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
    await db
      .from("profiles")
      .update({ role } as never)
      .eq("user_id", userId);

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
    await db
      .from("profiles")
      .update({ status } as never)
      .eq("user_id", userId);

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

    const { data: profile } = await db
      .from("profiles")
      .select("total_points")
      .eq("user_id", userId)
      .single();

    if (!profile) return { success: false, error: "User not found" };

    const currentBalance = Number((profile as Record<string, unknown>).total_points);
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
      return { success: false, error: `Cannot deduct more than user's balance (${currentBalance.toFixed(2)})` };
    }

    await db
      .from("profiles")
      .update({ total_points: newBalance } as never)
      .eq("user_id", userId);

    await db.from("points_history").insert({
      user_id: userId,
      amount,
      action: amount > 0 ? "milestone" : "penalty",
      description: reason || (amount > 0 ? "Points assigned by admin" : "Points deducted by admin"),
      reference_type: "admin",
      reference_id: session.user.id,
    } as never);

    return { success: true, message: `${amount > 0 ? "+" : ""}${amount.toFixed(2)} points ${amount > 0 ? "assigned to" : "deducted from"} user` };
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
