"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { NoticeBoard } from "@/components/shared/notice-board";
import { SubscriptionBanner } from "@/components/shared/subscription-banner";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { ListTodo, Clock, Trophy, TrendingUp, Users, CheckCircle, ArrowRight, XCircle, Coins, Hourglass, Send } from "lucide-react";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { DoableTasksPreview } from "@/components/shared/tasks-view";
import Link from "next/link";

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

interface Props {
  userName: string;
  isAdmin: boolean;
  adminStats?: { totalTasks: number; pendingReviews: number; activeUsers: number; completionRate: number } | null;
  userStats?: { myTasks: number; pendingTasks: number; totalPoints: number; currentRank: number } | null;
  recentActivity: Record<string, unknown>[];
  topPerformers?: Record<string, unknown>[] | null;
}

export function DashboardContent({ userName, isAdmin, adminStats, userStats, recentActivity, topPerformers }: Props) {
  return (
    <div>
      <PageHeader
        title={`Welcome back, ${userName}!`}
        description={isAdmin ? "Here's an overview of your platform activity." : "Here's your task progress and achievements."}
      />

      <SubscriptionBanner />
      <NoticeBoard />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isAdmin && adminStats ? (
          <>
            <StatCard title="Total Tasks" value={adminStats.totalTasks} icon={ListTodo} accent="primary" />
            <StatCard title="Pending Reviews" value={adminStats.pendingReviews} icon={Clock} accent="warning" />
            <StatCard title="Active Users" value={adminStats.activeUsers} icon={Users} accent="accent" />
            <StatCard title="Completion Rate" value={adminStats.completionRate} icon={CheckCircle} format="percent" accent="success" />
          </>
        ) : userStats ? (
          <>
            <StatCard title="My Tasks" value={userStats.myTasks} icon={ListTodo} accent="primary" />
            <StatCard title="Pending Tasks" value={userStats.pendingTasks} icon={Clock} accent="warning" />
            <StatCard title="Total Points" value={userStats.totalPoints.toFixed(2)} icon={Trophy} accent="success" />
            <StatCard title="Current Rank" value={userStats.currentRank > 0 ? `#${userStats.currentRank}` : "-"} icon={TrendingUp} accent="accent" />
          </>
        ) : null}
      </div>

      <DoableTasksPreview limit={5} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity — admins see platform-wide, users see their own */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isAdmin ? "Recent Activity" : "My Recent Activity"}</CardTitle>
            <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {isAdmin ? "No activity yet." : "No activity yet. Pick up a task to start earning points."}
              </p>
            ) : isAdmin ? (
              <div className="space-y-3">
                {recentActivity.map((item) => {
                  const task = item.tasks as Record<string, unknown> | undefined;
                  const user = item.users as Record<string, unknown> | undefined;
                  const status = String(item.status || "");
                  const statusVariant = status === "approved" ? "success" : status === "rejected" ? "error" : status === "submitted" ? "accent" : "default";
                  const time = (item.reviewed_at || item.submitted_at) as string | undefined;

                  return (
                    <div key={item.id as number} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {getInitials(String(user?.name || "?"))}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{String(task?.title || "Task")}</p>
                          <p className="text-xs text-muted-foreground">{String(user?.name || "User")}</p>
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
              <div className="space-y-2">
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
                    <div key={item.id as number} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
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

        {/* Top Performers / Points History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isAdmin ? "Top Performers" : "Quick Stats"}</CardTitle>
            <Link href="/leaderboard" className="text-xs text-primary hover:underline flex items-center gap-1">Leaderboard <ArrowRight className="w-3 h-3" /></Link>
          </CardHeader>
          <CardContent>
            {isAdmin && topPerformers ? (
              topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No performers yet</p>
              ) : (
                <div className="space-y-3">
                  {topPerformers.map((p, i) => {
                    const user = p.users as Record<string, unknown> | undefined;
                    const medals = ["text-yellow-500", "text-gray-400", "text-amber-600"];
                    return (
                      <div key={p.user_id as string} className="flex items-center justify-between gap-3 py-2 border-b border-border/30 last:border-0">
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
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/15 text-center">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-2">
                    <Trophy className="w-5 h-5 text-warning" />
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{userStats?.totalPoints.toFixed(2) || "0"}</p>
                  <p className="text-xs text-muted-foreground">Total Points</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 text-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{userStats && userStats.currentRank > 0 ? `#${userStats.currentRank}` : "-"}</p>
                  <p className="text-xs text-muted-foreground">Your Rank</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
