import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { GroupForm } from "@/components/shared/group-form";

export const metadata: Metadata = { title: "Create Group" };

export default async function CreateGroupPage() {
  await requireAuth(); // Any user can create groups

  return (
    <div>
      <PageHeader title="Create Group" description="Create a group and add members by email" />
      <GroupForm />
    </div>
  );
}
