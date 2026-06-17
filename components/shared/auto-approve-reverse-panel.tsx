"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Btn, Badge, Textarea, FieldError, Modal } from "@/components/ui";
import { useReversibleAutoApprovedItems, useReverseAutoApprovedItem } from "@/hooks/use-tasks";
import { Music, Clock, RotateCcw, AlertTriangle } from "lucide-react";
import { formatRelativeTime, getInitials } from "@/lib/utils";

// Admin panel listing the music-stream auto-approvals that landed in the
// last 24h and still allow a reversal. Empty list → renders nothing (we
// don't clutter the audit page when there's nothing to do). Pairs with
// the auto-approve path inside lib/actions/assignments.ts → submitItemProof
// and the reverse_auto_approved_item RPC from migration 052.

type ReversibleRow = {
  id: number;
  status: string;
  points_awarded: number | string | null;
  auto_approved_at: string;
  task_bundle_items?: {
    id: number;
    task_id: number;
    task_types?: { slug: string; name: string };
  };
  task_assignments?: {
    id: number;
    user_id: string;
    users?: { name: string | null; email: string };
  };
};

// Tick-driven "Xh Ym left" countdown so admins can see the 24h window
// closing in real time without refetching.
function useNowTick(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function timeLeft(autoApprovedAt: string, now: number): string {
  const expiresAt = new Date(autoApprovedAt).getTime() + 24 * 60 * 60 * 1000;
  const diffMs = expiresAt - now;
  if (diffMs <= 0) return "expired";
  const totalMin = Math.floor(diffMs / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m left`;
  return `${h}h ${m}m left`;
}

export function AutoApproveReversePanel() {
  const { data, isLoading } = useReversibleAutoApprovedItems({ pageSize: 25 });
  const reverse = useReverseAutoApprovedItem();
  const now = useNowTick();

  const [openId, setOpenId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rows = (data?.data || []) as unknown as ReversibleRow[];

  // Empty state: render nothing so the audit page stays clean. The loading
  // skeleton is intentionally minimal — a single-line shimmer would feel
  // heavier than just waiting.
  if (isLoading) return null;
  if (rows.length === 0) return null;

  function openReverseModal(id: number) {
    setOpenId(id);
    setReason("");
    setError(null);
  }

  function closeModal() {
    setOpenId(null);
    setReason("");
    setError(null);
  }

  async function confirmReverse() {
    if (!openId) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Please provide a reason (at least 3 characters)");
      return;
    }
    setError(null);
    const r = await reverse.mutateAsync({ itemSubmissionId: openId, reason: trimmed });
    if (r.success) closeModal();
  }

  return (
    <>
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <Music className="w-4 h-4" /> Music Auto-Approvals — Reversible
            <Badge variant="warning" className="ml-2">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>
            Music-stream plays that auto-approved in the last 24h. You can reverse any of these — the
            worker is debited the credited points and the task budget is refunded. Outside this window
            the row disappears and the credit is permanent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rows.map((r) => {
              const user = r.task_assignments?.users;
              const name = user?.name || user?.email || "Unknown";
              const taskType = r.task_bundle_items?.task_types;
              const typeLabel = taskType?.name || taskType?.slug || "music play";
              const points = Number(r.points_awarded || 0);
              const taskId = r.task_bundle_items?.task_id;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-border transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {typeLabel}
                      {taskId ? ` · task #${taskId}` : ""}
                      {" · "}{formatRelativeTime(r.auto_approved_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold text-success">+{points.toFixed(2)}</p>
                    <p className="text-[10px] text-warning flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {timeLeft(r.auto_approved_at, now)}
                    </p>
                  </div>
                  <Btn
                    variant="danger"
                    size="sm"
                    onClick={() => openReverseModal(r.id)}
                    isLoading={reverse.isPending && openId === r.id}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reverse
                  </Btn>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={openId !== null} onClose={closeModal} ariaLabel="Reverse auto-approval">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Reverse this auto-approval?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The worker will be debited the credited points and the task budget will be refunded.
                A penalty entry is logged in points history. This cannot be undone — but you may
                re-approve through the normal review flow if needed.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Reason (visible in audit log)</label>
            <Textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(null); }}
              placeholder="e.g. Worker submitted multiple plays within seconds — likely scripted"
              rows={3}
              error={!!error}
              autoFocus
            />
            {error && <FieldError>{error}</FieldError>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={closeModal} disabled={reverse.isPending}>Cancel</Btn>
            <Btn variant="danger" onClick={confirmReverse} isLoading={reverse.isPending}>
              <RotateCcw className="w-3.5 h-3.5" /> Reverse approval
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}
