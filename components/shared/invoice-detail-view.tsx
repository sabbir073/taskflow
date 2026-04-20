"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, Btn } from "@/components/ui";
import { ArrowLeft, Download, Printer, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useInvoice } from "@/hooks/use-invoices";
import { useAppSettings } from "@/components/providers/settings-provider";
import { formatDate } from "@/lib/utils";
import { buildInvoicePdf } from "@/lib/pdf/invoice";

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "error" | "default"; icon: typeof CheckCircle; color: string }> = {
  approved: { label: "PAID", variant: "success", icon: CheckCircle, color: "#10B981" },
  pending: { label: "AWAITING REVIEW", variant: "warning", icon: Clock, color: "#F59E0B" },
  rejected: { label: "REJECTED", variant: "error", icon: XCircle, color: "#EF4444" },
};

export function InvoiceDetailView({ paymentId }: { paymentId: number }) {
  const { data: invoice, isLoading } = useInvoice(paymentId);
  const settings = useAppSettings();
  const [downloading, setDownloading] = useState(false);

  if (isLoading) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading invoice...</CardContent></Card>;
  if (!invoice) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Invoice not found</CardContent></Card>;

  const user = invoice.users as Record<string, unknown> | undefined;
  const plan = invoice.plans as Record<string, unknown> | undefined;
  const pkg = invoice.point_packages as Record<string, unknown> | undefined;
  const method = invoice.payment_methods as Record<string, unknown> | undefined;

  const invNum = String(invoice.invoice_number || `#${paymentId}`);
  const purpose = String(invoice.purpose || "");
  const amount = Number(invoice.amount || 0);
  const currency = String(invoice.currency || "usd").toUpperCase();
  const status = String(invoice.status || "pending");
  const meta = STATUS_META[status] || STATUS_META.pending;
  const StatusIcon = meta.icon;

  const description =
    purpose === "points" && pkg
      ? `${String(pkg.name || "Points Package")} — ${Number(pkg.points || 0).toFixed(0)} credits`
      : plan
      ? `${String(plan.name || "")} plan subscription${plan.period ? ` (${String(plan.period)})` : ""}`
      : "Payment";

  const siteName = (settings.site_name as string) || "TaskFlow";

  function handlePrint() { window.print(); }

  async function handleDownloadPdf() {
    if (!invoice) return;
    const inv = invoice;
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = buildInvoicePdf(jsPDF as never, {
        invoiceNumber: invNum,
        status,
        createdAt: inv.created_at ? String(inv.created_at) : null,
        reviewedAt: inv.reviewed_at ? String(inv.reviewed_at) : null,
        billedToName: String(user?.name || "—"),
        billedToEmail: String(user?.email || ""),
        description,
        purpose,
        amount,
        currency,
        paymentMethod: String(method?.name || "—"),
        transactionId: String(inv.transaction_id || "—"),
        notes: inv.notes ? String(inv.notes) : null,
        reviewNotes: inv.review_notes ? String(inv.review_notes) : null,
        siteName,
      });
      doc.save(`${invNum}.pdf`);
      toast.success("Invoice downloaded");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Couldn't generate PDF — try Print instead");
    }
    setDownloading(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Action bar (hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/billing" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to invoices
        </Link>
        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </Btn>
          <Btn size="sm" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1" />
            )}
            {downloading ? "Generating..." : "Download PDF"}
          </Btn>
        </div>
      </div>

      {/* The invoice document */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none" id="invoice-document">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-accent px-8 py-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-black">
                {(siteName || "T").charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{siteName}</h1>
                <p className="text-xs text-white/80 mt-0.5">Social Media Task Exchange</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">Invoice</p>
              <p className="text-2xl font-bold font-mono mt-1">{invNum}</p>
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div
          className="px-8 py-4 flex items-center justify-between border-b border-border"
          style={{ backgroundColor: `${meta.color}10` }}
        >
          <div className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5" style={{ color: meta.color }} />
            <span className="text-sm font-bold" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </div>
          {!!invoice.reviewed_at && (
            <p className="text-xs text-muted-foreground">
              Reviewed on {formatDate(String(invoice.reviewed_at))}
            </p>
          )}
        </div>

        <div className="p-8 space-y-8">
          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Billed To</p>
              <p className="font-semibold">{String(user?.name || "—")}</p>
              <p className="text-sm text-muted-foreground">{String(user?.email || "")}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Issued</p>
              <p className="font-semibold">{invoice.created_at ? formatDate(String(invoice.created_at)) : "—"}</p>
              {!!invoice.reviewed_at && (
                <p className="text-xs text-muted-foreground mt-1">Paid on {formatDate(String(invoice.reviewed_at))}</p>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Items</p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-semibold uppercase text-muted-foreground">Description</th>
                  <th className="text-right py-2 text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-4">
                    <p className="font-medium">{description}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">Type: {purpose.replace("_", " ")}</p>
                  </td>
                  <td className="py-4 text-right font-semibold">{amount.toFixed(2)} {currency}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4 text-right font-semibold text-muted-foreground">Subtotal</td>
                  <td className="pt-4 text-right font-semibold">{amount.toFixed(2)} {currency}</td>
                </tr>
                <tr>
                  <td className="py-2 text-right text-sm text-muted-foreground">Tax</td>
                  <td className="py-2 text-right text-sm text-muted-foreground">0.00 {currency}</td>
                </tr>
                <tr className="border-t-2 border-foreground/80">
                  <td className="pt-3 text-right text-lg font-bold">Total</td>
                  <td className="pt-3 text-right text-lg font-bold">{amount.toFixed(2)} {currency}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment details */}
          <div className="rounded-xl border border-border/60 p-5 bg-muted/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Payment Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Payment Method</p>
                <p className="font-medium">{String(method?.name || "—")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transaction ID</p>
                <p className="font-mono text-xs font-medium break-all">{String(invoice.transaction_id || "—")}</p>
              </div>
              {!!invoice.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">User Notes</p>
                  <p className="text-sm">{String(invoice.notes).replace(/\[period:(monthly|half_yearly|yearly)\]\s*/, "")}</p>
                </div>
              )}
              {!!invoice.review_notes && (
                <div className="sm:col-span-2 pt-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">Admin Note</p>
                  <p className="text-sm">{String(invoice.review_notes)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className="flex justify-center pt-4">
            <div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2"
              style={{ borderColor: meta.color, backgroundColor: `${meta.color}10`, color: meta.color }}
            >
              <StatusIcon className="w-5 h-5" />
              <span className="font-bold tracking-wider">{meta.label}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-border bg-muted/20 text-center">
          <p className="text-xs text-muted-foreground">
            Thank you for your business. This is a computer-generated invoice from {siteName}.
          </p>
        </div>
      </div>
    </div>
  );
}
