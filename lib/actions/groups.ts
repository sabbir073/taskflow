"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { slugify } from "@/lib/utils";
import { checkActiveSubscription, checkQuota } from "@/lib/subscription-check";
import { recordAudit } from "@/lib/audit";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

type DB = ReturnType<typeof getServerClient>;

const groupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().default(""),
  rules: z.string().max(5000).optional().default(""),
  category: z.string().optional().default("Other"),
  privacy: z.enum(["public", "private"]).default("public"),
  max_members: z.number().int().min(2).max(1000).default(50),
  avatar_url: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
});

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

async function getAdminIds(db: DB): Promise<string[]> {
  const { data } = await db.from("profiles").select("user_id").in("role", ["super_admin", "admin"]);
  return ((data || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
}

async function notifyAdmins(
  db: DB,
  title: string,
  message: string,
  link: string,
  data: Record<string, unknown> = {}
) {
  const adminIds = await getAdminIds(db);
  if (adminIds.length === 0) return;
  const notifs = adminIds.map((uid) => ({
    user_id: uid,
    type: "system",
    title,
    message,
    link,
    data,
  }));
  await db.from("notifications").insert(notifs as never[]);
}

async function notifyUsers(
  db: DB,
  userIds: string[],
  type: string,
  title: string,
  message: string,
  link: string | null,
  data: Record<string, unknown> = {}
) {
  if (userIds.length === 0) return;
  const notifs = userIds.map((uid) => ({
    user_id: uid,
    type,
    title,
    message,
    link,
    data,
  }));
  await db.from("notifications").insert(notifs as never[]);
}

async function getGroupMemberIds(db: DB, groupId: number): Promise<string[]> {
  const { data } = await db.from("group_members").select("user_id").eq("group_id", groupId);
  return ((data || []) as Record<string, unknown>[]).map((m) => m.user_id as string);
}

// ============================================================================
// CREATE
// ============================================================================
export async function createGroup(formData: z.infer<typeof groupSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = groupSchema.parse(formData);
    const db = getServerClient();
    const admin = isAdmin(session.user.role);

    if (!admin) {
      const { data: profile } = await db.from("profiles").select("status").eq("user_id", session.user.id).single();
      if (profile && (profile as Record<string, unknown>).status === "suspended")
        return { success: false, error: "Your account is suspended" };

      const subErr = await checkActiveSubscription(db, session.user.id);
      if (subErr) return { success: false, error: subErr };

      const quotaErr = await checkQuota(db, session.user.id, session.user.role, "group");
      if (quotaErr) return { success: false, error: quotaErr };
    }

    const slug = slugify(validated.name) + "-" + Date.now().toString(36);

    const { data: group, error } = await db
      .from("groups")
      .insert({
        name: validated.name,
        description: validated.description,
        rules: validated.rules || null,
        category: validated.category,
        privacy: validated.privacy,
        max_members: validated.max_members,
        avatar_url: validated.avatar_url || null,
        cover_url: validated.cover_url || null,
        slug,
        leader_id: session.user.id,
        created_by: session.user.id,
        approval_status: admin ? "approved" : "pending_approval",
        status: "active",
      } as never)
      .select("id")
      .single();

    if (error || !group) return { success: false, error: "Failed to create group" };
    const groupRecord = group as Record<string, unknown>;
    const groupId = groupRecord.id as number;

    await db.from("group_members").insert({
      group_id: groupId,
      user_id: session.user.id,
      role: "leader",
    } as never);

    if (admin) {
      // Admin creates → self notification is skipped
    } else {
      const creatorName = session.user.name || "A user";
      await notifyAdmins(
        db,
        "New Group — Review Needed",
        `${creatorName} created a group "${validated.name}". Please review.`,
        `/groups/${groupId}`,
        { group_id: groupId, created_by: session.user.id }
      );
    }

    return {
      success: true,
      data: groupRecord,
      message: admin ? "Group created" : "Group submitted for admin approval",
    };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to create group" };
  }
}

// ============================================================================
// APPROVE / REJECT
// ============================================================================
export async function approveGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { data: group } = await db.from("groups").select("id, name, leader_id").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;

    await db.from("groups").update({ approval_status: "approved" } as never).eq("id", groupId);

    const groupName = String(g.name || "group");
    const leaderId = g.leader_id as string;

    // Notify leader
    if (leaderId !== session.user.id) {
      await notifyUsers(
        db,
        [leaderId],
        "system",
        "Group Approved",
        `Your group "${groupName}" has been approved.`,
        `/groups/${groupId}`,
        { group_id: groupId }
      );
    }

    // Notify all members that they're now in an active group
    const memberIds = await getGroupMemberIds(db, groupId);
    const toNotify = memberIds.filter((id) => id !== leaderId && id !== session.user.id);
    if (toNotify.length > 0) {
      await notifyUsers(
        db,
        toNotify,
        "group_joined",
        "Added to Group",
        `You were added to "${groupName}".`,
        `/groups/${groupId}`,
        { group_id: groupId }
      );
    }

    await recordAudit(db, session.user.id, "approve_group", "group", String(groupId), { name: groupName });

    return { success: true, message: "Group approved" };
  } catch {
    return { success: false, error: "Failed to approve group" };
  }
}

export async function rejectGroup(groupId: number, reason?: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { data: group } = await db.from("groups").select("id, name, leader_id").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;

    await db.from("groups").update({ approval_status: "rejected_by_admin" } as never).eq("id", groupId);

    const leaderId = g.leader_id as string;
    if (leaderId !== session.user.id) {
      await notifyUsers(
        db,
        [leaderId],
        "system",
        "Group Rejected",
        `Your group "${String(g.name || "")}" was rejected${reason ? `: ${reason}` : "."}`,
        `/groups/${groupId}`,
        { group_id: groupId, reason }
      );
    }

    await recordAudit(db, session.user.id, "reject_group", "group", String(groupId), { name: String(g.name || ""), reason: reason || null });

    return { success: true, message: "Group rejected" };
  } catch {
    return { success: false, error: "Failed to reject group" };
  }
}

// ============================================================================
// UPDATE
// ============================================================================
export async function updateGroup(
  groupId: number,
  formData: Partial<z.infer<typeof groupSchema>>
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();
    const admin = isAdmin(session.user.role);

    const { data: existing } = await db
      .from("groups")
      .select("name, leader_id, approval_status")
      .eq("id", groupId)
      .single();
    if (!existing) return { success: false, error: "Group not found" };
    const group = existing as Record<string, unknown>;

    if (group.leader_id !== session.user.id && !admin) {
      return { success: false, error: "Only the group leader or admin can edit" };
    }

    if (!admin) {
      const subErr = await checkActiveSubscription(db, session.user.id);
      if (subErr) return { success: false, error: subErr };
    }

    const update: Record<string, unknown> = { ...formData, updated_at: new Date().toISOString() };

    // Leader editing an approved group → flip back to pending
    const needsReapproval = !admin && group.approval_status === "approved";
    if (needsReapproval) update.approval_status = "pending_approval";

    const { error } = await db.from("groups").update(update as never).eq("id", groupId);
    if (error) return { success: false, error: "Failed to update group" };

    const groupName = String(formData.name || group.name || "group");
    const editorName = session.user.name || "Someone";

    if (admin) {
      // Admin edited — notify leader + members
      const memberIds = await getGroupMemberIds(db, groupId);
      const toNotify = memberIds.filter((id) => id !== session.user.id);
      if (toNotify.length > 0) {
        await notifyUsers(
          db,
          toNotify,
          "system",
          "Group Updated",
          `An admin updated the group "${groupName}".`,
          `/groups/${groupId}`,
          { group_id: groupId }
        );
      }
      return { success: true, message: "Group updated" };
    }

    if (needsReapproval) {
      await notifyAdmins(
        db,
        "Group Updated — Review Needed",
        `${editorName} updated the group "${groupName}". Please review.`,
        `/groups/${groupId}`,
        { group_id: groupId, updated_by: session.user.id }
      );
      return { success: true, message: "Group updated and sent for admin re-approval" };
    }

    return { success: true, message: "Group updated" };
  } catch {
    return { success: false, error: "Failed to update group" };
  }
}

// ============================================================================
// SUSPEND / UNSUSPEND (admin only)
// ============================================================================
export async function suspendGroup(groupId: number, reason?: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { data: group } = await db.from("groups").select("name, leader_id").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;

    await db.from("groups").update({ status: "suspended", updated_at: new Date().toISOString() } as never).eq("id", groupId);

    const memberIds = await getGroupMemberIds(db, groupId);
    await notifyUsers(
      db,
      memberIds.filter((id) => id !== session.user.id),
      "system",
      "Group Suspended",
      `The group "${String(g.name || "")}" has been suspended${reason ? `: ${reason}` : "."}`,
      `/groups/${groupId}`,
      { group_id: groupId, reason }
    );

    return { success: true, message: "Group suspended" };
  } catch {
    return { success: false, error: "Failed to suspend group" };
  }
}

export async function unsuspendGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { data: group } = await db.from("groups").select("name").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };

    await db.from("groups").update({ status: "active", updated_at: new Date().toISOString() } as never).eq("id", groupId);

    const memberIds = await getGroupMemberIds(db, groupId);
    await notifyUsers(
      db,
      memberIds.filter((id) => id !== session.user.id),
      "system",
      "Group Reactivated",
      `The group "${String((group as Record<string, unknown>).name || "")}" is active again.`,
      `/groups/${groupId}`,
      { group_id: groupId }
    );

    return { success: true, message: "Group reactivated" };
  } catch {
    return { success: false, error: "Failed to unsuspend group" };
  }
}

// ============================================================================
// DELETION (admin deletes directly; leaders must request)
// ============================================================================
export async function deleteGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isAdmin(session.user.role)) return { success: false, error: "Only admins can delete groups" };

    const db = getServerClient();
    const { data: group } = await db.from("groups").select("id, name, leader_id").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;

    const memberIds = await getGroupMemberIds(db, groupId);

    await db.from("groups").delete().eq("id", groupId);

    // Notify leader + members (exclude the admin who clicked)
    const targets = memberIds.filter((id) => id !== session.user.id);
    if (targets.length > 0) {
      await notifyUsers(
        db,
        targets,
        "system",
        "Group Deleted",
        `The group "${String(g.name || "")}" was deleted by an admin.`,
        null,
        { group_id: groupId }
      );
    }

    await recordAudit(db, session.user.id, "delete_group", "group", String(groupId), { name: String(g.name || "") });

    return { success: true, message: "Group deleted" };
  } catch {
    return { success: false, error: "Failed to delete group" };
  }
}

// Leader-only: request deletion → admin is notified
export async function requestGroupDeletion(groupId: number, reason?: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();

    const { data: group } = await db.from("groups").select("id, name, leader_id, deletion_requested").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;

    if (g.leader_id !== session.user.id && !isAdmin(session.user.role)) {
      return { success: false, error: "Only the group leader can request deletion" };
    }

    if (g.deletion_requested === true) {
      return { success: false, error: "A deletion request is already pending" };
    }

    await db.from("groups").update({
      deletion_requested: true,
      deletion_request_reason: reason || null,
      deletion_requested_at: new Date().toISOString(),
      deletion_requested_by: session.user.id,
      updated_at: new Date().toISOString(),
    } as never).eq("id", groupId);

    const requesterName = session.user.name || "A user";
    await notifyAdmins(
      db,
      "Group Deletion Requested",
      `${requesterName} requested deletion of "${String(g.name || "")}"${reason ? `: ${reason}` : "."}`,
      `/groups/${groupId}`,
      { group_id: groupId, requested_by: session.user.id, reason }
    );

    return { success: true, message: "Deletion request sent to admins" };
  } catch {
    return { success: false, error: "Failed to request deletion" };
  }
}

export async function cancelDeletionRequest(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();

    const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    if ((group as Record<string, unknown>).leader_id !== session.user.id && !isAdmin(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    await db.from("groups").update({
      deletion_requested: false,
      deletion_request_reason: null,
      deletion_requested_at: null,
      deletion_requested_by: null,
      updated_at: new Date().toISOString(),
    } as never).eq("id", groupId);

    return { success: true, message: "Deletion request canceled" };
  } catch {
    return { success: false, error: "Failed to cancel request" };
  }
}

// ============================================================================
// LISTS
// ============================================================================
export async function getGroups(params: PaginationParams & { privacy?: string; approval_status?: string }): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db.from("groups").select("*, users!groups_leader_id_fkey(id, name, image)", { count: "exact" });

  if (params.approval_status) query = query.eq("approval_status", params.approval_status);
  else query = query.eq("approval_status", "approved");

  if (params.privacy) query = query.eq("privacy", params.privacy);
  if (params.search) query = query.ilike("name", `%${params.search}%`);
  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}

export async function getPendingApprovalGroups(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("groups")
    .select("*, users!groups_leader_id_fkey(id, name, email, image)", { count: "exact" })
    .eq("approval_status", "pending_approval")
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}

export async function getAllGroups(params: PaginationParams & { approval_status?: string }): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db.from("groups").select("*, users!groups_leader_id_fkey(id, name, email, image)", { count: "exact" });
  if (params.approval_status) query = query.eq("approval_status", params.approval_status);
  if (params.search) query = query.ilike("name", `%${params.search}%`);
  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}

export async function getGroupById(groupId: number) {
  const db = getServerClient();
  const { data: group } = await db.from("groups").select("*, users!groups_leader_id_fkey(id, name, image)").eq("id", groupId).single();
  if (!group) return null;
  const { data: members } = await db.from("group_members").select("*, users!inner(id, name, email, image)").eq("group_id", groupId).order("joined_at");
  const memberList = (members || []) as Record<string, unknown>[];

  // Attach each member's current account status (active / suspended / banned)
  if (memberList.length > 0) {
    const userIds = memberList.map((m) => m.user_id as string);
    const { data: profiles } = await db.from("profiles").select("user_id, status").in("user_id", userIds);
    const statusById = new Map<string, string>();
    for (const p of (profiles || []) as Record<string, unknown>[]) {
      statusById.set(p.user_id as string, String(p.status || "active"));
    }
    for (const m of memberList) {
      m.user_status = statusById.get(m.user_id as string) || "active";
    }
  }

  const { count: memberCount } = await db.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", groupId);
  return { group: group as Record<string, unknown>, members: memberList, memberCount: memberCount || 0 };
}

export async function getMyGroups(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data: memberships } = await db.from("group_members").select("group_id").eq("user_id", session.user.id);
  const groupIds = ((memberships || []) as Record<string, unknown>[]).map(m => m.group_id as number);

  if (groupIds.length === 0) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  let query = db.from("groups").select("*, users!groups_leader_id_fkey(id, name, image)", { count: "exact" })
    .in("id", groupIds);
  if (params?.search) query = query.ilike("name", `%${params.search}%`);
  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}

// Only approved + active groups I'm a member of — used as the task-assignment target list
export async function getAssignableGroups(): Promise<Record<string, unknown>[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = getServerClient();
  const { data: memberships } = await db.from("group_members").select("group_id").eq("user_id", session.user.id);
  const groupIds = ((memberships || []) as Record<string, unknown>[]).map((m) => m.group_id as number);
  if (groupIds.length === 0) return [];

  const { data } = await db
    .from("groups")
    .select("id, name, approval_status, status")
    .in("id", groupIds)
    .eq("approval_status", "approved")
    .eq("status", "active")
    .order("name");
  return (data || []) as Record<string, unknown>[];
}

// ============================================================================
// MEMBER SEARCH / ADD / REMOVE
// ============================================================================
export async function searchUserByEmail(email: string): Promise<{ exists: boolean; name?: string; image?: string | null }> {
  const db = getServerClient();
  const { data } = await db.from("users").select("name, image").eq("email", email.trim().toLowerCase()).single();
  if (!data) return { exists: false };
  const user = data as Record<string, unknown>;
  return { exists: true, name: String(user.name || ""), image: user.image as string | null };
}

export async function leaveGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();
    const { data: group } = await db.from("groups").select("leader_id, name").eq("id", groupId).single();
    if (group && (group as Record<string, unknown>).leader_id === session.user.id)
      return { success: false, error: "Leaders cannot leave. Transfer leadership first." };
    await db.from("group_members").delete().eq("group_id", groupId).eq("user_id", session.user.id);
    return { success: true, message: "Left group" };
  } catch { return { success: false, error: "Failed to leave group" }; }
}

export async function addMemberByEmail(groupId: number, email: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();

    const { data: group } = await db.from("groups").select("name, leader_id, max_members, approval_status").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;
    if (g.leader_id !== session.user.id && !isAdmin(session.user.role))
      return { success: false, error: "Only group leader or admin can add members" };

    const { count } = await db.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", groupId);
    if ((count || 0) >= Number(g.max_members)) return { success: false, error: "Group is full" };

    const { data: user } = await db.from("users").select("id, name").eq("email", email.trim().toLowerCase()).single();
    if (!user) return { success: false, error: `No user found with email: ${email}` };
    const u = user as Record<string, unknown>;
    const userId = u.id as string;

    const { error } = await db.from("group_members").insert({ group_id: groupId, user_id: userId, role: "member" } as never);
    if (error) {
      if (error.code === "23505") return { success: false, error: "Already a member" };
      return { success: false, error: "Failed to add member" };
    }

    // Always notify the added user. Message wording differs based on whether
    // the group is approved yet, so the added member knows what to expect.
    const isApproved = g.approval_status === "approved";
    await notifyUsers(
      db,
      [userId],
      "group_joined",
      isApproved ? "Added to Group" : "Added to Group — Awaiting Approval",
      isApproved
        ? `You were added to "${String(g.name || "")}".`
        : `You were added to "${String(g.name || "")}". The group is awaiting admin approval — you'll be able to access it once approved.`,
      `/groups/${groupId}`,
      { group_id: groupId }
    );

    return { success: true, message: `${email} added to group` };
  } catch { return { success: false, error: "Failed to add member" }; }
}

export async function addMember(groupId: number, userId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Same authorization + capacity checks as addMemberByEmail — this path
    // was previously wide open to any authenticated caller which let a user
    // force-join themselves (or anyone else) into any group.
    const { data: group } = await db
      .from("groups")
      .select("leader_id, max_members")
      .eq("id", groupId)
      .single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;
    if (g.leader_id !== session.user.id && !isAdmin(session.user.role)) {
      return { success: false, error: "Only group leader or admin can add members" };
    }

    const { count } = await db
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId);
    if ((count || 0) >= Number(g.max_members || 0)) {
      return { success: false, error: "Group is full" };
    }

    const { error } = await db.from("group_members").insert({ group_id: groupId, user_id: userId, role: "member" } as never);
    if (error) { if (error.code === "23505") return { success: false, error: "Already a member" }; return { success: false, error: "Failed to add member" }; }
    return { success: true, message: "Member added" };
  } catch { return { success: false, error: "Failed to add member" }; }
}

export async function removeMember(groupId: number, userId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { data: group } = await db.from("groups").select("name, leader_id").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;
    if (g.leader_id !== session.user.id && !isAdmin(session.user.role))
      return { success: false, error: "Only group leader or admin can remove members" };

    await db.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);

    await notifyUsers(
      db,
      [userId],
      "system",
      "Removed from Group",
      `You were removed from the group "${String(g.name || "")}".`,
      null,
      { group_id: groupId }
    );

    return { success: true, message: "Member removed" };
  } catch { return { success: false, error: "Failed to remove member" }; }
}

export async function transferLeadership(groupId: number, newLeaderId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();
    const { data: group } = await db.from("groups").select("leader_id, name").eq("id", groupId).single();
    if (!group || ((group as Record<string, unknown>).leader_id !== session.user.id && !isAdmin(session.user.role)))
      return { success: false, error: "Only the current leader or admin can transfer leadership" };
    const oldLeaderId = (group as Record<string, unknown>).leader_id as string;
    await db.from("groups").update({ leader_id: newLeaderId } as never).eq("id", groupId);
    await db.from("group_members").update({ role: "leader" } as never).eq("group_id", groupId).eq("user_id", newLeaderId);
    if (oldLeaderId !== newLeaderId) {
      await db.from("group_members").update({ role: "member" } as never).eq("group_id", groupId).eq("user_id", oldLeaderId);
    }

    await notifyUsers(
      db,
      [newLeaderId],
      "system",
      "You are now a Group Leader",
      `You were made the leader of "${String((group as Record<string, unknown>).name || "")}".`,
      `/groups/${groupId}`,
      { group_id: groupId }
    );

    return { success: true, message: "Leadership transferred" };
  } catch { return { success: false, error: "Failed to transfer leadership" }; }
}

// ============================================================================
// GROUP-SCOPED TASKS + SUBMISSIONS VIEW
// ============================================================================
// Returns all tasks assigned to this group along with per-assignment status.
// Visible to admins + group leader only (submissions detail).
export async function getGroupTasks(groupId: number): Promise<Record<string, unknown>[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = getServerClient();

  // Auth: admin or group leader
  const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
  if (!group) return [];
  const leaderId = (group as Record<string, unknown>).leader_id as string;
  const admin = isAdmin(session.user.role);
  const isLeader = session.user.id === leaderId;
  if (!admin && !isLeader) return [];

  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, description, points_per_completion, priority, deadline, status, approval_status, platform_id, task_type_id, platforms!inner(name, slug, icon), task_types!inner(name, slug)")
    .eq("target_type", "group")
    .eq("target_group_id", groupId)
    .order("created_at", { ascending: false });

  const taskList = (tasks || []) as Record<string, unknown>[];
  if (taskList.length === 0) return [];

  const taskIds = taskList.map((t) => t.id as number);

  const { data: assignments } = await db
    .from("task_assignments")
    .select("id, task_id, user_id, status, submitted_at, reviewed_at, points_awarded, users!task_assignments_user_id_fkey(id, name, email, image)")
    .in("task_id", taskIds);

  const byTask = new Map<number, Record<string, unknown>[]>();
  for (const a of (assignments || []) as Record<string, unknown>[]) {
    const tid = a.task_id as number;
    if (!byTask.has(tid)) byTask.set(tid, []);
    byTask.get(tid)!.push(a);
  }

  return taskList.map((t) => ({ ...t, assignments: byTask.get(t.id as number) || [] }));
}

// Notify a pending / in-progress user to submit their proof
export async function notifyAssignmentToSubmit(assignmentId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();

    const { data: assignment } = await db
      .from("task_assignments")
      .select("id, user_id, status, task_id, tasks!inner(title, target_type, target_group_id, created_by)")
      .eq("id", assignmentId)
      .single();
    if (!assignment) return { success: false, error: "Assignment not found" };
    const a = assignment as Record<string, unknown>;
    const task = a.tasks as Record<string, unknown> | undefined;
    if (!task) return { success: false, error: "Task not found" };

    // Admins, the task creator, and group leaders (for group tasks) can nudge
    let allowed = isAdmin(session.user.role);
    if (!allowed && task.created_by === session.user.id) allowed = true;
    if (!allowed) {
      const groupId = task.target_group_id as number | null;
      if (groupId) {
        const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
        if (group && (group as Record<string, unknown>).leader_id === session.user.id) allowed = true;
      }
    }
    if (!allowed) return { success: false, error: "Unauthorized" };

    if (!["pending", "in_progress", "rejected"].includes(String(a.status || ""))) {
      return { success: false, error: "This assignment is already submitted or completed" };
    }

    const title = String(task.title || "task");
    await notifyUsers(
      db,
      [a.user_id as string],
      "task_assigned",
      "Reminder: Submit Proof",
      `Please submit your proof for the task "${title}".`,
      `/tasks/${a.task_id}`,
      { assignment_id: assignmentId, task_id: a.task_id }
    );

    return { success: true, message: "Reminder sent" };
  } catch {
    return { success: false, error: "Failed to send reminder" };
  }
}

// ============================================================================
// STATS / LEADERBOARD (unchanged)
// ============================================================================
export async function getGroupStats(groupId: number) {
  const db = getServerClient();
  const { data: memberIds } = await db.from("group_members").select("user_id").eq("group_id", groupId);
  const ids = ((memberIds || []) as Record<string, unknown>[]).map(m => m.user_id as string);
  if (ids.length === 0) return { totalMembers: 0, totalTasks: 0, completedTasks: 0, totalPoints: 0 };

  const [tasksResult, completedResult, pointsResult] = await Promise.all([
    db.from("task_assignments").select("id", { count: "exact", head: true }).in("user_id", ids),
    db.from("task_assignments").select("id", { count: "exact", head: true }).in("user_id", ids).eq("status", "approved"),
    db.from("profiles").select("total_points").in("user_id", ids),
  ]);

  const totalPoints = ((pointsResult.data || []) as Record<string, unknown>[]).reduce((sum, p) => sum + Number(p.total_points || 0), 0);
  return { totalMembers: ids.length, totalTasks: tasksResult.count || 0, completedTasks: completedResult.count || 0, totalPoints };
}

export async function getGroupLeaderboard(groupId: number) {
  const db = getServerClient();
  const { data: memberIds } = await db.from("group_members").select("user_id").eq("group_id", groupId);
  const ids = ((memberIds || []) as Record<string, unknown>[]).map(m => m.user_id as string);
  if (ids.length === 0) return [];

  const { data } = await db
    .from("profiles")
    .select("user_id, total_points, tasks_completed, current_streak, users!inner(name, image)")
    .in("user_id", ids)
    .order("total_points", { ascending: false });

  return ((data || []) as Record<string, unknown>[]).map((row, i) => {
    const user = row.users as Record<string, unknown>;
    return {
      rank: i + 1,
      user_id: String(row.user_id),
      name: String(user?.name || "Unknown"),
      image: user?.image as string | null,
      total_points: Number(row.total_points || 0),
      tasks_completed: Number(row.tasks_completed || 0),
      current_streak: Number(row.current_streak || 0),
    };
  });
}

// ============================================================================
// LEADERSHIP HANDOFF
// ============================================================================
// Called when a leader is demoted, suspended, banned, or deleted. For each
// group that the user leads, either promote the earliest-joined member to
// leader, or archive the group if no other members exist. Notifies everyone
// involved and records the handoff. Silent if the user leads no groups.
export async function handleLeaderRemoval(userId: string, reason: string): Promise<void> {
  try {
    const db = getServerClient();

    const { data: owned } = await db
      .from("groups")
      .select("id, name")
      .eq("leader_id", userId);

    const groups = (owned || []) as Record<string, unknown>[];
    if (groups.length === 0) return;

    for (const g of groups) {
      const gid = g.id as number;
      const gname = String(g.name || "group");

      // Earliest-joined member who is NOT the outgoing leader
      const { data: mem } = await db
        .from("group_members")
        .select("user_id, joined_at")
        .eq("group_id", gid)
        .neq("user_id", userId)
        .order("joined_at", { ascending: true })
        .limit(1);

      const successor = ((mem || []) as Record<string, unknown>[])[0] || null;

      if (successor) {
        const newLeaderId = String(successor.user_id);
        await db.from("groups").update({ leader_id: newLeaderId } as never).eq("id", gid);
        await db
          .from("group_members")
          .update({ role: "leader" } as never)
          .eq("group_id", gid)
          .eq("user_id", newLeaderId);

        // Notify the new leader + all other members
        const memberIds = await getGroupMemberIds(db, gid);
        await notifyUsers(
          db,
          memberIds.filter((id) => id !== userId),
          "system",
          "New Group Leader",
          `${gname}: leadership transferred (${reason}).`,
          `/groups/${gid}`,
          { group_id: gid, new_leader_id: newLeaderId, reason }
        );
      } else {
        // No other members — archive the group so it doesn't sit orphaned.
        await db
          .from("groups")
          .update({ approval_status: "rejected_by_admin" } as never)
          .eq("id", gid);
      }
    }
  } catch {
    // Silent — this runs as a side-effect of role changes; never block the
    // originating action if the handoff logic fails.
  }
}
