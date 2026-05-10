import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogView } from "@/components/shared/audit-log-view";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditPage() {
  await requireRole(ADMIN_ROLES);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every privileged action taken by admins — role changes, bans, payments, plans."
      />
      <AuditLogView />
    </div>
  );
}
