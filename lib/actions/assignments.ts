"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { checkActiveSubscription } from "@/lib/subscription-check";
import { isStaffRole, STAFF_ROLES } from "@/lib/constants/roles";
import { MUSIC_STREAM_SLUGS } from "@/lib/constants/platforms";
import { recordAudit } from "@/lib/audit";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

// Helper: check if user is suspended
async function checkSuspended(db: ReturnType<typeof getServerClient>, userId: string): Promise<string | null> {
  const { data } = await db.from("profiles").select("status").eq("user_id", userId).single();
  if (data && (data as Record<string, unknown>).status === "suspended") return "Your account is suspended";
  return null;
}

// Helper: count submitted/approved assignments for a task (the "filled" slots)
async function countFilledSlots(db: ReturnType<typeof getServerClient>, taskId: number): Promise<number> {
  const { count } = await db
    .from("task_assignments")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .in("status", ["submitted", "approved"]);
  return count || 0;
}

// Helper: max completions allowed for a task (budget / points_per_completion)
async function getTaskMaxCompletions(db: ReturnType<typeof getServerClient>, taskId: number): Promise<number> {
  const { data } = await db.from("tasks").select("point_budget, points_per_completion").eq("id", taskId).single();
  if (!data) return 0;
  const d = data as Record<string, unknown>;
  const budget = Number(d.point_budget || 0);
  const perCompletion = Number(d.points_per_completion || 0);
  if (perCompletion <= 0) return 0;
  return Math.floor(budget / perCompletion);
}

// Helper: has the task reached its completion cap?
async function isTaskFull(db: ReturnType<typeof getServerClient>, taskId: number): Promise<boolean> {
  const [filled, max] = await Promise.all([countFilledSlots(db, taskId), getTaskMaxCompletions(db, taskId)]);
  return max > 0 && filled >= max;
}

// Helper: cancel any remaining open assignments once the task is full
async function cancelRemainingAssignments(db: ReturnType<typeof getServerClient>, taskId: number) {
  await db
    .from("task_assignments")
    .update({ status: "cancelled" } as never)
    .eq("task_id", taskId)
    .in("status", ["pending", "in_progress"]);
}

// Subscription gate uses the shared helper — respects expires_at + setting

// ===== User: Get my task assignments =====
export async function getMyTasks(params: PaginationParams & {
  status?: string;
  category?: string;
}): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("task_assignments")
    .select(
      // `category` added so the worker grid can show the chip + filter by it.
      // `task_bundle_items(...)` + `completion_bonus, point_budget, points_spent,
      // max_completions` added in Entry #20 so the new responsive card layout
      // can render per-bundle action pills, tier chip, total/bonus credit
      // line, and slot progress bar without a second roundtrip.
      "*, tasks!inner(id, title, description, points, points_per_completion, completion_bonus, point_budget, points_spent, max_completions, priority, deadline, status, category, platform_id, task_type_id, task_data, images, urls, created_by, platforms!inner(name, slug, icon), task_types!inner(name, slug, proof_type), task_bundle_items(id, points, sort_order, task_types!inner(slug, name)))",
      { count: "exact" }
    )
    .eq("user_id", session.user.id)
    .neq("status", "cancelled")
    // Never show users their own tasks as doable
    .neq("tasks.created_by", session.user.id);

  if (params.status) query = query.eq("status", params.status);
  // Filter on the JOINED tasks.category column. PostgREST allows
  // `<relation>.<column>` syntax for inner-join filters.
  if (params.category) query = query.eq("tasks.category", params.category);
  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}

// ===== User: Accept task =====
export async function acceptTask(assignmentId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Check suspended
    const suspended = await checkSuspended(db, session.user.id);
    if (suspended) return { success: false, error: suspended };

    // Check subscription
    const subError = await checkActiveSubscription(db, session.user.id);
    if (subError) return { success: false, error: subError };

    const { data: assignment } = await db.from("task_assignments").select("id, user_id, status, task_id").eq("id", assignmentId).single();
    if (!assignment) return { success: false, error: "Assignment not found" };
    const record = assignment as Record<string, unknown>;

    if (record.user_id !== session.user.id) return { success: false, error: "Unauthorized" };
    if (record.status === "cancelled") return { success: false, error: "This task is no longer available" };
    if (record.status !== "pending") return { success: false, error: "Task has already been accepted" };

    // You can't do your own task
    const { data: ownerCheck } = await db.from("tasks").select("created_by").eq("id", record.task_id).single();
    if (ownerCheck && (ownerCheck as Record<string, unknown>).created_by === session.user.id) {
      return { success: false, error: "You cannot complete your own task" };
    }

    // Enforce max-completions cap: block acceptance if the task is already full
    const maxReached = await isTaskFull(db, record.task_id as number);
    if (maxReached) return { success: false, error: "This task has reached its submission limit" };

    await db.from("task_assignments").update({ status: "in_progress" } as never).eq("id", assignmentId);

    // Promote every bundle-item submission row from 'pending' → 'in_progress'
    // so the worker can start submitting items individually.
    await db
      .from("assignment_item_submissions")
      .update({ status: "in_progress" } as never)
      .eq("assignment_id", assignmentId)
      .eq("status", "pending");

    // Fetch task title for the notification
    const { data: task } = await db.from("tasks").select("title").eq("id", record.task_id).single();
    const taskTitle = task ? String((task as Record<string, unknown>).title || "task") : "task";

    // Notify the user who accepted the task
    await db.from("notifications").insert({
      user_id: session.user.id,
      type: "task_assigned",
      title: "Task Accepted",
      message: `You accepted "${taskTitle}". Complete it and submit your proof.`,
      link: `/tasks/${record.task_id}`,
      data: { assignment_id: assignmentId, task_id: record.task_id },
    } as never);

    return { success: true, message: "Task accepted" };
  } catch (err) {

    console.error(err);
    return { success: false, error: "Failed to accept task" };
  }
}

// ===== User: Submit proof for one bundle item =====
// This is the canonical "submit proof" entry point. It validates ownership +
// per-item proof requirements, then delegates to the
// submit_item_proof_if_capacity RPC which handles capacity locking, parent-
// status recompute, and sibling cancellation atomically.
export async function submitItemProof(
  itemSubmissionId: number,
  data: { proof_urls: string[]; proof_screenshots: string[]; proof_notes?: string }
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    const suspended = await checkSuspended(db, session.user.id);
    if (suspended) return { success: false, error: suspended };

    const subErr = await checkActiveSubscription(db, session.user.id);
    if (subErr) return { success: false, error: subErr };

    // Resolve the item -> bundle item, parent assignment, parent task.
    // `sort_order` is pulled so the sequential-bundle guard below can use it
    // without a second round-trip just for that column.
    const { data: itemRow } = await db
      .from("assignment_item_submissions")
      .select(
        "id, status, bundle_item_id, assignment_id, " +
        "task_bundle_items!inner(id, sort_order, proof_type, task_id, task_types!inner(slug))," +
        "task_assignments!inner(id, user_id, status, task_id, tasks!inner(title))"
      )
      .eq("id", itemSubmissionId)
      .single();

    if (!itemRow) return { success: false, error: "Item submission not found" };
    const item = itemRow as unknown as Record<string, unknown>;
    const assignment = item.task_assignments as Record<string, unknown>;
    const bundleItem = item.task_bundle_items as Record<string, unknown>;

    if ((assignment.user_id as string) !== session.user.id) return { success: false, error: "Unauthorized" };
    if (assignment.status === "cancelled") return { success: false, error: "This task is no longer available" };
    if (["approved", "cancelled"].includes(item.status as string)) {
      return { success: false, error: "This item is not in a submittable state" };
    }

    // Sequential bundle order — refuse to accept proof for an item whose
    // earlier siblings haven't reached at least 'submitted' yet. UI hides
    // locked items (task-detail.tsx) but the server is the authority since
    // a direct API call could bypass the UI. Music streams auto-approve on
    // their own submit (see further down) so a music step satisfies this
    // gate the moment its countdown ends.
    const mySortOrder = Number((bundleItem as { sort_order?: number }).sort_order ?? 0);
    if (mySortOrder > 0) {
      const { data: siblings } = await db
        .from("assignment_item_submissions")
        .select("status, task_bundle_items!inner(sort_order)")
        .eq("assignment_id", assignment.id);
      const blocking = (siblings || []).find((s) => {
        // PostgREST returns the joined row as either a single object (when
        // the relation is to-one) or an array (default for many or when the
        // type generator can't tell). Cast through unknown then handle both.
        const sib = s as unknown as { status: string; task_bundle_items: { sort_order: number } | { sort_order: number }[] };
        const bundleRow = Array.isArray(sib.task_bundle_items) ? sib.task_bundle_items[0] : sib.task_bundle_items;
        const so = Number(bundleRow?.sort_order ?? 0);
        return so < mySortOrder && !["submitted", "approved"].includes(String(sib.status));
      });
      if (blocking) {
        return { success: false, error: "Complete the previous bundle item first" };
      }
    }

    // Per-item proof-type validation. 'none' (auto-submitted, e.g. YouTube
    // watch-video on duration completion) bypasses URL/screenshot checks.
    const proofType = String(bundleItem.proof_type || "both");
    if (proofType !== "none") {
      if ((proofType === "url" || proofType === "both") && (!data.proof_urls || data.proof_urls.length === 0))
        return { success: false, error: "At least one URL proof is required" };
      if ((proofType === "screenshot" || proofType === "both") && (!data.proof_screenshots || data.proof_screenshots.length === 0))
        return { success: false, error: "At least one screenshot proof is required" };
    }

    const { data: rpcResult, error: rpcErr } = await db.rpc("submit_item_proof_if_capacity", {
      p_assignment_id: assignment.id,
      p_bundle_item_id: bundleItem.id,
      p_proof_urls: data.proof_urls || [],
      p_proof_screenshots: data.proof_screenshots || [],
      p_proof_notes: data.proof_notes || null,
    } as never);

    if (rpcErr) {
      console.error("[submitItemProof] rpc failed", rpcErr);
      return { success: false, error: "Failed to submit proof" };
    }
    const result = (rpcResult || {}) as Record<string, unknown>;
    if (!result.success) {
      const code = String(result.code || "");
      if (code === "cap_reached") return { success: false, error: "This task has reached its submission limit" };
      if (code === "wrong_status") return { success: false, error: "Item is not in a submittable state" };
      if (code === "not_found") return { success: false, error: "Assignment not found" };
      return { success: false, error: "Failed to submit proof" };
    }

    const taskId = bundleItem.task_id as number;
    const taskTitle = String((assignment.tasks as Record<string, unknown> | undefined)?.title || "a task");
    const typeSlug = String((bundleItem.task_types as Record<string, unknown> | undefined)?.slug || "");
    const typeName = typeSlug; // used in notification copy

    // Music auto-approve path. Re-checks the task_type slug against the
    // server-side allowlist (MUSIC_STREAM_SLUGS) — never trusts the caller.
    // On match, we immediately finalise via the existing approve RPC and
    // stamp auto_approved_at so an admin can reverse within 24h (migration
    // 052 + reverseAutoApprovedItem action). The worker becomes the
    // recorded reviewer (auto_approved_at is the signal that this was not
    // a human-reviewed approval).
    const isMusicAutoApprove = MUSIC_STREAM_SLUGS.has(typeSlug);
    if (isMusicAutoApprove) {
      const { data: approveResult, error: approveErr } = await db.rpc("approve_item_and_finalize", {
        p_item_submission_id: itemSubmissionId,
        p_reviewer_id: session.user.id,
      } as never);
      if (approveErr) {
        console.error("[submitItemProof] auto-approve rpc failed", approveErr);
        // Auto-approve failed but the proof IS in the submitted state — fall
        // through to the normal admin-review notification path so the item
        // doesn't get stuck.
      } else {
        const ar = (approveResult || {}) as Record<string, unknown>;
        if (ar.success) {
          // Stamp the auto-approve timestamp so an admin can reverse within 24h.
          await db
            .from("assignment_item_submissions")
            .update({ auto_approved_at: new Date().toISOString() } as never)
            .eq("id", itemSubmissionId);

          // Notify staff for awareness (NOT review — these are already
          // approved; admin can audit/reverse from the audit log).
          const { data: admins } = await db.from("profiles").select("user_id").in("role", STAFF_ROLES as readonly string[]);
          const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
          if (adminIds.length > 0) {
            const submitterName = session.user.name || "A user";
            const notifs = adminIds.map((uid) => ({
              user_id: uid,
              type: "system",
              title: "Music play auto-approved",
              message: `${submitterName} completed "${typeName || "a music play"}" for "${taskTitle}". Credits issued automatically. Reversible within 24h.`,
              // Admin lands on /inbox where the "auto_reverse" section
              // surfaces this row with click-through to /audit (Entry #14
              // reverse panel).
              link: `/inbox`,
              data: {
                assignment_id: assignment.id,
                task_id: taskId,
                item_submission_id: itemSubmissionId,
                submitted_by: session.user.id,
                auto_approved: true,
              },
            }));
            await db.from("notifications").insert(notifs as never[]);
          }
          return { success: true, message: "Play approved — credits issued instantly" };
        }
      }
    }

    // Standard path: notify staff in real-time that an item needs review. We
    // fan out per submission so admins see every item that lands instead of
    // waiting for the whole bundle to be done.
    const { data: admins } = await db.from("profiles").select("user_id").in("role", STAFF_ROLES as readonly string[]);
    const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
    if (adminIds.length > 0) {
      const submitterName = session.user.name || "A user";
      const notifs = adminIds.map((uid) => ({
        user_id: uid,
        type: "system",
        title: "Item submitted — Review Needed",
        message: `${submitterName} submitted "${typeName || "an action"}" for "${taskTitle}". Please review.`,
        // Admin lands on /inbox; the "Bundle proof submissions" section
        // surfaces this row with click-through to the task detail page.
        link: `/inbox`,
        data: {
          assignment_id: assignment.id,
          task_id: taskId,
          item_submission_id: itemSubmissionId,
          submitted_by: session.user.id,
        },
      }));
      await db.from("notifications").insert(notifs as never[]);
    }

    return {
      success: true,
      message: result.parent_status === "submitted" ? "Bundle fully submitted — awaiting review" : "Item submitted for review",
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to submit proof" };
  }
}

// ===== Legacy shim: submitProof (assignment-level) =====
// Old client code (and the legacy `useSubmitProof` hook) call this with an
// assignment_id. For bundle-of-1 tasks we look up the single item and
// delegate to submitItemProof. Once every caller is on the new hook we can
// delete this.
export async function submitProof(
  assignmentId: number,
  data: { proof_urls: string[]; proof_screenshots: string[]; proof_notes?: string }
): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const db = getServerClient();

  // Find the item submission for this assignment that isn't terminal yet.
  // For bundle-of-1 this is the only item; for multi-item bundles the
  // legacy caller can't disambiguate, so we pick the first in-progress /
  // rejected row by sort_order.
  const { data: itemRow } = await db
    .from("assignment_item_submissions")
    .select("id, task_bundle_items!inner(sort_order)")
    .eq("assignment_id", assignmentId)
    .in("status", ["in_progress", "rejected", "pending", "submitted"])
    .order("task_bundle_items(sort_order)", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!itemRow) return { success: false, error: "No submittable item found for this assignment" };
  const item = itemRow as unknown as Record<string, unknown>;
  return submitItemProof(item.id as number, data);
}

// ===== Admin: Review one bundle item =====
// Canonical per-item review entry point. Approval pays the item's points;
// rejection records a reason. The underlying RPCs handle wallet, audit-side
// effects, finalisation of the parent assignment, the completion bonus on
// the final approval, and the rejection penalty when every item ends
// rejected.
export async function reviewItemSubmission(
  itemSubmissionId: number,
  action: "approve" | "reject",
  reason?: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isStaffRole(session.user.role)) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Load context needed for budget guard + notification copy.
    const { data: itemRow } = await db
      .from("assignment_item_submissions")
      .select(
        "id, status, points_awarded, assignment_id, " +
        "task_bundle_items!inner(id, points, task_id, task_types!inner(name, slug))," +
        "task_assignments!inner(id, user_id, status, task_id, tasks!inner(title, point_budget, points_spent, completion_bonus))"
      )
      .eq("id", itemSubmissionId)
      .single();
    if (!itemRow) return { success: false, error: "Item submission not found" };
    const item = itemRow as unknown as Record<string, unknown>;
    const bundleItem = item.task_bundle_items as Record<string, unknown>;
    const assignment = item.task_assignments as Record<string, unknown>;
    const task = assignment.tasks as Record<string, unknown>;
    const taskTypes = bundleItem.task_types as Record<string, unknown> | undefined;

    const taskId = task ? Number(bundleItem.task_id) : 0;
    const submitterId = assignment.user_id as string;
    const taskTitle = String(task?.title || "a task");
    const typeName = String(taskTypes?.name || taskTypes?.slug || "");

    if (action === "approve") {
      if (item.status === "approved") return { success: false, error: "Item already approved" };
      if (item.status !== "submitted" && item.status !== "rejected")
        return { success: false, error: "Only submitted (or previously rejected) items can be approved" };

      const itemPoints = Number(bundleItem.points || 0);
      const currentSpent = Number(task?.points_spent || 0);
      const budget = Number(task?.point_budget || 0);
      const bonus = Number(task?.completion_bonus || 0);

      // Worst-case budget check: this approval AND a future bonus might both
      // pay out (we can't tell from here if this is the final item). Refuse
      // up front rather than crediting and then failing on the bonus.
      if (currentSpent + itemPoints > budget) {
        return { success: false, error: "Task budget exhausted — cannot approve more submissions" };
      }
      if (bonus > 0 && currentSpent + itemPoints + bonus > budget) {
        // Soft warning: still allow approval but note bonus may not pay if
        // every item lands. Plan-level safeguard is the create-form
        // pre-publish validation; this is the runtime guard.
        // (Continue with approval; bonus path inside RPC will refuse if it
        // would breach budget.)
      }

      const { data: rpcResult, error: rpcErr } = await db.rpc("approve_item_and_finalize", {
        p_item_submission_id: itemSubmissionId,
        p_reviewer_id: session.user.id,
      } as never);
      if (rpcErr) {
        console.error("[reviewItemSubmission] approve rpc failed", rpcErr);
        return { success: false, error: "Failed to approve item" };
      }
      const r = (rpcResult || {}) as Record<string, unknown>;
      if (!r.success) {
        const code = String(r.code || "");
        if (code === "already_approved") return { success: false, error: "Item already approved" };
        if (code === "wrong_status") return { success: false, error: "Item is not in a reviewable state" };
        if (code === "not_found") return { success: false, error: "Item submission not found" };
        return { success: false, error: "Failed to approve item" };
      }
      const bonusPaid = !!r.bonus_paid;
      const parentFinalized = !!r.parent_finalized;

      // Notify the submitter
      await db.from("notifications").insert({
        user_id: submitterId,
        type: "points_earned",
        title: parentFinalized ? "Bundle complete!" : "Item approved",
        message: parentFinalized
          ? bonusPaid
            ? `All items approved for "${taskTitle}". You earned a ${bonus.toFixed(2)} completion bonus.`
            : `All items approved for "${taskTitle}".`
          : `Your "${typeName}" submission was approved (+${itemPoints.toFixed(2)} pts).`,
        link: `/tasks/${taskId}`,
        data: {
          assignment_id: assignment.id,
          item_submission_id: itemSubmissionId,
          points: itemPoints,
          bonus_paid: bonusPaid,
        },
      } as never);

      return {
        success: true,
        message: parentFinalized
          ? bonusPaid
            ? `Bundle complete — ${(itemPoints + bonus).toFixed(2)} pts transferred (incl. bonus)`
            : `Bundle complete — ${itemPoints.toFixed(2)} pts transferred`
          : `Item approved — ${itemPoints.toFixed(2)} pts transferred`,
      };
    } else {
      if (!reason) return { success: false, error: "Rejection reason is required" };

      const { data: rpcResult, error: rpcErr } = await db.rpc("reject_item", {
        p_item_submission_id: itemSubmissionId,
        p_reviewer_id: session.user.id,
        p_reason: reason,
      } as never);
      if (rpcErr) {
        console.error("[reviewItemSubmission] reject rpc failed", rpcErr);
        return { success: false, error: "Failed to reject item" };
      }
      const r = (rpcResult || {}) as Record<string, unknown>;
      if (!r.success) {
        return { success: false, error: "Failed to reject item" };
      }

      // Notify the submitter so they can resubmit just this item.
      await db.from("notifications").insert({
        user_id: submitterId,
        type: "task_rejected",
        title: r.all_rejected ? "Bundle rejected" : "Item rejected",
        message: r.all_rejected
          ? `All items rejected for "${taskTitle}". Reason: ${reason}`
          : `Your "${typeName}" submission was rejected. Reason: ${reason}. You can resubmit this item.`,
        link: `/tasks/${taskId}`,
        data: { assignment_id: assignment.id, item_submission_id: itemSubmissionId, reason },
      } as never);

      return { success: true, message: r.all_rejected ? "Bundle rejected" : "Item rejected" };
    }
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to review item" };
  }
}

// ===== Legacy shim: reviewAssignment (assignment-level approve/reject) =====
// Resolves the assignment's currently-pending bundle item submission and
// delegates to reviewItemSubmission. Designed for bundle-of-1 callers and
// any in-flight client sessions that still hold the old hook.
export async function reviewAssignment(
  assignmentId: number,
  action: "approve" | "reject",
  reason?: string
): Promise<ApiResponse> {
  const db = getServerClient();
  const { data: itemRow } = await db
    .from("assignment_item_submissions")
    .select("id, task_bundle_items!inner(sort_order)")
    .eq("assignment_id", assignmentId)
    .eq("status", "submitted")
    .order("task_bundle_items(sort_order)", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!itemRow) return { success: false, error: "No reviewable submission found for this assignment" };
  const item = itemRow as unknown as Record<string, unknown>;
  return reviewItemSubmission(item.id as number, action, reason);
}

// ===== Admin: Get pending reviews =====
export async function getPendingReviews(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("task_assignments")
    .select("*, tasks!inner(title, points, points_per_completion, platform_id, platforms!inner(name, icon)), users!task_assignments_user_id_fkey(id, name, email, image)", { count: "exact" })
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}

// ===== Get current user's assignment + per-item submissions for a task =====
// Canonical fetch for the worker-facing task detail page. Returns the parent
// assignment along with every bundle-item submission (joined with the bundle
// item config + task_type info needed for rendering).
export async function getMyAssignmentForTaskWithItems(taskId: number): Promise<{
  assignment: Record<string, unknown>;
  items: Record<string, unknown>[];
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = getServerClient();

  const { data: assignment } = await db
    .from("task_assignments")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assignment) return null;
  const aRecord = assignment as Record<string, unknown>;

  const { data: items } = await db
    .from("assignment_item_submissions")
    .select(
      "*, task_bundle_items!inner(*, task_types(name, slug, required_fields, proof_type))"
    )
    .eq("assignment_id", aRecord.id)
    // Order by the admin-defined `sort_order` on the joined bundle item so
    // the worker's bundle list matches the configured sequence — needed by
    // the sequential gate in task-detail.tsx. Previously we ordered by
    // bundle_item_id (insertion order), which usually but not always
    // matched the intended order.
    .order("sort_order", { ascending: true, referencedTable: "task_bundle_items" });

  return {
    assignment: aRecord,
    items: (items || []) as unknown as Record<string, unknown>[],
  };
}

// ===== Admin: pending per-item submissions for the review tab =====
export async function getPendingItemReviews(
  params?: PaginationParams
): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("assignment_item_submissions")
    .select(
      "*," +
      "task_bundle_items!inner(id, sort_order, points, proof_type, item_data, watch_duration_sec, task_types!inner(name, slug))," +
      "task_assignments!inner(id, user_id, task_id, status," +
        "tasks!inner(id, title, points_per_completion, completion_bonus, platform_id," +
          "platforms!inner(name, icon))," +
        "users!task_assignments_user_id_fkey(id, name, email, image)" +
      ")",
      { count: "exact" }
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  return {
    data: (data || []) as unknown as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ===== Get current user's assignment for a specific task =====
export async function getMyAssignmentForTask(taskId: number): Promise<Record<string, unknown> | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getServerClient();
  // Some flows (re-assignment after cancellation) leave more than one row
  // per (task_id, user_id). `.single()` would throw PGRST116 there and the
  // UI would show "Accept" again. Sort by newest and pick that.
  const { data } = await db
    .from("task_assignments")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Record<string, unknown>) || null;
}

// ===== Group leader / admin / task owner: per-user assignment status =====
// Read-only view of who is assigned to a task and whether they've submitted
// yet. Used by the task detail page so a group leader can see progress and
// nudge non-submitters WITHOUT gaining the power to approve/reject.
export async function getGroupTaskStatus(taskId: number): Promise<
  Array<{
    assignment_id: number;
    user_id: string;
    name: string;
    email: string;
    image: string | null;
    status: string;
    submitted_at: string | null;
    reviewed_at: string | null;
  }>
> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const db = getServerClient();

  // Authorization: staff (admin/moderator), task creator, or leader of the
  // task's target group.
  const isAdmin = isStaffRole(session.user.role);
  let allowed = isAdmin;
  const { data: task } = await db
    .from("tasks")
    .select("created_by, target_type, target_group_id")
    .eq("id", taskId)
    .single();
  if (!task) return [];
  const t = task as Record<string, unknown>;

  if (!allowed && t.created_by === session.user.id) allowed = true;
  if (!allowed && t.target_type === "group" && t.target_group_id) {
    const { data: group } = await db
      .from("groups")
      .select("leader_id")
      .eq("id", t.target_group_id)
      .single();
    if (group && (group as Record<string, unknown>).leader_id === session.user.id) allowed = true;
  }
  if (!allowed) return [];

  const { data } = await db
    .from("task_assignments")
    .select("id, user_id, status, submitted_at, reviewed_at, users!task_assignments_user_id_fkey(name, email, image)")
    .eq("task_id", taskId)
    .order("status", { ascending: true });

  return ((data || []) as Record<string, unknown>[]).map((row) => {
    const u = row.users as Record<string, unknown> | undefined;
    return {
      assignment_id: Number(row.id),
      user_id: String(row.user_id),
      name: String(u?.name || "Unknown"),
      email: String(u?.email || ""),
      image: (u?.image as string | null) || null,
      status: String(row.status || "pending"),
      submitted_at: (row.submitted_at as string | null) || null,
      reviewed_at: (row.reviewed_at as string | null) || null,
    };
  });
}

// ============================================================================
// Auto-approve reversal (admin-only, 24h window)
// ============================================================================
// Counterpart to the auto-approve path inside submitItemProof. If an admin
// suspects a worker gamed the music-play-lock (e.g., 30s elapsed but no
// genuine listen), they can reverse the auto-approval — refunding the task
// budget and debiting the worker's wallet. Refused past the 24h window or
// if already reversed. Reverse logic + atomic state changes live in
// reverse_auto_approved_item RPC (migration 052).
export async function reverseAutoApprovedItem(
  itemSubmissionId: number,
  reason: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isStaffRole(session.user.role)) return { success: false, error: "Unauthorized" };
    if (!reason || reason.trim().length < 3) {
      return { success: false, error: "Please provide a reason (at least 3 characters)" };
    }

    const db = getServerClient();
    const { data: rpcResult, error: rpcErr } = await db.rpc("reverse_auto_approved_item", {
      p_item_submission_id: itemSubmissionId,
      p_reviewer_id: session.user.id,
      p_reason: reason.trim(),
    } as never);

    if (rpcErr) {
      console.error("[reverseAutoApprovedItem] rpc failed", rpcErr);
      return { success: false, error: "Failed to reverse auto-approval" };
    }
    const r = (rpcResult || {}) as Record<string, unknown>;
    if (!r.success) {
      const code = String(r.code || "");
      if (code === "not_found") return { success: false, error: "Item submission not found" };
      if (code === "not_auto_approved") return { success: false, error: "This item wasn't auto-approved" };
      if (code === "already_reversed") return { success: false, error: "Auto-approval already reversed" };
      if (code === "window_expired") return { success: false, error: "24h reverse window expired" };
      return { success: false, error: "Failed to reverse auto-approval" };
    }

    // Audit so a future "where did this debit come from" trace is one query
    // away in admin_audit_log.
    await recordAudit(
      db,
      session.user.id,
      "reject_task",
      "task",
      String(itemSubmissionId),
      { auto_approve_reversed: true, reason: reason.trim() }
    );

    return { success: true, message: "Auto-approval reversed — worker debited" };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to reverse auto-approval" };
  }
}

// List recent auto-approved items the admin can still reverse (within 24h).
// Staff-only. Drives a future admin UI under /audit or a dedicated page.
export async function getReversibleAutoApprovedItems(
  params: PaginationParams = {}
): Promise<PaginatedResponse<Record<string, unknown>>> {
  const empty = { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) return empty;

  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;

  // 24h-ago threshold computed in the app rather than the DB so the index
  // (idx_aim_auto_approve_pending_reverse) can serve both the bounded and
  // unbounded variants without rewriting the predicate.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, count } = await db
    .from("assignment_item_submissions")
    .select(
      "id, status, points_awarded, auto_approved_at, " +
      "task_bundle_items!inner(id, task_id, task_types!inner(slug, name))," +
      "task_assignments!inner(id, user_id, users!task_assignments_user_id_fkey(name, email))",
      { count: "exact" }
    )
    .not("auto_approved_at", "is", null)
    .is("auto_approve_reversed_at", null)
    .gte("auto_approved_at", cutoff)
    .order("auto_approved_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Supabase types the joined-relation select narrowly; cast through unknown
  // since the matching consumer-side types are loose Record<string, unknown>.
  const rows = (data || []) as unknown as Record<string, unknown>[];
  const total = count || 0;
  return { data: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
