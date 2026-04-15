"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

const appealSchema = z.object({
  reason: z.string().min(10, "Please explain why we should unsuspend").max(2000),
  details: z.string().min(10, "Please describe what happened").max(5000),
  category: z.enum(["mistake", "accept_fault", "hacked", "other"]),
  category_other: z.string().max(500).optional().default(""),
  evidence_urls: z.array(z.string()).optional().default([]),
  accepted_terms: z.literal(true, { message: "You must accept the terms" }),
});

function isAdminRole(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

// Fast status check — polled by the client to detect live suspension / reactivation
export async function getMyStatus(): Promise<{
  authed: boolean;
  status: "active" | "suspended" | "banned" | null;
  is_approved: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) return { authed: false, status: null, is_approved: false };

  const db = getServerClient();
  const { data } = await db
    .from("profiles")
    .select("status, is_approved")
    .eq("user_id", session.user.id)
    .single();

  if (!data) return { authed: true, status: null, is_approved: true };
  const p = data as Record<string, unknown>;
  return {
    authed: true,
    status: (p.status as "active" | "suspended" | "banned") || "active",
    is_approved: p.is_approved !== false,
  };
}

// User: get latest appeal (for the suspended page to show status)
export async function getMyLatestAppeal(): Promise<Record<string, unknown> | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = getServerClient();
  const { data } = await db
    .from("suspension_appeals")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1);
  return ((data || []) as Record<string, unknown>[])[0] || null;
}

// User: submit a new appeal
export async function submitAppeal(formData: {
  reason: string;
  details: string;
  category: "mistake" | "accept_fault" | "hacked" | "other";
  category_other?: string;
  evidence_urls?: string[];
  accepted_terms: boolean;
}): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();

    // Only suspended users can submit an appeal
    const { data: profile } = await db.from("profiles").select("status").eq("user_id", session.user.id).single();
    const status = profile ? String((profile as Record<string, unknown>).status || "") : "";
    if (status !== "suspended") return { success: false, error: "Only suspended users can submit an appeal" };

    const validated = appealSchema.parse(formData);

    if (validated.category === "other" && !validated.category_other?.trim()) {
      return { success: false, error: "Please specify the category" };
    }

    // Don't allow a new appeal if one is already pending
    const { data: existing } = await db
      .from("suspension_appeals")
      .select("id, status")
      .eq("user_id", session.user.id)
      .eq("status", "pending")
      .limit(1);
    if (existing && (existing as unknown[]).length > 0) {
      return { success: false, error: "You already have an appeal pending review" };
    }

    const { error } = await db.from("suspension_appeals").insert({
      user_id: session.user.id,
      reason: validated.reason,
      details: validated.details,
      category: validated.category,
      category_other: validated.category === "other" ? validated.category_other : null,
      evidence_urls: validated.evidence_urls || [],
      accepted_terms: validated.accepted_terms,
      status: "pending",
    } as never);

    if (error) return { success: false, error: "Failed to submit appeal" };

    // Notify all admins
    const { data: admins } = await db.from("profiles").select("user_id").in("role", ["super_admin", "admin"]);
    const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
    if (adminIds.length > 0) {
      const userName = session.user.name || "A suspended user";
      const notifs = adminIds.map((uid) => ({
        user_id: uid,
        type: "system",
        title: "New Suspension Appeal",
        message: `${userName} submitted a suspension appeal. Please review.`,
        link: `/appeals`,
        data: { user_id: session.user.id },
      }));
      await db.from("notifications").insert(notifs as never[]);
    }

    return { success: true, message: "Appeal submitted — an admin will review it soon" };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Validation error" };
    }
    return { success: false, error: "Failed to submit appeal" };
  }
}

// Admin: list appeals
export async function getAppeals(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("suspension_appeals")
    .select("*, users!suspension_appeals_user_id_fkey(id, name, email, image)", { count: "exact" });

  if (params?.status) query = query.eq("status", params.status);

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

// Admin: approve (unsuspend) or reject an appeal
export async function reviewAppeal(
  appealId: number,
  action: "approve" | "reject",
  notes?: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isAdminRole(session.user.role)) return { success: false, error: "Only admins can review appeals" };

    const db = getServerClient();
    const { data: appeal } = await db
      .from("suspension_appeals")
      .select("id, user_id, status")
      .eq("id", appealId)
      .single();

    if (!appeal) return { success: false, error: "Appeal not found" };
    const a = appeal as Record<string, unknown>;
    if (a.status !== "pending") return { success: false, error: "This appeal has already been reviewed" };

    const newStatus = action === "approve" ? "approved" : "rejected";

    await db.from("suspension_appeals").update({
      status: newStatus,
      review_notes: notes || null,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never).eq("id", appealId);

    const userId = a.user_id as string;

    if (action === "approve") {
      // Reactivate user
      await db.from("profiles").update({ status: "active" } as never).eq("user_id", userId);

      await db.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Appeal Approved",
        message: "Your suspension appeal was approved. Your account has been reactivated.",
        link: "/dashboard",
        data: { appeal_id: appealId },
      } as never);

      return { success: true, message: "Appeal approved — user reactivated" };
    } else {
      await db.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Appeal Rejected",
        message: `Your suspension appeal was rejected${notes ? `: ${notes}` : "."}`,
        data: { appeal_id: appealId },
      } as never);

      return { success: true, message: "Appeal rejected" };
    }
  } catch {
    return { success: false, error: "Failed to review appeal" };
  }
}
