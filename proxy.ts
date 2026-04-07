import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/", "/login", "/register", "/forgot-password"];
const authApiPath = "/api/auth";
const adminOnlyPaths = ["/users", "/settings", "/landing-editor"];
const adminRoles = ["super_admin", "admin"];

const authProxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes and auth API
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith(authApiPath) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/upload") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const user = req.auth?.user;

  // Redirect to login if not authenticated
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Block suspended/banned users
  if (user.status === "suspended" || user.status === "banned") {
    return NextResponse.redirect(new URL("/login?error=AccountBlocked", req.url));
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
