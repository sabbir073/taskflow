"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Textarea, Btn, Badge } from "@/components/ui";
import { CheckCircle, XCircle, Clock, ExternalLink, Image as ImageIcon, Loader2, Link2, Bell, Sparkles, Copy, Play, Trophy, Lock, ListChecks, Users, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  useAcceptTask,
  useSubmitItemProof,
  useReviewItemSubmission,
  useMyAssignmentWithItems,
  useTaskRecentSubmitters,
} from "@/hooks/use-tasks";
import { useNotifyAssignmentToSubmit } from "@/hooks/use-groups";
import { formatDate, formatRelativeTime, getInitials } from "@/lib/utils";
import { PLATFORM_CONFIG, MUSIC_STREAM_SLUGS, MUSIC_PLATFORM_SLUGS, REVERSAL_VOCAB } from "@/lib/constants/platforms";
import { PlatformTile } from "@/components/shared/platform-icon";
import { UserProfileModal } from "./user-profile-modal";
import { RichTextContent } from "./rich-text-content";
import { YoutubeWatchModal } from "./youtube-watch-modal";
import { MusicPlayLockModal } from "./music-play-lock-modal";
import { ImageUploadField } from "./image-upload-field";

interface Props {
  data: { task: Record<string, unknown>; assignments: Record<string, unknown>[] };
  currentUserId: string;
  isAdmin: boolean;
}

type BundleItem = Record<string, unknown> & {
  id: number;
  task_type_id: number;
  sort_order: number;
  points: number;
  proof_type: string;
  item_data: Record<string, string>;
  watch_duration_sec: number | null;
  task_types?: { name: string; slug: string; required_fields?: TaskField[]; proof_type?: string } | null;
};

type ItemSubmission = Record<string, unknown> & {
  id: number;
  assignment_id: number;
  bundle_item_id: number;
  status: string;
  proof_urls: string[];
  proof_screenshots: string[];
  proof_notes: string | null;
  points_awarded: number | null;
  rejection_reason: string | null;
  task_bundle_items?: BundleItem;
};

type TaskField = { name: string; label: string; type: string };

// Sort comparator used by every bundle-item list (worker view + admin view).
// Bundle items carry sort_order assigned by the admin at creation time; the
// gate logic in BundleProofSection depends on this exact order, so every UI
// surface uses the same comparator to stay consistent.
function byBundleSortOrder(
  a: { task_bundle_items?: { sort_order?: number } | undefined } | undefined,
  b: { task_bundle_items?: { sort_order?: number } | undefined } | undefined,
): number {
  const ao = Number(a?.task_bundle_items?.sort_order ?? 0);
  const bo = Number(b?.task_bundle_items?.sort_order ?? 0);
  return ao - bo;
}

// Walks the standard URL-ish keys that task_types use for "the target the
// worker should act on" and returns the first non-empty string. Used by
// TaskHowToCard's per-step one-liner and by the admin Submissions overhaul
// (left "Target" panel) so both surfaces show the same authoritative link.
const TARGET_URL_KEYS = [
  "post_url", "video_url", "track_url", "profile_url", "business_url",
  "listing_url", "page_url", "review_url", "story_url", "playlist_url",
  "link", "url",
] as const;
function pickTargetUrl(itemData: Record<string, string | string[]> | undefined): string {
  if (!itemData) return "";
  for (const key of TARGET_URL_KEYS) {
    const v = itemData[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

// Plain-English instruction for a bundle step. Uses the task_type slug to
// guess what the worker actually has to do, falling back to the type name.
// Read by TaskHowToCard. Keep the matches narrow — generic copy is fine when
// a slug doesn't match, because the right-sidebar Task Data card still shows
// the raw fields.
function buildStepOneLiner({
  slug, taskTypeName, targetUrl, watchSec, itemData,
}: {
  slug: string;
  taskTypeName: string;
  targetUrl: string;
  watchSec: number | null;
  itemData: Record<string, string | string[]>;
}): string {
  if (slug === "watch-video") {
    return watchSec
      ? `Open the video and watch for at least ${watchSec} seconds without switching tabs.`
      : "Open the video and watch through to the end.";
  }
  if (MUSIC_STREAM_SLUGS.has(slug)) {
    return watchSec
      ? `Open the track in our locked player and let it stream for at least ${watchSec} seconds.`
      : "Open the track in our locked player and stream it through.";
  }
  if (slug.startsWith("comment-") || slug === "leave-comment" || slug === "leave-public-comment") {
    const commentText = typeof itemData?.comment_text === "string" ? itemData.comment_text : "";
    if (commentText) return `Open the target${targetUrl ? " link" : ""} and post this comment: "${commentText.slice(0, 120)}${commentText.length > 120 ? "…" : ""}".`;
    return "Open the target link and post a relevant comment.";
  }
  if (slug.startsWith("like-") || slug.startsWith("react-")) return "Open the target link and like / react to it.";
  if (slug.startsWith("save-") || slug.startsWith("bookmark-") || slug.startsWith("add-to-")) return "Open the target link and save / bookmark it.";
  if (slug.startsWith("share-") || slug === "retweet" || slug.startsWith("repost-")) return "Open the target link and share it.";
  if (slug.startsWith("follow-") || slug === "subscribe" || slug.startsWith("subscribe-")) return "Open the profile and follow / subscribe.";
  if (slug.startsWith("write-review") || slug.startsWith("rate-")) return "Open the listing and submit your review / rating.";
  if (slug.startsWith("create-") || slug.startsWith("post-")) return "Create the requested content on the platform and submit the resulting link.";
  return taskTypeName ? `Complete the ${taskTypeName.toLowerCase()} step on the platform.` : "Complete this step on the platform.";
}

// Centralised status pill so every surface (worker proof row, admin review
// row, sidebar) shows the same vocabulary + colour for a given item status.
function statusBadgeFor(status: string) {
  if (status === "approved") return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
  if (status === "submitted") return <Badge variant="accent"><Clock className="w-3 h-3 mr-1" />Pending review</Badge>;
  if (status === "rejected") return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  if (status === "cancelled") return <Badge variant="default">Cancelled</Badge>;
  return <Badge variant="default">In progress</Badge>;
}

export function TaskDetail({ data, currentUserId, isAdmin }: Props) {
  const { task, assignments } = data;
  const platform = task.platforms as Record<string, unknown> | undefined;
  const platformSlug = String(platform?.slug || "");
  const platformConfig = PLATFORM_CONFIG[platformSlug as keyof typeof PLATFORM_CONFIG];
  const isTaskOwner = String(task.created_by || "") === String(currentUserId);
  const canViewSubmissions = isAdmin || isTaskOwner;
  // Group leader of the task's target group can see submission STATUS only
  // (no approve/reject), and can nudge non-submitters.
  const targetGroup = task.groups as Record<string, unknown> | undefined;
  const isGroupLeaderOfTargetGroup =
    !canViewSubmissions &&
    String(task.target_type || "") === "group" &&
    !!targetGroup?.leader_id &&
    String(targetGroup.leader_id) === String(currentUserId);

  // Admin can click member names to open a profile modal
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Bundle items are joined into `task.task_bundle_items` by getTaskById.
  // Always sorted by `sort_order` so the UI mirrors creator intent.
  const bundleItems: BundleItem[] = useMemo(() => {
    const raw = (task.task_bundle_items as BundleItem[] | undefined) || [];
    return [...raw].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [task]);

  const completionBonus = Number(task.completion_bonus || 0);

  // Fetch the current viewer's assignment + per-item submissions for this
  // task. Cached + auto-invalidated by useSubmitItemProof / useReviewItemSubmission.
  const taskId = task.id as number;
  const myAssignmentQuery = useMyAssignmentWithItems(taskId);
  const myAssignment = myAssignmentQuery.data?.assignment ?? null;
  const myItemSubmissions: ItemSubmission[] = (myAssignmentQuery.data?.items as ItemSubmission[] | undefined) || [];
  const assignmentLoading = myAssignmentQuery.isLoading;

  const platformName = String(platform?.name || "Platform");
  const isWorkerView = !canViewSubmissions;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <PlatformTile slug={platformSlug} name={String(platform?.name || "")} color={platformConfig?.color} className="w-12 h-12 rounded-xl" iconClassName="w-6 h-6" letterClassName="text-lg" />
              <div>
                <p className="font-semibold">{String(platform?.name || "")}</p>
                <p className="text-sm text-muted-foreground">
                  {bundleItems.length > 0
                    ? `Bundle · ${bundleItems.length} ${bundleItems.length === 1 ? "action" : "actions"}`
                    : String((task.task_types as Record<string, unknown> | undefined)?.name || "")}
                </p>
              </div>
            </div>

            {!!task.description && (
              <div className="text-sm text-muted-foreground">
                <RichTextContent html={String(task.description)} />
              </div>
            )}

            {/* AI Prompt — shown when the task creator provided one */}
            {!!task.ai_prompt && (
              <AiPromptBlock prompt={String(task.ai_prompt)} />
            )}

            {(() => {
              const images = (task.images as string[]) || [];
              const urls = (task.urls as string[]) || [];
              if (images.length === 0 && urls.length === 0) return null;
              return (
                <div className="space-y-3 pt-3 border-t border-border/50">
                  {images.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attachments</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {images.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative group rounded-xl overflow-hidden border border-border block">
                            <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-24 object-cover group-hover:opacity-90 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {urls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference URLs</p>
                      <div className="space-y-1.5">
                        {urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/60 rounded-lg text-sm text-primary transition-colors">
                            <Link2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">{url}</span>
                            <ExternalLink className="w-3.5 h-3.5 ml-auto shrink-0 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* DESKTOP stats — original 4-up muted tiles */}
            <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Points/Task</p><p className="font-bold text-primary">{Number(task.points_per_completion || task.points || 0).toFixed(2)}</p></div>
              <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Priority</p><p className="font-semibold capitalize">{String(task.priority)}</p></div>
              <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Deadline</p><p className="font-medium">{task.deadline ? formatDate(String(task.deadline)) : "None"}</p></div>
              <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Budget</p><p className="font-bold text-warning">{Number(task.point_budget || 0).toFixed(2)} pts</p></div>
            </div>

            {/* MOBILE stats — 2x2 app-style cards with brand accents */}
            <div className="sm:hidden grid grid-cols-2 gap-2 pt-4 border-t border-border/50">
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Points/Task</p>
                <p className="mt-1 text-base font-bold text-foreground">{Number(task.points_per_completion || task.points || 0).toFixed(2)}<span className="text-xs font-normal text-muted-foreground"> pts</span></p>
              </div>
              <div className="rounded-xl bg-warning/5 border border-warning/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-warning">Budget</p>
                <p className="mt-1 text-base font-bold text-foreground">{Number(task.point_budget || 0).toFixed(2)}<span className="text-xs font-normal text-muted-foreground"> pts</span></p>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</p>
                <p className="mt-1 text-sm font-semibold capitalize text-foreground">{String(task.priority)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deadline</p>
                <p className="mt-1 text-sm font-medium text-foreground">{task.deadline ? formatDate(String(task.deadline)) : "None"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* "How to complete this task" callout — numbered step list with
            concrete one-line instructions and clickable target URLs pulled
            from each bundle item's item_data. Renders once the assignment is
            loaded so the ordering matches the sequential gate below. */}
        {!assignmentLoading && myAssignment && myItemSubmissions.length > 0 && (
          <TaskHowToCard items={myItemSubmissions} />
        )}

        {/* AI-check warning banner — worker-facing only. Lists the
            platform-specific reverse actions (unlike, unfollow, delete-
            comment, delete-share) that the AI re-check detects and warns
            that any reversal triggers an automatic account + IP + device
            ban. Admins / task owners don't see this — it's aimed at the
            person doing the work. */}
        {isWorkerView && (
          <AiCheckWarningCard platformSlug={platformSlug} platformName={platformName} />
        )}

        {/* Social-proof "Recent activity" card — hides itself when zero
            completions exist, so a brand-new task doesn't render an empty
            shell. See lib/actions/tasks.ts getTaskRecentSubmitters. */}
        <TaskRecentActivity taskId={Number(task.id || 0)} />

        {/* Worker's per-item proof section */}
        {assignmentLoading ? (
          <Card><CardContent className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
        ) : myAssignment ? (
          <BundleProofSection
            assignment={myAssignment}
            items={myItemSubmissions}
            completionBonus={completionBonus}
            platformSlug={platformSlug}
          />
        ) : null}

      </div>

      {/* Admin profile modal */}
      {isAdmin && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      {/* Right column: per-item Task Data + Bundle Rewards. Both are
          renovated to use the same numbered-step vocabulary as the left
          column so workers can switch eyes between sides without
          re-orienting. */}
      <div className="space-y-4">
        <TaskDataCard
          bundleItems={bundleItems}
          myItemSubmissions={myItemSubmissions}
          canViewSubmissions={canViewSubmissions}
        />
        <BundleRewardsCard
          bundleItems={bundleItems}
          completionBonus={completionBonus}
        />
      </div>
      </div>

      {/* Submissions — full-width below the two-column grid so it appears
          at the very bottom on every breakpoint. Admins / task owners see
          the per-worker review rows with side-by-side Target / Proof
          panels (see ItemReviewBlock). Group leaders of the target group
          see a read-only status list with Remind buttons. The #submissions
          id lets /inbox deep-links scroll-target this card. */}
      {canViewSubmissions && (
        <Card id="submissions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Submissions ({assignments.length})
            </CardTitle>
            <CardDescription>
              Verify each worker&apos;s proof against the task target before approving. Approved items credit the worker immediately; rejections require a reason.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <AssignmentReviewRow
                    key={a.id as number}
                    assignment={a as Record<string, unknown>}
                    bundleItems={bundleItems}
                    isAdmin={isAdmin}
                    completionBonus={completionBonus}
                    onViewProfile={isAdmin ? setProfileUserId : undefined}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isGroupLeaderOfTargetGroup && (
        <Card>
          <CardHeader>
            <CardTitle>Submission Status ({assignments.length})</CardTitle>
            <CardDescription>
              As the group leader you can see who has submitted and send a reminder to those who haven&apos;t. Only admins can approve or reject proofs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No members assigned yet</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <GroupLeaderStatusRow key={a.id as number} assignment={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Bundle proof section (worker view)
// ============================================================================
function BundleProofSection({
  assignment,
  items,
  completionBonus,
  platformSlug,
}: {
  assignment: Record<string, unknown>;
  items: ItemSubmission[];
  completionBonus: number;
  platformSlug: string;
}) {
  const status = String(assignment.status);
  const acceptTask = useAcceptTask();

  if (status === "approved") {
    const total = Number(assignment.points_awarded || items.reduce((s, it) => s + Number(it.points_awarded || 0), 0));
    return (
      <Card className="border-success/30 bg-success/[0.03]">
        <CardContent className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-success/10"><CheckCircle className="w-6 h-6 text-success" /></div>
          <div>
            <p className="font-semibold text-success">Bundle complete!</p>
            <p className="text-sm text-muted-foreground">You earned {total.toFixed(2)} points{completionBonus > 0 ? ` (incl. ${completionBonus.toFixed(2)} bonus)` : ""}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "pending") {
    return (
      <Card><CardContent className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-4">Accept this bundle to get started</p>
        <Btn onClick={() => acceptTask.mutate(assignment.id as number)} isLoading={acceptTask.isPending}>Accept Task</Btn>
      </CardContent></Card>
    );
  }

  if (status === "cancelled") {
    return (
      <Card className="border-muted">
        <CardContent className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted"><XCircle className="w-6 h-6 text-muted-foreground" /></div>
          <div>
            <p className="font-semibold">No longer available</p>
            <p className="text-sm text-muted-foreground">This task has reached its submission limit.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // status is in_progress, submitted, or rejected — render the per-item grid.
  // Sequential gate: sort items by `task_bundle_items.sort_order`, then
  // compute the first non-(submitted|approved) index. Everything after that
  // index is locked until the worker finishes the current step. Music
  // streams auto-approve so a music item satisfies the gate the moment its
  // countdown ends; non-music items satisfy it the moment they're submitted.
  const sortedItems = [...items].sort((a, b) => {
    const ao = Number((a.task_bundle_items as { sort_order?: number } | undefined)?.sort_order ?? 0);
    const bo = Number((b.task_bundle_items as { sort_order?: number } | undefined)?.sort_order ?? 0);
    return ao - bo;
  });
  const firstBlockingIdx = sortedItems.findIndex(
    (i) => i.status !== "submitted" && i.status !== "approved"
  );
  const isLockedAt = (idx: number) => firstBlockingIdx !== -1 && idx > firstBlockingIdx;
  const blockingName = firstBlockingIdx !== -1
    ? String((sortedItems[firstBlockingIdx].task_bundle_items as { task_types?: { name?: string } } | undefined)?.task_types?.name || "previous step")
    : "";

  const approvedCount = sortedItems.filter((i) => i.status === "approved").length;
  const totalCount = sortedItems.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" /> Complete each step
          </CardTitle>
          <Badge variant={approvedCount === totalCount ? "success" : "primary"} className="shrink-0">
            {firstBlockingIdx !== -1
              ? `Step ${firstBlockingIdx + 1} of ${totalCount}`
              : `${approvedCount} of ${totalCount} approved`}
          </Badge>
        </div>
        <CardDescription>
          {approvedCount} of {totalCount} approved
          {completionBonus > 0 && (
            <> · <strong className="text-foreground">+{completionBonus.toFixed(2)} pt bonus</strong> when every step is approved</>
          )}
        </CardDescription>
        {/* Progress bar — mirrors the badge so the worker can see how far
            they are at a glance without reading the description. */}
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No bundle items configured</p>
        ) : (
          sortedItems.map((it, idx) => (
            <BundleItemRow
              key={it.id}
              itemSubmission={it}
              itemIndex={idx + 1}
              totalItems={totalCount}
              platformSlug={platformSlug}
              isLocked={isLockedAt(idx)}
              previousItemName={isLockedAt(idx) ? blockingName : undefined}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// One bundle item row in the worker's proof section
// ============================================================================
function BundleItemRow({
  itemSubmission,
  itemIndex,
  totalItems,
  platformSlug,
  isLocked = false,
  previousItemName,
}: {
  itemSubmission: ItemSubmission;
  itemIndex: number;
  totalItems: number;
  platformSlug: string;
  isLocked?: boolean;
  previousItemName?: string;
}) {
  const item = itemSubmission.task_bundle_items as BundleItem | undefined;
  const status = String(itemSubmission.status);
  const taskType = item?.task_types;
  const typeName = String(taskType?.name || "Item");
  const slug = String(taskType?.slug || "");
  const proofType = String(item?.proof_type || "screenshot");
  const itemPoints = Number(item?.points || 0);
  const videoUrl = item?.item_data?.video_url || "";
  const watchSec = item?.watch_duration_sec ?? null;
  const isWatchVideo = slug === "watch-video";
  const isMusicStream = MUSIC_STREAM_SLUGS.has(slug);
  // For music tasks we use the track_url field; YouTube uses video_url.
  const itemDataMixed = (item?.item_data as Record<string, string | string[]>) || {};
  const trackUrl = String((itemDataMixed.track_url as string) || "");
  // Per-item content the admin configured (URL to like, comment text, etc).
  // Renders inline above the proof form so the worker sees the "what to do"
  // data + "how to submit" form in one place — important on mobile where
  // the right-column sidebar appears far below.
  const itemData: Record<string, string | string[]> = itemDataMixed;
  const fieldDefs = (taskType?.required_fields as Array<{ name: string; label: string; type: string }> | undefined) || [];
  // Hide the YouTube/music URL — the player button is the only sanctioned
  // way for the worker to open it.
  const inlineHideKeys = isWatchVideo ? ["video_url"] : isMusicStream ? ["track_url"] : [];
  const hasItemData = Object.keys(itemData).some((k) => {
    if (inlineHideKeys.includes(k)) return false;
    const v = itemData[k];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";
  });

  const submitItemProof = useSubmitItemProof();
  const [showVideo, setShowVideo] = useState(false);
  const [showMusicLock, setShowMusicLock] = useState(false);
  const [proofUrls, setProofUrls] = useState<string[]>(itemSubmission.proof_urls || []);
  const [proofScreenshots, setProofScreenshots] = useState<string[]>(itemSubmission.proof_screenshots || []);
  const [proofNotes, setProofNotes] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const statusPill = (() => {
    if (status === "approved") return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === "submitted") return <Badge variant="accent"><Clock className="w-3 h-3 mr-1" />Awaiting review</Badge>;
    if (status === "rejected") return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    if (status === "cancelled") return <Badge variant="default">Cancelled</Badge>;
    return <Badge variant="default">In progress</Badge>;
  })();

  return (
    <div className={`rounded-xl border overflow-hidden ${
      status === "approved" ? "border-success/30" :
      status === "rejected" ? "border-error/30" :
      isLocked ? "border-border/40 opacity-75" :
      "border-border/50"
    }`}>
      {/* Header row — large numbered pill so workers see the step number at
          a glance; the same visual vocabulary as TaskHowToCard so the two
          surfaces feel like one. */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          status === "approved" ? "bg-success text-white" :
          status === "submitted" ? "bg-accent text-white" :
          isLocked ? "bg-muted text-muted-foreground" :
          "bg-primary text-primary-foreground"
        }`}>
          {status === "approved" ? <CheckCircle className="w-4 h-4" /> : itemIndex}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{typeName}</p>
          <p className="text-[10px] text-muted-foreground">Step {itemIndex} of {totalItems}</p>
        </div>
        <span className="text-xs font-mono text-primary shrink-0">+{itemPoints.toFixed(2)} pts</span>
        <div className="shrink-0 hidden sm:block">{statusPill}</div>
      </div>

      {/* Item content the admin configured — what the worker actually has
          to do for THIS item. Visible while there's something to do; we
          hide it on approved / cancelled / locked rows since the work is
          either done, irrelevant, or unreachable. */}
      {hasItemData && status !== "approved" && status !== "cancelled" && !isLocked && (
        <div className="px-4 pt-3 pb-1 bg-muted/10 border-b border-border/30">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
            Action details
          </p>
          <TaskDataFields
            taskData={itemData}
            fieldDefs={fieldDefs}
            hideKeys={inlineHideKeys}
          />
        </div>
      )}

      {/* Body switches on status. Locked rows collapse to a single-line
          pill so workers can scroll past them quickly on mobile. */}
      <div className={`px-4 ${isLocked ? "py-2" : "py-3"} space-y-3`}>
        {status === "approved" && (
          <p className="text-xs text-success">
            <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
            +{Number(itemSubmission.points_awarded || itemPoints).toFixed(2)} pts earned
          </p>
        )}

        {status === "submitted" && (
          <p className="text-xs text-muted-foreground">Submitted — awaiting admin review.</p>
        )}

        {status === "cancelled" && (
          <p className="text-xs text-muted-foreground">This item was cancelled.</p>
        )}

        {status === "rejected" && !isLocked && (
          <div className="rounded-lg bg-error/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-error">Rejection reason</p>
            <p className="text-xs text-error mt-0.5">{itemSubmission.rejection_reason || "No reason"}</p>
            <p className="text-[11px] text-muted-foreground mt-2">You can resubmit this item below.</p>
          </div>
        )}

        {(status === "in_progress" || status === "rejected") && isLocked && (
          // Sequential bundle gate: this item is unreachable until the
          // earlier step is at least submitted. Music auto-approves, so
          // a music step satisfies the gate the moment its countdown ends.
          // Compact single-line pill so the row reads as collapsed.
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Locked — finish <strong className="text-foreground">{previousItemName || "the previous step"}</strong> first.
            </span>
          </div>
        )}

        {(status === "in_progress" || status === "rejected") && !isLocked && (
          isWatchVideo ? (
            // Watch-video items: open the in-app player. The modal auto-
            // submits when the worker reaches watch_duration_sec (or watches
            // to the end if duration isn't set).
            <>
              <Btn
                className="w-full"
                onClick={() => setShowVideo(true)}
                isLoading={submitItemProof.isPending}
                disabled={!videoUrl}
              >
                <Play className="w-4 h-4 mr-2" />
                {watchSec ? `Watch ≥${watchSec}s to complete` : "View video"}
              </Btn>
              {!videoUrl && (
                <p className="text-[11px] text-error">No video URL configured for this item.</p>
              )}
              {showVideo && videoUrl && (
                <YoutubeWatchModal
                  videoUrl={videoUrl}
                  watchDurationSec={watchSec}
                  onClose={() => setShowVideo(false)}
                  onCompleted={() => {
                    setShowVideo(false);
                    submitItemProof.mutate({
                      itemSubmissionId: itemSubmission.id,
                      data: {
                        proof_urls: [],
                        proof_screenshots: [],
                        proof_notes: watchSec
                          ? `Auto-submitted: watched ${watchSec}s of video`
                          : "Auto-submitted: video watched to completion",
                      },
                    });
                  }}
                />
              )}
            </>
          ) : isMusicStream && MUSIC_PLATFORM_SLUGS.has(platformSlug) ? (
            // Music streaming: fullscreen lock player + countdown + tab-focus
            // reset + auto-screenshot via html2canvas. Submission is fully
            // automatic once the worker holds focus for watch_duration_sec.
            <>
              <Btn
                className="w-full"
                onClick={() => setShowMusicLock(true)}
                isLoading={submitItemProof.isPending}
                disabled={!trackUrl}
              >
                <Play className="w-4 h-4 mr-2" />
                {watchSec ? `Listen ≥${watchSec}s to complete` : "Open player"}
              </Btn>
              {!trackUrl && (
                <p className="text-[11px] text-error">No track URL configured for this item.</p>
              )}
              {showMusicLock && trackUrl && (
                <MusicPlayLockModal
                  trackUrl={trackUrl}
                  platformSlug={platformSlug as "spotify" | "tidal" | "deezer" | "soundcloud" | "bandcamp"}
                  watchDurationSec={watchSec || 30}
                  onClose={() => setShowMusicLock(false)}
                  onCompleted={(screenshotUrl) => {
                    setShowMusicLock(false);
                    submitItemProof.mutate({
                      itemSubmissionId: itemSubmission.id,
                      data: {
                        proof_urls: [],
                        proof_screenshots: screenshotUrl ? [screenshotUrl] : [],
                        proof_notes: `Auto-submitted: streamed ${watchSec || 30}s on ${platformSlug}`,
                      },
                    });
                  }}
                />
              )}
            </>
          ) : (
            // Standard proof form per item type.
            <>
              {(proofType === "url" || proofType === "both") && (
                <div className="space-y-2">
                  <Label className="text-xs">Proof URLs</Label>
                  {proofUrls.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={url} onChange={(e) => { const copy = [...proofUrls]; copy[i] = e.target.value; setProofUrls(copy); }} placeholder="https://..." />
                      <Btn variant="ghost" size="sm" onClick={() => setProofUrls(proofUrls.filter((_, j) => j !== i))}>x</Btn>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Add URL..." type="url" />
                    <Btn variant="outline" size="sm" onClick={() => { if (newUrl) { setProofUrls([...proofUrls, newUrl]); setNewUrl(""); } }}>Add</Btn>
                  </div>
                </div>
              )}
              {(proofType === "screenshot" || proofType === "both") && (
                <ImageUploadField
                  label="Screenshots"
                  value={proofScreenshots}
                  onChange={setProofScreenshots}
                  multiple
                  maxImages={5}
                />
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea value={proofNotes} onChange={(e) => setProofNotes(e.target.value)} placeholder="Any additional context..." />
              </div>
              <Btn className="w-full" isLoading={submitItemProof.isPending} onClick={() => submitItemProof.mutate({
                itemSubmissionId: itemSubmission.id,
                data: { proof_urls: proofUrls, proof_screenshots: proofScreenshots, proof_notes: proofNotes || undefined },
              })}>
                Submit Item
              </Btn>
            </>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Per-item card rendered in the right sidebar Task Data widget
// ============================================================================
function BundleItemSidebarCard({
  item,
  itemSubmission,
  itemIndex,
  totalItems,
  canViewSubmissions,
}: {
  item: BundleItem;
  itemSubmission: ItemSubmission | null;
  itemIndex: number;
  totalItems: number;
  canViewSubmissions: boolean;
}) {
  const taskType = item.task_types;
  const slug = String(taskType?.slug || "");
  const typeName = String(taskType?.name || "");
  const isWatchVideo = slug === "watch-video";
  const isMusicStream = MUSIC_STREAM_SLUGS.has(slug);
  const fieldDefs: TaskField[] = (taskType?.required_fields as TaskField[] | undefined) || [];
  // Hide the raw YouTube / music URL from workers — the player buttons in
  // BundleProofSection are the only sanctioned way to open the target.
  const hideKeys: string[] = [];
  if (!canViewSubmissions) {
    if (isWatchVideo) hideKeys.push("video_url");
    if (isMusicStream) hideKeys.push("track_url");
  }

  const status = itemSubmission ? String(itemSubmission.status) : "";
  // Status-aware tint so the sidebar visually mirrors the worker's progress
  // in BundleProofSection / TaskHowToCard — green for approved, red for
  // rejected, accent for submitted (awaiting review). Locked / not-yet
  // started rows stay neutral.
  const tint =
    status === "approved" ? "border-success/30 bg-success/5"
    : status === "rejected" ? "border-error/30 bg-error/5"
    : status === "submitted" ? "border-accent/30 bg-accent/5"
    : "border-border/40";

  return (
    <div className={`rounded-xl border p-3 ${tint}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
            {itemIndex}
          </span>
          <p className="text-xs font-semibold truncate">{typeName || `Item #${itemIndex}`}</p>
        </div>
        <span className="text-[11px] font-mono text-primary shrink-0">+{Number(item.points || 0).toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground flex-wrap">
        <Badge variant="primary" className="capitalize text-[9px] px-1.5 py-0">
          {item.proof_type === "none" ? "Auto-submit" : String(item.proof_type)}
        </Badge>
        {item.watch_duration_sec ? (
          <span>≥{item.watch_duration_sec}s</span>
        ) : null}
        <span className="ml-auto capitalize">{status ? status.replace("_", " ") : `Step ${itemIndex} of ${totalItems}`}</span>
      </div>
      <TaskDataFields
        taskData={(item.item_data as Record<string, string>) || {}}
        fieldDefs={fieldDefs}
        hideKeys={hideKeys}
      />
    </div>
  );
}

// ============================================================================
// TaskDataCard — right-sidebar wrapper that lists every bundle item in
// admin sort order, each with its own targets/data and a status tint that
// matches the worker's progress in BundleProofSection.
// ============================================================================
function TaskDataCard({
  bundleItems,
  myItemSubmissions,
  canViewSubmissions,
}: {
  bundleItems: BundleItem[];
  myItemSubmissions: ItemSubmission[];
  canViewSubmissions: boolean;
}) {
  if (bundleItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No bundle items configured</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" /> Task data
        </CardTitle>
        <CardDescription className="text-xs">
          Per-step targets and reference content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bundleItems.map((item, idx) => {
          const itemSubmission = myItemSubmissions.find((s) => s.bundle_item_id === item.id) || null;
          return (
            <BundleItemSidebarCard
              key={item.id}
              item={item}
              itemSubmission={itemSubmission}
              itemIndex={idx + 1}
              totalItems={bundleItems.length}
              canViewSubmissions={canViewSubmissions}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// BundleRewardsCard — itemised reward breakdown.
// ============================================================================
// Replaces the previous one-line "Earn each item's points" text with an
// actual table: per-item points + optional completion bonus + grand total.
// Lets the worker / task owner see exactly what's at stake before starting.
function BundleRewardsCard({
  bundleItems,
  completionBonus,
}: {
  bundleItems: BundleItem[];
  completionBonus: number;
}) {
  const itemsTotal = bundleItems.reduce((s, b) => s + Number(b.points || 0), 0);
  const total = itemsTotal + completionBonus;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" /> Bundle rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {bundleItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No items configured.</p>
        ) : (
          <ul className="space-y-1">
            {bundleItems.map((it, idx) => (
              <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground truncate min-w-0">
                  <span className="font-mono mr-1.5 text-foreground">{idx + 1}.</span>
                  {String(it.task_types?.name || "Item")}
                </span>
                <span className="font-mono text-primary shrink-0">+{Number(it.points || 0).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
        {completionBonus > 0 && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" /> Completion bonus
            </span>
            <span className="font-mono text-accent shrink-0">+{completionBonus.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border text-sm">
          <span className="font-semibold">Total possible</span>
          <span className="font-mono font-bold text-success shrink-0">+{total.toFixed(2)} pts</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Renders item_data entries using task_type field definitions for proper labels
// and types. Image fields render as a thumbnail gallery with Download buttons;
// URL fields render as clickable links; everything else as text.
function TaskDataFields({
  taskData,
  fieldDefs,
  hideKeys = [],
}: {
  // String for url/text/textarea; string[] for image fields (multi-image).
  taskData: Record<string, string | string[]>;
  fieldDefs: Array<{ name: string; label: string; type: string }>;
  hideKeys?: string[];
}) {
  const defMap = new Map(fieldDefs.map((f) => [f.name, f]));
  const hidden = new Set(hideKeys);
  const hasValue = (v: unknown): boolean => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== "";
  };
  const orderedKeys: string[] = [
    ...fieldDefs.map((f) => f.name).filter((n) => !hidden.has(n) && hasValue(taskData[n])),
    ...Object.keys(taskData).filter((k) => !hidden.has(k) && !defMap.has(k) && hasValue(taskData[k])),
  ];

  if (orderedKeys.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No additional data</p>;
  }

  async function download(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-1.5">
      {orderedKeys.map((key) => {
        const value = taskData[key];
        const def = defMap.get(key);
        const label = def?.label || key.replace(/_/g, " ");

        // Image fields: gallery + Download buttons. Tolerates legacy
        // single-string storage by coercing to a one-element array.
        if (def?.type === "image") {
          const urls = Array.isArray(value) ? value : [value as string];
          return (
            <div key={key} className="py-1.5 border-b border-border/30 last:border-0">
              <p className="text-[10px] text-muted-foreground capitalize mb-1.5">{label}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {urls.map((u, i) => (
                  <div key={`${u}-${i}`} className="relative group rounded-lg overflow-hidden border border-border/40 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="w-full h-20 object-cover" />
                    <button
                      type="button"
                      onClick={() => download(u, `${key}-${i + 1}.jpg`)}
                      className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/65 text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        const strVal = typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : String(value);
        const isUrl = def?.type === "url" || (typeof strVal === "string" && /^https?:\/\//i.test(strVal));
        return (
          <div key={key} className="py-1.5 border-b border-border/30 last:border-0">
            <p className="text-[10px] text-muted-foreground capitalize">{label}</p>
            {isUrl ? (
              <a
                href={strVal}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline break-all inline-flex items-start gap-1"
              >
                <span className="break-all">{strVal}</span>
                <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
              </a>
            ) : (
              <p className="text-xs break-all">{strVal}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Group leader's read-only assignment view (unchanged from pre-bundle)
// ============================================================================
function GroupLeaderStatusRow({ assignment }: { assignment: Record<string, unknown> }) {
  const notifySubmit = useNotifyAssignmentToSubmit();
  const user = assignment.users as Record<string, unknown> | undefined;
  const name = String(user?.name || "Unknown");
  const email = String(user?.email || "");
  const status = String(assignment.status);
  const canNotify = ["pending", "in_progress", "rejected"].includes(status);
  const submittedAt = assignment.submitted_at as string | null;

  const statusBadge = (() => {
    if (status === "approved") return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
    if (status === "rejected") return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    if (status === "submitted") return <Badge variant="primary"><Clock className="w-3 h-3 mr-1" /> Submitted</Badge>;
    return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Not submitted</Badge>;
  })();

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {statusBadge}
        {submittedAt && (
          <span className="text-[11px] text-muted-foreground hidden sm:inline">{formatDate(submittedAt)}</span>
        )}
        {canNotify && (
          <Btn size="sm" variant="outline" isLoading={notifySubmit.isPending} onClick={() => notifySubmit.mutate(assignment.id as number)}>
            <Bell className="w-3.5 h-3.5 mr-1" /> Remind
          </Btn>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Admin/owner view of one worker's bundle submission. Lists every item
// with its own approve/reject affordances. Approve / reject buttons show
// only when the item is currently in `submitted` state.
// ============================================================================
function AssignmentReviewRow({
  assignment,
  bundleItems,
  isAdmin,
  completionBonus,
  onViewProfile,
}: {
  assignment: Record<string, unknown>;
  bundleItems: BundleItem[];
  isAdmin: boolean;
  completionBonus: number;
  onViewProfile?: (userId: string) => void;
}) {
  const notifySubmit = useNotifyAssignmentToSubmit();
  const user = assignment.users as Record<string, unknown> | undefined;
  const userId = String(user?.id || assignment.user_id || "");
  const status = String(assignment.status);
  const name = String(user?.name || "Unknown");
  const email = String(user?.email || "");
  const canNotify = ["pending", "in_progress", "rejected"].includes(status);
  const items = (assignment.assignment_item_submissions as ItemSubmission[] | undefined) || [];
  const itemsByBundleId = new Map(items.map((it) => [it.bundle_item_id, it]));
  const orderedItems: ItemSubmission[] = bundleItems
    .map((b) => itemsByBundleId.get(b.id))
    .filter((i): i is ItemSubmission => !!i);

  const nameEl = onViewProfile ? (
    <button type="button" onClick={() => onViewProfile(userId)} className="text-sm font-semibold text-left hover:text-primary transition-colors">
      {name}
    </button>
  ) : (
    <p className="text-sm font-semibold">{name}</p>
  );

  const totalPoints = orderedItems.reduce((s, it) => s + Number(it.points_awarded || 0), 0);
  const approvedCount = orderedItems.filter((i) => i.status === "approved").length;
  const totalCount = orderedItems.length || bundleItems.length;
  const statusVariant = status === "approved" ? "success" : status === "rejected" ? "error" : status === "submitted" ? "accent" : "default";

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      {/* Header: submitter + overall bundle status */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          {nameEl}
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
        <Badge variant={statusVariant} className="shrink-0 capitalize">{status.replace("_", " ")}</Badge>
        {canNotify && (
          <Btn
            variant="ghost"
            size="sm"
            title="Send reminder to submit"
            disabled={notifySubmit.isPending}
            onClick={() => notifySubmit.mutate(assignment.id as number)}
            className="shrink-0"
          >
            <Bell className="w-3.5 h-3.5" />
          </Btn>
        )}
      </div>

      {/* Summary line */}
      <div className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/10 border-b border-border/30">
        {approvedCount} of {totalCount} items approved · {totalPoints.toFixed(2)} pts credited so far
        {completionBonus > 0 && status !== "approved" && (
          <> · bonus {completionBonus.toFixed(2)} pts pending</>
        )}
      </div>

      {/* Items */}
      <div className="divide-y divide-border/30">
        {orderedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No item submissions yet</p>
        ) : (
          orderedItems.map((it) => (
            <ItemReviewBlock key={it.id} itemSubmission={it} isAdmin={isAdmin} />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// One item inside an AssignmentReviewRow — admin's approve/reject affordances
// ============================================================================
// Layout is split into three vertical bands so the admin can verify in one
// glance:
//   1. Header — action name + points + status badge.
//   2. Body — side-by-side Target / Proof panels (collapses to two stacked
//      rows on mobile / narrow breakpoints).
//   3. Footer — approve / reject buttons (only when admin + status=submitted)
//      OR rejection reason banner (when status=rejected).
function ItemReviewBlock({
  itemSubmission,
  isAdmin,
}: {
  itemSubmission: ItemSubmission;
  isAdmin: boolean;
}) {
  const review = useReviewItemSubmission();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const item = itemSubmission.task_bundle_items as BundleItem | undefined;
  const taskType = item?.task_types;
  const typeName = String(taskType?.name || "Item");
  const status = String(itemSubmission.status);
  const points = Number(item?.points || 0);

  const itemData = (item?.item_data as Record<string, string | string[]>) || {};
  const targetUrl = pickTargetUrl(itemData);
  const fieldDefs = (taskType?.required_fields as TaskField[] | undefined) || [];
  const watchSec = item?.watch_duration_sec ?? null;

  const proofUrls = itemSubmission.proof_urls || [];
  const proofShots = itemSubmission.proof_screenshots || [];
  const proofNotes = itemSubmission.proof_notes;
  const hasProof = proofUrls.length > 0 || proofShots.length > 0 || !!proofNotes;

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b border-border/40">
        <p className="text-sm font-semibold flex-1 truncate">{typeName}</p>
        <span className="text-xs font-mono text-primary shrink-0">+{points.toFixed(2)} pts</span>
        <div className="shrink-0">{statusBadgeFor(status)}</div>
      </div>

      {/* Side-by-side: Target (what the worker should do) | Proof (what they
          submitted). On mobile collapses to a vertical stack with a
          horizontal divider; on md+ becomes 2 columns with a vertical
          divider. */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30">
        {/* LEFT — Target */}
        <div className="p-4 space-y-2 bg-primary/[0.02]">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-primary flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Target — what they should do
          </p>
          {targetUrl ? (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{targetUrl}</span>
            </a>
          ) : null}
          {watchSec ? (
            <p className="text-xs text-muted-foreground">
              Watch / listen for at least <strong className="text-foreground">{watchSec}s</strong>.
            </p>
          ) : null}
          <TaskDataFields taskData={itemData} fieldDefs={fieldDefs} hideKeys={[]} />
        </div>

        {/* RIGHT — Proof */}
        <div className="p-4 space-y-2.5 bg-success/[0.02]">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-success flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" /> Proof — what they submitted
          </p>
          {!hasProof ? (
            <p className="text-xs text-muted-foreground italic">
              No proof attached (auto-submitted by the in-app player).
            </p>
          ) : (
            <>
              {proofUrls.length > 0 && (
                <ul className="space-y-1">
                  {proofUrls.map((url, i) => (
                    <li key={`u${i}`}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {proofShots.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {proofShots.map((url, i) => (
                    <a
                      key={`s${i}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative rounded-lg overflow-hidden border border-border/40 group block aspect-video bg-muted/30"
                      title={`Open screenshot ${i + 1} in a new tab`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Proof screenshot ${i + 1}`}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/65 text-white text-[9px] font-semibold flex items-center gap-0.5">
                        <ImageIcon className="w-2.5 h-2.5" />{i + 1}
                      </span>
                    </a>
                  ))}
                </div>
              )}
              {!!proofNotes && (
                <p className="text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg italic">
                  &ldquo;{String(proofNotes)}&rdquo;
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rejection reason banner — visible to both admin and the row owner
          so the admin remembers what they wrote, and the worker (who reads
          the same UI on their own task page) sees the same explanation. */}
      {status === "rejected" && !!itemSubmission.rejection_reason && (
        <div className="px-4 py-2.5 bg-error/5 border-t border-error/20 text-xs">
          <span className="font-semibold text-error">Rejected · </span>
          <span className="text-foreground">{itemSubmission.rejection_reason}</span>
        </div>
      )}

      {/* Approve / Reject footer — admin only, submitted state only. */}
      {isAdmin && status === "submitted" && (
        <div className="px-4 py-3 bg-muted/20 border-t border-border/40">
          {showReject ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why is this being rejected?"
                className="text-xs flex-1"
                autoFocus
              />
              <div className="flex gap-2">
                <Btn
                  variant="danger"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={!rejectReason.trim() || review.isPending}
                  onClick={() => {
                    review.mutate({ itemSubmissionId: itemSubmission.id, action: "reject", reason: rejectReason });
                    setShowReject(false);
                    setRejectReason("");
                  }}
                >
                  Confirm reject
                </Btn>
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowReject(false); setRejectReason(""); }}
                >
                  Cancel
                </Btn>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Btn
                size="sm"
                className="flex-1"
                onClick={() => review.mutate({ itemSubmissionId: itemSubmission.id, action: "approve" })}
                isLoading={review.isPending}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve · +{points.toFixed(0)} pts
              </Btn>
              <Btn
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowReject(true)}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AI Prompt block — unchanged
// ============================================================================
function AiPromptBlock({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.04] to-accent/[0.03] p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Prompt</p>
            <p className="text-[11px] text-muted-foreground">Copy this and paste into ChatGPT / Claude to generate the content</p>
          </div>
        </div>
        <button
          type="button"
          onClick={copy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
            copied
              ? "bg-success/15 text-success"
              : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
          }`}
        >
          {copied ? (
            <><CheckCircle className="w-3.5 h-3.5" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy prompt</>
          )}
        </button>
      </div>
      <div className="rounded-lg bg-card border border-border/40 px-3 py-2.5">
        <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{prompt}</p>
      </div>
    </div>
  );
}

// ============================================================================
// TaskHowToCard — "How to complete this task" overview above the proof section.
// ============================================================================
// Numbered preview of every bundle step in admin-defined `sort_order`. The
// detailed per-step admin content (caption text, AI prompts, image URLs)
// still lives inside each BundleItemRow below — this card just answers
// "where do I start, how many steps?" so the worker has a mental map before
// diving in.
function TaskHowToCard({ items }: { items: ItemSubmission[] }) {
  const sortedItems = useMemo(() => [...items].sort(byBundleSortOrder), [items]);
  if (sortedItems.length === 0) return null;

  // First unfinished step index — drives the "Start here" badge so it
  // attaches to whichever step the worker should currently be on, not
  // always to step #1.
  const startHereIdx = sortedItems.findIndex(
    (it) => it.status !== "submitted" && it.status !== "approved",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" /> How to complete this task
        </CardTitle>
        <CardDescription>
          {sortedItems.length} step{sortedItems.length === 1 ? "" : "s"} — finish in order. Each step unlocks the next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {sortedItems.map((it, idx) => {
            const bi = it.task_bundle_items;
            const taskType = bi?.task_types;
            const typeName = String(taskType?.name || `Step ${idx + 1}`);
            const slug = String(taskType?.slug || "");
            const points = Number(bi?.points || 0);
            const watchSec = bi?.watch_duration_sec ?? null;
            const itemData = (bi?.item_data as Record<string, string | string[]>) || {};
            const targetUrl = pickTargetUrl(itemData);
            const status = String(it.status);
            const isDone = status === "submitted" || status === "approved";
            const isApproved = status === "approved";
            const isStartHere = idx === startHereIdx;
            const oneLiner = buildStepOneLiner({
              slug, taskTypeName: typeName, targetUrl, watchSec, itemData,
            });
            return (
              <li
                key={it.id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  isApproved
                    ? "border-success/30 bg-success/5"
                    : isDone
                    ? "border-accent/30 bg-accent/5"
                    : isStartHere
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border/40 bg-muted/20"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isApproved
                      ? "bg-success text-white"
                      : isDone
                      ? "bg-accent text-white"
                      : "bg-primary text-primary-foreground"
                  }`}
                  aria-hidden
                >
                  {isApproved ? <CheckCircle className="w-4 h-4" /> : isDone ? <Clock className="w-3.5 h-3.5" /> : idx + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{typeName}</p>
                    <span className="text-[11px] font-mono text-primary">+{points.toFixed(0)} pts</span>
                    {isStartHere && !isDone && (
                      <Badge variant="primary" className="text-[9px] px-1.5 py-0">Start here</Badge>
                    )}
                    {watchSec && (
                      <span className="text-[11px] text-muted-foreground">· ≥{watchSec}s</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{oneLiner}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// AiCheckWarningCard — strict ban notice for workers.
// ============================================================================
// Mounted between TaskHowToCard and TaskRecentActivity on worker-facing
// task pages. Lists the platform-specific reversible actions (unlike,
// unfollow, delete-comment, delete-share) that the AI re-check detects and
// spells out the consequence: automatic account ban with IP + device on
// the block list. Copy comes from REVERSAL_VOCAB in lib/constants/platforms
// so per-platform phrasing reads naturally. Defaults to a generic list
// when the platform slug isn't in the map.
function AiCheckWarningCard({ platformSlug, platformName }: { platformSlug: string; platformName: string }) {
  const reversal = REVERSAL_VOCAB[platformSlug] ?? REVERSAL_VOCAB.default;
  // English-style list join: ["a", "b", "c"] -> "a, b, or c". Falls back to
  // a single-item rendering when only one phrase exists.
  const joined =
    reversal.length === 1
      ? reversal[0]
      : reversal.length === 2
      ? `${reversal[0]} or ${reversal[1]}`
      : `${reversal.slice(0, -1).join(", ")}, or ${reversal[reversal.length - 1]}`;
  return (
    <Card className="border-error/30 bg-error/5">
      <CardContent className="flex gap-3 py-4">
        <div className="w-10 h-10 rounded-xl bg-error/15 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5 text-error" />
        </div>
        <div className="flex-1 space-y-1.5 text-sm min-w-0">
          <p className="font-semibold text-error">All actions are AI-verified — keep them live.</p>
          <p className="text-foreground">
            On <span className="font-semibold">{platformName}</span>, if you {joined} after submitting,
            our AI re-checks the action and detects the reversal.
          </p>
          <p className="text-xs text-muted-foreground">
            Reversed actions trigger an <strong className="text-error">automatic account ban</strong> —
            your IP address and device fingerprint are added to the block list. Confirmed reversals are not appealable.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TaskRecentActivity — "Recent activity" card with completion count + avatars.
// ============================================================================
// Polls every 60s (via useTaskRecentSubmitters → React Query). Hides itself
// entirely when no completions exist so a brand-new task doesn't show an
// empty shell. Names + avatars come from the public `users` table; no
// private fields exposed.
function TaskRecentActivity({ taskId }: { taskId: number }) {
  const { data, isLoading } = useTaskRecentSubmitters(taskId);
  if (isLoading || !data || data.totalCompleted === 0) return null;

  const total = data.totalCompleted;
  const recent = data.recent;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-success" /> Recent activity
        </CardTitle>
        <CardDescription>
          {total.toLocaleString()} worker{total === 1 ? "" : "s"} have completed this task.
        </CardDescription>
      </CardHeader>
      {recent.length > 0 && (
        <CardContent>
          <ul className="space-y-1.5">
            {recent.map((r) => (
              <li key={r.user_id} className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(r.name || "U")
                  )}
                </div>
                <span className="font-medium truncate">{r.name || "Anonymous"}</span>
                <span className="text-muted-foreground ml-auto shrink-0">
                  {formatRelativeTime(r.completed_at)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
