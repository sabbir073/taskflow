"use client";

import { useState } from "react";
import { Card, CardContent, Btn, Badge, Select, Input, Modal } from "@/components/ui";
import { Crown, Check, X, DollarSign, Phone } from "lucide-react";
import { useGroupApplications, useReviewGroupApplication } from "@/hooks/use-group-access";
import { getInitials, formatRelativeTime } from "@/lib/utils";

type Variant = "warning" | "accent" | "primary" | "success" | "error" | "default";
const STATUS_BADGE: Record<string, { variant: Variant; label: string }> = {
  awaiting_quote: { variant: "warning", label: "Awaiting quote" },
  awaiting_payment: { variant: "accent", label: "Awaiting payment" },
  pending_review: { variant: "primary", label: "Pending review" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "error", label: "Rejected" },
};

const FILTERS = ["", "awaiting_quote", "pending_review", "awaiting_payment", "approved", "rejected"] as const;
const FILTER_LABEL: Record<string, string> = {
  "": "All", awaiting_quote: "Awaiting quote", pending_review: "Pending review",
  awaiting_payment: "Awaiting payment", approved: "Approved", rejected: "Rejected",
};

export function GroupApplicationsManager() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGroupApplications({ page, pageSize: 20, status: statusFilter || undefined });
  const [target, setTarget] = useState<{ app: Record<string, unknown>; mode: "quote" | "approve" | "reject" } | null>(null);

  const items = (data?.data || []) as Record<string, unknown>[];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status">
          {FILTERS.map((f) => <option key={f} value={f}>{FILTER_LABEL[f]}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No applications</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((app) => (
            <ApplicationCard key={app.id as number} app={app} onAction={(mode) => setTarget({ app, mode })} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Btn>
          <span className="text-xs text-muted-foreground tabular-nums">Page {page} / {totalPages}</span>
          <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
        </div>
      )}

      {target && <ReviewModal app={target.app} mode={target.mode} onClose={() => setTarget(null)} />}
    </div>
  );
}

function ApplicationCard({ app, onAction }: { app: Record<string, unknown>; onAction: (mode: "quote" | "approve" | "reject") => void }) {
  const user = app.users as Record<string, unknown> | undefined;
  const method = app.payment_methods as Record<string, unknown> | undefined;
  const status = String(app.status);
  const badge = STATUS_BADGE[status] || { variant: "default" as Variant, label: status };
  const name = String(user?.name || user?.email || "Unknown");
  const price = app.price == null ? null : Number(app.price);
  const finalized = status === "approved" || status === "rejected";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{String(user?.email || "")}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Crown className="w-3 h-3" /> {String(app.requested_groups)} groups · {String(app.requested_members)} members · {String(app.requested_tasks)} tasks</span>
              </div>
              {app.contact_number ? (
                <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {String(app.contact_number)}</p>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(String(app.created_at))}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
          <span>Mode: <span className="font-medium text-foreground">{String(app.pricing_mode)}</span></span>
          {price != null && <span>Price: <span className="font-medium text-primary tabular-nums">{price.toFixed(2)} {String(app.currency || "usd").toUpperCase()}</span></span>}
          {app.transaction_id ? <span>Txn: <span className="font-mono text-foreground">{String(app.transaction_id)}</span>{method?.name ? ` (${String(method.name)})` : ""}</span> : null}
          {app.review_notes ? <span className="w-full text-foreground/80">Note: {String(app.review_notes)}</span> : null}
        </div>

        {!finalized && (
          <div className="flex flex-wrap gap-2 mt-3">
            {status === "awaiting_quote" && (
              <Btn size="sm" onClick={() => onAction("quote")}><DollarSign className="w-3.5 h-3.5 mr-1" /> Set price</Btn>
            )}
            <Btn size="sm" variant="primary" onClick={() => onAction("approve")}><Check className="w-3.5 h-3.5 mr-1" /> Approve</Btn>
            <Btn size="sm" variant="danger" onClick={() => onAction("reject")}><X className="w-3.5 h-3.5 mr-1" /> Reject</Btn>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewModal({ app, mode, onClose }: { app: Record<string, unknown>; mode: "quote" | "approve" | "reject"; onClose: () => void }) {
  const review = useReviewGroupApplication();
  const [price, setPrice] = useState<number>(Number(app.price || 0));
  const [groups, setGroups] = useState<number>(Number(app.granted_groups ?? app.requested_groups ?? 1));
  const [members, setMembers] = useState<number>(Number(app.granted_members ?? app.requested_members ?? 0));
  const [tasks, setTasks] = useState<number>(Number(app.granted_tasks ?? app.requested_tasks ?? 0));
  const [notes, setNotes] = useState("");

  const title = mode === "quote" ? "Set price & limits" : mode === "approve" ? "Approve & grant access" : "Reject application";

  async function submit() {
    const r = await review.mutateAsync({
      appId: app.id as number,
      action: mode,
      opts: mode === "reject"
        ? { notes }
        : { price, granted_groups: groups, granted_members: members, granted_tasks: tasks, notes },
    });
    if (r.success) onClose();
  }

  return (
    <Modal isOpen onClose={onClose} panelClassName="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border/50 overflow-hidden">
      <div className="p-5 space-y-4">
        <h3 className="text-lg font-bold">{title}</h3>

        {mode !== "reject" && (
          <>
            {mode === "quote" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Price (USD)</label>
                <Input type="number" min={0} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Groups</label>
                <Input type="number" min={1} value={groups} onChange={(e) => setGroups(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Members</label>
                <Input type="number" min={0} value={members} onChange={(e) => setMembers(Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tasks</label>
                <Input type="number" min={0} value={tasks} onChange={(e) => setTasks(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground">{mode === "reject" ? "Reason (optional)" : "Note (optional)"}</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={mode === "reject" ? "Why is this rejected?" : "Optional note to the applicant"} />
        </div>

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant={mode === "reject" ? "danger" : "primary"} onClick={submit} isLoading={review.isPending}>
            {mode === "quote" ? "Send price" : mode === "approve" ? "Approve & grant" : "Reject"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
