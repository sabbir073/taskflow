import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsList } from "@/components/shared/notifications-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireAuth();
  return (
    <div>
      <PageHeader title="Notifications" description="Stay updated on your tasks and activity" />
      <NotificationsList />
    </div>
  );
}
