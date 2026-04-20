import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { BroadcastView } from "@/components/shared/broadcast-view";

export const metadata: Metadata = { title: "Broadcast Notification" };

export default async function BroadcastPage() {
  await requireRole(["super_admin", "admin"]);

  return (
    <div>
      <PageHeader
        title="Broadcast Notification"
        description="Send an in-app notification to one or many users"
      />
      <BroadcastView />
    </div>
  );
}
