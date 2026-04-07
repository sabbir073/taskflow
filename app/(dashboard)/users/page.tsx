import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "@/components/shared/users-table";

export const metadata: Metadata = { title: "User Management" };

export default async function UsersPage() {
  await requireRole(["super_admin", "admin"]);

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage all platform users, roles, and statuses"
      />
      <UsersTable />
    </div>
  );
}
