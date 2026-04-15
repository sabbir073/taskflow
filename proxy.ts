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

  // Banned = fully blocked — force logout flow
  if (user.status === "banned") {
    return NextResponse.redirect(new URL("/login?error=AccountBlocked", req.url));
  }

  // Unapproved = blocked until admin approves
  if (user.is_approved === false) {
    return NextResponse.redirect(new URL("/login?error=PendingApproval", req.url));
  }

  // Already signed in — bounce them away from login/register to the dashboard.
  // If they're actually suspended the dashboard layout will forward them to /suspended.
  if (isAuthPath) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
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
