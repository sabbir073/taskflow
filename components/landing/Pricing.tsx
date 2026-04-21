"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Sparkles,
  Crown,
  Rocket,
  Gem,
  Zap,
  Star,
  ListTodo,
  Users,
  Coins,
  LifeBuoy,
} from "lucide-react";
import { usePlans } from "@/hooks/use-plans";

// ============================================================================
// Landing-page pricing section — 100% DB-driven.
// Admins add/edit plans from /payments (Plans tab); we render exactly what's
// there: name, description, tier prices, limits, features, support level.
// ============================================================================

type Cycle = "monthly" | "six" | "yearly";

const cycles: { id: Cycle; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "six", label: "6 Months" },
  { id: "yearly", label: "Yearly" },
];

// Actual savings for a plan in a given cycle, computed from admin prices.
// Returns an integer percentage or 0 when there's no real discount.
// Example: monthly=499, half_yearly=2695 → fullPrice=2994, save=10%.
function computeSavings(plan: Record<string, unknown>, cycle: Cycle): number {
  if (cycle === "monthly") return 0;
  const monthly = Number(plan.price_monthly || 0);
  if (monthly <= 0) return 0;

  const months = cycle === "six" ? 6 : 12;
  const total = Number(cycle === "six" ? plan.price_half_yearly : plan.price_yearly) || 0;
  const fullPrice = monthly * months;
  if (total <= 0 || total >= fullPrice) return 0;
  return Math.round(((fullPrice - total) / fullPrice) * 100);
}

const ICONS = [Sparkles, Crown, Rocket, Gem, Zap, Star];
const ACCENTS = [
  "from-slate-500 to-slate-700",
  "from-brand-600 via-accent-500 to-orange-400",
  "from-orange-500 via-pink-500 to-purple-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
];

const CURRENCY_SYMBOL: Record<string, string> = { bdt: "৳", usd: "$" };
const SUPPORT_LABEL: Record<string, string> = {
  none: "No support",
  community: "Community support",
  priority: "Priority support",
};

// Features can arrive as an array (JSONB natively) or a stringified JSON
// array — normalise to a string[] we can iterate cleanly.
function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((f): f is string => typeof f === "string" && f.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Convert the DB's tier totals (price_half_yearly / price_yearly are stored
// as the TOTAL amount for the window) into a monthly-equivalent figure for
// marketing. Returns { amount, perMonthLabel, billedNote }.
function getDisplayPrice(
  plan: Record<string, unknown>,
  cycle: Cycle
): { amount: number; perMonthLabel: string; billedNote: string | null } {
  if (plan.period === "forever") {
    return { amount: Number(plan.price || 0), perMonthLabel: "one-time", billedNote: null };
  }
  if (cycle === "monthly") {
    return { amount: Number(plan.price_monthly || 0), perMonthLabel: "/ monthly", billedNote: null };
  }
  if (cycle === "six") {
    const total = Number(plan.price_half_yearly || 0);
    const symbol = CURRENCY_SYMBOL[String(plan.currency || "bdt")] || "";
    return {
      amount: total ? total / 6 : 0,
      perMonthLabel: "/ mo · billed 6m",
      billedNote: total ? `${symbol}${total.toLocaleString()} every 6 months` : null,
    };
  }
  // yearly
  const total = Number(plan.price_yearly || 0);
  const symbol = CURRENCY_SYMBOL[String(plan.currency || "bdt")] || "";
  return {
    amount: total ? total / 12 : 0,
    perMonthLabel: "/ mo · billed yearly",
    billedNote: total ? `${symbol}${total.toLocaleString()} billed yearly` : null,
  };
}

export default function Pricing({
  initialPlans,
}: {
  initialPlans?: Record<string, unknown>[];
}) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  // Server-rendered initialPlans removes the skeleton on first paint; the
  // hook still polls in the background so admin edits propagate.
  const { data: plans, isLoading } = usePlans(initialPlans);

  // Mark the middle plan "most popular" when there are 3+ active plans.
  const popularIndex = useMemo(() => {
    const n = plans?.length || 0;
    return n >= 3 ? Math.floor(n / 2) : -1;
  }, [plans]);

  // Max savings per cycle across all plans — drives the toggle pill.
  // Only shown when there's a real discount vs monthly × N.
  const toggleBadges = useMemo<Record<Cycle, string | null>>(() => {
    const empty: Record<Cycle, string | null> = { monthly: null, six: null, yearly: null };
    if (!plans || plans.length === 0) return empty;
    const maxSix = Math.max(0, ...plans.map((p) => computeSavings(p, "six")));
    const maxYear = Math.max(0, ...plans.map((p) => computeSavings(p, "yearly")));
    return {
      monthly: null,
      six: maxSix > 0 ? `Save up to ${maxSix}%` : null,
      yearly: maxYear > 0 ? `Save up to ${maxYear}%` : null,
    };
  }, [plans]);

  return (
    <section id="pricing" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-brand-50/60 to-transparent"
      />
      <div className="section-box">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">Subscription Plans</span>
          <h2 className="heading-lg mt-4">
            Choose a plan that <span className="gradient-text">fits your team</span>
          </h2>
          <p className="mt-4 text-ink-500">
            Start completely free. Upgrade any time for more tasks, bigger teams,
            and premium support. Cancel whenever you want.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1 shadow-sm">
            {cycles.map((c) => {
              const badge = toggleBadges[c.id];
              return (
                <button
                  key={c.id}
                  onClick={() => setCycle(c.id)}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-5 ${
                    cycle === c.id
                      ? "bg-brand-gradient text-white shadow-glow"
                      : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {c.label}
                    {badge && (
                      <span
                        className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-block ${
                          cycle === c.id
                            ? "bg-white/20 text-white"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading / empty states */}
        {isLoading && (
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[520px] rounded-3xl border border-ink-100 bg-white/60 animate-pulse"
              />
            ))}
          </div>
        )}
        {!isLoading && (!plans || plans.length === 0) && (
          <div className="mt-12 text-center text-ink-500">
            No plans available yet. Check back soon.
          </div>
        )}

        {!isLoading && plans && plans.length > 0 && (
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan, i) => {
              const Icon = ICONS[i % ICONS.length];
              const accent = ACCENTS[i % ACCENTS.length];
              const popular = i === popularIndex;
              const { amount, perMonthLabel, billedNote } = getDisplayPrice(plan, cycle);
              const currency = String(plan.currency || "bdt");
              const symbol = CURRENCY_SYMBOL[currency] || "";
              const features = parseFeatures(plan.features);
              const name = String(plan.name || "Plan");
              const description = String(plan.description || "");
              const maxTasks = plan.max_tasks == null ? null : Number(plan.max_tasks);
              const maxGroups = plan.max_groups == null ? null : Number(plan.max_groups);
              const credits = Number(plan.included_credits || 0);
              const supportLevel = String(plan.support_level || "none");
              const isFree = amount === 0;
              const savings = computeSavings(plan, cycle);
              const cta = isFree ? "Get Started Free" : popular ? "Subscribe Now" : `Go ${name}`;

              return (
                <motion.div
                  key={String(plan.id)}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white p-8 shadow-card ${
                    popular
                      ? "scale-[1.02] border-transparent ring-2 ring-brand-400"
                      : "border-ink-100"
                  }`}
                >
                  {popular && (
                    <>
                      <div
                        aria-hidden
                        className={`absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-3xl`}
                      />
                      <div className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-xl bg-brand-gradient px-4 py-1 text-xs font-bold text-white shadow-glow">
                        ⭐ Most Popular
                      </div>
                    </>
                  )}

                  <div className="mb-5 flex items-center gap-3">
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.4} />
                    </div>
                    <h3 className="text-2xl font-bold text-ink-900">{name}</h3>
                  </div>

                  {description && (
                    <p className="text-sm text-ink-500">{description}</p>
                  )}

                  <div className="mt-6 flex min-h-[64px] items-baseline gap-1.5">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${name}-${cycle}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="text-5xl font-extrabold tracking-tight text-ink-900"
                      >
                        {isFree ? "Free" : `${symbol}${Math.round(amount).toLocaleString()}`}
                      </motion.span>
                    </AnimatePresence>
                    {!isFree && (
                      <span className="text-sm text-ink-500">{perMonthLabel}</span>
                    )}
                  </div>

                  {/* Billed-total note + accurate per-plan savings chip.
                      `savings` is 0 when admin priced the cycle at or above
                      monthly × N — the chip disappears for that plan only. */}
                  {(billedNote || savings > 0) && (
                    <div className="-mt-3 mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      {billedNote && <span>{billedNote}</span>}
                      {savings > 0 && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Save {savings}%
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <QuotaChip
                      icon={ListTodo}
                      label="Tasks"
                      value={maxTasks == null ? "∞" : maxTasks}
                    />
                    <QuotaChip
                      icon={Users}
                      label="Groups"
                      value={maxGroups == null ? "∞" : maxGroups}
                    />
                    <QuotaChip
                      icon={Coins}
                      label="Credits"
                      value={credits}
                    />
                  </div>

                  <ul className="mt-6 space-y-3 text-sm">
                    {/* Admin-defined feature bullets come first, verbatim */}
                    {features.map((f, k) => (
                      <Feature key={`f-${k}`} text={f} />
                    ))}
                    {/* Append a support-level line so users can compare tiers at a glance */}
                    <Feature
                      icon={LifeBuoy}
                      text={SUPPORT_LABEL[supportLevel] || supportLevel}
                    />
                  </ul>

                  <a
                    href="/register"
                    className={`mt-8 w-full ${popular ? "btn-primary" : "btn-secondary"}`}
                  >
                    {cta}
                  </a>
                </motion.div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-ink-500">
          All paid plans include a{" "}
          <strong className="text-ink-800">14-day money-back guarantee</strong>.
          {plans && plans[0] && ` Prices shown in ${String(plans[0].currency || "BDT").toUpperCase()}.`}
        </p>
      </div>
    </section>
  );
}

function Feature({
  text,
  icon: Icon = Check,
}: {
  text: string;
  icon?: typeof Check;
}) {
  return (
    <li className="flex items-start gap-2 text-ink-700">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
      <span>{text}</span>
    </li>
  );
}

function QuotaChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListTodo;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/80 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-brand-600" />
      <div className="mt-1.5 text-lg font-bold text-ink-900">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
        {label}
      </div>
    </div>
  );
}
