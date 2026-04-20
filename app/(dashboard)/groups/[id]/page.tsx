import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { getGroupById } from "@/lib/actions/groups";
import { PageHeader } from "@/components/shared/page-header";
import { GroupDetail } from "@/components/shared/group-detail";
import { ItemGone } from "@/components/shared/item-gone";
import { notFound } from "next/navigation";
import type { UserRole } from "@/types/database";

export const metadata: Metadata = { title: "Group Details" };

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const groupId = parseInt(id, 10);
  if (isNaN(groupId)) notFound();

  const data = await getGroupById(groupId);
  // Friendly fallback instead of 404 for deleted groups — notification
  // links frequently point to groups that got removed.
  if (!data) {
    return (
      <div>
        <PageHeader title="Group" />
        <ItemGone kind="group" backHref="/groups" backLabel="Back to groups" />
      </div>
    );
  }

  const isAdmin = (["super_admin", "admin"] as UserRole[]).includes(user.role);

  return (
    <div>
      <PageHeader title={String(data.group.name || "Group")} />
      <GroupDetail data={data} currentUserId={user.id} isAdmin={isAdmin} />
    </div>
  );
}
