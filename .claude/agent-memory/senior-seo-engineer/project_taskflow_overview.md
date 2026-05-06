---
name: TaskFlow project SEO context
description: TaskFlow is a Next.js 16.2.2 / React 19 social-media engagement-exchange SaaS; this notes the SEO-relevant architecture
type: project
---

TaskFlow is a peer-to-peer "organic" social-media growth platform — users earn points by engaging with creators, spend points to get engagement on their own posts. Bangladeshi/global English audience based on testimonial names and BDT currency code.

Stack: Next.js 16.2.2 (App Router), React 19.2.4, next-auth v5 beta, Supabase, Tailwind v4, framer-motion, Heroui, TanStack Query.

Route groups:
- `(marketing)` — public/indexable: `/`, `/help`, `/community`, `/status`, `/privacy`, `/terms`, `/refund`, `/cookies`
- `(auth)` — `/login`, `/register`, `/forgot-password` (should be noindex)
- `(dashboard)` — gated SaaS app (should be noindex via robots, also gated by `proxy.ts`)
- `/suspended` — auth-gated

Public path allowlist lives in `proxy.ts` (`publicPaths` array).

**Why:** Indexing strategy must focus marketing pages, exclude dashboard/auth.
**How to apply:** When adding new public pages, add them both to `proxy.ts` publicPaths AND to the eventual `app/sitemap.ts`.
