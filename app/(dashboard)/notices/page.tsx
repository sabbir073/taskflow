import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { STAFF_ROLES } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { NoticesManager } from "@/components/shared/notices-manager";

export const metadata: Metadata = { title: "Manage Notices" };

export default async function NoticesPage() {
  await requireRole(STAFF_ROLES);
  return (
    <div>
      <PageHeader title="Notices" description="Publish announcements shown on every user's dashboard" />
      <NoticesManager />
    </div>
  );
}
