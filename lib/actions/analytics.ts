"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";

export async function getAdminDashboardStats() {
  const db = getServerClient();

  const [tasks, pendingReviews, activeUsers, completedAssignments, totalAssignments] = await Promise.all([
    db.from("tasks").select("id", { count: "exact", head: true }),
    db.from("task_assignments").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("task_assignments").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("task_assignments").select("id", { count: "exact", head: true }),
  ]);

  const total = totalAssignments.count || 1;
  const completed = completedAssignments.count || 0;
  const completionRate = Math.round((completed / total) * 100);

  return {
    totalTasks: tasks.count || 0,
    pendingReviews: pendingReviews.count || 0,
    activeUsers: activeUsers.count || 0,
    completionRate,
  };
}

export async function getUserDashboardStats() {
  const session = await auth();
  if (!session?.user?.id) return { myTasks: 0, pendingTasks: 0, totalPoints: 0, currentRank: 0 };

  const db = getServerClient();
  const userId = session.user.id;

  const [myTasks, pendingTasks, profile, rankResult] = await Promise.all([
    db.from("task_assignments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("task_assignments").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["pending", "in_progress"]),
    db.from("profiles").select("total_points").eq("user_id", userId).single(),
    db.from("profiles").select("user_id").eq("status", "active").order("total_points", { ascending: false }),
  ]);

  const totalPoints = profile.data ? Number((profile.data as Record<string, unknown>).total_points) : 0;
  const rankData = (rankResult.data || []) as Record<string, unknown>[];
  const currentRank = rankData.findIndex((r) => r.user_id === userId) + 1;

  return {
    myTasks: myTasks.count || 0,
    pendingTasks: pendingTasks.count || 0,
    totalPoints,
    currentRank: currentRank || rankData.length + 1,
  };
}

export async function getRecentActivity(limit = 10) {
  const db = getServerClient();

  const { data } = await db
    .from("task_assignments")
    .select("id, status, submitted_at, reviewed_at, points_awarded, users!inner(name), tasks!inner(title)")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data || []) as Record<string, unknown>[];
}

export async function getTopPerformers(limit = 5) {
  const db = getServerClient();

  const { data } = await db
    .from("profiles")
    .select("user_id, total_points, tasks_completed, users!inner(name, image)")
    .eq("status", "active")
    .order("total_points", { ascending: false })
    .limit(limit);

  return (data || []) as Record<string, unknown>[];
}
