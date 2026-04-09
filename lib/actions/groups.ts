"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { slugify } from "@/lib/utils";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

const groupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().default(""),
  category: z.string().optional().default("Other"),
  privacy: z.enum(["public", "private"]).default("public"),
  max_members: z.number().int().min(2).max(1000).default(50),
});

export async function createGroup(formData: z.infer<typeof groupSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = groupSchema.parse(formData);
    const db = getServerClient();
    const isAdmin = ["super_admin", "admin"].includes(session.user.role);

    // Suspended users cannot create groups
    if (!isAdmin) {
      const { data: profile } = await db.from("profiles").select("status").eq("user_id", session.user.id).single();
      if (profile && (profile as Record<string, unknown>).status === "suspended")
        return { success: false, error: "Your account is suspended" };
    }

    const slug = slugify(validated.name) + "-" + Date.now().toString(36);

    const { data: group, error } = await db
      .from("groups")
      .insert({
        ...validated,
        slug,
        leader_id: session.user.id,
        created_by: session.user.id,
        approval_status: isAdmin ? "approved" : "pending_approval",
      } as never)
      .select("id")
      .single();

    if (error || !group) return { success: false, error: "Failed to create group" };
    const groupRecord = group as Record<string, unknown>;

    await db.from("group_members").insert({
      group_id: groupRecord.id, user_id: session.user.id, role: "leader",
    } as never);

    return { success: true, data: groupRecord, message: isAdmin ? "Group created" : "Group submitted for admin approval" };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to create group" };
  }
}

// Admin: approve group
export async function approveGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    await db.from("groups").update({ approval_status: "approved" } as never).eq("id", groupId);
    return { success: true, message: "Group approved" };
  } catch {
    return { success: false, error: "Failed to approve group" };
  }
}

// Admin: reject group
export async function rejectGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    await db.from("groups").update({ approval_status: "rejected_by_admin" } as never).eq("id", groupId);
    return { success: true, message: "Group rejected" };
  } catch {
    return { success: false, error: "Failed to reject group" };
  }
}

export async function updateGroup(groupId: number, formData: Partial<z.infer<typeof groupSchema>>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();
    await db.from("groups").update(formData as never).eq("id", groupId);
    return { success: true, message: "Group updated" };
  } catch {
    return { success: false, error: "Failed to update group" };
  }
}

export async function deleteGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();
    const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    if ((group as Record<string, unknown>).leader_id !== session.user.id && !["super_admin", "admin"].includes(session.user.role))
      return { success: false, error: "Only the group leader or admin can delete" };
    await db.from("groups").delete().eq("id", groupId);
    return { success: true, message: "Group deleted" };
  } catch {
    return { success: false, error: "Failed to delete group" };
  }
}

// Only show approved groups to regular users; admins see all
export async function getGroups(params: PaginationParams & { privacy?: string; approval_status?: string }): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db.from("groups").select("*, users!groups_leader_id_fkey(id, name, image)", { count: "exact" });

  if (params.approval_status) query = query.eq("approval_status", params.approval_status);
  else query = query.eq("approval_status", "approved"); // default: only approved

  if (params.privacy) query = query.eq("privacy", params.privacy);
  if (params.search) query = query.ilike("name", `%${params.search}%`);
  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return { data: (data || []) as Record<string, unknown>[], total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}

// Admin: get groups pending approval
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

// Admin: get ALL groups for management
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
  const { count: memberCount } = await db.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", groupId);
  return { group: group as Record<string, unknown>, members: (members || []) as Record<string, unknown>[], memberCount: memberCount || 0 };
}

// Users can only see groups they are members of
export async function getMyGroups(params?: PaginationParams): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // Get group IDs where user is a member
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

// Search user by email for add-member preview (returns name + image only, no ID/email leaked)
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
    const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
    if (group && (group as Record<string, unknown>).leader_id === session.user.id) return { success: false, error: "Leaders cannot leave. Transfer leadership first." };
    await db.from("group_members").delete().eq("group_id", groupId).eq("user_id", session.user.id);
    return { success: true, message: "Left group" };
  } catch { return { success: false, error: "Failed to leave group" }; }
}

export async function addMemberByEmail(groupId: number, email: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();
    const { data: group } = await db.from("groups").select("leader_id, max_members").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;
    if (g.leader_id !== session.user.id && !["super_admin", "admin"].includes(session.user.role)) return { success: false, error: "Only group leader or admin can add members" };
    const { count } = await db.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", groupId);
    if ((count || 0) >= Number(g.max_members)) return { success: false, error: "Group is full" };
    const { data: user } = await db.from("users").select("id").eq("email", email.trim().toLowerCase()).single();
    if (!user) return { success: false, error: `No user found with email: ${email}` };
    const userId = (user as Record<string, unknown>).id as string;
    const { error } = await db.from("group_members").insert({ group_id: groupId, user_id: userId, role: "member" } as never);
    if (error) { if (error.code === "23505") return { success: false, error: "Already a member" }; return { success: false, error: "Failed to add member" }; }
    return { success: true, message: `${email} added to group` };
  } catch { return { success: false, error: "Failed to add member" }; }
}

export async function addMember(groupId: number, userId: string): Promise<ApiResponse> {
  try {
    const db = getServerClient();
    const { error } = await db.from("group_members").insert({ group_id: groupId, user_id: userId, role: "member" } as never);
    if (error) { if (error.code === "23505") return { success: false, error: "Already a member" }; return { success: false, error: "Failed to add member" }; }
    return { success: true, message: "Member added" };
  } catch { return { success: false, error: "Failed to add member" }; }
}

export async function removeMember(groupId: number, userId: string): Promise<ApiResponse> {
  try { const db = getServerClient(); await db.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId); return { success: true, message: "Member removed" }; }
  catch { return { success: false, error: "Failed to remove member" }; }
}

export async function transferLeadership(groupId: number, newLeaderId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const db = getServerClient();
    const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
    if (!group || (group as Record<string, unknown>).leader_id !== session.user.id) return { success: false, error: "Only the current leader can transfer leadership" };
    await db.from("groups").update({ leader_id: newLeaderId } as never).eq("id", groupId);
    await db.from("group_members").update({ role: "leader" } as never).eq("group_id", groupId).eq("user_id", newLeaderId);
    await db.from("group_members").update({ role: "member" } as never).eq("group_id", groupId).eq("user_id", session.user.id);
    return { success: true, message: "Leadership transferred" };
  } catch { return { success: false, error: "Failed to transfer leadership" }; }
}

// Group stats
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

  return {
    totalMembers: ids.length,
    totalTasks: tasksResult.count || 0,
    completedTasks: completedResult.count || 0,
    totalPoints,
  };
}

// Group leaderboard
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
