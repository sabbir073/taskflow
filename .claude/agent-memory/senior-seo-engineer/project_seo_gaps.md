---
name: TaskFlow SEO gaps as of 2026-05-05 audit
description: Baseline list of SEO defects found during the first audit — sitemap, robots, canonicals, OG image, JSON-LD, next/image
type: project
---

Findings from the 2026-05-05 SEO audit baseline:

- No `app/sitemap.ts` and no `app/robots.ts` exist. Both are P0.
- Root `layout.tsx` lacks `metadataBase`, `alternates.canonical`, `robots`, OG `url`, OG `siteName`, OG image, Twitter card. P0/P1.
- Zero `next/image` usage anywhere — every `<img>` is raw, no width/height, no priority, no lazy. CWV risk.
- No `next/font` for any custom fonts other than Inter (which is correctly using `next/font/google`).
- No JSON-LD anywhere in the production tree. Opportunities: Organization (root layout), SoftwareApplication + Offer (home page), FAQPage (FAQ section), BreadcrumbList (legal pages).
- `app/not-found.tsx` is fine but uses `<h1>404</h1>` then `<h2>Page Not Found</h2>` — order is OK, but consider stronger semantic h1 text.
- All landing components are `"use client"` — but they will still SSR by default in App Router, so initial HTML markup is present (verified by reading the components — content is in the JSX, no useEffect-only rendering).
- Footer social `href="#"` placeholders ship to production.
- Dashboard layout has no `robots: { index: false }` — relies on auth gating only. Adding metadata robots noindex is belt-and-suspenders.
- Marketing pages have title/description but no per-page OG/Twitter overrides, no canonical URLs.
- Mobile-first ok: `<html lang="en">`, no manual `<meta viewport>` (Next App Router auto-injects unless overridden via `viewport` export — should add it via `export const viewport` in root layout for explicit control of `width=device-width, initialScale: 1, themeColor`).

**Why:** This is the punch list to harden TaskFlow's organic search posture without breaking production.
**How to apply:** When the team is ready to act, prioritize sitemap + robots + metadataBase + canonicals first (P0); then JSON-LD + OG images (P1); then next/image migration (P2).
