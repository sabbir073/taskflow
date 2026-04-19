"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse } from "@/types";

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

const popupSchema = z.object({
  title: z.string().max(200).optional().default(""),
  image_url: z.string().optional().nullable(),
  text_content: z.string().max(2000).optional().nullable(),
  text_position: z.enum(["top", "bottom"]).default("bottom"),
  target: z.enum(["website", "dashboard"]),
  link_url: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

// Public: get active popups for a specific target
export async function getActivePopups(target: "website" | "dashboard"): Promise<Record<string, unknown>[]> {
  const db = getServerClient();

  // Check the global toggle
  const settingKey = target === "website" ? "enable_website_popup" : "enable_dashboard_popup";
  const { data: setting } = await db.from("settings").select("value").eq("key", settingKey).single();
  const raw = setting ? (setting as Record<string, unknown>).value : true;
  const enabled = raw === true || raw === "true";
  if (!enabled) return [];

  const { data } = await db
    .from("popups")
    .select("*")
    .eq("target", target)
    .eq("is_active", true)
    .order("display_order")
    .order("created_at", { ascending: false });

  return (data || []) as Record<string, unknown>[];
}

// Admin: get ALL popups
export async function getAllPopups(): Promise<Record<string, unknown>[]> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) return [];

  const db = getServerClient();
  const { data } = await db
    .from("popups")
    .select("*")
    .order("target")
    .order("display_order")
    .order("created_at", { ascending: false });

  return (data || []) as Record<string, unknown>[];
}

// Admin: create popup
export async function createPopup(formData: z.infer<typeof popupSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage popups" };

    const validated = popupSchema.parse(formData);
    const db = getServerClient();

    const { error } = await db.from("popups").insert({
      ...validated,
      created_by: session.user.id,
    } as never);
    if (error) return { success: false, error: "Failed to create popup" };
    return { success: true, message: "Popup created" };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to create popup" };
  }
}

// Admin: update popup
export async function updatePopup(
  id: number,
  formData: Partial<z.infer<typeof popupSchema>>
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage popups" };

    const db = getServerClient();
    const update = { ...formData, updated_at: new Date().toISOString() };
    const { error } = await db.from("popups").update(update as never).eq("id", id);
    if (error) return { success: false, error: "Failed to update popup" };
    return { success: true, message: "Popup updated" };
  } catch {
    return { success: false, error: "Failed to update popup" };
  }
}

// Admin: delete popup
export async function deletePopup(id: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Only admins can manage popups" };

    const db = getServerClient();
    const { error } = await db.from("popups").delete().eq("id", id);
    if (error) return { success: false, error: "Failed to delete popup" };
    return { success: true, message: "Popup deleted" };
  } catch {
    return { success: false, error: "Failed to delete popup" };
  }
}
