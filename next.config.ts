import type { NextConfig } from "next";

// Build a `next/image` remote pattern from a hostname or full URL. Falls
// back to a no-op host that won't match anything if the env var is missing
// at build time, so the build never crashes.
function imagePattern(hostnameOrUrl: string | undefined) {
  if (!hostnameOrUrl) return null;
  try {
    // Allow either bare hostnames (`d123.cloudfront.net`) or full URLs
    // (`https://abc.supabase.co`).
    const host = hostnameOrUrl.includes("://")
      ? new URL(hostnameOrUrl).hostname
      : hostnameOrUrl;
    return { protocol: "https" as const, hostname: host };
  } catch {
    return null;
  }
}

const remotePatterns = [
  imagePattern(process.env.CLOUDFRONT_DOMAIN),
  imagePattern(process.env.NEXT_PUBLIC_SUPABASE_URL),
].filter((p): p is { protocol: "https"; hostname: string } => p !== null);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.68.92"],
  images: {
    // Restrict next/image's optimizer to known hosts. Wildcards are an
    // SSRF surface — only allow what we actually serve from.
    remotePatterns,
  },
  experimental: {
    // Per-export tree-shaking for icon + utility libraries that ship
    // hundreds of named exports. Without this, an `import { Bell } from
    // "lucide-react"` can pull a chunk many times bigger than the icon
    // we actually use.
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
    // Inline critical CSS so the initial paint isn't blocked on the
    // 19 KB Tailwind output chunk that PageSpeed flags as render-blocking
    // for ~450 ms on Slow 4G.
    optimizeCss: true,
  },
};

export default nextConfig;
