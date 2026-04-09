import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { PlansView } from "@/components/shared/plans-view";

export const metadata: Metadata = { title: "Subscription Plans" };

export default async function PlansPage() {
  await requireAuth();
  return (
    <div>
      <PageHeader title="Plans" description="Choose a subscription plan" />
      <PlansView />
    </div>
  );
}
