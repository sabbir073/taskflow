<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TaskMOS workflow

This repo has a living workflow + architecture doc that supersedes generic advice. **Always read it before non-trivial work.** A session-continuity log lives alongside it — read it at the start of every session so you don't have to be re-briefed.

@phnote.md

@phlog.md

Hard rules (full detail in phnote.md §21–25):

1. **DB changes → new migration file only.** Migrations 001–050 are frozen. Next file is `supabase/migrations/051_*.sql`. Make it idempotent (`IF NOT EXISTS` / `DROP ... IF EXISTS`).
2. **Cross-layer impact awareness.** A schema change usually means: new migration + `types/database.ts` + `lib/actions/*.ts` queries + the matching hook in `hooks/` + the consuming component in `components/shared/`. Use §22 cheat sheet.
3. **Permission-gated paths.** Any new admin/staff route must be added to `proxy.ts` (adminOnlyPaths / staffOnlyPaths) AND `lib/constants/roles.ts` PERMISSIONS matrix AND the sidebar nav in `components/layout/sidebar.tsx`.
4. **Every privileged mutation calls `recordAudit()`.** Fire-and-forget, never blocks.
5. **Every write-heavy action calls `checkRate()`.** Already enforced for auth, signup, payment submission, contact form.
6. **Plan before coding** when work spans multiple layers, touches schema, changes RBAC, or modifies the points/wallet/subscription math. Single-file fixes go direct.
7. **No new SQL functions without idempotent re-creation** (`CREATE OR REPLACE FUNCTION`) and a `DROP TRIGGER IF EXISTS` before any new trigger.
8. **External references = behavior only.** When user shares screenshots, code samples, or "build like this site" requests, extract **what** the feature does, **never** copy colors / component libraries / fonts / icons / class names. Implementation always uses TaskMOS primitives (`components/ui/`), lucide icons, Inter font, purple/pink tokens, and the existing stack (TanStack Query, react-hook-form, framer-motion). Full vocabulary in phnote.md §26.
9. **Append to `phlog.md` after every meaningful request.** Top of file = newest entry. Format: user prompt + intent + done + files touched + state + next step. This is the resume-from-where-we-stopped mechanism — if a session dies mid-work, the next session must be able to pick up cleanly from this file. Full spec in phnote.md §27.
