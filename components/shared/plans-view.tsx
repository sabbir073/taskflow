"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Btn, Badge } from "@/components/ui";
import { CheckCircle, Sparkles, Coins, Package, Lock, ListTodo, Users as UsersIcon, Headphones, Calendar, AlertTriangle } from "lucide-react";
import { usePlans, useMySubscription, useSubscribe, useMyQuotaUsage } from "@/hooks/use-plans";
import { usePointPackages } from "@/hooks/use-payments";
import { useAppSettings } from "@/components/providers/settings-provider";
import { PaymentSubmissionModal } from "./payment-submission-modal";
import { formatDate } from "@/lib/utils";

type BillingPeriod = "monthly" | "half_yearly" | "yearly";
type PayTarget =
  | { kind: "plan"; planId: number; name: string; price: number; period: BillingPeriod; currency: string }
  | { kind: "package"; packageId: number; name: string; points: number; price: number; currency: string };

const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: "Monthly",
  half_yearly: "6 Months",
  yearly: "Yearly",
};

function currencySymbol(code: string): string {
  const c = (code || "usd").toLowerCase();
  if (c === "bdt") return "৳";
  if (c === "usd") return "$";
  return code.toUpperCase() + " ";
}

export function PlansView() {
  const settings = useAppSettings();
  const subscriptionRequired = settings.require_subscription === true;

  const { data: plans, isLoading } = usePlans();
  const { data: currentSub } = useMySubscription();
  const subscribeMutation = useSubscribe();
  const { data: packages } = usePointPackages();
  const { data: quota } = useMyQuotaUsage();

  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<Record<number, BillingPeriod>>({});

  const currentPlanId = currentSub ? Number((currentSub as Record<string, unknown>).plan_id) : null;

  // When subscriptions aren't required, everyone has max plan — hide the entire page
  if (!subscriptionRequired) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="py-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Plans disabled</p>
            <p className="text-sm text-muted-foreground mt-1">
              Subscriptions aren&apos;t required on this platform. You already have full access.
            </p>
          </div>
          <Link href="/dashboard">
            <Btn variant="outline" size="sm">Back to dashboard</Btn>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent><div className="h-64 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Current plan + quota card */}
      {quota && quota.planName && (
        <QuotaCard quota={quota} />
      )}

      {/* Subscription plans */}
      <section>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose a plan that fits your team</p>
        </div>
        {/* pt-6 leaves room for the -top-3 "Most Popular" / "Current Plan" ribbons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6">
          {(plans || []).map((plan, i) => {
            const id = plan.id as number;
            const name = String(plan.name || "");
            const currency = String(plan.currency || "usd");
            const description = String(plan.description || "");
            const rawFeatures = plan.features;
            const features: string[] = Array.isArray(rawFeatures)
              ? rawFeatures as string[]
              : typeof rawFeatures === "string"
              ? (() => { try { const p = JSON.parse(rawFeatures); return Array.isArray(p) ? p : []; } catch { return []; } })()
              : [];
            const maxTasks = plan.max_tasks as number | null | undefined;
            const maxGroups = plan.max_groups as number | null | undefined;
            const credits = Number(plan.included_credits || 0);
            const support = String(plan.support_level || "none");
            const isCurrent = id === currentPlanId;
            const isPopular = i === 1;
            const sym = currencySymbol(currency);

            // Available tiers — hide ones the admin left blank
            const tiers: { key: BillingPeriod; price: number }[] = [];
            if (plan.price_monthly != null) tiers.push({ key: "monthly", price: Number(plan.price_monthly) });
            if (plan.price_half_yearly != null) tiers.push({ key: "half_yearly", price: Number(plan.price_half_yearly) });
            if (plan.price_yearly != null) tiers.push({ key: "yearly", price: Number(plan.price_yearly) });
            if (tiers.length === 0) {
              const fallbackPrice = Number(plan.price || 0);
              tiers.push({ key: (String(plan.period || "monthly") as BillingPeriod), price: fallbackPrice });
            }
            const selectedPeriod: BillingPeriod = selectedPeriods[id] || tiers[0].key;
            const activeTier = tiers.find((t) => t.key === selectedPeriod) || tiers[0];
            const displayPrice = activeTier.price;
            const isFree = displayPrice === 0;

            return (
              <Card key={id} className={`relative overflow-visible ${isPopular ? "border-primary shadow-xl shadow-primary/10 md:scale-[1.02]" : ""} ${isCurrent ? "ring-2 ring-success/40" : ""}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-[11px] font-bold flex items-center gap-1 shadow-lg shadow-primary/30 whitespace-nowrap z-10">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}
                {isCurrent && !isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-success text-white text-[11px] font-bold flex items-center gap-1 shadow-lg shadow-success/30 whitespace-nowrap z-10">
                    <CheckCircle className="w-3 h-3" /> Current Plan
                  </div>
                )}
                {isCurrent && isPopular && (
                  <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-success text-white text-[11px] font-bold whitespace-nowrap z-10 shadow-lg shadow-success/30">
                    Current
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold">{name}</h3>
                  {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}

                  {/* Period picker */}
                  {tiers.length > 1 && (
                    <div className="grid grid-cols-3 gap-1 mt-4 p-1 rounded-xl bg-muted">
                      {tiers.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setSelectedPeriods((prev) => ({ ...prev, [id]: t.key }))}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            selectedPeriod === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {PERIOD_LABEL[t.key]}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-bold">{isFree ? "Free" : `${sym}${displayPrice.toFixed(0)}`}</span>
                    {!isFree && <span className="text-muted-foreground"> / {PERIOD_LABEL[selectedPeriod].toLowerCase()}</span>}
                  </div>

                  {/* Structured limits */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <div className="p-3 rounded-xl bg-muted/40 text-center">
                      <ListTodo className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold">{maxTasks ?? "∞"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tasks</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 text-center">
                      <UsersIcon className="w-4 h-4 text-accent mx-auto mb-1" />
                      <p className="text-lg font-bold">{maxGroups ?? "∞"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Groups</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 text-center">
                      <Coins className="w-4 h-4 text-warning mx-auto mb-1" />
                      <p className="text-lg font-bold">{credits.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Credits</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 text-center">
                      <Headphones className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-xs font-bold capitalize">
                        {support === "none" ? "No support" : support}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Support</p>
                    </div>
                  </div>

                  {features.length > 0 && (
                    <ul className="space-y-2 mb-8">
                      {features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-success shrink-0" />
                          {typeof f === "string" ? f : String(f)}
                        </li>
                      ))}
                    </ul>
                  )}

                  {isCurrent && !(quota?.isExpired) ? (
                    <Btn variant="outline" className="w-full" disabled>Current Plan</Btn>
                  ) : isFree ? (
                    <Btn
                      variant="outline"
                      className="w-full"
                      isLoading={subscribeMutation.isPending}
                      onClick={() => subscribeMutation.mutate(id)}
                    >
                      Get Started
                    </Btn>
                  ) : (
                    <Btn
                      variant={isPopular ? "primary" : "outline"}
                      className="w-full"
                      onClick={() => setPayTarget({ kind: "plan", planId: id, name, price: displayPrice, period: selectedPeriod, currency })}
                    >
                      {isCurrent && quota?.isExpired ? "Renew" : "Subscribe"}
                    </Btn>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Buy extra points */}
      {(packages && packages.length > 0) && (
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Coins className="w-6 h-6 text-warning" /> Buy Extra Points
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Top up your wallet with extra credits</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {packages.map((p) => {
              const id = p.id as number;
              const name = String(p.name || "");
              const points = Number(p.points || 0);
              const price = Number(p.price || 0);
              const currency = String(p.currency || "usd");
              const description = String(p.description || "");

              return (
                <Card key={id} className="hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning/20 to-primary/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-semibold">{name}</p>
                        <Badge variant="warning">{currency.toUpperCase()}</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-primary">{points.toFixed(0)} pts</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        for <span className="font-semibold text-foreground">{price.toFixed(2)} {currency.toUpperCase()}</span>
                      </p>
                    </div>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                    <Btn
                      className="w-full"
                      onClick={() => setPayTarget({ kind: "package", packageId: id, name, points, price, currency })}
                    >
                      Buy Now
                    </Btn>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Payment modal */}
      {payTarget && payTarget.kind === "plan" && (
        <PaymentSubmissionModal
          open
          onClose={() => setPayTarget(null)}
          purpose="subscription"
          planId={payTarget.planId}
          period={payTarget.period}
          summary={{
            title: `${payTarget.name} plan`,
            subtitle: PERIOD_LABEL[payTarget.period],
            amount: payTarget.price,
            currency: payTarget.currency,
          }}
        />
      )}
      {payTarget && payTarget.kind === "package" && (
        <PaymentSubmissionModal
          open
          onClose={() => setPayTarget(null)}
          purpose="points"
          packageId={payTarget.packageId}
          summary={{
            title: payTarget.name,
            subtitle: `${payTarget.points.toFixed(0)} points`,
            amount: payTarget.price,
            currency: payTarget.currency,
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Quota card — current plan + task/group usage + expiry
// ============================================================================
function QuotaCard({ quota }: { quota: NonNullable<ReturnType<typeof useMyQuotaUsage>["data"]> }) {
  const { planName, periodType, tasksUsed, tasksLimit, groupsUsed, groupsLimit, expiresAt, isExpired } = quota;
  const tasksPct = tasksLimit ? Math.min(100, Math.round((tasksUsed / tasksLimit) * 100)) : 0;
  const groupsPct = groupsLimit ? Math.min(100, Math.round((groupsUsed / groupsLimit) * 100)) : 0;
  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;

  // State → header gradient
  const gradientClass = isExpired
    ? "from-error/20 via-error/5 to-transparent"
    : daysLeft != null && daysLeft <= 7
    ? "from-warning/20 via-warning/5 to-transparent"
    : "from-primary/20 via-accent/10 to-transparent";

  const borderClass = isExpired
    ? "border-error/40"
    : daysLeft != null && daysLeft <= 7
    ? "border-warning/40"
    : "border-primary/20";

  return (
    <Card className={`overflow-hidden ${borderClass}`}>
      {/* Gradient header strip */}
      <div className={`relative bg-gradient-to-br ${gradientClass} p-5 sm:p-6 border-b border-border/40`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Current Plan</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <h2 className="text-2xl font-bold">{planName}</h2>
              {periodType && <Badge variant="primary">{PERIOD_LABEL[periodType as BillingPeriod] || periodType}</Badge>}
              {isExpired && <Badge variant="error">Expired</Badge>}
              {!isExpired && daysLeft != null && daysLeft <= 7 && <Badge variant="warning">Expires in {daysLeft}d</Badge>}
              {!isExpired && daysLeft != null && daysLeft > 7 && <Badge variant="success">Active</Badge>}
            </div>
            {expiresAt && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {isExpired ? "Expired on" : "Renews on"} <span className="font-medium text-foreground">{formatDate(expiresAt)}</span>
              </p>
            )}
          </div>
          {isExpired && (
            <div className="flex items-center gap-2 text-sm text-error font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>Renew below to restore access</span>
            </div>
          )}
        </div>
      </div>

      {/* Quota usage grid */}
      <CardContent className="p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <QuotaMeter
            icon={<ListTodo className="w-4 h-4" />}
            label="Tasks"
            used={tasksUsed}
            limit={tasksLimit}
            percent={tasksPct}
            accent="text-primary"
            accentBg="bg-primary/10"
          />
          <QuotaMeter
            icon={<UsersIcon className="w-4 h-4" />}
            label="Groups"
            used={groupsUsed}
            limit={groupsLimit}
            percent={groupsPct}
            accent="text-accent"
            accentBg="bg-accent/10"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function QuotaMeter({
  icon, label, used, limit, percent, accent, accentBg,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
  percent: number;
  accent: string;
  accentBg: string;
}) {
  const isUnlimited = limit == null;
  const remaining = isUnlimited ? null : Math.max(0, limit - used);
  const barColor = percent >= 100 ? "bg-error" : percent >= 80 ? "bg-warning" : "bg-primary";

  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center ${accent}`}>
            {icon}
          </div>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        {isUnlimited ? (
          <Badge variant="primary">Unlimited</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{remaining}</span> left
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold">{used}</span>
        <span className="text-sm text-muted-foreground">/ {isUnlimited ? "∞" : limit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${isUnlimited ? 0 : percent}%` }}
        />
      </div>
    </div>
  );
}
