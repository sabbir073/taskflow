import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { TasksView } from "@/components/shared/tasks-view";
import type { UserRole } from "@/types/database";
import Link from "next/link";
import { Btn } from "@/components/ui";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const user = await requireAuth();
  const isAdmin = (["super_admin", "admin"] as UserRole[]).includes(user.role);

  return (
    <div>
      <PageHeader title="Tasks" description={isAdmin ? "Manage all tasks and approve user-created tasks" : "Create tasks or complete assigned tasks"}
        actions={<Link href="/tasks/create"><Btn size="sm"><Plus className="w-4 h-4 mr-1" /> Create Task</Btn></Link>} />
      <TasksView isAdmin={isAdmin} userId={user.id} />
    </div>
  );
}
