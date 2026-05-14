"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Textarea, Btn, Badge } from "@/components/ui";
import { CheckCircle, XCircle, Clock, ExternalLink, Image as ImageIcon, Loader2, Link2, Bell, Sparkles, Copy, Play, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  useAcceptTask,
  useSubmitItemProof,
  useReviewItemSubmission,
  useMyAssignmentWithItems,
} from "@/hooks/use-tasks";
import { useNotifyAssignmentToSubmit } from "@/hooks/use-groups";
import { formatDate, getInitials } from "@/lib/utils";
import { PLATFORM_CONFIG, MUSIC_STREAM_SLUGS, MUSIC_PLATFORM_SLUGS } from "@/lib/constants/platforms";
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: platformConfig?.color || "#666" }}>
                {String(platform?.name || "?").charAt(0)}
              </div>
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

        {canViewSubmissions && (
          <Card>
            <CardHeader><CardTitle>Submissions ({assignments.length})</CardTitle></CardHeader>
            <CardContent>
              {assignments.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No submissions yet</p> : (
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

      {/* Admin profile modal */}
      {isAdmin && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      {/* Right column: per-item Task Data card. Each bundle item gets its
          own collapsed-ish section showing only its own task_data fields,
          plus a "View Video" button for watch-video items that swaps in
          for the otherwise-hidden URL. */}
      <div className="space-y-4">
        <Card>
          <CardContent>
            <h4 className="text-sm font-semibold mb-3">Task Data</h4>
            {bundleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bundle items configured</p>
            ) : (
              <div className="space-y-4">
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
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h4 className="text-sm font-semibold mb-1">Bundle Rewards</h4>
            <div className="space-y-1 mt-2 text-xs text-muted-foreground">
              <p>
                Earn each item&apos;s points on approval. {completionBonus > 0 && (
                  <>Bonus <strong className="text-foreground">+{completionBonus.toFixed(2)} pts</strong> when every item is approved.</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
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
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const totalCount = items.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" /> Complete each item
        </CardTitle>
        <CardDescription>
          {approvedCount} of {totalCount} approved
          {completionBonus > 0 && (
            <> · <strong className="text-foreground">+{completionBonus.toFixed(2)} pt bonus</strong> when all items are approved</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No bundle items configured</p>
        ) : (
          items.map((it, idx) => (
            <BundleItemRow
              key={it.id}
              itemSubmission={it}
              itemIndex={idx + 1}
              totalItems={totalCount}
              platformSlug={platformSlug}
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
}: {
  itemSubmission: ItemSubmission;
  itemIndex: number;
  totalItems: number;
  platformSlug: string;
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
    <div className="rounded-xl border border-border/50 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          {itemIndex} / {totalItems}
        </span>
        <p className="text-sm font-semibold flex-1 truncate">{typeName}</p>
        <span className="text-xs font-mono text-primary shrink-0">+{itemPoints.toFixed(2)} pts</span>
        <div className="shrink-0">{statusPill}</div>
      </div>

      {/* Item content the admin configured — what the worker actually has
          to do for THIS item. Visible while there's something to do; we
          hide it on approved/cancelled rows since the work is done. */}
      {hasItemData && status !== "approved" && status !== "cancelled" && (
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

      {/* Body switches on status */}
      <div className="px-4 py-3 space-y-3">
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

        {status === "rejected" && (
          <div className="rounded-lg bg-error/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-error">Rejection reason</p>
            <p className="text-xs text-error mt-0.5">{itemSubmission.rejection_reason || "No reason"}</p>
            <p className="text-[11px] text-muted-foreground mt-2">You can resubmit this item below.</p>
          </div>
        )}

        {(status === "in_progress" || status === "rejected") && (
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
  const fieldDefs: TaskField[] = (taskType?.required_fields as TaskField[] | undefined) || [];
  // Hide the raw YouTube URL from non-staff viewers — the View Video button
  // (rendered inside the worker's BundleProofSection) opens the in-app
  // player instead.
  const hideKeys = isWatchVideo && !canViewSubmissions ? ["video_url"] : [];

  return (
    <div className="rounded-xl border border-border/40 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            {itemIndex} / {totalItems}
          </span>
          <p className="text-xs font-semibold truncate">{typeName || `Item #${itemIndex}`}</p>
        </div>
        <span className="text-[11px] font-mono text-primary">+{Number(item.points || 0).toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
        <Badge variant="primary" className="capitalize">
          {item.proof_type === "none" ? "Auto" : String(item.proof_type)}
        </Badge>
        {item.watch_duration_sec && (
          <span>· Watch ≥{item.watch_duration_sec}s</span>
        )}
        {itemSubmission && (
          <span className="ml-auto capitalize">{String(itemSubmission.status).replace("_", " ")}</span>
        )}
      </div>
      <TaskDataFields
        taskData={(item.item_data as Record<string, string>) || {}}
        fieldDefs={fieldDefs}
        hideKeys={hideKeys}
      />
    </div>
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
  const typeName = String(item?.task_types?.name || "Item");
  const status = String(itemSubmission.status);
  const proofUrls = itemSubmission.proof_urls || [];
  const proofShots = itemSubmission.proof_screenshots || [];
  const hasProof = proofUrls.length > 0 || proofShots.length > 0;
  const points = Number(item?.points || 0);

  const statusBadge = (() => {
    if (status === "approved") return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === "rejected") return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    if (status === "submitted") return <Badge variant="accent"><Clock className="w-3 h-3 mr-1" />Pending review</Badge>;
    if (status === "cancelled") return <Badge variant="default">Cancelled</Badge>;
    return <Badge variant="default">In progress</Badge>;
  })();

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold truncate">{typeName}</p>
          <span className="text-xs font-mono text-primary shrink-0">+{points.toFixed(2)}</span>
        </div>
        {statusBadge}
      </div>

      {hasProof && (
        <div className="flex gap-2 flex-wrap">
          {proofUrls.map((url, i) => (
            <a key={`u${i}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> URL {i + 1}
            </a>
          ))}
          {proofShots.map((url, i) => (
            <a key={`s${i}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ImageIcon className="w-3 h-3" /> Screenshot {i + 1}
            </a>
          ))}
        </div>
      )}

      {!!itemSubmission.proof_notes && (
        <p className="text-xs text-muted-foreground italic">&ldquo;{itemSubmission.proof_notes}&rdquo;</p>
      )}

      {status === "rejected" && !!itemSubmission.rejection_reason && (
        <p className="text-xs text-error">Reason: {itemSubmission.rejection_reason}</p>
      )}

      {isAdmin && status === "submitted" && (
        <div className="flex gap-2 pt-1">
          {showReject ? (
            <>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." className="h-9 text-xs flex-1" autoFocus />
              <Btn
                variant="danger"
                size="sm"
                disabled={!rejectReason || review.isPending}
                onClick={() => {
                  review.mutate({ itemSubmissionId: itemSubmission.id, action: "reject", reason: rejectReason });
                  setShowReject(false);
                  setRejectReason("");
                }}
              >
                Confirm
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setShowReject(false); setRejectReason(""); }}>
                Cancel
              </Btn>
            </>
          ) : (
            <>
              <Btn size="sm" onClick={() => review.mutate({ itemSubmissionId: itemSubmission.id, action: "approve" })} disabled={review.isPending}>
                <CheckCircle className="w-3 h-3 mr-1" /> Approve
              </Btn>
              <Btn variant="outline" size="sm" onClick={() => setShowReject(true)}>
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Btn>
            </>
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
