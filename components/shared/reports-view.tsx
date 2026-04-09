"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Btn, Select, Badge } from "@/components/ui";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Download, ListTodo, Users, Coins, TrendingUp, CheckCircle, Clock, XCircle, FileText,
} from "lucide-react";
import {
  getOverviewReport, getTasksByPlatform, getAssignmentStatusDistribution,
  getPointsOverTime, getUserGrowth, getCompletionTrend, getTopUsersReport,
  exportReportCSV, type ReportFilters,
} from "@/lib/actions/analytics";

const COLORS = ["#7C3AED", "#EC4899", "#22C55E", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#06B6D4", "#F97316", "#6366F1"];

const PRESET_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This Year", days: 365 },
  { label: "All Time", days: 3650 },
];

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "users" | "points">("overview");
  const [dateRange, setDateRange] = useState(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const filters: ReportFilters = useCustom && customFrom
    ? { from: new Date(customFrom).toISOString(), to: customTo ? new Date(customTo).toISOString() : new Date().toISOString() }
    : { from: new Date(Date.now() - dateRange * 86400000).toISOString(), to: new Date().toISOString() };

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: TrendingUp },
    { key: "tasks" as const, label: "Tasks", icon: ListTodo },
    { key: "users" as const, label: "Users", icon: Users },
    { key: "points" as const, label: "Points", icon: Coins },
  ];

  async function handleExport(type: "tasks" | "users" | "points" | "assignments") {
    const csv = await exportReportCSV(type, filters);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-${type}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">Date Range:</span>
          {PRESET_RANGES.map((r) => (
            <button key={r.days} onClick={() => { setDateRange(r.days); setUseCustom(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!useCustom && dateRange === r.days ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}>
              {r.label}
            </button>
          ))}
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-2">
            <Input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); }} className="h-9 w-36 text-xs" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); }} className="h-9 w-36 text-xs" />
          </div>
        </CardContent>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${activeTab === tab.key ? "text-primary bg-primary/5 border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Btn variant="outline" size="sm" onClick={() => handleExport("tasks")}><Download className="w-3.5 h-3.5 mr-1" /> Tasks CSV</Btn>
          <Btn variant="outline" size="sm" onClick={() => handleExport("users")}><Download className="w-3.5 h-3.5 mr-1" /> Users CSV</Btn>
          <Btn variant="outline" size="sm" onClick={() => handleExport("points")}><Download className="w-3.5 h-3.5 mr-1" /> Points CSV</Btn>
          <Btn variant="outline" size="sm" onClick={() => handleExport("assignments")}><Download className="w-3.5 h-3.5 mr-1" /> Assignments CSV</Btn>
        </div>
      </div>

      {activeTab === "overview" && <OverviewTab filters={filters} />}
      {activeTab === "tasks" && <TasksTab filters={filters} />}
      {activeTab === "users" && <UsersTab filters={filters} />}
      {activeTab === "points" && <PointsTab filters={filters} />}
    </div>
  );
}

// ===== Overview Tab =====
function OverviewTab({ filters }: { filters: ReportFilters }) {
  const { data: overview } = useQuery({ queryKey: ["report-overview", filters], queryFn: () => getOverviewReport(filters) });
  const { data: statusDist } = useQuery({ queryKey: ["report-status-dist", filters], queryFn: () => getAssignmentStatusDistribution(filters) });

  const stats = [
    { label: "Tasks Created", value: overview?.totalTasks || 0, icon: ListTodo, color: "text-primary" },
    { label: "New Users", value: overview?.newUsers || 0, icon: Users, color: "text-accent" },
    { label: "Completed", value: overview?.completedTasks || 0, icon: CheckCircle, color: "text-success" },
    { label: "Pending", value: overview?.pendingTasks || 0, icon: Clock, color: "text-warning" },
    { label: "Rejected", value: overview?.rejectedTasks || 0, icon: XCircle, color: "text-error" },
    { label: "Points Moved", value: (overview?.totalPointsMoved || 0).toFixed(2), icon: Coins, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment status pie chart */}
      <Card>
        <CardHeader><CardTitle>Assignment Status Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusDist || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                {(statusDist || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Tasks Tab =====
function TasksTab({ filters }: { filters: ReportFilters }) {
  const { data: byPlatform } = useQuery({ queryKey: ["report-by-platform", filters], queryFn: () => getTasksByPlatform(filters) });
  const { data: completionTrend } = useQuery({ queryKey: ["report-completion-trend", filters], queryFn: () => getCompletionTrend(filters) });

  return (
    <div className="space-y-6">
      {/* Tasks by platform bar chart */}
      <Card>
        <CardHeader><CardTitle>Tasks by Platform</CardTitle><CardDescription>Number of tasks created per platform</CardDescription></CardHeader>
        <CardContent>
          {(byPlatform || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No task data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byPlatform}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Completion trend */}
      <Card>
        <CardHeader><CardTitle>Completion Trend</CardTitle><CardDescription>Task completions, submissions, and rejections over time</CardDescription></CardHeader>
        <CardContent>
          {(completionTrend || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No completion data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="completed" stackId="1" stroke="#22C55E" fill="#22C55E" fillOpacity={0.3} name="Completed" />
                <Area type="monotone" dataKey="submitted" stackId="1" stroke="#EC4899" fill="#EC4899" fillOpacity={0.3} name="Submitted" />
                <Area type="monotone" dataKey="rejected" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} name="Rejected" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Users Tab =====
function UsersTab({ filters }: { filters: ReportFilters }) {
  const { data: userGrowth } = useQuery({ queryKey: ["report-user-growth", filters], queryFn: () => getUserGrowth(filters) });
  const { data: topUsers } = useQuery({ queryKey: ["report-top-users", filters], queryFn: () => getTopUsersReport(filters) });

  return (
    <div className="space-y-6">
      {/* User growth line chart */}
      <Card>
        <CardHeader><CardTitle>User Growth</CardTitle><CardDescription>New registrations and cumulative users</CardDescription></CardHeader>
        <CardContent>
          {(userGrowth || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No user data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="newUsers" stroke="#EC4899" strokeWidth={2} name="New Users" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="totalUsers" stroke="#7C3AED" strokeWidth={2} name="Total Users" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top users table */}
      <Card>
        <CardHeader><CardTitle>Top Users</CardTitle><CardDescription>Ranked by total points</CardDescription></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Rank</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Points</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Tasks</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Streak</th>
            </tr></thead>
            <tbody>
              {(topUsers || []).length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No user data</td></tr>
              ) : (topUsers || []).map((u) => (
                <tr key={u.rank} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-5 py-3 font-bold text-muted-foreground">#{u.rank}</td>
                  <td className="px-5 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                  <td className="px-5 py-3"><Badge variant="primary">{u.role}</Badge></td>
                  <td className="px-5 py-3 text-right font-bold text-warning">{u.totalPoints.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right">{u.tasksCompleted}</td>
                  <td className="px-5 py-3 text-right">{u.streak}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Points Tab =====
function PointsTab({ filters }: { filters: ReportFilters }) {
  const { data: pointsOverTime } = useQuery({ queryKey: ["report-points-time", filters], queryFn: () => getPointsOverTime(filters) });

  const totalEarned = (pointsOverTime || []).reduce((s, d) => s + d.earned, 0);
  const totalSpent = (pointsOverTime || []).reduce((s, d) => s + d.spent, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-success">{totalEarned.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Points Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Coins className="w-6 h-6 text-error mx-auto mb-2" />
            <p className="text-2xl font-bold text-error">{totalSpent.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Points Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{(pointsOverTime || []).length}</p>
            <p className="text-xs text-muted-foreground">Transaction Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Points flow chart */}
      <Card>
        <CardHeader><CardTitle>Points Flow</CardTitle><CardDescription>Points earned vs spent over time</CardDescription></CardHeader>
        <CardContent>
          {(pointsOverTime || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No points data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={pointsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="earned" fill="#22C55E" radius={[4, 4, 0, 0]} name="Earned" />
                <Bar dataKey="spent" fill="#EF4444" radius={[4, 4, 0, 0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
