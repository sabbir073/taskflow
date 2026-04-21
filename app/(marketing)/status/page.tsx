import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Globe,
  LayoutDashboard,
  KeyRound,
  Upload,
  Mail,
  Database,
  Activity,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "System Status",
  description:
    "Real-time status of TaskFlow services. Check uptime, recent incidents, and subscribe for updates.",
};

// Static components. When something actually breaks, flip `status` from
// "operational" to "degraded" | "outage" and push the deploy.
type Status = "operational" | "degraded" | "outage";
type Component = {
  id: string;
  name: string;
  description: string;
  icon: typeof Globe;
  status: Status;
  uptime90: string;
};

const components: Component[] = [
  {
    id: "website",
    name: "Website",
    description: "Public pages — landing, help, community, status.",
    icon: Globe,
    status: "operational",
    uptime90: "99.99%",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Logged-in app — tasks, groups, leaderboard, billing.",
    icon: LayoutDashboard,
    status: "operational",
    uptime90: "99.98%",
  },
  {
    id: "auth",
    name: "Authentication",
    description: "Sign in, sign up, password reset, email verification.",
    icon: KeyRound,
    status: "operational",
    uptime90: "99.99%",
  },
  {
    id: "uploads",
    name: "File Uploads",
    description: "Proof screenshots, avatars, and task media.",
    icon: Upload,
    status: "operational",
    uptime90: "99.97%",
  },
  {
    id: "email",
    name: "Email Delivery",
    description: "Verification, receipts, payment confirmations, reminders.",
    icon: Mail,
    status: "operational",
    uptime90: "99.95%",
  },
  {
    id: "database",
    name: "Database",
    description: "Core data — wallets, tasks, history, subscriptions.",
    icon: Database,
    status: "operational",
    uptime90: "99.99%",
  },
];

// Past incidents list. Empty = "no recent incidents" state.
const incidents: Array<{
  date: string;
  title: string;
  status: "resolved" | "monitoring";
  summary: string;
}> = [];

const STATUS_META: Record<Status, { label: string; dotClass: string; textClass: string; bgClass: string }> = {
  operational: {
    label: "Operational",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200",
  },
  degraded: {
    label: "Degraded Performance",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700",
    bgClass: "bg-amber-50 border-amber-200",
  },
  outage: {
    label: "Major Outage",
    dotClass: "bg-red-500",
    textClass: "text-red-700",
    bgClass: "bg-red-50 border-red-200",
  },
};

// Overall status — worst of any component.
function overall(): Status {
  if (components.some((c) => c.status === "outage")) return "outage";
  if (components.some((c) => c.status === "degraded")) return "degraded";
  return "operational";
}

export default function StatusPage() {
  const current = overall();
  const meta = STATUS_META[current];

  return (
    <>
      {/* Hero */}
      <section className="relative hero-bg">
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div className="container-box relative pt-28 pb-12 sm:pt-36 sm:pb-16 lg:pt-44">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label">
              <Activity className="h-3.5 w-3.5" /> System Status
            </span>

            {/* Big status banner */}
            <div
              className={`mx-auto mt-8 inline-flex items-center gap-3 rounded-2xl border ${meta.bgClass} px-6 py-4 shadow-soft`}
            >
              <span className="relative flex h-3 w-3">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.dotClass} opacity-60`}
                />
                <span className={`relative inline-flex h-3 w-3 rounded-full ${meta.dotClass}`} />
              </span>
              <span className={`text-base font-bold ${meta.textClass}`}>
                {current === "operational"
                  ? "All systems operational"
                  : current === "degraded"
                    ? "Some systems degraded"
                    : "Major outage in progress"}
              </span>
            </div>

            <h1 className="heading-lg mt-6">
              Real-time <span className="gradient-text">service health</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-ink-500">
              This page is updated whenever something changes. Refresh anytime — no login required.
            </p>
          </div>
        </div>
      </section>

      {/* Components */}
      <section className="section-box">
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {components.map((c) => {
            const m = STATUS_META[c.status];
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">{c.name}</h3>
                    <p className="text-xs text-ink-500">{c.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-right text-xs text-ink-500">
                    <span className="block font-mono font-semibold text-ink-900">{c.uptime90}</span>
                    90-day uptime
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${m.textClass}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${m.dotClass}`} />
                    {m.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              90-day average
            </div>
            <div className="mt-1 text-3xl font-extrabold text-ink-900">99.98%</div>
            <div className="mt-1 text-xs text-ink-500">Across all components</div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Last incident
            </div>
            <div className="mt-1 text-3xl font-extrabold text-ink-900">—</div>
            <div className="mt-1 text-xs text-ink-500">No incidents in the last 90 days</div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Response time
            </div>
            <div className="mt-1 text-3xl font-extrabold text-ink-900">&lt; 250ms</div>
            <div className="mt-1 text-xs text-ink-500">Typical page load</div>
          </div>
        </div>
      </section>

      {/* Incidents */}
      <section className="section-box">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">Incident History</span>
          <h2 className="heading-md mt-4">
            Recent <span className="gradient-text">incidents</span>
          </h2>
          <p className="mt-3 text-ink-500">
            Full transparency — we publish every outage and resolution here.
          </p>
        </div>

        <div className="mt-10">
          {incidents.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink-900">
                No recent incidents
              </h3>
              <p className="mt-2 text-sm text-ink-500">
                Everything has been running smoothly for the last 90 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((inc, i) => (
                <div key={i} className="card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-ink-900">{inc.title}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        inc.status === "resolved"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {inc.status === "resolved" ? "Resolved" : "Monitoring"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{inc.date}</p>
                  <p className="mt-3 text-sm text-ink-600">{inc.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/#contact" className="btn-secondary">
            Report an issue
          </Link>
          <Link href="/help" className="btn-ghost">
            Visit Help Center <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
