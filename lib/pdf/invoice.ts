import type { jsPDF as JsPDFType } from "jspdf";

export type InvoicePdfInput = {
  invoiceNumber: string;
  status: "approved" | "pending" | "rejected" | string;
  createdAt?: string | null;
  reviewedAt?: string | null;
  billedToName: string;
  billedToEmail: string;
  description: string;
  purpose: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  notes?: string | null;
  reviewNotes?: string | null;
  siteName: string;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  approved: "PAID",
  pending: "AWAITING REVIEW",
  rejected: "REJECTED",
};

const STATUS_RGB: Record<string, [number, number, number]> = {
  approved: [16, 185, 129],
  pending: [245, 158, 11],
  rejected: [239, 68, 68],
};

// Shared jsPDF builder — same output on client (download button) and server
// (email attachment). Accepts a jsPDF constructor so the caller controls how
// the library is loaded (dynamic import on client, direct require on server).
export function buildInvoicePdf(
  JsPDF: new (opts?: Record<string, unknown>) => JsPDFType,
  d: InvoicePdfInput
): JsPDFType {
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const margin = 15;
  let y = margin;

  const [sr, sg, sb] = STATUS_RGB[d.status] || STATUS_RGB.pending;
  const statusLabel = STATUS_LABEL[d.status] || d.status.toUpperCase();

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(d.siteName, margin, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Social Media Task Exchange", margin, 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INVOICE", pageW - margin, 18, { align: "right" });
  doc.setFontSize(16);
  doc.text(d.invoiceNumber, pageW - margin, 27, { align: "right" });
  y = 50;

  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(margin, y, 50, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(statusLabel, margin + 25, y + 6, { align: "center" });
  if (d.reviewedAt) {
    doc.setTextColor(110, 110, 110);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Reviewed on ${fmtDate(d.reviewedAt)}`, pageW - margin, y + 6, { align: "right" });
  }
  y += 18;

  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BILLED TO", margin, y);
  doc.text("ISSUED", pageW - margin, y, { align: "right" });
  y += 5;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(d.billedToName || "—", margin, y);
  doc.text(fmtDate(d.createdAt), pageW - margin, y, { align: "right" });
  y += 5;
  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(d.billedToEmail || "", margin, y);
  if (d.reviewedAt) {
    doc.text(`Paid on ${fmtDate(d.reviewedAt)}`, pageW - margin, y, { align: "right" });
  }
  y += 12;

  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ITEMS", margin, y);
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.text("DESCRIPTION", margin, y);
  doc.text("AMOUNT", pageW - margin, y, { align: "right" });
  y += 3;
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const descLines = doc.splitTextToSize(d.description, pageW - margin * 2 - 40) as string[];
  doc.text(descLines, margin, y);
  doc.text(`${d.amount.toFixed(2)} ${d.currency}`, pageW - margin, y, { align: "right" });
  y += descLines.length * 5;
  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Type: ${d.purpose.replace("_", " ")}`, margin, y);
  y += 8;
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal", pageW - margin - 40, y, { align: "right" });
  doc.setTextColor(20, 20, 20);
  doc.text(`${d.amount.toFixed(2)} ${d.currency}`, pageW - margin, y, { align: "right" });
  y += 6;
  doc.setTextColor(110, 110, 110);
  doc.text("Tax", pageW - margin - 40, y, { align: "right" });
  doc.text(`0.00 ${d.currency}`, pageW - margin, y, { align: "right" });
  y += 4;
  doc.setLineWidth(0.5);
  doc.setDrawColor(20, 20, 20);
  doc.line(pageW - margin - 60, y, pageW - margin, y);
  y += 6;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total", pageW - margin - 40, y, { align: "right" });
  doc.text(`${d.amount.toFixed(2)} ${d.currency}`, pageW - margin, y, { align: "right" });
  y += 14;

  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(220, 220, 220);
  const boxY = y;
  const boxH = d.notes || d.reviewNotes ? 48 : 28;
  doc.roundedRect(margin, boxY, pageW - margin * 2, boxH, 2, 2, "FD");
  y += 6;
  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PAYMENT DETAILS", margin + 4, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Payment Method", margin + 4, y);
  doc.text("Transaction ID", margin + 90, y);
  y += 5;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(d.paymentMethod || "—", margin + 4, y);
  const txId = d.transactionId || "—";
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(txId.length > 30 ? txId.slice(0, 30) + "…" : txId, margin + 90, y);
  y += 8;
  if (d.notes) {
    doc.setTextColor(110, 110, 110);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("User Notes", margin + 4, y);
    y += 5;
    doc.setTextColor(20, 20, 20);
    const noteText = d.notes.replace(/\[period:(monthly|half_yearly|yearly)\]\s*/, "");
    const noteLines = doc.splitTextToSize(noteText, pageW - margin * 2 - 8) as string[];
    doc.text(noteLines.slice(0, 2), margin + 4, y);
    y += noteLines.slice(0, 2).length * 5;
  }
  y = boxY + boxH + 10;

  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    `Thank you for your business. This is a computer-generated invoice from ${d.siteName}.`,
    pageW / 2,
    285,
    { align: "center" }
  );

  return doc;
}

// Server-side helper — builds the PDF and returns a Buffer for nodemailer.
export async function generateInvoicePdfBuffer(d: InvoicePdfInput): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = buildInvoicePdf(jsPDF as unknown as new (opts?: Record<string, unknown>) => JsPDFType, d);
  const ab = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(ab);
}
