"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse } from "@/types";

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

// CSV builder — escapes per RFC 4180. Any cell with a comma, double-quote, or
// newline gets wrapped in quotes with interior quotes doubled.
function toCsvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerLine = headers.map(toCsvCell).join(",");
  const body = rows
    .map((row) => headers.map((h) => toCsvCell(row[h])).join(","))
    .join("\n");
  return `${headerLine}\n${body}`;
}

type ExportResult = ApiResponse & { csv?: string; filename?: string };

// Admin-only users export. Joins users + profiles and flattens to a single
// CSV row per user.
export async function exportUsersCsv(): Promise<ExportResult> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  const db = getServerClient();
  const { data } = await db
    .from("profiles")
    .select("user_id, role, status, is_approved, total_points, tasks_completed, users!inner(id, name, email, email_verified, created_at)")
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = ((data || []) as Record<string, unknown>[]).map((r) => {
    const u = r.users as Record<string, unknown> | undefined;
    return {
      id: String(u?.id || r.user_id || ""),
      name: String(u?.name || ""),
      email: String(u?.email || ""),
      email_verified: u?.email_verified ? "yes" : "no",
      role: String(r.role || ""),
      status: String(r.status || ""),
      is_approved: r.is_approved === false ? "no" : "yes",
      total_points: Number(r.total_points || 0).toFixed(2),
      tasks_completed: Number(r.tasks_completed || 0),
      created_at: String(u?.created_at || ""),
    };
  });

  const csv = buildCsv(
    ["id", "name", "email", "email_verified", "role", "status", "is_approved", "total_points", "tasks_completed", "created_at"],
    rows
  );
  return { success: true, csv, filename: `users-${new Date().toISOString().slice(0, 10)}.csv` };
}

export async function exportPaymentsCsv(filters?: { status?: string; purpose?: string }): Promise<ExportResult> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  const db = getServerClient();
  let q = db
    .from("payments")
    .select("invoice_number, purpose, amount, currency, status, transaction_id, notes, review_notes, created_at, reviewed_at, users!payments_user_id_fkey(email, name), payment_methods(name)")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.purpose) q = q.eq("purpose", filters.purpose);

  const { data } = await q;
  const rows = ((data || []) as Record<string, unknown>[]).map((p) => {
    const u = p.users as Record<string, unknown> | undefined;
    const m = p.payment_methods as Record<string, unknown> | undefined;
    return {
      invoice_number: String(p.invoice_number || ""),
      user_name: String(u?.name || ""),
      user_email: String(u?.email || ""),
      purpose: String(p.purpose || ""),
      amount: Number(p.amount || 0).toFixed(2),
      currency: String(p.currency || "").toUpperCase(),
      status: String(p.status || ""),
      method: String(m?.name || ""),
      transaction_id: String(p.transaction_id || ""),
      notes: String(p.notes || ""),
      review_notes: String(p.review_notes || ""),
      created_at: String(p.created_at || ""),
      reviewed_at: String(p.reviewed_at || ""),
    };
  });

  const csv = buildCsv(
    ["invoice_number", "user_name", "user_email", "purpose", "amount", "currency", "status", "method", "transaction_id", "notes", "review_notes", "created_at", "reviewed_at"],
    rows
  );
  return { success: true, csv, filename: `payments-${new Date().toISOString().slice(0, 10)}.csv` };
}

// Points history — admin sees all users, otherwise the caller's own.
export async function exportPointsHistoryCsv(userId?: string): Promise<ExportResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const callerIsAdmin = isAdmin(session.user.role);
  if (userId && !callerIsAdmin && userId !== session.user.id) {
    return { success: false, error: "Unauthorized" };
  }

  const db = getServerClient();
  const targetId = userId || (callerIsAdmin ? undefined : session.user.id);
  let q = db
    .from("points_history")
    .select("amount, action, description, reference_type, reference_id, created_at, users!points_history_user_id_fkey(email, name)")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (targetId) q = q.eq("user_id", targetId);

  const { data } = await q;
  const rows = ((data || []) as Record<string, unknown>[]).map((h) => {
    const u = h.users as Record<string, unknown> | undefined;
    return {
      user_name: String(u?.name || ""),
      user_email: String(u?.email || ""),
      amount: Number(h.amount || 0).toFixed(2),
      action: String(h.action || ""),
      description: String(h.description || ""),
      reference_type: String(h.reference_type || ""),
      reference_id: String(h.reference_id || ""),
      created_at: String(h.created_at || ""),
    };
  });

  const csv = buildCsv(
    ["user_name", "user_email", "amount", "action", "description", "reference_type", "reference_id", "created_at"],
    rows
  );
  return { success: true, csv, filename: `points-history-${new Date().toISOString().slice(0, 10)}.csv` };
}
