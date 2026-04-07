import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { TaskApprovalQueue } from "@/components/shared/task-approval-queue";

export const metadata: Metadata = { title: "Task Approvals" };

export default async function TaskApprovalsPage() {
  await requireRole(["super_admin", "admin"]);

  return (
    <div>
      <PageHeader title="Task Approvals" description="Review and approve user-created tasks before they go live" />
      <TaskApprovalQueue />
    </div>
  );
}
