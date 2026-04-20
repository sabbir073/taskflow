"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { escapePgLikeOr } from "@/lib/utils";
import type { PaginatedResponse, PaginationParams } from "@/types";

function isAdmin(role: string | undefined): boolean {
  return ["super_admin", "admin"].includes(role || "");
}

// Admin-only. Returns a paginated audit log with optional filters. Joins the
// users table to surface actor name/avatar alongside the raw action record.
export async function getAuditLog(
  params: PaginationParams & {
    actor_search?: string;
    action?: string;
    target_type?: string;
    from?: string;
    to?: string;
  }
): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }

  const db = getServerClient();
  const page = params.page || 1;
  const pageSize = params.pageSize || 25;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("admin_audit_log")
    .select("*, users!admin_audit_log_actor_id_fkey(id, name, email, image)", { count: "exact" });

  if (params.action) query = query.eq("action", params.action);
  if (params.target_type) query = query.eq("target_type", params.target_type);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to);

  const safeActor = params.actor_search ? escapePgLikeOr(params.actor_search) : "";
  if (safeActor) {
    query = query.or(`users.name.ilike.%${safeActor}%,users.email.ilike.%${safeActor}%`);
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
