import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { GroupsList } from "@/components/shared/groups-list";
import Link from "next/link";
import { Btn } from "@/components/ui";
import { Plus } from "lucide-react";
import type { UserRole } from "@/types/database";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage() {
  const user = await requireAuth();
  const isAdmin = (["super_admin", "admin"] as UserRole[]).includes(user.role);

  return (
    <div>
      <PageHeader title="Groups" description="Create groups, add members, and assign tasks"
        actions={<Link href="/groups/create"><Btn size="sm"><Plus className="w-4 h-4 mr-1" /> Create Group</Btn></Link>} />
      <GroupsList isAdmin={isAdmin} />
    </div>
  );
}
