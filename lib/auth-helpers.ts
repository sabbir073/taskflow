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
    is_approved: session.user.is_approved !== false,
  };
}

// Only blocks banned users. Suspended users CAN access pages.
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "banned") {
    redirect("/login?error=AccountBlocked");
  }
  return user;
}

// Blocks suspended users from performing actions (create task, submit proof, etc.)
export async function requireActiveUser(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.status === "suspended") {
    throw new Error("Your account is suspended. You cannot perform this action.");
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
