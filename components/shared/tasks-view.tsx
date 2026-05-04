"use client";

import { useState } from "react";
import { Card, CardContent, Input, Select, Btn, Badge } from "@/components/ui";
import {
  Search, Clock, CheckCircle, XCircle, Plus, Coins, Trash2, Edit2,
  ExternalLink, Image as ImageIcon, Wallet, FileText,
} from "lucide-react";
import { useTasks, useMyTasks, usePendingReviews, useApproveTask, useRejectTask, useReviewAssignment, useDeleteTask, useAcceptTask } from "@/hooks/use-tasks";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";
import { formatDate, getInitials } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import Link from "next/link";

// ============================================================================
// IMPORTANT: this file has TWO layouts per card type.
//   - DESKTOP: kept exactly as the original — single inline row.
//   - MOBILE: rebuilt as an app-style stacked card with every data point
//     visible, separated into header / body / footer zones.
// Toggled with `hidden sm:block` and `sm:hidden` so neither side affects
// the other. Data extraction logic is shared above each pair of layouts.
// ============================================================================

const ASSIGNMENT_BADGE: Record<string, { variant: "default" | "primary" | "success" | "warning" | "error" | "accent"; label: string }> = {
  pending: { variant: "warning", label: "Not Started" },
  in_progress: { variant: "primary", label: "In Progress" },
  submitted: { variant: "accent", label: "Submitted" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "error", label: "Rejected" },
};

const TASK_STATUS_BADGE: Record<string, { variant: "default" | "primary" | "success" | "warning" | "error" | "accent"; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  pending: { variant: "success", label: "Live" },
  in_progress: { variant: "primary", label: "Active" },
  submitted: { variant: "accent", label: "Active" },
  approved: { variant: "success", label: "Completed" },
  rejected: { variant: "error", label: "Rejected" },
};

const APPROVAL_VARIANT: Record<string, "success" | "warning" | "error" | "default"> = {
  approved: "success",
  pending_approval: "warning",
  rejected_by_admin: "error",
};

export function TasksView({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const [activeTab, setActiveTab] = useState<"my" | "doable" | "manage" | "review">("my");

  const myTasksCount = useTasks({ page: 1, pageSize: 1, created_by: userId });
  const doableCount = useMyTasks({ page: 1, pageSize: 1 });
  const manageCount = useTasks({ page: 1, pageSize: 1 });
  const reviewCount = usePendingReviews({ page: 1, pageSize: 1 });

  const tabs = [
    { key: "my" as const, label: "My Tasks", short: "Mine", count: myTasksCount.data?.total ?? 0 },
    { key: "doable" as const, label: "Doable Tasks", short: "Doable", count: doableCount.data?.total ?? 0 },
    ...(isAdmin
      ? [
          { key: "manage" as const, label: "Manage Tasks", short: "Manage", count: manageCount.data?.total ?? 0 },
          { key: "review" as const, label: "Review Submissions", short: "Review", count: reviewCount.data?.total ?? 0 },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* DESKTOP TABS — original underline style, untouched */}
      <div className="hidden sm:flex gap-1 border-b border-border/50 pb-px overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap relative
              ${activeTab === tab.key ? "text-primary bg-primary/5 border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* MOBILE TABS — pill style horizontal scroll, app-feel.
          Edge-bleeds the container so the scroll boundary isn't visible
          at the screen edge. Active pill uses the brand gradient + glow
          so it's unmistakable on small screens. */}
      <div className="sm:hidden -mx-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-4 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all
                  ${isActive
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted active:scale-95"}`}
              >
                <span>{tab.short}</span>
                <span className={`min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none
                  ${isActive ? "bg-white/25 text-white" : "bg-background text-foreground"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "my" && <MyTasksTab userId={userId} />}
      {activeTab === "doable" && <DoableTasksTab />}
      {activeTab === "manage" && isAdmin && <ManageTasksTab />}
      {activeTab === "review" && isAdmin && <ReviewTab />}
    </div>
  );
}

// ============================================================================
// Tab 1: Tasks I created
// ============================================================================
function MyTasksTab({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const { data, isLoading } = useTasks({ page, pageSize: 20, search, created_by: userId });
  const removeTask = useDeleteTask();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search my tasks..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      {isLoading ? <LoadingSkeleton /> : items.length === 0 ? (
        <EmptyState icon={Plus} title="No tasks created yet" description="Create your first task to get started" action={{ label: "Create Task", href: "/tasks/create" }} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const taskId = item.id as number;
            const title = String(item.title || "");
            const platform = item.platforms as Record<string, unknown> | undefined;
            const taskType = item.task_types as Record<string, unknown> | undefined;
            const points = Number(item.points_per_completion || 0);
            const budget = Number(item.point_budget || 0);
            const spent = Number(item.points_spent || 0);
            const status = String(item.status || "draft");
            const approval = String(item.approval_status || "approved");
            const slug = String(platform?.slug || "");
            const config = PLATFORM_CONFIG[slug as keyof typeof PLATFORM_CONFIG];
            const statusBadge = TASK_STATUS_BADGE[status] || { variant: "default" as const, label: status };
            const budgetPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
            const platformColor = config?.color || "#666";
            const platformName = String(platform?.name || "");
            const typeName = String(taskType?.name || "");

            return (
              <Card key={taskId} className="overflow-hidden">
                {/* DESKTOP — unchanged from the original */}
                <div className="hidden sm:block">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: platformColor }}>
                          {platformName.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/tasks/${taskId}`} className="font-semibold text-sm hover:text-primary transition-colors">{title}</Link>
                          <p className="text-xs text-muted-foreground">
                            {platformName} &middot; {typeName} &middot;
                            <span className="text-primary font-medium"> {points.toFixed(2)} pts/task</span> &middot;
                            Budget: {spent.toFixed(2)}/{budget.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {approval !== "approved" && <Badge variant={APPROVAL_VARIANT[approval] || "default"}>{approval.replace(/_/g, " ")}</Badge>}
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>

                        <Link href={`/tasks/${taskId}/edit`}>
                          <Btn variant="outline" size="sm">Edit</Btn>
                        </Link>
                        <Btn variant="ghost" size="sm" className="text-error" onClick={() => setDeleteTarget({ id: taskId, title })} disabled={removeTask.isPending}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Btn>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* MOBILE — app-style stacked card with every data point */}
                <div className="sm:hidden">
                  {/* Top: platform tile + status pill */}
                  <div className="flex items-start justify-between gap-3 px-4 pt-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm" style={{ backgroundColor: platformColor }}>
                        {platformName.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{platformName}</p>
                        <p className="text-xs text-muted-foreground/80 truncate">{typeName}</p>
                      </div>
                    </div>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>

                  {/* Title */}
                  <Link href={`/tasks/${taskId}`} className="block px-4 mt-3">
                    <h3 className="text-base font-bold leading-tight active:text-primary transition-colors">{title}</h3>
                  </Link>

                  {/* Stats grid: points + budget */}
                  <div className="px-4 mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        <Coins className="w-3 h-3" /> Per task
                      </div>
                      <p className="mt-1 text-base font-bold text-foreground">{points.toFixed(2)}<span className="text-xs font-normal text-muted-foreground"> pts</span></p>
                    </div>
                    <div className="rounded-xl bg-muted/40 border border-border/40 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Wallet className="w-3 h-3" /> Budget
                      </div>
                      <p className="mt-1 text-base font-bold text-foreground">{spent.toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/{budget.toFixed(0)}</span></p>
                      {budget > 0 && (
                        <div className="mt-1.5 h-1 rounded-full bg-background overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${budgetPct}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approval row — only when not approved */}
                  {approval !== "approved" && (
                    <div className="px-4 mt-3">
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium
                        ${approval === "pending_approval" ? "bg-warning/10 text-warning" : approval === "rejected_by_admin" ? "bg-error/10 text-error" : "bg-muted text-muted-foreground"}`}>
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="capitalize">{approval.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="mt-4 flex items-center gap-2 px-4 py-3 border-t border-border/50 bg-muted/20">
                    <Link href={`/tasks/${taskId}/edit`} className="flex-1">
                      <Btn variant="outline" size="sm" className="w-full">
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </Btn>
                    </Link>
                    <Btn variant="outline" size="sm" className="text-error border-error/30 hover:bg-error/10" onClick={() => setDeleteTarget({ id: taskId, title })} disabled={removeTask.isPending}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) removeTask.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete task?"
        description={deleteTarget ? `This permanently removes "${deleteTarget.title}" and all its assignments. This cannot be undone.` : ""}
        confirmLabel="Delete Task"
        isLoading={removeTask.isPending}
      />
    </div>
  );
}

// ============================================================================
// Tab 2: Tasks assigned to me
// ============================================================================
function DoableTasksTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyTasks({ page, pageSize: 20, search, status: statusFilter || undefined });
  const acceptTask = useAcceptTask();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search doable tasks..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-48">
          <option value="">All</option><option value="pending">Not Started</option><option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </Select>
      </div>
      {isLoading ? <LoadingSkeleton /> : items.length === 0 ? (
        <EmptyState icon={Clock} title="No doable tasks" description="No tasks have been assigned to you yet" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const task = (item.tasks as Record<string, unknown>) || item;
            const taskId = task.id as number;
            const assignmentId = item.id as number;
            const title = String(task.title || "Untitled");
            const platform = task.platforms as Record<string, unknown> | undefined;
            const taskType = task.task_types as Record<string, unknown> | undefined;
            const points = Number(task.points_per_completion || task.points || 0);
            const status = String(item.status);
            const slug = String(platform?.slug || "");
            const config = PLATFORM_CONFIG[slug as keyof typeof PLATFORM_CONFIG];
            const badge = ASSIGNMENT_BADGE[status] || { variant: "default" as const, label: status };
            const platformColor = config?.color || "#666";
            const platformName = String(platform?.name || "");
            const typeName = String(taskType?.name || "");
            const earned = Number(item.points_awarded || 0);

            return (
              <Card key={assignmentId} className="overflow-hidden hover:shadow-md transition-all">
                {/* DESKTOP — original */}
                <div className="hidden sm:block">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/tasks/${taskId}`} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: platformColor }}>
                          {platformName.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate hover:text-primary transition-colors">{title}</p>
                          <p className="text-xs text-muted-foreground">{platformName} &middot; {typeName} &middot; <span className="text-primary font-medium">{points.toFixed(2)} pts</span></p>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={badge.variant}>{badge.label}</Badge>

                        {status === "pending" && (
                          <Btn size="sm" onClick={() => acceptTask.mutate(assignmentId)} isLoading={acceptTask.isPending}>Accept</Btn>
                        )}
                        {(status === "in_progress" || status === "rejected") && (
                          <Link href={`/tasks/${taskId}`}><Btn size="sm" variant="primary">Submit Proof</Btn></Link>
                        )}
                        {status === "submitted" && (
                          <Link href={`/tasks/${taskId}`}><Btn size="sm" variant="outline">View Status</Btn></Link>
                        )}
                        {status === "approved" && (
                          <span className="text-xs text-success font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> +{earned.toFixed(2)} pts
                          </span>
                        )}
                        <Link href={`/tasks/${taskId}`}><Btn variant="ghost" size="sm">View</Btn></Link>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* MOBILE */}
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-3 px-4 pt-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm" style={{ backgroundColor: platformColor }}>
                        {platformName.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{platformName}</p>
                        <p className="text-xs text-muted-foreground/80 truncate">{typeName}</p>
                      </div>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>

                  <Link href={`/tasks/${taskId}`} className="block px-4 mt-3">
                    <h3 className="text-base font-bold leading-tight active:text-primary transition-colors">{title}</h3>
                  </Link>

                  <div className="px-4 mt-3 flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      <Coins className="w-3 h-3" /> {points.toFixed(2)} pts
                    </div>
                    {status === "approved" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
                        <CheckCircle className="w-3 h-3" /> +{earned.toFixed(2)} earned
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 px-4 py-3 border-t border-border/50 bg-muted/20">
                    {status === "pending" && (
                      <Btn size="sm" className="flex-1" onClick={() => acceptTask.mutate(assignmentId)} isLoading={acceptTask.isPending}>
                        Accept Task
                      </Btn>
                    )}
                    {(status === "in_progress" || status === "rejected") && (
                      <Link href={`/tasks/${taskId}`} className="flex-1">
                        <Btn size="sm" className="w-full">Submit Proof</Btn>
                      </Link>
                    )}
                    {(status === "submitted" || status === "approved") && (
                      <Link href={`/tasks/${taskId}`} className="flex-1">
                        <Btn size="sm" variant="outline" className="w-full">View Details</Btn>
                      </Link>
                    )}
                    {status === "pending" && (
                      <Link href={`/tasks/${taskId}`}>
                        <Btn variant="outline" size="sm">View</Btn>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ============================================================================
// Tab 3: Admin manage tasks
// ============================================================================
function ManageTasksTab() {
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

  const { data, isLoading } = useTasks({ page, pageSize: 20, search, approval_status: approvalFilter || undefined });
  const approve = useApproveTask();
  const reject = useRejectTask();
  const remove = useDeleteTask();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search all tasks..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }} className="sm:w-52">
          <option value="">All</option><option value="pending_approval">Pending Approval</option><option value="approved">Approved</option><option value="rejected_by_admin">Rejected</option>
        </Select>
      </div>
      {isLoading ? <LoadingSkeleton /> : items.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No tasks" description="No tasks match filters" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const taskId = item.id as number;
            const title = String(item.title || "");
            const platform = item.platforms as Record<string, unknown> | undefined;
            const creator = item.users as Record<string, unknown> | undefined;
            const slug = String(platform?.slug || "");
            const config = PLATFORM_CONFIG[slug as keyof typeof PLATFORM_CONFIG];
            const budget = Number(item.point_budget || 0);
            const approval = String(item.approval_status || "approved");
            const isPending = approval === "pending_approval";
            const isRejecting = rejectingId === taskId;
            const platformColor = config?.color || "#666";
            const platformName = String(platform?.name || "");
            const creatorName = String(creator?.name || "Unknown");

            return (
              <Card key={taskId} className="overflow-hidden">
                {/* DESKTOP — original */}
                <div className="hidden sm:block">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: platformColor }}>
                          {platformName.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/tasks/${taskId}`} className="font-semibold text-sm hover:text-primary">{title}</Link>
                          <p className="text-xs text-muted-foreground">by {creatorName} &middot; <Coins className="w-3 h-3 inline text-warning" /> {budget.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={APPROVAL_VARIANT[approval] || "default"}>{approval.replace(/_/g, " ")}</Badge>
                        {isPending && (
                          <>
                            <Btn size="sm" onClick={() => approve.mutate(taskId)}><CheckCircle className="w-3.5 h-3.5" /></Btn>
                            {isRejecting ? (
                              <div className="flex gap-1">
                                <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." className="h-9 w-32 text-xs" />
                                <Btn variant="danger" size="sm" onClick={() => { reject.mutate({ taskId, reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>OK</Btn>
                              </div>
                            ) : (
                              <Btn variant="outline" size="sm" onClick={() => setRejectingId(taskId)}><XCircle className="w-3.5 h-3.5" /></Btn>
                            )}
                          </>
                        )}
                        <Btn variant="ghost" size="sm" className="text-error" onClick={() => setDeleteTarget({ id: taskId, title })}><Trash2 className="w-3.5 h-3.5" /></Btn>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* MOBILE */}
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-3 px-4 pt-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm" style={{ backgroundColor: platformColor }}>
                        {platformName.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{platformName}</p>
                        <p className="text-xs text-muted-foreground/80 truncate">by {creatorName}</p>
                      </div>
                    </div>
                    <Badge variant={APPROVAL_VARIANT[approval] || "default"}>{approval.replace(/_/g, " ")}</Badge>
                  </div>

                  <Link href={`/tasks/${taskId}`} className="block px-4 mt-3">
                    <h3 className="text-base font-bold leading-tight active:text-primary transition-colors">{title}</h3>
                  </Link>

                  <div className="px-4 mt-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-semibold">
                      <Coins className="w-3 h-3" /> {budget.toFixed(2)} pts budget
                    </div>
                  </div>

                  <div className="mt-4 px-4 py-3 border-t border-border/50 bg-muted/20">
                    {isRejecting ? (
                      <div className="flex flex-col gap-2">
                        <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="h-9 text-xs" autoFocus />
                        <div className="flex gap-2">
                          <Btn variant="danger" size="sm" disabled={!rejectReason.trim()} className="flex-1"
                            onClick={() => { reject.mutate({ taskId, reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>
                            Reject
                          </Btn>
                          <Btn variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isPending ? (
                          <>
                            <Btn size="sm" className="flex-1" onClick={() => approve.mutate(taskId)}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                            </Btn>
                            <Btn variant="outline" size="sm" className="flex-1" onClick={() => setRejectingId(taskId)}>
                              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                            </Btn>
                          </>
                        ) : (
                          <Link href={`/tasks/${taskId}`} className="flex-1">
                            <Btn variant="outline" size="sm" className="w-full">View Task</Btn>
                          </Link>
                        )}
                        <Btn variant="outline" size="sm" className="text-error border-error/30 hover:bg-error/10" onClick={() => setDeleteTarget({ id: taskId, title })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Btn>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete task?"
        description={deleteTarget ? `This permanently removes "${deleteTarget.title}" and all its assignments. This cannot be undone.` : ""}
        confirmLabel="Delete Task"
        isLoading={remove.isPending}
      />
    </div>
  );
}

// ============================================================================
// Tab 4: Admin review submissions
// ============================================================================
function ReviewTab() {
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { data, isLoading } = usePendingReviews({ page, pageSize: 20 });
  const review = useReviewAssignment();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      {isLoading ? <LoadingSkeleton /> : items.length === 0 ? (
        <EmptyState icon={CheckCircle} title="All caught up!" description="No submissions pending review" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const user = item.users as Record<string, unknown>;
            const task = item.tasks as Record<string, unknown>;
            const platform = task?.platforms as Record<string, unknown>;
            const assignmentId = item.id as number;
            const name = String(user?.name || "Unknown");
            const email = String(user?.email || "");
            const taskTitle = String(task?.title || "");
            const platformName = String(platform?.name || "");
            const points = Number(task?.points_per_completion || task?.points || 0);
            const proofUrls = (item.proof_urls as string[]) || [];
            const proofShots = (item.proof_screenshots as string[]) || [];
            const notes = item.proof_notes ? String(item.proof_notes) : "";
            const isRejecting = rejectingId === assignmentId;

            return (
              <Card key={assignmentId} className="overflow-hidden">
                {/* DESKTOP — original */}
                <div className="hidden sm:block">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{getInitials(name)}</div>
                        <div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{email}</p></div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{taskTitle}</p>
                        <p className="text-xs text-muted-foreground">{platformName} &middot; {points} pts</p>
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      {proofUrls.map((url, i) => (
                        <a key={`u${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> URL {i + 1}</a>
                      ))}
                      {proofShots.map((url, i) => (
                        <a key={`s${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Screenshot {i + 1}</a>
                      ))}
                    </div>

                    {!!notes && <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">{notes}</p>}

                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Btn size="sm" onClick={() => review.mutate({ assignmentId, action: "approve" })}><CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve</Btn>
                      {isRejecting ? (
                        <div className="flex-1 flex gap-2">
                          <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." className="h-9 text-xs" autoFocus />
                          <Btn variant="danger" size="sm" disabled={!rejectReason.trim()} onClick={() => { review.mutate({ assignmentId, action: "reject", reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>Reject</Btn>
                          <Btn variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Btn>
                        </div>
                      ) : (
                        <Btn variant="outline" size="sm" onClick={() => setRejectingId(assignmentId)}><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Btn>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* MOBILE */}
                <div className="sm:hidden">
                  {/* Submitter */}
                  <div className="flex items-center gap-3 px-4 pt-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>
                  </div>

                  {/* Task block */}
                  <div className="mx-4 mt-3 rounded-xl bg-muted/40 border border-border/40 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      <FileText className="w-3 h-3" /> Submission
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">{taskTitle}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{platformName}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                        <Coins className="w-2.5 h-2.5" /> {points} pts
                      </span>
                    </div>
                  </div>

                  {/* Proof links */}
                  {(proofUrls.length > 0 || proofShots.length > 0) && (
                    <div className="px-4 mt-3 flex flex-wrap gap-2">
                      {proofUrls.map((url, i) => (
                        <a key={`mu${i}`} href={url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold active:scale-95">
                          <ExternalLink className="w-3 h-3" /> URL {i + 1}
                        </a>
                      ))}
                      {proofShots.map((url, i) => (
                        <a key={`ms${i}`} href={url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold active:scale-95">
                          <ImageIcon className="w-3 h-3" /> Screenshot {i + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {!!notes && (
                    <div className="px-4 mt-3">
                      <p className="text-xs text-muted-foreground bg-muted/40 border border-border/40 px-3 py-2 rounded-lg italic">
                        &ldquo;{notes}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 px-4 py-3 border-t border-border/50 bg-muted/20">
                    {isRejecting ? (
                      <div className="flex flex-col gap-2">
                        <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="h-9 text-xs" autoFocus />
                        <div className="flex gap-2">
                          <Btn variant="danger" size="sm" disabled={!rejectReason.trim()} className="flex-1"
                            onClick={() => { review.mutate({ assignmentId, action: "reject", reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>
                            Reject
                          </Btn>
                          <Btn variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Btn size="sm" className="flex-1" onClick={() => review.mutate({ assignmentId, action: "approve" })}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                        </Btn>
                        <Btn variant="outline" size="sm" className="flex-1" onClick={() => setRejectingId(assignmentId)}>
                          <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                        </Btn>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ============================================================================
// Shared
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _TaskGrid({ items, isAssignmentView, isCreatorView }: { items: Record<string, unknown>[]; isAssignmentView?: boolean; isCreatorView?: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const task = isAssignmentView ? (item.tasks as Record<string, unknown>) || item : item;
        const taskId = isAssignmentView ? (task.id as number) : (item.id as number);
        const title = String(task.title || "Untitled");
        const platform = task.platforms as Record<string, unknown> | undefined;
        const taskType = task.task_types as Record<string, unknown> | undefined;
        const points = Number(task.points_per_completion || task.points || 0);
        const priority = String(task.priority || "medium");
        const deadline = task.deadline as string | null;
        const status = isAssignmentView ? String(item.status) : String(task.status);
        const approval = String(task.approval_status || item.approval_status || "approved");
        const slug = String(platform?.slug || "");
        const config = PLATFORM_CONFIG[slug as keyof typeof PLATFORM_CONFIG];
        const badgeMap = isAssignmentView ? ASSIGNMENT_BADGE : TASK_STATUS_BADGE;
        const badge = badgeMap[status] || { variant: "default" as const, label: status };

        return (
          <Link key={`${taskId}-${item.id as number}`} href={`/tasks/${taskId}`}>
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: config?.color || "#666" }}>
                      {String(platform?.name || "?").charAt(0)}
                    </div>
                    <span className="text-xs text-muted-foreground">{String(taskType?.name || "Task")}</span>
                  </div>
                  <div className="flex gap-1">
                    {isCreatorView && approval !== "approved" && <Badge variant="warning">{approval.replace(/_/g, " ")}</Badge>}
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
                  <span className="font-semibold text-primary">{points.toFixed(2)} pts</span>
                  <span className={`capitalize ${priority === "high" ? "text-error" : priority === "medium" ? "text-warning" : ""}`}>{priority}</span>
                  {deadline && <span>{formatDate(deadline)}</span>}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (v: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-between items-center pt-4">
      <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
        <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
      </div>
    </div>
  );
}
