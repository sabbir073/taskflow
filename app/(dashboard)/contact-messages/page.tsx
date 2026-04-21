import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { ContactMessagesView } from "@/components/shared/contact-messages-view";

export const metadata: Metadata = { title: "Contact Messages" };

export default async function ContactMessagesPage() {
  await requireRole(["super_admin", "admin"]);
  return (
    <div>
      <PageHeader
        title="Contact Messages"
        description="Messages sent through the public contact form on the landing page."
      />
      <ContactMessagesView />
    </div>
  );
}
