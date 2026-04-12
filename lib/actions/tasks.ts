"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  platform_id: z.number().int().positive(),
  task_type_id: z.number().int().positive(),
  task_data: z.record(z.string(), z.string()).optional().default({}),
  images: z.array(z.string()).optional().default([]),
  urls: z.array(z.string()).optional().default([]),
  proof_type: z.enum(["url", "screenshot", "both"]).default("both"),
  point_budget: z.number().min(0.01, "Budget must be greater than 0"),
  points_per_completion: z.number().min(0.01, "Points per completion must be greater than 0"),
  priority: z.enum(["low", "medium", "high"]),
  deadline: z.string().nullable().optional(),
  status: z.enum(["draft", "pending"]),
  target_type: z.enum(["all_users", "group", "individual"]),
  target_group_id: z.number().nullable().optional(),
  target_user_id: z.string().nullable().optional(),
  target_user_email: z.string().email().nullable().optional(),
  is_recurring: z.boolean().optional(),
  recurring_type: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
  recurring_end_date: z.string().nullable().optional(),
  max_completions: z.number().nullable().optional(),
});

// Anyone can create tasks - admins get auto-approved, users need admin approval
// Points are deducted from creator's wallet immediately on publish
export async function createTask(formData: z.infer<typeof taskSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = taskSchema.parse(formData);
    const db = getServerClient();
    const isAdmin = ["super_admin", "admin"].includes(session.user.role);

    // Suspended users cannot create tasks
    if (!isAdmin) {
      const { data: profile } = await db.from("profiles").select("status").eq("user_id", session.user.id).single();
      if (profile && (profile as Record<string, unknown>).status === "suspended")
        return { success: false, error: "Your account is suspended" };
    }

    // Validate budget: points_per_completion * possible completions <= point_budget
    if (validated.points_per_completion > validated.point_budget) {
      return { success: false, error: "Points per completion cannot exceed total budget" };
    }

    // If publishing (not draft), check wallet balance
    if (validated.status === "pending") {
      const { data: profile } = await db
        .from("profiles")
        .select("total_points")
        .eq("user_id", session.user.id)
        .single();

      const balance = profile ? Number((profile as Record<string, unknown>).total_points) : 0;
      if (balance < validated.point_budget) {
        return { success: false, error: `Insufficient points. You have ${balance.toFixed(2)} but need ${validated.point_budget.toFixed(2)}` };
      }
    }

    // Resolve email to user_id for individual assignment
    let resolvedUserId = validated.target_user_id || null;
    if (validated.target_type === "individual" && validated.target_user_email && !resolvedUserId) {
      const { data: foundUser } = await db.from("users").select("id").eq("email", validated.target_user_email.trim().toLowerCase()).single();
      if (!foundUser) return { success: false, error: `No user found with email: ${validated.target_user_email}` };
      resolvedUserId = (foundUser as Record<string, unknown>).id as string;
    }

    // Admin tasks are auto-approved, user tasks need approval
    const approvalStatus = isAdmin ? "approved" : "pending_approval";

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { target_user_email: _email, ...taskFields } = validated;

    const { data: task, error } = await db
      .from("tasks")
      .insert({
        ...taskFields,
        task_data: validated.task_data || {},
        target_user_id: resolvedUserId,
        points: validated.points_per_completion,
        point_budget: validated.point_budget,
        points_per_completion: validated.points_per_completion,
        points_spent: 0,
        images: validated.images || [],
        urls: validated.urls || [],
        approval_status: approvalStatus,
        created_by: session.user.id,
      } as never)
      .select("id")
      .single();

    if (error || !task) {
      return { success: false, error: "Failed to create task" };
    }

    const taskRecord = task as Record<string, unknown>;

    // If publishing, deduct points from creator's wallet
    if (validated.status === "pending") {
      await deductBudgetFromWallet(db, session.user.id, validated.point_budget, taskRecord.id as number);

      // If admin (auto-approved), create assignments immediately
      if (isAdmin) {
        // Pass resolvedUserId so individual assignments work
        await createAssignments(db, taskRecord.id as number, { ...validated, target_user_id: resolvedUserId });
      }
    }

    return {
      success: true,
      data: taskRecord,
      message: isAdmin
        ? "Task created"
        : "Task submitted for admin approval",
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Validation error" };
    }
    return { success: false, error: "Failed to create task" };
  }
}

async function deductBudgetFromWallet(
  db: ReturnType<typeof getServerClient>,
  userId: string,
  amount: number,
  taskId: number
) {
  // Deduct from wallet
  const { data: profile } = await db
    .from("profiles")
    .select("total_points")
    .eq("user_id", userId)
    .single();

  const currentBalance = profile ? Number((profile as Record<string, unknown>).total_points) : 0;
  await db
    .from("profiles")
    .update({ total_points: currentBalance - amount } as never)
    .eq("user_id", userId);

  // Log transaction
  await db.from("points_history").insert({
    user_id: userId,
    amount: -amount,
    action: "task_completed", // reusing enum - task budget locked
    description: `Points locked for task budget (Task #${taskId})`,
    reference_type: "task",
    reference_id: String(taskId),
  } as never);
}

async function createAssignments(
  db: ReturnType<typeof getServerClient>,
  taskId: number,
  task: z.infer<typeof taskSchema>
) {
  let userIds: string[] = [];

  if (task.target_type === "all_users") {
    const { data } = await db
      .from("profiles")
      .select("user_id")
      .eq("status", "active");
    userIds = ((data || []) as Record<string, unknown>[]).map((r) => r.user_id as string);
  } else if (task.target_type === "group" && task.target_group_id) {
    const { data } = await db
      .from("group_members")
      .select("user_id")
      .eq("group_id", task.target_group_id);
    userIds = ((data || []) as Record<string, unknown>[]).map((r) => r.user_id as string);
  } else if (task.target_type === "individual" && task.target_user_id) {
    userIds = [task.target_user_id];
  }

  if (userIds.length > 0) {
    const assignments = userIds.map((userId) => ({
      task_id: taskId,
      user_id: userId,
      status: "pending",
    }));
    await db.from("task_assignments").insert(assignments as never[]);
  }
}

// Admin: approve a user-created task
export async function approveTask(taskId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!["super_admin", "admin"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const db = getServerClient();
    const { data: task } = await db.from("tasks").select("*").eq("id", taskId).single();
    if (!task) return { success: false, error: "Task not found" };
    const t = task as Record<string, unknown>;

    if (t.approval_status !== "pending_approval") {
      return { success: false, error: "Task is not pending approval" };
    }

    await db.from("tasks").update({ approval_status: "approved" } as never).eq("id", taskId);

    // Create assignments now that it's approved
    if (t.status === "pending") {
      await createAssignments(db, taskId, t as unknown as z.infer<typeof taskSchema>);
    }

    return { success: true, message: "Task approved" };
  } catch {
    return { success: false, error: "Failed to approve task" };
  }
}

// Admin: reject a user-created task (refund points)
export async function rejectTask(taskId: number, reason?: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!["super_admin", "admin"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const db = getServerClient();
    const { data: task } = await db.from("tasks").select("*").eq("id", taskId).single();
    if (!task) return { success: false, error: "Task not found" };
    const t = task as Record<string, unknown>;

    await db.from("tasks").update({
      approval_status: "rejected_by_admin",
      status: "draft",
    } as never).eq("id", taskId);

    // Refund the budget back to creator
    const budget = Number(t.point_budget || 0);
    const spent = Number(t.points_spent || 0);
    const refund = budget - spent;

    if (refund > 0) {
      const { data: profile } = await db
        .from("profiles")
        .select("total_points")
        .eq("user_id", t.created_by)
        .single();

      const currentBalance = profile ? Number((profile as Record<string, unknown>).total_points) : 0;
      await db
        .from("profiles")
        .update({ total_points: currentBalance + refund } as never)
        .eq("user_id", t.created_by);

      await db.from("points_history").insert({
        user_id: t.created_by,
        amount: refund,
        action: "task_rejected",
        description: `Task rejected by admin - budget refunded${reason ? `: ${reason}` : ""}`,
        reference_type: "task",
        reference_id: String(taskId),
      } as never);
    }

    return { success: true, message: "Task rejected and points refunded" };
  } catch {
    return { success: false, error: "Failed to reject task" };
  }
}

export async function updateTask(
  taskId: number,
  formData: Record<string, unknown>
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const isAdmin = ["super_admin", "admin"].includes(session.user.role);

    // Verify ownership or admin
    const { data: existing } = await db.from("tasks").select("created_by, approval_status").eq("id", taskId).single();
    if (!existing) return { success: false, error: "Task not found" };
    const task = existing as Record<string, unknown>;

    if (task.created_by !== session.user.id && !isAdmin) {
      return { success: false, error: "You can only edit your own tasks" };
    }

    // If user (not admin) edits a live task, set it back to pending approval
    const updateData = { ...formData };
    if (!isAdmin && task.approval_status === "approved") {
      updateData.approval_status = "pending_approval";
    }

    // Remove fields that shouldn't be in the DB update
    delete updateData.target_user_email;

    const { error } = await db
      .from("tasks")
      .update(updateData as never)
      .eq("id", taskId);

    if (error) return { success: false, error: "Failed to update task" };

    if (!isAdmin && task.approval_status === "approved") {
      return { success: true, message: "Task updated and sent for admin re-approval" };
    }
    return { success: true, message: "Task updated" };
  } catch {
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteTask(taskId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Refund remaining budget to creator
    const { data: task } = await db.from("tasks").select("created_by, point_budget, points_spent").eq("id", taskId).single();
    if (task) {
      const t = task as Record<string, unknown>;
      const refund = Number(t.point_budget || 0) - Number(t.points_spent || 0);
      if (refund > 0) {
        const { data: profile } = await db.from("profiles").select("total_points").eq("user_id", t.created_by).single();
        const balance = profile ? Number((profile as Record<string, unknown>).total_points) : 0;
        await db.from("profiles").update({ total_points: balance + refund } as never).eq("user_id", t.created_by);

        await db.from("points_history").insert({
          user_id: t.created_by,
          amount: refund,
          action: "task_rejected",
          description: "Task deleted - remaining budget refunded",
          reference_type: "task",
          reference_id: String(taskId),
        } as never);
      }
    }

    await db.from("tasks").delete().eq("id", taskId);
    return { success: true, message: "Task deleted" };
  } catch {
    return { success: false, error: "Failed to delete task" };
  }
}

export async function publishTask(taskId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    const { data: task } = await db.from("tasks").select("*").eq("id", taskId).single();
    if (!task) return { success: false, error: "Task not found" };
    const t = task as Record<string, unknown>;

    if (t.status !== "draft") return { success: false, error: "Only draft tasks can be published" };

    // Check wallet balance
    const budget = Number(t.point_budget || 0);
    const { data: profile } = await db.from("profiles").select("total_points").eq("user_id", session.user.id).single();
    const balance = profile ? Number((profile as Record<string, unknown>).total_points) : 0;

    if (balance < budget) {
      return { success: false, error: `Insufficient points. You have ${balance.toFixed(2)} but need ${budget.toFixed(2)}` };
    }

    const isAdmin = ["super_admin", "admin"].includes(session.user.role);
    const approvalStatus = isAdmin ? "approved" : "pending_approval";

    await db.from("tasks").update({ status: "pending", approval_status: approvalStatus } as never).eq("id", taskId);
    await deductBudgetFromWallet(db, session.user.id, budget, taskId);

    if (isAdmin) {
      await createAssignments(db, taskId, t as unknown as Parameters<typeof createAssignments>[2]);
    }

    return { success: true, message: isAdmin ? "Task published" : "Task submitted for approval" };
  } catch {
    return { success: false, error: "Failed to publish task" };
  }
}

export async function getTasks(params: PaginationParams & {
  status?: string;
  platform_id?: number;
  approval_status?: string;
  created_by?: string;
}): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("tasks")
    .select("*, platforms!inner(name, slug, icon), task_types!inner(name, slug), users!tasks_created_by_fkey(name, email)", { count: "exact" });

  if (params.status) query = query.eq("status", params.status);
  if (params.platform_id) query = query.eq("platform_id", params.platform_id);
  if (params.approval_status) query = query.eq("approval_status", params.approval_status);
  if (params.created_by) query = query.eq("created_by", params.created_by);
  if (params.search) query = query.ilike("title", `%${params.search}%`);

  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + pageSize - 1);

  const { data, count } = await query;

  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getTaskById(taskId: number) {
  const db = getServerClient();

  const { data: task } = await db
    .from("tasks")
    .select("*, platforms!inner(name, slug, icon), task_types!inner(name, slug, required_fields, proof_type, default_points), users!tasks_created_by_fkey(name, email)")
    .eq("id", taskId)
    .single();

  if (!task) return null;

  const { data: assignments } = await db
    .from("task_assignments")
    .select("*, users!task_assignments_user_id_fkey(id, name, email, image)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  return {
    task: task as Record<string, unknown>,
    assignments: (assignments || []) as Record<string, unknown>[],
  };
}

// Admin: get tasks pending approval
export async function getPendingApprovalTasks(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("tasks")
    .select("*, platforms!inner(name, slug, icon), task_types!inner(name, slug), users!tasks_created_by_fkey(name, email)", { count: "exact" })
    .eq("approval_status", "pending_approval")
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
