---
name: Authoritative references for TaskFlow audits
description: Where to look when auditing this codebase
type: reference
---

- `node_modules/next/dist/docs/` — bundled docs for the custom Next.js fork. Read these before flagging Next-related issues. Notable subdirs: `01-app/02-guides/authentication.md`, `01-app/02-guides/content-security-policy.md`, `01-app/02-guides/data-security.md`.
- `supabase/migrations/` — schema source of truth. `010_create_rls_policies.sql` documents that RLS is bypassed by service-role; `015_seed_settings_and_landing.sql` shows the settings keys (e.g., `max_login_attempts`, `lockout_duration_minutes`) that exist in the DB but are not yet read by code.
- `pnpm audit --json` works (uses GitHub Advisory DB). Last run on 2026-05-05 reported 1 high (next 16.2.2 GHSA-q4gf-8mx6-v5v3) and 5 moderate.
- `.env.local` is gitignored (verified clean — `git ls-files | grep env` returns only `lib/env.ts`).
