---
name: TaskFlow project shape
description: High-level architecture of the TaskFlow codebase — routes, action pattern, query layer, auth model
type: project
---

TaskFlow is a Next.js (modified — see AGENTS.md) + Supabase social-engagement product.

Key facts:
- Route groups: `app/(auth)`, `app/(marketing)`, `app/(dashboard)`. Dashboard layout calls `requireAuth` + reads fresh profile.status from DB on every request to bypass JWT cache (so suspensions take effect mid-session).
- Data access: server actions in `lib/actions/*` (users, plans, points, notices, etc). Each action self-guards (auth + role check) so direct invocation can't bypass page gating.
- Client state: TanStack Query hooks in `hooks/use-*.ts` wrap server actions; many use `refetchInterval` polling (60–120s) for live data.
- Auth: NextAuth credentials, with statuses (`active|suspended|banned`) and `is_approved` flag. Suspended users redirect to `/suspended`.
- Plans: Subscription-required mode is gated by `settings.require_subscription`. Plans page redirects to `/dashboard` when subs are off.
- Mobile UX: Bottom nav (`components/layout/bottom-nav.tsx`) is mobile-only (md:hidden) with 5 items: Tasks, Groups, Leaderboard, Notifications, Profile. Dashboard layout adds `pb-24` so content doesn't hide behind it.

**Why:** Helps plan future audits — know where action gating lives, where client/server validation diverges, and which areas are mobile-specific.

**How to apply:** When evaluating a feature, check both the route file (gating + data-prefetch) and the action file (validation + permissions). Don't assume client-side validation reflects server reality.
