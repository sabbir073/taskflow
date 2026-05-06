import type { MetadataRoute } from "next";

// Resolve the public base URL once. metadataBase in app/layout.tsx uses the
// same priority order; keeping them in sync matters for canonical + sitemap
// links to point at the same host.
function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    "https://taskflow.app"
  ).replace(/\/+$/, "");
}

// Public marketing routes — mirrors `publicPaths` in proxy.ts. Anything
// behind auth (dashboard / api / tasks / billing / etc.) is excluded by
// app/robots.ts so search engines don't waste crawl budget on pages they
// can't actually reach.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return [
    { url: `${base}/`,          lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/help`,      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/community`, lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/status`,    lastModified: now, changeFrequency: "daily",   priority: 0.5 },
    { url: `${base}/privacy`,   lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/terms`,     lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/refund`,    lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/cookies`,   lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];
}
