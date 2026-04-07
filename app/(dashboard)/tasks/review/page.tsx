import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { ReviewQueue } from "@/components/shared/review-queue";

export const metadata: Metadata = { title: "Review Queue" };

export default async function ReviewPage() {
  await requireRole(["super_admin", "admin", "group_leader"]);

  return (
    <div>
      <PageHeader
        title="Review Queue"
        description="Review and approve submitted task proofs"
      />
      <ReviewQueue />
    </div>
  );
}
