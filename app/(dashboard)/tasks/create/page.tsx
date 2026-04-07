import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { TaskForm } from "@/components/shared/task-form";

export const metadata: Metadata = { title: "Create Task" };

export default async function CreateTaskPage() {
  await requireAuth(); // Any authenticated user can create tasks

  return (
    <div>
      <PageHeader title="Create Task" description="Create a task and spend points from your wallet" />
      <TaskForm />
    </div>
  );
}
