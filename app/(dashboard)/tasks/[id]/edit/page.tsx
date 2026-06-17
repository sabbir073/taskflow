import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { isStaffRole } from "@/lib/constants/roles";
import { getTaskById } from "@/lib/actions/tasks";
import { PageHeader } from "@/components/shared/page-header";
import { TaskEditForm } from "@/components/shared/task-edit-form";
import { ItemGone } from "@/components/shared/item-gone";
import { Card, CardContent, Btn } from "@/components/ui";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Edit Task" };
// Auth + per-request DB reads — must be dynamic, never cached.
export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const taskId = parseInt(id, 10);
  // A malformed URL is the only true 404 here. Everything else below is a
  // soft "you can't edit this" or "this task is gone" panel so workers
  // aren't left staring at a generic 404 when they hit the URL directly.
  if (isNaN(taskId)) notFound();

  const data = await getTaskById(taskId);

  if (!data) {
    // Task row missing — either deleted, or the viewer has no read access
    // at all (not creator / assignee / group leader / staff). Either way,
    // the friendliest signal is the "this item is gone" card the detail
    // page already shows for deleted tasks.
    return (
      <div>
        <PageHeader title="Edit Task" />
        <ItemGone kind="task" backHref="/tasks" backLabel="Back to tasks" />
      </div>
    );
  }

  const task = data.task;
  const isOwner = (task.created_by as string) === user.id;
  const isAdmin = isStaffRole(user.role);
  const title = String(task.title || "Task");

  if (!isOwner && !isAdmin) {
    // Viewer has read access (assignee or group leader) but is not allowed
    // to EDIT this task — only creators and staff can. Surface the rule
    // instead of a silent 404 so the worker understands why the button
    // they followed didn't open an editor.
    return (
      <div>
        <PageHeader title="Edit Task" />
        <div className="max-w-xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-warning/15 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">You can&apos;t edit this task</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Only the task creator or an admin can edit <strong className="text-foreground">{title}</strong>.
                  You still have access to view it and submit proof.
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-1">
                <Link href={`/tasks/${taskId}`}>
                  <Btn variant="primary" size="sm">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to task
                  </Btn>
                </Link>
                <Link href="/tasks">
                  <Btn variant="outline" size="sm">All tasks</Btn>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Edit Task" description={isAdmin ? "Changes apply immediately" : "Changes will need admin re-approval"} />
      <TaskEditForm task={task} taskId={taskId} />
    </div>
  );
}
