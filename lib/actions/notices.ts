"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse } from "@/types";

const noticeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().max(5000).optional().default(""),
  is_active: z.boolean().optional().default(true),
});

function isAdminRole(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

// Public: fetch all active notices for the dashboard
export async function getActiveNotices(): Promise<Record<string, unknown>[]> {
  const db = getServerClient();
  const { data } = await db
    .from("notices")
    .select("id, title, body, created_at, updated_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data || []) as Record<string, unknown>[];
}

// Admin: fetch all notices (active + inactive)
export async function getAllNotices(): Promise<Record<string, unknown>[]> {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) return [];

  const db = getServerClient();
  const { data } = await db
    .from("notices")
    .select("*, users!notices_created_by_fkey(name, email)")
    .order("created_at", { ascending: false });
  return (data || []) as Record<string, unknown>[];
}

export async function createNotice(formData: {
  title: string;
  body?: string;
  is_active?: boolean;
}): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isAdminRole(session.user.role)) return { success: false, error: "Only admins can create notices" };

    const validated = noticeSchema.parse(formData);
    const db = getServerClient();

    const { error } = await db.from("notices").insert({
      title: validated.title,
      body: validated.body || "",
      is_active: validated.is_active,
      created_by: session.user.id,
    } as never);

    if (error) return { success: false, error: "Failed to create notice" };
    return { success: true, message: "Notice published" };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Validation error" };
    }
    return { success: false, error: "Failed to create notice" };
  }
}

export async function updateNotice(
  noticeId: number,
  formData: { title?: string; body?: string; is_active?: boolean }
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isAdminRole(session.user.role)) return { success: false, error: "Only admins can edit notices" };

    const db = getServerClient();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (formData.title !== undefined) update.title = formData.title;
    if (formData.body !== undefined) update.body = formData.body;
    if (formData.is_active !== undefined) update.is_active = formData.is_active;

    const { error } = await db.from("notices").update(update as never).eq("id", noticeId);
    if (error) return { success: false, error: "Failed to update notice" };
    return { success: true, message: "Notice updated" };
  } catch {
    return { success: false, error: "Failed to update notice" };
  }
}

export async function deleteNotice(noticeId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isAdminRole(session.user.role)) return { success: false, error: "Only admins can delete notices" };

    const db = getServerClient();
    const { error } = await db.from("notices").delete().eq("id", noticeId);
    if (error) return { success: false, error: "Failed to delete notice" };
    return { success: true, message: "Notice deleted" };
  } catch {
    return { success: false, error: "Failed to delete notice" };
  }
}
