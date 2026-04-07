import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { getTaskById } from "@/lib/actions/tasks";
import { PageHeader } from "@/components/shared/page-header";
import { TaskDetail } from "@/components/shared/task-detail";
import { notFound } from "next/navigation";
import type { UserRole } from "@/types/database";

export const metadata: Metadata = { title: "Task Details" };

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const taskId = parseInt(id, 10);

  if (isNaN(taskId)) notFound();

  const data = await getTaskById(taskId);
  if (!data) notFound();

  const isAdmin = (["super_admin", "admin"] as UserRole[]).includes(user.role);

  return (
    <div>
      <PageHeader title={(data.task.title as string) || "Task"} />
      <TaskDetail data={data} currentUserId={user.id} isAdmin={isAdmin} />
    </div>
  );
}
