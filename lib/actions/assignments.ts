"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

// Helper: check if user is suspended
async function checkSuspended(db: ReturnType<typeof getServerClient>, userId: string): Promise<string | null> {
  const { data } = await db.from("profiles").select("status").eq("user_id", userId).single();
  if (data && (data as Record<string, unknown>).status === "suspended") return "Your account is suspended";
  return null;
}

// Helper: check subscription if required
async function checkSubscription(db: ReturnType<typeof getServerClient>, userId: string): Promise<string | null> {
  const { data: setting } = await db.from("settings").select("value").eq("key", "require_subscription").single();
  const required = setting && ((setting as Record<string, unknown>).value === true || (setting as Record<string, unknown>).value === "true");
  if (!required) return null;

  const { data: sub } = await db
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);

  if (!sub || (sub as unknown[]).length === 0) return "An active subscription is required to perform this action";
  return null;
}

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
      "*, tasks!inner(id, title, description, points, points_per_completion, priority, deadline, status, platform_id, task_type_id, task_data, images, urls, platforms!inner(name, slug, icon), task_types!inner(name, slug, proof_type))",
      { count: "exact" }
    )
    .eq("user_id", session.user.id);

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
    const subError = await checkSubscription(db, session.user.id);
    if (subError) return { success: false, error: subError };

    const { data: assignment } = await db.from("task_assignments").select("id, user_id, status").eq("id", assignmentId).single();
    if (!assignment) return { success: false, error: "Assignment not found" };
    const record = assignment as Record<string, unknown>;

    if (record.user_id !== session.user.id) return { success: false, error: "Unauthorized" };
    if (record.status !== "pending") return { success: false, error: "Task has already been accepted" };

    await db.from("task_assignments").update({ status: "in_progress" } as never).eq("id", assignmentId);
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

    const { data: assignment } = await db.from("task_assignments").select("id, user_id, status, task_id").eq("id", assignmentId).single();
    if (!assignment) return { success: false, error: "Assignment not found" };
    const record = assignment as Record<string, unknown>;

    if (record.user_id !== session.user.id) return { success: false, error: "Unauthorized" };
    if (!["in_progress", "rejected"].includes(record.status as string)) return { success: false, error: "Task is not in a submittable state" };

    // Validate proof type requirements
    const { data: task } = await db.from("tasks").select("task_type_id").eq("id", record.task_id).single();
    if (task) {
      const { data: taskType } = await db.from("task_types").select("proof_type").eq("id", (task as Record<string, unknown>).task_type_id).single();
      if (taskType) {
        const proofType = (taskType as Record<string, unknown>).proof_type as string;
        if ((proofType === "url" || proofType === "both") && (!data.proof_urls || data.proof_urls.length === 0))
          return { success: false, error: "At least one URL proof is required" };
        if ((proofType === "screenshot" || proofType === "both") && (!data.proof_screenshots || data.proof_screenshots.length === 0))
          return { success: false, error: "At least one screenshot proof is required" };
      }
    }

    await db.from("task_assignments").update({
      status: "submitted",
      proof_urls: data.proof_urls || [],
      proof_screenshots: data.proof_screenshots || [],
      proof_notes: data.proof_notes || null,
      submitted_at: new Date().toISOString(),
    } as never).eq("id", assignmentId);

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
      const { data: task } = await db.from("tasks").select("points_per_completion").eq("id", record.task_id).single();
      const points = task ? Number((task as Record<string, unknown>).points_per_completion) : 0;

      await db.from("task_assignments").update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
        points_awarded: points,
      } as never).eq("id", assignmentId);
      // Points awarded by DB trigger
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

    return { success: true, message: action === "approve" ? "Assignment approved" : "Assignment rejected" };
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
    .select("*, tasks!inner(title, points, points_per_completion, platform_id, platforms!inner(name, icon)), users!inner(id, name, email, image)", { count: "exact" })
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}
