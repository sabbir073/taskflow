"use client";

import { useState } from "react";
import { Card, CardContent, Btn, Badge, Select, Textarea, Input } from "@/components/ui";
import { AlertTriangle, CheckCircle, XCircle, Clock, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useAppeals, useReviewAppeal } from "@/hooks/use-appeals";
import { EmptyState } from "@/components/shared/empty-state";
import { getInitials, formatRelativeTime } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  mistake: "Mistake / Misunderstanding",
  accept_fault: "Accepts fault",
  hacked: "Account hacked",
  other: "Other",
};

export function AppealsManager() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [approveNotes, setApproveNotes] = useState<Record<number, string>>({});

  const { data, isLoading } = useAppeals({ page, pageSize: 20, status: statusFilter || undefined });
  const reviewAppeal = useReviewAppeal();

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  function onApprove(id: number) {
    reviewAppeal.mutate({ appealId: id, action: "approve", notes: approveNotes[id]?.trim() || undefined });
  }

  function onReject(id: number) {
    if (!rejectNotes.trim()) return;
    reviewAppeal.mutate(
      { appealId: id, action: "reject", notes: rejectNotes.trim() },
      { onSuccess: () => { setRejectTarget(null); setRejectNotes(""); } }
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-end gap-3">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-44">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading appeals...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No appeals" description="There are no appeals matching this filter." />
      ) : (
        <div className="space-y-3">
          {items.map((appeal) => {
            const id = appeal.id as number;
            const user = appeal.users as Record<string, unknown> | undefined;
            const userName = String(user?.name || "Unknown");
            const userEmail = String(user?.email || "");
            const status = String(appeal.status || "pending");
            const category = String(appeal.category || "");
            const categoryOther = String(appeal.category_other || "");
            const evidence = (appeal.evidence_urls as string[]) || [];

            return (
              <Card key={id}>
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {getInitials(userName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {status === "pending" && <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                      {status === "approved" && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
                      {status === "rejected" && <Badge variant="error"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>}
                      {!!appeal.created_at && (
                        <span className="text-[11px] text-muted-foreground">{formatRelativeTime(String(appeal.created_at))}</span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Category</p>
                      <p className="text-sm">
                        {CATEGORY_LABEL[category] || category}
                        {category === "other" && categoryOther && <span className="text-muted-foreground"> — {categoryOther}</span>}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Terms</p>
                      <p className="text-sm">{appeal.accepted_terms ? "Accepted" : "Not accepted"}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Why we should unsuspend</p>
                    <p className="text-sm whitespace-pre-wrap">{String(appeal.reason || "")}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">What happened</p>
                    <p className="text-sm whitespace-pre-wrap">{String(appeal.details || "")}</p>
                  </div>

                  {evidence.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Evidence ({evidence.length})</p>
                      <div className="flex gap-2 flex-wrap">
                        {evidence.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted text-xs text-primary transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> File {i + 1}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!appeal.review_notes && (
                    <div className="space-y-1 pt-2 border-t border-border/40">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Admin review</p>
                      <p className="text-sm text-muted-foreground">{String(appeal.review_notes)}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {status === "pending" && (
                    <div className="space-y-3 pt-3 border-t border-border/40">
                      {rejectTarget === id ? (
                        <div className="space-y-2">
                          <Input
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder="Reason for rejection (required)"
                          />
                          <div className="flex gap-2 justify-end">
                            <Btn variant="ghost" size="sm" onClick={() => { setRejectTarget(null); setRejectNotes(""); }}>Cancel</Btn>
                            <Btn variant="danger" size="sm" disabled={!rejectNotes.trim() || reviewAppeal.isPending} onClick={() => onReject(id)}>
                              Confirm Reject
                            </Btn>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            rows={2}
                            value={approveNotes[id] || ""}
                            onChange={(e) => setApproveNotes({ ...approveNotes, [id]: e.target.value })}
                            placeholder="Optional note for the user on approval"
                          />
                          <div className="flex gap-2 justify-end">
                            <Btn variant="outline" size="sm" onClick={() => { setRejectTarget(id); setRejectNotes(""); }}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Btn>
                            <Btn size="sm" onClick={() => onApprove(id)} isLoading={reviewAppeal.isPending}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve & Unsuspend
                            </Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({data?.total || 0} total)</p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
