"use client";

import dynamic from "next/dynamic";

// Recharts (~95 KB gz) is the only consumer of this view's chart bundle.
// Splitting via next/dynamic { ssr: false } means the JS chunk for the
// charts is fetched only after the reports route hydrates — the initial
// HTML shell paints first, then the charts replace the skeleton.
//
// Admin reports page is low-traffic relative to dashboard/tasks, so this
// trades a bit of perceived latency on /reports for a smaller shared
// chunk. Non-admins can't reach this route at all.
const ReportsView = dynamic(
  () => import("@/components/shared/reports-view").then((m) => m.ReportsView),
  {
    ssr: false,
    loading: () => (
      <div className="p-12 text-center text-sm text-muted-foreground">
        <div className="w-8 h-8 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading reports…
      </div>
    ),
  },
);

export default ReportsView;
