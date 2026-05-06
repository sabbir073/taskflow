---
name: TaskFlow performance baseline (audit 2026-05-05)
description: Recurring performance issues found in TaskFlow audit — useful when revisiting LCP/INP/bundle-size work
type: project
---

Audit performed 2026-05-05 against Next.js 16.2.2 / React 19.2 codebase. Key recurring patterns:

- Every `components/landing/*.tsx` file is `"use client"` with framer-motion. Marketing home is effectively a SPA — biggest LCP/TBT lever is converting decorative-motion sections to RSC.
- `framer-motion` is in the critical-path bundle because `components/layout/bottom-nav.tsx` uses `motion.div` with `layoutId`. Killing that one usage frees the dashboard shared chunk.
- `components/shared/notice-board.tsx` imports `RichTextContent` from `rich-text-editor.tsx`, which barrel-imports all of TipTap (~200 KB gz). NoticeBoard is rendered in every dashboard page via `DashboardContent`. Splitting `rich-text-content.tsx` from the editor file is the single biggest dashboard-side win.
- `lib/actions/analytics.ts:getUserDashboardStats` and `lib/actions/points.ts:getLeaderboard` both pull every active profile to compute rank in JS. Needs a Postgres-side rank function. Becomes a P0 problem at 10k+ users.
- `components/providers/query-provider.tsx` ships `ReactQueryDevtools` unconditionally to production.
- `app/layout.tsx` `Inter()` is configured without `display`, `weight`, or `preload` overrides — likely shipping all variable weights.
- Polling cascade: `notice-board` polls `getSettingsMap` every 10 s; aggregate ~7 RPCs/min/idle dashboard tab. `notice-board.tsx:17` is the worst offender.
- `next.config.ts` only sets `allowedDevOrigins` — no `optimizePackageImports`, no image format config.

**Why:** This is a Bangladeshi creator-economy app — primary users are mobile on 4G, so mobile LCP/INP/JS-payload is the binding constraint. Lab metrics: no baseline captured yet (user has not run Lighthouse against production).

**How to apply:** Future perf work should start by checking whether these fixes have shipped before re-investigating; if a metric regressed, re-check the polling intervals and the landing-page client-component count first since both are easy to accidentally re-introduce.
