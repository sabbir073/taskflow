import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-helpers";
import { getMyProfile } from "@/lib/actions/users";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileView } from "@/components/shared/profile-view";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireAuth();
  const profileData = await getMyProfile();

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your account settings and preferences" />
      <ProfileView sessionUser={user} profileData={profileData} />
    </div>
  );
}
