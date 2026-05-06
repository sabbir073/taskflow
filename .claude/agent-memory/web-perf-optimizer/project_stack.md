---
name: TaskFlow stack and conventions
description: Key framework/version constraints when recommending performance APIs in this codebase
type: project
---

- Next.js 16.2.2, React 19.2.4, App Router only (no /pages). Route groups: `(auth)`, `(dashboard)`, `(marketing)`.
- AGENTS.md warns this is a customised Next.js — verify any framework API against `node_modules/next/dist/docs/` before recommending. As of 2026-05-05, `next/image`, `next/font/google` (with `display: 'swap'`), `dynamic()`, and `export const revalidate` all match standard Next.js semantics in the bundled docs.
- TanStack Query v5 with global defaults: `staleTime 60s, retry 1, refetchOnWindowFocus: false`. Per-query `refetchOnWindowFocus: true` overrides are common.
- Server-side data layer: Supabase (`@supabase/supabase-js`), accessed via `getServerClient()` and `"use server"` actions in `lib/actions/*`.
- Auth: NextAuth v5 beta. JWT cached 24h — that's why `app/(dashboard)/layout.tsx` re-reads profile status from DB on every request.
- Tailwind v4 + custom CSS variables in `app/globals.css`.
- Heavy deps to watch: framer-motion + motion (both installed), recharts, full TipTap suite (15 packages), jspdf, isomorphic-dompurify, @aws-sdk/client-s3, react-aria-components, @heroui/react.

**Why:** Tooling assumptions matter — `next/font` defaults differ between major versions, and the codebase mixes `motion` and `framer-motion` packages which both exist in deps.

**How to apply:** Before recommending a Next.js API, run `Read node_modules/next/dist/docs/01-app/...` to confirm signature. Don't introduce a new heavy dep when one already in deps would do (e.g., reach for framer-motion before adding GSAP).
