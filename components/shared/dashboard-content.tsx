"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { NoticeBoard } from "@/components/shared/notice-board";
import { SubscriptionBanner } from "@/components/shared/subscription-banner";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { ListTodo, Clock, Trophy, TrendingUp, Users, CheckCircle, ArrowRight, XCircle, Coins, Hourglass, Send, Sparkles, Activity, Award, PieChart, Flame, Target } from "lucide-react";
import { formatRelativeTime, getInitials, formatPoints } from "@/lib/utils";
import { MILESTONE_BONUSES } from "@/lib/constants";
import { DoableTasksPreview } from "@/components/shared/tasks-view";
import Link from "next/link";

// Chart series palette — mirrors components/shared/reports-view.tsx so the
// dashboard's mini charts match the full /reports look.
const STATUS_COLORS: Record<string, string> = {
  approved: "#22C55E",
  submitted: "#EC4899",
  in_progress: "#7C3AED",
  pending: "#F59E0B",
  rejected: "#EF4444",
};
const STATUS_FALLBACK = ["#7C3AED", "#EC4899", "#22C55E", "#F59E0B", "#EF4444", "#3B82F6"];

// Top-performer avatar: real profile photo (already fetched by getTopPerformers)
// with a gradient-initials fallback on missing/broken image.
function PerfAvatar({ name, image }: { name: string; image?: string | null }) {
  const [errored, setErrored] = useState(false);
  if (image && !errored) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} onError={() => setErrored(true)} className="w-8 h-8 rounded-lg object-cover shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
      {getInitials(name)}
    </div>
  );
}

// Subtle entrance motion — gentle fade + slide, staggered across siblings.
const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const itemV = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

interface Props {
  userName: string;
  isAdmin: boolean;
  adminStats?: { totalTasks: number; pendingReviews: number; activeUsers: number; completionRate: number } | null;
  userStats?: { myTasks: number; pendingTasks: number; totalPoints: number; currentRank: number; tasksCompleted?: number; streak?: number } | null;
  recentActivity: Record<string, unknown>[];
  topPerformers?: Record<string, unknown>[] | null;
  completionTrend?: Record<string, unknown>[] | null;
  statusDist?: Record<string, unknown>[] | null;
}

// ---- Admin overview charts (completion trend + status distribution) ----
function AdminCharts({ completionTrend, statusDist }: { completionTrend?: Record<string, unknown>[] | null; statusDist?: Record<string, unknown>[] | null }) {
  const trend = completionTrend || [];
  const dist = (statusDist || []).filter((d) => Number(d.count) > 0);
  const hasTrend = trend.some((d) => Number(d.completed) + Number(d.submitted) + Number(d.rejected) > 0);
  const hasDist = dist.length > 0;
  if (!hasTrend && !hasDist) return null;

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Completion trend */}
      <motion.div variants={itemV}>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-sm shadow-primary/30 shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle>Completion Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </CardHeader>
          <CardContent>
            {hasTrend ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend as Record<string, number>[]} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="completed" stackId="1" stroke="#22C55E" fill="#22C55E" fillOpacity={0.25} name="Completed" />
                  <Area type="monotone" dataKey="submitted" stackId="1" stroke="#EC4899" fill="#EC4899" fillOpacity={0.25} name="Submitted" />
                  <Area type="monotone" dataKey="rejected" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.25} name="Rejected" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">No data yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Status distribution */}
      <motion.div variants={itemV}>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-accent to-primary flex items-center justify-center shadow-sm shadow-accent/30 shrink-0">
              <PieChart className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle>Submission Status</CardTitle>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </CardHeader>
          <CardContent>
            {hasDist ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <RePieChart>
                    <Pie data={dist as Record<string, number>[]} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2}>
                      {dist.map((d, i) => (
                        <Cell key={i} fill={STATUS_COLORS[String(d.status)] || STATUS_FALLBACK[i % STATUS_FALLBACK.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 min-w-0 space-y-2">
                  {dist.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[String(d.status)] || STATUS_FALLBACK[i % STATUS_FALLBACK.length] }} />
                        <span className="truncate capitalize text-muted-foreground">{String(d.status).replace("_", " ")}</span>
                      </span>
                      <span className="font-semibold tabular-nums shrink-0">{Number(d.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">No data yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ---- User progress widget (milestone bar + streak) ----
function UserProgress({ tasksCompleted, streak }: { tasksCompleted: number; streak: number }) {
  const thresholds = Object.keys(MILESTONE_BONUSES).map(Number).sort((a, b) => a - b);
  const next = thresholds.find((t) => t > tasksCompleted);
  const prev = [...thresholds].reverse().find((t) => t <= tasksCompleted) || 0;
  const maxed = next === undefined;
  const target = next ?? prev;
  const pct = maxed ? 100 : Math.min(100, Math.round(((tasksCompleted - prev) / (target - prev)) * 100));
  const remaining = maxed ? 0 : target - tasksCompleted;
  const bonus = maxed ? 0 : MILESTONE_BONUSES[target];

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="mb-8">
      <motion.div variants={itemV}>
        <Card className="overflow-hidden">
          <div className="bg-linear-to-br from-primary/10 via-card to-accent/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold leading-tight">Your Progress</p>
                  <p className="text-xs text-muted-foreground">{tasksCompleted} task{tasksCompleted === 1 ? "" : "s"} completed</p>
                </div>
              </div>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/15 text-warning text-xs font-bold shrink-0">
                  <Flame className="w-3.5 h-3.5" /> {streak} day{streak === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">{maxed ? "All milestones reached" : `Next reward at ${target} tasks`}</span>
              {!maxed && <span className="font-semibold text-primary tabular-nums">+{bonus} pts</span>}
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {maxed ? "You've hit the top milestone — keep earning!" : `${remaining} more task${remaining === 1 ? "" : "s"} to unlock the next bonus.`}
            </p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

type StatDef = { title: string; value: number | string; icon: React.ElementType; accent: "primary" | "warning" | "success" | "accent"; format?: "number" | "points" | "percent" };

export function DashboardContent({ userName, isAdmin, adminStats, userStats, recentActivity, topPerformers, completionTrend, statusDist }: Props) {
  const description = isAdmin
    ? "Here's an overview of your platform activity."
    : "Here's your task progress and achievements.";

  // Hero highlight chips + stat-card definitions — both from the already-fetched
  // stats (no extra queries).
  const heroChips: { label: string; value: string | number }[] = [];
  const stats: StatDef[] = [];
  if (isAdmin && adminStats) {
    heroChips.push(
      { label: "Total Tasks", value: adminStats.totalTasks },
      { label: "Pending", value: adminStats.pendingReviews },
      { label: "Active Users", value: adminStats.activeUsers },
    );
    stats.push(
      { title: "Total Tasks", value: adminStats.totalTasks, icon: ListTodo, accent: "primary" },
      { title: "Pending Reviews", value: adminStats.pendingReviews, icon: Clock, accent: "warning" },
      { title: "Active Users", value: adminStats.activeUsers, icon: Users, accent: "accent" },
      { title: "Completion Rate", value: adminStats.completionRate, icon: CheckCircle, accent: "success", format: "percent" },
    );
  } else if (userStats) {
    heroChips.push(
      { label: "My Tasks", value: userStats.myTasks },
      { label: "Points", value: formatPoints(userStats.totalPoints) },
      { label: "Rank", value: userStats.currentRank > 0 ? `#${userStats.currentRank}` : "-" },
    );
    stats.push(
      { title: "My Tasks", value: userStats.myTasks, icon: ListTodo, accent: "primary" },
      { title: "Pending Tasks", value: userStats.pendingTasks, icon: Clock, accent: "warning" },
      { title: "Total Points", value: userStats.totalPoints.toFixed(2), icon: Trophy, accent: "success" },
      { title: "Current Rank", value: userStats.currentRank > 0 ? `#${userStats.currentRank}` : "-", icon: TrendingUp, accent: "accent" },
    );
  }

  return (
    <div>
      {/* ---- Gradient welcome hero ---- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary via-primary to-accent text-white p-6 sm:p-7 mb-6 shadow-lg shadow-primary/20"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 left-1/3 w-48 h-48 rounded-full bg-accent/30 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white/70 mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, {userName}!</h1>
            <p className="text-sm text-white/80 mt-1.5 max-w-xl">{description}</p>
          </div>
          {heroChips.length > 0 && (
            <div className="flex flex-wrap gap-3 shrink-0">
              {heroChips.map((c) => (
                <div key={c.label} className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 min-w-24 border border-white/10">
                  <p className="text-xl font-bold tabular-nums leading-none">{c.value}</p>
                  <p className="text-[11px] text-white/70 mt-1">{c.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <SubscriptionBanner />
      <NoticeBoard />

      {/* ---- Stat cards (staggered entrance) ---- */}
      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((s) => (
          <motion.div key={s.title} variants={itemV}>
            <StatCard title={s.title} value={s.value} icon={s.icon} accent={s.accent} format={s.format} />
          </motion.div>
        ))}
      </motion.div>

      {/* Admin overview charts / user progress widget */}
      {isAdmin ? (
        <AdminCharts completionTrend={completionTrend} statusDist={statusDist} />
      ) : userStats ? (
        <UserProgress tasksCompleted={userStats.tasksCompleted ?? 0} streak={userStats.streak ?? 0} />
      ) : null}

      <DoableTasksPreview limit={5} />

      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Recent Activity — admins see platform-wide, users see their own */}
        <motion.div variants={itemV}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-sm shadow-primary/30 shrink-0">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <CardTitle>{isAdmin ? "Recent Activity" : "My Recent Activity"}</CardTitle>
              </div>
              <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">View all <ArrowRight className="w-3 h-3" /></Link>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {isAdmin ? "No activity yet." : "No activity yet. Pick up a task to start earning points."}
                </p>
              ) : isAdmin ? (
                <div className="space-y-1">
                  {recentActivity.map((item) => {
                    const task = item.tasks as Record<string, unknown> | undefined;
                    const user = item.users as Record<string, unknown> | undefined;
                    const status = String(item.status || "");
                    const statusVariant = status === "approved" ? "success" : status === "rejected" ? "error" : status === "submitted" ? "accent" : "default";
                    const time = (item.reviewed_at || item.submitted_at) as string | undefined;

                    return (
                      <div key={item.id as number} className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {getInitials(String(user?.name || "?"))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{String(task?.title || "Task")}</p>
                            <p className="text-xs text-muted-foreground truncate">{String(user?.name || "User")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={statusVariant}>{status.replace("_", " ")}</Badge>
                          {time && <span className="text-[11px] text-muted-foreground">{formatRelativeTime(time)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // User view: outcome-focused — what happened to ME
                <div className="space-y-1">
                  {recentActivity.map((item) => {
                    const task = item.tasks as Record<string, unknown> | undefined;
                    const status = String(item.status || "");
                    const points = Number(item.points_awarded || 0);
                    const rejectionReason = item.rejection_reason ? String(item.rejection_reason) : "";
                    const time = (item.reviewed_at || item.submitted_at) as string | undefined;

                    const meta = (() => {
                      if (status === "approved") {
                        return {
                          Icon: CheckCircle,
                          tint: "text-success",
                          bg: "bg-success/10",
                          label: points > 0 ? `+${points.toFixed(2)} pts earned` : "Approved",
                        };
                      }
                      if (status === "rejected") {
                        return {
                          Icon: XCircle,
                          tint: "text-error",
                          bg: "bg-error/10",
                          label: rejectionReason ? `Rejected — ${rejectionReason}` : "Rejected",
                        };
                      }
                      if (status === "submitted") {
                        return { Icon: Hourglass, tint: "text-accent", bg: "bg-accent/10", label: "Awaiting review" };
                      }
                      if (status === "in_progress") {
                        return { Icon: Send, tint: "text-primary", bg: "bg-primary/10", label: "In progress" };
                      }
                      return { Icon: Clock, tint: "text-muted-foreground", bg: "bg-muted", label: "Not started" };
                    })();
                    const Icon = meta.Icon;

                    return (
                      <div key={item.id as number} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${meta.tint}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{String(task?.title || "Task")}</p>
                          <p className={`text-xs truncate ${meta.tint}`}>
                            {status === "approved" && points > 0 && <Coins className="inline w-3 h-3 mr-0.5" />}
                            {meta.label}
                          </p>
                        </div>
                        {time && <span className="text-[11px] text-muted-foreground shrink-0">{formatRelativeTime(time)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performers / Quick Stats */}
        <motion.div variants={itemV}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-warning to-accent flex items-center justify-center shadow-sm shadow-warning/30 shrink-0">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <CardTitle>{isAdmin ? "Top Performers" : "Quick Stats"}</CardTitle>
              </div>
              <Link href="/leaderboard" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">Leaderboard <ArrowRight className="w-3 h-3" /></Link>
            </CardHeader>
            <CardContent>
              {isAdmin && topPerformers ? (
                topPerformers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No performers yet</p>
                ) : (
                  <div className="space-y-1">
                    {topPerformers.map((p, i) => {
                      const user = p.users as Record<string, unknown> | undefined;
                      const medals = ["text-yellow-500", "text-gray-400", "text-amber-600"];
                      return (
                        <div key={p.user_id as string} className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`text-lg font-bold w-6 text-center tabular-nums shrink-0 ${medals[i] || "text-muted-foreground"}`}>
                              {i + 1}
                            </span>
                            <PerfAvatar name={String(user?.name || "?")} image={user?.image as string | undefined} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{String(user?.name || "User")}</p>
                              <p className="text-xs text-muted-foreground tabular-nums">{Number(p.tasks_completed || 0)} tasks</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-warning tabular-nums shrink-0">{Number(p.total_points || 0).toFixed(2)} pts</span>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-warning/5 border border-warning/15 text-center transition-colors hover:bg-warning/10">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2 shadow-md shadow-amber-500/30">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{userStats?.totalPoints.toFixed(2) || "0"}</p>
                    <p className="text-xs text-muted-foreground">Total Points</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 text-center transition-colors hover:bg-primary/10">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center mx-auto mb-2 shadow-md shadow-primary/30">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{userStats && userStats.currentRank > 0 ? `#${userStats.currentRank}` : "-"}</p>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
