import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { getServerClient } from "@/lib/db/supabase";
import { SuspendedView } from "@/components/shared/suspended-view";

export const metadata: Metadata = { title: "Account Suspended" };

export default async function SuspendedPage() {
  const user = await requireAuth();

  // If the user is already active, bounce them to the dashboard immediately.
  const db = getServerClient();
  const { data: profile } = await db
    .from("profiles")
    .select("status")
    .eq("user_id", user.id)
    .single();
  const status = profile ? String((profile as Record<string, unknown>).status || "active") : "active";
  if (status !== "suspended") {
    redirect("/dashboard");
  }

  return <SuspendedView user={{ name: user.name, email: user.email, image: user.image }} />;
}
