import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsView } from "@/components/shared/reports-view";

export const metadata: Metadata = { title: "Reports & Analytics" };

export default async function ReportsPage() {
  await requireRole(["super_admin", "admin", "group_leader"]);
  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Comprehensive data insights with charts and export" />
      <ReportsView />
    </div>
  );
}
