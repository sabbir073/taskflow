import type { MetadataRoute } from "next";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    "https://taskmos.com"
  ).replace(/\/+$/, "");
}

// Block crawlers from every authenticated / admin surface. The dashboard
// redirects unauthenticated visitors to /login, so most of these aren't
// even renderable to bots — but stating it explicitly keeps the index
// focused on the marketing routes and consolidates any leaked-link
// crawls.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/tasks",
          "/billing",
          "/payments",
          "/profile",
          "/notifications",
          "/groups",
          "/settings",
          "/users",
          "/audit",
          "/popups",
          "/landing-editor",
          "/leaderboard",
          "/reports",
          "/appeals",
          "/contact-messages",
          "/broadcast",
          "/notices",
          "/plans",
          "/support",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/suspended",
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
