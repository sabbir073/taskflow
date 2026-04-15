"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { NoticeBoard } from "@/components/shared/notice-board";
import { SubscriptionBanner } from "@/components/shared/subscription-banner";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { ListTodo, Clock, Trophy, TrendingUp, Users, CheckCircle, ArrowRight } from "lucide-react";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import Link from "next/link";

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
            <StatCard title="Total Tasks" value={adminStats.totalTasks} icon={ListTodo} />
            <StatCard title="Pending Reviews" value={adminStats.pendingReviews} icon={Clock} />
            <StatCard title="Active Users" value={adminStats.activeUsers} icon={Users} />
            <StatCard title="Completion Rate" value={adminStats.completionRate} icon={CheckCircle} format="percent" />
          </>
        ) : userStats ? (
          <>
            <StatCard title="My Tasks" value={userStats.myTasks} icon={ListTodo} />
            <StatCard title="Pending Tasks" value={userStats.pendingTasks} icon={Clock} />
            <StatCard title="Total Points" value={userStats.totalPoints.toFixed(2)} icon={Trophy} />
            <StatCard title="Current Rank" value={userStats.currentRank > 0 ? `#${userStats.currentRank}` : "-"} icon={TrendingUp} />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet. Create your first task!</p>
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* Top Performers / Points History */}
        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? "Top Performers" : "Quick Stats"}</CardTitle>
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
                      <div key={p.user_id as string} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold w-6 text-center ${medals[i] || "text-muted-foreground"}`}>
                            {i + 1}
                          </span>
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">
                            {getInitials(String(user?.name || "?"))}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{String(user?.name || "User")}</p>
                            <p className="text-xs text-muted-foreground">{Number(p.tasks_completed || 0)} tasks</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-warning">{Number(p.total_points || 0).toFixed(2)} pts</span>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/40 text-center">
                  <Trophy className="w-6 h-6 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold">{userStats?.totalPoints.toFixed(2) || "0"}</p>
                  <p className="text-xs text-muted-foreground">Total Points</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 text-center">
                  <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">#{userStats?.currentRank || "-"}</p>
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
