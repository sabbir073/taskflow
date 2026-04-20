import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { BillingView } from "@/components/shared/billing-view";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  await requireAuth();
  return (
    <div>
      <PageHeader title="Billing" description="Your invoices and payment history" />
      <BillingView />
    </div>
  );
}
