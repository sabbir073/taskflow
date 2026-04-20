"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, Input, Select, Btn, Badge } from "@/components/ui";
import { FileText, Search, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react";
import { useMyInvoices } from "@/hooks/use-invoices";
import { EmptyState } from "./empty-state";
import { formatDate } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "error" | "default"; icon: typeof CheckCircle }> = {
  approved: { label: "Paid", variant: "success", icon: CheckCircle },
  pending: { label: "Awaiting Review", variant: "warning", icon: Clock },
  rejected: { label: "Rejected", variant: "error", icon: XCircle },
};

export function BillingView() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyInvoices({ page, pageSize: 20, status: statusFilter || undefined });

  const items = (data?.data || []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const inv = String(p.invoice_number || "").toLowerCase();
    const tx = String(p.transaction_id || "").toLowerCase();
    return inv.includes(q) || tx.includes(q);
  });
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoice # or transaction id..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-48">
          <option value="">All statuses</option>
          <option value="pending">Awaiting Review</option>
          <option value="approved">Paid</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices yet" description="Your invoices will appear here after you make a payment." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const id = item.id as number;
                    const invNum = String(item.invoice_number || `#${id}`);
                    const purpose = String(item.purpose || "");
                    const plan = item.plans as Record<string, unknown> | undefined;
                    const pkg = item.point_packages as Record<string, unknown> | undefined;
                    const method = item.payment_methods as Record<string, unknown> | undefined;
                    const description = purpose === "points" && pkg
                      ? `${String(pkg.name || "")} (${Number(pkg.points || 0).toFixed(0)} pts)`
                      : plan ? String(plan.name || "Plan") : "Payment";
                    const amount = Number(item.amount || 0);
                    const currency = String(item.currency || "usd").toUpperCase();
                    const status = String(item.status || "pending");
                    const meta = STATUS_META[status] || STATUS_META.pending;
                    const Icon = meta.icon;

                    return (
                      <tr key={id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/billing/${id}`} className="font-mono text-xs font-semibold hover:text-primary">
                            {invNum}
                          </Link>
                          <p className="text-[10px] text-muted-foreground mt-0.5">TX: {String(item.transaction_id || "-")}</p>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{item.created_at ? formatDate(String(item.created_at)) : "-"}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium capitalize">{purpose.replace("_", " ")}</p>
                          <p className="text-[11px] text-muted-foreground">{description} &middot; {String(method?.name || "")}</p>
                        </td>
                        <td className="px-5 py-3 font-semibold">{amount.toFixed(2)} {currency}</td>
                        <td className="px-5 py-3">
                          <Badge variant={meta.variant}><Icon className="w-3 h-3 mr-1" /> {meta.label}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/billing/${id}`}>
                            <Btn variant="ghost" size="sm">View <ExternalLink className="w-3 h-3 ml-1" /></Btn>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({data?.total ?? 0} invoices)</p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
