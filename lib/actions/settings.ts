"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/constants/roles";
import { recordAudit } from "@/lib/audit";
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
  // System settings are admin-only — moderators are deliberately excluded.
  if (!isAdminRole(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  const db = getServerClient();

  // Read the existing value: drives the audit old→new diff AND a type guard.
  // supabase-js returns the JSONB column already parsed to its JS type, so a
  // numeric setting comes back as a number — we use that to keep it numeric.
  const { data: existing } = await db.from("settings").select("value").eq("key", key).single();
  if (!existing) return { success: false, error: "Unknown setting" };
  const oldValue = (existing as Record<string, unknown>).value;

  // Numeric settings must stay numeric — a bad usd_to_bdt would break
  // currency conversion across the whole app. If the stored value is a
  // number, coerce + validate the incoming value before writing.
  let nextValue = value;
  if (typeof oldValue === "number") {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return { success: false, error: "This setting must be a valid number" };
    nextValue = n;
  }

  const { error } = await db
    .from("settings")
    .update({ value: nextValue } as never)
    .eq("key", key);

  if (error) return { success: false, error: "Failed to update setting" };

  // Audit every system-setting change — these toggle platform-wide behavior
  // (subscription gating, currency rate, branding) so the trail matters.
  await recordAudit(db, session.user.id, "setting_update", "setting", key, { old: oldValue ?? null, new: nextValue });

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
  // Landing-page content edits are admin-only — same gate as updateSetting.
  // This action was previously missing the role check, so any authenticated
  // user could POST to it and rewrite the public marketing page.
  if (!isAdminRole(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  const db = getServerClient();
  const { error } = await db
    .from("landing_content")
    .update({ content } as never)
    .eq("section_key", sectionKey);

  if (error) return { success: false, error: "Failed to update content" };
  return { success: true, message: "Content updated" };
}
