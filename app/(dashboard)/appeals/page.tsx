import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AppealsManager } from "@/components/shared/appeals-manager";

export const metadata: Metadata = { title: "Suspension Appeals" };

export default async function AppealsPage() {
  await requireRole(["super_admin", "admin"]);
  return (
    <div>
      <PageHeader title="Suspension Appeals" description="Review user appeals and reactivate accounts" />
      <AppealsManager />
    </div>
  );
}
