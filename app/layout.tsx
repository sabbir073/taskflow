import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { CookieConsent } from "@/components/shared/cookie-consent";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Resolve a build-time base URL for canonical + OG resolution. Falls
// back through NEXT_PUBLIC_SITE_URL → AUTH_URL → a placeholder. Same
// priority order as app/sitemap.ts and app/robots.ts.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://taskflow.app";

// Note: preconnect hints for CloudFront + Supabase moved to the
// (dashboard) layout — those hosts only matter for authenticated views
// (avatars, attachments, server-action data). Marketing pages don't
// hit them, and Lighthouse penalised "unused preconnect" on /.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TaskFlow — Grow Your Social Media 100% Organically",
    template: "%s | TaskFlow",
  },
  description:
    "TaskFlow is the world's smartest organic social media growth and content exchange platform. Earn points by engaging with real creators, then spend points to make your own content go viral — no ads, no bots, just real humans.",
  keywords: [
    "organic social media growth",
    "content exchange platform",
    "social media promotion",
    "get real followers",
    "viral marketing",
    "TaskFlow",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TaskFlow — Grow Your Social Media 100% Organically",
    description:
      "Exchange real engagement with real creators. Earn points, promote your content, and watch your posts go viral — organically.",
    type: "website",
    siteName: "TaskFlow",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskFlow — Grow Your Social Media 100% Organically",
    description:
      "Exchange real engagement with real creators. Earn points, promote your content, and watch your posts go viral — organically.",
  },
};

// Explicit viewport export — also surfaces themeColor + colorScheme so
// mobile browsers paint the URL bar with the brand purple and our dark
// mode is recognised. Next 16 auto-injects width=device-width but not
// these signals.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#9333ea",
  colorScheme: "light dark",
};

// Site-wide Organization schema — surfaces the brand in knowledge-panel
// candidates and ties OG/social profiles together once `sameAs` URLs are
// real. Sanitized via the standard Next 16 JSON-LD recipe (escape `<`).
function organizationJsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TaskFlow",
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    description:
      "TaskFlow is the world's smartest organic social media growth and content exchange platform.",
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          // Inline LD-JSON is the canonical pattern; setting via dangerouslySetInnerHTML
          // because Next escapes children of <script>.
          dangerouslySetInnerHTML={{ __html: organizationJsonLd() }}
        />
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
