import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-helpers";
import { isStaffRole } from "@/lib/constants/roles";
import { getAdminDashboardStats, getUserDashboardStats, getRecentActivity, getTopPerformers, getCompletionTrend, getAssignmentStatusDistribution } from "@/lib/actions/analytics";
import { DashboardContent } from "@/components/shared/dashboard-content";
import { DashboardFlashToast } from "@/components/shared/dashboard-flash-toast";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAuth();
  const isAdmin = isStaffRole(user.role);

  // Admin-only overview charts reuse the staff-gated /reports analytics with an
  // empty filter (defaults to the last 30 days). Non-admins skip these fetches.
  const [adminStats, userStats, activity, topPerformers, completionTrend, statusDist] = await Promise.all([
    isAdmin ? getAdminDashboardStats() : null,
    !isAdmin ? getUserDashboardStats() : null,
    getRecentActivity(8, isAdmin ? undefined : user.id),
    isAdmin ? getTopPerformers(5) : null,
    isAdmin ? getCompletionTrend({}) : null,
    isAdmin ? getAssignmentStatusDistribution({}) : null,
  ]);

  return (
    <>
      <Suspense fallback={null}>
        <DashboardFlashToast />
      </Suspense>
      <DashboardContent
        userName={user.name?.split(" ")[0] || "User"}
        isAdmin={isAdmin}
        adminStats={adminStats}
        userStats={userStats}
        recentActivity={activity}
        topPerformers={topPerformers}
        completionTrend={completionTrend}
        statusDist={statusDist}
      />
    </>
  );
}
