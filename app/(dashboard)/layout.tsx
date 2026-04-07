import { requireAuth } from "@/lib/auth-helpers";
import { getSettings } from "@/lib/actions/settings";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SettingsProvider } from "@/components/providers/settings-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const settings = await getSettings();

  return (
    <SettingsProvider initialSettings={settings}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}
