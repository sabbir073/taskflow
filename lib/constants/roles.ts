import type { UserRole } from "@/types";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 5,
  admin: 4,
  moderator: 3,
  group_leader: 2,
  user: 1,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
  group_leader: "Group Leader",
  user: "Member",
};

// Shared role groupings — use these instead of inlining ["super_admin","admin"]
// at every call site, so adding a new tier is a one-line change.
//
//   ADMIN_ROLES — restricted operations (audit, settings, plan CRUD, etc).
//   STAFF_ROLES — operations a moderator may also perform (review, broadcast,
//                 user management without role-promotion, payments, etc).
export const ADMIN_ROLES: readonly UserRole[] = ["super_admin", "admin"];
export const STAFF_ROLES: readonly UserRole[] = ["super_admin", "admin", "moderator"];

// Role-class predicates — preferred at call sites over `.includes()` on the
// arrays above, since session.user.role is typed loosely and the cast is
// already encapsulated here.
export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

// RBAC permissions matrix
export const PERMISSIONS = {
  view_dashboard: ["super_admin", "admin", "moderator", "group_leader", "user"],
  view_own_tasks: ["super_admin", "admin", "moderator", "group_leader", "user"],
  complete_tasks: ["super_admin", "admin", "moderator", "group_leader", "user"],
  create_tasks: ["super_admin", "admin", "moderator"],
  review_submissions: ["super_admin", "admin", "moderator"],
  broadcast: ["super_admin", "admin", "moderator"],
  approve_signup: ["super_admin", "admin", "moderator"],
  view_group_task_status: ["super_admin", "admin", "moderator", "group_leader"],
  manage_users: ["super_admin", "admin", "moderator"],
  manage_groups: ["super_admin", "admin", "moderator", "group_leader"],
  view_all_reports: ["super_admin", "admin", "moderator"],
  manage_notices: ["super_admin", "admin", "moderator"],
  manage_payments: ["super_admin", "admin", "moderator"],
  // Admin-only — moderators are deliberately excluded
  system_settings: ["super_admin", "admin"],
  landing_page_edit: ["super_admin", "admin"],
  manage_appeals: ["super_admin", "admin"],
  manage_popups: ["super_admin", "admin"],
  manage_plans: ["super_admin", "admin"],
  view_audit: ["super_admin", "admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function isAtLeast(role: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}
