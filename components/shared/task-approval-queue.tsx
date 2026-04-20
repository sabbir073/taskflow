"use client";

import { useState } from "react";
import { Card, CardContent, Btn, Input, Badge } from "@/components/ui";
import { CheckCircle, XCircle, Inbox, Coins, User as UserIcon } from "lucide-react";
import { usePendingApprovalTasks, useApproveTask, useRejectTask } from "@/hooks/use-tasks";
import { EmptyState } from "./empty-state";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";

export function TaskApprovalQueue() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingApprovalTasks({ page, pageSize: 20 });
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  if (!isLoading && items.length === 0) {
    return <EmptyState icon={Inbox} title="No pending approvals" description="All user-created tasks have been reviewed" />;
  }

  return (
    <div className="space-y-4">
      {isLoading ? Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}><CardContent><div className="h-24 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
      )) : items.map((item) => {
        const taskId = item.id as number;
        const title = String(item.title || "Untitled");
        const description = String(item.description || "");
        const platform = item.platforms as Record<string, unknown> | undefined;
        const taskType = item.task_types as Record<string, unknown> | undefined;
        const creator = item.users as Record<string, unknown> | undefined;
        const platformSlug = String(platform?.slug || "");
        const platformConfig = PLATFORM_CONFIG[platformSlug as keyof typeof PLATFORM_CONFIG];
        const budget = Number(item.point_budget || 0);
        const perCompletion = Number(item.points_per_completion || 0);

        return (
          <Card key={taskId}>
            <CardContent className="p-5 space-y-4">
              {/* Task info */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: platformConfig?.color || "#666" }}>
                    {String(platform?.name || "?").charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {String(platform?.name || "")} &middot; {String(taskType?.name || "")}
                    </p>
                    {description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{description}</p>}
                  </div>
                </div>
                <Badge variant="warning">Pending Approval</Badge>
              </div>

              {/* Creator + Budget */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="w-4 h-4" />
                  <span>Created by <strong className="text-foreground">{String(creator?.name || "Unknown")}</strong></span>
                  <span className="text-xs">({String(creator?.email || "")})</span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-warning" />
                  <span className="text-sm"><strong>{budget.toFixed(2)}</strong> total budget</span>
                </div>
                <span className="text-border">|</span>
                <span className="text-sm"><strong>{perCompletion.toFixed(2)}</strong> per completion</span>
                <span className="text-border">|</span>
                <span className="text-sm"><strong>{perCompletion > 0 ? Math.floor(budget / perCompletion) : 0}</strong> max completions</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Btn size="sm" onClick={() => approveTask.mutate(taskId)} disabled={approveTask.isPending}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve & Publish
                </Btn>
                {rejectingId === taskId ? (
                  <div className="flex-1 flex gap-2">
                    <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." autoFocus className="h-9 text-xs" />
                    <Btn variant="danger" size="sm" disabled={!rejectReason.trim() || rejectTask.isPending}
                      onClick={() => { rejectTask.mutate({ taskId, reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>
                      Reject & Refund
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Btn>
                  </div>
                ) : (
                  <Btn variant="outline" size="sm" onClick={() => setRejectingId(taskId)}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Btn>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

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
