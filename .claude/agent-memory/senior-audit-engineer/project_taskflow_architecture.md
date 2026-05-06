---
name: TaskFlow architecture and security boundary
description: Where the only authorization boundary lives in the TaskFlow codebase and why RLS does not protect it
type: project
---

TaskFlow runs every server action through a single Supabase service-role client (`lib/db/supabase.ts`'s `getServerClient` singleton). Service-role bypasses RLS, and RLS policies in `supabase/migrations/010_create_rls_policies.sql` explicitly note this. Therefore the **only** authorization boundary is the in-action `auth()` + role check in each function in `lib/actions/*.ts`.

**Why:** This was a deliberate architectural choice — comments in `lib/actions/users.ts` say "Admin-only. Any caller without the role gets an empty result rather than raw data — the page route is also gated, but the action must self-guard so a direct client-side invocation can't enumerate users." So defense-in-depth is the design intent, but several actions were written without that self-guard.

**How to apply:** When auditing this repo, treat any server action that omits an inline `auth()` + role check as a P0 finding even if the only page that calls it is gated, because Next.js Server Actions are reachable directly via the `_actions` endpoint by any client. Specifically scan `lib/actions/*.ts` for functions that read/write privileged data without a session+role guard; do not rely on RLS or page gating to compensate.
