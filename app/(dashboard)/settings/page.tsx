import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { getSettings } from "@/lib/actions/settings";
import { SettingsView } from "@/components/shared/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole(ADMIN_ROLES);
  const settings = await getSettings();

  return (
    <div>
      <PageHeader title="Settings" description="Configure platform settings" />
      <SettingsView initialSettings={settings} />
    </div>
  );
}
