"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

// ============================================================================
// USER: own invoice history
// ============================================================================
export async function getMyInvoices(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("payments")
    .select("*, payment_methods(name, logo_url), plans(name), point_packages(name, points)", { count: "exact" })
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
// GET ONE: user can only see own, admin can see any
// ============================================================================
export async function getInvoiceById(paymentId: number): Promise<Record<string, unknown> | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getServerClient();
  const { data } = await db
    .from("payments")
    .select("*, users!payments_user_id_fkey(id, name, email), payment_methods(name, logo_url, currency), plans(name, period), point_packages(name, points)")
    .eq("id", paymentId)
    .single();

  if (!data) return null;
  const row = data as Record<string, unknown>;

  // Non-admin can only see own
  if (!isAdmin(session.user.role) && row.user_id !== session.user.id) return null;

  return row;
}

// ============================================================================
// ADMIN: all invoices with search
// ============================================================================
export async function getAllInvoices(
  params?: PaginationParams & { status?: string; search?: string; from?: string; to?: string }
): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }

  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("payments")
    .select(
      "*, users!payments_user_id_fkey(id, name, email, image), payment_methods(name), plans(name), point_packages(name, points)",
      { count: "exact" }
    );

  if (params?.status) query = query.eq("status", params.status);
  if (params?.from) query = query.gte("created_at", params.from);
  if (params?.to) query = query.lte("created_at", params.to);
  if (params?.search) {
    // Search by invoice number OR transaction id
    query = query.or(`invoice_number.ilike.%${params.search}%,transaction_id.ilike.%${params.search}%`);
  }

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
// ADMIN: change invoice/payment status with side effects
// ============================================================================
// Approving an invoice creates/updates the underlying subscription or credits
// points exactly like reviewPayment() does — we delegate to it for approvals.
// For rejection/pending, we just update the payments row and notify the user.
export async function updateInvoiceStatus(
  paymentId: number,
  newStatus: "pending" | "approved" | "rejected",
  notes?: string
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isAdmin(session.user.role)) return { success: false, error: "Only admins can change invoice status" };

    const db = getServerClient();
    const { data: payment } = await db.from("payments").select("*").eq("id", paymentId).single();
    if (!payment) return { success: false, error: "Invoice not found" };
    const p = payment as Record<string, unknown>;

    const currentStatus = String(p.status || "");

    // If going from pending → approved, trigger full reviewPayment side-effects
    // (creates subscription, credits wallet, etc.) via the existing path.
    if (newStatus === "approved" && currentStatus === "pending") {
      // Delegate to reviewPayment so all side effects fire
      const { reviewPayment } = await import("@/lib/actions/payments");
      return await reviewPayment(paymentId, "approve", notes);
    }

    if (newStatus === "rejected" && currentStatus === "pending") {
      const { reviewPayment } = await import("@/lib/actions/payments");
      return await reviewPayment(paymentId, "reject", notes);
    }

    // Admin forcing a status change after the fact (e.g. unreject, set back to pending)
    await db.from("payments").update({
      status: newStatus,
      review_notes: notes ?? p.review_notes ?? null,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never).eq("id", paymentId);

    // Notify the user
    const userId = p.user_id as string | null;
    if (userId) {
      const label = newStatus === "approved" ? "marked as Paid" : newStatus === "rejected" ? "marked as Rejected" : "set back to Pending";
      await db.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: `Invoice ${String(p.invoice_number || paymentId)}`,
        message: `Your invoice has been ${label}${notes ? `: ${notes}` : "."}`,
        link: `/billing/${paymentId}`,
        data: { payment_id: paymentId, status: newStatus },
      } as never);
    }

    return { success: true, message: `Invoice marked as ${newStatus}` };
  } catch {
    return { success: false, error: "Failed to update invoice" };
  }
}
