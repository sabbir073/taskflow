import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import ReportsView from "./reports-view-loader";

export const metadata: Metadata = { title: "Reports & Analytics" };

export default async function ReportsPage() {
  // Reports are viewable by staff (moderator + admin) and group leaders.
  await requireRole(["super_admin", "admin", "moderator", "group_leader"]);
  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Comprehensive data insights with charts and export" />
      <ReportsView />
    </div>
  );
}
