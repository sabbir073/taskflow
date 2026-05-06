import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { getServerClient } from "@/lib/db/supabase";
import { checkRate } from "@/lib/rate-limit";

// Best-effort caller IP — only used as a rate-limit key, never as
// authentication. Mirrors lib/actions/auth.ts:getIp().
async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate-limit credential-stuffing: 5/email/15min and 20/IP/15min.
        // We return null (NextAuth surfaces a generic auth error) rather than
        // signalling rate-limit explicitly — don't reveal the throttle state
        // to attackers.
        const emailKey = String(credentials.email).toLowerCase();
        const ip = await getIp();
        const emailRate = checkRate("login", emailKey, 5, 15 * 60 * 1000);
        if (!emailRate.allowed) return null;
        const ipRate = checkRate("login_ip", ip, 20, 15 * 60 * 1000);
        if (!ipRate.allowed) return null;

        const supabase = getServerClient();

        const { data: user, error } = await supabase
          .from("users")
          .select("id, name, email, image, password_hash")
          .eq("email", credentials.email as string)
          .single();

        if (error || !user) return null;

        const passwordHash = (user as Record<string, unknown>).password_hash as string | null;
        if (!passwordHash) return null;

        const isValid = await compare(credentials.password as string, passwordHash);
        if (!isValid) return null;

        return {
          id: (user as Record<string, unknown>).id as string,
          name: (user as Record<string, unknown>).name as string | null,
          email: (user as Record<string, unknown>).email as string,
          image: (user as Record<string, unknown>).image as string | null,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        const supabase = getServerClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, status, is_approved")
          .eq("user_id", user.id!)
          .single();

        const profileData = profile as Record<string, unknown> | null;
        token.role = (profileData?.role as string) || "user";
        token.status = (profileData?.status as string) || "active";
        token.is_approved = profileData?.is_approved !== false; // default true if missing
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.is_approved = token.is_approved as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
});
