"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Input, Select, Btn, Badge } from "@/components/ui";
import { Search, CheckCircle, XCircle, Coins, Trash2, User as UserIcon } from "lucide-react";
import { getTasks, approveTask, rejectTask, deleteTask } from "@/lib/actions/tasks";
import { EmptyState } from "./empty-state";
import { formatDate } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import { toast } from "sonner";
import Link from "next/link";

export function ManageTasksView() {
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tasks", page, search, approvalFilter],
    queryFn: () => getTasks({ page, pageSize: 20, search, approval_status: approvalFilter || undefined }),
  });

  const approve = useMutation({
    mutationFn: approveTask,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin-tasks"] }); } else toast.error(r.error); },
  });

  const reject = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: number; reason?: string }) => rejectTask(taskId, reason),
    onSuccess: (r) => { if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin-tasks"] }); } else toast.error(r.error); },
  });

  const remove = useMutation({
    mutationFn: deleteTask,
    onSuccess: (r) => { if (r.success) { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin-tasks"] }); } else toast.error(r.error); },
  });

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const approvalVariant: Record<string, "success" | "warning" | "error" | "default"> = {
    approved: "success", pending_approval: "warning", rejected_by_admin: "error",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }} className="sm:w-52">
          <option value="">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected_by_admin">Rejected</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent><div className="h-20 bg-muted rounded-xl animate-pulse" /></CardContent></Card>)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No tasks found" description="No tasks match the current filters" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const taskId = item.id as number;
            const title = String(item.title || "");
            const platform = item.platforms as Record<string, unknown> | undefined;
            const taskType = item.task_types as Record<string, unknown> | undefined;
            const creator = item.users as Record<string, unknown> | undefined;
            const slug = String(platform?.slug || "");
            const config = PLATFORM_CONFIG[slug as keyof typeof PLATFORM_CONFIG];
            const budget = Number(item.point_budget || 0);
            const perCompletion = Number(item.points_per_completion || 0);
            const approval = String(item.approval_status || "approved");
            const status = String(item.status || "draft");

            return (
              <Card key={taskId}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: config?.color || "#666" }}>
                        {String(platform?.name || "?").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/tasks/${taskId}`} className="font-semibold hover:text-primary transition-colors">{title}</Link>
                        <p className="text-xs text-muted-foreground">{String(platform?.name || "")} &middot; {String(taskType?.name || "")} &middot; {status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={approvalVariant[approval] || "default"}>{approval.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> {String(creator?.name || "Unknown")}</span>
                    <span className="flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-warning" /> {budget.toFixed(2)} budget &middot; {perCompletion.toFixed(2)}/task</span>
                    <span>{item.created_at ? formatDate(String(item.created_at)) : ""}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-border/50">
                    {approval === "pending_approval" && (
                      <>
                        <Btn size="sm" onClick={() => approve.mutate(taskId)} disabled={approve.isPending}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Btn>
                        {rejectingId === taskId ? (
                          <div className="flex-1 flex gap-2">
                            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." autoFocus className="h-9 text-xs" />
                            <Btn variant="danger" size="sm" disabled={!rejectReason.trim()} onClick={() => { reject.mutate({ taskId, reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>Reject</Btn>
                            <Btn variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Btn>
                          </div>
                        ) : (
                          <Btn variant="outline" size="sm" onClick={() => setRejectingId(taskId)}><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Btn>
                        )}
                      </>
                    )}
                    <Btn variant="ghost" size="sm" className="ml-auto text-error" onClick={() => remove.mutate(taskId)} disabled={remove.isPending}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Btn>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
