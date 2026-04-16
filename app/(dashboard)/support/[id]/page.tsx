import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { TicketDetailView } from "@/components/shared/ticket-detail-view";

export const metadata: Metadata = { title: "Ticket Detail" };

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) return <p>Invalid ticket</p>;

  return (
    <div>
      <PageHeader title="Ticket Detail" />
      <TicketDetailView
        ticketId={ticketId}
        currentUserId={user.id}
        isAdmin={["super_admin", "admin"].includes(user.role)}
      />
    </div>
  );
}
