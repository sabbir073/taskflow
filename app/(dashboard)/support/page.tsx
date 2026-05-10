import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { isStaffRole } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { SupportView } from "@/components/shared/support-view";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const user = await requireAuth();
  const isAdmin = isStaffRole(user.role);
  return (
    <div>
      <PageHeader title="Support" description={isAdmin ? "Manage support tickets" : "Get help from our team"} />
      <SupportView isAdmin={isAdmin} />
    </div>
  );
}
