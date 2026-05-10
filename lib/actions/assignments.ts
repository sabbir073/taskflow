"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { checkActiveSubscription } from "@/lib/subscription-check";
import { isStaffRole, STAFF_ROLES } from "@/lib/constants/roles";
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
      "*, tasks!inner(id, title, description, points, points_per_completion, priority, deadline, status, platform_id, task_type_id, task_data, images, urls, created_by, platforms!inner(name, slug, icon), task_types!inner(name, slug, proof_type))",
      { count: "exact" }
    )
    .eq("user_id", session.user.id)
    .neq("status", "cancelled")
    // Never show users their own tasks as doable
    .neq("tasks.created_by", session.user.id);

  if (params.status) query = query.eq("status", params.status);
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

// ===== User: Submit proof (multiple URLs + screenshots) =====
export async function submitProof(
  assignmentId: number,
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

    const { data: assignment } = await db.from("task_assignments").select("id, user_id, status, task_id").eq("id", assignmentId).single();
    if (!assignment) return { success: false, error: "Assignment not found" };
    const record = assignment as Record<string, unknown>;

    if (record.user_id !== session.user.id) return { success: false, error: "Unauthorized" };
    if (record.status === "cancelled") return { success: false, error: "This task is no longer available" };
    if (!["in_progress", "rejected"].includes(record.status as string)) return { success: false, error: "Task is not in a submittable state" };

    const taskId = record.task_id as number;

    // Validate proof type - use task's own proof_type field. proof_type
    // "none" (e.g. YouTube watch-video tasks) auto-submit with no proof.
    const { data: task } = await db.from("tasks").select("title, proof_type").eq("id", taskId).single();
    const taskRecord = (task as Record<string, unknown>) || {};
    if (task) {
      const proofType = String(taskRecord.proof_type || "both");
      if (proofType !== "none") {
        if ((proofType === "url" || proofType === "both") && (!data.proof_urls || data.proof_urls.length === 0))
          return { success: false, error: "At least one URL proof is required" };
        if ((proofType === "screenshot" || proofType === "both") && (!data.proof_screenshots || data.proof_screenshots.length === 0))
          return { success: false, error: "At least one screenshot proof is required" };
      }
    }

    // Atomic capacity-check + status update + sibling cancellation. The
    // RPC takes a row lock on the parent task so concurrent submitters
    // can't race past the max-completions cap. See migration
    // 041_submit_proof_atomic.
    const { data: rpcResult, error: rpcErr } = await db.rpc("submit_proof_if_capacity", {
      p_assignment_id: assignmentId,
      p_proof_urls: data.proof_urls || [],
      p_proof_screenshots: data.proof_screenshots || [],
      p_proof_notes: data.proof_notes || null,
    } as never);
    if (rpcErr) {
      console.error("[submitProof] rpc failed", rpcErr);
      return { success: false, error: "Failed to submit proof" };
    }
    const result = (rpcResult || {}) as Record<string, unknown>;
    if (!result.success) {
      const code = String(result.code || "");
      if (code === "cap_reached") return { success: false, error: "This task has reached its submission limit" };
      if (code === "wrong_status") return { success: false, error: "Task is not in a submittable state" };
      if (code === "not_found") return { success: false, error: "Assignment not found" };
      return { success: false, error: "Failed to submit proof" };
    }

    // Notify all admins + moderators in real-time that a proof needs review
    const { data: admins } = await db.from("profiles").select("user_id").in("role", STAFF_ROLES as readonly string[]);
    const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
    if (adminIds.length > 0) {
      const submitterName = session.user.name || "A user";
      const taskTitle = String(taskRecord.title || "a task");
      const notifs = adminIds.map((uid) => ({
        user_id: uid,
        type: "system",
        title: "Proof Submitted — Review Needed",
        message: `${submitterName} submitted proof for "${taskTitle}". Please review.`,
        link: `/tasks/${taskId}`,
        data: { assignment_id: assignmentId, task_id: taskId, submitted_by: session.user.id },
      }));
      await db.from("notifications").insert(notifs as never[]);
    }

    return { success: true, message: "Proof submitted for review" };
  } catch (err) {

    console.error(err);
    return { success: false, error: "Failed to submit proof" };
  }
}

// ===== Admin: Review assignment =====
export async function reviewAssignment(
  assignmentId: number,
  action: "approve" | "reject",
  reason?: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isStaffRole(session.user.role)) return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { data: assignment } = await db.from("task_assignments").select("id, user_id, status, task_id").eq("id", assignmentId).single();
    if (!assignment) return { success: false, error: "Assignment not found" };
    const record = assignment as Record<string, unknown>;

    if (record.status !== "submitted") return { success: false, error: "Only submitted assignments can be reviewed" };

    if (action === "approve") {
      // Get task details for points transfer
      const { data: task } = await db.from("tasks").select("points_per_completion, point_budget, points_spent, created_by").eq("id", record.task_id).single();
      if (!task) return { success: false, error: "Task not found" };
      const t = task as Record<string, unknown>;

      const pointsToAward = Number(t.points_per_completion || 0);
      const currentSpent = Number(t.points_spent || 0);
      const budget = Number(t.point_budget || 0);

      // Verify budget is available
      if (currentSpent + pointsToAward > budget) {
        return { success: false, error: "Task budget exhausted - cannot approve more submissions" };
      }

      const submitterId = record.user_id as string;

      // 1. Mark assignment as approved
      await db.from("task_assignments").update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
        points_awarded: pointsToAward,
      } as never).eq("id", assignmentId);

      // 2. CREDIT the submitter's wallet atomically (handles concurrent
      // approvals — the RPC updates total_points AND inserts points_history
      // inside a single transaction, so two parallel approvals can't both
      // read the same balance and overwrite each other).
      await db.rpc("adjust_user_points", {
        p_user_id: submitterId,
        p_delta: pointsToAward,
        p_action: "task_completed",
        p_description: `Task completed and approved (+${pointsToAward.toFixed(2)} pts)`,
        p_reference_type: "task_assignment",
        p_reference_id: String(assignmentId),
      } as never);

      // 3. Bump the submitter's tasks_completed counter (non-financial, safe)
      const { data: submitterProfile } = await db.from("profiles").select("tasks_completed").eq("user_id", submitterId).single();
      if (submitterProfile) {
        const newTaskCount = Number((submitterProfile as Record<string, unknown>).tasks_completed || 0) + 1;
        await db.from("profiles").update({ tasks_completed: newTaskCount } as never).eq("user_id", submitterId);
      }

      // 4. Update task's points_spent counter
      await db.from("tasks").update({
        points_spent: currentSpent + pointsToAward,
      } as never).eq("id", record.task_id);

      // 5. Notify the submitter
      await db.from("notifications").insert({
        user_id: submitterId,
        type: "task_approved",
        title: "Task Approved!",
        message: `Your submission was approved. You earned ${pointsToAward.toFixed(2)} points.`,
        link: `/tasks/${record.task_id}`,
        data: { assignment_id: assignmentId, points: pointsToAward },
      } as never);

      return { success: true, message: `Approved — ${pointsToAward.toFixed(2)} points transferred to user` };
    } else {
      if (!reason) return { success: false, error: "Rejection reason is required" };

      await db.from("task_assignments").update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
        rejection_reason: reason,
      } as never).eq("id", assignmentId);

      // Atomic, race-safe penalty. The Postgres function takes a row lock
      // on the user's profile, counts rejected assignments for this
      // (task, user), and applies the penalty exactly once on the third
      // rejection — guarded by an idempotency check on points_history so
      // concurrent rejections (e.g. two admins clicking at the same time)
      // can't double-charge. See migration 038_rejection_penalty_atomic.
      await db.rpc("apply_rejection_penalty_if_threshold", {
        p_task_id: record.task_id,
        p_user_id: record.user_id,
      } as never);
    }

    return { success: true, message: "Assignment rejected" };
  } catch (err) {

    console.error(err);
    return { success: false, error: "Failed to review assignment" };
  }
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
