"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Btn, Badge, Input } from "@/components/ui";
import { Clock, CheckCircle, XCircle, Edit2, Trash2, Coins } from "lucide-react";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import {
  CATEGORY_LABELS,
  getTaskTier,
  TIER_BADGE_VARIANT,
  type TaskTier,
} from "@/lib/constants";
import { getTaskTypeIconStyle } from "@/lib/utils/task-type-icons";
import { PlatformTile as SharedPlatformTile } from "./platform-icon";

// ============================================================================
// TaskBundleCard
// ----------------------------------------------------------------------------
// One responsive card that renders consistently across the three task-list
// tabs of /tasks (Doable, My Tasks, Manage Tasks). The mode prop drives the
// action footer:
//   - "doable"  : worker view — Accept / Submit / Awaiting review / Earned
//   - "creator" : task creator's own task — Edit + Delete
//   - "admin"   : admin moderation — Approve + Reject(+ reason) + Delete
//
// The Review Submissions tab uses a different row-based layout (proof URLs +
// per-item approve/reject) and stays on its own component — this card is not
// for that.
//
// Reads bundle items off `task.task_bundle_items` (Entry #20 select-string
// extension). Falls back to the legacy single `task.task_types` row if a
// task has zero bundle items, so cards still render for any pre-migration
// data that didn't get backfilled.
// ============================================================================

type CardMode = "doable" | "creator" | "admin";

type BundleItem = {
  id: number;
  points: number;
  sort_order: number;
  task_types?: { slug: string; name: string };
};

interface Props {
  /** The task row from getTasks / getMyTasks (joined shape). */
  task: Record<string, unknown>;
  /** Only used in "doable" mode — from the task_assignments row. */
  assignmentId?: number;
  assignmentStatus?: string;
  /** Worker's earned points on this assignment (doable + approved only). */
  pointsAwarded?: number | null;
  mode: CardMode;
  // Mode-specific action handlers. The card calls these but doesn't decide
  // whether to invoke them — parent gates by mode + status.
  onAccept?: (assignmentId: number) => void;
  acceptPending?: boolean;
  onDelete?: (taskId: number, title: string) => void;
  onApprove?: (taskId: number) => void;
  onReject?: (taskId: number, reason: string) => void;
  rejectPending?: boolean;
}

const ASSIGNMENT_STATUS_BADGE: Record<
  string,
  { variant: "default" | "primary" | "success" | "warning" | "error" | "accent"; label: string }
> = {
  pending: { variant: "warning", label: "Not started" },
  in_progress: { variant: "primary", label: "In progress" },
  submitted: { variant: "accent", label: "Submitted" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "error", label: "Rejected" },
};

const APPROVAL_BADGE: Record<
  string,
  { variant: "default" | "primary" | "success" | "warning" | "error"; label: string }
> = {
  approved: { variant: "success", label: "Live" },
  pending_approval: { variant: "warning", label: "Pending review" },
  rejected_by_admin: { variant: "error", label: "Rejected" },
};

export function TaskBundleCard({
  task,
  assignmentId,
  assignmentStatus,
  pointsAwarded,
  mode,
  onAccept,
  acceptPending,
  onDelete,
  onApprove,
  onReject,
  rejectPending,
}: Props) {
  const taskId = Number(task.id || 0);
  const title = String(task.title || "Untitled");
  // Strip HTML tags from rich-text descriptions so the line-clamp shows
  // human-readable preview text, not "<p>foo</p>".
  const descriptionHtml = String(task.description || "");
  const description = descriptionHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const platform = (task.platforms as Record<string, unknown> | undefined) || {};
  const platformSlug = String(platform.slug || "");
  const platformConfig = PLATFORM_CONFIG[platformSlug as keyof typeof PLATFORM_CONFIG];
  const platformName = String(platformConfig?.name || platform.name || "Platform");
  const platformColor = String(platformConfig?.color || "#6b6b7b");

  const pointsPerCompletion = Number(task.points_per_completion || task.points || 0);
  const completionBonus = Number(task.completion_bonus || 0);
  const totalCredit = pointsPerCompletion + completionBonus;
  const baseSum = pointsPerCompletion; // bundle items sum mirrors points_per_completion

  const tier = getTaskTier(pointsPerCompletion, completionBonus);

  const category = String(task.category || "engagement") as keyof typeof CATEGORY_LABELS;
  const categoryLabel = CATEGORY_LABELS[category] || "Engagement";

  // Slot proxy: see plan §1. We use budget-based math so no extra query is
  // needed per card. Falls back gracefully when either column is missing.
  const pointBudget = Number(task.point_budget || 0);
  const pointsSpent = Number(task.points_spent || 0);
  const maxCompletions = task.max_completions != null ? Number(task.max_completions) : null;
  const slotsTotal = maxCompletions != null
    ? maxCompletions
    : (pointsPerCompletion > 0 ? Math.floor(pointBudget / pointsPerCompletion) : 0);
  const slotsFilled = pointsPerCompletion > 0 ? Math.floor(pointsSpent / pointsPerCompletion) : 0;
  const slotsLeft = Math.max(0, slotsTotal - slotsFilled);
  const fillPercent = slotsTotal > 0
    ? Math.min(100, Math.round((slotsFilled / slotsTotal) * 100))
    : 0;

  // Bundle items — sorted by admin-defined order. Fall back to the legacy
  // single task_type if no bundle items exist.
  const bundleItemsRaw = Array.isArray(task.task_bundle_items)
    ? (task.task_bundle_items as BundleItem[])
    : [];
  const sortedBundleItems = [...bundleItemsRaw].sort(
    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
  );
  const fallbackItem: BundleItem | null = sortedBundleItems.length === 0 && task.task_types
    ? {
        id: 0,
        points: pointsPerCompletion,
        sort_order: 0,
        task_types: task.task_types as { slug: string; name: string },
      }
    : null;
  const pillItems = sortedBundleItems.length > 0 ? sortedBundleItems : (fallbackItem ? [fallbackItem] : []);

  const approval = String(task.approval_status || "approved");
  const status = assignmentStatus || "";
  // Status visibility lives in <CardStatusBanner> below — it has the same
  // gating logic as the deleted header right-column did, but renders the
  // info as a soft dot+label next to the action button instead.

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <Card className="overflow-hidden flex flex-col transition hover:border-foreground/15 hover:shadow-sm">
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col">
        {/* HEADER ROW — two columns now (tile + middle). The assignment /
            approval status badge previously occupied a third right-aligned
            column which squeezed the title onto 2 lines on tablet + tight
            desktop. Status moved to <CardStatusBanner> above the action
            button below (Entry #28). */}
        <div className="flex items-start gap-3 mb-2.5">
          <PlatformTile slug={platformSlug} color={platformColor} name={platformName} tier={tier} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 min-w-0">
              {/* Compact tier chip: `shrink-0` keeps its natural width;
                  `text-[9px] px-1.5 py-0` makes it visually small so it
                  doesn't crowd the truncating platform name. */}
              <Badge variant={TIER_BADGE_VARIANT[tier]} className="text-[9px] px-1.5 py-0 shrink-0">
                {tier}
              </Badge>
              {/* `truncate min-w-0` makes the platform name shrink-and-
                  ellipsis on tablet/mobile when the column is tight, so
                  the row stays single-line. `min-w-0` on the parent flex
                  is what unlocks shrinking on a flex child. */}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate min-w-0">
                {platformName}
              </span>
            </div>
            <Link
              href={`/tasks/${taskId}`}
              title={title}
              className="block font-bold text-[15px] leading-snug hover:text-primary transition-colors line-clamp-1"
            >
              {title}
            </Link>
          </div>
        </div>

        {/* DESCRIPTION — 2 lines on mobile to keep the card height tight
            on phones; 3 lines on sm+ where horizontal space is wider so
            extra preview text doesn't disproportionately stretch the card. */}
        {description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 sm:line-clamp-3 leading-snug wrap-break-word">
            {description}
          </p>
        )}

        {/* BUNDLE ACTION PILLS */}
        {pillItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {pillItems.map((bi) => {
              const slug = bi.task_types?.slug || "";
              const { Icon, tint } = getTaskTypeIconStyle(slug);
              const pts = Number(bi.points || 0);
              return (
                <span
                  key={bi.id || slug}
                  title={bi.task_types?.name || slug}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold border ${tint}`}
                >
                  <Icon className="w-3 h-3" />
                  +{pts.toFixed(0)}
                </span>
              );
            })}
            <span className="inline-flex items-center text-[10px] text-muted-foreground/70 ml-1">
              · {categoryLabel}
            </span>
          </div>
        )}

        {/* FOOTER — credit + slots progress */}
        <div className="mt-auto pt-4 border-t border-border/40 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-primary leading-none">{totalCredit.toFixed(0)}</span>
              <span className="text-xs text-muted-foreground font-medium">cr</span>
            </div>
            {completionBonus > 0 && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                {baseSum.toFixed(0)} + {completionBonus.toFixed(0)} bonus
              </p>
            )}
          </div>
          <div className="text-right min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground mb-1">
              {slotsLeft.toLocaleString()} slots left
            </p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500"
                style={{ width: `${fillPercent}%` }}
                aria-label={`${fillPercent}% filled`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODE ACTIONS — status dot/label lives above the CTA so the worker
          sees the relevant signal next to the button they're about to
          press. Took over the role of the deleted header right-column. */}
      <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-4 pt-0">
        <CardStatusBanner
          assignmentStatus={assignmentStatus}
          approval={approval}
          mode={mode}
        />
        {mode === "doable" && (
          <DoableActions
            status={status}
            assignmentId={assignmentId}
            taskId={taskId}
            pointsAwarded={pointsAwarded}
            onAccept={onAccept}
            acceptPending={acceptPending}
          />
        )}
        {mode === "creator" && (
          <CreatorActions taskId={taskId} title={title} onDelete={onDelete} />
        )}
        {mode === "admin" && (
          <AdminActions
            taskId={taskId}
            title={title}
            approval={approval}
            onApprove={onApprove}
            onDelete={onDelete}
            rejectOpen={rejectOpen}
            rejectReason={rejectReason}
            setRejectOpen={setRejectOpen}
            setRejectReason={setRejectReason}
            onReject={onReject}
            rejectPending={rejectPending}
          />
        )}
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Mode-specific action footers
// ----------------------------------------------------------------------------

function DoableActions({
  status, assignmentId, taskId, pointsAwarded, onAccept, acceptPending,
}: {
  status: string;
  assignmentId?: number;
  taskId: number;
  pointsAwarded?: number | null;
  onAccept?: (assignmentId: number) => void;
  acceptPending?: boolean;
}) {
  if (status === "pending") {
    return (
      <Btn
        className="w-full"
        onClick={() => assignmentId != null && onAccept?.(assignmentId)}
        isLoading={!!acceptPending}
      >
        Accept task
      </Btn>
    );
  }
  if (status === "in_progress" || status === "rejected") {
    return (
      <Link href={`/tasks/${taskId}`} className="block">
        <Btn className="w-full" variant="primary">Submit proof</Btn>
      </Link>
    );
  }
  if (status === "submitted") {
    return (
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Awaiting admin review
      </p>
    );
  }
  if (status === "approved") {
    return (
      <p className="text-sm font-semibold text-success text-center flex items-center justify-center gap-1.5">
        <CheckCircle className="w-4 h-4" /> +{Number(pointsAwarded || 0).toFixed(0)} pts earned
      </p>
    );
  }
  // Fallback (e.g., cancelled) — link to task detail
  return (
    <Link href={`/tasks/${taskId}`} className="block">
      <Btn className="w-full" variant="outline">View task</Btn>
    </Link>
  );
}

function CreatorActions({
  taskId, title, onDelete,
}: {
  taskId: number;
  title: string;
  onDelete?: (taskId: number, title: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Link href={`/tasks/${taskId}/edit`} className="flex-1">
        <Btn variant="outline" size="sm" className="w-full">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </Btn>
      </Link>
      <Btn
        variant="ghost"
        size="sm"
        className="text-error"
        onClick={() => onDelete?.(taskId, title)}
        aria-label="Delete task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Btn>
      <Link href={`/tasks/${taskId}`}>
        <Btn variant="ghost" size="sm">View</Btn>
      </Link>
    </div>
  );
}

function AdminActions({
  taskId, title, approval, onApprove, onDelete, onReject,
  rejectOpen, rejectReason, setRejectOpen, setRejectReason, rejectPending,
}: {
  taskId: number;
  title: string;
  approval: string;
  onApprove?: (taskId: number) => void;
  onDelete?: (taskId: number, title: string) => void;
  onReject?: (taskId: number, reason: string) => void;
  rejectOpen: boolean;
  rejectReason: string;
  setRejectOpen: (open: boolean) => void;
  setRejectReason: (reason: string) => void;
  rejectPending?: boolean;
}) {
  const isPending = approval === "pending_approval";

  if (rejectOpen) {
    return (
      <div className="space-y-2">
        <Input
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Rejection reason (visible to creator)..."
          className="h-9 text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Btn
            variant="danger"
            size="sm"
            className="flex-1"
            disabled={!rejectReason.trim() || !!rejectPending}
            onClick={() => {
              onReject?.(taskId, rejectReason.trim());
              setRejectOpen(false);
              setRejectReason("");
            }}
          >
            Confirm reject
          </Btn>
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => { setRejectOpen(false); setRejectReason(""); }}
          >
            Cancel
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {isPending && (
        <>
          <Btn
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onApprove?.(taskId)}
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </Btn>
          <Btn variant="outline" size="sm" onClick={() => setRejectOpen(true)}>
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Btn>
        </>
      )}
      {!isPending && (
        <Link href={`/tasks/${taskId}`} className="flex-1">
          <Btn variant="outline" size="sm" className="w-full">
            <Coins className="w-3.5 h-3.5" /> View
          </Btn>
        </Link>
      )}
      <Btn
        variant="ghost"
        size="sm"
        className="text-error"
        onClick={() => onDelete?.(taskId, title)}
        aria-label="Delete task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Btn>
    </div>
  );
}

// ----------------------------------------------------------------------------
// CardStatusBanner — soft "dot + label" status indicator above the CTA.
// ----------------------------------------------------------------------------
// Replaces the badge stack that used to sit in the header's right column
// (the column that crushed the title down to 2 lines on tablet). Renders as
// a tinted pill with a small filled dot — visually quieter than a Badge,
// so it reads as "status next to the action" rather than competing for
// attention with the title at the top.
//
// In doable mode the assignment-state pill takes priority; admins / creators
// looking at non-approved tasks also see the approval state. Returns null
// when there's nothing to surface so the card doesn't show empty whitespace
// above the action button.
function CardStatusBanner({
  assignmentStatus,
  approval,
  mode,
}: {
  assignmentStatus?: string;
  approval: string;
  mode: CardMode;
}) {
  const showAssign = mode === "doable" && !!assignmentStatus && !!ASSIGNMENT_STATUS_BADGE[assignmentStatus];
  const showApproval = approval !== "approved" && !!APPROVAL_BADGE[approval];
  if (!showAssign && !showApproval) return null;

  const colorByVariant: Record<string, string> = {
    warning: "bg-warning/15 text-warning",
    primary: "bg-primary/15 text-primary",
    accent:  "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    error:   "bg-error/15 text-error",
    default: "bg-muted text-muted-foreground",
  };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {showAssign && (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${colorByVariant[ASSIGNMENT_STATUS_BADGE[assignmentStatus!].variant]}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {ASSIGNMENT_STATUS_BADGE[assignmentStatus!].label}
        </span>
      )}
      {showApproval && (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${colorByVariant[APPROVAL_BADGE[approval].variant]}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {APPROVAL_BADGE[approval].label}
        </span>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// PlatformTile — colored brand square at the top-left of every card.
// ----------------------------------------------------------------------------
// Picks a brand SVG via PLATFORM_BRAND_SLUGS when one exists for the slug
// (10 social platforms + 5 music platforms + Threads + Quora + Google Maps +
// Website per platform-icon.tsx); otherwise falls back to a single capital
// letter on the brand-coloured tile. The letter fallback covers review
// sites (G2, BBB, Yelp, Trustpilot, Tripadvisor, Capterra, Sitejabber,
// Glassdoor, Facebook Reviews, Google Business) where a 20 px brand glyph
// would either be muddy (multi-letter wordmarks) or unrecognisable.
//
// Size scales mobile-first: 40 px (mobile) → 44 px (sm+). The shrink from
// the original 48/56 px shipped in Entry #20 gives the title + tier row
// more horizontal room to stay on one line.
function PlatformTile({ slug, color, name, tier }: { slug: string; color: string; name: string; tier: TaskTier }) {
  // Tier-tinted ring around the tile so workers can spot Premium / Medium /
  // Small cards at a glance while scrolling. Purely decorative — doesn't
  // affect the tile's footprint thanks to ring-offset-1. The brand-glyph /
  // letter logic itself lives in the shared <PlatformTile> so it can't drift.
  const tierRing =
    tier === "Premium" ? "ring-success/40"
    : tier === "Medium" ? "ring-primary/35"
    : "ring-warning/35";
  return (
    <SharedPlatformTile
      slug={slug}
      name={name}
      color={color}
      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl shadow-sm ring-2 ring-offset-1 ring-offset-card ${tierRing}`}
      iconClassName="w-5 h-5"
      letterClassName="text-base"
    />
  );
}
