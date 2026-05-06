import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";

// Authenticated app — keep crawlers out. Even though proxy.ts redirects
// unauthenticated visitors to /login, an explicit noindex prevents any
// leaked dashboard URLs from being cached as branded snippets.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { getSettings } from "@/lib/actions/settings";
import { getServerClient } from "@/lib/db/supabase";
import { dispatchSubscriptionNotifications } from "@/lib/subscription-check";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { StatusWatcher } from "@/components/shared/status-watcher";
import { PopupDisplay } from "@/components/shared/popup-display";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Read FRESH status + role from DB each request — JWT is cached 24h so
  // a mid-session suspension or role demotion would otherwise not take
  // effect until re-login.
  const db = getServerClient();
  const { data: profile } = await db
    .from("profiles")
    .select("status, role")
    .eq("user_id", user.id)
    .single();
  const profileRow = profile as Record<string, unknown> | null;
  const currentStatus = profileRow ? String(profileRow.status || "active") : "active";
  const currentRole = profileRow ? String(profileRow.role || "user") : "user";

  if (currentStatus === "suspended") {
    redirect("/suspended");
  }

  // Demoted-admin compensator: if the JWT still carries an admin role but
  // the DB no longer does, force a sign-out so the next session is minted
  // with the correct (lower) role. Promotions don't need this — the user
  // simply gets the new privilege at next login. Sideways changes between
  // super_admin and admin also force re-auth as a safety net.
  const adminRoles = ["super_admin", "admin"];
  const wasPrivileged = adminRoles.includes(user.role);
  const isPrivileged = adminRoles.includes(currentRole);
  if ((wasPrivileged && !isPrivileged) || (wasPrivileged && currentRole !== user.role)) {
    redirect("/api/auth/signout?callbackUrl=/login");
  }

  // Dispatch lifecycle notifications (expiring soon / expired) — idempotent
  await dispatchSubscriptionNotifications(db, user.id);

  const settings = await getSettings();

  const isAdmin = ["super_admin", "admin"].includes(user.role);

  return (
    <SettingsProvider initialSettings={settings}>
      <StatusWatcher mode="dashboard" />
      {/* Dashboard popup — admin never sees it, only regular users */}
      {!isAdmin && <PopupDisplay target="dashboard" />}
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} />
          {/* `pb-24` reserves space for the mobile BottomNav so nothing
              renders behind it. Desktop (`md:p-6 lg:p-8`) overrides
              padding fully and the bottom nav is hidden anyway. */}
          <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </SettingsProvider>
  );
}
