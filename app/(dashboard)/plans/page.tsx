import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { getServerClient } from "@/lib/db/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { PlansView } from "@/components/shared/plans-view";

export const metadata: Metadata = { title: "Subscription Plans" };

export default async function PlansPage() {
  await requireAuth();

  // Hide the plan page entirely when subscriptions aren't required
  const db = getServerClient();
  const { data: setting } = await db.from("settings").select("value").eq("key", "require_subscription").single();
  const raw = setting ? (setting as Record<string, unknown>).value : false;
  const required = raw === true || raw === "true";
  if (!required) redirect("/dashboard");

  return (
    <div>
      <PageHeader title="Plans" description="Choose a subscription plan or buy extra points" />
      <PlansView />
    </div>
  );
}
