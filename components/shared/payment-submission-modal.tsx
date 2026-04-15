"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Input, Textarea, Label, Btn, Badge, FieldError } from "@/components/ui";
import { X, CheckCircle, ExternalLink, Wallet } from "lucide-react";
import { usePaymentMethods, useSubmitPayment } from "@/hooks/use-payments";
import { getUsdToBdtRate } from "@/lib/actions/payments";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  purpose: "subscription" | "points";
  planId?: number;
  packageId?: number;
  period?: "monthly" | "half_yearly" | "yearly";
  summary: {
    title: string;
    subtitle?: string;
    amount: number;
    currency: string;
  };
}

// Reusable payment flow used by plan upgrades + point purchases. Lets the user
// pick an admin-configured payment method, see its logo/QR/instructions, and
// submit a transaction ID for manual review.
export function PaymentSubmissionModal({ open, onClose, onSuccess, purpose, planId, packageId, period, summary }: Props) {
  const { data: methods } = usePaymentMethods();
  const { data: usdToBdtRate } = useQuery({ queryKey: ["usd-to-bdt-rate"], queryFn: getUsdToBdtRate });
  const submitPayment = useSubmitPayment();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [txId, setTxId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const method = useMemo(
    () => (methods || []).find((m) => (m.id as number) === selectedId),
    [methods, selectedId]
  );

  // Display amount converted to the chosen payment method's currency
  const displayPrice = useMemo(() => {
    const methodCurrency = method ? String((method as Record<string, unknown>).currency || "usd") : summary.currency;
    const baseCurrency = (summary.currency || "usd").toLowerCase();
    const target = methodCurrency.toLowerCase();
    const rate = Number(usdToBdtRate || 0);
    let amt = summary.amount;
    if (target !== baseCurrency && rate > 0) {
      if (baseCurrency === "usd" && target === "bdt") amt = summary.amount * rate;
      else if (baseCurrency === "bdt" && target === "usd") amt = summary.amount / rate;
    }
    return { amount: amt, currency: target };
  }, [method, summary.amount, summary.currency, usdToBdtRate]);

  function reset() {
    setSelectedId(null);
    setTxId("");
    setNotes("");
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!selectedId) { setError("Please select a payment method"); return; }
    if (!txId.trim()) { setError("Transaction ID is required"); return; }
    setError("");
    const r = await submitPayment.mutateAsync({
      purpose,
      plan_id: planId,
      package_id: packageId,
      period,
      payment_method_id: selectedId,
      transaction_id: txId.trim(),
      notes: notes.trim() || undefined,
    });
    if (r.success) {
      reset();
      onClose();
      onSuccess?.();
    }
  }

  if (!open) return null;

  const methodList = methods || [];
  const hasMethods = methodList.length > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border/60 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">Complete Payment</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{summary.title}{summary.subtitle ? ` — ${summary.subtitle}` : ""}</p>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/15">
            <span className="text-sm text-muted-foreground">Amount to pay</span>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{displayPrice.amount.toFixed(2)} {displayPrice.currency.toUpperCase()}</p>
              {displayPrice.currency !== summary.currency.toLowerCase() && (
                <p className="text-[11px] text-muted-foreground">≈ {summary.amount.toFixed(2)} {summary.currency.toUpperCase()}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {!hasMethods ? (
            <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 text-sm">
              No payment methods are available yet. Please contact an admin.
            </div>
          ) : (
            <>
              {/* Method picker */}
              <div className="space-y-2">
                <Label>Choose Payment Method *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {methodList.map((m) => {
                    const id = m.id as number;
                    const active = selectedId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                          {m.logo_url ? (
                            <img src={String(m.logo_url)} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Wallet className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{String(m.name || "")}</p>
                          <Badge variant="primary">{String(m.currency || "").toUpperCase()}</Badge>
                        </div>
                        {active && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method details */}
              {method && (
                <Card className="bg-muted/20 border-border/60">
                  <CardContent className="p-4 space-y-3">
                    {!!method.qr_code_url && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-48 h-48 rounded-xl border border-border bg-card flex items-center justify-center overflow-hidden">
                          <img src={String(method.qr_code_url)} alt="QR code" className="w-full h-full object-contain" />
                        </div>
                        <a
                          href={String(method.qr_code_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Open full size <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {!!method.instruction && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Instructions</p>
                        <p className="text-sm whitespace-pre-wrap">{String(method.instruction)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Transaction ID */}
              <div className="space-y-1.5">
                <Label>Transaction ID *</Label>
                <Input
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  placeholder="Paste the transaction ID from your payment"
                />
                <p className="text-[11px] text-muted-foreground">An admin will verify this against your payment.</p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the admin should know?" />
              </div>

              {error && <FieldError>{error}</FieldError>}
            </>
          )}
        </div>

        <div className="p-5 border-t border-border/60 flex gap-3 justify-end">
          <Btn variant="outline" type="button" onClick={handleClose}>Cancel</Btn>
          <Btn type="button" onClick={handleSubmit} isLoading={submitPayment.isPending} disabled={!hasMethods}>
            Submit Payment
          </Btn>
        </div>
      </div>
    </div>
  );
}
