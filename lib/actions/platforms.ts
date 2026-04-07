"use server";

import { getServerClient } from "@/lib/db/supabase";

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
