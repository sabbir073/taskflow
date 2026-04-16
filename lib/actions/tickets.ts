"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

type DB = ReturnType<typeof getServerClient>;

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

const TICKET_CATEGORIES = ["general", "billing", "technical", "account", "feature_request", "other"] as const;

const createTicketSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
  category: z.enum(TICKET_CATEGORIES).default("general"),
});

// ============================================================================
// ACCESS CHECK — reads user's active plan's support_ticket_access field
// ============================================================================
// Returns 'none' | 'medium' | 'high'. Admins always get 'high'.
export async function getMyTicketAccess(): Promise<{
  access: "none" | "medium" | "high";
  planName: string | null;
}> {
  const session = await auth();
  if (!session?.user?.id) return { access: "none", planName: null };

  if (isAdmin(session.user.role)) return { access: "high", planName: "Admin" };

  const db = getServerClient();

  // Check if subscriptions are even required
  const { data: setting } = await db.from("settings").select("value").eq("key", "require_subscription").single();
  const raw = setting ? (setting as Record<string, unknown>).value : false;
  const subRequired = raw === true || raw === "true";

  if (!subRequired) {
    // When subs aren't required, everyone gets the highest plan's access
    const { data: topPlan } = await db
      .from("plans")
      .select("support_ticket_access, name")
      .eq("is_active", true)
      .order("price", { ascending: false })
      .limit(1);
    const top = ((topPlan || []) as Record<string, unknown>[])[0];
    return {
      access: (String(top?.support_ticket_access || "none") as "none" | "medium" | "high"),
      planName: top ? String(top.name || "") : null,
    };
  }

  // Find user's active (non-expired) subscription's plan
  const { data: subs } = await db
    .from("user_subscriptions")
    .select("expires_at, plans!inner(name, support_ticket_access)")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = ((subs || []) as Record<string, unknown>[])[0] || null;
  if (!sub) return { access: "none", planName: null };

  const expiresAt = sub.expires_at as string | null;
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return { access: "none", planName: null };
  }

  const plan = sub.plans as Record<string, unknown> | undefined;
  return {
    access: (String(plan?.support_ticket_access || "none") as "none" | "medium" | "high"),
    planName: plan ? String(plan.name || "") : null,
  };
}

// ============================================================================
// USER: Create ticket
// ============================================================================
export async function createTicket(formData: z.infer<typeof createTicketSchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const db = getServerClient();
    const { access } = await getMyTicketAccess();
    if (access === "none") return { success: false, error: "Your plan does not include support tickets" };

    const validated = createTicketSchema.parse(formData);

    // Priority is set by plan — non-changeable by user
    const priority = access === "high" ? "high" : "medium";

    const { data: ticket, error } = await db.from("support_tickets").insert({
      user_id: session.user.id,
      subject: validated.subject,
      description: validated.description,
      category: validated.category,
      priority,
      status: "open",
    } as never).select("id").single();

    if (error || !ticket) return { success: false, error: "Failed to create ticket" };

    // Notify admins
    const { data: admins } = await db.from("profiles").select("user_id").in("role", ["super_admin", "admin"]);
    const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
    if (adminIds.length > 0) {
      const userName = session.user.name || "A user";
      const notifs = adminIds.map((uid) => ({
        user_id: uid,
        type: "system",
        title: `New Support Ticket [${priority.toUpperCase()}]`,
        message: `${userName} submitted: "${validated.subject}"`,
        link: `/support/${(ticket as Record<string, unknown>).id}`,
        data: { ticket_id: (ticket as Record<string, unknown>).id },
      }));
      await db.from("notifications").insert(notifs as never[]);
    }

    return { success: true, data: ticket as Record<string, unknown>, message: "Ticket created — we'll get back to you soon" };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to create ticket" };
  }
}

// ============================================================================
// USER: List my tickets
// ============================================================================
export async function getMyTickets(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("support_tickets")
    .select("*", { count: "exact" })
    .eq("user_id", session.user.id);

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

// ============================================================================
// USER/ADMIN: Get single ticket + messages
// ============================================================================
export async function getTicketById(ticketId: number) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getServerClient();
  const { data: ticket } = await db
    .from("support_tickets")
    .select("*, users!support_tickets_user_id_fkey(id, name, email, image)")
    .eq("id", ticketId)
    .single();

  if (!ticket) return null;
  const t = ticket as Record<string, unknown>;

  // Non-admin can only see their own
  if (!isAdmin(session.user.role) && t.user_id !== session.user.id) return null;

  const { data: messages } = await db
    .from("ticket_messages")
    .select("*, users!ticket_messages_user_id_fkey(id, name, image)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return {
    ticket: t,
    messages: (messages || []) as Record<string, unknown>[],
  };
}

// ============================================================================
// USER/ADMIN: Reply to ticket
// ============================================================================
export async function replyToTicket(
  ticketId: number,
  message: string,
  attachments?: string[]
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (!message.trim()) return { success: false, error: "Message cannot be empty" };

    const db = getServerClient();
    const { data: ticket } = await db
      .from("support_tickets")
      .select("user_id, subject, status")
      .eq("id", ticketId)
      .single();
    if (!ticket) return { success: false, error: "Ticket not found" };
    const t = ticket as Record<string, unknown>;

    const admin = isAdmin(session.user.role);
    if (!admin && t.user_id !== session.user.id) return { success: false, error: "Unauthorized" };

    if (t.status === "closed") return { success: false, error: "This ticket is closed" };

    await db.from("ticket_messages").insert({
      ticket_id: ticketId,
      user_id: session.user.id,
      message: message.trim(),
      attachments: attachments || [],
      is_admin_reply: admin,
    } as never);

    // If admin replies, set status to in_progress (if it was open)
    if (admin && t.status === "open") {
      await db.from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() } as never).eq("id", ticketId);
    }

    // Update ticket timestamp
    await db.from("support_tickets").update({ updated_at: new Date().toISOString() } as never).eq("id", ticketId);

    // Notify the other party
    const targetUserId = admin ? (t.user_id as string) : null;
    if (admin && targetUserId) {
      await db.from("notifications").insert({
        user_id: targetUserId,
        type: "system",
        title: "Support Reply",
        message: `An admin replied to your ticket: "${String(t.subject || "")}"`,
        link: `/support/${ticketId}`,
        data: { ticket_id: ticketId },
      } as never);
    } else if (!admin) {
      // Notify admins that user replied
      const { data: admins } = await db.from("profiles").select("user_id").in("role", ["super_admin", "admin"]);
      const adminIds = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
      if (adminIds.length > 0) {
        const notifs = adminIds.map((uid) => ({
          user_id: uid,
          type: "system",
          title: "Ticket Reply",
          message: `${session.user.name || "A user"} replied to: "${String(t.subject || "")}"`,
          link: `/support/${ticketId}`,
          data: { ticket_id: ticketId },
        }));
        await db.from("notifications").insert(notifs as never[]);
      }
    }

    return { success: true, message: "Reply sent" };
  } catch {
    return { success: false, error: "Failed to send reply" };
  }
}

// ============================================================================
// ADMIN: List all tickets
// ============================================================================
export async function getAllTickets(params?: PaginationParams & { status?: string; priority?: string }): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("support_tickets")
    .select("*, users!support_tickets_user_id_fkey(id, name, email, image)", { count: "exact" });

  if (params?.status) query = query.eq("status", params.status);
  if (params?.priority) query = query.eq("priority", params.priority);
  if (params?.search) query = query.ilike("subject", `%${params.search}%`);

  query = query.order("updated_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ============================================================================
// ADMIN: Update ticket status
// ============================================================================
export async function updateTicketStatus(ticketId: number, status: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role)) return { success: false, error: "Unauthorized" };

    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) return { success: false, error: "Invalid status" };

    const db = getServerClient();

    const { data: ticket } = await db.from("support_tickets").select("user_id, subject").eq("id", ticketId).single();
    if (!ticket) return { success: false, error: "Ticket not found" };

    await db.from("support_tickets").update({ status, updated_at: new Date().toISOString() } as never).eq("id", ticketId);

    const t = ticket as Record<string, unknown>;
    const label = status === "resolved" ? "Resolved" : status === "closed" ? "Closed" : status === "in_progress" ? "In Progress" : "Reopened";
    await db.from("notifications").insert({
      user_id: t.user_id,
      type: "system",
      title: `Ticket ${label}`,
      message: `Your ticket "${String(t.subject || "")}" has been marked as ${label.toLowerCase()}.`,
      link: `/support/${ticketId}`,
      data: { ticket_id: ticketId, status },
    } as never);

    return { success: true, message: `Ticket marked as ${label.toLowerCase()}` };
  } catch {
    return { success: false, error: "Failed to update ticket" };
  }
}
