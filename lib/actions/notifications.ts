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

export async function markAsRead(notificationId: number): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const db = getServerClient();
  await db.from("notifications").update({ is_read: true } as never).eq("id", notificationId).eq("user_id", session.user.id);
  return { success: true };
}

export async function markAllAsRead(): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const db = getServerClient();
  await db.from("notifications").update({ is_read: true } as never).eq("user_id", session.user.id).eq("is_read", false);
  return { success: true, message: "All marked as read" };
}

export async function deleteNotification(notificationId: number): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const db = getServerClient();
  await db.from("notifications").delete().eq("id", notificationId).eq("user_id", session.user.id);
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
