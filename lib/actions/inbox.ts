"use server";

import { getServerClient } from "@/lib/db/supabase";
import { auth } from "@/auth";
import { isStaffRole, isAdminRole } from "@/lib/constants/roles";

// ============================================================================
// Admin inbox — central aggregation of every "needs admin attention" queue.
// ============================================================================
// The admin /inbox page surfaces nine existing queues in one view so the
// admin doesn't have to hop between 9 routes to clear their day.
//
// Two server actions live here:
//   - getAdminInboxCounts() → cheap count-only roll-up, drives the sidebar
//     nav badge (refreshed every 60s).
//   - getAdminInbox()       → hydrated top-N preview per queue, drives the
//     /inbox page body. Each query is bounded to a small page size so the
//     payload stays tight; the inbox is a triage view, not a deep queue
//     browser (admin clicks "View all in <surface>" to drill in).
//
// We re-use the EXISTING server actions inside lib/actions/* whenever
// possible to keep one source of truth for filtering and joins. The few
// queue types whose existing list action is admin-shaped are called
// directly here with `status` filters; the rest are read with bespoke
// SELECTs for minimal payloads.

export type InboxKey =
  | "users"            // user signups awaiting approval
  | "tasks"            // creator-submitted tasks awaiting admin approval
  | "items"            // bundle item proof submissions
  | "payments"         // manual payment submissions
  | "groups"           // group submissions awaiting approval
  | "appeals"          // suspension appeals
  | "tickets"          // open support tickets
  | "contact"          // unread contact-form messages
  | "auto_reverse"     // music auto-approvals still within the 24h reverse window
  | "group_applications"; // group-access applications awaiting quote/approval

export type InboxCounts = Record<InboxKey, number> & { totalPending: number };

// ----------------------------------------------------------------------------
// Common gate — only staff see anything.
// ----------------------------------------------------------------------------
async function requireStaff(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!isStaffRole(session.user.role)) return null;
  return session.user.id;
}

// Some queues are admin-only (not staff). The /audit reverse panel is the
// canonical example: super_admin + admin can reverse, moderator cannot.
async function isAdminContext(): Promise<boolean> {
  const session = await auth();
  return !!session?.user?.role && isAdminRole(session.user.role);
}

// ============================================================================
// getAdminInboxCounts — sidebar nav badge.
// ============================================================================
// Nine cheap count-only queries in parallel. Each is `head: true` so we
// never hydrate row data — Supabase returns just the count via the
// `Content-Range` header. Anything that errors counts as 0 so the badge
// never blocks the sidebar render.
export async function getAdminInboxCounts(): Promise<InboxCounts> {
  const empty: InboxCounts = {
    users: 0, tasks: 0, items: 0, payments: 0, groups: 0,
    appeals: 0, tickets: 0, contact: 0, auto_reverse: 0, group_applications: 0,
    totalPending: 0,
  };
  const staffId = await requireStaff();
  if (!staffId) return empty;

  const db = getServerClient();
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const isAdmin = await isAdminContext();

  const [
    usersR, tasksR, itemsR, paymentsR, groupsR,
    appealsR, ticketsR, contactR, autoR, groupAppsR,
  ] = await Promise.all([
    // Genuine pending signups are status='active' + is_approved=false. A
    // rejected signup is set to status='banned' (still is_approved=false), so
    // exclude banned or rejected users would linger in this queue forever.
    db.from("profiles").select("user_id", { count: "exact", head: true })
      .eq("is_approved", false)
      .neq("status", "banned"),
    db.from("tasks").select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_approval"),
    db.from("assignment_item_submissions").select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    db.from("payments").select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db.from("groups").select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_approval"),
    // Appeals are admin-only (/appeals is in proxy.ts adminOnlyPaths). Gate
    // the count behind isAdmin so moderators don't see a queue they can't open.
    isAdmin
      ? db.from("suspension_appeals").select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0 } as { count: number | null }),
    db.from("support_tickets").select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    db.from("contact_submissions").select("id", { count: "exact", head: true })
      .eq("status", "unread"),
    // Only admins can reverse auto-approvals; moderators see 0.
    isAdmin
      ? db.from("assignment_item_submissions").select("id", { count: "exact", head: true })
          .not("auto_approved_at", "is", null)
          .is("auto_approve_reversed_at", null)
          .gte("auto_approved_at", cutoff24h)
      : Promise.resolve({ count: 0 } as { count: number | null }),
    // Group-access applications needing admin action (quote or approve).
    // Admin-only (/group-applications is in proxy.ts adminOnlyPaths).
    isAdmin
      ? db.from("group_access_applications").select("id", { count: "exact", head: true })
          .in("status", ["awaiting_quote", "pending_review"])
      : Promise.resolve({ count: 0 } as { count: number | null }),
  ]);

  const counts: InboxCounts = {
    users: usersR.count || 0,
    tasks: tasksR.count || 0,
    items: itemsR.count || 0,
    payments: paymentsR.count || 0,
    groups: groupsR.count || 0,
    appeals: appealsR.count || 0,
    tickets: ticketsR.count || 0,
    contact: contactR.count || 0,
    auto_reverse: autoR.count || 0,
    group_applications: groupAppsR.count || 0,
    totalPending: 0,
  };
  counts.totalPending = counts.users + counts.tasks + counts.items + counts.payments
    + counts.groups + counts.appeals + counts.tickets + counts.contact + counts.auto_reverse
    + counts.group_applications;
  return counts;
}

// ============================================================================
// getAdminInbox — top-N preview rows per queue.
// ============================================================================
// Returns up to PREVIEW_LIMIT rows per queue. Designed for the /inbox page
// triage view — admin scans, clicks "Open" on a row, the existing source
// surface handles approve/reject. We deliberately keep the row shape lean
// per queue (no platform joins, no bundle joins) so the page renders fast
// even when every queue has activity.
// Non-exported on purpose — Next.js disallows non-async-function exports
// from a `"use server"` file. Only used inside getAdminInbox below.
const PREVIEW_LIMIT = 5;

export type InboxRow = {
  // Stable client key — type prefix + DB id.
  key: string;
  // What kind of pending item this is.
  type: InboxKey;
  // Display fields — kept generic so the row template stays simple.
  title: string;
  subtitle?: string;
  actorName?: string;
  actorEmail?: string;
  // ISO timestamp the item landed in the queue.
  createdAt: string;
  // Deep link the admin clicks to act on it. Targets the existing source
  // surface (which already implements approve/reject), not /inbox itself.
  openHref: string;
};

export type InboxData = {
  counts: InboxCounts;
  preview: Record<InboxKey, InboxRow[]>;
};

export async function getAdminInbox(): Promise<InboxData> {
  const blank: Record<InboxKey, InboxRow[]> = {
    users: [], tasks: [], items: [], payments: [], groups: [],
    appeals: [], tickets: [], contact: [], auto_reverse: [], group_applications: [],
  };
  const staffId = await requireStaff();
  if (!staffId) {
    return {
      counts: {
        users: 0, tasks: 0, items: 0, payments: 0, groups: 0,
        appeals: 0, tickets: 0, contact: 0, auto_reverse: 0, group_applications: 0, totalPending: 0,
      },
      preview: blank,
    };
  }

  const db = getServerClient();
  const isAdmin = await isAdminContext();
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    counts,
    usersRes, tasksRes, itemsRes, paymentsRes, groupsRes,
    appealsRes, ticketsRes, contactRes, autoRes, groupAppsRes,
  ] = await Promise.all([
    getAdminInboxCounts(),

    // Users awaiting signup approval — join the users table for name/email.
    // Exclude banned (rejected) users so they don't linger in the queue.
    db.from("profiles")
      .select("user_id, created_at, users!inner(name, email)")
      .eq("is_approved", false)
      .neq("status", "banned")
      .order("created_at", { ascending: false })
      .limit(PREVIEW_LIMIT),

    // User-created tasks pending admin approval.
    db.from("tasks")
      .select("id, title, created_at, users!tasks_created_by_fkey(name, email)")
      .eq("approval_status", "pending_approval")
      .order("created_at", { ascending: false })
      .limit(PREVIEW_LIMIT),

    // Bundle item proof submissions awaiting review (per Entry #13).
    db.from("assignment_item_submissions")
      .select(
        "id, submitted_at, task_assignments!inner(user_id, task_id, users!task_assignments_user_id_fkey(name, email), tasks!inner(title))," +
        "task_bundle_items!inner(task_types!inner(name))"
      )
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(PREVIEW_LIMIT),

    // Payment submissions awaiting admin review.
    db.from("payments")
      .select("id, amount, currency, purpose, transaction_id, created_at, users(name, email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(PREVIEW_LIMIT),

    // Groups awaiting approval.
    db.from("groups")
      .select("id, name, created_at, users!groups_created_by_fkey(name, email)")
      .eq("approval_status", "pending_approval")
      .order("created_at", { ascending: false })
      .limit(PREVIEW_LIMIT),

    // Suspension appeals — admin-only (/appeals is in proxy.ts adminOnlyPaths),
    // so moderators get an empty preview and never see a queue they can't open.
    isAdmin
      ? db.from("suspension_appeals")
          .select("id, reason, created_at, users(name, email)")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(PREVIEW_LIMIT)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),

    // Open support tickets — both 'open' and 'in_progress' mean admin work pending.
    db.from("support_tickets")
      .select("id, subject, status, created_at, users(name, email)")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(PREVIEW_LIMIT),

    // Unread contact-form messages.
    db.from("contact_submissions")
      .select("id, name, email, subject, message, created_at")
      .eq("status", "unread")
      .order("created_at", { ascending: false })
      .limit(PREVIEW_LIMIT),

    // Music auto-approvals still within the 24h reverse window. Admin-only.
    isAdmin
      ? db.from("assignment_item_submissions")
          .select(
            "id, points_awarded, auto_approved_at, " +
            "task_bundle_items!inner(task_id, task_types!inner(name))," +
            "task_assignments!inner(user_id, users!task_assignments_user_id_fkey(name, email))"
          )
          .not("auto_approved_at", "is", null)
          .is("auto_approve_reversed_at", null)
          .gte("auto_approved_at", cutoff24h)
          .order("auto_approved_at", { ascending: false })
          .limit(PREVIEW_LIMIT)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),

    // Group-access applications needing admin action. Admin-only.
    isAdmin
      ? db.from("group_access_applications")
          .select("id, status, requested_groups, requested_members, requested_tasks, price, created_at, users!group_access_applications_user_id_fkey(name, email)")
          .in("status", ["awaiting_quote", "pending_review"])
          .order("created_at", { ascending: false })
          .limit(PREVIEW_LIMIT)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  // ----------------- shape rows for the client -----------------
  // Each branch keeps a tight (title / subtitle / actor) shape so the
  // shared `<InboxRow>` component renders uniformly.

  const preview: Record<InboxKey, InboxRow[]> = { ...blank };

  preview.users = ((usersRes.data || []) as unknown as Array<{
    user_id: string;
    created_at: string;
    users: { name: string | null; email: string };
  }>).map((r) => ({
    key: `users:${r.user_id}`,
    type: "users",
    title: r.users?.name || r.users?.email || "Unknown user",
    subtitle: r.users?.email || "",
    actorName: r.users?.name || null || undefined,
    actorEmail: r.users?.email,
    createdAt: r.created_at,
    openHref: "/users",
  }));

  preview.tasks = ((tasksRes.data || []) as unknown as Array<{
    id: number;
    title: string;
    created_at: string;
    users: { name: string | null; email: string } | null;
  }>).map((r) => ({
    key: `tasks:${r.id}`,
    type: "tasks",
    title: r.title,
    subtitle: r.users?.name || r.users?.email || "Unknown creator",
    actorName: r.users?.name || undefined,
    actorEmail: r.users?.email,
    createdAt: r.created_at,
    // Task-level approve/reject lives in the /tasks Manage tab, not the task
    // detail page — land the admin there. (The `items` queue below correctly
    // links to /tasks/{id}, where the per-item proof review does live.)
    openHref: "/tasks?tab=manage",
  }));

  preview.items = ((itemsRes.data || []) as unknown as Array<{
    id: number;
    submitted_at: string | null;
    task_assignments: {
      task_id: number;
      users: { name: string | null; email: string } | null;
      tasks: { title: string };
    };
    task_bundle_items: { task_types: { name: string } };
  }>).map((r) => {
    const ta = r.task_assignments;
    const tt = r.task_bundle_items?.task_types;
    return {
      key: `items:${r.id}`,
      type: "items" as const,
      title: `${tt?.name || "Action"} · ${ta?.tasks?.title || "Untitled task"}`,
      subtitle: `Submitted by ${ta?.users?.name || ta?.users?.email || "Unknown worker"}`,
      actorName: ta?.users?.name || undefined,
      actorEmail: ta?.users?.email,
      createdAt: r.submitted_at || new Date().toISOString(),
      openHref: `/tasks/${ta?.task_id}`,
    };
  });

  preview.payments = ((paymentsRes.data || []) as unknown as Array<{
    id: number;
    amount: number;
    currency: string;
    purpose: string;
    transaction_id: string | null;
    created_at: string;
    users: { name: string | null; email: string } | null;
  }>).map((r) => ({
    key: `payments:${r.id}`,
    type: "payments",
    title: `${Number(r.amount).toFixed(2)} ${String(r.currency || "").toUpperCase()} · ${r.purpose}`,
    subtitle: `Txn ${r.transaction_id || "—"} · ${r.users?.name || r.users?.email || "Unknown"}`,
    actorName: r.users?.name || undefined,
    actorEmail: r.users?.email,
    createdAt: r.created_at,
    openHref: "/payments",
  }));

  preview.groups = ((groupsRes.data || []) as unknown as Array<{
    id: number;
    name: string;
    created_at: string;
    users: { name: string | null; email: string } | null;
  }>).map((r) => ({
    key: `groups:${r.id}`,
    type: "groups",
    title: r.name,
    subtitle: `Created by ${r.users?.name || r.users?.email || "Unknown"}`,
    actorName: r.users?.name || undefined,
    actorEmail: r.users?.email,
    createdAt: r.created_at,
    openHref: `/groups/${r.id}`,
  }));

  preview.appeals = ((appealsRes.data || []) as unknown as Array<{
    id: number;
    reason: string;
    created_at: string;
    users: { name: string | null; email: string } | null;
  }>).map((r) => ({
    key: `appeals:${r.id}`,
    type: "appeals",
    title: r.users?.name || r.users?.email || "Suspension appeal",
    subtitle: (r.reason || "").slice(0, 120),
    actorName: r.users?.name || undefined,
    actorEmail: r.users?.email,
    createdAt: r.created_at,
    openHref: "/appeals",
  }));

  preview.tickets = ((ticketsRes.data || []) as unknown as Array<{
    id: number;
    subject: string;
    status: string;
    created_at: string;
    users: { name: string | null; email: string } | null;
  }>).map((r) => ({
    key: `tickets:${r.id}`,
    type: "tickets",
    title: r.subject || `Ticket #${r.id}`,
    subtitle: `${r.status === "in_progress" ? "In progress" : "Open"} · ${r.users?.name || r.users?.email || "Unknown"}`,
    actorName: r.users?.name || undefined,
    actorEmail: r.users?.email,
    createdAt: r.created_at,
    openHref: `/support/${r.id}`,
  }));

  preview.contact = ((contactRes.data || []) as unknown as Array<{
    id: number;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    created_at: string;
  }>).map((r) => ({
    key: `contact:${r.id}`,
    type: "contact",
    title: r.subject || (r.message || "").slice(0, 80),
    subtitle: `From ${r.name} <${r.email}>`,
    actorName: r.name,
    actorEmail: r.email,
    createdAt: r.created_at,
    openHref: "/contact-messages",
  }));

  preview.auto_reverse = ((autoRes.data || []) as unknown as Array<{
    id: number;
    points_awarded: number | null;
    auto_approved_at: string;
    task_bundle_items: { task_id: number; task_types: { name: string } };
    task_assignments: { user_id: string; users: { name: string | null; email: string } | null };
  }>).map((r) => {
    const tt = r.task_bundle_items?.task_types;
    return {
      key: `auto_reverse:${r.id}`,
      type: "auto_reverse" as const,
      title: `${tt?.name || "Music play"} · +${Number(r.points_awarded || 0).toFixed(2)} pts`,
      subtitle: `Auto-approved · ${r.task_assignments?.users?.name || r.task_assignments?.users?.email || "Unknown worker"}`,
      actorName: r.task_assignments?.users?.name || undefined,
      actorEmail: r.task_assignments?.users?.email,
      createdAt: r.auto_approved_at,
      openHref: "/audit",
    };
  });

  preview.group_applications = ((groupAppsRes.data || []) as unknown as Array<{
    id: number;
    status: string;
    requested_groups: number;
    requested_members: number;
    requested_tasks: number;
    price: number | null;
    created_at: string;
    users: { name: string | null; email: string } | null;
  }>).map((r) => ({
    key: `group_applications:${r.id}`,
    type: "group_applications" as const,
    title: `${r.users?.name || r.users?.email || "A user"} · ${r.requested_groups} groups`,
    subtitle: r.status === "awaiting_quote" ? "Needs a price quote" : "Paid — awaiting approval",
    actorName: r.users?.name || undefined,
    actorEmail: r.users?.email,
    createdAt: r.created_at,
    openHref: "/group-applications",
  }));

  return { counts, preview };
}
