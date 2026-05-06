"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

export async function getNotifications(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("notifications")
    .select("*", { count: "exact" })
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

export async function getUnreadCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const db = getServerClient();
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false);

  return count || 0;
}

// Block suspended/banned users from mutating their notifications, matching
// the rest of the app — `auth()` alone isn't enough.
async function requireActiveUser(): Promise<{ userId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const db = getServerClient();
  const { data: profile } = await db
    .from("profiles")
    .select("status")
    .eq("user_id", session.user.id)
    .single();
  const status = profile ? String((profile as Record<string, unknown>).status || "active") : "active";
  if (status !== "active") return { error: "Your account is not active" };
  return { userId: session.user.id };
}

export async function markAsRead(notificationId: number): Promise<ApiResponse> {
  const gate = await requireActiveUser();
  if ("error" in gate) return { success: false, error: gate.error };

  const db = getServerClient();
  await db.from("notifications").update({ is_read: true } as never).eq("id", notificationId).eq("user_id", gate.userId);
  return { success: true };
}

export async function markAllAsRead(): Promise<ApiResponse> {
  const gate = await requireActiveUser();
  if ("error" in gate) return { success: false, error: gate.error };

  const db = getServerClient();
  await db.from("notifications").update({ is_read: true } as never).eq("user_id", gate.userId).eq("is_read", false);
  return { success: true, message: "All marked as read" };
}

export async function deleteNotification(notificationId: number): Promise<ApiResponse> {
  const gate = await requireActiveUser();
  if ("error" in gate) return { success: false, error: gate.error };

  const db = getServerClient();
  await db.from("notifications").delete().eq("id", notificationId).eq("user_id", gate.userId);
  return { success: true };
}

// Internal: create notification (called by other server actions)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>,
  link?: string
) {
  const db = getServerClient();
  await db.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    data: data || {},
    link: link || null,
  } as never);
}
