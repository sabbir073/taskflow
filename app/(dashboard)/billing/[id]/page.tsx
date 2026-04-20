import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { InvoiceDetailView } from "@/components/shared/invoice-detail-view";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const paymentId = parseInt(id, 10);
  if (isNaN(paymentId)) return <p>Invalid invoice</p>;

  return <InvoiceDetailView paymentId={paymentId} />;
}
