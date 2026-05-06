---
name: TaskFlow uses a custom Next.js fork with `proxy.ts` instead of `middleware.ts`
description: Conventions in this Next.js fork that differ from stock Next, and where to verify them
type: project
---

TaskFlow uses a customized Next.js (per `AGENTS.md` warning). Concrete divergences observed:
- The middleware file is named `proxy.ts` and exports `{ proxy, config }` rather than the stock `middleware.ts` exporting `default`/`middleware`. The custom Next runtime treats this as the request-time gate.
- Up-to-date framework docs live at `node_modules/next/dist/docs/` (e.g., `01-app/02-guides/authentication.md`); the index even contains AI-agent hints (e.g., `unstable_instant` for instant navigation).

**Why:** AGENTS.md/CLAUDE.md explicitly say "this is NOT the Next.js you know" and direct readers to read those bundled docs before writing code. Several conventions and APIs may differ from training data.

**How to apply:** Before flagging anything as a "Next.js anti-pattern" in this codebase, check `node_modules/next/dist/docs/` and confirm the custom Next still treats it that way. Do NOT rename `proxy.ts` to `middleware.ts`. When auditing routing/auth flows, treat `proxy.ts` as authoritative.
