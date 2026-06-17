import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { STAFF_ROLES } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { AdminInbox } from "@/components/shared/admin-inbox";

export const metadata: Metadata = { title: "Inbox" };

// Central staff inbox — aggregates the nine "pending approval" queues
// (users, tasks, item submissions, payments, groups, appeals, support,
// contact, audit reversal) so the admin doesn't hop between routes to
// clear their day. Each row deep-links back to the source surface for
// the actual approve/reject UX.
export default async function InboxPage() {
  await requireRole(STAFF_ROLES);

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Everything waiting on you — across users, tasks, payments, groups, appeals, support, and audits."
      />
      <AdminInbox />
    </div>
  );
}
