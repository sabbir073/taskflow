import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { GroupApplicationsManager } from "@/components/shared/group-applications-manager";

export const metadata: Metadata = { title: "Group Applications" };

export default async function GroupApplicationsPage() {
  await requireRole(ADMIN_ROLES);
  return (
    <div>
      <PageHeader title="Group Applications" description="Review group-access requests, set pricing, and grant Group Leader access." />
      <GroupApplicationsManager />
    </div>
  );
}
