"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { isStaffRole } from "@/lib/constants/roles";
import { recordAudit } from "@/lib/audit";
import type { ApiResponse } from "@/types";

export async function getPlatforms() {
  const db = getServerClient();
  const { data } = await db
    .from("platforms")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  return (data || []) as Record<string, unknown>[];
}

export async function getTaskTypesByPlatform(platformId: number) {
  const db = getServerClient();
  const { data } = await db
    .from("task_types")
    .select("*")
    .eq("platform_id", platformId)
    .eq("is_active", true)
    .order("name");

  return (data || []) as Record<string, unknown>[];
}

export async function getAllTaskTypes() {
  const db = getServerClient();
  const { data } = await db
    .from("task_types")
    .select("*, platforms!inner(name, slug, icon)")
    .eq("is_active", true)
    .order("platform_id");

  return (data || []) as Record<string, unknown>[];
}

// ===== Admin: list every platform regardless of active flag =====
// Used by the /settings Platforms toggle list. The public getPlatforms()
// always filters is_active=true so it stays exactly as-is for the rest of
// the app.
export async function getAllPlatformsForAdmin(): Promise<Record<string, unknown>[]> {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) return [];
  const db = getServerClient();
  const { data } = await db
    .from("platforms")
    .select("*")
    .order("display_order", { ascending: true });
  return (data || []) as Record<string, unknown>[];
}

// ===== Admin: flip platforms.is_active =====
// Disabled platforms vanish from the create-task picker because
// getPlatforms() filters is_active=true. Existing tasks on the platform
// keep working — only new task creation is blocked.
export async function setPlatformActive(
  platformId: number,
  isActive: boolean
): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!isStaffRole(session.user.role)) return { success: false, error: "Unauthorized" };

  const db = getServerClient();
  const { data: before } = await db
    .from("platforms")
    .select("name, slug, is_active")
    .eq("id", platformId)
    .single();
  if (!before) return { success: false, error: "Platform not found" };

  const { error } = await db
    .from("platforms")
    .update({ is_active: isActive } as never)
    .eq("id", platformId);

  if (error) return { success: false, error: "Failed to update platform" };

  const beforeRow = before as Record<string, unknown>;
  await recordAudit(db, session.user.id, "platform_toggled", "platform", String(platformId), {
    name: String(beforeRow.name || ""),
    slug: String(beforeRow.slug || ""),
    old_active: !!beforeRow.is_active,
    new_active: isActive,
  });

  return { success: true, message: isActive ? "Platform enabled" : "Platform disabled" };
}
