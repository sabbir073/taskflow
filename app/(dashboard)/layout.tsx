import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { getSettings } from "@/lib/actions/settings";
import { getServerClient } from "@/lib/db/supabase";
import { dispatchSubscriptionNotifications } from "@/lib/subscription-check";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { StatusWatcher } from "@/components/shared/status-watcher";
import { PopupDisplay } from "@/components/shared/popup-display";
import { isStaffRole } from "@/lib/constants/roles";

// Authenticated app — keep crawlers out. Even though proxy.ts redirects
// unauthenticated visitors to /login, an explicit noindex prevents any
// leaked dashboard URLs from being cached as branded snippets.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Preconnect hints scoped to the authenticated app. Marketing pages
// don't load CloudFront / Supabase assets, so putting these in the
// root layout earned an "unused preconnect" Lighthouse penalty.
function preconnectHost(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return value.includes("://") ? new URL(value).origin : `https://${value}`;
  } catch {
    return null;
  }
}
const preconnectHosts = [
  preconnectHost(process.env.CLOUDFRONT_DOMAIN),
  preconnectHost(process.env.NEXT_PUBLIC_SUPABASE_URL),
].filter((h): h is string => h !== null);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Suspended-user redirect. The JWT callback now re-reads status from the
  // DB on every auth() call (Entry #33), so `user.status` is already fresh.
  // We do one more DB read here as belt-and-braces against a JWT-callback
  // failure that left a stale "active" status on the cookie — losing the
  // ability to lock a suspended user out would be a serious security gap.
  const db = getServerClient();
  const { data: profile } = await db
    .from("profiles")
    .select("status")
    .eq("user_id", user.id)
    .single();
  const profileRow = profile as Record<string, unknown> | null;
  const currentStatus = profileRow ? String(profileRow.status || "active") : "active";

  if (currentStatus === "suspended") {
    redirect("/suspended");
  }

  // Note: the previous "demoted-staff compensator" that force-signed-out
  // users with a stale privileged JWT is removed in Entry #33. The JWT
  // callback in auth.ts now refreshes role on every request, so JWT.role
  // and DB role always match — promotion + demotion + lateral role
  // changes all take effect on the target user's next page load without
  // a re-login.

  // Dispatch lifecycle notifications (expiring soon / expired) — idempotent
  await dispatchSubscriptionNotifications(db, user.id);

  const settings = await getSettings();

  const isAdmin = isStaffRole(user.role);

  return (
    <SettingsProvider initialSettings={settings}>
      {preconnectHosts.map((host) => (
        <link key={host} rel="preconnect" href={host} crossOrigin="anonymous" />
      ))}
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
