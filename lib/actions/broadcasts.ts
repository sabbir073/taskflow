"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { escapePgLikeOr } from "@/lib/utils";
import type { ApiResponse } from "@/types";

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(2000),
  link: z.string().max(500).optional().nullable(),
  // Either an explicit list of user ids, or a filter that resolves to a list
  userIds: z.array(z.string().uuid()).optional(),
  filter: z
    .object({
      role: z.string().optional(),
      status: z.string().optional(),
      approval: z.enum(["pending", "approved"]).optional(),
      allUsers: z.boolean().optional(),
    })
    .optional(),
});

// Admin-only broadcast: drops a simple { title, message } notification into
// every selected user's feed. No email. No templates. Recipients are picked
// by explicit user list OR by a filter (role/status/approval/all).
export async function sendBroadcast(
  input: z.infer<typeof broadcastSchema>
): Promise<ApiResponse & { recipients?: number }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const validated = broadcastSchema.parse(input);
    const db = getServerClient();

    // Resolve recipient IDs
    let recipientIds: string[] = [];

    if (validated.userIds && validated.userIds.length > 0) {
      recipientIds = validated.userIds;
    } else if (validated.filter) {
      let q = db.from("profiles").select("user_id");
      if (validated.filter.role) q = q.eq("role", validated.filter.role);
      if (validated.filter.status) q = q.eq("status", validated.filter.status);
      if (validated.filter.approval === "pending") q = q.eq("is_approved", false);
      if (validated.filter.approval === "approved") q = q.eq("is_approved", true);
      const { data } = await q;
      recipientIds = ((data || []) as Record<string, unknown>[]).map((r) => r.user_id as string);
    }

    // Never notify the admin who's sending the broadcast — a "send to all
    // admins" filter would otherwise loop back to the sender.
    recipientIds = recipientIds.filter((id) => id !== session.user.id);

    if (recipientIds.length === 0) {
      return { success: false, error: "No recipients matched" };
    }

    const notifs = recipientIds.map((uid) => ({
      user_id: uid,
      type: "system",
      title: validated.title,
      message: validated.message,
      link: validated.link || null,
      data: { broadcast: true, sent_by: session.user.id },
    }));

    // Supabase accepts bulk insert; break into chunks for very large lists
    const CHUNK = 500;
    for (let i = 0; i < notifs.length; i += CHUNK) {
      const batch = notifs.slice(i, i + CHUNK);
      const { error } = await db.from("notifications").insert(batch as never[]);
      if (error) return { success: false, error: "Failed to send broadcast" };
    }

    return {
      success: true,
      message: `Broadcast sent to ${recipientIds.length} user${recipientIds.length === 1 ? "" : "s"}`,
      recipients: recipientIds.length,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Validation error" };
    }
    return { success: false, error: "Failed to send broadcast" };
  }
}

// Lightweight list of users for the recipient picker (admin-only)
export async function listBroadcastRecipients(search?: string): Promise<
  Array<{ id: string; name: string; email: string; role: string; status: string }>
> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) return [];

  const db = getServerClient();
  let q = db
    .from("profiles")
    .select("user_id, role, status, users!inner(id, name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  const safe = search ? escapePgLikeOr(search) : "";
  if (safe) {
    q = q.or(`users.name.ilike.%${safe}%,users.email.ilike.%${safe}%`);
  }

  const { data } = await q;
  return ((data || []) as Record<string, unknown>[]).map((r) => {
    const u = r.users as Record<string, unknown> | undefined;
    return {
      id: String(u?.id || r.user_id),
      name: String(u?.name || "Unknown"),
      email: String(u?.email || ""),
      role: String(r.role || "user"),
      status: String(r.status || "active"),
    };
  });
}
