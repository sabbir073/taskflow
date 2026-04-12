import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { getTaskById } from "@/lib/actions/tasks";
import { PageHeader } from "@/components/shared/page-header";
import { TaskEditForm } from "@/components/shared/task-edit-form";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Edit Task" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) notFound();

  const data = await getTaskById(taskId);
  if (!data) notFound();

  const task = data.task;
  const isOwner = (task.created_by as string) === user.id;
  const isAdmin = ["super_admin", "admin"].includes(user.role);

  if (!isOwner && !isAdmin) notFound();

  return (
    <div>
      <PageHeader title="Edit Task" description={isAdmin ? "Changes apply immediately" : "Changes will need admin re-approval"} />
      <TaskEditForm task={task} taskId={taskId} />
    </div>
  );
}
