"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { checkActiveSubscription, checkQuota } from "@/lib/subscription-check";
import { recordAudit } from "@/lib/audit";
import { isStaffRole, STAFF_ROLES } from "@/lib/constants/roles";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

// A single action item inside a bundle task. After migration 047 every task
// has at least one of these. Pre-bundle "single tasks" are just bundles of 1.
const taskBundleItemSchema = z.object({
  task_type_id: z.number().int().positive(),
  points: z.number().min(0, "Item points cannot be negative"),
  proof_type: z.enum(["url", "screenshot", "both", "none"]).default("screenshot"),
  item_data: z.record(z.string(), z.string()).optional().default({}),
  // Only used when the joined task_type.slug is 'watch-video'. Required by
  // the UI in that case but accepted nullable here so the schema can be
  // shared across task types.
  watch_duration_sec: z.number().int().min(1).max(7200).nullable().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  ai_prompt: z.string().max(5000).optional().nullable().default(null),
  platform_id: z.number().int().positive(),
  // Bundle items — at least one required. The legacy task_type_id /
  // task_data / proof_type fields are still accepted for backward
  // compatibility (see compatItemsFromLegacy below) but new clients should
  // send items[].
  items: z.array(taskBundleItemSchema).min(1, "At least one bundle item is required").optional(),
  completion_bonus: z.number().min(0).optional().default(0),
  // ---- legacy single-task fields (the bundle UI no longer writes these) ----
  task_type_id: z.number().int().positive().optional(),
  task_data: z.record(z.string(), z.string()).optional().default({}),
  proof_type: z.enum(["url", "screenshot", "both", "none"]).optional(),
  // ---- common fields ----
  images: z.array(z.string()).optional().default([]),
  urls: z.array(z.string()).optional().default([]),
  point_budget: z.number().min(0.01, "Budget must be greater than 0"),
  points_per_completion: z.number().min(0, "Points per completion cannot be negative").optional(),
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

// Normalise a payload into a non-empty items[] array. Accepts either the
// new bundle shape (items[]) or the legacy single-task shape (task_type_id +
// task_data + proof_type + points_per_completion).
function resolveBundleItems(input: z.infer<typeof taskSchema>): z.infer<typeof taskBundleItemSchema>[] {
  if (input.items && input.items.length > 0) return input.items;
  if (input.task_type_id) {
    return [{
      task_type_id: input.task_type_id,
      points: input.points_per_completion ?? 0,
      proof_type: input.proof_type || "screenshot",
      item_data: input.task_data || {},
      watch_duration_sec: null,
    }];
  }
  // Caller passed neither — schema validation should have caught this. Throw
  // so the caller's try/catch surfaces a clean error to the user.
  throw new z.ZodError([{ code: "custom", path: ["items"], message: "Provide bundle items or a legacy task_type_id" }]);
}

// Anyone can create tasks - admins get auto-approved, users need admin approval
// Points are deducted from creator's wallet immediately on publish
export async function createTask(formData: z.infer<typeof taskSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = taskSchema.parse(formData);
    const db = getServerClient();
    const isAdmin = isStaffRole(session.user.role);

    // Resolve to bundle items (handles legacy single-task payloads too).
    const items = resolveBundleItems(validated);
    const completionBonus = Number(validated.completion_bonus || 0);
    // Cost-per-worker = sum of item points + bonus. The legacy
    // points_per_completion column is kept in sync with this number so old
    // dashboards / leaderboard widgets keep showing the right value.
    const perCompletion = items.reduce((s, it) => s + Number(it.points || 0), 0) + completionBonus;
    if (perCompletion <= 0) {
      return { success: false, error: "Total points per completion must be greater than 0" };
    }
    validated.points_per_completion = perCompletion;

    // Suspended users cannot create tasks
    if (!isAdmin) {
      const { data: profile } = await db.from("profiles").select("status").eq("user_id", session.user.id).single();
      if (profile && (profile as Record<string, unknown>).status === "suspended")
        return { success: false, error: "Your account is suspended" };

      // Subscription + quota gate (non-admin only)
      const subErr = await checkActiveSubscription(db, session.user.id);
      if (subErr) return { success: false, error: subErr };

      const quotaErr = await checkQuota(db, session.user.id, session.user.role, "task");
      if (quotaErr) return { success: false, error: quotaErr };
    }

    // Individual tasks: full budget goes to the single assigned user
    if (validated.target_type === "individual") {
      validated.point_budget = perCompletion;
    }

    // Validate budget: per-completion cost (incl. bonus) cannot exceed budget.
    if (perCompletion > validated.point_budget) {
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

    // Groups must be approved + active to receive tasks
    if (validated.target_type === "group") {
      if (!validated.target_group_id) return { success: false, error: "Please select a group" };
      const { data: group } = await db
        .from("groups")
        .select("approval_status, status")
        .eq("id", validated.target_group_id)
        .single();
      if (!group) return { success: false, error: "Group not found" };
      const g = group as Record<string, unknown>;
      if (g.approval_status !== "approved") return { success: false, error: "This group is not approved yet" };
      if (g.status === "suspended") return { success: false, error: "This group is suspended" };
    }

    // Admin tasks are auto-approved, user tasks need approval
    const approvalStatus = isAdmin ? "approved" : "pending_approval";

    // The legacy task_type_id / task_data / proof_type columns mirror
    // items[0] so existing read paths (leaderboard, dashboards, the old
    // single-task UI fallback) keep working unchanged.
    const primaryItem = items[0];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { target_user_email: _email, items: _items, completion_bonus: _bonus, ...taskFields } = validated;

    const { data: task, error } = await db
      .from("tasks")
      .insert({
        ...taskFields,
        task_type_id: primaryItem.task_type_id,
        task_data: primaryItem.item_data || {},
        proof_type: primaryItem.proof_type,
        target_user_id: resolvedUserId,
        points: perCompletion,
        point_budget: validated.point_budget,
        points_per_completion: perCompletion,
        points_spent: 0,
        completion_bonus: completionBonus,
        images: validated.images || [],
        urls: validated.urls || [],
        ai_prompt: validated.ai_prompt || null,
        approval_status: approvalStatus,
        created_by: session.user.id,
      } as never)
      .select("id")
      .single();

    if (error || !task) {
      return { success: false, error: "Failed to create task" };
    }

    const taskRecord = task as Record<string, unknown>;

    // Persist every bundle item. If this fails we still leave the task row —
    // the admin can edit/delete to recover. Logging is enough for now.
    const itemRows = items.map((it, idx) => ({
      task_id: taskRecord.id as number,
      task_type_id: it.task_type_id,
      sort_order: idx,
      points: it.points,
      proof_type: it.proof_type,
      item_data: it.item_data || {},
      watch_duration_sec: it.watch_duration_sec ?? null,
    }));
    const { error: itemsErr } = await db.from("task_bundle_items").insert(itemRows as never[]);
    if (itemsErr) {
      console.error("[createTask] failed to insert bundle items", itemsErr);
      return { success: false, error: "Failed to save bundle items" };
    }

    // If publishing, deduct points from creator's wallet
    if (validated.status === "pending") {
      await deductBudgetFromWallet(db, session.user.id, validated.point_budget, taskRecord.id as number);

      // If admin (auto-approved), create assignments immediately
      if (isAdmin) {
        // Pass resolvedUserId so individual assignments work
        await createAssignments(
          db,
          taskRecord.id as number,
          { ...validated, target_user_id: resolvedUserId },
          validated.title,
          session.user.id
        );
      } else {
        // User-created task — notify all admins in real-time for review
        const { data: admins } = await db.from("profiles").select("user_id").in("role", STAFF_ROLES as readonly string[]);
        const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
        if (adminIds.length > 0) {
          const creatorName = session.user.name || "A user";
          const notifs = adminIds.map((uid) => ({
            user_id: uid,
            type: "system",
            title: "New Task — Review Needed",
            message: `${creatorName} created a new task "${validated.title}". Please review.`,
            link: `/tasks/${taskRecord.id}`,
            data: { task_id: taskRecord.id, created_by: session.user.id },
          }));
          await db.from("notifications").insert(notifs as never[]);
        }
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
  // Atomic debit. The caller validated the balance upstream, so if the RPC
  // rejects with insufficient_balance it's an unexpected race — surface as
  // an error by letting the RPC error propagate to the caller's try/catch.
  await db.rpc("adjust_user_points", {
    p_user_id: userId,
    p_delta: -amount,
    p_action: "task_completed",
    p_description: `Points locked for task budget (Task #${taskId})`,
    p_reference_type: "task",
    p_reference_id: String(taskId),
  } as never);
}

async function createAssignments(
  db: ReturnType<typeof getServerClient>,
  taskId: number,
  task: z.infer<typeof taskSchema>,
  taskTitle?: string,
  creatorId?: string
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

  // Don't notify the creator themselves
  if (creatorId) userIds = userIds.filter((id) => id !== creatorId);

  if (userIds.length === 0) return;

  const assignments = userIds.map((userId) => ({
    task_id: taskId,
    user_id: userId,
    status: "pending",
  }));
  const { data: insertedAssignments } = await db
    .from("task_assignments")
    .insert(assignments as never[])
    .select("id");

  // Eagerly create one assignment_item_submissions row per (assignment,
  // bundle_item) so every read path (worker UI, admin review tab) sees the
  // full grid without lazy upserts.
  const assignmentIds = ((insertedAssignments || []) as Record<string, unknown>[]).map((a) => a.id as number);
  if (assignmentIds.length > 0) {
    const { data: bundleItems } = await db
      .from("task_bundle_items")
      .select("id")
      .eq("task_id", taskId)
      .order("sort_order", { ascending: true });
    const itemIds = ((bundleItems || []) as Record<string, unknown>[]).map((b) => b.id as number);
    if (itemIds.length > 0) {
      const submissionRows = assignmentIds.flatMap((aid) =>
        itemIds.map((bid) => ({
          assignment_id: aid,
          bundle_item_id: bid,
          status: "pending" as const,
        }))
      );
      await db.from("assignment_item_submissions").insert(submissionRows as never[]);
    }
  }

  // Notify each assigned user in real-time
  const title = taskTitle || String((task as Record<string, unknown>).title || "a task");
  const isIndividual = task.target_type === "individual";
  const notifs = userIds.map((userId) => ({
    user_id: userId,
    type: "task_assigned",
    title: "New Task Assigned",
    message: isIndividual
      ? `You've been assigned a new task: "${title}". Accept it to get started.`
      : `A new task is available: "${title}". Accept it to get started.`,
    link: `/tasks/${taskId}`,
    data: { task_id: taskId },
  }));
  await db.from("notifications").insert(notifs as never[]);
}

// Admin: approve a user-created task
export async function approveTask(taskId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isStaffRole(session.user.role)) {
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

    // Create assignments now that it's approved — notifies all assignees in real-time
    if (t.status === "pending") {
      await createAssignments(
        db,
        taskId,
        t as unknown as z.infer<typeof taskSchema>,
        String(t.title || "task"),
        t.created_by as string
      );
    }

    // Notify the creator (only if they're not the one approving)
    if (t.created_by !== session.user.id) {
      await db.from("notifications").insert({
        user_id: t.created_by,
        type: "task_approved",
        title: "Task Approved",
        message: `Your task "${String(t.title || "task")}" has been approved and is now live.`,
        link: `/tasks/${taskId}`,
        data: { task_id: taskId },
      } as never);
    }

    await recordAudit(db, session.user.id, "approve_task", "task", String(taskId), { title: String(t.title || "") });

    return { success: true, message: "Task approved" };
  } catch (err) {

    console.error(err);
    return { success: false, error: "Failed to approve task" };
  }
}

// Admin: reject a user-created task (refund points)
export async function rejectTask(taskId: number, reason?: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isStaffRole(session.user.role)) {
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
      await db.rpc("adjust_user_points", {
        p_user_id: t.created_by,
        p_delta: refund,
        p_action: "task_rejected",
        p_description: `Task rejected by admin - budget refunded${reason ? `: ${reason}` : ""}`,
        p_reference_type: "task",
        p_reference_id: String(taskId),
      } as never);
    }

    await recordAudit(db, session.user.id, "reject_task", "task", String(taskId), { title: String(t.title || ""), reason: reason || null });

    return { success: true, message: "Task rejected and points refunded" };
  } catch (err) {

    console.error(err);
    return { success: false, error: "Failed to reject task" };
  }
}

// Validate the editable subset of task fields. Server controls created_by,
// approval_status, points, points_spent — none of these may come from the
// client.
const taskUpdateSchema = taskSchema.partial();

export async function updateTask(
  taskId: number,
  formData: Record<string, unknown>
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const isAdmin = isStaffRole(session.user.role);

    // Verify ownership or admin
    const { data: existing } = await db.from("tasks").select("created_by, approval_status, title, points_spent").eq("id", taskId).single();
    if (!existing) return { success: false, error: "Task not found" };
    const task = existing as Record<string, unknown>;

    if (task.created_by !== session.user.id && !isAdmin) {
      return { success: false, error: "You can only edit your own tasks" };
    }

    // Validate against the editable subset. Reject anything that isn't a
    // recognised task field — `approval_status`, `created_by`, `points`,
    // `points_spent` etc. are server-controlled and must never come from
    // user input.
    const parsed = taskUpdateSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid task fields" };
    }
    const updateData: Record<string, unknown> = { ...parsed.data };

    // If the payload carries a new items[] array, we may replace the bundle
    // — but only when no assignments have been created yet (i.e., the task
    // is still in draft OR no task_assignments rows exist). Otherwise we
    // drop the items field silently so existing item-submissions don't
    // dangle pointing at items that no longer exist.
    let replaceItems: z.infer<typeof taskBundleItemSchema>[] | null = null;
    if (parsed.data.items && parsed.data.items.length > 0) {
      const { count } = await db
        .from("task_assignments")
        .select("id", { count: "exact", head: true })
        .eq("task_id", taskId);
      if ((count || 0) === 0) {
        replaceItems = parsed.data.items;
      }
    }
    delete (updateData as Record<string, unknown>).items;

    // Keep legacy mirrors in sync if items replaced.
    if (replaceItems) {
      const primary = replaceItems[0];
      const newBonus = Number(parsed.data.completion_bonus ?? 0);
      const newPerCompletion = replaceItems.reduce((s, it) => s + Number(it.points || 0), 0) + newBonus;
      updateData.task_type_id = primary.task_type_id;
      updateData.proof_type = primary.proof_type;
      updateData.task_data = primary.item_data || {};
      updateData.completion_bonus = newBonus;
      updateData.points_per_completion = newPerCompletion;
      updateData.points = newPerCompletion;
    } else {
      // Mirror createTask: keep `points` in sync with `points_per_completion`
      if (updateData.points_per_completion !== undefined) {
        updateData.points = updateData.points_per_completion;
      }
    }

    // Strip ephemeral / non-DB fields
    delete (updateData as Record<string, unknown>).target_user_email;
    delete (updateData as Record<string, unknown>).completion_bonus; // handled above when replacing items

    // Don't let a creator lower point_budget below already-spent amount —
    // would break the budget invariant for assignments already approved.
    const pointsSpent = Number(task.points_spent || 0);
    if (
      updateData.point_budget !== undefined &&
      Number(updateData.point_budget) < pointsSpent
    ) {
      return {
        success: false,
        error: `Budget cannot be lower than already-spent ${pointsSpent.toFixed(2)} points`,
      };
    }

    // If user (not admin) edits a live task, set it back to pending approval
    const needsReapproval = !isAdmin && task.approval_status === "approved";
    if (needsReapproval) {
      updateData.approval_status = "pending_approval";
    }

    const { error } = await db
      .from("tasks")
      .update(updateData as never)
      .eq("id", taskId);

    if (error) return { success: false, error: "Failed to update task" };

    // Replace bundle items in a fresh insert pass. We've already gated this
    // on "no assignments exist for this task" so there can be no dangling
    // assignment_item_submissions referring to the items we're deleting.
    if (replaceItems) {
      await db.from("task_bundle_items").delete().eq("task_id", taskId);
      const rows = replaceItems.map((it, idx) => ({
        task_id: taskId,
        task_type_id: it.task_type_id,
        sort_order: idx,
        points: it.points,
        proof_type: it.proof_type,
        item_data: it.item_data || {},
        watch_duration_sec: it.watch_duration_sec ?? null,
      }));
      const { error: replaceErr } = await db.from("task_bundle_items").insert(rows as never[]);
      if (replaceErr) {
        console.error("[updateTask] failed to replace bundle items", replaceErr);
        return { success: false, error: "Failed to update bundle items" };
      }
    }

    const taskTitle = String(task.title || "task");
    const editorName = session.user.name || "Someone";

    if (isAdmin) {
      // Admin edited — notify the creator (if not admin themselves)
      if (task.created_by !== session.user.id) {
        await db.from("notifications").insert({
          user_id: task.created_by,
          type: "system",
          title: "Task Updated by Admin",
          message: `Admin updated your task "${taskTitle}".`,
          link: `/tasks/${taskId}`,
          data: { task_id: taskId, updated_by: session.user.id },
        } as never);
      }
      return { success: true, message: "Task updated" };
    }

    // User edited their own task
    if (needsReapproval) {
      // Notify all admins that a task needs re-review
      const { data: admins } = await db.from("profiles").select("user_id").in("role", STAFF_ROLES as readonly string[]);
      const adminIds = ((admins || []) as Record<string, unknown>[]).map(a => a.user_id as string);
      if (adminIds.length > 0) {
        const notifs = adminIds.map(uid => ({
          user_id: uid,
          type: "system",
          title: "Task Updated — Review Needed",
          message: `${editorName} updated the task "${taskTitle}". Please review.`,
          link: `/tasks/${taskId}`,
          data: { task_id: taskId, updated_by: session.user.id },
        }));
        await db.from("notifications").insert(notifs as never[]);
      }
      return { success: true, message: "Task updated and sent for admin re-approval" };
    }

    return { success: true, message: "Task updated" };
  } catch (err) {

    console.error(err);
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteTask(taskId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const isAdmin = isStaffRole(session.user.role);

    // Look up the task FIRST so we can gate by ownership before doing
    // anything destructive. Previously this action let any signed-in
    // user delete any task and trigger a refund to the creator.
    const { data: task } = await db.from("tasks").select("title, created_by, point_budget, points_spent").eq("id", taskId).single();
    if (!task) return { success: false, error: "Task not found" };

    const t = task as Record<string, unknown>;
    if (t.created_by !== session.user.id && !isAdmin) {
      return { success: false, error: "You can only delete your own tasks" };
    }

    let creatorId: string | null = null;
    let taskTitle = "a task";
    {
      creatorId = (t.created_by as string) || null;
      taskTitle = String(t.title || "a task");
      const refund = Number(t.point_budget || 0) - Number(t.points_spent || 0);
      if (refund > 0) {
        await db.rpc("adjust_user_points", {
          p_user_id: t.created_by,
          p_delta: refund,
          p_action: "task_rejected",
          p_description: "Task deleted - remaining budget refunded",
          p_reference_type: "task",
          p_reference_id: String(taskId),
        } as never);
      }
    }

    await db.from("tasks").delete().eq("id", taskId);

    // Notify the creator in real-time if someone else (admin) deleted their task
    if (creatorId && creatorId !== session.user.id) {
      const deleterName = isAdmin ? "An admin" : (session.user.name || "Someone");
      await db.from("notifications").insert({
        user_id: creatorId,
        type: "system",
        title: "Task Deleted",
        message: `${deleterName} deleted your task "${taskTitle}". Any unspent budget has been refunded to your wallet.`,
        data: { task_id: taskId, deleted_by: session.user.id },
      } as never);
    }

    await recordAudit(db, session.user.id, "delete_task", "task", String(taskId), { title: taskTitle });

    return { success: true, message: "Task deleted" };
  } catch (err) {

    console.error(err);
    return { success: false, error: "Failed to delete task" };
  }
}

export async function publishTask(taskId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    const isStaff = isStaffRole(session.user.role);
    if (!isStaff) {
      const subErr = await checkActiveSubscription(db, session.user.id);
      if (subErr) return { success: false, error: subErr };
    }

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

    const isAdmin = isStaffRole(session.user.role);
    const approvalStatus = isAdmin ? "approved" : "pending_approval";

    await db.from("tasks").update({ status: "pending", approval_status: approvalStatus } as never).eq("id", taskId);
    await deductBudgetFromWallet(db, session.user.id, budget, taskId);

    if (isAdmin) {
      await createAssignments(
        db,
        taskId,
        t as unknown as Parameters<typeof createAssignments>[2],
        String(t.title || "task"),
        session.user.id
      );
    } else {
      // Notify all admins that a user-published task needs review
      const { data: admins } = await db.from("profiles").select("user_id").in("role", STAFF_ROLES as readonly string[]);
      const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
      if (adminIds.length > 0) {
        const creatorName = session.user.name || "A user";
        const notifs = adminIds.map((uid) => ({
          user_id: uid,
          type: "system",
          title: "New Task — Review Needed",
          message: `${creatorName} published a task "${String(t.title || "task")}". Please review.`,
          link: `/tasks/${taskId}`,
          data: { task_id: taskId, created_by: session.user.id },
        }));
        await db.from("notifications").insert(notifs as never[]);
      }
    }

    return { success: true, message: isAdmin ? "Task published" : "Task submitted for approval" };
  } catch (err) {

    console.error(err);
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
  // Server actions are POST endpoints — anyone with a valid action ID can
  // call them, so this function MUST self-guard. We expose task content
  // only to the creator, an assigned user, an admin, or the leader of the
  // target group.
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getServerClient();

  const { data: task } = await db
    .from("tasks")
    .select(
      "*," +
      "platforms!inner(name, slug, icon)," +
      "task_types!inner(name, slug, required_fields, proof_type, default_points)," +
      "task_bundle_items(*, task_types(name, slug, required_fields, proof_type, default_points))," +
      "users!tasks_created_by_fkey(name, email)," +
      "groups(id, name, leader_id)"
    )
    .eq("id", taskId)
    .single();

  if (!task) return null;

  // Generated Supabase types don't yet know about task_bundle_items, so the
  // joined select trips its inference. Cast via unknown so the downstream
  // code can treat the row as a generic record.
  const t = task as unknown as Record<string, unknown>;
  const isAdmin = isStaffRole(session.user.role);
  const isCreator = t.created_by === session.user.id;
  const group = t.groups as Record<string, unknown> | null;
  const isGroupLeader = !!group && group.leader_id === session.user.id;

  let isAssignee = false;
  if (!isAdmin && !isCreator && !isGroupLeader) {
    const { data: mine } = await db
      .from("task_assignments")
      .select("id")
      .eq("task_id", taskId)
      .eq("user_id", session.user.id)
      .limit(1);
    isAssignee = ((mine || []) as Record<string, unknown>[]).length > 0;
  }

  if (!isAdmin && !isCreator && !isGroupLeader && !isAssignee) return null;

  const { data: assignments } = await db
    .from("task_assignments")
    .select(
      "*," +
      "users!task_assignments_user_id_fkey(id, name, email, image)," +
      "assignment_item_submissions(*, task_bundle_items(*, task_types(name, slug)))"
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  return {
    task: t,
    assignments: (assignments || []) as unknown as Record<string, unknown>[],
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
