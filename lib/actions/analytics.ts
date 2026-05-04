"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";

// ===== Dashboard Stats =====

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
  return { totalTasks: tasks.count || 0, pendingReviews: pendingReviews.count || 0, activeUsers: activeUsers.count || 0, completionRate: Math.round((completed / total) * 100) };
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
  return { myTasks: myTasks.count || 0, pendingTasks: pendingTasks.count || 0, totalPoints, currentRank: currentRank || rankData.length + 1 };
}

// `userId` scopes the feed to that user's own assignments — used for the
// regular-user dashboard so the activity card shows their own approvals,
// rejections, and earned points instead of strangers' work.
// Omit `userId` (admin view) for the platform-wide feed.
export async function getRecentActivity(limit = 10, userId?: string) {
  const db = getServerClient();
  let query = db.from("task_assignments")
    .select("id, status, submitted_at, reviewed_at, points_awarded, rejection_reason, users!task_assignments_user_id_fkey(name), tasks!inner(title)")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  return (data || []) as Record<string, unknown>[];
}

export async function getTopPerformers(limit = 5) {
  const db = getServerClient();
  const { data } = await db.from("profiles").select("user_id, total_points, tasks_completed, users!inner(name, image)").eq("status", "active").order("total_points", { ascending: false }).limit(limit);
  return (data || []) as Record<string, unknown>[];
}

// ===== Report Data =====

export interface ReportFilters {
  from?: string;
  to?: string;
  period?: "daily" | "weekly" | "monthly" | "yearly";
}

function getDateRange(filters: ReportFilters): { from: string; to: string } {
  const now = new Date();
  const to = filters.to || now.toISOString();
  let from = filters.from;
  if (!from) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1); // Default: last 30 days
    from = d.toISOString();
  }
  return { from, to };
}

// Overview stats
export async function getOverviewReport(filters: ReportFilters) {
  const db = getServerClient();
  const { from, to } = getDateRange(filters);

  const [totalTasks, totalUsers, totalGroups, totalPoints, completedTasks, pendingTasks, rejectedTasks, totalBudget] = await Promise.all([
    db.from("tasks").select("id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
    db.from("users").select("id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
    db.from("groups").select("id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
    db.from("points_history").select("amount").gte("created_at", from).lte("created_at", to),
    db.from("task_assignments").select("id", { count: "exact", head: true }).eq("status", "approved").gte("created_at", from).lte("created_at", to),
    db.from("task_assignments").select("id", { count: "exact", head: true }).in("status", ["pending", "in_progress"]).gte("created_at", from).lte("created_at", to),
    db.from("task_assignments").select("id", { count: "exact", head: true }).eq("status", "rejected").gte("created_at", from).lte("created_at", to),
    db.from("tasks").select("point_budget").gte("created_at", from).lte("created_at", to),
  ]);

  const pointsData = (totalPoints.data || []) as Record<string, unknown>[];
  const totalPointsMoved = pointsData.reduce((s, p) => s + Math.abs(Number(p.amount || 0)), 0);
  const budgetData = (totalBudget.data || []) as Record<string, unknown>[];
  const totalBudgetAmount = budgetData.reduce((s, t) => s + Number(t.point_budget || 0), 0);

  return {
    totalTasks: totalTasks.count || 0,
    newUsers: totalUsers.count || 0,
    newGroups: totalGroups.count || 0,
    totalPointsMoved,
    totalBudgetAmount,
    completedTasks: completedTasks.count || 0,
    pendingTasks: pendingTasks.count || 0,
    rejectedTasks: rejectedTasks.count || 0,
  };
}

// Tasks by platform
export async function getTasksByPlatform(filters: ReportFilters) {
  const db = getServerClient();
  const { from, to } = getDateRange(filters);

  const { data } = await db
    .from("tasks")
    .select("platform_id, platforms!inner(name)")
    .gte("created_at", from).lte("created_at", to);

  const counts: Record<string, number> = {};
  for (const row of (data || []) as Record<string, unknown>[]) {
    const platform = row.platforms as Record<string, unknown>;
    const name = String(platform?.name || "Unknown");
    counts[name] = (counts[name] || 0) + 1;
  }

  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

// Assignment status distribution
export async function getAssignmentStatusDistribution(filters: ReportFilters) {
  const db = getServerClient();
  const { from, to } = getDateRange(filters);

  const statuses = ["pending", "in_progress", "submitted", "approved", "rejected"];
  const results = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await db.from("task_assignments").select("id", { count: "exact", head: true }).eq("status", status).gte("created_at", from).lte("created_at", to);
      return { status, count: count || 0 };
    })
  );
  return results;
}

// Points transaction over time
export async function getPointsOverTime(filters: ReportFilters) {
  const db = getServerClient();
  const { from, to } = getDateRange(filters);

  const { data } = await db
    .from("points_history")
    .select("amount, action, created_at")
    .gte("created_at", from).lte("created_at", to)
    .order("created_at", { ascending: true });

  // Group by day
  const daily: Record<string, { earned: number; spent: number }> = {};
  for (const row of (data || []) as Record<string, unknown>[]) {
    const date = String(row.created_at || "").split("T")[0];
    if (!daily[date]) daily[date] = { earned: 0, spent: 0 };
    const amount = Number(row.amount || 0);
    if (amount > 0) daily[date].earned += amount;
    else daily[date].spent += Math.abs(amount);
  }

  return Object.entries(daily).map(([date, { earned, spent }]) => ({ date, earned: +earned.toFixed(2), spent: +spent.toFixed(2) }));
}

// User growth over time
export async function getUserGrowth(filters: ReportFilters) {
  const db = getServerClient();
  const { from, to } = getDateRange(filters);

  const { data } = await db
    .from("users")
    .select("created_at")
    .gte("created_at", from).lte("created_at", to)
    .order("created_at", { ascending: true });

  const daily: Record<string, number> = {};
  for (const row of (data || []) as Record<string, unknown>[]) {
    const date = String(row.created_at || "").split("T")[0];
    daily[date] = (daily[date] || 0) + 1;
  }

  let cumulative = 0;
  return Object.entries(daily).map(([date, count]) => {
    cumulative += count;
    return { date, newUsers: count, totalUsers: cumulative };
  });
}

// Task completion trend over time
export async function getCompletionTrend(filters: ReportFilters) {
  const db = getServerClient();
  const { from, to } = getDateRange(filters);

  const { data } = await db
    .from("task_assignments")
    .select("status, reviewed_at, created_at")
    .gte("created_at", from).lte("created_at", to)
    .order("created_at", { ascending: true });

  const daily: Record<string, { completed: number; submitted: number; rejected: number }> = {};
  for (const row of (data || []) as Record<string, unknown>[]) {
    const date = String(row.reviewed_at || row.created_at || "").split("T")[0];
    if (!daily[date]) daily[date] = { completed: 0, submitted: 0, rejected: 0 };
    const status = String(row.status);
    if (status === "approved") daily[date].completed++;
    else if (status === "submitted") daily[date].submitted++;
    else if (status === "rejected") daily[date].rejected++;
  }

  return Object.entries(daily).map(([date, counts]) => ({ date, ...counts }));
}

// Top users report
export async function getTopUsersReport(filters: ReportFilters, limit = 10) {
  const db = getServerClient();

  const { data } = await db
    .from("profiles")
    .select("user_id, total_points, tasks_completed, current_streak, role, users!inner(name, email)")
    .eq("status", "active")
    .order("total_points", { ascending: false })
    .limit(limit);

  return ((data || []) as Record<string, unknown>[]).map((row, i) => {
    const user = row.users as Record<string, unknown>;
    return {
      rank: i + 1,
      name: String(user?.name || "Unknown"),
      email: String(user?.email || ""),
      role: String(row.role || "user"),
      totalPoints: Number(row.total_points || 0),
      tasksCompleted: Number(row.tasks_completed || 0),
      streak: Number(row.current_streak || 0),
    };
  });
}

// Export data as CSV string
export async function exportReportCSV(type: "tasks" | "users" | "points" | "assignments", filters: ReportFilters): Promise<string> {
  const db = getServerClient();
  const { from, to } = getDateRange(filters);

  if (type === "tasks") {
    const { data } = await db.from("tasks").select("id, title, status, approval_status, points_per_completion, point_budget, points_spent, priority, created_at, platforms!inner(name), users!tasks_created_by_fkey(name)").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false });
    const rows = (data || []) as Record<string, unknown>[];
    const headers = "ID,Title,Platform,Creator,Status,Approval,Points/Task,Budget,Spent,Priority,Created";
    const csv = rows.map(r => {
      const p = r.platforms as Record<string, unknown>;
      const u = r.users as Record<string, unknown>;
      return `${r.id},"${String(r.title).replace(/"/g, '""')}","${String(p?.name || "")}","${String(u?.name || "")}",${r.status},${r.approval_status},${r.points_per_completion},${r.point_budget},${r.points_spent},${r.priority},${String(r.created_at).split("T")[0]}`;
    }).join("\n");
    return `${headers}\n${csv}`;
  }

  if (type === "users") {
    const { data } = await db.from("profiles").select("role, status, total_points, tasks_completed, current_streak, is_approved, users!inner(name, email, created_at)").order("total_points", { ascending: false });
    const rows = (data || []) as Record<string, unknown>[];
    const headers = "Name,Email,Role,Status,Approved,Points,Tasks,Streak,Joined";
    const csv = rows.map(r => {
      const u = r.users as Record<string, unknown>;
      return `"${String(u?.name || "")}",${u?.email},${r.role},${r.status},${r.is_approved},${Number(r.total_points).toFixed(2)},${r.tasks_completed},${r.current_streak},${String(u?.created_at || "").split("T")[0]}`;
    }).join("\n");
    return `${headers}\n${csv}`;
  }

  if (type === "points") {
    const { data } = await db.from("points_history").select("amount, action, description, created_at, users!inner(name)").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false });
    const rows = (data || []) as Record<string, unknown>[];
    const headers = "User,Amount,Action,Description,Date";
    const csv = rows.map(r => {
      const u = r.users as Record<string, unknown>;
      return `"${String(u?.name || "")}",${Number(r.amount).toFixed(2)},${r.action},"${String(r.description || "").replace(/"/g, '""')}",${String(r.created_at).split("T")[0]}`;
    }).join("\n");
    return `${headers}\n${csv}`;
  }

  if (type === "assignments") {
    const { data } = await db.from("task_assignments").select("id, status, points_awarded, submitted_at, reviewed_at, created_at, users!task_assignments_user_id_fkey(name), tasks!inner(title)").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false });
    const rows = (data || []) as Record<string, unknown>[];
    const headers = "ID,User,Task,Status,Points Awarded,Submitted,Reviewed,Created";
    const csv = rows.map(r => {
      const u = r.users as Record<string, unknown>;
      const t = r.tasks as Record<string, unknown>;
      return `${r.id},"${String(u?.name || "")}","${String(t?.title || "").replace(/"/g, '""')}",${r.status},${Number(r.points_awarded || 0).toFixed(2)},${String(r.submitted_at || "").split("T")[0]},${String(r.reviewed_at || "").split("T")[0]},${String(r.created_at).split("T")[0]}`;
    }).join("\n");
    return `${headers}\n${csv}`;
  }

  return "";
}
