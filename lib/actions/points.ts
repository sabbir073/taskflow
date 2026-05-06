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

  // Use UTC for the day boundary so a non-UTC server doesn't shift the
  // award window relative to the `created_at` rows (which are stored in
  // UTC). Without this, a Bangladesh-time server (UTC+6) flips its
  // "today" boundary 6 hours before UTC midnight — early-morning UTC
  // queries would count yesterday's award as today's and skip the new
  // bonus, while late-evening UTC users could earn twice in a calendar day.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

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
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);

  let newStreak = 1;
  if (lastActive && lastActive >= yesterday) {
    newStreak = ((p.current_streak as number) || 0) + 1;
  }

  const longestStreak = Math.max(newStreak, (p.longest_streak as number) || 0);
  const basePoints = 5;
  const multiplier = newStreak >= 7 ? 1.5 : 1;
  const points = Math.floor(basePoints * multiplier);

  // Award points atomically. The unique partial index added in
  // migration 040 means concurrent calls (two browser tabs racing past
  // the SELECT above) will see one INSERT succeed and the other fail
  // with unique_violation — we swallow that as a no-op so the loser
  // simply gets the same `{ awarded: false }` answer they would have
  // gotten if the SELECT had caught it.
  const { error: rpcErr } = await db.rpc("adjust_user_points", {
    p_user_id: session.user.id,
    p_delta: points,
    p_action: "daily_login",
    p_description: `Daily login bonus${multiplier > 1 ? " (streak bonus!)" : ""}`,
    p_reference_type: null,
    p_reference_id: null,
  } as never);
  if (rpcErr) {
    // 23505 is Postgres unique_violation; anything else is a real error.
    if ((rpcErr as unknown as { code?: string }).code === "23505") {
      return { awarded: false, points: 0 };
    }
    console.error("[awardDailyLoginBonus] rpc failed", rpcErr);
    return { awarded: false, points: 0 };
  }

  await db
    .from("profiles")
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_active_at: new Date().toISOString(),
    } as never)
    .eq("user_id", session.user.id);

  return { awarded: true, points };
}

export async function getLeaderboard(
  scope: "global" | "group",
  timeFilter: "all_time" | "this_month" | "this_week" | "today",
  groupId?: number,
) {
  const db = getServerClient();

  let groupMemberIds: string[] | null = null;
  if (scope === "group" && groupId) {
    const { data: memberIds } = await db
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    if (memberIds) {
      groupMemberIds = (memberIds as Record<string, unknown>[]).map((m) => m.user_id as string);
    }
  }

  if (timeFilter === "all_time") {
    let query = db
      .from("profiles")
      .select("user_id, total_points, tasks_completed, current_streak, users!inner(id, name, image)")
      .eq("status", "active")
      .order("total_points", { ascending: false })
      .limit(100);

    if (groupMemberIds) query = query.in("user_id", groupMemberIds);

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

  const boundary = new Date();
  boundary.setUTCHours(0, 0, 0, 0);
  if (timeFilter === "this_week") boundary.setUTCDate(boundary.getUTCDate() - 6);
  else if (timeFilter === "this_month") boundary.setUTCDate(1);

  let historyQuery = db
    .from("points_history")
    .select("user_id, amount")
    .gte("created_at", boundary.toISOString());
  if (groupMemberIds) historyQuery = historyQuery.in("user_id", groupMemberIds);

  const { data: history } = await historyQuery;
  const totals = new Map<string, number>();
  for (const r of ((history || []) as Record<string, unknown>[])) {
    const uid = String(r.user_id);
    totals.set(uid, (totals.get(uid) || 0) + Number(r.amount || 0));
  }

  const sorted = [...totals.entries()]
    .filter(([, pts]) => pts > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);
  if (sorted.length === 0) return [];

  const userIds = sorted.map(([uid]) => uid);
  const { data: profiles } = await db
    .from("profiles")
    .select("user_id, tasks_completed, current_streak, status, users!inner(id, name, image)")
    .in("user_id", userIds)
    .eq("status", "active");

  const profileMap = new Map<string, Record<string, unknown>>();
  for (const p of ((profiles || []) as Record<string, unknown>[])) {
    profileMap.set(String(p.user_id), p);
  }

  return sorted
    .filter(([uid]) => profileMap.has(uid))
    .map(([uid, points], i) => {
      const profile = profileMap.get(uid)!;
      const user = profile.users as Record<string, unknown>;
      return {
        rank: i + 1,
        user_id: uid,
        name: String(user?.name || "Unknown"),
        image: user?.image as string | null,
        total_points: Number(points || 0),
        tasks_completed: Number(profile.tasks_completed || 0),
        current_streak: Number(profile.current_streak || 0),
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
