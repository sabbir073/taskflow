import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { GroupForm } from "@/components/shared/group-form";
import { resolveGroupAccess } from "@/lib/actions/group-access";
import { getServerClient } from "@/lib/db/supabase";

export const metadata: Metadata = { title: "Create Group" };

export default async function CreateGroupPage() {
  const user = await requireAuth();
  // Group creation requires group access (grant or active subscription).
  const access = await resolveGroupAccess(getServerClient(), user.id, user.role);
  if (!access.access) redirect("/groups");

  return (
    <div>
      <PageHeader title="Create Group" description="Create a group and add members by email" />
      <GroupForm />
    </div>
  );
}
