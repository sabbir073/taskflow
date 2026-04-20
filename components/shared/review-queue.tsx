"use client";

import { useState } from "react";
import { Card, CardContent, Btn, Input } from "@/components/ui";
import { CheckCircle, XCircle, ExternalLink, Image as ImageIcon, Inbox } from "lucide-react";
import { usePendingReviews, useReviewAssignment } from "@/hooks/use-tasks";
import { EmptyState } from "./empty-state";
import { formatRelativeTime, getInitials } from "@/lib/utils";

export function ReviewQueue() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingReviews({ page, pageSize: 20 });
  const review = useReviewAssignment();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  if (!isLoading && items.length === 0) return <EmptyState icon={Inbox} title="All caught up!" description="No pending submissions to review" />;

  return (
    <div className="space-y-4">
      {isLoading ? Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}><CardContent><div className="h-20 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
      )) : items.map((item) => {
        const user = item.users as Record<string, unknown>;
        const task = item.tasks as Record<string, unknown>;
        const platform = task?.platforms as Record<string, unknown>;
        const assignmentId = item.id as number;
        const name = String(user?.name || "Unknown");

        return (
          <Card key={assignmentId}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">{getInitials(name)}</div>
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{String(user?.email || "")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{String(task?.title || "")}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(platform?.name || "")} &middot; {Number(task?.points || 0)} pts &middot; {item.submitted_at ? formatRelativeTime(String(item.submitted_at)) : ""}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                {((item.proof_urls as string[]) || []).map((url, i) => (
                  <a key={`u${i}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> URL {i + 1}
                  </a>
                ))}
                {((item.proof_screenshots as string[]) || []).map((url, i) => (
                  <a key={`s${i}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <ImageIcon className="w-3.5 h-3.5" /> Screenshot {i + 1}
                  </a>
                ))}
              </div>

              {!!item.proof_notes && <p className="text-sm text-muted-foreground bg-muted/40 px-4 py-2.5 rounded-xl">{String(item.proof_notes)}</p>}

              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Btn size="sm" onClick={() => review.mutate({ assignmentId, action: "approve" })} disabled={review.isPending}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                </Btn>
                {rejectingId === assignmentId ? (
                  <div className="flex-1 flex gap-2">
                    <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (required)..." autoFocus className="h-9 text-xs" />
                    <Btn variant="danger" size="sm" disabled={!rejectReason.trim() || review.isPending} onClick={() => { review.mutate({ assignmentId, action: "reject", reason: rejectReason }); setRejectingId(null); setRejectReason(""); }}>Reject</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Btn>
                  </div>
                ) : (
                  <Btn variant="outline" size="sm" onClick={() => setRejectingId(assignmentId)}>
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
