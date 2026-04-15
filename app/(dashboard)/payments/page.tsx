import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentsAdmin } from "@/components/shared/payments-admin";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await requireRole(["super_admin", "admin"]);
  return (
    <div>
      <PageHeader title="Payments" description="Manage payment methods, point packages, and review transactions" />
      <PaymentsAdmin />
    </div>
  );
}
