"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { isStaffRole, isAdminRole, ADMIN_ROLES } from "@/lib/constants/roles";
import { getSettingsMap } from "@/lib/actions/settings";
import { recordAudit } from "@/lib/audit";
import { checkRate, formatRetryAfter } from "@/lib/rate-limit";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

// ============================================================================
// Paid + admin-approved Group Access (migration 055).
// ----------------------------------------------------------------------------
// A user with no group access sees a marketing card + "Apply for Group". They
// apply (auto-priced or admin-quoted), pay, an admin approves, and they're
// promoted to group_leader with explicit limits (groups / members / tasks).
// ============================================================================

type DB = ReturnType<typeof getServerClient>;

export type GroupAccessSource = "staff" | "grant" | "subscription" | "none";
export interface GroupAccessLimits {
  groups: number | null; // null = unlimited (staff)
  members: number | null;
  tasks: number | null;
}
export interface GroupAccessResolved {
  access: boolean;
  source: GroupAccessSource;
  limits: GroupAccessLimits | null;
}

// ----------------------------------------------------------------------------
// resolveGroupAccess — the single gate used by the /groups UI, createGroup,
// addMember, and createTask. Precedence: staff → active grant → active
// subscription → none. "Keep both gates" = a grant OR an active subscription
// both unlock groups.
// ----------------------------------------------------------------------------
export async function resolveGroupAccess(db: DB, userId: string, role: string | undefined): Promise<GroupAccessResolved> {
  if (isStaffRole(role)) {
    return { access: true, source: "staff", limits: { groups: null, members: null, tasks: null } };
  }

  const { data: grants } = await db
    .from("group_access_grants")
    .select("max_groups, max_members, max_tasks")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);
  const grant = ((grants || []) as Record<string, unknown>[])[0];
  if (grant) {
    return {
      access: true,
      source: "grant",
      limits: {
        groups: grant.max_groups == null ? null : Number(grant.max_groups),
        members: grant.max_members == null ? null : Number(grant.max_members),
        tasks: grant.max_tasks == null ? null : Number(grant.max_tasks),
      },
    };
  }

  // Active (non-expired) subscription also counts as group access.
  const { data: subs } = await db
    .from("user_subscriptions")
    .select("expires_at, status")
    .eq("user_id", userId)
    .eq("status", "active");
  const now = Date.now();
  const activeSub = ((subs || []) as Record<string, unknown>[]).find((s) => {
    const exp = s.expires_at as string | null;
    return !exp || new Date(exp).getTime() > now;
  });
  if (activeSub) {
    // Limits for the subscription path come from the plan quota (enforced via
    // checkQuota in createGroup); no member/task cap beyond that.
    return { access: true, source: "subscription", limits: null };
  }

  return { access: false, source: "none", limits: null };
}

// ----------------------------------------------------------------------------
// Pricing helpers
// ----------------------------------------------------------------------------
export interface GroupAccessPricing {
  mode: "auto" | "admin";
  ratePerGroup: number;
  ratePerMember: number;
  ratePerTask: number;
  basePrice: number;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getGroupAccessPricing(): Promise<GroupAccessPricing> {
  const s = await getSettingsMap();
  const mode = s.group_access_pricing_mode === "auto" ? "auto" : "admin";
  return {
    mode,
    ratePerGroup: num(s.group_access_rate_per_group),
    ratePerMember: num(s.group_access_rate_per_member),
    ratePerTask: num(s.group_access_rate_per_task),
    basePrice: num(s.group_access_base_price),
  };
}

function computePrice(p: GroupAccessPricing, req: { groups: number; members: number; tasks: number }): number {
  const total = p.basePrice + req.groups * p.ratePerGroup + req.members * p.ratePerMember + req.tasks * p.ratePerTask;
  return Math.max(0, Math.round(total * 100) / 100);
}

// ----------------------------------------------------------------------------
// User: current access state + latest application (drives the gate UI).
// ----------------------------------------------------------------------------
export async function getMyGroupAccessState(): Promise<{
  authed: boolean;
  access: boolean;
  source: GroupAccessSource;
  limits: GroupAccessLimits | null;
  application: Record<string, unknown> | null;
  pricing: GroupAccessPricing;
}> {
  const session = await auth();
  const pricing = await getGroupAccessPricing();
  if (!session?.user?.id) {
    return { authed: false, access: false, source: "none", limits: null, application: null, pricing };
  }
  const db = getServerClient();
  const resolved = await resolveGroupAccess(db, session.user.id, session.user.role);
  const application = await fetchLatestApplication(db, session.user.id);
  return { authed: true, ...resolved, application, pricing };
}

async function fetchLatestApplication(db: DB, userId: string): Promise<Record<string, unknown> | null> {
  const { data } = await db
    .from("group_access_applications")
    .select("*, payment_methods(name, currency, qr_code_url, instruction)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  return ((data || []) as Record<string, unknown>[])[0] || null;
}

export async function getMyGroupApplication(): Promise<Record<string, unknown> | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return fetchLatestApplication(getServerClient(), session.user.id);
}

// ----------------------------------------------------------------------------
// User: apply for group access.
// ----------------------------------------------------------------------------
const applySchema = z.object({
  contact_number: z.string().min(5, "Contact number is required").max(40),
  requested_groups: z.coerce.number().int().min(1, "At least 1 group").max(1000),
  requested_members: z.coerce.number().int().min(0).max(100000),
  requested_tasks: z.coerce.number().int().min(0).max(100000),
  payment_method_id: z.coerce.number().int().optional(),
  transaction_id: z.string().max(200).optional(),
});

const ACTIVE_STATUSES = ["awaiting_quote", "awaiting_payment", "pending_review"] as const;

export async function applyForGroupAccess(formData: z.infer<typeof applySchema>): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const rate = checkRate("group-apply", session.user.id, 5, 30 * 60 * 1000);
    if (!rate.allowed) return { success: false, error: `Too many attempts. Try again in ${formatRetryAfter(rate.retryAfterSec)}.` };

    const validated = applySchema.parse(formData);
    const db = getServerClient();

    // Already has access? No need to apply.
    const resolved = await resolveGroupAccess(db, session.user.id, session.user.role);
    if (resolved.access) return { success: false, error: "You already have group access." };

    // Block a second in-flight application.
    const { data: existing } = await db
      .from("group_access_applications")
      .select("id, status")
      .eq("user_id", session.user.id)
      .in("status", ACTIVE_STATUSES as unknown as string[])
      .limit(1);
    if (existing && (existing as unknown[]).length > 0) {
      return { success: false, error: "You already have an application in progress." };
    }

    const pricing = await getGroupAccessPricing();
    const req = {
      groups: validated.requested_groups,
      members: validated.requested_members,
      tasks: validated.requested_tasks,
    };

    let status: string;
    let price: number | null = null;
    let paymentMethodId: number | null = null;
    let transactionId: string | null = null;
    let paidAt: string | null = null;

    if (pricing.mode === "auto") {
      // Pay-upfront: price is computed now and the user must supply payment.
      if (!validated.payment_method_id || !validated.transaction_id?.trim()) {
        return { success: false, error: "Select a payment method and enter your transaction ID." };
      }
      price = computePrice(pricing, req);
      paymentMethodId = validated.payment_method_id;
      transactionId = validated.transaction_id.trim();
      paidAt = new Date().toISOString();
      status = "pending_review";
    } else {
      // Admin-quote: submit a request; the admin sets the price next.
      status = "awaiting_quote";
    }

    const { error } = await db.from("group_access_applications").insert({
      user_id: session.user.id,
      contact_number: validated.contact_number,
      requested_groups: req.groups,
      requested_members: req.members,
      requested_tasks: req.tasks,
      pricing_mode: pricing.mode,
      price,
      currency: "usd",
      payment_method_id: paymentMethodId,
      transaction_id: transactionId,
      paid_at: paidAt,
      status,
    } as never);
    if (error) return { success: false, error: "Failed to submit application" };

    await notifyAdmins(
      db,
      "New Group Application",
      `${session.user.name || "A user"} applied for group access. Please review.`,
      { user_id: session.user.id },
    );

    return {
      success: true,
      message: pricing.mode === "auto" ? "Application submitted — awaiting admin approval" : "Request submitted — an admin will set your price",
    };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message || "Validation error" };
    return { success: false, error: "Failed to submit application" };
  }
}

// ----------------------------------------------------------------------------
// User: pay for an admin-quoted application (admin-mode step 2).
// ----------------------------------------------------------------------------
export async function payForGroupApplication(appId: number, paymentMethodId: number, transactionId: string): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!paymentMethodId || !transactionId?.trim()) return { success: false, error: "Select a payment method and enter your transaction ID." };

    const db = getServerClient();
    const { data: app } = await db
      .from("group_access_applications")
      .select("id, user_id, status")
      .eq("id", appId)
      .single();
    if (!app) return { success: false, error: "Application not found" };
    const a = app as Record<string, unknown>;
    if (a.user_id !== session.user.id) return { success: false, error: "Unauthorized" };
    if (a.status !== "awaiting_payment") return { success: false, error: "This application is not awaiting payment." };

    await db.from("group_access_applications").update({
      payment_method_id: paymentMethodId,
      transaction_id: transactionId.trim(),
      paid_at: new Date().toISOString(),
      status: "pending_review",
      updated_at: new Date().toISOString(),
    } as never).eq("id", appId);

    await notifyAdmins(db, "Group Application Paid", `${session.user.name || "A user"} paid for group access. Please verify + approve.`, { application_id: appId });
    return { success: true, message: "Payment submitted — awaiting admin approval" };
  } catch {
    return { success: false, error: "Failed to submit payment" };
  }
}

// ----------------------------------------------------------------------------
// Admin: list applications.
// ----------------------------------------------------------------------------
export async function getGroupApplications(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
  const db = getServerClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("group_access_applications")
    .select("*, users!group_access_applications_user_id_fkey(id, name, email, image), payment_methods(name, currency)", { count: "exact" });
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

// ----------------------------------------------------------------------------
// Admin: quote / approve / reject.
// ----------------------------------------------------------------------------
export async function reviewGroupApplication(
  appId: number,
  action: "quote" | "approve" | "reject",
  opts?: { price?: number; granted_groups?: number; granted_members?: number; granted_tasks?: number; notes?: string },
): Promise<ApiResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!isAdminRole(session.user.role)) return { success: false, error: "Only admins can review group applications" };

    const db = getServerClient();
    const { data: app } = await db
      .from("group_access_applications")
      .select("id, user_id, status, requested_groups, requested_members, requested_tasks")
      .eq("id", appId)
      .single();
    if (!app) return { success: false, error: "Application not found" };
    const a = app as Record<string, unknown>;
    const status = String(a.status);
    if (status === "approved" || status === "rejected") return { success: false, error: "This application has already been finalized." };
    const userId = a.user_id as string;

    // ---- QUOTE (admin mode): set price + limits, move to awaiting_payment ----
    if (action === "quote") {
      const price = opts?.price;
      if (price == null || !Number.isFinite(price) || price < 0) return { success: false, error: "Enter a valid price" };
      await db.from("group_access_applications").update({
        price,
        granted_groups: opts?.granted_groups ?? a.requested_groups,
        granted_members: opts?.granted_members ?? a.requested_members,
        granted_tasks: opts?.granted_tasks ?? a.requested_tasks,
        status: "awaiting_payment",
        review_notes: opts?.notes || null,
        updated_at: new Date().toISOString(),
      } as never).eq("id", appId);

      await db.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Group Application — Price Ready",
        message: `Your group access price is ready (${price.toFixed(2)} USD). Open Groups to pay.`,
        link: "/groups",
        data: { application_id: appId },
      } as never);
      await recordAudit(db, session.user.id, "group_application_review", "group_application", String(appId), { action: "quote", price });
      return { success: true, message: "Price sent to the applicant" };
    }

    // ---- REJECT ----
    if (action === "reject") {
      await db.from("group_access_applications").update({
        status: "rejected",
        review_notes: opts?.notes || null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never).eq("id", appId);
      await db.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Group Application Rejected",
        message: `Your group access application was rejected${opts?.notes ? `: ${opts.notes}` : "."}`,
        link: "/groups",
        data: { application_id: appId },
      } as never);
      await recordAudit(db, session.user.id, "group_application_review", "group_application", String(appId), { action: "reject", notes: opts?.notes || null });
      return { success: true, message: "Application rejected" };
    }

    // ---- APPROVE: grant access (role + grant row) ----
    const grantedGroups = opts?.granted_groups ?? Number(a.requested_groups) ?? 1;
    const grantedMembers = opts?.granted_members ?? Number(a.requested_members) ?? 0;
    const grantedTasks = opts?.granted_tasks ?? Number(a.requested_tasks) ?? 0;

    await db.from("group_access_applications").update({
      status: "approved",
      granted_groups: grantedGroups,
      granted_members: grantedMembers,
      granted_tasks: grantedTasks,
      review_notes: opts?.notes || null,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never).eq("id", appId);

    // Upsert the active grant (one per user).
    const { data: existingGrant } = await db.from("group_access_grants").select("id").eq("user_id", userId).limit(1);
    const grantRow = {
      user_id: userId,
      max_groups: grantedGroups,
      max_members: grantedMembers,
      max_tasks: grantedTasks,
      application_id: appId,
      granted_by: session.user.id,
      is_active: true,
    };
    if (existingGrant && (existingGrant as unknown[]).length > 0) {
      await db.from("group_access_grants").update(grantRow as never).eq("user_id", userId);
    } else {
      await db.from("group_access_grants").insert(grantRow as never);
    }

    // Promote a plain user to group_leader so all existing group features
    // unlock. Don't touch a higher role (staff never reaches this flow).
    const { data: prof } = await db.from("profiles").select("role").eq("user_id", userId).single();
    const currentRole = prof ? String((prof as Record<string, unknown>).role || "user") : "user";
    if (currentRole === "user") {
      await db.from("profiles").update({ role: "group_leader" } as never).eq("user_id", userId);
    }

    await db.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: "Group Access Approved 🎉",
      message: `You can now create groups (up to ${grantedGroups}), add members, and assign tasks. Open Groups to get started.`,
      link: "/groups",
      data: { application_id: appId },
    } as never);
    await recordAudit(db, session.user.id, "group_application_review", "group_application", String(appId), {
      action: "approve",
      granted: { groups: grantedGroups, members: grantedMembers, tasks: grantedTasks },
      promoted: currentRole === "user",
    });

    return { success: true, message: "Approved — applicant granted group access" };
  } catch (err) {
    console.error("[reviewGroupApplication]", err);
    return { success: false, error: "Failed to review application" };
  }
}

// ----------------------------------------------------------------------------
// Notify all admins (group applications are admin-only, like appeals).
// ----------------------------------------------------------------------------
async function notifyAdmins(db: DB, title: string, message: string, data: Record<string, unknown>): Promise<void> {
  try {
    const { data: admins } = await db.from("profiles").select("user_id").in("role", ADMIN_ROLES as readonly string[]);
    const ids = ((admins || []) as Record<string, unknown>[]).map((a) => a.user_id as string);
    if (ids.length === 0) return;
    const notifs = ids.map((uid) => ({
      user_id: uid,
      type: "system",
      title,
      message,
      link: "/group-applications",
      data,
    }));
    await db.from("notifications").insert(notifs as never[]);
  } catch {
    // Best-effort — never block the application on a notification failure.
  }
}
