import type { UserRole } from "@/types";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  group_leader: 2,
  user: 1,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  group_leader: "Group Leader",
  user: "Member",
};

// RBAC permissions matrix
export const PERMISSIONS = {
  view_dashboard: ["super_admin", "admin", "group_leader", "user"],
  view_own_tasks: ["super_admin", "admin", "group_leader", "user"],
  complete_tasks: ["super_admin", "admin", "group_leader", "user"],
  create_tasks: ["super_admin", "admin"],
  review_submissions: ["super_admin", "admin", "group_leader"],
  manage_users: ["super_admin", "admin"],
  manage_groups: ["super_admin", "admin", "group_leader"],
  view_all_reports: ["super_admin", "admin"],
  system_settings: ["super_admin", "admin"],
  landing_page_edit: ["super_admin", "admin"],
  manage_notices: ["super_admin", "admin"],
  manage_appeals: ["super_admin", "admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function isAtLeast(role: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}
