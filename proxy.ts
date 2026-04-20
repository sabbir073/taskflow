import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Always-open routes (marketing / error pages / landing)
const publicPaths = ["/"];
// Auth-only routes — must be signed OUT to visit these
const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
const authApiPath = "/api/auth";
const adminOnlyPaths = ["/users", "/settings", "/landing-editor"];
const adminRoles = ["super_admin", "admin"];

const authProxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Static / framework paths — always let through
  if (
    pathname.startsWith(authApiPath) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/upload") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const user = req.auth?.user;
  const isAuthPath = authPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Signed-OUT users trying to access an auth page → allow
  // Signed-OUT users trying to access the public landing → allow
  if (!user) {
    if (isAuthPath || publicPaths.includes(pathname)) {
      return NextResponse.next();
    }
    // Everything else requires login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed-IN users
  //
  // NOTE: `user.status` here comes from the JWT, which is only refreshed on
  // login (24h cache). DO NOT use it to route between /dashboard and /suspended
  // — that would loop against the fresh-DB check in (dashboard)/layout.tsx
  // and app/suspended/page.tsx. Those two layouts are the single source of
  // truth for active/suspended routing.

  const isBanned = user.status === "banned";
  const isPending = user.is_approved === false;

  // If the user is on an auth path (login/register/etc):
  //   - Banned/pending users: LET THEM STAY so they can read the error on the login form.
  //   - Active users: bounce to /dashboard.
  if (isAuthPath) {
    if (isBanned || isPending) return NextResponse.next();
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Not on an auth path — enforce the account-state gates.
  if (isBanned) {
    return NextResponse.redirect(new URL("/login?error=AccountBlocked", req.url));
  }
  if (isPending) {
    return NextResponse.redirect(new URL("/login?error=PendingApproval", req.url));
  }

  // Public landing is open to everyone
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // RBAC for admin-only paths
  const isAdminPath = adminOnlyPaths.some((p) => pathname.startsWith(p));
  if (isAdminPath && !adminRoles.includes(user.role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const proxy = authProxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
