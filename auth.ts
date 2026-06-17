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
    async jwt({ token, user, trigger, session: updatedSession }) {
      // Initial sign-in: carry the auth row's identity (id/name/email/image)
      // into the JWT. role/status/is_approved are populated by the always-
      // fresh block below (which runs on every call, including this one),
      // so we don't duplicate the profile lookup here.
      if (user) {
        token.id = user.id!;
        if (user.name !== undefined) token.name = user.name;
        if (user.email !== undefined) token.email = user.email;
        if (user.image !== undefined) token.picture = user.image as string | null;
      }

      // Client-side `useSession().update({ name, image })` path. Lets the
      // profile page push fresh values into the JWT immediately after an
      // avatar upload or name change, without forcing a re-login.
      if (trigger === "update" && updatedSession && typeof updatedSession === "object") {
        const incoming = updatedSession as Record<string, unknown>;
        if (typeof incoming.name === "string") token.name = incoming.name;
        if (typeof incoming.image === "string" || incoming.image === null) {
          token.picture = incoming.image as string | null;
        }
      }

      // Always-fresh role / status / is_approved. Runs on every server-side
      // auth() call — middleware, layout, page, server action — so an admin
      // promoting a user → admin (or demoting, or suspending) is reflected
      // on the target user's next request without forcing them to log out
      // and back in. Cost is one cheap PostgREST SELECT (~few ms via the
      // Supabase pooler).
      //
      // Without this, the JWT cookie's role/status/is_approved sat stale
      // for the JWT's 24h lifetime: promoted admins still got bounced off
      // /audit, /inbox, etc.; suspensions only kicked in via the dashboard
      // layout's separate fresh-DB read; sidebar nav stayed wrong.
      //
      // Failure mode: a DB hiccup just keeps the previous token values —
      // we don't want a transient network blip to silently drop an admin
      // to user mid-session. The initial sign-in branch above sets `id`,
      // so a `!token.id` skip here only happens on a malformed/anon token.
      if (token.id) {
        try {
          const supabase = getServerClient();
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, status, is_approved")
            .eq("user_id", token.id as string)
            .single();
          const p = profile as Record<string, unknown> | null;
          if (p) {
            token.role = (p.role as string) || "user";
            token.status = (p.status as string) || "active";
            token.is_approved = p.is_approved !== false;
          } else if (token.role === undefined) {
            // First call AND no profile row found — defaults so downstream
            // code never sees `undefined` role.
            token.role = "user";
            token.status = "active";
            token.is_approved = true;
          }
        } catch (err) {
          console.error("[auth.jwt] profile re-read failed", err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.is_approved = token.is_approved as boolean;
        // NextAuth populates `name`, `email` from `token.name`/`token.email`
        // by default, but `image` only flows when we explicitly forward
        // it from `token.picture`.
        session.user.image = (token.picture as string | null | undefined) ?? null;
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
