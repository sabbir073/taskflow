"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Btn, Badge } from "@/components/ui";
import {
  Search, Clock, CheckCircle, XCircle, Plus, Coins,
  ExternalLink, Image as ImageIcon, FileText, ListTodo,
} from "lucide-react";
import { useTasks, useMyTasks, useApproveTask, useRejectTask, useReviewItemSubmission, usePendingItemReviews, useDeleteTask, useAcceptTask } from "@/hooks/use-tasks";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";
import { formatDate, getInitials } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import { PlatformTile } from "@/components/shared/platform-icon";
import { CATEGORY_LABELS } from "@/lib/constants";
import { TaskBundleCard } from "./task-bundle-card";
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

// APPROVAL_VARIANT moved into TaskBundleCard (each tab now delegates the
// approval badge to the card). Kept here historically for reference.

type TaskTab = "my" | "doable" | "manage" | "review";

// Resolve the starting tab from a URL ?tab= hint (e.g. the /inbox "Tasks
// awaiting approval" deep-link sends ?tab=manage). Admin-only tabs fall back
// to "doable" for non-staff so a tampered URL can't reveal the manage view.
function resolveInitialTab(initialTab: string | undefined, isAdmin: boolean): TaskTab {
  if (initialTab === "manage" || initialTab === "review") return isAdmin ? initialTab : "doable";
  if (initialTab === "my" || initialTab === "doable") return initialTab;
  return "doable";
}

export function TasksView({ isAdmin, userId, initialTab }: { isAdmin: boolean; userId: string; initialTab?: string }) {
  const [activeTab, setActiveTab] = useState<TaskTab>(() => resolveInitialTab(initialTab, isAdmin));

  const myTasksCount = useTasks({ page: 1, pageSize: 1, created_by: userId });
  const doableCount = useMyTasks({ page: 1, pageSize: 1 });
  const manageCount = useTasks({ page: 1, pageSize: 1 });
  // Review badge now counts pending per-ITEM submissions (a bundle worker
  // can land 1 of 4 items, which still warrants a review).
  const reviewCount = usePendingItemReviews({ page: 1, pageSize: 1 });

  const tabs = [
    { key: "doable" as const, label: "Doable Tasks", short: "Doable", count: doableCount.data?.total ?? 0 },
    { key: "my" as const, label: "My Tasks", short: "Mine", count: myTasksCount.data?.total ?? 0 },
    ...(isAdmin
      ? [
          { key: "manage" as const, label: "Manage Tasks", short: "Manage", count: manageCount.data?.total ?? 0 },
          { key: "review" as const, label: "Review Submissions", short: "Review", count: reviewCount.data?.total ?? 0 },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* UNIFIED PILL TABS — one render block across mobile / tablet /
          laptop / desktop (Entry #30). Mobile gets short labels + edge-
          bleed scroll (`-mx-4 sm:mx-0`, `px-4 sm:px-0`); tablet+ gets the
          full labels and stays within the page padding. Active pill uses
          the brand gradient + glow so it's unmistakable; inactive pills
          have a hover state for desktop mice. */}
      <div className="-mx-4 sm:mx-0 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-4 sm:px-0 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all
                  ${isActive
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"}`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
                <span className={`min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none tabular-nums
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
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const { data, isLoading } = useTasks({ page, pageSize: 20, search, created_by: userId, category: category || undefined });
  const removeTask = useDeleteTask();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <CategoryChips value={category} onChange={(v) => { setCategory(v); setPage(1); }} />
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search my tasks..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      {isLoading ? <LoadingSkeleton /> : items.length === 0 ? (
        <EmptyState icon={Plus} title="No tasks created yet" description="Create your first task to get started" action={{ label: "Create Task", href: "/tasks/create" }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <TaskBundleCard
              key={item.id as number}
              task={item}
              mode="creator"
              onDelete={(id: number, title: string) => setDeleteTarget({ id, title })}
            />
          ))}
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
// Category filter chips for the doable / manage tabs. Mirrors the
// `tasks.category` enum added in migration 051 (engagement / creation /
// review / music / maps / other) plus an "All" pseudo-value.
const CATEGORY_CHIPS: { value: string; label: string }[] = [
  { value: "",           label: "All" },
  { value: "engagement", label: "Engagement" },
  { value: "creation",   label: "Creation" },
  { value: "review",     label: "Reviews" },
  { value: "music",      label: "Music" },
  { value: "maps",       label: "Maps" },
  { value: "other",      label: "Other" },
];

function CategoryChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="-mx-4 sm:mx-0 overflow-x-auto scrollbar-none">
      <div className="flex gap-1.5 px-4 sm:px-0 min-w-max">
        {CATEGORY_CHIPS.map((c) => {
          const active = value === c.value;
          return (
            <button
              key={c.value || "all"}
              type="button"
              onClick={() => onChange(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                ${active
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow shadow-primary/25"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted active:scale-95"}`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DoableTasksTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyTasks({ page, pageSize: 20, search, status: statusFilter || undefined, category: category || undefined });
  const acceptTask = useAcceptTask();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <CategoryChips value={category} onChange={(v) => { setCategory(v); setPage(1); }} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const taskRow = (item.tasks as Record<string, unknown>) || item;
            return (
              <TaskBundleCard
                key={item.id as number}
                task={taskRow}
                assignmentId={item.id as number}
                assignmentStatus={String(item.status || "")}
                pointsAwarded={item.points_awarded as number | null | undefined}
                mode="doable"
                onAccept={(id: number) => acceptTask.mutate(id)}
                acceptPending={acceptTask.isPending}
              />
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// Shared row used by both the full Doable tab and the Dashboard preview.
// Keeping the desktop/mobile split here so both views render identically.
function DoableTaskRow({
  item,
  onAccept,
  acceptPending,
}: {
  item: Record<string, unknown>;
  onAccept: (assignmentId: number) => void;
  acceptPending: boolean;
}) {
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
  const category = String(task.category || "engagement") as keyof typeof CATEGORY_LABELS;
  const categoryLabel = CATEGORY_LABELS[category] || "Engagement";
  const typeName = String(taskType?.name || "");
  const earned = Number(item.points_awarded || 0);

  return (
    <Card className="overflow-hidden border-border/60 shadow-none hover:border-primary/30 hover:shadow-sm transition-all">
      {/* DESKTOP — original */}
      <div className="hidden sm:block">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/tasks/${taskId}`} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity">
              <PlatformTile slug={slug} name={platformName} color={platformColor} className="w-10 h-10 rounded-xl" iconClassName="w-5 h-5" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate hover:text-primary transition-colors">{title}</p>
                <p className="text-xs text-muted-foreground">{platformName} &middot; {typeName} &middot; <span className="text-primary font-medium">{points.toFixed(2)} pts</span></p>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="default">{categoryLabel}</Badge>
              <Badge variant={badge.variant}>{badge.label}</Badge>

              {status === "pending" && (
                <Btn size="sm" onClick={() => onAccept(assignmentId)} isLoading={acceptPending}>Accept</Btn>
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
            <PlatformTile slug={slug} name={platformName} color={platformColor} className="w-11 h-11 rounded-2xl shadow-sm" iconClassName="w-5 h-5" letterClassName="text-lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{platformName}</p>
              <p className="text-xs text-muted-foreground/80 truncate">{typeName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Badge variant="default">{categoryLabel}</Badge>
          </div>
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
            <Btn size="sm" className="flex-1" onClick={() => onAccept(assignmentId)} isLoading={acceptPending}>
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
}

// Dashboard preview: top N doable tasks in a full-width card with "View all"
// link. Mounted in <DashboardContent /> directly under the stat-cards row.
export function DoableTasksPreview({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useMyTasks({ page: 1, pageSize: limit });
  const acceptTask = useAcceptTask();
  const items = data?.data || [];
  const total = data?.total ?? 0;

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-sm shadow-primary/30 shrink-0">
            <ListTodo className="w-4 h-4 text-white" />
          </div>
          <CardTitle>Available Tasks {total > 0 && <span className="text-sm font-normal text-muted-foreground ml-1">({total})</span>}</CardTitle>
        </div>
        <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
          View all <ExternalLink className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No tasks available right now</p>
        ) : (
          items.map((item) => (
            <DoableTaskRow
              key={item.id as number}
              item={item}
              onAccept={(assignmentId) => acceptTask.mutate(assignmentId)}
              acceptPending={acceptTask.isPending}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab 3: Admin manage tasks
// ============================================================================
function ManageTasksTab() {
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  // rejectingId / rejectReason state moved INTO TaskBundleCard (each card
  // owns its own inline reject input now), so we only keep the delete-modal
  // target here.
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

  const { data, isLoading } = useTasks({ page, pageSize: 20, search, approval_status: approvalFilter || undefined, category: category || undefined });
  const approve = useApproveTask();
  const reject = useRejectTask();
  const remove = useDeleteTask();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <CategoryChips value={category} onChange={(v) => { setCategory(v); setPage(1); }} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <TaskBundleCard
              key={item.id as number}
              task={item}
              mode="admin"
              onApprove={(id: number) => approve.mutate(id)}
              onReject={(id: number, reason: string) => reject.mutate({ taskId: id, reason })}
              rejectPending={reject.isPending}
              onDelete={(id: number, title: string) => setDeleteTarget({ id, title })}
            />
          ))}
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
//
// Bundle-aware: lists individual `assignment_item_submissions` rows in the
// 'submitted' state. Sibling items belonging to the same assignment are
// rendered as separate cards (admin reviews each item independently). When
// the LAST item is approved the parent assignment auto-finalises and the
// completion bonus is credited atomically inside the RPC.
// ============================================================================
function ReviewTab() {
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { data, isLoading } = usePendingItemReviews({ page, pageSize: 20 });
  const review = useReviewItemSubmission();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      {isLoading ? <LoadingSkeleton /> : items.length === 0 ? (
        <EmptyState icon={CheckCircle} title="All caught up!" description="No submissions pending review" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            // Item submission row joined with bundle item + parent assignment.
            const bundleItem = (item.task_bundle_items as Record<string, unknown> | undefined) || {};
            const itemTaskType = (bundleItem.task_types as Record<string, unknown> | undefined) || {};
            const parent = (item.task_assignments as Record<string, unknown> | undefined) || {};
            const task = (parent.tasks as Record<string, unknown> | undefined) || {};
            const user = (parent.users as Record<string, unknown> | undefined) || {};
            const platform = (task.platforms as Record<string, unknown> | undefined) || {};

            const itemSubmissionId = item.id as number;
            const taskId = task.id as number;
            const name = String(user?.name || "Unknown");
            const email = String(user?.email || "");
            const taskTitle = String(task?.title || "");
            const platformName = String(platform?.name || "");
            const itemName = String(itemTaskType?.name || "Action");
            const points = Number(bundleItem?.points || 0);
            const proofUrls = (item.proof_urls as string[]) || [];
            const proofShots = (item.proof_screenshots as string[]) || [];
            const notes = item.proof_notes ? String(item.proof_notes) : "";
            const isRejecting = rejectingId === itemSubmissionId;
            const completionBonus = Number(task?.completion_bonus || 0);

            return (
              <Card key={itemSubmissionId} className="overflow-hidden">
                {/* DESKTOP */}
                <div className="hidden sm:block">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{getInitials(name)}</div>
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-2">
                            {name}
                            <span className="font-mono text-[10px] text-muted-foreground font-normal">#{itemSubmissionId}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Link href={`/tasks/${taskId}`} className="text-sm font-medium hover:text-primary transition-colors">{taskTitle}</Link>
                        <p className="text-xs text-muted-foreground">{platformName} &middot; <span className="text-primary font-semibold">{itemName}</span> &middot; {points.toFixed(2)} pts</p>
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      {proofUrls.map((url, i) => (
                        <a key={`u${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> URL {i + 1}</a>
                      ))}
                      {proofShots.map((url, i) => (
                        <a key={`s${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Screenshot {i + 1}</a>
                      ))}
                      {proofUrls.length === 0 && proofShots.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">Auto-submitted (no proof required)</span>
                      )}
                    </div>

                    {!!notes && <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">{notes}</p>}

                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Btn size="sm" onClick={() => review.mutate({ itemSubmissionId, action: "approve" })} disabled={review.isPending}><CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve</Btn>
                      {isRejecting ? (
                        <div className="flex-1 flex gap-2">
                          <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." className="h-9 text-xs" autoFocus />
                          <Btn variant="danger" size="sm" disabled={!rejectReason.trim() || review.isPending} onClick={() => { review.mutate({ itemSubmissionId, action: "reject", reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>Reject</Btn>
                          <Btn variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Btn>
                        </div>
                      ) : (
                        <Btn variant="outline" size="sm" onClick={() => setRejectingId(itemSubmissionId)}><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Btn>
                      )}
                      {completionBonus > 0 && (
                        <span className="ml-auto text-[11px] text-muted-foreground self-center">+ {completionBonus.toFixed(2)} bundle bonus pending</span>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* MOBILE */}
                <div className="sm:hidden">
                  <div className="flex items-center gap-3 px-4 pt-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>
                  </div>

                  <div className="mx-4 mt-3 rounded-xl bg-muted/40 border border-border/40 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      <FileText className="w-3 h-3" /> {itemName}
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">{taskTitle}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{platformName}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                        <Coins className="w-2.5 h-2.5" /> {points.toFixed(2)} pts
                      </span>
                    </div>
                  </div>

                  {(proofUrls.length > 0 || proofShots.length > 0) ? (
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
                  ) : (
                    <p className="px-4 mt-3 text-[11px] text-muted-foreground italic">Auto-submitted (no proof required)</p>
                  )}

                  {!!notes && (
                    <div className="px-4 mt-3">
                      <p className="text-xs text-muted-foreground bg-muted/40 border border-border/40 px-3 py-2 rounded-lg italic">
                        &ldquo;{notes}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="mt-4 px-4 py-3 border-t border-border/50 bg-muted/20">
                    {isRejecting ? (
                      <div className="flex flex-col gap-2">
                        <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="h-9 text-xs" autoFocus />
                        <div className="flex gap-2">
                          <Btn variant="danger" size="sm" disabled={!rejectReason.trim() || review.isPending} className="flex-1"
                            onClick={() => { review.mutate({ itemSubmissionId, action: "reject", reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>
                            Reject
                          </Btn>
                          <Btn variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Btn size="sm" className="flex-1" onClick={() => review.mutate({ itemSubmissionId, action: "approve" })} disabled={review.isPending}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                        </Btn>
                        <Btn variant="outline" size="sm" className="flex-1" onClick={() => setRejectingId(itemSubmissionId)}>
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
                    <PlatformTile slug={slug} name={String(platform?.name || "")} color={config?.color} className="w-7 h-7 rounded-lg" iconClassName="w-4 h-4" letterClassName="text-xs" />
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
