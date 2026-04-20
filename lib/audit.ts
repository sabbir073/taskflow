import type { getServerClient } from "@/lib/db/supabase";

type DB = ReturnType<typeof getServerClient>;

// Known audit action keys — kept as a string union so the caller gets a
// typo-free autocomplete but new actions can still be added by widening the
// type (any arbitrary TEXT still lands in the DB).
export type AuditAction =
  | "role_change"
  | "status_change"
  | "approve_user"
  | "reject_user"
  | "delete_user"
  | "assign_points"
  | "approve_payment"
  | "reject_payment"
  | "approve_task"
  | "reject_task"
  | "delete_task"
  | "approve_group"
  | "reject_group"
  | "delete_group"
  | "create_plan"
  | "update_plan"
  | "delete_plan"
  | "assign_plan";

export type AuditTargetType =
  | "user"
  | "payment"
  | "task"
  | "group"
  | "plan"
  | "subscription";

// Fire-and-forget audit log writer. The originating action MUST NOT fail if
// the audit insert errors — audit is strictly forensic. Swallow everything.
export async function recordAudit(
  db: DB,
  actorId: string,
  action: AuditAction,
  targetType: AuditTargetType | null,
  targetId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.from("admin_audit_log").insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    } as never);
  } catch {
    // Silent — never block the real action on audit failure.
  }
}
