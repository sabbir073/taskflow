import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { LeaderboardView } from "@/components/shared/leaderboard-view";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const user = await requireAuth();
  return (
    <div>
      <PageHeader title="Leaderboard" description="See who's leading the pack" />
      <LeaderboardView currentUserId={user.id} />
    </div>
  );
}
