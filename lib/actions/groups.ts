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

// ANY user can create groups (not just admins)
export async function createGroup(formData: z.infer<typeof groupSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = groupSchema.parse(formData);
    const db = getServerClient();
    const slug = slugify(validated.name) + "-" + Date.now().toString(36);

    const { data: group, error } = await db
      .from("groups")
      .insert({
        ...validated,
        slug,
        leader_id: session.user.id,
        created_by: session.user.id,
      } as never)
      .select("id")
      .single();

    if (error || !group) return { success: false, error: "Failed to create group" };
    const groupRecord = group as Record<string, unknown>;

    await db.from("group_members").insert({
      group_id: groupRecord.id,
      user_id: session.user.id,
      role: "leader",
    } as never);

    return { success: true, data: groupRecord, message: "Group created" };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to create group" };
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
    // Only leader or admin can delete
    const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;

    if (g.leader_id !== session.user.id && !["super_admin", "admin"].includes(session.user.role)) {
      return { success: false, error: "Only the group leader or admin can delete this group" };
    }

    await db.from("groups").delete().eq("id", groupId);
    return { success: true, message: "Group deleted" };
  } catch {
    return { success: false, error: "Failed to delete group" };
  }
}

export async function getGroups(params: PaginationParams & {
  privacy?: string;
}): Promise<PaginatedResponse<Record<string, unknown>>> {
  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("groups")
    .select("*, users!groups_leader_id_fkey(id, name, image)", { count: "exact" });

  if (params.privacy) query = query.eq("privacy", params.privacy);
  if (params.search) query = query.ilike("name", `%${params.search}%`);

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getGroupById(groupId: number) {
  const db = getServerClient();

  const { data: group } = await db
    .from("groups")
    .select("*, users!groups_leader_id_fkey(id, name, image)")
    .eq("id", groupId)
    .single();

  if (!group) return null;

  const { data: members } = await db
    .from("group_members")
    .select("*, users!inner(id, name, email, image)")
    .eq("group_id", groupId)
    .order("joined_at");

  const { count: memberCount } = await db
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  return {
    group: group as Record<string, unknown>,
    members: (members || []) as Record<string, unknown>[],
    memberCount: memberCount || 0,
  };
}

export async function joinGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    const { data: group } = await db.from("groups").select("privacy, max_members").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;

    if (g.privacy !== "public") return { success: false, error: "This is a private group" };

    const { count } = await db.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", groupId);
    if ((count || 0) >= (g.max_members as number)) return { success: false, error: "Group is full" };

    const { error } = await db.from("group_members").insert({
      group_id: groupId, user_id: session.user.id, role: "member",
    } as never);

    if (error) {
      if (error.code === "23505") return { success: false, error: "Already a member" };
      return { success: false, error: "Failed to join group" };
    }
    return { success: true, message: "Joined group" };
  } catch {
    return { success: false, error: "Failed to join group" };
  }
}

export async function leaveGroup(groupId: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
    if (group && (group as Record<string, unknown>).leader_id === session.user.id) {
      return { success: false, error: "Leaders cannot leave. Transfer leadership first." };
    }

    await db.from("group_members").delete().eq("group_id", groupId).eq("user_id", session.user.id);
    return { success: true, message: "Left group" };
  } catch {
    return { success: false, error: "Failed to leave group" };
  }
}

// Add member by email - leader or admin can do this
export async function addMemberByEmail(groupId: number, email: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Check if caller is leader of this group or admin
    const { data: group } = await db.from("groups").select("leader_id, max_members").eq("id", groupId).single();
    if (!group) return { success: false, error: "Group not found" };
    const g = group as Record<string, unknown>;

    if (g.leader_id !== session.user.id && !["super_admin", "admin"].includes(session.user.role)) {
      return { success: false, error: "Only the group leader or admin can add members" };
    }

    // Check capacity
    const { count } = await db.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", groupId);
    if ((count || 0) >= Number(g.max_members)) return { success: false, error: "Group is full" };

    // Find user by email
    const { data: user } = await db.from("users").select("id").eq("email", email.trim().toLowerCase()).single();
    if (!user) return { success: false, error: `No user found with email: ${email}` };
    const userId = (user as Record<string, unknown>).id as string;

    const { error } = await db.from("group_members").insert({
      group_id: groupId, user_id: userId, role: "member",
    } as never);

    if (error) {
      if (error.code === "23505") return { success: false, error: "User is already a member" };
      return { success: false, error: "Failed to add member" };
    }
    return { success: true, message: `${email} added to group` };
  } catch {
    return { success: false, error: "Failed to add member" };
  }
}

export async function addMember(groupId: number, userId: string): Promise<ApiResponse> {
  try {
    const db = getServerClient();
    const { error } = await db.from("group_members").insert({
      group_id: groupId, user_id: userId, role: "member",
    } as never);

    if (error) {
      if (error.code === "23505") return { success: false, error: "User is already a member" };
      return { success: false, error: "Failed to add member" };
    }
    return { success: true, message: "Member added" };
  } catch {
    return { success: false, error: "Failed to add member" };
  }
}

export async function removeMember(groupId: number, userId: string): Promise<ApiResponse> {
  try {
    const db = getServerClient();
    await db.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    return { success: true, message: "Member removed" };
  } catch {
    return { success: false, error: "Failed to remove member" };
  }
}

export async function transferLeadership(groupId: number, newLeaderId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { data: group } = await db.from("groups").select("leader_id").eq("id", groupId).single();
    if (!group || (group as Record<string, unknown>).leader_id !== session.user.id) {
      return { success: false, error: "Only the current leader can transfer leadership" };
    }

    await db.from("groups").update({ leader_id: newLeaderId } as never).eq("id", groupId);
    await db.from("group_members").update({ role: "leader" } as never).eq("group_id", groupId).eq("user_id", newLeaderId);
    await db.from("group_members").update({ role: "member" } as never).eq("group_id", groupId).eq("user_id", session.user.id);

    return { success: true, message: "Leadership transferred" };
  } catch {
    return { success: false, error: "Failed to transfer leadership" };
  }
}
