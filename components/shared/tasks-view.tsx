"use client";

import { useState } from "react";
import { Card, CardContent, Input, Select, Btn, Badge } from "@/components/ui";
import { Search, Clock, CheckCircle, XCircle, Send, Plus, Coins, Trash2 } from "lucide-react";
import { useTasks, useMyTasks, usePendingApprovalTasks, usePendingReviews, useApproveTask, useRejectTask, useReviewAssignment, useDeleteTask, useAcceptTask } from "@/hooks/use-tasks";
import { EmptyState } from "./empty-state";
import { formatDate, getInitials } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import Link from "next/link";
import { ExternalLink, Image as ImageIcon } from "lucide-react";

// For assignment view (doable tasks) - shows user's progress
const ASSIGNMENT_BADGE: Record<string, { variant: "default" | "primary" | "success" | "warning" | "error" | "accent"; label: string }> = {
  pending: { variant: "warning", label: "Not Started" },
  in_progress: { variant: "primary", label: "In Progress" },
  submitted: { variant: "accent", label: "Submitted" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "error", label: "Rejected" },
};

// For creator view (my tasks) - shows task lifecycle
const TASK_STATUS_BADGE: Record<string, { variant: "default" | "primary" | "success" | "warning" | "error" | "accent"; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  pending: { variant: "success", label: "Live" },
  in_progress: { variant: "primary", label: "Active" },
  submitted: { variant: "accent", label: "Active" },
  approved: { variant: "success", label: "Completed" },
  rejected: { variant: "error", label: "Rejected" },
};

export function TasksView({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const [activeTab, setActiveTab] = useState<"my" | "doable" | "manage" | "review">("my");

  const tabs = [
    { key: "my" as const, label: "My Tasks" },
    { key: "doable" as const, label: "Doable Tasks" },
    ...(isAdmin ? [
      { key: "manage" as const, label: "Manage Tasks" },
      { key: "review" as const, label: "Review Submissions" },
    ] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border/50 pb-px overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap relative
              ${activeTab === tab.key ? "text-primary bg-primary/5 border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "my" && <MyTasksTab userId={userId} />}
      {activeTab === "doable" && <DoableTasksTab />}
      {activeTab === "manage" && isAdmin && <ManageTasksTab />}
      {activeTab === "review" && isAdmin && <ReviewTab />}
    </div>
  );
}

// ===== Tab 1: Tasks I created =====
function MyTasksTab({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTasks({ page, pageSize: 20, search, created_by: userId });
  const removeTask = useDeleteTask();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const approvalVariant: Record<string, "success" | "warning" | "error" | "default"> = { approved: "success", pending_approval: "warning", rejected_by_admin: "error" };

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

            return (
              <Card key={taskId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: config?.color || "#666" }}>
                        {String(platform?.name || "?").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/tasks/${taskId}`} className="font-semibold text-sm hover:text-primary transition-colors">{title}</Link>
                        <p className="text-xs text-muted-foreground">
                          {String(platform?.name || "")} &middot; {String(taskType?.name || "")} &middot;
                          <span className="text-primary font-medium"> {points.toFixed(2)} pts/task</span> &middot;
                          Budget: {spent.toFixed(2)}/{budget.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {approval !== "approved" && <Badge variant={approvalVariant[approval] || "default"}>{approval.replace(/_/g, " ")}</Badge>}
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>

                      <Link href={`/tasks/${taskId}/edit`}>
                        <Btn variant="outline" size="sm">Edit</Btn>
                      </Link>
                      <Btn variant="ghost" size="sm" className="text-error" onClick={() => removeTask.mutate(taskId)} disabled={removeTask.isPending}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Btn>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ===== Tab 2: Tasks assigned to me =====
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

            return (
              <Card key={assignmentId} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    {/* Task info - clickable */}
                    <Link href={`/tasks/${taskId}`} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: config?.color || "#666" }}>
                        {String(platform?.name || "?").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate hover:text-primary transition-colors">{title}</p>
                        <p className="text-xs text-muted-foreground">{String(platform?.name || "")} &middot; {String(taskType?.name || "")} &middot; <span className="text-primary font-medium">{points.toFixed(2)} pts</span></p>
                      </div>
                    </Link>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={badge.variant}>{badge.label}</Badge>

                      {status === "pending" && (
                        <Btn size="sm" onClick={() => acceptTask.mutate(assignmentId)} isLoading={acceptTask.isPending}>
                          Accept
                        </Btn>
                      )}

                      {(status === "in_progress" || status === "rejected") && (
                        <Link href={`/tasks/${taskId}`}>
                          <Btn size="sm" variant="primary">Submit Proof</Btn>
                        </Link>
                      )}

                      {status === "submitted" && (
                        <Link href={`/tasks/${taskId}`}>
                          <Btn size="sm" variant="outline">View Status</Btn>
                        </Link>
                      )}

                      {status === "approved" && (
                        <span className="text-xs text-success font-medium flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> +{Number(item.points_awarded || 0).toFixed(2)} pts
                        </span>
                      )}

                      {/* Always show View button */}
                      <Link href={`/tasks/${taskId}`}>
                        <Btn variant="ghost" size="sm">View</Btn>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ===== Tab 3: Admin manage tasks =====
function ManageTasksTab() {
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useTasks({ page, pageSize: 20, search, approval_status: approvalFilter || undefined });
  const approve = useApproveTask();
  const reject = useRejectTask();
  const remove = useDeleteTask();
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const aVariant: Record<string, "success" | "warning" | "error" | "default"> = { approved: "success", pending_approval: "warning", rejected_by_admin: "error" };

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

            return (
              <Card key={taskId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: config?.color || "#666" }}>
                        {String(platform?.name || "?").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/tasks/${taskId}`} className="font-semibold text-sm hover:text-primary">{title}</Link>
                        <p className="text-xs text-muted-foreground">by {String(creator?.name || "Unknown")} &middot; <Coins className="w-3 h-3 inline text-warning" /> {budget.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={aVariant[approval] || "default"}>{approval.replace(/_/g, " ")}</Badge>
                      {approval === "pending_approval" && (
                        <>
                          <Btn size="sm" onClick={() => approve.mutate(taskId)}><CheckCircle className="w-3.5 h-3.5" /></Btn>
                          {rejectingId === taskId ? (
                            <div className="flex gap-1">
                              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." className="h-9 w-32 text-xs" />
                              <Btn variant="danger" size="sm" onClick={() => { reject.mutate({ taskId, reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>OK</Btn>
                            </div>
                          ) : (
                            <Btn variant="outline" size="sm" onClick={() => setRejectingId(taskId)}><XCircle className="w-3.5 h-3.5" /></Btn>
                          )}
                        </>
                      )}
                      <Btn variant="ghost" size="sm" className="text-error" onClick={() => remove.mutate(taskId)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ===== Tab 4: Admin review submissions =====
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

            return (
              <Card key={assignmentId}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{getInitials(name)}</div>
                      <div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{String(user?.email || "")}</p></div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{String(task?.title || "")}</p>
                      <p className="text-xs text-muted-foreground">{String(platform?.name || "")} &middot; {Number(task?.points_per_completion || task?.points || 0)} pts</p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    {((item.proof_urls as string[]) || []).map((url, i) => (
                      <a key={`u${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> URL {i + 1}</a>
                    ))}
                    {((item.proof_screenshots as string[]) || []).map((url, i) => (
                      <a key={`s${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Screenshot {i + 1}</a>
                    ))}
                  </div>

                  {!!item.proof_notes && <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">{String(item.proof_notes)}</p>}

                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Btn size="sm" onClick={() => review.mutate({ assignmentId, action: "approve" })}><CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve</Btn>
                    {rejectingId === assignmentId ? (
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
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ===== Shared components =====

function TaskGrid({ items, isAssignmentView, isCreatorView }: { items: Record<string, unknown>[]; isAssignmentView?: boolean; isCreatorView?: boolean }) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent><div className="h-24 bg-muted rounded-xl animate-pulse" /></CardContent></Card>)}
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
