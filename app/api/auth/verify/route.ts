import { NextResponse } from "next/server";
import { verifyEmail } from "@/lib/actions/auth";

// Handles the link sent in the welcome / verify email. Redirects back to the
// profile page with a success flag so the UI can show a toast.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const appUrl = process.env.AUTH_URL || url.origin;

  if (!token) {
    return NextResponse.redirect(`${appUrl}/profile?verify=missing`);
  }

  const result = await verifyEmail(token);
  if (!result.success) {
    return NextResponse.redirect(`${appUrl}/profile?verify=failed`);
  }

  return NextResponse.redirect(`${appUrl}/profile?verify=success`);
}
