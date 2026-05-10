import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui";

export const metadata: Metadata = { title: "Landing Page Editor" };

export default async function LandingEditorPage() {
  await requireRole(ADMIN_ROLES);

  return (
    <div>
      <PageHeader title="Landing Page Editor" description="Customize your public landing page content" />
      <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Landing page editor with live preview coming soon.</p></CardContent></Card>
    </div>
  );
}
