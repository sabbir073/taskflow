"use client";

import Link from "next/link";
import {
  UserPlus, ListTodo, FileCheck, Wallet, Users, ShieldAlert,
  MessageCircle, Mail, Music, CheckCircle2, ArrowRight, Inbox as InboxIcon, Crown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Btn } from "@/components/ui";
import { useAdminInbox } from "@/hooks/use-inbox";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import type { InboxKey, InboxRow } from "@/lib/actions/inbox";

// Admin inbox — single triage view aggregating nine pending-queue surfaces.
// Each section's "Open" button deep-links to the existing source surface
// (which already owns approve/reject UX), so we don't duplicate action UI.

interface QueueMeta {
  label: string;
  icon: typeof UserPlus;
  // Where the "View all →" link in the tile points.
  surfaceHref: string;
  // Iconography tint — drives the small icon bubble's background.
  tint: string;
}

const QUEUE_META: Record<InboxKey, QueueMeta> = {
  users:        { label: "New signups",           icon: UserPlus,      surfaceHref: "/users",            tint: "bg-success/10 text-success" },
  tasks:        { label: "Tasks awaiting approval", icon: ListTodo,    surfaceHref: "/tasks",            tint: "bg-primary/10 text-primary" },
  items:        { label: "Bundle proof submissions", icon: FileCheck,  surfaceHref: "/tasks",            tint: "bg-accent/10 text-accent" },
  payments:     { label: "Payments to review",    icon: Wallet,        surfaceHref: "/payments",         tint: "bg-warning/10 text-warning" },
  groups:       { label: "Groups awaiting approval", icon: Users,      surfaceHref: "/groups",           tint: "bg-primary/10 text-primary" },
  appeals:      { label: "Suspension appeals",    icon: ShieldAlert,   surfaceHref: "/appeals",          tint: "bg-error/10 text-error" },
  tickets:      { label: "Open support tickets",  icon: MessageCircle, surfaceHref: "/support",          tint: "bg-accent/10 text-accent" },
  contact:      { label: "Contact messages",      icon: Mail,          surfaceHref: "/contact-messages", tint: "bg-warning/10 text-warning" },
  auto_reverse: { label: "Music auto-approvals (24h)", icon: Music,    surfaceHref: "/audit",            tint: "bg-success/10 text-success" },
  group_applications: { label: "Group applications", icon: Crown,      surfaceHref: "/group-applications", tint: "bg-primary/10 text-primary" },
};

// Order tiles render in. Roughly highest-urgency → lowest, so that admins
// scan and act on the things most likely to be time-sensitive first.
const QUEUE_ORDER: InboxKey[] = [
  "items",        // proof submissions — workers are blocked until reviewed
  "payments",     // money in motion
  "group_applications", // money + access grant
  "appeals",      // suspended user advocacy
  "users",        // new signups
  "tasks",        // creator tasks awaiting admin
  "groups",       // group submissions
  "tickets",      // support
  "contact",      // contact form (no SLA)
  "auto_reverse", // already approved; only matters for fraud detection
];

export function AdminInbox() {
  const { data, isLoading } = useAdminInbox();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading inbox…
        </CardContent>
      </Card>
    );
  }

  const counts = data?.counts;
  const preview = data?.preview;
  const total = counts?.totalPending ?? 0;

  // All-clear state — celebrate emptiness so the admin knows there's
  // genuinely nothing pending vs. a render bug.
  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <p className="font-semibold text-lg">All caught up</p>
          <p className="text-sm text-muted-foreground">
            Nothing waiting on you across users, tasks, payments, groups, appeals, support or audits.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick-stats tile grid — every queue gets a tile (including zeros)
          so the admin can see at a glance what's empty vs. what's busy.
          Non-zero tiles render in branded tint; zeros stay muted. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {QUEUE_ORDER.map((key) => {
          const meta = QUEUE_META[key];
          const Icon = meta.icon;
          const count = counts?.[key] ?? 0;
          const isEmpty = count === 0;
          return (
            <Link
              key={key}
              href={meta.surfaceHref}
              className={`group block rounded-2xl border p-4 transition ${
                isEmpty
                  ? "border-border/40 bg-muted/20 hover:border-border/60"
                  : "border-border bg-card hover:border-foreground/20 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.tint} ${isEmpty ? "opacity-40" : ""}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-2xl font-bold tabular-nums ${isEmpty ? "text-muted-foreground/40" : ""}`}>
                  {count}
                </span>
              </div>
              <p className={`mt-3 text-xs font-medium ${isEmpty ? "text-muted-foreground/60" : "text-foreground"}`}>
                {meta.label}
              </p>
              {!isEmpty && (
                <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1 group-hover:text-primary">
                  View all <ArrowRight className="w-3 h-3" />
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {/* One Card per non-empty queue with up to 5 preview rows. */}
      {QUEUE_ORDER.filter((k) => (counts?.[k] ?? 0) > 0).map((key) => {
        const meta = QUEUE_META[key];
        const rows = preview?.[key] || [];
        const Icon = meta.icon;
        const count = counts?.[key] ?? 0;
        return (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.tint}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{meta.label}</CardTitle>
                  <CardDescription className="text-xs truncate">
                    {count} pending {count > rows.length && `· showing latest ${rows.length}`}
                  </CardDescription>
                </div>
              </div>
              <Link href={meta.surfaceHref} className="shrink-0">
                <Btn variant="ghost" size="sm">
                  <span className="hidden sm:inline">View all </span><ArrowRight className="w-3.5 h-3.5" />
                </Btn>
              </Link>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {rows.map((row) => (
                <InboxRowItem key={row.key} row={row} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function InboxRowItem({ row }: { row: InboxRow }) {
  const initials = getInitials(row.actorName || row.actorEmail || row.title || "?");
  // Whole row is the deep-link (bigger tap target, no cramped Open button on
  // mobile). Time is folded into the meta line so the row fits 375px cleanly.
  return (
    <Link
      href={row.openHref}
      className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background hover:border-border hover:bg-muted/30 transition"
    >
      <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary/15 to-accent/15 flex items-center justify-center text-xs font-bold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{row.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {row.subtitle ? `${row.subtitle} · ` : ""}{formatRelativeTime(row.createdAt)}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}

// Helper export — useful if other surfaces (dashboard) ever want to embed
// a single tile or row from this inbox without re-implementing the layout.
export { InboxIcon };
