import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { PopupsManager } from "@/components/shared/popups-manager";

export const metadata: Metadata = { title: "Manage Popups" };

export default async function PopupsPage() {
  await requireRole(["super_admin", "admin"]);
  return (
    <div>
      <PageHeader title="Popups" description="Create and manage popups shown on the website or user dashboard" />
      <PopupsManager />
    </div>
  );
}
