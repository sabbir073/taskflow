"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse } from "@/types";

export async function getSettings(category?: string) {
  const db = getServerClient();

  let query = db.from("settings").select("*");
  if (category) query = query.eq("category", category);
  query = query.order("key");

  const { data } = await query;
  return (data || []) as Record<string, unknown>[];
}

export async function getSettingsMap(): Promise<Record<string, unknown>> {
  const settings = await getSettings();
  const map: Record<string, unknown> = {};
  for (const s of settings) {
    map[s.key as string] = s.value;
  }
  return map;
}

export async function updateSetting(key: string, value: unknown): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!["super_admin", "admin"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  const db = getServerClient();
  const { error } = await db
    .from("settings")
    .update({ value } as never)
    .eq("key", key);

  if (error) return { success: false, error: "Failed to update setting" };
  return { success: true, message: "Setting updated" };
}

export async function getLandingContent() {
  const db = getServerClient();
  const { data } = await db
    .from("landing_content")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  return (data || []) as Record<string, unknown>[];
}

export async function updateLandingContent(
  sectionKey: string,
  content: Record<string, unknown>
): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const db = getServerClient();
  const { error } = await db
    .from("landing_content")
    .update({ content } as never)
    .eq("section_key", sectionKey);

  if (error) return { success: false, error: "Failed to update content" };
  return { success: true, message: "Content updated" };
}
