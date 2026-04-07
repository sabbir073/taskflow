import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { UserRole, SessionUser } from "@/types";
import { hasPermission, type Permission } from "@/lib/constants/roles";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email!,
    image: session.user.image ?? null,
    role: session.user.role as UserRole,
    status: session.user.status as import("@/types").UserStatus,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "suspended" || user.status === "banned") {
    redirect("/login?error=AccountBlocked");
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard?error=Unauthorized");
  }
  return user;
}

export async function checkPermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    redirect("/dashboard?error=Unauthorized");
  }
  return user;
}
