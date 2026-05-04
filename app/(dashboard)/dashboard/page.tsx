import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { getAdminDashboardStats, getUserDashboardStats, getRecentActivity, getTopPerformers } from "@/lib/actions/analytics";
import { DashboardContent } from "@/components/shared/dashboard-content";
import type { UserRole } from "@/types/database";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAuth();
  const isAdmin = (["super_admin", "admin"] as UserRole[]).includes(user.role);

  const [adminStats, userStats, activity, topPerformers] = await Promise.all([
    isAdmin ? getAdminDashboardStats() : null,
    !isAdmin ? getUserDashboardStats() : null,
    getRecentActivity(8, isAdmin ? undefined : user.id),
    isAdmin ? getTopPerformers(5) : null,
  ]);

  return (
    <DashboardContent
      userName={user.name?.split(" ")[0] || "User"}
      isAdmin={isAdmin}
      adminStats={adminStats}
      userStats={userStats}
      recentActivity={activity}
      topPerformers={topPerformers}
    />
  );
}
