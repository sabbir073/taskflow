"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { PaginatedResponse, PaginationParams } from "@/types";

export async function getPointsHistory(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("points_history")
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

export async function awardDailyLoginBonus(): Promise<{ awarded: boolean; points: number }> {
  const session = await auth();
  if (!session?.user?.id) return { awarded: false, points: 0 };

  const db = getServerClient();

  // Check if already awarded today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: existing } = await db
    .from("points_history")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("action", "daily_login")
    .gte("created_at", today.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return { awarded: false, points: 0 };

  // Get current streak
  const { data: profile } = await db
    .from("profiles")
    .select("current_streak, longest_streak, last_active_at, total_points")
    .eq("user_id", session.user.id)
    .single();

  if (!profile) return { awarded: false, points: 0 };
  const p = profile as Record<string, unknown>;

  const lastActive = p.last_active_at ? new Date(p.last_active_at as string) : null;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  let newStreak = 1;
  if (lastActive && lastActive >= yesterday) {
    newStreak = ((p.current_streak as number) || 0) + 1;
  }

  const longestStreak = Math.max(newStreak, (p.longest_streak as number) || 0);
  const basePoints = 5;
  const multiplier = newStreak >= 7 ? 1.5 : 1;
  const points = Math.floor(basePoints * multiplier);

  // Award points
  await db.from("points_history").insert({
    user_id: session.user.id,
    amount: points,
    action: "daily_login",
    description: `Daily login bonus${multiplier > 1 ? " (streak bonus!)" : ""}`,
  } as never);

  await db
    .from("profiles")
    .update({
      total_points: ((p.total_points as number) || 0) + points,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_active_at: new Date().toISOString(),
    } as never)
    .eq("user_id", session.user.id);

  return { awarded: true, points };
}

export async function getLeaderboard(scope: "global" | "group", timeFilter: "all_time" | "this_month" | "this_week" | "today", groupId?: number) {
  const db = getServerClient();

  let query = db
    .from("profiles")
    .select("user_id, total_points, tasks_completed, current_streak, users!inner(id, name, image)")
    .eq("status", "active")
    .order("total_points", { ascending: false })
    .limit(100);

  if (scope === "group" && groupId) {
    const { data: memberIds } = await db
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (memberIds) {
      const ids = (memberIds as Record<string, unknown>[]).map((m) => m.user_id as string);
      query = query.in("user_id", ids);
    }
  }

  const { data } = await query;

  return ((data || []) as Record<string, unknown>[]).map((row, i) => {
    const user = row.users as Record<string, unknown>;
    return {
      rank: i + 1,
      user_id: String(row.user_id),
      name: String(user?.name || "Unknown"),
      image: user?.image as string | null,
      total_points: Number(row.total_points || 0),
      tasks_completed: Number(row.tasks_completed || 0),
      current_streak: Number(row.current_streak || 0),
    };
  });
}

export async function getUserBadges(userId?: string) {
  const session = await auth();
  const targetId = userId || session?.user?.id;
  if (!targetId) return [];

  const db = getServerClient();
  const { data } = await db
    .from("user_badges")
    .select("*, badges!inner(name, slug, description, icon, criteria)")
    .eq("user_id", targetId)
    .order("earned_at", { ascending: false });

  return (data || []) as Record<string, unknown>[];
}

export async function getAllBadges() {
  const db = getServerClient();
  const { data } = await db
    .from("badges")
    .select("*")
    .eq("is_active", true)
    .order("id");

  return (data || []) as Record<string, unknown>[];
}
