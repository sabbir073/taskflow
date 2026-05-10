import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { STAFF_ROLES } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentsAdmin } from "@/components/shared/payments-admin";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await requireRole(STAFF_ROLES);
  return (
    <div>
      <PageHeader title="Payments" description="Manage payment methods, point packages, and review transactions" />
      <PaymentsAdmin />
    </div>
  );
}
