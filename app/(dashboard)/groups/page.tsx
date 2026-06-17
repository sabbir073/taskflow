import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { isStaffRole } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { GroupsList } from "@/components/shared/groups-list";
import { resolveGroupAccess } from "@/lib/actions/group-access";
import { getServerClient } from "@/lib/db/supabase";
import Link from "next/link";
import { Btn } from "@/components/ui";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage() {
  const user = await requireAuth();
  const isAdmin = isStaffRole(user.role);
  // Only surface "Create Group" once the user actually has group access
  // (staff, an approved grant, or an active subscription).
  const access = await resolveGroupAccess(getServerClient(), user.id, user.role);

  return (
    <div>
      <PageHeader title="Groups" description="Create groups, add members, and assign tasks"
        actions={access.access ? <Link href="/groups/create"><Btn size="sm"><Plus className="w-4 h-4 mr-1" /> Create Group</Btn></Link> : undefined} />
      <GroupsList isAdmin={isAdmin} />
    </div>
  );
}
