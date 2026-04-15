"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { checkActiveSubscription } from "@/lib/subscription-check";
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
  } catch {
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

    // Enforce max-completions cap: only the first N submissions win
    const taskId = record.task_id as number;
    const [filledBefore, maxCompletions] = await Promise.all([
      countFilledSlots(db, taskId),
      getTaskMaxCompletions(db, taskId),
    ]);
    if (maxCompletions > 0 && filledBefore >= maxCompletions) {
      return { success: false, error: "This task has reached its submission limit" };
    }

    // Validate proof type - use task's own proof_type field
    const { data: task } = await db.from("tasks").select("title, proof_type").eq("id", taskId).single();
    const taskRecord = (task as Record<string, unknown>) || {};
    if (task) {
      const proofType = String(taskRecord.proof_type || "both");
      if ((proofType === "url" || proofType === "both") && (!data.proof_urls || data.proof_urls.length === 0))
        return { success: false, error: "At least one URL proof is required" };
      if ((proofType === "screenshot" || proofType === "both") && (!data.proof_screenshots || data.proof_screenshots.length === 0))
        return { success: false, error: "At least one screenshot proof is required" };
    }

    await db.from("task_assignments").update({
      status: "submitted",
      proof_urls: data.proof_urls || [],
      proof_screenshots: data.proof_screenshots || [],
      proof_notes: data.proof_notes || null,
      submitted_at: new Date().toISOString(),
    } as never).eq("id", assignmentId);

    // If this submission filled the last slot, cancel any remaining open assignments
    if (maxCompletions > 0 && filledBefore + 1 >= maxCompletions) {
      await cancelRemainingAssignments(db, taskId);
    }

    // Notify all admins in real-time that a proof needs review
    const { data: admins } = await db.from("profiles").select("user_id").in("role", ["super_admin", "admin"]);
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
  } catch {
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
    if (!["super_admin", "admin", "group_leader"].includes(session.user.role)) return { success: false, error: "Unauthorized" };

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

      // 2. CREDIT the submitter's wallet (money transfer IN)
      const { data: submitterProfile } = await db.from("profiles").select("total_points, tasks_completed").eq("user_id", submitterId).single();
      if (submitterProfile) {
        const sp = submitterProfile as Record<string, unknown>;
        const newBalance = Number(sp.total_points || 0) + pointsToAward;
        const newTaskCount = Number(sp.tasks_completed || 0) + 1;
        await db.from("profiles").update({
          total_points: newBalance,
          tasks_completed: newTaskCount,
        } as never).eq("user_id", submitterId);
      }

      // 3. Update task's points_spent counter
      await db.from("tasks").update({
        points_spent: currentSpent + pointsToAward,
      } as never).eq("id", record.task_id);

      // 4. Log the transaction in points_history (both sides)
      await db.from("points_history").insert({
        user_id: submitterId,
        amount: pointsToAward,
        action: "task_completed",
        description: `Task completed and approved (+${pointsToAward.toFixed(2)} pts)`,
        reference_type: "task_assignment",
        reference_id: String(assignmentId),
      } as never);

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

      // Penalty after 3+ rejections
      const { count } = await db.from("task_assignments").select("id", { count: "exact", head: true })
        .eq("task_id", record.task_id).eq("user_id", record.user_id).eq("status", "rejected");

      if ((count || 0) >= 3) {
        await db.from("points_history").insert({
          user_id: record.user_id, amount: -5, action: "task_rejected",
          description: "Penalty: 3+ rejections on same task",
          reference_type: "task_assignment", reference_id: String(assignmentId),
        } as never);

        const { data: profile } = await db.from("profiles").select("total_points").eq("user_id", record.user_id).single();
        if (profile) {
          const currentPoints = Number((profile as Record<string, unknown>).total_points);
          await db.from("profiles").update({ total_points: Math.max(0, currentPoints - 5) } as never).eq("user_id", record.user_id);
        }
      }
    }

    return { success: true, message: "Assignment rejected" };
  } catch {
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
  const { data } = await db
    .from("task_assignments")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", session.user.id)
    .single();

  return (data as Record<string, unknown>) || null;
}
