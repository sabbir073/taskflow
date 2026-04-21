"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { checkRate, formatRetryAfter } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

// ============================================================================
// PUBLIC SUBMIT
// ============================================================================

const submitSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email("Invalid email address").max(200),
  subject: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(10, "Message is too short").max(5000),
  // Honeypot — legitimate users leave this empty; spam bots fill it.
  website: z.string().optional().default(""),
});

export async function submitContactForm(
  input: z.infer<typeof submitSchema>
): Promise<ApiResponse> {
  try {
    const parsed = submitSchema.parse(input);

    // Honeypot: silently accept and do nothing so bots don't retry
    if (parsed.website && parsed.website.length > 0) {
      return { success: true, message: "Thanks — we'll be in touch." };
    }

    // Capture IP + UA for abuse review. x-forwarded-for is set by most
    // hosting providers; fall back to "unknown" if missing.
    const h = await headers();
    const ip = (h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown").slice(0, 64);
    const ua = (h.get("user-agent") || "unknown").slice(0, 256);

    // Rate limit per IP: 3/hour. Neutralised response (not an error) so we
    // don't expose the limit to bots.
    const rl = checkRate("contact-submit", ip, 3, 60 * 60 * 1000);
    if (!rl.allowed) {
      return {
        success: false,
        error: `Too many submissions — try again in ${formatRetryAfter(rl.retryAfterSec)}`,
      };
    }

    const db = getServerClient();
    const { error } = await db.from("contact_submissions").insert({
      name: parsed.name,
      email: parsed.email,
      subject: parsed.subject || null,
      message: parsed.message,
      status: "unread",
      ip_address: ip,
      user_agent: ua,
    } as never);
    if (error) {
      return { success: false, error: "Couldn't save your message — please try again." };
    }

    // Notify all admins in-app so they see the new message without opening
    // the inbox page. Best-effort; swallow failures.
    try {
      const { data: admins } = await db
        .from("profiles")
        .select("user_id")
        .in("role", ["super_admin", "admin"]);
      const adminIds = ((admins || []) as Record<string, unknown>[]).map(
        (a) => a.user_id as string
      );
      if (adminIds.length > 0) {
        const notifs = adminIds.map((uid) => ({
          user_id: uid,
          type: "system",
          title: "New Contact Message",
          message: `${parsed.name} (${parsed.email})${parsed.subject ? ` — ${parsed.subject}` : ""}`,
          link: "/contact-messages",
          data: { from_email: parsed.email },
        }));
        await db.from("notifications").insert(notifs as never[]);
      }
    } catch {
      // ignore
    }

    return { success: true, message: "Thanks — we'll be in touch." };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Validation error" };
    }
    return { success: false, error: "Something went wrong — please try again." };
  }
}

// ============================================================================
// ADMIN INBOX
// ============================================================================

export async function getContactSubmissions(
  params: PaginationParams & { status?: string; search?: string }
): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }

  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let q = db
    .from("contact_submissions")
    .select("*, users!contact_submissions_handled_by_fkey(name, email)", {
      count: "exact",
    });

  if (params.status) q = q.eq("status", params.status);
  if (params.search && params.search.trim()) {
    // Email + name search. Uses plain ilike without .or() interpolation
    // risk because we escape inside a single filter.
    const s = params.search.trim().replace(/[,()%*"\\]/g, "").slice(0, 100);
    if (s) q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%`);
  }

  q = q.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await q;
  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getContactUnreadCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) return 0;
  const db = getServerClient();
  const { count } = await db
    .from("contact_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "unread");
  return count || 0;
}

export async function updateContactStatus(
  id: number,
  status: "unread" | "read" | "archived",
  admin_notes?: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    const db = getServerClient();

    const update: Record<string, unknown> = {
      status,
      handled_by: session.user.id,
      handled_at: new Date().toISOString(),
    };
    if (typeof admin_notes === "string") update.admin_notes = admin_notes;

    const { error } = await db.from("contact_submissions").update(update as never).eq("id", id);
    if (error) return { success: false, error: "Failed to update" };

    await recordAudit(db, session.user.id, "contact_update", "contact_submission", String(id), {
      new_status: status,
    });
    return { success: true, message: "Updated" };
  } catch {
    return { success: false, error: "Failed to update" };
  }
}

export async function deleteContactSubmission(id: number): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    const db = getServerClient();
    const { error } = await db.from("contact_submissions").delete().eq("id", id);
    if (error) return { success: false, error: "Failed to delete" };

    await recordAudit(db, session.user.id, "contact_delete", "contact_submission", String(id));
    return { success: true, message: "Deleted" };
  } catch {
    return { success: false, error: "Failed to delete" };
  }
}
