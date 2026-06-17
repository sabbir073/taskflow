# TaskMOS Session Log

> **Purpose:** Session-continuity journal. If VS Code closes, laptop reboots, or a new chat starts,
> reading this file lets work resume from exactly where it stopped.
>
> **Format:** Most recent entry at the **top**. Each entry = one user request + what was done +
> files touched + current state + next step (if any).
>
> **Update cadence:** Append a new entry after every meaningful user request is finished
> (not for trivial back-and-forth chatter). Auto-loaded by `AGENTS.md` so it's always in context.
>
> **Archive rule:** Keep the most recent ~50 entries inline. Older entries move to
> `phlog-archive/YYYY-MM.md` (create the folder + monthly file when needed).

---

## How to use this log to resume

1. **At session start:** Read the most recent 3–5 entries to understand where work stopped.
2. **If the user says "ai jayga theke continue koren" / "where we left off":** Read the topmost entry's **State** + **Next step**, then act.
3. **If the user references a specific date or feature:** Grep this file for the keyword.
4. **After finishing any non-trivial request:** Append a new entry at the top of the "Entries" section below.

---

# Entries

---

## 2026-05-29 · Session 1 (continued)

### Entry #49 · Whole-project audit — fixed 1 HIGH data-disclosure + 1 HIGH money bypass + several MED/LOW
- **User prompt (Banglish):** "amr ei site eri project er one by one check korun jodi kono bug thake fix korun, UI UX a jhamela thakle fix korun, kono function/option a issue thakle fix kore amk janan je sob thik ache"
- **Approach:** baseline `tsc`+`eslint` (clean) → 3 parallel senior-audit-engineer agents (user stopped 2; task/group one completed) → user chose "fix genuine bugs + continue auditing myself (no agents)" → I audited money/auth/UI directly + fixed. Verified findings against the live DB; pruned false positives.
- **HIGH — fixed:**
  1. **Analytics data disclosure** ([lib/actions/analytics.ts](lib/actions/analytics.ts)): `exportReportCSV`, `getTopUsersReport`, `getOverviewReport`, `getTasksByPlatform`, `getAssignmentStatusDistribution`, `getPointsOverTime`, `getUserGrowth`, `getCompletionTrend`, `getAdminDashboardStats`, `getTopPerformers`, `getRecentActivity` had **no auth/role gate** — server actions are POST-able directly, so any caller could `exportReportCSV("users", {})` and dump every user's name+email (bypassing the staff-gated /reports page). Added an `isStaffCaller()` gate to all (each returns an empty shape when unauthorized); `getRecentActivity` allows a user their OWN feed, staff-only otherwise.
  2. **Free paid-plan self-grant** ([lib/actions/plans.ts](lib/actions/plans.ts) `subscribe`): the UI only calls `subscribe()` for free plans, but the action had no price check — a crafted POST with a paid plan's id self-granted an active paid subscription for free. Added a server-side free-plan guard (rejects any plan with a non-zero price → must use the payment flow).
- **MED — fixed:**
  3. `getTaskRecentSubmitters` ([tasks.ts](lib/actions/tasks.ts)) was unauthenticated (enumerate who completed any task) → added a logged-in guard.
  4. `/inbox` badge staleness: task approve/reject + item review ([hooks/use-tasks.ts](hooks/use-tasks.ts)) and group approve/reject ([hooks/use-groups.ts](hooks/use-groups.ts)) didn't invalidate `admin-inbox`/`admin-inbox-counts` → added.
  5. `updateTask` ([tasks.ts](lib/actions/tasks.ts)) let a live task's target (group/user/all_users) AND bundle items change without re-fanning-out assignments → now locks target + items once any assignment exists (extends the existing "no assignments" gate).
- **LOW — fixed:** `getGroupStats`/`getGroupLeaderboard` ([groups.ts](lib/actions/groups.ts)) unauthenticated → logged-in guard; `task-bundle-card` description + (earlier) `groups-list` description lacked `wrap-break-word` → long unbroken tokens now wrap inside the card (the /groups overflow from Entry #47, now also on /tasks cards).
- **Verified CLEAN (not bugs):** `invoices.getInvoiceById` blocks IDOR; `exports.ts` (users/payments CSV) properly admin-gated; `assignPoints` staff-gated + atomic; `reviewPayment` (Entry #38 claim→deliver→revert) sound; ALL points columns are `numeric(12,2)` (the agent's "points might be INTEGER" was speculative — confirmed DECIMAL); `broadcasts`/`getGroupTasks`/`getGroupTaskStatus`/`reverseAutoApprovedItem` have auth; no invalid `w-4.5`-style Tailwind classes remain.
- **FLAGGED (not fixed — by design / edge / structural):** `all_users` tasks fan out an assignment+notification to every active user regardless of budget (scaling concern — a redesign, not a crash); member re-join revives a `cancelled` assignment even into a now-full task (rare leave→fill→rejoin edge; only causes a "cap reached" at submit); `getPendingReviews` (assignment-level) vs `getPendingItemReviews` (item-level) can show divergent counts if both rendered (legacy cleanup); `updateInvoiceStatus` admin "un-reject" path sets status without re-delivering value (intentional manual override).
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint <all touched>` clean; dev server `GET /` 200, `/login` 200, `/dashboard|/tasks|/groups|/payments|/reports|/group-applications` 307 (auth-gated).
- **Files touched:** `lib/actions/analytics.ts`, `lib/actions/plans.ts`, `lib/actions/tasks.ts`, `lib/actions/groups.ts`, `hooks/use-tasks.ts`, `hooks/use-groups.ts`, `components/shared/task-bundle-card.tsx`.
- **State:** Complete. The two genuinely-serious holes (report/email disclosure + free paid-plan) are closed; the rest are minor/edge. Project compiles + lints clean.
- **Next step:** None on its own. (Optional follow-ups: cap the `all_users` fan-out; capacity-check the member-backfill revive.)

---

### Entry #48 · Fix `/login?error=PendingApproval` 404 — AUTH_URL had no port (redirect hit Apache:80)
- **User prompt (Banglish):** "http://localhost:3001/login?error=PendingApproval — Not Found — Apache/2.4.58 … Port 80 — ei page ta thik koro"
- **Root cause:** `.env.local` had `AUTH_URL=http://localhost` (no port; same for `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`). The dev server runs on **:3001** (3000 held by another project). NextAuth uses `AUTH_URL` as `baseUrl`, and the redirect callback ([auth.ts:151-155](auth.ts)) returns `` `${baseUrl}${url}` `` — so every NextAuth-driven redirect (PendingApproval, AccountBlocked, sign-out, etc.) resolved to `http://localhost/login?...` → **port 80 → the user's Apache/XAMPP → 404**. The middleware's own redirect ([proxy.ts:103](proxy.ts)) uses `new URL(..., req.url)` and was fine; the bug was purely NextAuth's base URL.
- **Not a page bug:** [login-form.tsx:72-87](components/shared/login-form.tsx) already renders the amber "Your account is awaiting approval" banner for `error=PendingApproval` (+ a banned banner for `AccountBlocked`). The page just never received the request.
- **Done — 3 files:**
  - **`.env.local`:** `AUTH_URL` / `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL` → `http://localhost:3001`.
  - **`package.json`:** `"dev": "next dev"` → `"next dev -p 3001"` so the dev port is pinned and always matches `AUTH_URL` (prevents the mismatch recurring if 3000 frees up).
  - **`components/shared/login-form.tsx`:** the two banner icons used `w-4.5 h-4.5` (invalid in this Tailwind v4 setup per Entry #39 — rendered at default 24px) → `w-5 h-5`.
  - Restarted the dev server (killed the :3001 listener, `pnpm dev` fresh) so the new `AUTH_URL` loaded.
- **Verified:** `pnpm exec eslint components/shared/login-form.tsx` clean; dev server Ready on :3001 (loaded `.env.local`); `GET /login?error=PendingApproval` **200** (was Apache:80 404), `/login?error=AccountBlocked` 200, `/login` 200.
- **Files touched:** `.env.local` (local/gitignored), `package.json`, `components/shared/login-form.tsx`.
- **State:** Complete. NextAuth redirects now stay on :3001; the pending-approval / banned banners render on the login page.
- **Out of scope:** DB `site_url` setting (SEO/sitemap, separate from auth); no auth/proxy logic change.
- **Next step:** None on its own.

---

### Entry #47 · /groups: GroupCard description overflow — wrap long unbroken words
- **User prompt (Banglish):** "http://localhost:3001/groups ei page er UI thik nai, Card gular bahire text chole jaitese check and fix"
- **Diagnosis:** every `<Card>` already has `overflow-hidden` (ui/index.tsx:12), so text can't truly escape a card — the symptom was a long **unbroken** string running to the card's right edge. Confirmed via a DB query: group #6 "team bhola" has a 56-char unbroken description token (`jaschdf…oiasw`), #7 an 18-char one. The `GroupCard` description `<p>` used `line-clamp-2` with no word-breaking, so the token didn't wrap and butted against the clipped edge (looked like it spilled out).
- **Fix — 1 line in `components/shared/groups-list.tsx`:** added `wrap-break-word` (Tailwind v4 canonical for `overflow-wrap: break-word`; linter rejected the legacy `break-words`) to the GroupCard description `<p>` so long unbroken tokens wrap inside the card. Title keeps `truncate` (single line + ellipsis — correct for long names); meta category keeps `truncate max-w-30`.
- **Verified:** `pnpm exec eslint components/shared/groups-list.tsx` clean; dev server `GET /groups` 307 (auth-gated).
- **Files touched:** `components/shared/groups-list.tsx`.
- **State:** Complete. Long group descriptions now wrap cleanly inside the card.
- **Next step:** None on its own.

---

### Entry #46 · Paid + admin-approved Group Access ("Apply for Group" → become a Group Leader)
- **User prompt (Banglish):** group access free na — user apply korbe (form: contact, #groups/#members/#tasks), price auto ba admin-set, pay/request, admin approve korle group_leader access pabe; access chara /groups-e marketing card + Apply dekhabe. (Discussed first; user picked: grant=group_leader role+limits, pricing=settings toggle (auto|admin), hard-enforce all 3 limits, keep both gates.)
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md`. Workflow: 3 Explore agents (group gating / payments+quota / request-approval patterns) → AskUserQuestion (4 decisions) → wrote plan → ExitPlanMode → approved.
- **Done — migration + 5 new files + ~11 edits:**
  - **NEW `supabase/migrations/055_group_access.sql`** (applied + idempotent-verified): `group_access_applications` (request + payment-on-row + status machine awaiting_quote→awaiting_payment→pending_review→approved/rejected + granted_* limits + review fields) + `group_access_grants` (active entitlement: max_groups/members/tasks, unique user_id) + `update_updated_at` trigger + seeded 5 settings under `general` (`group_access_pricing_mode='admin'`, rate_per_group=50, rate_per_member=5, rate_per_task=10, base_price=0). FK names verified for PostgREST join hints.
  - **NEW `lib/actions/group-access.ts`**: `resolveGroupAccess(db,userId,role)` (staff→grant→subscription→none; the single gate reused by /groups, createGroup, addMember, createTask) + `getMyGroupAccessState` + `getGroupAccessPricing`/`computePrice` + `applyForGroupAccess` (auto: compute price + pay upfront → pending_review; admin: → awaiting_quote) + `payForGroupApplication` (admin-mode pay step) + `getGroupApplications` (admin list) + `reviewGroupApplication` (quote | approve→promote role + upsert grant + audit + notify | reject) + `notifyAdmins`.
  - **NEW `hooks/use-group-access.ts`**, **`components/shared/group-access-gate.tsx`** (marketing card + Apply modal w/ name/email auto + contact + #groups/members/tasks + live auto-price + method picker + txn; status panels awaiting_quote/awaiting_payment(pay)/pending_review/rejected; **compact banner** variant so members keep seeing their groups), **`app/(dashboard)/group-applications/page.tsx`** + **`components/shared/group-applications-manager.tsx`** (admin list + quote/approve/reject modal).
  - **Modified:** `types/database.ts` (+GroupAccessApplication/Grant/Status), `lib/audit.ts` (+`group_application_review`/`group_application`), `lib/actions/groups.ts` (createGroup uses resolveGroupAccess: grant→enforce max_groups, subscription→existing checkQuota, none→blocked; addMember/addMemberByEmail enforce leader's grant `max_members` total across their groups via `checkLeaderMemberCap`), `lib/actions/tasks.ts` (createTask: grant→enforce max_tasks, else existing path), `components/shared/groups-list.tsx` (gate: no-access+no-groups→full gate; no-access+member→compact banner + their groups), `app/(dashboard)/groups/page.tsx` (hide Create unless access) + `groups/create/page.tsx` (redirect if no access), `lib/constants/roles.ts` (+`manage_group_applications` admin-only), `proxy.ts` (+`/group-applications` adminOnly), `components/layout/sidebar.tsx` (+Group Applications nav, Crown), `lib/actions/inbox.ts` + `components/shared/admin-inbox.tsx` (+`group_applications` queue, isAdmin-gated, awaiting_quote+pending_review), `components/shared/settings-view.tsx` (+5 SETTING_META labels).
- **Decisions honored:** grant = promote `user`→`group_leader` + write grant row (unlocks all existing group features incl. member tracking + reminders, which already existed); pricing toggle auto|admin; hard-enforce groups/members/tasks; keep both gates (grant OR active subscription).
- **Member regression avoided:** the gate only fully replaces /groups when the user has zero groups; a user who's a MEMBER of groups (no grant) still sees their groups under a compact apply banner.
- **v1 scope notes:** payment captured on the application row (no payments-table/reviewPayment entanglement, no invoice); pricing_mode is a text setting ("auto"/"admin") — select widget is a follow-up; grant is one-time (no expiry); admin always confirms (no auto-approve on payment).
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint <all touched>` clean; migration 055 applied + idempotent; FK constraint names confirmed; dev server `GET /` 200, `/login` 200, `/groups` 307, `/group-applications` 307, `/dashboard` 307, `/settings` 307.
- **State:** Complete (backend + UI + admin + RBAC + inbox + settings). Needs a real logged-in walkthrough to confirm the full apply→quote/pay→approve→group_leader flow end-to-end in the browser.
- **Visual test path:** (fresh non-staff user) /groups → marketing card + Apply → submit (auto: price+method+txn; admin: request) → status panel; (admin) /group-applications (or /inbox) → quote/approve → user becomes group_leader, /groups unlocks, can create up to N groups / add up to N members / create up to N tasks (N+1 blocked). Admin sets pricing mode + rates in /settings (General).
- **Files touched:** see Modified/New above.
- **Next step:** browser walkthrough; possible follow-ups (pricing-mode select, payments-table/invoice integration, grant expiry).

---

## 2026-05-28 · Session 1 (continued)

### Entry #45 · Platform/Task brand icons: render real glyphs everywhere via a shared PlatformTile
- **User prompt (Banglish):** "Social Media Icons gulo thik kora hoy nei Platform and Task er"
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #44's). Workflow: read platform-icon.tsx + platforms.ts → grep every `PlatformIcon`/`PLATFORM_CONFIG`/letter-tile render site → read the exact scopes → ExitPlanMode → approved.
- **Bug:** two icon systems coexisted — real brand SVGs (`PlatformIcon` + `PLATFORM_BRAND_SLUGS`, covers all 10 social platforms + music + maps/website) vs a colored **letter** tile (`name.charAt(0)`). The `/tasks` card grid + Settings→Platforms tab correctly rendered the brand SVG, but several Platform/Task surfaces rendered a plain letter for every platform (Instagram="I", YouTube="Y", Spotify="S"). The SVGs were fine — just not used on those surfaces.
- **Letter-only surfaces fixed:** `tasks-view.tsx` Doable/My-tasks row (desktop 295 + mobile 332) + review/grid card tile (705); `manage-tasks-view.tsx` row (90); `task-detail.tsx` hero (180).
- **Done — 1 shared component + 4 consumers:**
  - **`components/shared/platform-icon.tsx`:** added a shared `export function PlatformTile({ slug, name?, color?, className?, iconClassName?, letterClassName? })` co-located with `PlatformIcon`/`PLATFORM_BRAND_SLUGS` — renders the brand glyph (white via `text-white` + `fill="currentColor"`) on the brand-color square when `PLATFORM_BRAND_SLUGS.has(slug)`, else the colored capital-letter fallback. Pulls name/color defaults from `PLATFORM_CONFIG`. Single source of truth so the icon/letter logic can't drift again. (Imports `PLATFORM_CONFIG` + `cn`.)
  - **`components/shared/tasks-view.tsx`:** imported `PlatformTile`; replaced all 3 letter tiles (`w-10`/`w-11`/`w-7` variants) with sized `<PlatformTile>`.
  - **`components/shared/manage-tasks-view.tsx`:** imported `PlatformTile`; replaced the row tile.
  - **`components/shared/task-detail.tsx`:** imported `PlatformTile`; replaced the hero tile (`w-12`, `iconClassName="w-6 h-6"`).
  - **`components/shared/task-bundle-card.tsx`:** refactored the local tier-ring `PlatformTile` to delegate to the shared one (`PlatformTile as SharedPlatformTile`), keeping the tier ring on the wrapper — removed the now-duplicate brand/letter logic + the now-unused `PlatformIcon`/`PLATFORM_BRAND_SLUGS` imports. Output visually identical.
- **Connected features preserved:** card grid tier-ring tile + Settings Platforms tab unchanged (already correct); `PlatformIcon`/`PLATFORM_BRAND_SLUGS`/`PLATFORM_CONFIG` untouched; review-site platforms (Yelp/G2/BBB/etc.) still use the intentional colored-letter fallback; no data/query/migration change (surfaces already had `platform.slug` + `PLATFORM_CONFIG[slug].color`).
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint <5 files>` clean (only the pre-existing `<img>` warning at task-detail.tsx:215, unrelated); dev server `GET /` 200, `GET /login` 200, `GET /tasks` 307, `GET /dashboard` 307 (auth-gated).
- **Files touched:** `components/shared/platform-icon.tsx`, `components/shared/tasks-view.tsx`, `components/shared/manage-tasks-view.tsx`, `components/shared/task-detail.tsx`, `components/shared/task-bundle-card.tsx`.
- **State:** Complete. Every Platform/Task tile now shows the real brand glyph (social platforms + music + maps/website); review sites keep the colored-letter fallback. One shared `<PlatformTile>` powers all surfaces.
- **Visual test path:** `/tasks` Doable/My/Manage/Review (desktop + mobile rows), `/tasks/[id]` hero, `/dashboard` doable preview → brand glyphs (Instagram camera, YouTube play, Spotify, etc.) on brand color; Yelp/G2/BBB → colored letter; card grid + Settings Platforms tab unchanged.
- **Out of scope (deliberate):** the create-task platform picker is a native `<select>` (can't render SVGs in options — a custom icon dropdown is a separate larger change); brand SVGs for review-site platforms; re-drawing the hand-made music-service SVGs (not flagged).
- **Next step:** None on its own. (Possible follow-up if the user wants icons in the create-task platform picker → convert the native select to a custom dropdown.)

---

### Entry #44 · /dashboard: spotlight notice board + stat-card accents + top-performer avatars + polish
- **User prompt (Banglish):** "http://localhost:3001/dashboard … ekta notice board ache eita update korte hobe, aro shundor korte hobe, user der chokh pore amn vabe highlight korte hobe; sob functions update kore shundor UI te niye aste hobe, kono bug thakle fix korte hobe"
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #43's). Workflow: read dashboard page + dashboard-content + notice-board + analytics (4 dashboard fns) + stat-card + use-notices + notices.ts + profiles schema → AskUserQuestion (1 decision: notice board = **Spotlight card**) → ExitPlanMode → approved.
- **Audit (functions/data layer): no hard bugs.** `getAdminDashboardStats` `profiles.select("id")` is valid (profiles has a real `id` UUID PK, [003_create_profiles.sql](supabase/migrations/003_create_profiles.sql)); `completionRate` guards div-by-zero; `getUserDashboardStats` uses the `get_user_rank` RPC. **Incomplete impl (same class as Entry #40's leaderboard):** `getTopPerformers` ([analytics.ts:58](lib/actions/analytics.ts)) fetches each performer's `image` but `dashboard-content` rendered initials only — fetched-but-unused avatar.
- **Done — 3 files, no migration, no data-layer change:**
  - **`components/shared/notice-board.tsx` — Spotlight card redesign (the explicit highlight):** replaced the slim ticker strip with a prominent gradient card (`rounded-2xl … bg-linear-to-br from-primary/10 via-card to-accent/10 shadow-lg shadow-primary/10 ring-1 ring-primary/10`): pulsing megaphone badge (`animate-ping` ring), "ANNOUNCEMENTS" eyebrow, a "NEW" `animate-pulse` pill when the current notice's `created_at` is <48h (new `isRecent` helper), large title (`line-clamp-2`, click → modal) + 1-line plain-text body preview (new `stripHtml` helper), "Read full notice →" CTA, rotation dot indicators, and the thin `progress` bar. **Kept** the robust rotation state machine (`activeIdxRef` interval, `animTimeoutsRef` cleanup) — simplified `slideTo` to drop the now-unused `slideDir`/translate logic and use an **opacity crossfade** (cleaner for a multi-line block); kept the `enable_notice_board` gate + `useActiveNotices` + the full notice modal (swapped its `Volume2`→`Megaphone`, canonicalized its gradient classes).
  - **`components/shared/stat-card.tsx`:** added optional `accent` prop (`primary|warning|success|accent`) via `ACCENT_STYLES` → tinted icon bubble; polished value to `text-2xl sm:text-3xl tabular-nums`, added `hover:-translate-y-0.5`, `min-w-0`/`truncate` title, `shrink-0` icon.
  - **`components/shared/dashboard-content.tsx`:** passed distinct accents to the 4 stat cards (admin: primary/warning/accent/success; user: primary/warning/success/accent); added a local `PerfAvatar` helper (real `<img>` with `onError`→initials fallback, eslint-disable per convention) and used it for Top Performers (the previously-wasted `image`); added `tabular-nums` + truncation to performer rows; added a "Leaderboard →" link to the right-card header; polished the user Quick-Stats tiles (icon bubbles + bordered tints + tabular-nums + correct `currentRank > 0` guard).
- **Connected features preserved:** notice modal + `enable_notice_board` gate (Entry #41 setting) + 60s `useActiveNotices` poll intact; analytics server actions + the page's `Promise.all` prefetch unchanged (no new queries — `image` was already fetched); `SubscriptionBanner`, `DoableTasksPreview`, `DashboardFlashToast`, shared `PageHeader` untouched; reused the existing `progress` keyframe (globals.css) + built-in `animate-ping`/`animate-pulse` (no globals change).
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint components/shared/notice-board.tsx components/shared/stat-card.tsx components/shared/dashboard-content.tsx` clean (fixed self-introduced `w-4.5` → `w-5` per Entry #39's note that `4.5` isn't valid in this Tailwind setup, and removed the now-unused `slideDir`); dev server `GET /` 200, `GET /login` 200, `GET /dashboard` 307 (auth-gated).
- **Files touched:** `components/shared/notice-board.tsx`, `components/shared/stat-card.tsx`, `components/shared/dashboard-content.tsx`.
- **State:** Complete. The notice board is now an eye-catching spotlight card; stat cards have distinct accent tints; top performers show real profile photos; the dashboard reads consistently across mobile/tablet/desktop.
- **Visual test path (login → /dashboard):** spotlight notice card with pulsing megaphone + ANNOUNCEMENTS + NEW dot on recent notices, auto-rotating (dots + progress, pause on hover), "Read full notice" → modal; 4 accent-tinted stat cards; admin Top Performers with avatars + medal ranks + Leaderboard link; user Recent Activity + polished Quick Stats. Toggling `enable_notice_board` in /settings still hides/shows it; a new /notices entry surfaces within ~60s.
- **Out of scope (deliberate):** new analytics queries/migration; SubscriptionBanner/DoableTasksPreview internals; admin Recent-Activity status filter; replacing the shared PageHeader with a dashboard-specific hero.
- **Next step:** None on its own.

---

### Entry #43 · /inbox: 3 correctness bugs (rejected-user linger, wrong task deep-link, moderator appeals) + mobile row redesign
- **User prompt (Banglish):** "http://localhost:3001/inbox eita update korun and UI update korun kono bug thakle fix kore din"
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #42's). Plan-mode workflow: read all 4 inbox files → 1 Explore agent (filter/deep-link parity vs source surfaces) → direct reads (rejectUser, getPendingApprovalUsers, registerUser status, tasks-view tab state, tasks page) → ExitPlanMode → approved.
- **Bugs found + fixed:**
  1. **Rejected signups lingered in the `users` queue forever (MED):** `rejectUser` ([users.ts:770](lib/actions/users.ts)) sets `status='banned', is_approved=false`. The inbox counted/previewed `profiles WHERE is_approved=false` with no status filter, and `getPendingApprovalUsers` did the same — so rejected users showed in "New signups" + the sidebar badge permanently. Pending signups keep `status='active'` (registerUser only flips `is_approved`), so added `.neq("status","banned")` to the inbox count + preview **and** `getPendingApprovalUsers` (parity so the badge + /users pending tab agree).
  2. **`tasks` deep-link landed where the admin couldn't act (MED):** inbox linked a pending task to `/tasks/{id}` (detail page has no task-level approve/reject — that lives only in the `/tasks` Manage tab). Changed openHref → `/tasks?tab=manage` and taught the tasks page/view to honor `?tab=` (the `items` queue keeps `/tasks/{id}`, where Entry #23's per-item proof review does live).
  3. **`appeals` queue shown to moderators who can't open /appeals (MED):** `/appeals` is admin-only (proxy `adminOnlyPaths` + `manage_appeals` admin-only), but the inbox is staff-gated (`manage_users` includes moderator) and appeals weren't `isAdmin`-gated. Gated the appeals count + preview behind `isAdmin` (mirroring the existing `auto_reverse` gate) → moderators see no appeals tile/card and their `totalPending` badge excludes it; admins unaffected.
- **Done — 5 files:**
  - **`lib/actions/inbox.ts`**: `users` count + preview add `.neq("status","banned")`; `appeals` count + preview wrapped in `isAdmin ? … : Promise.resolve({count:0})` / `{data:[]}`; `tasks` openHref → `/tasks?tab=manage`.
  - **`lib/actions/users.ts`**: `getPendingApprovalUsers` adds `.neq("status","banned")` (parity).
  - **`app/(dashboard)/tasks/page.tsx`**: server component now awaits `searchParams` (Next 16 Promise) and passes `initialTab={tab}` to `<TasksView>` (avoids a `useSearchParams` Suspense boundary).
  - **`components/shared/tasks-view.tsx`**: new `resolveInitialTab(initialTab, isAdmin)` helper + `initialTab?: string` prop; `useState` initializes from it, clamping admin-only tabs (`manage`/`review`) to `doable` for non-staff.
  - **`components/shared/admin-inbox.tsx`**: `InboxRowItem` redesigned as a single full-row `<Link>` (avatar + title + subtitle·relativeTime meta line + trailing chevron) — drops the cramped separate "Open" button so rows fit 375px; dead `font-display` → `tabular-nums` on tile counts; queue-card header title/desc `truncate` + `min-w-0` with `shrink-0` "View all" (icon-only on mobile); tile grid `grid-cols-2 md:grid-cols-3` → `grid-cols-2 sm:grid-cols-3`; canonicalized the avatar `bg-gradient-to-br` → `bg-linear-to-br` (line was rewritten).
- **Connected features preserved:** inbox stays a triage/deep-link view (no inline actions added — source surfaces still own approve/reject); `getAdminInboxCounts` shape unchanged (sidebar `totalPending` badge intact); `items`/`payments`/`groups`/`tickets`/`contact`/`auto_reverse` queries + 60s refetch hooks + all-clear/loading states untouched; normal /tasks load (no `?tab`) still defaults to Doable; group-detail approve/reject deep-link (correct) untouched.
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint lib/actions/inbox.ts lib/actions/users.ts components/shared/admin-inbox.tsx components/shared/tasks-view.tsx app/(dashboard)/tasks/page.tsx` clean; dev server `GET /login` 200, `GET /inbox` 307 (auth-gated), `GET /tasks?tab=manage` 307.
- **Files touched:** `lib/actions/inbox.ts`, `lib/actions/users.ts`, `app/(dashboard)/tasks/page.tsx`, `components/shared/tasks-view.tsx`, `components/shared/admin-inbox.tsx`.
- **State:** Complete. Rejected users no longer linger; the tasks row lands the admin on the Manage tab where they can act; moderators no longer see an appeals queue they can't open; inbox rows are mobile-friendly.
- **Visual test path:** (super_admin) reject a pending signup → it leaves the inbox "New signups" tile + sidebar badge; inbox "Tasks awaiting approval" → Open → lands on /tasks Manage tab with the pending task + Approve/Reject; 375px → rows are one tappable line (avatar + title + subtitle·time + chevron), no crowding; tile counts tabular. (moderator) → no appeals tile/card, badge excludes appeals.
- **Out of scope (deliberate):** inline approve/reject in the inbox; task-level approve/reject on the task detail page (Manage tab is the surface); `users` openHref stays `/users`; realtime push (60s poll suffices).
- **Next step:** None on its own.

---

### Entry #42 · /settings rows: fix mobile/tablet layout (cramped label + per-word wrapping)
- **User prompt (Banglish):** "mobile friendly hoi nei amar dewa screenshot ti dekho — text er opore text uthe thake; USD → BDT rate jokhn jeta thakbe oita show korbe othoba admin set kore dibe" (+ screenshot of /settings Points rows on a narrow view).
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #41's). Direct targeted fix (read the row renderer + page wrapper, no Explore/Plan agents needed).
- **Bug (responsive, from Entry #41's redesign):** the screenshot showed input rows still side-by-side on tablet/narrow widths — label column crushed to ~90px so "Referral Bonus" wrapped to 2 lines and the description wrapped **one word per line**, with the number input taking most of the width.
- **Root cause:** number/text + color rows switched to horizontal at `sm` (640px), but the /settings page narrows its content with a `md:w-52` (208px) category sidebar → on tablet the content card inner is only ~400–500px while the row is already horizontal. The input was `flex-1 sm:w-48` — the `flex-1` made it *grow* inside the `sm:shrink-0` wrapper, eating the width; and `labelCol` was `min-w-0 sm:flex-1` (no grow below sm), compounding the squeeze.
- **Done — 1 file, `components/shared/settings-view.tsx`, CSS-only:**
  - `labelCol`: `min-w-0 sm:flex-1` → `min-w-0 flex-1` (always claims available width; harmless in the stacked column since there's no free vertical space, stretches to full width so descriptions wrap normally).
  - **Number/text row** + **color row** wrappers: `flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4` → `flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4` — stay **stacked through mobile AND tablet**, only inline at `lg` (≥1024px) where the sidebar-narrowed card is wide enough.
  - Control wrappers: `… sm:shrink-0` → `flex gap-2 w-full lg:w-auto lg:shrink-0` (full-width line when stacked).
  - Inputs: number/text `flex-1 sm:w-48` → `flex-1 lg:flex-none lg:w-48`; color hex `flex-1 sm:w-32 font-mono` → `flex-1 lg:flex-none lg:w-32 font-mono` (fills width when stacked; fixed width, no grow, when inline).
  - **Boolean rows** left always-horizontal (toggle is ~40px, never crushes the label) — they just inherit the `labelCol` `flex-1` improvement.
- **USD → BDT Rate:** unchanged logic — it already renders the current stored value (110) as an editable number row with Save (from Entry #41); this fix just makes it render cleanly on mobile/tablet. The user's "show whatever it is / admin sets it" is already satisfied.
- **Connected features preserved:** boolean toggle save-immediately, color picker swatch+hex, #39 numeric guard + audit, #41 `handleSave` coercion fix + `SETTING_META` labels/descriptions, SettingsProvider branding sync, Platforms tab — all untouched (purely Tailwind class changes on the row wrappers + labelCol).
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint components/shared/settings-view.tsx` clean; dev server `GET /login` 200, `GET /settings` 307 (auth-gated).
- **Files touched:** `components/shared/settings-view.tsx`.
- **State:** Complete. Rows now stack cleanly on mobile + tablet (label + full-width description on top, input + Save full-width below) and only go inline at ≥1024px.
- **Visual test path (login as admin → /settings, resize 375 / 768 / 1024 / 1440):** <1024px → every row stacks, no per-word wrapping, no horizontal overflow; ≥1024px → inline label-left / fixed input-right (Entry #41 desktop look). General tab USD → BDT Rate shows 110 + Save; color rows show swatch + hex; toggles save immediately; Platforms tab unchanged.
- **Next step:** None on its own.

---

### Entry #41 · /settings (2nd pass): seed missing settings (currency bug) + save-coercion fix + full UI redesign
- **User prompt (Banglish):** "http://localhost:3001/settings ei page er potita function check koro thik ache ki na kono bug ache ki na and ei page er UI ta Update koro mobile tablet shoho shundor koro"
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #39's). Plan-mode workflow: re-audit settings.ts + settings-view.tsx + settings-provider + the seed migrations + every `.eq("key",…)` consumer → AskUserQuestion (1 decision: full redesign vs lighter polish → user chose **full redesign**) → ExitPlanMode → approved.
- **Why a 2nd pass:** Entry #39 fixed 3 data-layer bugs + did a *light* responsive polish. This pass went function-by-function and surfaced two settings the app **reads but never seeds**, plus a save-time type-coercion edge bug, and the user explicitly wanted a fuller "shundor" UI.
- **Bugs found + fixed:**
  1. **`usd_to_bdt_rate` never seeded (MED-HIGH, functional):** read by `lib/actions/auth.ts` (registration BDT conversion) + `lib/actions/payments.ts` `getUsdToBdtRate`. No migration seeds it → `.single()` returns null → `convertCurrency` (lib/currency.ts:15) bails to USD (BDT pricing silently never converts) AND it's invisible/unsettable in /settings (the UI only renders existing rows whose category is one of the 6 known tabs).
  2. **`enable_notice_board` never seeded (LOW-MED, functional):** read by settings-provider + notice-board.tsx; defaults true, not manageable from /settings.
  3. **`handleSave` ran `unwrapValue` on the saved value (LOW, edge correctness):** `updateSetting(key, unwrapValue(currentValue))` — typing a JSON-parseable string ("123", "true", "[1]") into a text setting coerced it to number/bool/array before save.
  - Cross-checked every `.eq("key",…)` read: `require_subscription` ✓ + `require_user_approval` ✓ are seeded (migration 019); only the two above were missing.
- **Done — 1 new migration + 1 component:**
  - **NEW `supabase/migrations/054_seed_missing_settings.sql`:** idempotent `INSERT … ON CONFLICT (key) DO NOTHING` seeding `usd_to_bdt_rate='110'` + `enable_notice_board='true'` under category `general` (so they surface in an existing tab — there's no payments/feature tab). **Applied + verified idempotent** (1st & 2nd apply both 0 rows — this dev DB already had them manually inserted; but no migration file seeded them, so a fresh deploy would lack them → 054 closes the gap). Confirmed both rows present: `usd_to_bdt_rate`=110 (JSONB number), `enable_notice_board`=true (JSONB boolean).
  - **`components/shared/settings-view.tsx`:**
    1. **`handleSave` coercion fix:** sends the raw local value (`updateSetting(key, currentValue)`); the server's #39 numeric guard still coerces genuinely-numeric settings. `unwrapValue` kept only for the display helpers.
    2. **`SETTING_META` map + `getSettingMeta`:** friendly human label + one-line description for all ~28 seeded keys across the 6 categories; unknown keys fall back to `titleizeKey` (Title-Case with USD/BDT/URL/ID/AI/API acronym handling).
    3. **Redesigned row renderer** — a divided list (`divide-y divide-border/40`) where each row has a left column (label + muted description) and a right-side control. Three control types: **boolean** → toggle (saves immediately, now disabled while saving); **color** (`/_color$/` + string) → native `<input type="color">` swatch + hex `<Input>` + Save (both edit the same value, live branding preview); **number/text** → input + Save. Responsive: label/description stack above the control on mobile (`flex-col sm:flex-row`), input goes `flex-1 sm:w-48`.
    4. Kept #39's responsive category nav (desktop sidebar / mobile gradient pills), shared `<SectionHeader>`, and the `PlatformsSettings` brand-icon tab unchanged.
- **Connected features verified preserved:** `convertCurrency` signature/logic untouched (now fed a real rate); registration BDT path + `getUsdToBdtRate` now find a row; notice board still defaults true; #39's `updateSetting` numeric guard + `recordAudit` untouched (save fix is client-side); boolean toggle save path unaffected (saves `checked` directly); SettingsProvider 2-min poll + CSS-var branding sync intact (color picker saves the same hex string); platform toggle untouched.
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint components/shared/settings-view.tsx` clean; migration 054 idempotent + rows confirmed via direct DB query; dev server `GET /` 200, `GET /login` 200, `GET /settings` 307 (auth-gated).
- **Files touched:** `supabase/migrations/054_seed_missing_settings.sql` (new), `components/shared/settings-view.tsx`.
- **State:** Complete. Currency rate + notice-board toggle are now manageable from /settings (and seeded for fresh deploys), text settings no longer get type-coerced on save, and every setting row shows a friendly label + description with a color picker for brand colors — responsive across mobile/tablet/desktop.
- **Visual test path (login as admin → /settings):**
  1. **General** tab → "USD → BDT Rate" (110, number input) + "Notice Board" toggle now appear. Set the rate → a BDT payment method converts amounts.
  2. Type `"123"` into Site Name → Save → reload → still the string "123" (not coerced).
  3. `usd_to_bdt_rate` → "abc" → Save → error toast (the #39 guard fires).
  4. **Branding** tab → Primary/Accent Color rows show a color swatch + hex; picking a color live-edits the hex and (on Save) repaints branding via SettingsProvider.
  5. Every row shows a human label + description (no more "Usd to bdt rate"). Mobile 375 px: rows stack, no overflow; nav scrolls as pills; desktop sidebar + inline inputs intact. Platforms tab unchanged.
- **Out of scope (deliberate):** settings metadata DB columns (labels live in the TS map); /landing-editor redesign; rate-limiting `updateSetting`; a dedicated Payments/Currency category tab (rate lives under General to avoid a nav change).
- **Next step:** None on its own.

---

### Entry #40 · /leaderboard: render real avatars + desktop/tablet polish to match mobile
- **User prompt (Banglish):** "http://localhost:3001/leaderboard oageta bug fix koro and UI ta update koro mobile tablet shoho"
- **Audit (direct reads — not plan mode):** `app/(dashboard)/leaderboard/page.tsx` (thin wrapper: `<PageHeader>` + `<LeaderboardView currentUserId>`), `components/shared/leaderboard-view.tsx` (361 lines), `lib/actions/points.ts` `getLeaderboard` (117-211).
- **Findings:**
  1. **No crash bug.** `getLeaderboard`'s `amount` column is correct (verified against analytics.ts/exports.ts — NOT a swallowed-error/wrong-column bug like Entry #37's `.or()`); ranks are contiguous via post-filter index; `status="active"` filtering is correct in both the all_time and time-window branches.
  2. **Bug-class gap (incomplete impl):** `getLeaderboard` fetches + returns each user's `image` (profile-photo CloudFront URL) in BOTH branches, but the UI **never rendered it** — every user always showed `getInitials(name)`. Wasted fetch + missing avatars.
  3. **UI gap:** a prior session had redesigned only the **mobile** layout (app-style champion hero + #2/#3 podium + ranked cards); the comments literally said the desktop podium/table were "untouched/original". So laptop/tablet users (sm+) still saw the plain border-2 podium + plain table — exactly what "update UI mobile tablet shoho" targets.
- **Done — 1 file, `components/shared/leaderboard-view.tsx`:**
  - **New `LbAvatar` helper:** renders the real `<img>` profile photo (object-cover, `// eslint-disable-next-line @next/next/no-img-element` per codebase convention) with an `onError` → initials fallback, and a gradient-initials fallback when there's no image. Optional `fallbackClassName` so the mobile hero keeps its vivid `from-primary to-accent text-white` initials tile. Used in all 5 avatar spots.
  - **Desktop/tablet podium redesign** (`hidden sm:grid grid-cols-3 items-end`): champion (center) elevated `md:-mt-6` with a yellow→orange→pink gradient wash + crown badge + gradient avatar ring; #2/#3 with medal accent bars; all three now show real avatars + a medal pill + tasks(`CheckCircle2`)/streak(`Flame`) chips + `tabular-nums` points. Current user gets `ring-2 ring-primary/40`.
  - **Desktop/tablet table polish:** rank cell now a medal-tinted rounded pill (top-3) / muted number; user cell shows the `LbAvatar` (was an initials-only tile); `tabular-nums` on points/tasks; current-user row highlight + `You` badge preserved.
  - **Mobile layout:** structurally unchanged (already polished) — only swapped the three initials `<div>`s (hero, #2/#3 podium, ranked cards) to `LbAvatar` so real photos show there too.
  - Imported `cn` from `@/lib/utils`; added `accent` color to the `medals` array for the ring/bar fills.
- **Connected features verified preserved:** `getLeaderboard` server action untouched (no query/shape change); `useQuery(["leaderboard","global",timeFilter])` key unchanged; time-window `<Select>` filter intact; group-scope `getLeaderboard("group",…)` (used by group-detail) untouched; `currentUserId` highlight logic identical.
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint components/shared/leaderboard-view.tsx` clean (fixed a misplaced eslint-disable that landed on `return (` instead of `<img>`); dev server `GET /` 200, `GET /login` 200, `GET /leaderboard` 307 (auth-gated, expected).
- **Files touched:** `components/shared/leaderboard-view.tsx`.
- **State:** Complete. Real profile photos now render across mobile + desktop; the desktop/tablet podium and table are brought up to the mobile layout's polish level.
- **Visual test path (login → /leaderboard):** desktop ≥640px shows the elevated-champion 3-col podium with avatars + crown + medal bars, then a ranked table with avatars + medal rank pills; phone <640px shows the champion hero + 2-up podium + ranked cards; users with a profile photo show the photo, others fall back to initials; the time-window `<Select>` (All Time / Month / Week / Today) still re-queries.
- **Out of scope (deliberate):** a pinned "your rank #N" card for users outside the top-100 (would need the `get_user_rank` RPC wired into this client — a new feature, not a bug); windowed tasks/streak in time-filtered mode (tasks/streak stay lifetime stats — defensible, avoids extra queries); excluding staff/admin seed-point accounts from the board (product decision, not requested).
- **Next step:** None on its own.

---

### Entry #39 · /settings: 3 data-layer bug fixes (security gate, audit, numeric validation) + responsive UI polish
- **User prompt (Banglish):** "http://localhost:3001/settings fix all bug and update UI design"
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #38's). Workflow: audit settings-view.tsx + settings.ts + the settings schema → AskUserQuestion (2 decisions: polish current layout; fix all 3 bugs incl numeric validation) → ExitPlanMode → approved.
- **Bugs fixed:**
  1. **`updateLandingContent` missing admin gate (HIGH/security):** [lib/actions/settings.ts](lib/actions/settings.ts) — the action only checked `session?.user?.id`, NOT `isAdminRole`. Any authenticated user could POST to it and rewrite the public landing page. Added the `isAdminRole` gate (matches `updateSetting`).
  2. **`updateSetting` no audit (MEDIUM):** added `recordAudit("setting_update", "setting", key, { old, new })` so every platform-wide setting change (require_subscription, primary_color, usd_to_bdt, etc.) lands in `admin_audit_log`. Reads the existing value first to capture the old→new diff.
  3. **No numeric validation (MEDIUM):** `updateSetting` now reads the current value's JS type (supabase-js returns JSONB pre-parsed); if it's a number, it coerces + validates the incoming value with `Number.isFinite` and rejects non-numbers ("This setting must be a valid number") — protects `usd_to_bdt` and other numeric settings from being corrupted into strings.
  - **`lib/audit.ts`:** extended `AuditAction` with `"setting_update"` and `AuditTargetType` with `"setting"` (additive).
- **UI polish ([components/shared/settings-view.tsx](components/shared/settings-view.tsx)):**
  - **Category nav**: each category now has an icon (General→SlidersHorizontal, Branding→Palette, Notifications→Bell, Security→ShieldCheck, Points→Coins, Platforms→LayoutGrid) + a description. Desktop keeps the quiet vertical sidebar (active = `bg-primary/10 text-primary` + semibold); mobile renders the same items as horizontal gradient pills (`bg-linear-to-r from-primary to-accent` active) consistent with the rest of the dashboard, via responsive `md:` overrides.
  - **Section header**: the category card + Platforms card now use the shared `<SectionHeader>` (Entry #35) with the category icon + title + description. Removed the now-unused `CardHeader`/`CardTitle` imports.
  - **Mobile-friendly text rows**: replaced the `justify-between` + fixed `w-48` input layout (which clipped on 375px) with `flex-col sm:flex-row` — label on its own line on mobile, full-width input (`flex-1`) + Save; back to inline `w-48` on `sm+`.
  - **Number inputs**: numeric settings now render `type="number"` + `inputMode="decimal"` (via new `isNumberValue` helper mirroring `isBoolValue`).
  - **Brand platform icons**: PlatformsSettings now shows the real `PlatformIcon` (Instagram/YouTube/Spotify…) when `PLATFORM_BRAND_SLUGS.has(slug)`, else the colored-letter fallback — matching the TaskBundleCard pattern from Entry #21.
- **Connected features verified preserved:**
  - `updateSetting` JSONB round-trip (`unwrapValue`/`displayValue`) unchanged; only added the guard + audit.
  - SettingsProvider 2-min poll (Entry #33) still reads `getSettings` (unchanged shape) → branding color changes still repaint cross-client.
  - Platform toggle (`setPlatformActive`, `platform_toggled` audit) untouched — only the avatar swapped for a brand icon.
  - `require_subscription` toggle still saves the boolean → `/plans` visibility logic intact.
  - Toggle settings still save immediately + `router.refresh()`.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/settings-view.tsx lib/actions/settings.ts lib/audit.ts` clean (no output).
  - Dev server (PID 20516): `GET /` 200, `GET /login` 200, `GET /settings` 307 (auth-gated).
- **Files touched:** `lib/audit.ts`, `lib/actions/settings.ts`, `components/shared/settings-view.tsx`.
- **State:** Complete. Closed a real privilege-escalation hole (landing-content edits), added an audit trail for system-setting changes, protected numeric settings from corruption, and made /settings responsive with consistent dashboard styling.
- **Visual test path (login as admin → /settings):**
  1. Edit `usd_to_bdt` to "abc" → Save → error toast "must be a valid number"; valid number saves + persists as a number.
  2. Toggle `require_subscription` / change `site_name` → `/audit` shows a `setting_update` row with old→new.
  3. Mobile 375 px: category nav scrolls as gradient pills; text rows stack (label above full-width input + Save) — no horizontal clip.
  4. Desktop: vertical sidebar nav with icons; section-header icon per category; inputs inline at w-48.
  5. Platforms tab: brand icons render; toggle still flips is_active + hides from create-task picker.
- **Out of scope:** per-setting friendly label/description copy map; settings type/description DB columns; updateSetting rate-limit; /landing-editor redesign.
- **Next step:** None on its own.

---

### Entry #38 · /payments: fix reviewPayment silent-failure bug + unified pill tabs + InvoicesTab mobile cards
- **User prompt (Banglish):** "http://localhost:3001/payments ei page ta valo kore check koro kono bug ache ki na and UI ta update koro shundor koro, ei page er sathy releted ja ache sob ek sathy shes koro"
- **Audit:** 2 parallel Explore agents (UI map + data-layer bug hunt) + a direct read of `reviewPayment`. The `.or()` embedded-search bug class from Entry #37 is NOT present here.
- **HIGH-impact bug fixed — `reviewPayment` silent value-delivery failure:** The approve flow flips the payment to `approved` first (atomic double-approval claim — correct), then runs subscription deactivate/insert + `adjust_user_points` RPC + signup `is_approved` — **all without error checks**. Any failure was swallowed by the outer try/catch, leaving the payment marked `approved` while the user got NO subscription/credits and was emailed a false "approved" confirmation. User chose the pragmatic fix (Option B): claim → deliver-with-checks → rollback-on-failure (no migration).
- **Done — 2 files modified:**
  - **`lib/actions/payments.ts`**:
    1. New `revertPaymentClaim(db, paymentId)` helper — flips status back to `pending` + clears `reviewed_by/reviewed_at` so the admin can retry.
    2. Moved `recordAudit` out of the post-claim position. For **approve**, the audit now fires only AFTER all value-delivery commits; for **reject**, it fires in the reject branch.
    3. Guarded all 5 delivery mutations with `{ error }` destructuring: deactivate old subs, insert new sub, plan-credits RPC, signup `is_approved` update, points-purchase RPC. On ANY failure → `revertPaymentClaim` + return a specific error toast ("…Payment left pending — try again.") instead of a false success.
    4. Hardened the branch control flow: reject is now `if (action === "reject")` (was `if (action === "reject" && userId)`), with a pathological-fallthrough return so an approve-with-null-userId can never be mis-audited as a reject.
  - **`components/shared/payments-admin.tsx`**:
    1. **Unified pill tabs** (Entry #30 pattern) replacing the old desktop-underline bar. Added `short` labels (Plans/Methods/Packages/Review/Invoices) for mobile; full labels on sm+; gradient active + `tabular-nums` count chips; edge-bleed scroll.
    2. **InvoicesTab mobile cards**: wrapped the 7-column table in `hidden lg:block` and added a `lg:hidden space-y-3` stacked-card list (invoice# + user avatar/name/email + TX + status badge + purpose/amount/date footer + View/Edit actions). No more horizontal scroll on phones.
    3. New module-level `getInvoiceFields(inv)` helper — pure field extraction shared by the desktop row + mobile card so they never drift.
    4. Canonical-class fixes on touched lines: `bg-gradient-to-br` → `bg-linear-to-br`, `max-w-[140px]` → `max-w-35`.
- **Retry-safety note (Option B trade-off):** if the credits-RPC fails after the sub insert, revert leaves an orphan active sub; on retry the deactivate-old-subs step (runs before insert) cancels it → self-heals. Documented; user chose B over a full atomic Postgres RPC.
- **Connected features verified preserved:**
  - **Atomic double-approval claim** — kept exactly; only added checks + rollback after it.
  - **Wallet RPC** (`adjust_user_points`, migration 017/035) — only its `{ error }` is now read; RPC unchanged.
  - **`computeRemainingQuota` carry-over + `periodMultiplier` credit scaling** — untouched.
  - **Invoice PDF + approval/rejection emails** — still best-effort after success.
  - **`useReviewPayment` / `useAllInvoices` / `useAllPayments` invalidations** — verified correct by the agent; unchanged.
  - **Entry #30 pill pattern** — applied, not modified.
  - **PlansTab / MethodsTab / PackagesTab / SubmissionsTab** — already card-based; untouched.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (after the reviewPayment changes + UI changes).
  - `pnpm exec eslint components/shared/payments-admin.tsx lib/actions/payments.ts` — 3 warnings, all pre-existing `<img>` in MethodsTab (lines 526/563/632), NOT on lines I touched (MethodsTab img cleanup was explicitly out of scope).
  - Dev server (PID 20516): `GET /` 200, `GET /login` 200, `GET /payments` 307 (auth-gated).
- **Files touched:** `lib/actions/payments.ts`, `components/shared/payments-admin.tsx`.
- **State:** Complete. The silent money/credits bug is fixed (approvals now either fully succeed or cleanly revert to pending with an error), and /payments matches the dashboard's responsive language (pill tabs + Invoices mobile cards).
- **Visual + behaviour test path (login as super_admin → /payments):**
  1. Approve a pending subscription payment → sub created + credits added + status approved + notif/email (unchanged happy path).
  2. Approve a points payment → points credited.
  3. Double-approve race → second click returns "already reviewed by another admin".
  4. Reject → user notified + emailed; audit logged as reject.
  5. Mobile 375 px → pill tabs (short labels), Invoices tab = stacked cards, no horizontal scroll.
  6. Laptop 1024 px+ → Invoices desktop table returns; pills inline with full labels.
  7. All 5 tabs switch; CRUD modals + status-edit modal open.
- **Out of scope:** full atomic Postgres RPC; MethodsTab `<img>` → next/image; PlansTab/PackagesTab/MethodsTab redesign; payment-submission-modal (worker-facing).
- **Next step:** None on its own.

---

### Entry #37 · /users: fix broken search (high-impact bug) + responsive mobile/tablet card list + filter row polish
- **User prompt (Banglish):** "http://localhost:3001/users ei page ti check korun kono bug thakle fix korun UI update korun, ei page releted joto issue ache fix korun"
- **High-impact bug found + fixed:** `getUsers` search was **completely broken**. The query used `query.or("users.name.ilike.%x%,users.email.ilike.%x%")` — a PostgREST `.or()` on the parent (profiles) referencing embedded `users.*` columns. Empirically verified against the dev DB: this form throws `"failed to parse logic tree"`, which `getUsers` swallowed in its `catch` and returned an empty list — so **every search returned zero results**. Fixed to `query.or("name.ilike.%x%,email.ilike.%x%", { referencedTable: "users" })` which (verified) correctly returns matching rows ("Mah" → Mahedi Hasan).
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #36's). Workflow: audit users-table.tsx + getUsers → AskUserQuestion (3 decisions: responsive card list for mobile; tighten filter row; verify+fix search + audit other bugs) → ExitPlanMode → user approved. Verified the search bug with a live `@supabase/supabase-js` script before/after.
- **Done — 2 files modified:**
  - **`lib/actions/users.ts`** — `getUsers` search `.or()` fixed to use `{ referencedTable: "users" }`. One-block change + explanatory comment about the swallowed parse error.
  - **`components/shared/users-table.tsx`** — responsive overhaul + helper extraction:
    1. **`getUserRowFields(row)`** module-level helper extracts the 11 display fields off a joined profiles+users row. Used by BOTH the desktop table row and the new mobile card so the layouts never drift.
    2. **`openActionMenu(e, userId)`** extracted from the inline table-cell onClick into a component method. Both desktop ⋯ and mobile ⋯ call it. `MENU_HEIGHT` bumped 320 → 360 (menu grew to ~12 items in Entry #31) so the up/down flip math matches the real menu size.
    3. **Desktop table** wrapped in `hidden lg:block` — full 7-column table only on lg+.
    4. **New `lg:hidden` mobile/tablet card list**: each user = a card with avatar (taps → profile modal) + name + email-verified icon + email + role/status/pending badges + a footer stats strip (points · tasks · joined) + ⋯ menu (same portal). Loading skeletons + empty state + pagination all mirrored. No more horizontal scrolling on phones.
    5. **Filter row restructured** for mobile: search + icon-only Export on row 1; Role + Status side-by-side + Approval full-width in a 2-col grid on row 2. On `sm+` everything flows inline via `sm:contents` (the wrapper divs dissolve so the children become direct flex items of the row — same single-row layout as before).
- **Connected features verified preserved:**
  - **Entry #31 password reset** (`PasswordResetDialog`, ⋯ menu item) — portal menu + dialog untouched; just gains a second trigger (mobile card).
  - **Entry #33 JWT freshness** — role/status mutations still propagate.
  - **Profile modal** (`getUserById` via `openProfile`) — opened from both desktop name click + mobile card tap.
  - **All ⋯ actions** (View Profile, Make Admin/Moderator/Group Leader/Member, Suspend/Activate, Assign/Deduct Points, Assign Plan, Reset Password, Ban) — unchanged handlers, work from both triggers.
  - **CSV export** (`exportUsersCsv`) — unchanged, icon-only on mobile.
  - **Pagination** — works on both desktop table footer + mobile card list.
- **Verified:**
  - Search fix verified against the live dev DB (old form errors, new form returns correct rows).
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/users-table.tsx lib/actions/users.ts` clean (no output).
  - Dev server (PID 20516): `GET /` 200, `GET /login` 200, `GET /users` 307 (auth-gated).
- **Files touched:** `lib/actions/users.ts`, `components/shared/users-table.tsx`.
- **State:** Complete. The search bug — which silently blanked the user list on any query — is fixed. /users now has a proper mobile/tablet card layout matching the rest of the dashboard (Entries #28/#35), and a compact filter row on small screens.
- **Visual test path (login as super_admin → /users):**
  1. Type a partial name/email in search → list filters to matches (was returning nothing before). Clear → full list returns.
  2. Mobile 375 px → no horizontal scroll; user cards stack; filter row = search + icon Export on top, Role/Status side-by-side + Approval full-width below. Tap avatar/name → profile modal. Tap ⋯ → portal menu, correctly positioned.
  3. Tablet 768 px → still card list; filters inline.
  4. Laptop 1024 px+ → desktop table returns unchanged; filters inline in one row.
  5. Every ⋯ action works from both desktop + mobile.
- **Out of scope:** column-sort UI; bulk multi-select; promoting the mobile card to a shared component; profile-modal redesign; `<img>` → next/image.
- **Next step:** None on its own.

---

### Entry #36 · /plans responsive polish: 2-col tablet grid + flex period picker + empty state + mobile spacing
- **User prompt (Banglish):** "http://localhost:3001/plans ei page tao UI issue ache tab a mobile a fix kore shundor design a kore deo"
- **Audit:** the `/plans` plans-view.tsx had several tablet/mobile pain points: (1) plan cards forced into `md:grid-cols-3` at 768px squeezed each card to ~230px; (2) `p-8` padding on plan cards was overkill on phones; (3) the popular-plan `md:scale-[1.02]` triggered on tablet too and clipped ribbons; (4) period picker `grid-cols-3` left an empty cell when only 2 tiers were configured (monthly + yearly); (5) no empty state when admin had configured zero plans + zero packages — page rendered a headerless blank grid; (6) section headings were flat `text-2xl` across breakpoints; (7) one pre-existing Tailwind v4 `bg-gradient-to-br` canonical-class warning on the package card.
- **Done — 1 file modified (`components/shared/plans-view.tsx`):**
  1. **Plan grid breakpoint shift**: `md:grid-cols-3` → `sm:grid-cols-2 lg:grid-cols-3`. Tablets (md = 768px) now get 2-col with breathing room; only laptop/desktop (lg = 1024px+) go full 3-col. Same fix on the loading skeleton + the packages grid.
  2. **Mobile padding**: plan card `p-8` → `p-5 sm:p-6 lg:p-8`; package card `p-6` → `p-5 sm:p-6`. Phones get a tighter card without losing the desktop breathing room.
  3. **Scale shift**: popular-plan `md:scale-[1.02]` → `lg:scale-[1.02]` so tablets render flat (no overlap with neighbour cards in the new 2-col tablet layout).
  4. **Period picker** restructured `grid grid-cols-3` → `flex` with `flex-1 basis-0 min-w-0` per pill, so a 2-tier plan gets two equal-width pills instead of a `[Monthly][Yearly][]` empty third cell. Bumped text from `text-[11px]` to `text-xs`.
  5. **Ribbon text** scaled: `text-[11px]` → `text-[10px] sm:text-[11px]`; outer ribbon padding `px-4` → `px-3 sm:px-4` so the "Most Popular" / "Current Plan" badge sits comfortably above a narrower tablet card.
  6. **Plan card price**: `text-4xl` → `text-3xl sm:text-4xl`; "/ monthly" subtitle `text-base` → `text-sm sm:text-base`.
  7. **Plan name**: `text-xl` → `text-lg sm:text-xl`.
  8. **Section headings**: "Subscription Plans" + "Buy Extra Points" → `text-2xl sm:text-3xl` (matches Entry #30 PageHeader scaling).
  9. **Empty state** when admin has 0 plans + 0 packages — renders an `<Package>` icon card with "No plans available yet" + "The admin hasn't configured subscription plans or point packages. Check back later." + Back-to-dashboard button. Mirrors the existing "plans disabled" card.
  10. **Subscription-plans section conditional**: `{planList.length > 0 && <section>…</section>}` so if admin only configured packages (no plans), the Subscription Plans section is hidden instead of rendering an empty grid.
  11. **Package card polish**: `bg-gradient-to-br` → `bg-linear-to-br` (Tailwind v4 canonical), tile icon container gets `shrink-0`, name gets `truncate` on a `min-w-0` parent, description gets `line-clamp-2`, price `text-3xl` → `text-2xl sm:text-3xl`.
  12. **Spacing scale**: outer `space-y-10` → `space-y-8 sm:space-y-10`; grid gaps `gap-6` → `gap-4 sm:gap-6` on the plans grid.
- **Connected features verified preserved:**
  - **Entry #30** PageHeader on /plans page renders correctly above the polished view.
  - **`usePlans` / `useMySubscription` / `useMyQuotaUsage` / `usePointPackages`** hooks — read-only, no signature changes.
  - **`PaymentSubmissionModal`** — opens identically for plan + package purchases.
  - **`QuotaCard`** + **`QuotaMeter`** — bottom-half of the file; untouched.
  - **`require_subscription` setting check** + redirect to /dashboard — unchanged.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/plans-view.tsx` clean (no output).
  - Dev server (PID 20516): `GET /` 200, `GET /login` 200, `GET /plans` 307 (auth-gated).
- **Files touched:** `components/shared/plans-view.tsx` (only).
- **State:** Complete. /plans now scales gracefully from 375 px → 768 px → 1024 px → 1440 px+. The popular-plan card no longer crashes into its neighbour on tablet; the period picker auto-fits regardless of tier count; admins who haven't configured plans get a friendly empty state.
- **Visual test path:**
  1. Mobile 375 px → single-col stacking. Period picker pills at full width inside each card. Ribbon text sized down. `p-5` card padding.
  2. Tablet 768 px → 2-col plan grid. Popular plan is flat (no scale). Each card has comfortable width.
  3. Laptop 1024 px+ → 3-col plan grid. Popular plan gets the `lg:scale-[1.02]` boost. Full `p-8` padding.
  4. Admin configures only point packages (no plans) → Subscription Plans section hides entirely; only "Buy Extra Points" renders.
  5. Admin configures nothing → empty-state card with Package icon + back-to-dashboard button.
- **Out of scope:** Quota card redesign; PaymentSubmissionModal polish; admin plan CRUD on `/payments`; SettingsProvider refresh (Entry #33 already covers it).
- **Next step:** None on its own.

---

### Entry #35 · /groups + /groups/create polish: unified pill tabs, responsive GroupCard, sticky live preview, shared SectionHeader
- **User prompt (Banglish):** "http://localhost:3001/groups, http://localhost:3001/groups/create ei 2ta page a kono issue thakle fix koro UI ta update koro mobile tablet both"
- **Audit findings:** `/groups` had dual desktop-underline + mobile-pill tabs (~37 lines duplicate), dual desktop-grid + mobile-stacked card renderings in both `MyGroupsTab` and `ManageGroupsTab` (~180 lines duplicate), a raw `<select>` in the admin filter that didn't match TaskMOS styling, member count missing on desktop, and category never displayed. `/groups/create` was a plain `max-w-2xl` form with no section icons, no live preview, no sticky CTA, and `<img>` eslint warnings for cover/avatar.
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #34's). Workflow: audit both files end-to-end → AskUserQuestion (2 decisions: full Entry-#34 treatment for /groups/create; unify per Entry #30 for /groups list) → ExitPlanMode → user approved.
- **Done — 4 files modified, 1 new file:**
  - **NEW `components/shared/section-header.tsx`** (~50 lines): extracted the `SectionHeader` helper Entry #34 added inline to task-form.tsx. Now both /tasks/create and /groups/create import one definition. Single export, no API change vs the inline version. Promoted out per the "two surfaces = promote" rule.
  - **`components/shared/task-form.tsx`**: deleted the 36-line inline `SectionHeader` definition + the unused `CardDescription` / `React.ComponentType` types. Replaced with `import { SectionHeader } from "@/components/shared/section-header"`. Behavior identical; Entry #34 polish preserved.
  - **`components/shared/groups-list.tsx`** (rewritten, 375 → ~310 lines, **-65 lines net**):
    1. **Unified pill tabs** (Entry #30 pattern): one render block, full label on `sm+`, short label (`My` / `Manage`) on mobile, active = brand gradient + glow + count chip with `tabular-nums`. Drops the `hidden sm:flex` underline + `sm:hidden -mx-4 pill` dual blocks.
    2. **New `<GroupCard>`** responsive component: avatar tile + name + meta row (`privacy · N members · category`) + optional approval badge (top-right) + description preview + footer with leader/creator badge + (admin) Approve/Reject/Delete buttons. Mode prop = `"my"` or `"admin"`. **Mounts once** in a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` for both tabs — replaces ~180 lines of dual desktop-grid + mobile-stacked JSX.
    3. **TaskMOS `<Select>`** primitive replaces the raw `<select>` in the admin status filter (line 242 in the old file). Now matches the dashboard's input styling.
    4. **Member count + category** now display on every card consistently across breakpoints (previously mobile-only).
    5. Extracted `<Pagination>` helper so both tabs share one implementation.
    6. Click events on Approve/Reject/Delete `preventDefault()` since the parent `<Link>` wraps the card body (clicks would otherwise navigate).
  - **`components/shared/group-form.tsx`** (rewritten, 183 → ~320 lines, +120 lines but the new code is the live-preview sidebar):
    1. **Outer 2-col grid**: `max-w-2xl` → `max-w-6xl mx-auto` + `grid grid-cols-1 lg:grid-cols-3 gap-6 pb-28 lg:pb-6`. Form sections in left 2/3; sticky preview sidebar in right 1/3 (collapses below the form on `<lg`).
    2. **Section icons** via shared `<SectionHeader>`: Group Appearance = `ImageIcon` / muted tint; Group Details = `Info` / primary tint.
    3. **`<GroupPreviewCard>`** (inline, ~80 lines): mini cover (uploaded image or gradient placeholder) + avatar tile + group name + meta row (privacy · category · up-to-N members) + description preview. Live-updates per keystroke via `useWatch` on `name / description / category / privacy / max_members`. Sticky on lg+ (`lg:sticky lg:top-6`).
    4. **`<DesktopActionButtons>`** in the sticky sidebar's third card — Create + Cancel.
    5. **Mobile sticky CTA bar**: same pattern as Entry #34 (`lg:hidden fixed inset-x-0 z-40 bottom-17 md:bottom-0` with safe-area padding). Cancel + Create.
    6. **Max-members validation** + helper text: `min/max { value, message }` zod-style rules, `<FieldError>` surfaces violations, plain "Between 2 and 1000 members." hint below the input.
    7. **`<img>` tags** kept (matches the dashboard's existing pattern) but with `eslint-disable-next-line @next/next/no-img-element` on each. Same convention as task-detail.tsx attachments grid.
- **Tailwind v4 canonical-class fixes** on my newly-written lines: `bg-gradient-to-r` → `bg-linear-to-r`, `bg-gradient-to-br` → `bg-linear-to-br`, `min-w-[20px]` → `min-w-5`, `max-w-[120px]` → `max-w-30`, `sm:max-w-[200px]` → `sm:max-w-50`, `aspect-[3/1]` → `aspect-3/1`. Existing same-class usages elsewhere in the codebase left alone per the "no surrounding cleanup" rule.
- **Connected features verified preserved:**
  - **Entry #30** unified pill tabs — same pattern now also applied to /groups.
  - **Entry #32** group-task fixes (`getAssignableGroups`, addMember, removeMember backfill) — read-only data flow, no server-action changes.
  - **Entry #33** JWT freshness — admin role mid-session updates still flow into both pages via the layout.
  - **Entry #34** /tasks/create polish — preserved via the shared `<SectionHeader>` import; visual identical.
  - **Hooks** (`useMyGroups`, `useAllGroups`, `useApproveGroup`, `useRejectGroup`, `useDeleteGroup`, `useCreateGroup`) — all signatures unchanged.
  - **`GROUP_CATEGORIES`** constant + `RichTextEditor` for rules — both still used.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/section-header.tsx components/shared/task-form.tsx components/shared/groups-list.tsx components/shared/group-form.tsx` — only the long-standing `watchItems` useMemo-deps warning in task-form (pre-existing, not from this change).
  - Dev server (PID 20516): `GET /` 200, `GET /login` 200, `GET /groups` 307 (auth-gated), `GET /groups/create` 307, `GET /tasks/create` 307 (still works after the SectionHeader extraction).
- **Files touched:** `components/shared/section-header.tsx` (new), `components/shared/task-form.tsx`, `components/shared/groups-list.tsx`, `components/shared/group-form.tsx`.
- **State:** Complete. Both group pages now match the visual language of /tasks (Entry #30 + Entry #34).
- **Visual test path:**
  1. `/groups` (login as admin): mobile 375 px → pill tabs scroll horizontally with short labels, single-col card grid. Tablet 768 px → 2-col grid, full labels. Laptop 1024 px+ → 3-col grid. Member count + category visible on every card across breakpoints. Admin Manage tab status filter uses TaskMOS `<Select>` styling.
  2. `/groups/create` (login as any user): mobile → form stacks, section icons render, sticky bottom CTA bar (Cancel + Create) always visible above the BottomNav. Tablet → same single-col with sticky CTA at bottom-0. Laptop+ → 2-col grid; sticky preview card shows in the right sidebar live-updating as admin types name / description / picks privacy / changes max members / uploads cover or avatar.
  3. Upload an avatar → preview avatar circle swaps from gradient placeholder to the uploaded image instantly.
  4. Submit → group created, navigates to /groups, the new card matches the preview shape.
  5. `/tasks/create` (regression check) → still renders correctly with the now-shared `<SectionHeader>`.
- **Out of scope:** `<img>` → `next/image` migration; group cover/avatar editing on /groups/[id]; adding members from the create form; promoting `<GroupCard>` to a shared file.
- **Next step:** None on its own.

---

### Entry #34 · /tasks/create UI overhaul: sticky summary sidebar + section icons + mobile-friendly stepper + sticky CTA bar
- **User prompt (Banglish):** "http://localhost:3001/tasks/create ei page ta aro shundor UI kore deo user friendly koro mobile tablet a jnw sob easy dekha jay"
- **Audit:** The Create Task form was a vertical stack of 8 `<Card>` sections capped at `max-w-2xl` (672 px). Pain points: dead whitespace on laptop/desktop; the Required Actions picker had checkbox + name + points-stepper on one row that crammed the name to ~80 px on mobile; the dense breakdown panel inside Reward Settings duplicated work that should be sticky-visible; admins lost track of the wallet balance + Publish button while scrolling 600+ px of form on mobile.
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #33's). Workflow: audit task-form.tsx end-to-end → AskUserQuestion (2 decisions: single-page redesign with sticky sidebar; stack stepper below name on mobile) → ExitPlanMode → user approved.
- **Done — 1 file modified (`components/shared/task-form.tsx`), no new files:**
  - **Outer layout**: `max-w-2xl` → `max-w-6xl mx-auto`. Wrapped form sections in `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-28 lg:pb-6">`. Main column spans `lg:col-span-2`; sidebar gets the remaining 1/3. Mobile/tablet (`<lg`) collapses to single column with sidebar sliding BELOW the form.
  - **Removed the old wallet pill** at the top of the form. The wallet now lives in the sticky sidebar as `<WalletCard>` (a richer card with a usage-progress bar: primary→accent gradient until 80 %, warning until 100 %, error after). On mobile the sidebar appears below the form so wallet info is still reachable by scrolling.
  - **New `<SectionHeader>` helper** replaces all per-card ad-hoc `<CardHeader><CardTitle>…</CardTitle></CardHeader>` blocks. Renders a tinted icon tile + title + optional description + optional small "Optional"-style badge + optional children (for extra hints under the description). Applied to: Basic Info (`Info` / primary), Required Actions (`ListChecks` / accent), AI Prompt (`Sparkles` / primary + "Optional" badge), Attachments (`Image` / muted), Assignment (`Users` / success), Reward Settings (`Trophy` / warning), Settings (`SlidersHorizontal` / muted).
  - **Required Actions card — mobile-friendly stepper layout**: the checkbox + name + stepper row was rebuilt. Desktop (`sm+`): stepper stays inline on the right (no change visually). Mobile (`<sm`): stepper moves into a dedicated "Points" row inside the expanded body (`flex sm:hidden items-center justify-between rounded-lg bg-muted/30 px-3 py-2`) so each control gets full width. The stepper controls are now extracted into a `<StepperControls>` helper so the same JSX mounts in both locations.
  - **New `<RewardSummaryCard>`** — mounted in the sticky sidebar on `lg+` AND inline at the bottom of the Reward Settings card on `<lg`. Same data, no duplicate state. Replaces the old dense breakdown panel inside the Reward Settings card (which was deleted — kept only the conditional individual-target hint line).
  - **New `<DesktopActionButtons>`** — stacked Publish / Save as draft / Cancel buttons inside the sticky sidebar's third card. Visible only when the sidebar is sticky on `lg+`.
  - **New mobile sticky CTA bar** — `lg:hidden fixed inset-x-0 z-40 bottom-17 md:bottom-0` with `paddingBottom: env(safe-area-inset-bottom)`. On phones (`<md`) it sits at `bottom-17` (68 px = the dashboard `<BottomNav>` height); on tablets (`md`–`lg-1`) where there's no BottomNav it drops to `bottom-0`. Always visible while scrolling so Publish never goes out of reach. `pb-28` on the outer grid reserves space so form content isn't hidden behind the bar.
  - **New helpers stay inline** (per Entries #21 / #23 "no shared components until proven needed"): `SectionHeader`, `StepperControls`, `WalletCard`, `RewardSummaryCard`, `SummaryRow`, `DesktopActionButtons`.
  - **New imports**: `Info, ListChecks, Image as ImageIcon, Users, SlidersHorizontal, CheckCircle` from lucide-react.
- **Connected features verified preserved:**
  - **Entry #10 bundle category dropdown** + **Entry #12 auto-suggest from platform** — `handlePlatformChange` unchanged.
  - **Entry #17 / #25 natural-flow action order** — picker still sorts via `actionPriority`; server still re-orders on save.
  - **Entry #30 shared PageHeader** — sits above the form; unaffected.
  - **Entry #33 JWT refresh** — unrelated.
  - **createTask zod schema** — untouched. All field names + shapes identical.
  - **AI Prompt card** — still conditional on `showAiPrompt` based on selected items.
  - **Per-item required_fields** (caption, video_url, image upload, etc.) — render unchanged.
  - **`useFieldArray` items[] state** — same hooks (`useForm`, `useWatch`).
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/task-form.tsx` — 1 pre-existing `watchItems` useMemo-deps warning at line 100 (flagged in Entries #16/#23/#28; not introduced by this change).
  - Dev server at http://localhost:3001 (PID 20516): `GET /` 200, `GET /login` 200, `GET /tasks/create` 307 (auth-gated).
- **Files touched:** `components/shared/task-form.tsx` (only).
- **State:** Complete. Form is now responsive across mobile (375 px) → tablet (768 px) → laptop (1024 px) → desktop (1440 px+). Wallet, live summary, and Publish button stay in view via the sticky sidebar on desktop and the sticky CTA bar on mobile/tablet.
- **Visual test path:**
  1. Mobile 375 px → single column, sections stack, Required Actions cards show stepper BELOW name when selected, sticky CTA at bottom (above BottomNav).
  2. Tablet 768 px → still single column (no sidebar), sticky CTA at very bottom (no BottomNav at this breakpoint), Required Actions has inline stepper again (sm+).
  3. Laptop 1024 px → 2-col grid kicks in; sidebar with Wallet + Live summary + action buttons sticks to top of viewport on scroll.
  4. Desktop 1440 px+ → same as laptop, wider whitespace, max-w-6xl centered.
  5. Watch wallet usage bar fill from primary→accent through warning at 80% to error at 100% as Total Budget increases.
  6. Publish + Save Draft + Cancel all work from BOTH desktop sidebar AND mobile CTA bar. Both bound to the same `setValue("status", …)` then submit pattern.
- **Out of scope:** multi-step wizard; section TOC; drag-to-reorder bundle items; settings page redesign; skeleton loaders; promoting helpers to shared components.
- **Next step:** None on its own.

---

### Entry #33 · JWT role/status freshness on every request + live settings refresh
- **User prompt (Banglish):** "kao k admin korle ba modaretor korle log out kore abr log in korle update hoy er age update hoy na, amn onk kisu ache jegulo change korle sathy sathy hoy na page reload dite hoy othoba log out kore login hoile kaj kore"
- **Root cause:** [auth.ts:72-95](auth.ts) JWT callback only re-read `role/status/is_approved` from `profiles` on the **initial sign-in** (`if (user)` branch). After that, the JWT cookie sat stale for 24h. The dashboard layout's "demoted-staff compensator" force-signed-out demoted users but **had no symmetric branch for promotions** — so user→admin promotion silently failed (sidebar still showed user nav, proxy.ts middleware bounced them off /audit, server-action `isStaffRole` gates returned false) until they manually logged out and back in.
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #32's). Workflow: read auth.ts + dashboard layout + settings-provider.tsx → AskUserQuestion (2 decisions: re-read on every auth() call for instant updates; settings staleness also in scope) → ExitPlanMode → user approved.
- **Done — 3 files modified, 0 new files:**
  - **`auth.ts`** — restructured the JWT callback so the `role/status/is_approved` lookup runs on **every** call, not just initial sign-in. The `if (user)` branch now only handles identity (id/name/email/picture). New always-fresh block reads `SELECT role, status, is_approved FROM profiles WHERE user_id = token.id` on every callback invocation. DB hiccup falls back to previous token values (defensive — don't drop an admin to user on a transient blip). First-call-no-profile-row case sets safe defaults so downstream never sees undefined. The `useSession().update({ name, image })` branch is unchanged.
  - **`app/(dashboard)/layout.tsx`** — removed the demoted-staff sign-out compensator (lines 62-71) since the JWT now always matches DB; promotion + demotion + lateral role changes all propagate on the target user's next page load. Kept the `currentStatus` fresh-DB read as belt-and-braces for the suspended-redirect (a suspended user must never reach the dashboard frame, even if a JWT-callback failure left status=active stale). Dropped the now-unused `STAFF_ROLES` import + `privileged/wasPrivileged/isPrivileged/currentRole` locals.
  - **`components/providers/settings-provider.tsx`** — added a 2-minute `setInterval` poll inside the provider. Every 2 min it calls `getSettings()` and re-merges into state. CSS-var effect (`useEffect` on `primary_color` / `accent_color`) re-runs and the page repaints automatically. Failures silently keep previous values. Initial-prop sync (`useEffect([initialSettings])`) is preserved for navigation/SSR.
- **Connected features verified preserved:**
  - **Entry #18 /inbox aggregator** — uses `requireStaff()`; now sees fresh role automatically.
  - **Entry #29 edit-page access denied** — same `requireRole` path.
  - **Entry #31 admin password reset** — `isStaffRole(session.user.role)` gate always-fresh.
  - **Entry #32 group task fixes** — `isAdmin()` calls in groups.ts use `session.user.role`; always-fresh.
  - **`useSession().update({ name, image })`** from `/profile` — its `trigger === "update"` branch in the JWT callback is untouched.
  - **Suspended-redirect** — still works via the layout's belt-and-braces fresh read.
  - **Sign-in / sign-out / password reset** — initial `if (user)` branch in JWT callback is untouched.
  - **Existing CSS-var hot-swap** — still works; settings poll just feeds the same state.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint auth.ts app/(dashboard)/layout.tsx components/providers/settings-provider.tsx` clean (no output).
  - Dev server at http://localhost:3001 (PID 20516): `GET /` 200, `GET /login` 200, `GET /users` 307 (auth-gated), `GET /settings` 307 (auth-gated).
- **Files touched:** `auth.ts`, `app/(dashboard)/layout.tsx`, `components/providers/settings-provider.tsx`.
- **State:** Complete. Role changes, status changes, approval toggles, and settings updates all propagate to live sessions without requiring logout/login. The single trade-off is a ~few-ms profile lookup per authenticated request; acceptable at this app's scale.
- **Cost note:** the JWT callback now does +1 cheap PostgREST `SELECT role, status, is_approved FROM profiles WHERE user_id = ?` per auth() call. In typical Supabase deployments this is sub-10ms. If it becomes a hotspot, easy follow-up: wrap with `unstable_cache` at 1-2 second TTL. Not needed at current scale.
- **Visual test path:**
  1. Two browser sessions. A = super_admin; B = regular user.
  2. From A → /users → ⋯ on B's row → Make Admin.
  3. From B → reload any dashboard page. Sidebar now shows Users/Audit/Settings nav. /audit no longer redirects. /inbox count visible. **No re-login required.** (Before fix: needed manual logout + login.)
  4. A demotes B back to user → B reloads → admin nav disappears.
  5. A suspends B → B reloads → redirects to /suspended.
  6. A → /settings → change `primary_color` to `#FF0000` → save.
  7. On B → wait ≤2 minutes (no navigation) → the brand purple repaints to red automatically.
  8. From A (sole admin) → /profile → change name → toolbar shows new name (the useSession().update() path is untouched and still works).
- **Out of scope (deliberate):** replacing JWT with DB-backed sessions; React Query refactor for settings; Supabase realtime push; profile-lookup caching (can add later if needed); other "needs reload" surfaces (user will report case-by-case).
- **Next step:** None on its own. Wait for user to confirm + report any remaining reload-required cases.

---

## 2026-05-27 · Session 1 (continued)

### Entry #32 · Group task assignment bugs: staff sees all groups + new member backfill + remove cancels pending + re-join revives cancelled
- **User prompt (Banglish):** "bug gulo fix korun … apni check korun ja ja paben shegulo fix korben ami kaj korte gele jodi kisu pai ami bolbo, akhn apni shes korun"
- **Audit findings (from previous walkthrough + this turn's deeper read of [lib/actions/groups.ts](lib/actions/groups.ts)):**
  - `getAssignableGroups` only returned groups the caller was a `group_members` row of, even for admins / moderators. Staff couldn't assign tasks to a group they didn't sit inside.
  - `addMember` / `addMemberByEmail` only created the `group_members` row — they never looked at existing live group tasks. A worker joining a group could not see (and got no notification for) campaigns published before their join.
  - `removeMember` / `leaveGroup` only deleted the `group_members` row. Their pending/in-progress `task_assignments` rows persisted — the ex-member still showed up in the Submissions card with a stuck status, and the group's slot/budget math counted them.
  - Re-joining a group could silently break: the previous cancelled assignment row blocked re-assignment because the `UNIQUE(task_id, user_id)` constraint refused a second insert.
- **Done — 1 file modified (lib/actions/groups.ts), 4 fixes + 1 collateral:**
  1. **Staff sees ALL approved + active groups in `getAssignableGroups`** — if `isAdmin(session.user.role)` is true (super_admin / admin / moderator), skip the membership filter and return every approved + active group. Non-staff still only see their own (a `group_leader` picking from their own list). Server-side `createTask` re-validates the picked group is approved + active so a tampered client can't bypass.
  2. **New helper `backfillNewMemberAssignments(db, groupId, userId)`** — finds tasks WHERE `target_type='group' AND target_group_id=groupId AND status='pending' AND approval_status='approved'` and `deadline > now()`. Inserts one `task_assignments` row per missing task, plus one `assignment_item_submissions` row per `task_bundle_items` row (same shape as the publish-time fan-out in [lib/actions/tasks.ts:332-411](lib/actions/tasks.ts#L332-L411)). Sends one in-app `task_assigned` notification per backfilled task so the new member sees them in their /notifications immediately.
  3. **Re-join revives cancelled assignments** — the backfill helper now splits existing rows into three buckets: `alreadyActive` (skip), `toRevive` (flip status from 'cancelled' back to 'pending' + revive their item submissions from 'cancelled' to 'pending'), and `new` (insert fresh). The `UNIQUE(task_id, user_id)` constraint (migration 006 line 41) is respected — same row id is preserved for audit continuity.
  4. **New helper `cancelLeavingMemberAssignments(db, groupId, userId)`** — finds the group's tasks, then UPDATEs `task_assignments` WHERE `user_id=userId AND task_id IN (group tasks) AND status IN ('pending','in_progress')` to `status='cancelled'`. Deliberately leaves `submitted` (under review), `approved` (already paid), and `rejected` (worker may resubmit via the sequential gate) untouched.
  5. **`leaveGroup` + `removeMember` both call the cancel helper** AFTER the `group_members` delete. Toast / notification message includes the count of cancelled tasks so the user knows what just happened.
  6. **`addMemberByEmail` + `addMember` both call the backfill helper** AFTER the `group_members` insert, but ONLY when `group.approval_status === 'approved'` (pre-approval groups can't have live tasks per `createTask`'s validation, so the call would be a no-op). `addMember` previously only selected `leader_id, max_members`; expanded to also select `approval_status` so the gate works.
  7. **All helpers wrapped in try/catch** so a backfill / cancel failure never blocks the actual `group_members` mutation — the worker still joins / leaves; we just log and continue.
- **Connected features verified preserved:**
  - **Entry #16 sequential gate** — backfill doesn't touch `sort_order`; the per-step lock still works.
  - **Entry #25 natural-flow ordering** — bundle items are still inserted in the order they exist (sort_order set by createTask). Backfill just copies their ids.
  - **Entry #18 /inbox aggregator** — Backfill creates standard `task_assignments` rows that flow into the existing "Bundle proof submissions" counter naturally.
  - **Entry #29 task-detail Submission Status card for group leaders** — still works; the cancelled rows now correctly show "Cancelled" status (already in the status badge map).
  - **`createTask`'s `createAssignments` fan-out** — completely untouched. Publish-time behaviour unchanged.
  - **Other notification types** — `task_assigned` notification type was already in the enum (per phnote.md §8.1 `notification_type` enum).
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output). Fixed one type-narrowing error (`taskList` typed as `TaskRow[]` instead of `Record<string, unknown>[]` so the later `newTasks.push(t)` typechecked).
  - `pnpm exec eslint lib/actions/groups.ts` clean (no output).
  - Dev server (PID 20516): `GET /` 200, `GET /login` 200, `GET /tasks/create` 307 (auth-gated), `GET /groups` 307 (auth-gated).
- **Files touched:** `lib/actions/groups.ts` (only).
- **State:** Complete. The four group-task-assignment bugs are fixed end-to-end.
- **Visual test path:**
  1. **Staff dropdown** (login as admin not in any group → /tasks/create → Target = Specific Group): dropdown now lists every approved + active group across the platform.
  2. **New-member backfill**: admin creates a group task → adds a new member via /groups/[id] → new member sees the task immediately in /tasks Doable + gets a "Task assigned to your group" notification.
  3. **Re-join revives**: remove the same member → re-add → their previously-cancelled assignment flips back to pending instead of failing on the unique constraint. Toast says "auto-assigned to N live task(s)".
  4. **Remove cancels**: admin removes a member who had a pending bundle item → their `task_assignments` row flips to 'cancelled' → the Submissions card for that task shows them as Cancelled instead of stuck on Pending.
  5. **Leave cancels**: same as #4 but worker initiated via `leaveGroup`.
- **Out of scope (deliberate):**
  - **Suspend / unsuspend group → bulk cancel / revive member assignments** — admin can already cancel individually if needed; auto-cancelling on suspend risks losing in-flight work an admin meant to preserve. Defer.
  - **Delete-group → cascade-cancel** — the FK constraint already handles this depending on migration; not auditing today.
  - **`transferLeadership` → re-evaluate the new leader's assignment** — current behaviour is correct (new leader was already a member with their own assignment).
- **Next step:** None on its own. User said they'll report any additional bugs while working.

---

### Entry #31 · Admin password reset for any user from /users (send-email OR direct-set)
- **User prompt (Banglish):** "http://localhost:3001/users admin user theke jnw user der k password ta reset kore dite para jay"
- **Why:** the `/users` row action menu already let staff change roles, suspend/activate, assign points, assign plans, and ban — but there was no way to recover a user who'd forgotten their password short of telling them to use the public `/forgot-password` form (which requires email inbox access). Admins needed a one-click reset path.
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #30's). Workflow: audit users-table actions menu + existing forgotPassword/changePassword/sendPasswordResetEmail/sendPasswordChangedEmail patterns → AskUserQuestion (one decision: offer both send-email AND direct-set in a single dialog) → ExitPlanMode → user approved.
- **Done — 4 files modified, 0 new files:**
  - **`lib/audit.ts`** — extended the `AuditAction` typed union with `"password_reset_admin"` so the new actions can call `recordAudit` without widening the type at every site.
  - **`lib/actions/users.ts`** — two new server actions, both gated by `auth() + isStaffRole(session.user.role)` and per-actor rate-limited (`checkRate("admin-reset-password", actorId, 15, 5 * 60 * 1000)`):
    1. **`adminSendPasswordReset(targetUserId)`** — creates a fresh `verification_tokens` row (30-min expiry via `crypto.randomUUID()` + ISO date), calls `sendPasswordResetEmail(email, token)`, writes `recordAudit(..., "password_reset_admin", "user", id, { method: "email", target_email })`. Email path bypasses the per-email rate-limit that gates the public `/forgot-password` flow (staff is the privilege boundary). Admin never sees the user's password.
    2. **`adminSetUserPassword(targetUserId, newPassword)`** — same complexity rule as `changePassword` (≥8 chars + upper + digit + symbol via zod), hashes with `bcrypt(pw, 12)`, updates `users.password_hash`, calls `sendPasswordChangedEmail(email, name, now, undefined)` (IP is undefined since admin initiated), audits with `method: "direct_set"`. **Self-reset blocked** (`session.user.id === targetUserId` returns "Use Profile → Change Password for your own account.") so an admin can't bypass the current-password requirement on their own account.
    - Added `sendPasswordResetEmail` to the imports block (was already used inside `lib/actions/auth.ts` `forgotPassword`).
  - **`hooks/use-users.ts`** — added `useAdminSendPasswordReset` + `useAdminSetUserPassword` mutations. No cache invalidation (password isn't displayed anywhere); success toast carries the messages returned by the server action.
  - **`components/shared/users-table.tsx`** — three surgical additions:
    1. **Imports**: `EyeOff`, `KeyRound`, `Mail`, `Sparkles`, `Copy` icons; the two new hooks.
    2. **State + menu wiring**: new `passwordResetTarget: { userId; email } | null` state; extracted `rowEmail` from the row's joined `users` object so the dialog can show the email without a second fetch; new "Reset Password" item between "Assign Plan" and the "Ban & Anonymize" divider, with a primary-tinted `KeyRound` icon.
    3. **New `PasswordResetDialog` inline component** + `generatePassword()` helper (~140 lines, at the bottom of the file). Two modes via a segmented toggle:
       - **Send reset email**: single button "Send reset link", closes on success.
       - **Set new password**: password input with show/hide toggle + "Generate" button (16-char shuffled — 4 upper / 4 lower / 4 digits / 4 symbols, skipping visually-confusable chars I/O/l/o/0/1) + "Set password" button. On success the dialog flips to a copy-only view with the password in a font-mono Input + Copy button + warning banner "Copy this password now. We won't show it again."
- **Connected features verified preserved:**
  - **Public `/forgot-password` flow** (`forgotPassword` in `lib/actions/auth.ts`) — untouched. Its per-email rate-limit still gates anonymous spray attempts.
  - **Self-service `/profile` change password** (`changePassword`) — untouched. Still requires current password.
  - **Other `/users` row actions** (Approve/Reject signup, role change, suspend/activate, assign/deduct points, assign plan, ban) — all unaffected.
  - **Entry #18 audit log** — the new `password_reset_admin` action lands rows in `admin_audit_log` with method=email/direct_set in metadata; visible in `/audit`.
  - **Sidebar staff gating** — `/users` was already `staffOnlyPaths`; the new actions self-guard via `isStaffRole(session.user.role)`.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint lib/actions/users.ts hooks/use-users.ts components/shared/users-table.tsx lib/audit.ts` clean (no output).
  - Dev server at http://localhost:3001 (PID 20516): `GET /` 200, `GET /login` 200, `GET /users` 307 (auth-gated, expected).
- **Files touched:** `lib/audit.ts`, `lib/actions/users.ts`, `hooks/use-users.ts`, `components/shared/users-table.tsx`.
- **State:** Complete. Admins can now click any user row's ⋯ menu → "Reset Password" → pick send-email or direct-set → done. Audit row written, user gets a confirmation email, rate-limited at 15/5min per admin.
- **Visual test path (login as super_admin → /users):**
  1. Click ⋯ on any user row → menu shows new "Reset Password" item with a `KeyRound` icon.
  2. Click → dialog opens with the target's email beneath the title, default tab "Send reset email".
  3. Click "Send reset link" → server creates `verification_tokens` row + emails the user (or silent fail if SMTP unset) → toast success → dialog closes. Check `/audit` — new row with `action='password_reset_admin', metadata.method='email'`.
  4. Reopen → switch to "Set new password" → click Generate → input fills with 16-char password → click Set password → server updates hash + emails confirmation → dialog flips to copy-only view → click Copy → password in clipboard. Audit row with `method='direct_set'`.
  5. Try setting "abc" → toast: "Password must be at least 8 characters" (or whichever rule the input violates first).
  6. Try Reset Password on your own row → toast: "Use Profile → Change Password for your own account."
  7. Spam reset 16+ times in 5 min → toast: "Too many password-reset actions. Try again in N min."
- **Out of scope:** force-logout of target user's existing sessions; promoting `<PasswordResetDialog>` to a shared component; multi-user batch reset; "must change on next login" flag; 2FA gate (TaskMOS doesn't have 2FA yet).
- **Next step:** None on its own. Wait for visual confirmation.

---

### Entry #30 · Shared PageHeader polish + unified pill tabs on /tasks
- **User prompt (Banglish):** "Task page header ui mobile and tablet, pc, laptop a onk baje dejha jay eita ki kono design change kore shundor kora jabe, nije plan kore shundor vabe banao"
- **Audit:** the `/tasks` screenshot showed two issues: (1) the shared `<PageHeader>` was a plain `text-2xl` title with a stacked description and a right-aligned action — same on every breakpoint, looked dated, used by 27 dashboard pages; (2) the tabs row was two completely different renderings (desktop = underline tabs with inline counts like `Doable Tasks (7)`; mobile = pills with separate count chip), which made the app feel inconsistent across breakpoints.
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #29's). Workflow: audit PageHeader + tasks-view tab blocks + grep 27 PageHeader consumers → AskUserQuestion (2 decisions: shared scope across 27 pages; unified pill tabs at every breakpoint) → ExitPlanMode → user approved.
- **Done — 2 files modified, 0 new files:**
  - **`components/shared/page-header.tsx`** — body-only redesign, API unchanged (title / description / actions remain the only props):
    1. **Bigger title on desktop**: `text-2xl sm:text-3xl font-bold tracking-tight`. Phones stay readable, laptop / 4K monitors get headline weight.
    2. **Subtle border seam**: `mb-6 pb-5 border-b border-border/50` separates the header from page content.
    3. **Responsive layout**: outer `flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4`; title column gets `min-w-0 flex-1` so a long description wraps cleanly; actions column gets `shrink-0 sm:pt-1` so a long title never pushes the CTA off-screen and the button still baselines with the headline.
    4. **Description max-width**: `max-w-2xl` so dense subtitles don't span the full viewport on ultrawide displays.
  - **`components/shared/tasks-view.tsx`** — replaced the two `hidden sm:flex` / `sm:hidden` tab render blocks (~40 lines) with one unified pill row (~25 lines):
    1. **One render block**: same pill style across all breakpoints. Mobile shows the short label (`Doable` / `Mine` / `Manage` / `Review`) via `<span className="sm:hidden">{tab.short}</span>`; tablet+ shows the full label (`Doable Tasks` / `My Tasks` / `Manage Tasks` / `Review Submissions`) via `<span className="hidden sm:inline">{tab.label}</span>`.
    2. **Mobile edge-bleed preserved**: outer wrapper uses `-mx-4 sm:mx-0 overflow-x-auto scrollbar-none`; inner uses `px-4 sm:px-0 min-w-max`. Phones get a horizontal scroll that runs all the way to the screen edge; tablet+ stays within page padding.
    3. **Active pill = brand gradient with glow**: `bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25` (canonical mobile style is now used everywhere).
    4. **Inactive hover state**: `hover:bg-muted hover:text-foreground` — desktop mice get visible feedback that the pills are clickable.
    5. **Tabular-nums count chip**: `tabular-nums` so 7 vs 18 vs 100 all align inside the pill; `bg-white/25 text-white` when active, `bg-background text-foreground` when inactive.
- **Connected features verified preserved:**
  - **API unchanged** → all 27 PageHeader consumers (`/audit`, `/inbox`, `/groups`, `/payments`, `/settings`, `/tasks`, `/tasks/[id]`, `/tasks/[id]/edit`, etc.) pick up the new look automatically with zero callsite changes.
  - **Entry #18 /inbox aggregator + sidebar count pill** — `<PageHeader>` is the only thing that visually changes; the count hook is unaffected.
  - **Entry #20-#28 TaskBundleCard grid** — sits below the tabs; unaffected.
  - **Entry #23-#27 /tasks/[id] surfaces** — also use `<PageHeader>`; get the upgrade for free.
  - **Entry #29 access-denied panel** — same; inherits the new header.
  - **Tab counts** still come from `useTasks` / `useMyTasks` / `useTasks` / `usePendingItemReviews` exactly as before; no hook signature change.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/page-header.tsx components/shared/tasks-view.tsx` clean (no output).
  - Dev server at http://localhost:3001 (PID 20516): `GET /` 200, `GET /login` 200, `GET /tasks` 307 (auth-gated), `GET /inbox` 307, `GET /audit` 307. All routes responding expected codes.
- **Files touched:** `components/shared/page-header.tsx`, `components/shared/tasks-view.tsx`.
- **State:** Complete. Every dashboard page now has the polished header (bigger desktop title, border seam, responsive layout). `/tasks` gains unified pill tabs that look the same on mobile / tablet / laptop / desktop — same active gradient, same count chip styling, same tap area.
- **Visual test path:** login as admin → `/tasks` at 375 / 768 / 1024 / 1440 px:
  - 375 px: title `text-2xl`, description below, Create Task stacks below title block; tabs scroll horizontally with edge-bleed, short labels (Doable / Mine / Manage / Review), active pill in gradient.
  - 768 px: title `text-2xl`, description right below, Create Task baselines next to title on the right; all 4 pills with FULL labels fit without scroll.
  - 1024 px+: title becomes `text-3xl`, description capped at `max-w-2xl`, Create Task on the right. Tabs same as 768 px.
  - Spot-check on `/audit`, `/inbox`, `/groups`, `/payments`, `/settings`: header looks consistent with /tasks now, no layout regressions.
- **Out of scope:** icon slot on PageHeader; sidebar/nav redesign; per-tab count animations; URL-persisted active tab.
- **Next step:** None on its own. Wait for visual confirmation.

---

### Entry #29 · /tasks/[id]/edit silent 404 → explicit access-denied panel
- **User prompt (Banglish):** "http://localhost:3001/tasks/20/edit task edit korte gele page error ashe 404 Page Not Found The page you're looking for doesn't exist. sob task ei ekois issue, fix korun"
- **Diagnosis:** the edit page had three silent `notFound()` calls: (1) invalid task id, (2) `getTaskById` returns null, (3) viewer is neither task owner nor staff. Whichever fired, the user only saw the generic "Page Not Found" 404 page — no clue why. DB audit (`admin@taskmos.com` = super_admin; `mahediyt365@gmail.com` = regular `user` role) suggested the user is logged in as a regular worker who CAN view tasks they accepted but CANNOT edit tasks they didn't create. The 3rd `notFound()` was firing — a correct security gate rendering as a misleading 404.
- **Done — 1 file modified:** `app/(dashboard)/tasks/[id]/edit/page.tsx`:
  - Added `export const dynamic = "force-dynamic"` to match the detail page's pattern (the page reads cookies via `auth()`; force-dynamic prevents any Turbopack prerender attempt that would have null session context).
  - Kept the `notFound()` only for the truly malformed-URL case (`isNaN(taskId)`).
  - When `getTaskById` returns null (task deleted OR viewer has zero read access), render the existing `<ItemGone kind="task">` card the detail page already uses for deleted tasks.
  - When the viewer has read access but isn't owner/staff, render a new explicit panel: warning-tinted ShieldAlert icon + "You can't edit this task. Only the task creator or an admin can edit '{title}'." + Back-to-task + All-tasks buttons. Uses TaskMOS primitives (`<Card>`, `<Btn>`) so the style matches the rest of the dashboard.
- **Security unchanged:** the edit form still only renders for owner OR admin. The change is purely how non-owners are *told* they don't have access. The server action `updateTask` already self-guards, so even if a malicious user POST'd to it directly, nothing would change.
- **Files touched:** `app/(dashboard)/tasks/[id]/edit/page.tsx`.
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint app/(dashboard)/tasks/[id]/edit/page.tsx` clean; dev server `GET /` 200, `GET /login` 200, `GET /tasks/20/edit` 307 (auth-gated), `GET /tasks/22/edit` 307.
- **State:** Complete on the diagnosis-+-friendlier-UX axis. If the user actually intends to be an admin (and is currently logged in as `mahediyt365@gmail.com` which is `role=user` in DB), the real fix is one of: (a) log in as `admin@taskmos.com` instead, or (b) promote `mahediyt365@gmail.com` via SQL — both are user-policy decisions beyond this code change.
- **Next step:** wait for the user to confirm whether they wanted the access policy to change OR just clearer messaging.

---

### Entry #28 · TaskBundleCard polish: free the header so titles stop wrapping on mobile/tablet
- **User prompt (Banglish):** "image ti dekhun, ghub baje dekhaitese mone hoitese ektar opore r ekta, eigulo ki shundor koro, aro optimize koro mobile r tablet er user onk, tader kache amn dekhaile kemon hobe. title ta 2 line a vag hoye jacche shundor dekhaitese na."
- **Symptom (from screenshot of `/tasks` Doable tab on tablet/narrow desktop):** Header row was a 3-column flex `[tile 44px] [middle: tier + platform name + title] [right: status badge column]`. The right-column "In progress" / "Not started" badge crushed the middle column to ~130 px → title ("video promotion.") wrapped to 2 lines. Two cards side-by-side felt cramped, with badges visually stacked on top of platform name.
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #26's). Workflow: read task-bundle-card.tsx end-to-end → AskUserQuestion (2 decisions: status badge moves above action button as a dot+label; tier chip stays in meta row but shrinks to text-[9px]) → ExitPlanMode → user approved.
- **Done — 1 file modified:**
  - **`components/shared/task-bundle-card.tsx`** — six surgical changes:
    1. **Removed the right-column status stack from the header** (the old `flex flex-col gap-1 items-end shrink-0` block at lines 185-198). Header collapsed to 2 columns; title row gets the full middle-column width.
    2. **Compact tier chip**: `<Badge variant={TIER_BADGE_VARIANT[tier]}>` gained `className="text-[9px] px-1.5 py-0 shrink-0"` so it never eats title width even on 310 px desktop cards. Matches the "Start here" badge style from TaskHowToCard (Entry #23).
    3. **New `<CardStatusBanner>` inline component** (~55 lines): renders a soft dot + label pill in tinted bg (`bg-warning/15 text-warning` etc.) above the mode action footer. Same gating logic as the old header column — doable mode shows assignment status; non-approved tasks (admin/creator views) show approval status; renders `null` when neither applies so there's no empty whitespace. The dot+label style feels like a "status next to the CTA" indicator rather than a label competing with the title.
    4. **Tier-aware tile ring**: `<PlatformTile>` gained a `tier` prop and renders `ring-2 ring-offset-1 ring-offset-card ring-{success|primary|warning}/{40|35|35}` depending on tier. Decorative — `ring-offset-1` keeps the tile's footprint unchanged. Workers can spot Premium cards at a glance while scrolling.
    5. **Mobile description tightening**: `line-clamp-3` → `line-clamp-2 sm:line-clamp-3` so mobile cards stay short and the 3-line preview is reserved for tablet+ where there's horizontal room.
    6. **Mobile paddings + gaps**: card body `p-4` → `p-3.5 sm:p-5`, header bottom margin `mb-3` → `mb-2.5`, pill row `mb-4` → `mb-3`, action footer wrapper `px-4 sm:px-5 pb-4` → `px-3.5 sm:px-5 pb-3.5 sm:pb-4`. Less dead air between rows on phones.
    7. Imported `TaskTier` type from `@/lib/constants`.
    8. Removed now-unused `showAssignmentBadge` / `showApprovalBadge` locals (their gating logic lives inline inside `<CardStatusBanner>`).
- **Connected features verified preserved:**
  - **Entry #18 /inbox aggregator:** uses `<AdminInbox />`, not `<TaskBundleCard>`. Unaffected.
  - **Entry #20-#21 PlatformTile + brand icons:** prop signature gained `tier` (backward-compatible — only the internal call site updates).
  - **Entry #22 platform-name truncate fix:** `truncate min-w-0` on the platform name span untouched. The deeper fix (removing the right column) goes further but doesn't undo Entry #22.
  - **Entry #23-#27 task-detail surfaces:** different file (`task-detail.tsx`). Untouched.
  - **Entries #24-#27** all independent.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/task-bundle-card.tsx` clean (no output).
  - Dev server at http://localhost:3001 (PID 20516): `GET /` 200, `GET /login` 200, `GET /tasks` 307 (auth-gated, expected).
  - Pre-existing Tailwind v4 canonical-class warning at line 252 (`bg-gradient-to-r` progress bar) left alone per AGENTS.md "no surrounding cleanup on a bug fix" rule.
- **Files touched:** `components/shared/task-bundle-card.tsx`.
- **State:** Complete. Title rows now use the full middle-column width across all breakpoints. Status sits next to the action button as a softer dot+label indicator. Tier is visually anchored by both a tiny chip in the header and a tinted ring around the platform tile.
- **Visual test path (logged-in worker):**
  1. `/tasks` Doable tab → resize browser through 375 px → 768 px → 1024 px → 1280 px. Title stays single-line at every breakpoint.
  2. On a `pending` assignment: tile has warning-tinted ring (Small) or success-tinted ring (Premium), card shows "Not started" dot above "Accept task" button.
  3. On `in_progress`: primary-tinted "In progress" dot above "Submit proof" button.
  4. On `submitted`: accent-tinted "Submitted" dot above "Awaiting admin review" text.
  5. On `approved`: success-tinted "Approved" dot above earned-points line.
  6. Manage Tasks tab as admin, pending-approval task: warning "Pending review" dot above Approve / Reject buttons.
- **Out of scope (deliberate):** promoting `<CardStatusBanner>` to a shared component; skeleton states; animations on status change; restructuring the credit/slots footer; column-count tweaks on the parent grid.
- **Next step:** None on its own. Wait for visual confirmation on logged-in `/tasks`.

---

### Entry #27 · TaskHowToCard: remove per-step target-URL link (workers were confused)
- **User prompt (Banglish):** "How to complete this task ei jaygay link gulo dewa ache user ra confused hoye jabe link gulo remove kore din"
- **Symptom:** Entry #23 added a clickable target URL beneath each step's one-line instruction in TaskHowToCard. The user reports workers got confused — the same URL also appears in the sidebar Task Data card and in the per-item proof form below, so seeing it three times made the "how to start" callout feel cluttered instead of orienting.
- **Done:** removed the `{targetUrl && <a>...</a>}` block from TaskHowToCard at `components/shared/task-detail.tsx:1542-1552`. Each step now shows only the action name + points + the plain-English one-liner from `buildStepOneLiner` (which still references "open the link" / "open the profile" in copy). The actual clickable URL still lives in two places where it belongs: the right-sidebar `BundleItemSidebarCard` (via `TaskDataFields`) and inside each `BundleItemRow`'s proof form when the worker reaches that step.
- **Kept intact:** `targetUrl` is still computed and passed to `buildStepOneLiner` so the instruction copy can adapt (e.g. "Open the target link and post this comment…" reads differently from "Complete this step on the platform"). `Link2` icon import stays — still used for the hero card's Reference URLs section.
- **Files touched:** `components/shared/task-detail.tsx` (11-line removal).
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint components/shared/task-detail.tsx` only flags the pre-existing `<img>` warning at line 216 (hero attachments grid — unrelated).
- **Connected features intact:** Entries #16 sequential gate, #22-26 all unaffected — this is purely a visual removal in one inline component.
- **State:** Complete. The "How to complete this task" card now reads cleaner: numbered step + action name + points + one-line instruction + (optional) "Start here" badge. The URL clutter is gone.
- **Next step:** None on its own.

---

### Entry #26 · Auto-play music in the play-lock modal (Spotify SDK + URL flags + auto-start countdown)
- **User prompt (Banglish):** "video ba music egula auto play kore din cz user touch korle kaj korbe na so kono kisu play hobe na, sob jwn auto play hoy, joto dhoroner video, audio, music, stremming, egulo auto play thakbe and ekta player a open hobe jei vabe youtube er video open hoy. amr text ti bujhe guchiye AI k shajiye diye baniye felun"
- **Symptom:** After a worker clicked "Start counter" in the music modal, the lock overlay sat on top of the iframe and blocked clicks. If the worker hadn't pre-clicked play inside the embed, music never started, the 30s counter ticked away in silence, and the item "completed" without actual playback. YouTube modal was fine (already auto-plays via the IFrame API integration in `youtube-watch-modal.tsx:200`).
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #25's). Workflow: read both modals end-to-end → AskUserQuestion (2 decisions: Spotify uses iframe SDK; Bandcamp gets a hint but countdown still auto-starts) → ExitPlanMode → user approved.
- **Done — 1 file modified:**
  - **`components/shared/music-play-lock-modal.tsx`** — single-file change, ~140 net lines:
    1. **Spotify iframe SDK loader** (~50 lines): `loadSpotifyAPI()` mirrors the YouTube IFrame API loader pattern from `youtube-watch-modal.tsx:37-64`. Injects `https://open.spotify.com/embed/iframe-api/v1` once per session, resolves on `window.onSpotifyIframeApiReady`, rejects on 10s timeout. Cached promise so opening multiple Spotify tasks in a row doesn't re-inject.
    2. **Spotify URI extractor** (`extractSpotifyUri`) — parses `open.spotify.com/track/{ID}` (and the embed variant) into `spotify:track:{ID}` which the SDK's `createController` requires.
    3. **TIDAL + Deezer URL flags** — `?autoplay=true` appended in `extractTrackEmbed`. SoundCloud already had `&auto_play=true` (line 66). Bandcamp's embed refuses autoplay so it's left as-is.
    4. **Spotify controller useEffect** — when `platformSlug === "spotify"` AND a valid URI parses, mount a `<div ref={spotifyMountRef}>` (the SDK swaps this for its own iframe), call `loadSpotifyAPI().then(api => api.createController(mountNode, { uri }, controller => controller.play()))`. Capture `mountNode` at effect start (per the YouTube pattern) so the cleanup function doesn't re-read a possibly-null ref. On SDK load failure, set `spotifySdkFailed` so the JSX falls back to a plain `<iframe>` with the embed URL — countdown still runs.
    5. **Auto-start countdown useEffect** — 1500 ms after mount, the countdown begins automatically: clears warning, resets elapsed, sets `started = true`, anchors `startedAtRef = performance.now()`. The brief warm-up lets the iframe/SDK load and (where supported) begin playback before the timer ticks; during this window the close button stays enabled so a worker who opened the wrong track can bail out.
    6. **Removed manual `Start counter` flow** — deleted the `startTimer()` function and the entire two-step "Press play in embed, then click Start counter" UI block. Replaced with a single auto-running footer: progress bar at 0 % during the warm-up (with "Loading player…" copy), then `{elapsed} listened / {required} required` once started, with copy "Music is playing — stay on this tab. Switching tabs resets the counter."
    7. **Bandcamp-specific hint** — a small italic caption renders ONLY when `platformSlug === "bandcamp"`: "Bandcamp doesn't support autoplay — click play in the player above if you don't hear music. The counter is already running." Other 4 platforms get the cleaner no-hint copy.
    8. **Spotify mount minHeight** bumped from 152 → 232 to give the SDK's bigger embed room.
- **Connected features verified preserved:**
  - **Entry #13 music auto-approve:** independent — fires inside `submitItemProof` after the worker submits. Modal still calls `onCompleted(screenshotUrl)` exactly as before. Auto-approve path untouched.
  - **Entry #14 reverse panel:** independent. Still lists rows in the 24 h window.
  - **Entry #16 sequential gate:** the modal only mounts when BundleItemRow is rendering an unlocked step. Unchanged.
  - **Entries #17 + #25 natural-flow ordering:** the modal opens for the right step; ordering is upstream of the modal.
  - **Entry #22 html2canvas lazy-load:** `finalize()` still dynamic-imports `html2canvas`. No regression.
  - **Entry #23 task-detail page surfaces:** modal is opened from BundleItemRow inside BundleProofSection; upstream UI unchanged.
  - **Entry #24 useAcceptTask invalidation:** independent.
  - **`visibilitychange` + `window.blur` reset (lines 149-168):** still only fires while `started === true`. Because `started` flips at 1500 ms via the auto-start effect, a brief load-time tab switch during the warm-up doesn't reset (matches today's behaviour where the warm-up was the worker pressing buttons).
  - **Lock overlay + close-button gating:** `isLocked = started && !completedRef.current` unchanged. Lock overlay still active while running. Close button now enabled during warm-up (UX win — worker can bail out of a wrong track during the first 1.5 s).
  - **YoutubeWatchModal:** not touched. Already auto-plays via the existing `e.target.playVideo()` call in `onReady`.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/music-play-lock-modal.tsx` clean after fixing one self-introduced react-hooks/exhaustive-deps warning (captured `mountNode` at effect start instead of reading `spotifyMountRef.current` in the cleanup).
  - Dev server at http://localhost:3001 (PID 20516): `GET /` 200, `GET /login` 200, `GET /tasks/22` 307 (auth-gated).
  - Pre-existing Tailwind v4 canonical-class warnings on untouched lines (`bg-gradient-to-r`, `flex-shrink-0`, `z-[100]`) left alone per the AGENTS.md "no surrounding cleanup on a bug fix" rule.
- **Files touched:** `components/shared/music-play-lock-modal.tsx`.
- **State:** Complete. The two-click "press play → start counter" flow is gone. Workers click "Open player" once → music starts within ~1 s (Spotify via SDK; TIDAL/Deezer/SoundCloud via URL params) → countdown auto-starts at 1.5 s → 30 s later → screenshot + submit + (Entry #13) auto-approve. Bandcamp still needs one manual play click but the counter doesn't wait for it.
- **Visual test path (login as worker, open a Spotify stream-track item):**
  1. Click "Open player" on the music step → modal opens, Spotify SDK fetches/loads → embed renders, audio begins.
  2. After ~1.5 s the footer flips from "Loading player…" / "Starting Spotify player automatically…" to a running counter with the gradient progress bar advancing.
  3. Switch tabs → counter resets with "Stay on this tab to earn credit. Counter reset." warning.
  4. Let it run 30 s without switching → screenshot capture (html2canvas), modal closes, item flips to `submitted`. Music auto-approve (Entry #13) credits the worker.
  5. For TIDAL / Deezer / SoundCloud → same flow, audio starts via URL `?autoplay=true` (or already-set `auto_play=true` for SoundCloud).
  6. For Bandcamp → embed loads silent, italic hint visible, counter runs anyway; worker can click play inside the Bandcamp player during the 1.5 s warm-up if they want audio.
- **Out of scope (deliberate):** audio-state verification (most embeds don't expose it); a play/pause button inside the lock (the lock is intentional per Entry #16); Bandcamp SDK integration (Bandcamp doesn't publish one); refactoring `MUSIC_STREAM_SLUGS` / `MUSIC_PLATFORM_SLUGS` in `lib/constants/platforms.ts`.
- **Next step:** None on its own. Wait for visual confirmation on a logged-in Spotify task.

---

### Entry #25 · Server-enforced natural worker flow for bundle items (save-time + backfill)
- **User prompt (Banglish):** "ami boltechi task er vitore aj gulo serial wise jnw hoy, video dekhar age kivabe like ba comment kore apni bolen, age to video dekhbe then like korbe then comment korbe tai na apni user natural system er maddhome task gulo k shajan"
- **Problem:** Entry #17 sorted the picker UI by `actionPriority`, but bundle items were saved with `sort_order = admin's click order`. So a YouTube bundle could persist as `Like Video → Comment → Watch Video` if the admin clicked them in that sequence, even though no worker can like or comment a video they haven't watched. The complaint targeted the exact task the user was looking at: Task #22 ("video promotion.") had `[Comment → Like → Watch]` ordering.
- **Plan:** approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #23/24's). Workflow: read existing plan + audit task-form's `actionPriority`, createTask, updateTask, sort_order propagation → AskUserQuestion (2 decisions: both backfill + going-forward; no admin override) → ExitPlanMode → user approved.
- **Done — 2 modified files, 2 new files:**
  - **`lib/constants/action-priority.ts`** (new, ~95 lines): extracted `actionPriority(slug)` from `task-form.tsx:40-95` verbatim into a shared, framework-agnostic module so client + server use a single source of truth. Added `ACTION_PRIORITY_TIERS` description array for future doc rendering.
  - **`components/shared/task-form.tsx`**: removed the inline `actionPriority` definition (replaced with `import { actionPriority } from "@/lib/constants/action-priority"`). Added a one-line italic notice in the Required Actions card header explaining: "No matter what order you click these in, the saved bundle is auto-arranged in the natural worker flow (watch → like → save → comment → share → follow → review → create → keep alive). You don't need to worry about click order." Existing picker sort is unchanged.
  - **`lib/actions/tasks.ts`**: added `sortBundleItemsByNaturalFlow(db, items)` helper at the top of the file. Batch-fetches `task_types.id, task_types.slug` for all distinct `task_type_id`s in one query (via `.in()`), builds a `Map`, then sorts items by `actionPriority(slug)` with a stable `originalIdx` tie-break so peer-tier picks keep their relative order. `createTask` now runs `items = await sortBundleItemsByNaturalFlow(db, items)` before mapping to `itemRows`. `updateTask`'s `replaceItems` branch does the same. Net change: the admin's click order is no longer the canonical order — the server is.
  - **`supabase/migrations/053_natural_order_backfill.sql`** (new, ~95 lines): one-shot `WITH ranked AS (... ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY CASE WHEN tt.slug ~ ... THEN N END, prior_sort_order, id))` UPDATE that re-numbers `task_bundle_items.sort_order` for every existing row using the same tier breakpoints as the TS helper. `IS DISTINCT FROM` guard makes the migration safely re-runnable (0 rows changed on re-apply). Stable tie-break by prior `sort_order` so same-tier items (e.g. multiple `comment-*` picks) keep their relative position.
- **Verified end-to-end:**
  - Migration applied via `pnpm exec node scripts/run-migrations.mjs` — 053 OK alongside all prior migrations.
  - Idempotency check (re-apply UPDATE returned `0 rows touched`) — confirmed idempotent.
  - **Task #22 (the exact task in the user's complaint) post-backfill order:**
    ```
    0  watch-video      Watch Video
    1  like-video       Like Video
    2  comment-video    Comment on Video
    ```
    Exactly the natural flow the user asked for.
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint <touched files>` — 1 pre-existing warning at `task-form.tsx:100` (the `watchItems` useMemo-deps warning that's been flagged since Entry #16; not introduced).
  - Dev server (PID 20516): `GET /` 200, `GET /login` 200, `GET /tasks/22` 307 (auth-gated), `GET /tasks/create` 307 (auth-gated).
- **Connected features verified:**
  - **Sequential gate (Entry #16):** uses `sort_order` server-side at `assignments.ts:207-230` + client-side in BundleProofSection. The re-numbering doesn't change the gate semantics — it just makes the gate enforce the natural flow, which is the goal. Workers with live in-flight bundles will see the order shift on next page load; the gate re-evaluates per render so already-submitted/approved steps still count as such regardless of their new position.
  - **Music auto-approve (Entry #13):** music slugs sit in tier 1.0 (foundation), so on mixed bundles they correctly land first — which is what music-stream-then-engagement workflows already wanted.
  - **Picker order (Entry #17):** same `actionPriority` source, behavior unchanged.
  - **TaskHowToCard / BundleProofSection / SubmissionsCard (Entry #23):** all read `task_bundle_items.sort_order` — they now display the natural order automatically.
  - **Accept Task invalidation (Entry #24):** independent; unaffected.
- **Files touched:** `lib/constants/action-priority.ts` (new), `components/shared/task-form.tsx`, `lib/actions/tasks.ts`, `supabase/migrations/053_natural_order_backfill.sql` (new).
- **State:** Complete. The full vertical — extracted helper + server save-time enforcement + admin form notice + one-shot DB backfill — is wired and verified against Task #22.
- **Visual test path (login as super_admin):**
  1. `/tasks/22` → bundle items render Watch → Like → Comment in TaskHowToCard, BundleProofSection, sidebar Task Data card, Bundle Rewards card. Sequential gate locks Like until Watch is submitted.
  2. `/tasks/create` → pick YouTube. In the Required Actions card, see the new italic notice about auto-arrangement.
  3. Intentionally check Comment → Like → Watch (out of natural order). Fill required fields → Submit.
  4. Reopen the new task → bundle items render as Watch → Like → Comment, not click order. Sidebar mirrors the new order.
  5. Edit an existing task (`/tasks/[id]/edit`) → if `replaceItems` fires (admin edited the bundle), the new sort runs.
- **Out of scope (deliberate):** drag-to-reorder UI (no override at all — server forces); per-platform overrides; refactoring task-form's `items[]` state to be ordered (kept as click order, server re-orders on save); a separate preview pane in the form (the post-save reorder is the canonical view).
- **Next step:** None on its own. Wait for user signal — likely visual confirmation on `/tasks/22` after re-login.

---

### Entry #24 · Regression fix: Accept Task button left worker stuck on "Accept this bundle"
- **User prompt (Banglish):** "task accept button press korar poreo Button accept task er porer function open hoy na"
- **Symptom:** On `/tasks/[id]`, pressing the Accept Task button fired the toast ("Task accepted!") but the BundleProofSection kept rendering the Accept button instead of swapping to the per-item proof grid. Worker was stuck and could not start submitting.
- **Root cause:** Entry #22 added `staleTime: 60_000` + `refetchOnWindowFocus: false` to `useMyAssignmentWithItems` (powers the entire detail page). The submit/review mutations were updated to explicitly invalidate `["my-assignment"]`, but `useAcceptTask` at `hooks/use-tasks.ts:114` was left invalidating only `["my-tasks"]`, `["unread-count"]`, `["notifications"]`. Result: the server side flipped `task_assignments.status` from `pending` to `in_progress`, but the React Query cache held the stale row for 60s, so `BundleProofSection` kept hitting the `if (status === "pending")` branch and re-rendering the Accept card.
- **Done:** added `qc.invalidateQueries({ queryKey: ["my-assignment"] })` to `useAcceptTask`'s onSuccess (placed first so it's visually the primary effect). Comment in the code calls out exactly why — the Entry #22 staleTime is otherwise tempting to remove if anyone hits the same symptom later.
- **Files touched:** `hooks/use-tasks.ts` (5-line addition + comment).
- **Verified:** `pnpm exec tsc --noEmit` clean; `pnpm exec eslint hooks/use-tasks.ts` clean.
- **State:** Complete. After this fix, clicking Accept Task on `/tasks/[id]` immediately refetches the assignment, BundleProofSection re-renders with `status === "in_progress"`, and the per-item grid (numbered pills, target URLs, proof form on the first step) appears in one paint.
- **Connected features still intact:** Submit-proof flow (Entry #16 sequential gate + Entry #13 music auto-approve) was already invalidating `["my-assignment"]` and is unaffected. Review-submission flow (`useReviewItemSubmission`) also already invalidates `["my-assignment"]`. The 60s staleTime stays — it's still doing its job for navigation refetches that don't carry a corresponding mutation.
- **Next step:** None on its own.

---

### Entry #23 · `/tasks/[id]` deep UX overhaul: concrete steps, AI ban warning, side-by-side admin review, itemised rewards, Submissions to bottom
- **User prompt (Banglish):** "How to complete this task eitar serial thik nei, Submissions ta sobar shes a show korbe, submission a je approve and reject ashe eita sompurno ta dekhar way naikon link a like ba comment ba onno kisu koreche, admin dubble check korar jonno je user thik kaj koreche ki na, r ekta note likhe diben sob kisu AI check kore jodi kono like diye unlike, follow diye unfollow, comment kore delet kore dewa share kore delete kore dewa platform wise msg asbe je ei sob korle accoun Banned hoye jabe automatic IP Device shoho Banned kora hobe, Task Data ta update koro, Bundle Rewards ta update koro, user jei Task submit korbe sheta serial wise koro UI thik koro userfriendly, admin jei khane check korbe submission shei pgate ta shundor UI koro jnw khub sohojei sob kisu dekha jay jei task ashbe admin sob jnw ekbarei check korte pare and approve disapprove jnw korte pare, amar text gulo pore nijer moto shajay neo."
- **Eight concrete complaints rolled into one iteration on `/tasks/[id]`:** (1) Entry #22's TaskHowToCard only showed step names; needed concrete per-step instructions; (2) Submissions card sat between BundleProofSection and the sidebar — on mobile it appeared above Task Data + Bundle Rewards instead of at the bottom; (3) admin's per-item review row only showed proof URLs as text labels with no side-by-side comparison against the original target; (4) no AI ban warning anywhere; (5) sidebar Task Data was a loose KV dump without status feedback; (6) Bundle Rewards was a single grey one-liner; (7) per-item submission grid needed clearer sequencing visuals; (8) admin's review surface needed to be visible-in-one-glance.
- **Plan**: written + approved at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #22's). Workflow: read Entry #22's plan + audit current state of task-detail.tsx end-to-end → AskUserQuestion (2 scope decisions: warning placement = dedicated card above BundleProofSection; admin review row = side-by-side Target vs Proof panels) → ExitPlanMode → user approved.
- **Done — 2 modified files, 0 new files, ~430 lines net:**
  - **`lib/constants/platforms.ts`** — appended `REVERSAL_VOCAB: Record<string, string[]>` map covering 21 platforms (instagram, facebook, twitter, threads, youtube, tiktok, linkedin, pinterest, reddit, quora, spotify, tidal, deezer, soundcloud, bandcamp, google_business, google_maps, yelp, trustpilot, tripadvisor, plus a `default` fallback). Each entry lists the platform-specific reversible actions in natural English ("unlike a post", "unfollow", "delete a comment", "delete a share or story"). Pure data addition — no existing key touched.
  - **`components/shared/task-detail.tsx`** — eight surgical changes:
    1. **Helpers + imports** (top of file): added `byBundleSortOrder` comparator (shared by every bundle-item list so worker/admin/sidebar surfaces stay in lockstep), `pickTargetUrl(itemData)` (walks 12 standard URL-ish keys: `post_url`, `video_url`, `track_url`, `profile_url`, `business_url`, `listing_url`, `page_url`, `review_url`, `story_url`, `playlist_url`, `link`, `url`), `buildStepOneLiner({ slug, taskTypeName, targetUrl, watchSec, itemData })` (produces plain-English instructions per slug pattern: watch-video → "watch ≥30s", music streams → "stream ≥30s", like-* → "open and like", comment-* with `comment_text` → 'post this comment: "..."', save/share/follow/review/create patterns each get their own line), and `statusBadgeFor(status)` (centralised pill vocabulary). Imported `ShieldAlert` from lucide + `REVERSAL_VOCAB` from constants.
    2. **Layout reorg**: wrapped the existing `grid grid-cols-1 lg:grid-cols-3` in an outer `<div className="space-y-6">`. Removed Submissions + GroupLeaderStatus from the inside of the left column and hoisted them to **full-width below the grid** with an `id="submissions"` anchor for future `/inbox` deep-link scroll-targeting. Mobile order is now: Hero → How-to → AI warning → Recent activity → BundleProofSection → Task Data → Bundle Rewards → **Submissions**.
    3. **TaskHowToCard rewrite** (~80 lines): each step now shows a concrete one-line instruction via `buildStepOneLiner` + a clickable target URL via `pickTargetUrl`. Status-aware tint (green for approved, accent for submitted-pending, primary for the current "Start here" step, muted for not-yet-reached). The "Start here" badge now attaches to whichever step is the first non-(submitted|approved), not always #1 — so a 3-step bundle with step 1 done shows "Start here" on step 2.
    4. **New `<AiCheckWarningCard platformSlug platformName>`** (~30 lines): worker-only red-tinted card with `ShieldAlert` icon. Joins `REVERSAL_VOCAB[platformSlug]` in natural English ("unlike a post, unfollow, delete a comment, or delete a share or story") + closes with the strict ban consequence ("automatic account ban — your IP address and device fingerprint are added to the block list. Confirmed reversals are not appealable.") Gated by `isWorkerView = !canViewSubmissions` so admins / task owners don't see the warning aimed at workers.
    5. **`ItemReviewBlock` side-by-side overhaul** (admin's per-item Submissions row, ~200 lines): three vertical bands — (a) Header = action name + points + status badge; (b) Body = `md:grid-cols-2 divide-x` Target | Proof split: LEFT panel (primary tint) shows the target URL from `pickTargetUrl` + watch duration if any + reuses `TaskDataFields` to render every admin-configured field with proper image/url/text rendering; RIGHT panel (success tint) shows proof URLs as clickable rows + screenshots as a 3-col aspect-video thumbnail grid with numbered badge overlays + worker's notes in italic; (c) Footer = full-width approve / reject buttons (approve shows "+N pts" inline; reject reveals an inline reason input with Confirm/Cancel). Rejection reason banner shown between body and footer when status=rejected.
    6. **`BundleItemSidebarCard` upgrade + new `<TaskDataCard>` wrapper**: each sidebar item now has a numbered pill matching TaskHowToCard's styling and a status-aware border tint (success/error/accent/neutral). The "1 / 3" mono text is gone; replaced with "Step 1 of 3" in the meta row. Music slug now also hides `track_url` from non-staff viewers (was only hiding `video_url` for watch-video). Wrapped in a single `<TaskDataCard bundleItems myItemSubmissions canViewSubmissions />` card with a `ListChecks` icon and descriptive subtitle.
    7. **New `<BundleRewardsCard>`**: itemised list (one row per bundle item with `+N.NN` mono right-aligned), then optional completion bonus row (with `Sparkles` accent icon), then a bold "Total possible · +X.XX pts" row separated by a full border. Replaces the previous single grey sentence.
    8. **BundleProofSection header polish + BundleItemRow numbered-pill polish**: section header gets a bigger "Step X of N" badge (with the badge variant flipping to `success` when all approved) + a thin gradient progress bar driven by `approvedCount / totalCount`. BundleItemRow header gets a 7×7 numbered pill (matching TaskHowToCard) with status-aware tint and a "Step X of Y" subtitle. Locked rows: outer border opacity dropped to 75 %, action details hidden (no point showing them when unreachable), padding tightened (`py-2` instead of `py-3`), locked pill copy `truncate`-d on overflow. Status badge hidden on small screens (it shows in the body anyway) so the header stays single-line.
- **Connected features verified preserved:** sequential gate (Entry #16) untouched — still uses `sort_order` server-side at `lib/actions/assignments.ts:207-230`; music auto-approve (Entry #13) untouched — still fires inside `submitItemProof`; reverse panel (Entry #14) on `/audit` untouched; `/inbox` aggregator (Entry #18) still deep-links to `/tasks/${id}`, now lands at the Submissions section since it's the visible bottom of the page; Entry #22's `useMyAssignmentWithItems` staleTime + lazy html2canvas + `useTaskRecentSubmitters` untouched. Task creator (non-admin owner) still gets the Submissions list (read-only — `isAdmin` false → no approve/reject footer); group leader still gets the read-only status card with Remind buttons.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean (no output).
  - `pnpm exec eslint components/shared/task-detail.tsx lib/constants/platforms.ts` — 1 warning, the pre-existing `<img>` at the hero attachments grid (line 216 after my insertions — unchanged code, just shifted by ~83 lines).
  - Dev server at http://localhost:3001 (already running, PID 20516): `GET /` 200, `GET /login` 200, `GET /tasks` 307 (auth-gated), `GET /tasks/22` 307 (auth-gated — both expected redirects to login while logged out).
- **Files touched:** `lib/constants/platforms.ts` (REVERSAL_VOCAB append), `components/shared/task-detail.tsx` (helpers + layout reorg + TaskHowToCard rewrite + AiCheckWarningCard + ItemReviewBlock overhaul + TaskDataCard wrapper + BundleRewardsCard + BundleProofSection / BundleItemRow polish).
- **State:** Complete. The full vertical (worker sees concrete steps + AI ban warning + sequential pills; admin sees side-by-side Target | Proof panels with inline thumbnails + clean approve/reject footers; both groups see Submissions at the absolute bottom; sidebar mirrors progress with status-aware tints; rewards card itemises every payable point) is wired and consistent across breakpoints.
- **Visual test path (login as super_admin → `/tasks/22`):**
  1. Hero card unchanged.
  2. TaskHowToCard: 3 numbered rows (or however many bundle items). Each row = step name + `+N pts` + concrete one-liner ("Watch ≥30s of this video", "Stream ≥30s of this track", "Like the linked Instagram post", etc.) + clickable target URL. First incomplete step has a primary-tinted border + "Start here" badge; submitted steps have accent tint + clock icon; approved steps have success tint + checkmark.
  3. AI-check warning card (only when logged in as a non-admin viewer): red-tinted ShieldAlert + platform-aware copy + automatic-ban consequence line.
  4. Recent activity card (Entry #22): unchanged, still hides on zero completions.
  5. BundleProofSection: bigger "Step X of N" badge in the header + gradient progress bar. Each BundleItemRow now has a 7×7 numbered pill (or checkmark when approved). Locked rows are visually dimmed and single-line.
  6. Sidebar Task Data card: each item card has a status-aware border tint matching progress; numbered pill matches TaskHowToCard's vocabulary.
  7. Sidebar Bundle Rewards card: per-item itemised list + completion bonus row + bold Total Possible row.
  8. Bottom of page: Submissions card with `Users` icon header + per-worker bundle rows. Each item now renders Target | Proof side-by-side (mobile = stacked). Screenshots render as actual thumbnails (aspect-video, with numbered badge overlay) instead of "Screenshot 1" text. Approve button shows "+N pts"; reject button opens an inline reason input.
- **Out of scope (deliberate):** Anti-fraud AI integration itself (the warning is a deterrent stub; the actual reversal-detection cron + AI vendor + DB schema for it are a separate project); per-platform deep-link OAuth; real-time presence; a dedicated `/inbox/submissions/[id]` route; pagination of the Submissions list; skeleton loaders.
- **Next step:** None on its own. Wait for user's next direction (likely visual confirmation on a logged-in `/tasks/[id]` page, or another iteration on the warning copy / admin review density).

---

### Entry #22 · Bundle-card title wrap fix + `/tasks/[id]` UX & perf polish
- **User prompt (Banglish):** "title tablet and mobile a 2 line a chole astese, http://localhost:3001/tasks/22 task intruduction page ... ei page tar UI user friendly na onk slow button thik moto kaj kore na, potita platform wise potita kaj er jei vabe howa dorkar user ra bujhte parbe kivabe kaj ta sompurno korte hobe, kivabe start korbe konta theke shuru korbe ... amn jeno na hoy ei kaj korte jeye onno kaj a issue holo."
- **Two parts:** (1) Bundle-card header was wrapping to 2 lines on tablet/mobile despite Entry #21 setting `line-clamp-1` on the title. (2) The `/tasks/[id]` page felt slow, buttons sometimes didn't reflect pending state, and there was no platform-/task-type-aware "how to start" guidance or "who else has completed this" signal.
- **Plan**: approved plan at `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote Entry #21's). Workflow: 1 Explore agent (codebase audit) → AskUserQuestion (2 scope decisions: submitter privacy = show count + names + avatars; "how to start" placement = dedicated callout card above bundle items) → ExitPlanMode → user approved.
- **Root cause of the title wrap:** not the title itself (`line-clamp-1` was working). The meta row *above* the title — `<div className="flex items-center flex-wrap gap-2">` — was letting long uppercase platform names like `GOOGLE BUSINESS` / `FACEBOOK REVIEWS` drop to a second line beside the tier badge. Result was a 2-line header, not a 2-line title.
- **Done — 5 modified files, 0 new files:**
  - **`components/shared/task-bundle-card.tsx`** — header meta row: removed `flex-wrap`, added `min-w-0` to the row + `truncate min-w-0` to the platform-name `<span>`. The tier badge keeps its natural width; the platform name now ellipsises first instead of wrapping. One row again on mobile 375 px.
  - **`components/shared/music-play-lock-modal.tsx`** — replaced the top-level `import html2canvas from "html2canvas"` with `const { default: html2canvas } = await import("html2canvas")` inside `finalize()`. The ~120 KB chunk now ships only when a worker actually completes a music play, saving it on every other page in the app.
  - **`hooks/use-tasks.ts`** — three surgical changes:
    1. `useMyAssignmentWithItems` gained `staleTime: 60_000` + `refetchOnWindowFocus: false` (was refetching on every mount).
    2. `useSubmitItemProof` invalidation of the unbounded `["task"]` key now uses `refetchType: "none"` — marks cached task-list queries stale (so they refresh on next mount) without triggering an immediate background refetch on every cached page after each proof submit.
    3. New `useTaskRecentSubmitters(taskId)` hook with `staleTime: 60_000`.
  - **`lib/actions/tasks.ts`** — new `getTaskRecentSubmitters(taskId, limit=5)` server action. Two parallel queries (`count: "exact", head: true` + a 5-row select joined to `users` for name/image), returns `{ totalCompleted, recent[] }`. Cheap and additive — no existing call site touched.
  - **`components/shared/task-detail.tsx`** — three additions:
    1. **`<TaskHowToCard items>`** (inline, ~50 lines): renders a numbered ordered list of bundle items sorted by `sort_order`, each with the task-type name + `+N pts` badge, and a "Start here" hint on item #1. Mounts above the existing `<BundleProofSection>` so workers see the sequence-of-steps story BEFORE the proof-submission grid.
    2. **`<TaskRecentActivity taskId>`** (inline, ~40 lines): uses the new hook; hides itself when `totalCompleted === 0` (no cold-start empty card); otherwise shows "N workers have completed this task" + up to 5 rows of recent submitters (avatar OR initials, name, relative time via `formatRelativeTime`).
    3. Approve button at line 1047 (`AssignmentReviewRow`): `disabled={review.isPending}` → `isLoading={review.isPending}` — now shows the spinner while the mutation runs (the `<Btn isLoading>` prop already disables the button, so this is purely an upgrade).
  - Added `ListChecks` to the lucide-react imports and `formatRelativeTime` import from `@/lib/utils`. `useTaskRecentSubmitters` imported from `@/hooks/use-tasks`.
- **Connected features verified not broken** (Entry #13 music auto-approve, #14 reverse panel, #16 sequential gate, #18 `/inbox` aggregator, #20–#21 card grid):
  - Music auto-approve flow in `lib/actions/assignments.ts:269-323` (MUSIC_STREAM_SLUGS check + `approve_item_and_finalize` RPC + `auto_approved_at` stamp) untouched.
  - `BundleItemRow.isLocked` prop + server-side sibling check at `assignments.ts:207-230` untouched.
  - `getPendingItemReviews` ordering by `submitted_at` untouched.
  - `TaskBundleCard` + `PlatformTile` + `PLATFORM_BRAND_SLUGS` (Entry #20-#21) untouched except for the meta-row classes above.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean.
  - `pnpm exec eslint <5 changed files>` clean (only the pre-existing `<img>` warning at `task-detail.tsx:133` remains, in code I didn't touch).
  - Dev server (already running at :3001 from a prior shell, PID 20516): `GET /` → 200, `GET /login` → 200, `GET /tasks` → 307 to login (auth-gated, expected).
- **Files touched:** `components/shared/task-bundle-card.tsx`, `components/shared/music-play-lock-modal.tsx`, `hooks/use-tasks.ts`, `lib/actions/tasks.ts`, `components/shared/task-detail.tsx`.
- **State:** Complete. Title row is single-line on tablet/mobile; `/tasks/[id]` ships fewer KB per visit, refetches less aggressively, surfaces a step-by-step "How to complete this task" card with per-step points + "Start here", and shows a "Recent activity" social-proof card when others have finished the task. Approve button now displays a spinner during the mutation.
- **Out of scope (deliberate):**
  - Parallelising the two-step fetch in `getMyAssignmentForTaskWithItems` (second query depends on the first; rewriting as a join is a larger surgery — deferred).
  - Custom SVGs for the 10 review-site brands (still Entry #21's open-door).
  - Skeleton loaders for the new callouts (they show late and fade in via React Query default — good enough for now).
  - Real-time "X is working on this right now" presence indicator.
- **Next step:** None on its own. Wait for the user's next direction (likely visual confirmation on a logged-in task page, or another iteration on the detail layout).

---

### Entry #21 · `/tasks` card polish: brand icons + tighter sizes
- **User prompt (Banglish):** "social media original icons deo, icons gulo choto koro, Title 1 line koro size ektu choto jnw vange na jay bold thake, description 3 line pojonto size thakbe, text button icon sob optimize jnw thake boro choto jnw na lage dekhe shundor jnw lage"
- **Plan**: written to `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote the Entry #20 plan). Skipped the Phase 2 Plan agent — focused polish iteration with well-bounded changes. User approved.
- **Done — 2 files modified:**
  - **`components/shared/platform-icon.tsx`:**
    - Added inline brand SVGs (simple-icons-style paths) for **7 platforms** that didn't have one: Spotify, TIDAL, Deezer, SoundCloud, Bandcamp, Threads, Quora.
    - Added 2 lucide fallbacks for the icon-less brands: Google Maps → `<MapPin>`, Website → `<Globe>` (no extra dependency — lucide-react is already in the project).
    - Exported `PLATFORM_BRAND_SLUGS: ReadonlySet<string>` listing every slug `PlatformIcon` returns non-null for. Consumers check this to decide between SVG and letter fallback without re-walking the switch.
    - **Deliberately skipped custom SVGs** for the 10 review-site platforms (Google Business, Yelp, Trustpilot, Tripadvisor, BBB, G2, Capterra, Sitejabber, Glassdoor, Facebook Reviews): their brand glyphs are either text-heavy (G2, BBB) or visually muddy at 20 px. Letter fallback on brand colour reads cleanly — "Y" on Yelp red, "G" on G2 orange (single capital letter for each).
  - **`components/shared/task-bundle-card.tsx`:**
    - New local `<PlatformTile slug color name>` component appended at the bottom of the file. Picks `<PlatformIcon>` when `PLATFORM_BRAND_SLUGS.has(slug)`, otherwise renders a single capital letter on the brand-coloured tile. Tile size: `w-10 h-10 sm:w-11 sm:h-11` (40 → 44 px), down from Entry #20's `w-12 h-12 sm:w-14 sm:h-14` (48 → 56 px) — tighter header gives the title + tier row more horizontal room.
    - Header: replaced the inline letter `<div>` with `<PlatformTile ...>`; tightened tier+platform-name strip margin `mb-1` → `mb-0.5`.
    - **Title**: was `text-base ... line-clamp-2`; now `text-[15px] ... line-clamp-1` (forced one line, slightly smaller font, still bold). Added `title={title}` attribute so the full text is reachable on hover/long-press for tasks whose title would otherwise be clipped.
    - **Description**: was `line-clamp-2 leading-relaxed mb-4`; now `line-clamp-3 leading-snug mb-3` (one more line of preview, tighter leading + bottom margin).
    - **Action pills**: padding `px-2` → `px-1.5`; text-size `text-xs` → `text-[11px]`. Icon stays `w-3 h-3`.
    - **Credit number**: `text-3xl` → `text-2xl sm:text-3xl` (smaller on mobile so the footer row balances against the new compact header).
    - Imported `PlatformIcon` + `PLATFORM_BRAND_SLUGS` at the top.
- **§26 discipline kept:** every change still uses TaskMOS tokens (`bg-primary`, `bg-card`, `text-muted-foreground`, brand colors from `PLATFORM_CONFIG`). Brand SVGs render in `text-white` via the `<PlatformTile>` wrapper's `text-white` class on the colored background — matches the reference screenshot's "brand glyph on brand colour" pattern without copying its lime palette.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean.
  - `pnpm exec eslint <2 changed files>` clean.
  - Dev server: `GET /` → 200 (791 ms), `GET /tasks` → 307 to login (auth-gated), `GET /login` → 200 (272 ms).
- **Files touched:** `components/shared/platform-icon.tsx`, `components/shared/task-bundle-card.tsx`.
- **State:** Complete. Each card now shows a real brand SVG (Instagram, YouTube, Spotify, etc.) inside a smaller 40 → 44 px tile; titles render on a single line at 15 px; descriptions get 3 lines of breathing room; credit number scales down on mobile. The 10 review-site platforms fall back to a coloured letter tile (Y/G/T/etc.) which reads cleanly on brand colour.
- **Visual test path (login as super_admin):**
  1. `/tasks` Doable tab on desktop → cards in 3-col grid. Spotify tasks show the Spotify SVG, YouTube shows the play button, Instagram shows the camera mark, etc.
  2. Resize to mobile (375 px) → 1-col grid, tile shrinks to 40 px, title still doesn't wrap, description shows up to 3 lines.
  3. Switch to a platform without a brand SVG (Yelp / G2 / BBB) → tile shows a single coloured letter on the brand color.
  4. Switch tabs My Tasks / Manage Tasks → same card visuals; mode-specific footer actions unchanged.
- **Out of scope (deliberate):**
  - Custom SVGs for the 10 review-site brands — letter fallback is good enough; add later if asked.
  - Two-letter abbreviations ("G2" / "TA") — letter is fine for now.
  - Promoting `<PlatformTile>` to a standalone `components/shared/platform-tile.tsx` — kept local until a second surface needs it.

---

### Entry #20 · `/tasks` card UI redesign — responsive grid + bundle-aware
- **User prompt (Banglish):** "Doable Tasks, My Tasks, Manage Tasks, Review Submissions er sokol features gulo destop, laptop, tablet, mobile shoho shub shundor vabe jnw dekhay" — with a reference screenshot of a card-grid layout (platform tile + tier chip + bundle action pills + big credit + slots progress bar).
- **Plan**: written to `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote the previous /inbox plan). Plan-mode workflow: 1 focused Explore agent (data-gap audit) → AskUserQuestion (4 scope decisions) → ExitPlanMode → user approved.
- **User-confirmed decisions:** skip ETA chip (schema has no duration column); budget-based slot proxy (`points_spent / points_per_completion ≈ slots filled`); Review tab kept as row layout (per-item proof review fits rows better); tier cutoffs `≥15 Premium · 8–14 Medium · <8 Small`.
- **Done — 4 modified files, 2 new files, ~580 lines net:**
  - **`lib/actions/assignments.ts`** `getMyTasks`: extended the `tasks!inner(...)` projection to add `completion_bonus, point_budget, points_spent, max_completions` + the joined `task_bundle_items(id, points, sort_order, task_types!inner(slug, name))` relation. One-line change to the select string.
  - **`lib/actions/tasks.ts`** `getTasks`: same `task_bundle_items` relation added to the existing select. Other fields already came via `*`.
  - **`lib/constants/index.ts`**: appended `TaskTier` union + `getTaskTier(pointsPerCompletion, completionBonus)` + `TIER_BADGE_VARIANT` map (Premium=success, Medium=primary, Small=warning).
  - **`lib/utils/task-type-icons.ts`** (new): `getTaskTypeIconStyle(slug)` returns `{ Icon: LucideIcon; tint: string }`. 16 slug-prefix patterns mapped to lucide icons (`Heart`, `Bookmark`, `MessageCircle`, `Share2`, `UserPlus`, `Play`, `Music`, `Star`, `Camera`, `Plus`, `ThumbsUp`, `Mic2`, `MapPin`) and TaskMOS-token tints (`bg-error/10`, `bg-primary/10`, `bg-accent/10`, etc.). Tints stay on theme tokens — no hex — so dark mode just works. Order-sensitive: `playlist` catch comes before generic `^add-` so Spotify "Add to Playlist" gets the Music icon.
  - **`components/shared/task-bundle-card.tsx`** (new, ~340 lines): single responsive card primitive used by all 3 task-list tabs. Anatomy: platform tile (14×14 desktop, 12×12 mobile) + tier chip + uppercase platform name + title (2-line clamp) + 2-line description + bundle action pills (one per `task_bundle_items` row, sorted by `sort_order`, with fallback to the legacy single task_type for pre-bundle rows) + big credit total + `base + bonus` line + slots progress bar (gradient `from-primary to-accent`). Mode-driven action footer:
    - **doable**: Accept (pending) / Submit proof link (in_progress|rejected) / Awaiting review (submitted) / Earned chip (approved).
    - **creator**: Edit link + Delete + View buttons.
    - **admin**: Approve + Reject (inline reason input) + View + Delete when `pending_approval`; just View + Delete otherwise.
  - **`components/shared/tasks-view.tsx`**: imported `TaskBundleCard`; replaced the dual-layout (`hidden sm:block` + `sm:hidden`) renders inside `DoableTasksTab`, `MyTasksTab`, and `ManageTasksTab` with a single responsive `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` of `<TaskBundleCard mode="..." />`. Deleted ~116 lines of dead admin-row markup. Cleaned up 4 now-unused imports (`Trash2`, `Edit2`, `Wallet`, `APPROVAL_VARIANT`). Removed unused `rejectingId` / `rejectReason` state from `ManageTasksTab` (the reject input now lives inside the card's `AdminActions` footer).
  - **`ReviewTab`** left intact per scope decision — per-item review still uses the existing row layout because proof URLs + screenshots inline don't fit a 3-col grid.
  - **`DoableTaskRow`** (legacy mobile/desktop row used inside `DashboardDoableTasks` preview) kept untouched — the dashboard's compact list preview is a different surface from the `/tasks` grid.
- **Reference style discipline (phnote.md §26):** the screenshot's lime accent + filled action-blob style was deliberately NOT copied. Pills use lucide stroke-style icons + TaskMOS token tints. Tier badges use the brand `success/primary/warning` `<Badge>` variants. Platform tile color comes from `PLATFORM_CONFIG[slug].color` (existing TaskMOS palette). Big credit number uses `text-primary` (purple) not the demo's lime.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean.
  - `pnpm exec eslint <touched files>` clean (1 pre-existing `cancelRemainingAssignments` warning in `assignments.ts`, not from this change).
  - Dev server: `GET /` → 200 (784 ms), `GET /tasks` → 307 to login (auth-gated), `GET /login` → 200 (193 ms).
- **Files touched:** `lib/actions/assignments.ts`, `lib/actions/tasks.ts`, `lib/constants/index.ts`, `components/shared/tasks-view.tsx`; new `lib/utils/task-type-icons.ts` + `components/shared/task-bundle-card.tsx`.
- **State:** Complete. The three task-list tabs render the new card grid in 1/2/3 columns at mobile/tablet/desktop breakpoints. Every existing action (Accept, Submit, Edit, Delete, Approve, Reject, View) is wired through the card's mode-specific footer. Bundle items appear as colored pills with icon + credit; legacy single-task rows fall back to one pill from the legacy `task_types` join. The Review Submissions tab keeps its existing row layout — per-item proof review with inline URLs + screenshots doesn't fit a card grid and the user explicitly approved keeping it as-is.
- **Visual test path (login as super_admin):**
  1. `/tasks` Doable tab → resize browser: <640 px shows 1 column, 640–1024 shows 2, ≥1024 shows 3. Cards have platform tile, tier chip (Premium/Medium/Small), title, description, bundle pills, big credit, slots bar, and an Accept/Submit button at the bottom.
  2. Switch to My Tasks → same grid layout, footer shows Edit + Delete + View.
  3. Switch to Manage Tasks (admin) → same grid; pending-approval cards show Approve / Reject; clicking Reject reveals the inline reason input.
  4. Switch to Review Submissions → unchanged row layout (per-item proof review).
- **Out of scope (deliberate):**
  - ETA chip — schema doesn't carry duration; revisit when an `estimated_duration_sec` column is added.
  - Server-side accurate slot count — budget-based proxy is sufficient for now.
  - Full card-grid redesign of Review Submissions.
  - Skeleton loaders for the grid — existing `LoadingSkeleton` retained.

---

### Entry #19 · Build-error fix: `"use server"` files can only export async functions
- **User prompt:** "Build Error — Only async functions are allowed to be exported in a 'use server' file. ./lib/actions/inbox.ts:131 PREVIEW_LIMIT. fix all issues"
- **Root cause:** Next.js 16 enforces that `"use server"` files export ONLY async functions. My new `lib/actions/inbox.ts` (Entry #18) violated this with `export const PREVIEW_LIMIT = 5;` — a non-async value export. Type exports (`InboxKey`, `InboxRow`, `InboxData`, `InboxCounts`) are erased at compile-time so Next.js tolerates them; non-async values are the ones it blocks.
- **Done:**
  - Removed `export` from `PREVIEW_LIMIT` in `lib/actions/inbox.ts`. Verified via grep that nothing outside the file referenced it.
  - Added an inline comment explaining the Next.js constraint so the next person who looks at the file doesn't re-add `export`.
  - Cleaned up two corrupted Turbopack dev-cache artifacts (`.next/dev/types/routes.d.ts` and `.next/dev/types/validator.ts`) that had partial-regeneration garbage from the failed build — both regenerated cleanly after the next `/inbox` request.
- **Files touched:** `lib/actions/inbox.ts` (3-line change), plus deletion of two regeneratable `.next/dev/types/*.ts` files.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean.
  - Dev server `GET /` → 200 (343 ms), `GET /login` → 200 (104 ms), `GET /inbox` → 307 to login (auth-gated), `GET /tasks` → 307 (auth-gated).
- **State:** Build-error resolved. `/inbox` is now reachable; admin login + click "Inbox" in the sidebar should render the 9-queue grid from Entry #18.

---

### Entry #18 · `/tasks` audit + central `/inbox` for all 9 admin approval queues
- **User prompt (Banglish):** Audit whether the four `/tasks` tabs work cleanly for admins + workers; confirm admin can approve/disapprove from one place; add anything missing.
- **Plan**: written to `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` (overwrote the previous music+sequential plan, which had already shipped). Plan-mode workflow: 3 Explore agents in parallel + verification grep + AskUserQuestion → ExitPlanMode → approved.
- **Audit findings (from explore + grep):**
  - The four `/tasks` tabs functionally work; Manage Tasks's category filter chips ARE wired (one Explore agent claimed otherwise — grep verified that's wrong).
  - `components/shared/task-approval-queue.tsx` was **orphan** dead code — defined but imported nowhere.
  - Admin notifications linked to `/tasks/${taskId}` etc., not to a central queue. Twelve notification call sites identified.
  - **No central admin inbox** — approvals scattered across 9 surfaces (`/users`, `/tasks` Manage, `/tasks` Review, `/payments`, `/groups`, `/appeals`, `/support`, `/contact-messages`, `/audit`).
  - Task cards never displayed `tasks.category` (added in migration 051); Review tab never showed the `assignment_item_submissions.id` for cross-correlation with notification data.
- **User-confirmed decisions:** Central admin inbox at `/inbox` (dedicated route, not a dashboard panel) + bundle the confirmed bug fixes.
- **Done — 4 new files, 11 modified files, 1 deleted file:**
  - **`lib/constants/index.ts`** — extracted `CATEGORY_LABELS` (compact pill labels) + `CATEGORY_LABELS_LONG` (admin-form dropdown labels) as a single source of truth.
  - **`lib/actions/inbox.ts`** (new, ~280 lines):
    - `getAdminInboxCounts()` — nine `count: "exact", head: true` queries in parallel → `Record<InboxKey, number> & { totalPending }`. Drives the sidebar badge. Admin-only queues (auto_reverse) gated behind `isAdminRole`; moderators see 0 there.
    - `getAdminInbox()` — same nine queues but with top-5 preview rows. Returns `{ counts, preview }`. Each row shaped to a generic `InboxRow` type (`title / subtitle / actorName / actorEmail / createdAt / openHref`) so the client renders uniformly. Open-hrefs deep-link to the existing source surface — the inbox is a triage view, not a duplicate action panel.
  - **`hooks/use-inbox.ts`** (new) — `useAdminInboxCounts` + `useAdminInbox` with 60 s refetch / 30 s staleTime (matches existing admin polling patterns).
  - **`components/shared/admin-inbox.tsx`** (new, ~210 lines) — TaskMOS-primitive layout:
    - Top: 9-tile quick-stats grid (`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3`), each tile = icon + label + count + "View all →" link. Empty tiles render in muted state; non-empty in branded tint.
    - Below: one `<Card>` per non-empty queue with up to 5 preview rows. Row layout = avatar (`getInitials`) + title + subtitle + `formatRelativeTime` + "Open" button to source surface.
    - All-clear celebratory state when every count = 0.
    - Queue order = highest-urgency first (items → payments → appeals → users → tasks → groups → tickets → contact → auto_reverse).
  - **`app/(dashboard)/inbox/page.tsx`** (new) — server component, `requireRole(STAFF_ROLES)`, metadata title "Inbox", mounts `<PageHeader />` + `<AdminInbox />`.
  - **`proxy.ts`** — `/inbox` added to `staffOnlyPaths`.
  - **`components/layout/sidebar.tsx`** — new `Inbox` nav item with permission `manage_users`; `useAdminInboxCounts` hook wired to render a live count pill (`min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground` — clamped to `99+`); collapsed mode shows a dot in the top-right corner.
  - **12 admin notification links updated** to `link: "/inbox"`:
    - `lib/actions/appeals.ts` — "New Suspension Appeal"
    - `lib/actions/assignments.ts` — "Music play auto-approved" + "Item submitted — Review Needed"
    - `lib/actions/tasks.ts` — "New Task — Review Needed" ×2 (createTask + publishTask) + "Task Updated — Review Needed"
    - `lib/actions/tickets.ts` — "New Support Ticket"
    - `lib/actions/contact.ts` — "New Contact Message"
    - `lib/actions/payments.ts` — "New Payment — Review Needed"
    - `lib/actions/groups.ts` — "New Group — Review Needed" + "Group Updated — Review Needed" + "Group Deletion Requested"
    - Worker-facing notifications (task accepted, item approved/rejected, support reply, etc.) left untouched — they still link to the specific task/ticket detail page.
  - **`components/shared/tasks-view.tsx`** — category `<Badge>` added to every card layout (DoableTaskRow desktop + mobile, MyTasksTab desktop + mobile, ManageTasksTab desktop + mobile = 6 insertions). Review tab gains a `#{itemSubmissionId}` font-mono label next to the worker name.
  - **`components/shared/task-form.tsx`** — local `CATEGORY_LABELS` removed; now imports `CATEGORY_LABELS_LONG` from the shared constants.
  - **`components/shared/task-approval-queue.tsx`** — **deleted** (orphan dead code).
- **Verified:**
  - `pnpm exec tsc --noEmit` clean.
  - `pnpm exec eslint <14 changed files>` — 1 pre-existing `cancelRemainingAssignments` unused-var warning in `assignments.ts` (not introduced).
  - Dev server `GET /` 200 in 2.76 s (first cold-build hit), `GET /login` 200 in 226 ms, `GET /inbox` 307 to login (correctly auth-gated).
  - Orphan grep: `grep -r "TaskApprovalQueue"` returns 0 hits.
  - **Note on initial smoke failure:** the dev server had been running for several days and entered a stale state where Next's `optimizeCss` experiment couldn't find the `critters` peer-dep at post-render time (HTTP 500 was the post-process failure masking otherwise-successful application code). A clean restart of `pnpm dev` resolved it — not from this change.
- **Files touched:** `lib/constants/index.ts`, `lib/actions/inbox.ts` (new), `hooks/use-inbox.ts` (new), `components/shared/admin-inbox.tsx` (new), `app/(dashboard)/inbox/page.tsx` (new), `proxy.ts`, `components/layout/sidebar.tsx`, `components/shared/tasks-view.tsx`, `components/shared/task-form.tsx`, `lib/actions/appeals.ts`, `lib/actions/assignments.ts`, `lib/actions/tasks.ts`, `lib/actions/tickets.ts`, `lib/actions/contact.ts`, `lib/actions/payments.ts`, `lib/actions/groups.ts`, **deleted** `components/shared/task-approval-queue.tsx`.
- **State:** Complete. Admin now has a single `/inbox` route that aggregates every pending decision. Notification deep-links land them there. Source surfaces (`/payments`, `/appeals`, etc.) still own the approve/reject UX — the inbox is a triage view, not a duplicate action panel.
- **Visual test path:**
  1. Login as super_admin → sidebar shows new "Inbox" entry second from top with a primary-color pill showing the live count.
  2. Click → `/inbox` lands on the 9-tile quick-stats grid. Non-empty tiles are branded; empty ones are muted.
  3. For each non-empty queue, scroll to its detail Card with up to 5 latest rows + "Open" buttons that go to the existing source surface.
  4. From any source surface, approving/rejecting one item decrements the sidebar badge after the next 60 s tick.
  5. Submit a new contact message from `/` → within 60 s, admin sees a "Contact messages" row appear in the inbox.
  6. `/tasks` cards (all 3 tabs) now show a small category pill alongside the existing platform / status badges.
  7. Review tab rows show `#{itemSubmissionId}` next to the worker name for notification correlation.
- **Out of scope (deliberate):** inline approve/reject in the inbox (delegated to source surface); bulk select; notification preferences; reordering source surfaces; "things I handled this week" history (covered by `/audit`); Supabase realtime push (60 s polling is enough for triage).

---

## 2026-05-26 · Session 1 (continued)

### Entry #17 · Admin Create form: Required Actions ordered by natural worker flow
- **User prompt (Banglish):** "Required Actions — eita serial koro ami jeivabe bolsilam" (with screenshot showing Spotify actions sorted alphabetically: Add to Playlist, Create Public Playlist, Follow Artist, Like Track, Pre-Save Album, Save Album to Library, Share Track, Stream Track).
- **Intent:** The admin's action picker was returning task_types alphabetically (DB query `.order("name")`), so Stream Track sat at the bottom while Create Public Playlist sat at the top — the opposite of the natural worker flow the user codified in Entry #16 ("age music shunbe then like korbe…"). Display order should nudge admin to check actions in the order a worker should perform them, so the resulting bundle (sort_order = check order) lines up with the sequential UI gate.
- **Done — single file, `components/shared/task-form.tsx`:**
  - Added `actionPriority(slug)` helper. Returns a numeric tier (lower = earlier in the worker flow):
    - **1.0** — foundation / passive consumption: `watch-*`, `stream-*`, `hifi-stream`, `play-track`, `visit-page`, `scroll-to-end`.
    - **2.0** — `upvote`, `upvote-answer`.
    - **2.5** — light engagement: `like-*`, `react-*`.
    - **3.0** — save / bookmark / collect: `save-*`, `add-to-*`, `bookmark-*`, `pre-save-*`.
    - **4.0** — text engagement: `comment-*`, `reply-*`, `leave-comment`, `leave-public-comment`, `comment-on-*`.
    - **4.5** — `quote-*`.
    - **5.0** — sharing: `share-*`, `retweet`, `repost-*`, `forward-message`, `send-message`, `react-message`.
    - **6.0** — follow / subscribe / connect / join / `turn-on-bell`.
    - **7.1–7.7** — review-flow steps in the precise sequence rate → write → pros/cons/recommend/CEO → photo → verify → check-in → answer-Q&A.
    - **7.8** — review-misc: `salary-*`, `interview-*`, `tag-*`.
    - **7.85 / 7.9 / 7.95** — **review-context overrides** (tier 0 in source order so they shadow the generic save/share patterns): `mark-useful`/`mark-helpful` → 7.85, `save-business`/`save-place`/`save-to-trip` → 7.9, `share-listing`/`share-recommendation`/`share-location` → 7.95. These are review-platform "supporting CTAs" that the worker does AFTER the primary review work, not before.
    - **8.1** — heavy creation: `create-*`, `post-tweet`, `post-story`, `post-in-*`.
    - **8.2** — multi-target: `cross-post-*`, `pin-to-multi-*`, `multi-pages`, `multi-groups`.
    - **8.3** — transactional: `buy-track`, `download-track`.
    - **8.4** — boost: `duet-*`, `give-award`.
    - **9.0** — always last: `keep-*` (ongoing commitment over days/weeks).
    - **5.5** — unknown slug (middle of the pack, safe default).
  - Sort applied inside the existing filter IIFE around the action picker — chained `.sort()` after `.filter()`. Tie-break alphabetically by `tt.name.localeCompare(b.name)` so peer-tier rows stay stable.
- **Verified by script** (Node REPL against the literal function body):
  - **Spotify:** Stream Track → Like Track → Add to Playlist → Pre-Save Album → Save Album to Library → Share Track → Follow Artist → Create Public Playlist. ✓ Matches user's "listen → like → save → share → follow → create" intent.
  - **Instagram:** Like Post → Save Post → Comment → Share to Story → Follow Account → Create Post/Reel/Story → Post Story → Keep Post Live. ✓
  - **YouTube:** Watch Video → Like Video → Comment on Video → Share Video → Subscribe → Turn on Bell → Create Community Post → Create Short. ✓
  - **Google Business / Google Maps / Tripadvisor:** Rate → Write Review → Photo → Answer Q&A → Mark Helpful → Save Business/Place/Trip → Share Listing/Location. ✓
  - **`pnpm exec tsc --noEmit`** clean; **`pnpm exec eslint task-form.tsx`** clean (1 pre-existing `watchItems` useMemo-deps warning, not introduced).
  - `GET /tasks/create` → 307 to login (expected — auth-gated).
- **Files touched:** `components/shared/task-form.tsx`.
- **State:** Complete. The Required Actions card now nudges admins to check in the natural worker order; combined with Entry #16's sequential UI gate (which uses `sort_order = check order`), the resulting bundle plays in the intended sequence for the worker.
- **Visual check:** open `/tasks/create` → pick Spotify → "Stream Track" is now the first row (was 8th in the alphabetical version). Same nudge across IG/FB/TW/YT/TT/LI/PI/Reddit/Quora/Threads + all music + all review platforms.
- **Out of scope (deliberate):**
  - Force-natural-order on save (admin still has agency: if they check Like before Stream, the bundle sort_order reflects their explicit choice, not the priority). If user later wants strict reordering at save time, easy follow-up in `createTask`.
  - Drag-to-reorder bundle items (still future work).
  - Server-side sort change in `getTaskTypesByPlatform` (`.order("name")` stays — keeps the DB query stable for any other consumer; sort happens client-side in the form view only).

---

### Entry #16 · Music play lock hardening + sequential bundle items (all platforms)
- **User prompt (Banglish):** "music stremming a jokhn keo music play korbe tokhn joto sec play dewa thakbe toto khn keo puse korte parbe na puro smy play hoile point pabe close korar option pabe ... potita jinish serial wise korun, dhorun age to music shunbe then valo lagle like korbe then comment korbe then baki gula, so ei hisab kore shajiye felun user jnw step by step korte pare shudhu music na sob platform er jonnoi korben"
- **Intent (two parts):**
  1. **Music play lock**: while the countdown is running, the close (X) button + iframe pause/seek controls must be unclickable. After completion, close re-enables and the existing auto-approve (Entry #13) credits the worker.
  2. **Sequential bundle items, all platforms**: bundle items must be done in admin-defined order. Item N+1's proof form is locked until item N is at least `submitted` (music auto-approves → unlocks instantly). If item N is rejected, item N+1 stays locked until N is resubmitted.
- **Plan**: written to `C:\Users\dmmah\.claude\plans\music-stremming-a-jokhn-clever-map.md` via plan-mode workflow (Explore → Plan agent → AskUserQuestion → ExitPlanMode). User approved.
- **User-confirmed decisions:** unlock gate = `submitted`; rejected → locked-forward.
- **Pre-deploy DB audit:** read-only query against `assignment_item_submissions` found **0 at-risk in-flight bundles** (no workers had submitted higher-sort_order items while lower-sort_order items were still in progress). Safe to ship.
- **Done — 4 files, no new migration:**
  - **`components/shared/music-play-lock-modal.tsx`:**
    - Computed `isLocked = started && !completedRef.current` near line 110 (single source of truth).
    - Close (X) button now `disabled={isLocked}` + `aria-disabled` + `aria-label` switch + `title` tooltip + `disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10`. Belt-and-braces: `onClick={isLocked ? undefined : onClose}`.
    - Added a `z-10 cursor-not-allowed` transparent click-blocker `<div>` overlay inside the iframe wrapper that mounts ONLY while `isLocked` — preserves the pre-Start "click play inside iframe" affordance Bandcamp/Spotify embeds require.
    - Copy update: "Keep this tab focused. Switching tabs will reset the counter." → "Player locked until countdown ends. Switching tabs resets the counter."
  - **`components/shared/task-detail.tsx`:**
    - In `BundleProofSection` (~line 348), added a `sortedItems` array sorted by `task_bundle_items.sort_order` (instead of relying on the upstream query order); computed `firstBlockingIdx` and an `isLockedAt(idx)` helper.
    - Loop now maps `sortedItems` (not raw `items`) and passes `isLocked` + `previousItemName` to `BundleItemRow`.
    - Card description appends `· Currently on step N` when something is blocking.
    - `BundleItemRow` extended with optional `isLocked` + `previousItemName` props; the existing `(status === "in_progress" || status === "rejected")` interactive branch was split into two siblings: locked branch renders a `Lock`-icon + "Locked — finish \"<previous>\" first" pill; unlocked branch renders the existing proof form unchanged.
    - Added `Lock` to the lucide-react import.
  - **`lib/actions/assignments.ts`:**
    - `submitItemProof`: added `sort_order` to the `task_bundle_items!inner(...)` select on the item-load query. Injected a sequential guard between the status check and proof-type validation — fetches all sibling `assignment_item_submissions` for the same `assignment_id`, joined to `task_bundle_items(sort_order)`, and refuses with `"Complete the previous bundle item first"` if any sibling with a lower `sort_order` isn't in `('submitted', 'approved')`. Skipped when `mySortOrder === 0` (the first item never has predecessors). PostgREST's nested-relation TS shape returns array-or-object — guard handles both via `Array.isArray()` fallback.
    - `getMyAssignmentForTaskWithItems`: replaced `.order("bundle_item_id", { ascending: true })` with `.order("sort_order", { ascending: true, referencedTable: "task_bundle_items" })` so items always come back in `sort_order` sequence (fixes a latent bug surfaced during exploration — insertion order usually matched but wasn't guaranteed).
  - **`components/shared/task-form.tsx`:** one-line hint added to the Required Actions card header: "Workers will complete these in the order shown above — step 2 unlocks once step 1 is submitted."
- **Files touched:** `components/shared/music-play-lock-modal.tsx`, `components/shared/task-detail.tsx`, `lib/actions/assignments.ts`, `components/shared/task-form.tsx`.
- **Verified:**
  - DB audit: 0 at-risk assignments.
  - `pnpm exec tsc --noEmit` clean (after one cast-through-unknown fix for PostgREST nested-relation shape).
  - `pnpm exec eslint <4 files>` — 3 pre-existing warnings (no-img-element on task-detail line 132, watchItems useMemo deps on task-form line 99, unused `cancelRemainingAssignments` on assignments line 46). None introduced by this change.
  - Dev server: `GET /` → 200 (619 ms), `GET /login` → 200 (272 ms), `GET /tasks` → 307 redirect to login (expected — auth-gated).
- **State:** Complete. The full vertical (music lock, server gate, UI gate, ordering, admin hint) is wired and consistent.
- **Visual test path (recommended):**
  1. Music lock — open a Spotify task → press play in embed → Start counter → X greys out, clicking the iframe area shows `not-allowed` cursor and does nothing → countdown completes → X enabled + auto-approve fires + /audit's reversible panel shows the row with 24 h countdown.
  2. Sequential — open a 3-item bundle (e.g. [Music, YouTube watch, Like]) → only item 1 interactive, items 2-3 show the locked pill → complete music → item 2 unlocks immediately → submit YouTube → item 3 unlocks while YouTube is `submitted` → reject YouTube from admin → item 3 re-locks until resubmit.
  3. Server gate — direct POST to `submitItemProof` with `itemSubmissionId` of item #2 while #1 is `in_progress` → `"Complete the previous bundle item first"`.
- **Next step:** Awaiting user signal. Remaining demo features: task-form watch-time tiers + music play tracking sections (§8 + §11.7), credit pricing reference card (§11.1), or per-action admin content fields (§11.2).
- **Notes:**
  - Race condition (single user submits N and N+1 near-simultaneously): UI lock makes this implausible from the browser; the server JS guard catches the rare API-direct case. RPC-level guard deferred — revisit if observed.
  - Admin reordering a bundle mid-flight: the gate re-evaluates against the new order on next render — workers who already submitted item A may see B as locked if B is now ahead of A. Documented as expected.
  - Music auto-approve still happens INSIDE `submitItemProof` after the standard submit RPC succeeds — sequential gate runs BEFORE that path, so unaffected.

---

## 2026-05-25 · Session 1 (continued)

### Entry #15 · Worker grid category filter chips on /tasks
- **User prompt:** "next" (user picked "Worker grid category filter chips")
- **Intent:** Surface migration 051's `tasks.category` on the worker-facing `/tasks` page so users can narrow Doable / My Tasks / Manage Tasks by Engagement / Creation / Reviews / Music / Maps / Other.
- **Done:**
  - **`lib/actions/tasks.ts`** `getTasks`: added optional `category?: string` param + `query.eq("category", params.category)` filter.
  - **`lib/actions/assignments.ts`** `getMyTasks`: added `category?: string` param, included `category` in the joined `tasks!inner(...)` SELECT so the row carries the value to the client, and filter via `query.eq("tasks.category", params.category)` (PostgREST relation-qualified filter).
  - **`hooks/use-tasks.ts`**: extended `useTasks` + `useMyTasks` type signatures with `category?: string`.
  - **`components/shared/tasks-view.tsx`**:
    - Added `CATEGORY_CHIPS` constant + `<CategoryChips value onChange>` component — horizontal-scroll pill row with the active pill using the brand purple→pink gradient (`bg-gradient-to-r from-primary to-accent text-white shadow-primary/25`), inactive using `bg-muted/60`. Mobile edge-bleeds via `-mx-4` like the existing tab pills.
    - Mounted `<CategoryChips />` at the top of all three tabs (DoableTasksTab, MyTasksTab, ManageTasksTab); each tab owns its own `category` state and passes it into the hook call. Page resets to 1 on chip change.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean.
  - `pnpm exec eslint <changed files>` — 1 pre-existing warning (`cancelRemainingAssignments` unused-var, not introduced).
  - Dev server `GET /tasks` → 307 redirect to login (expected); `GET /` → 200.
- **Files touched:** `lib/actions/tasks.ts`, `lib/actions/assignments.ts`, `hooks/use-tasks.ts`, `components/shared/tasks-view.tsx`.
- **State:** Complete. The full migration-051 vertical (DB → types → constants → server action zod schema → server actions → hooks → admin Create form → worker grid) is now wired end-to-end.
- **Next step:** Awaiting user signal. Remaining UI work from the Entry #13/#14 menu: task-form watch-time tiers + music play tracking sections, credit pricing reference card, or any new direction the user picks.

---

### Entry #14 · Admin reverse panel for music auto-approvals
- **User prompt:** "next" (after Entry #13; user picked "Admin reverse panel" via AskUserQuestion)
- **Intent:** Surface the backend wiring from Entry #13 (RPC + server action + hook) on the admin UI so reversals are a single click instead of a hand-rolled DB call.
- **Done:**
  - **`components/shared/auto-approve-reverse-panel.tsx`** (new, ~160 lines):
    - Uses `useReversibleAutoApprovedItems({ pageSize: 25 })` + `useReverseAutoApprovedItem()` hooks.
    - Empty state: returns `null` — the panel disappears when there's nothing to reverse, keeping `/audit` clean during quiet periods.
    - List row layout (TaskMOS primitives only): avatar circle with `getInitials`, worker name + email fallback, task type slug + task id, `formatRelativeTime(auto_approved_at)`, points awarded badge, **live `Xh Ym left` countdown** (driven by a 60s `useNowTick` interval — no extra refetch traffic), Reverse button.
    - Reverse modal uses the existing `<Modal>` primitive: warning icon header, reason `<Textarea>` (≥3 char client guard) with inline `<FieldError>`, ghost Cancel + danger Reverse buttons. Wires `isLoading={reverse.isPending}` so double-clicks are no-ops.
    - Reason text flows to `reverseAutoApprovedItem(itemSubmissionId, reason)` → RPC → `recordAudit` audit-log row.
  - **`app/(dashboard)/audit/page.tsx`:** mounted `<AutoApproveReversePanel />` above the existing `<AuditLogView />`; wrapped the children in `space-y-6` for vertical spacing.
- **Verified:**
  - `pnpm exec tsc --noEmit` clean.
  - `pnpm exec eslint <changed files>` clean.
  - Dev server `GET /audit` → 307 redirect to login (expected — admin-only route).
- **Files touched:** `components/shared/auto-approve-reverse-panel.tsx` (new), `app/(dashboard)/audit/page.tsx`.
- **State:** Complete. Admin can now log in, hit `/audit`, see any music plays that auto-approved in the last 24h with a live countdown, click Reverse, enter a reason, and the worker is debited + the budget refunded + an audit-log entry is written. The panel hides itself when empty.
- **Visual test recommendation:** Log in as super_admin → `/audit`. Without any music auto-approvals, only the Audit Log card shows. To exercise the panel, the easiest path is a quick SQL insert simulating an auto-approve, or manually streaming a track through the MusicPlayLockModal as a regular user (which now auto-approves per Entry #13).
- **Next step:** Awaiting user signal. Remaining options from Entry #13's menu: (a) worker grid category filter chips on `/tasks` — quick win; (b) task-form watch-time tiers + music play tracking sections — bigger UI lift; (c) credit pricing reference card on task-form.
- **Notes:**
  - The 24h countdown uses `useNowTick(60_000)` — a single shared timer per panel mount, not per row. Negligible CPU.
  - I used `useReverseAutoApprovedItem` from the hook layer rather than calling the server action directly so the existing query-invalidation set fires (wallet, leaderboard, reversibles, pending reviews, task, tasks) — keeps the UI consistent post-reverse.
  - Empty-state hiding is intentional: an empty card with "no reversible auto-approvals" felt noisy on a page where the primary content is the full audit log already. If you want a "no recent auto-approvals (looking good!)" affirmation, easy 6-line change.

---

## 2026-05-24 · Session 1

### Entry #13 · Music auto-approve with 24h safety-net reverse
- **User prompt (Banglish):** "next" (after Entry #12; user picked "Auto-approve with safety net" via AskUserQuestion in Entry #11)
- **Intent:** Implement reference §7 requirement #5 (auto-approve music plays on MusicPlayLockModal completion). Per user's "with safety net" choice — admin can reverse within 24h if fraud is suspected.
- **Done:**
  - **Migration `supabase/migrations/052_music_auto_approve.sql`** (new):
    - Added 4 columns to `assignment_item_submissions`: `auto_approved_at`, `auto_approve_reversed_at`, `auto_approve_reversed_by` (FK → users), `auto_approve_reverse_reason`.
    - Partial index `idx_aim_auto_approve_pending_reverse` on `auto_approved_at` filtered to `auto_approve_reversed_at IS NULL` — fast lookup for the still-reversible queue.
    - RPC `reverse_auto_approved_item(item_submission_id, reviewer_id, reason)` returning `jsonb`. Refuses with structured codes (`not_found`, `not_auto_approved`, `already_reversed`, `window_expired`). On success: flips item to `'rejected'`, debits worker (`profiles.total_points -= points_awarded`, decrements `tasks_completed`), refunds task budget (`tasks.points_spent -= points_awarded`), writes a `points_history` penalty row, AND rolls the parent `task_assignments` row back from `'approved'` if it had finalised on this item. All atomic in one transaction.
    - Fully idempotent (verified by running twice).
  - **`lib/actions/assignments.ts`:**
    - Imported `MUSIC_STREAM_SLUGS` + `recordAudit`.
    - Extended `submitItemProof`: after the existing `submit_item_proof_if_capacity` RPC succeeds, the function re-reads the joined `task_types.slug` (server-side, never trusts client). If the slug is in `MUSIC_STREAM_SLUGS`, it calls `approve_item_and_finalize` with the worker as reviewer, then stamps `auto_approved_at`. Admins get a different notification ("Music play auto-approved — credits issued automatically. Reversible within 24h.") rather than the "Review Needed" admin queue notification. If auto-approve RPC fails the function falls through to the standard admin-review notification so the item never gets stuck.
    - New action `reverseAutoApprovedItem(itemSubmissionId, reason)`: staff-only gate + reason ≥ 3 chars + calls the RPC + writes an `admin_audit_log` row via `recordAudit(action="reject_task", target="task", metadata={auto_approve_reversed: true, reason})`.
    - New action `getReversibleAutoApprovedItems(params)`: staff-only paginated list of items where `auto_approved_at IS NOT NULL AND auto_approve_reversed_at IS NULL AND auto_approved_at >= now - 24h`. Joins task_bundle_items + task_types + task_assignments + users for display.
  - **`hooks/use-tasks.ts`:**
    - Imported the new server actions.
    - Added `useReversibleAutoApprovedItems(params)` (60 s refetch interval) and `useReverseAutoApprovedItem()` mutation. The mutation invalidates wallet, leaderboard, reversible-auto-approved, pending-reviews, task, tasks query keys on success.
  - **Verified:**
    - Migration applied + idempotent re-run (4 columns, 1 index, 1 RPC confirmed present).
    - `pnpm exec tsc --noEmit` clean (after one type-cast fix on the Supabase joined-relation select in `getReversibleAutoApprovedItems`).
    - `pnpm exec eslint` clean (1 pre-existing unused-import warning on `cancelRemainingAssignments`, not introduced by this change).
    - Dev server `GET /` → 200 in 1.29 s; `GET /login` → 200 in 728 ms.
- **Files touched:** `supabase/migrations/052_music_auto_approve.sql` (new), `lib/actions/assignments.ts`, `hooks/use-tasks.ts`.
- **State:** Complete on the backend + hook layer. Worker submitting a music play through MusicPlayLockModal will now see instant credit (no admin queue). The admin reverse path is functional but **not yet exposed in any UI** — admins can call it via the hook from a custom panel, but there's no /audit page that lists reversible items yet.
- **Next step:** Build a small admin panel that lists reversible auto-approvals + a "Reverse" button + reason modal. Natural fit on the existing /audit page (or a new /audit/auto-approvals route). Wait for user signal.
- **Notes:**
  - **Risk acknowledged:** workers who game the 30 s timer + screenshot get instant credit until an admin spots it and reverses. Demo accepts this; the 24 h safety window mitigates damage.
  - **Design decision:** the worker becomes their own `reviewed_by` in the existing approve RPC. The `auto_approved_at` timestamp is the canonical "was this auto?" signal — no behavioral change to the approve RPC itself (kept simple).
  - **Failure-mode handling:** if `approve_item_and_finalize` fails after submit, item stays in `'submitted'` and the standard admin-review path fires — no silent black hole.
  - **Budget refund correctness:** `tasks.points_spent` decrement uses `GREATEST(0, ...)` to guard against any drift; same for `profiles.tasks_completed`.
  - **Audit metadata:** I reused `recordAudit(action="reject_task")` since `AuditAction` is a typed union and adding `"auto_approve_reverse"` would widen the type elsewhere. The `metadata.auto_approve_reversed: true` flag makes the audit row unambiguous. If you want a typed `"auto_approve_reverse"` action, easy 2-line change in `lib/audit.ts`.

---

### Entry #12 · task-form: Bundle Category picker + platform-derived auto-suggest + action filter
- **User prompt:** "next" (after Entry #11; user picked "task-form bundle-mode toggle + category picker" via AskUserQuestion)
- **Intent:** Surface migration 051's `tasks.category` column on the admin Create Task form so admins can pick the bundle type, and so the action picker hides irrelevant rows (Engagement hides `create-*` slugs; Creation shows only those).
- **Done:**
  - **`components/shared/task-form.tsx`:**
    - Added `TaskCategory` type import; added `isCreationSlug(slug)` helper (regex match on `create-*`, `post-tweet`, `post-story`).
    - Added `PLATFORM_DEFAULT_CATEGORY` map — music platforms → `music`, review platforms → `review`, `google_maps` → `maps`, else `engagement`.
    - Added `CATEGORY_LABELS` map for human-readable dropdown options.
    - Added `category: "engagement"` to `useForm` defaults.
    - Added `watchCategory` via `useWatch`.
    - **Auto-suggest:** `handlePlatformChange` now reads the picked platform's slug from the platforms array and calls `setValue("category", PLATFORM_DEFAULT_CATEGORY[slug] ?? "engagement")`.
    - **UI:** Added a Category `<Select>` immediately after the Platform select in the Basic Info card, with all 6 enum values + explanatory helper text.
    - **Filter:** Wrapped the action picker's `taskTypes.map(...)` in an IIFE that first runs `filter()` keyed on `watchCategory` — engagement excludes creation slugs, creation includes only creation slugs, others show all. Empty-state fallback when no actions match.
  - The server-side wiring is already done (Entry #10 added `category` to `lib/actions/tasks.ts` zod schema and the existing `...taskFields` spread persists it).
- **Files touched:** `components/shared/task-form.tsx` (only).
- **Verification:**
  - `pnpm exec tsc --noEmit` clean.
  - `pnpm exec eslint task-form.tsx` — 1 pre-existing warning on line 99 (`watchItems` useMemo deps), NOT introduced by this change.
  - Dev server `/tasks/create` → 307 redirect to `/login?callbackUrl=/tasks/create` (expected — auth-gated).
- **State:** Complete. Visual verification recommended — admin should log in, hit `/tasks/create`, pick e.g. Spotify (expect auto-suggested → "Music Streaming") then YouTube (auto-suggested → "Engagement"), then switch category to Creation and confirm only `create-*` actions show.
- **Next step:** Per user's prior choice — implement auto-approve with safety net for music streams. That's the other half of Entry #11's open decision.
- **Notes:**
  - Did NOT add a "Bundle Type" toggle (engagement vs creation) as a separate UI element — the Category dropdown already covers both modes plus 4 more (review, music, maps, other). A toggle would be redundant. If user wants the demo's explicit two-button toggle, easy 30-line addition.
  - The filter is forgiving on review/music/maps/other — shows all task_types so admins can mix engagement actions into a music or review bundle (e.g. follow-artist on a Spotify bundle that's primarily streaming).

---

### Entry #11 · MusicPlayLockModal audit + body-scroll-lock + window-blur defense
- **User prompt (Banglish):** "next"
- **Intent:** Continue per Entry #10 next-step note. Verify `MusicPlayLockModal` meets reference §7's 5-point spec; patch any safe gaps.
- **Audit result (vs reference §7):**
  1. Full UI lock → `fixed inset-0 z-[100] bg-black/95` overlay ✅; **body scroll was NOT locked** — fixed.
  2. Visible countdown → linear progress bar + mm:ss counter ✅ (linear vs the demo's "ring" is OK per §26 — TaskMOS uses linear elsewhere).
  3. Background audio → iframe embeds ✅.
  4. Tab-switch defense → `visibilitychange` listener ✅; **window `blur` event NOT handled** — fixed (worker could lose focus by clicking another app without minimizing tab).
  5. Auto-approve + screenshot + immediate credit → screenshot capture via html2canvas + `/api/upload` POST ✅; **auto-approve NOT wired** — caller currently sets status to `'submitted'` (admin review queue) instead of `'approved'`. **Flagged for user decision** — wallet-affecting, deferred.
- **Done:**
  - `components/shared/music-play-lock-modal.tsx`:
    - Added `window.blur` listener alongside `visibilitychange`; refactored into shared `reset(reason)` helper so both signals reset the counter and show a context-specific warning.
    - Added body-scroll-lock effect (`document.body.style.overflow = "hidden"` while open; restored on unmount).
  - Verified: `pnpm exec tsc --noEmit` clean, `pnpm exec eslint <file>` clean, dev server `GET /login` HTTP 200 in 258 ms.
- **Files touched:** `components/shared/music-play-lock-modal.tsx`.
- **State:** Complete for safe-fix portion.
- **OPEN DECISION FOR USER — auto-approve flow for music streams:**
  - Reference §7 requires "auto-approves the play" on completion (no admin review). Current `submitItemProof` server action just sets status to `'submitted'` and queues for admin review.
  - To implement: either a new server action `submitMusicAutoApprove(itemSubmissionId, screenshotUrl)` OR a flag on `submitItemProof` that, when the joined `task_type.slug` is in MUSIC_STREAM_SLUGS, immediately sets status=`'approved'` and triggers the existing `on_assignment_approved` wallet credit path.
  - **Risk:** No real verification beyond the 30 s timer + iframe play + screenshot. A worker who games the modal earns credits without truly listening. Demo accepts this trade-off; ask user.
  - **My recommendation:** New server action with strict server-side guard (re-reads `task_types.slug` from DB, only auto-approves if it's in a server-side MUSIC_AUTO_APPROVE_SLUGS set) — keeps the existing submitItemProof code path untouched for everything else.
- **Next step (if user approves auto-approve):** New server action + small caller change in task-detail.tsx + possibly a migration 052 to log the auto-approval source. If user declines: skip and move on to bigger UI work (task-form bundle-mode toggle, watch-time tiers section, credit-pricing reference card).

---

### Entry #10 · Add missing platforms + tasks.category + content-creation task_types
- **User prompt (Banglish):** "missing gulo ei platform a add kore felo"
- **Intent:** Implement the gaps identified in `references/taskmos-demo-bundle-system.md` §19–§20 — the demo introduces 4 platforms and many content-creation / niche-engagement task_types that the live DB doesn't have, and the worker grid needs a `category` column on `tasks` for filter chips.
- **Scope (confirmed via AskUserQuestion):** All-at-once + `tasks.category` explicit column + defer multi-select `proof_types[]`.
- **Done:**
  - **Migration `supabase/migrations/051_categories_and_missing_platforms.sql`** (new):
    - Added `tasks.category TEXT NOT NULL DEFAULT 'engagement'` + named CHECK constraint (`engagement|creation|review|music|maps|other`) + `idx_tasks_category`. Backfill via JOIN on platform/task_type slugs.
    - Inserted 4 platforms (`threads`, `quora`, `google_maps`, `website`) at display_order 26-29.
    - Inserted ~50 new task_types: full sets for the 4 new platforms (25 rows) + missing distinctive actions on 9 existing platforms (Instagram, Facebook, Twitter, YouTube, TikTok, LinkedIn, Pinterest, Reddit, SoundCloud — 25 rows).
    - Fully idempotent: `ADD COLUMN IF NOT EXISTS`, named-constraint guard via `pg_constraint` lookup, `ON CONFLICT (slug) DO NOTHING` on platforms, `ON CONFLICT (platform_id, slug) DO NOTHING` on task_types.
  - **`types/database.ts`**: added `TaskCategory` union + `Task.category` field.
  - **`types/index.ts`**: added optional `category?: TaskCategory` to `TaskFormData`.
  - **`lib/constants/platforms.ts`**: added Threads, Quora, Google Maps, Website to `PLATFORM_CONFIG` with lucide icon names.
  - **`lib/content-task-types.ts`**: extended `CONTENT_TASK_TYPE_PATTERNS` (added `answer`, `thread`, `article`, `duet`, `playlist`, `board`, `cross-post`) and significantly expanded `NEVER_CONTENT` so engagement slugs like `like-pin`, `like-thread`, `watch-reel`, `keep-post-live`, `bookmark-tweet`, `repost-thread`, `share-to-story`, etc. correctly skip the AI-prompt field.
  - **`lib/actions/tasks.ts`**: extended `taskSchema` zod to accept optional `category` (default `'engagement'`). The existing `...taskFields` spread into the INSERT statement picks it up automatically.
  - **Applied migration locally**, then **re-ran** to confirm idempotency (counts unchanged: 29 platforms, 189 task_types).
  - **Verified backfill correctness**: all 18 existing tasks are social platforms with engagement task_types and correctly resolved to `category='engagement'`.
  - **Verified compile/lint**: `pnpm exec tsc --noEmit` clean (no output); `pnpm exec eslint <changed-files>` clean.
  - **Smoke-tested**: dev server `GET /` → 200 in 1.07s; `GET /login` → 200 in 0.47s.
- **Files touched:** `supabase/migrations/051_categories_and_missing_platforms.sql` (new), `types/database.ts`, `types/index.ts`, `lib/constants/platforms.ts`, `lib/content-task-types.ts`, `lib/actions/tasks.ts`.
- **State:** Complete. Schema, types, constants, and validation now match the demo's platform + action vocabulary. The admin Create Task form will now expose the 4 new platforms + their task_types automatically (it reads from DB).
- **Next step:** The UI itself (bundle-type toggle, per-action admin content fields, watch-time tiers, music-play-lock spec verification, credit-pricing reference card) is still legacy — those are the next batch of changes per reference §20.3 ("Server actions & UI" gap). Wait for user to ask for any of these.
- **Notes:**
  - **Deferred** per user choice: multi-select `proof_types[]` array on `task_bundle_items`. Current single `proof_type` enum stays. If the user later wants multi-proof, that's a separate migration.
  - **Deferred** intentionally: small "metadata helper" task_types (caption, hashtag, mention, tag, media, link, keep-live) as separate bundle items. The demo treats them as 2-5 cr line items. They can be captured via `task_bundle_items.item_data` JSONB on the parent create-* action for now. If user wants them as discrete clickable items, easy follow-up migration 052.
  - **Worker Tier (Gold/Silver/Platinum)** and **Withdraw** + **Service fee** + **auto-verify cron** for `keep-post-live` — these are demo features NOT implemented yet; called out as open questions in reference §23. Wait for user.

---

### Entry #9 · Reference notes: bundle-system demo HTML
- **User prompt (Banglish):** "amar ei HTML file ta shudhu read kore note rakhun" (with `taskmos-demo (2).html` attached — ~1700-line self-contained HTML)
- **Intent:** User shared a comprehensive UI demo of a Group Task Bundle system as a reference. They want me to *read it now and store notes only* — no implementation yet. Future requests will say "ai feature ta baniye den" and refer back to this reference.
- **Done:**
  - Created `references/` directory at project root for external reference docs.
  - Wrote `references/taskmos-demo-bundle-system.md` (23 sections, ~30 KB) — behavior-only extract per phnote.md §26. Captures: feature inventory (43 example bundles), 27 platforms across 4 categories (social/music/reviews/local), engagement vs content-creation bundle modes, complete action library with default credits, music play lock spec (critical developer note from the demo), YouTube/Facebook watch-time tier system, admin content fields per action, worker bundle modal flow, admin review queue flow, admin create form layout, edit campaign flow, mapping of every demo concept to existing TaskMOS DB tables/columns (with ✅/⚠️ status), gap list of what TaskMOS still needs (new migrations, server actions, UI extensions), and open questions for the user before implementation (worker tier, withdrawal, multi-select proof types, auto-verification cron, service fee).
  - Explicitly did NOT save the raw HTML (avoid 75 KB redundancy; user has the file).
  - Did NOT extract any styling: lime/dark palette, Bricolage Grotesque/Geist/Hind Siliguri fonts, Tailwind CDN, custom `.surface`/`.chip`/`.btn-primary` classes, inline SVG icons — all called out as "out of scope" in §22 of the notes per phnote.md §26.
- **Files touched:** `references/taskmos-demo-bundle-system.md` (new), `references/` (new dir).
- **State:** Complete. Reference is now durable. Future "implement this feature" prompts can reference the notes directly.
- **Next step:** Awaiting user's first implementation request from this reference. Most natural starting points based on the gap analysis: (a) add missing platforms — Threads, Quora, Google Maps — via new migration 051; (b) audit `task_types` for content-creation slugs and add what's missing; (c) verify `MusicPlayLockModal` covers all 5 lock requirements from §7 of the notes.
- **Notes for next session:** Before any implementation, ask the open questions in §23 of the notes — esp. (1) bundle category column? (2) multi-select proof types? (3) worker tier / withdraw / auto-verify scope?

---

### Entry #8 · Fix: auth-page logo "Task" invisible on dark gradient
- **User prompt (Banglish):** "http://localhost:3001/login ei page a taskmos er logo ta dark background a black color task hoye ache Task ta white kore deo"
- **Intent:** On the login page, the TaskMOS logo's "Task" wordmark was rendering in near-black (`text-foreground` = `#0A0A0A`) on the auth layout's branded purple/dark gradient — visually invisible. Make "Task" white on the auth page.
- **Root cause:** `components/shared/logo.tsx` hardcoded the wordmark color to `text-foreground`. The auth layout (`app/(auth)/layout.tsx`) overlays a purple-tinted gradient + blur effects that render dark even in light mode — `text-foreground` doesn't have enough contrast there.
- **Done:**
  - Added a new optional `wordmarkClassName` prop to `Logo` (default `"text-foreground"` so all existing callers — dashboard sidebar, mobile nav, landing navbar — keep current behaviour).
  - `app/(auth)/layout.tsx`: passed `wordmarkClassName="text-white"` to the Logo + inline comment explaining why.
  - Verified via headless Chrome screenshot of `/login` — "Task" now reads white, "MOS" keeps gradient.
- **Files touched:** `components/shared/logo.tsx`, `app/(auth)/layout.tsx`.
- **State:** Complete. Dev server (background id `bez5n65kz`) hot-reloaded the change. Other Logo call sites unaffected.
- **Next step:** None.
- **Notes:** IDE flagged 8 pre-existing Tailwind v4 canonical-class warnings on the auth layout (`bg-gradient-to-br` → `bg-linear-to-br`, arbitrary `w-[400px]` → `w-100`, etc.). Not introduced by this fix; leaving them per the "no surrounding cleanup on a bug fix" rule (AGENTS.md). If the user wants a sweep, log a separate request.

---

### Entry #7 · Dev server started
- **User prompt (Banglish):** "ei platform ta run koro"
- **Intent:** Launch the Next.js dev server and confirm the app boots.
- **Done:**
  - Detected port 3000 occupied by another project ("BlogForge Admin", PID 18832).
  - Started `pnpm dev` in background (bash id `bez5n65kz`); Next.js auto-fell back to port 3001.
  - Verified ready signal in dev output; smoke-tested `GET /` → HTTP 200, `<title>TaskMOS — Grow Your Social Media 100% Organically</title>`.
- **Files touched:** none (runtime only).
- **State:** Complete. Dev server live at **http://localhost:3001** (network: `http://192.168.68.204:3001`). Turbopack on, `optimizeCss` experiment active.
- **Next step:** None on its own. If user wants to stop the server, kill background id `bez5n65kz`.

---

### Entry #6 · Session-continuity logging set up
- **User prompt (Banglish):** "ji thik bolchen ei sob je apni korben eita note rakhun jodi vs code off hoye jay amk jnw abr apnk bujhaite na hoy, and ami ki ki prompt ditesi kon jayga pojonto kaj hoise hut kore laptop off hoye gele, jnw sob save thake and oi file dhore bolle jnw apni abr oi jayga thekei kaj shuru korte paren"
- **Intent:** Want a persistent session log so I never need to be re-briefed after a VS Code / laptop restart.
- **Done:**
  - Created `phlog.md` (this file) with header, usage rules, and seeded today's entries.
  - Added §28 to `phnote.md` documenting the log format + update rule.
  - Updated `AGENTS.md` to auto-load `phlog.md` and added rule #9 (must update after meaningful work).
  - Added memory entry `feedback-session-log.md` + updated `MEMORY.md` index.
- **Files touched:** `phlog.md` (new), `phnote.md`, `AGENTS.md`, `memory/feedback-session-log.md` (new), `memory/MEMORY.md`.
- **State:** Logging system active. Future sessions auto-load this file. I will append a new entry at the top after every non-trivial request.
- **Next step:** Awaiting first feature/update request from user. Apply the external-references rule (§26) when reference material arrives.

---

### Entry #5 · External-references rule set up
- **User prompt (Banglish):** "sapni ja kaj korben ei code ei platform ei color sob kisu ei platform onujai hobe ami onk code, screenshot onk kisu provide korbo r bolbo eitar moto function koren, apni shudhu ui ta dekhben kivabe korse sheta amr ei platform er onujai baniye diben"
- **Intent:** When user shares external references (screenshots/code/sites), I should only extract behavior — never copy colors, libraries, fonts, icons, or class names. Implementation must always use TaskMOS's design system.
- **Done:**
  - Added §26 to `phnote.md` — full rule with: extract list, never-copy list, TaskMOS design vocabulary table, color token table, translation workflow (Look → Map → Plan → Build), good/anti-example.
  - Added rule #8 to `AGENTS.md` hard-rules block.
  - Saved memory entry `feedback-external-references.md` and indexed it in `MEMORY.md`.
- **Files touched:** `phnote.md`, `AGENTS.md`, `memory/feedback-external-references.md` (new), `memory/MEMORY.md`.
- **State:** Rule active. Confirmed back to user.
- **Next step:** Apply on first reference user provides — confirm understanding first, then map to TaskMOS primitives, then build.

---

### Entry #4 · Workflow & safety setup
- **User prompt (Banglish):** "ei platform a onk kisu update korbo, sob jnw optimize way te kaj kore DB shoho, ager kono function a jnw kono kisu issue na hoy jeita change korboi oireleted sob jaygay jnw kaj kore, ei platform a new kisu feature niye asbo and ager feature gula update korbo so oivabe eita set kore felun"
- **User choices (via AskUserQuestion):**
  - Setup location → `phnote.md` (everything in this file)
  - DB policy → Always new migration file (frozen 001–050, next is 051)
  - Approval flow → Big work = plan first, small work = direct
- **Done:**
  - Added §21–§26 to `phnote.md`:
    - §21 Development Workflow & Safety Rules (10 golden rules + plan-vs-direct + perf/security defaults + verification)
    - §22 Change-Impact Cheat Sheet (10 matrices: DB column / role / server action / route / email / notification / plan field / points action / task type)
    - §23 DB Migration Policy (frozen migrations, idempotent skeleton, forbidden patterns)
    - §24 New Feature Checklist (8 phases)
    - §25 Update-Existing-Feature Checklist (locate consumers → compat → wallet/RBAC safety → perf regression)
  - Replaced `AGENTS.md` 1-liner with `@phnote.md` auto-import + 7 hard rules.
  - Created memory entries: `user-language-role`, `project-taskmos`, `feedback-db-migration-policy`, `feedback-plan-first-criteria`, `reference-workflow-doc`, plus `MEMORY.md` index.
- **Files touched:** `phnote.md`, `AGENTS.md`, `memory/MEMORY.md` (new), `memory/user-language-role.md` (new), `memory/project-taskmos.md` (new), `memory/feedback-db-migration-policy.md` (new), `memory/feedback-plan-first-criteria.md` (new), `memory/reference-workflow-doc.md` (new).
- **State:** Workflow rules active. Plan-first triggers, DB policy, change-impact map all loaded.
- **Next step:** None on its own — sets the stage for future feature work.

---

### Entry #3 · Initial phnote.md (project tour)
- **User prompt (Banglish):** "code gula read korun sob and amr jonno ekta phnote.md file create kore eikhane update korun sob"
- **Intent:** Read the whole codebase and produce a comprehensive project notes file.
- **Done:**
  - Read root config files (auth.ts, proxy.ts, next.config.ts, tsconfig, package.json, env, supabase client).
  - Read all 21 server actions in `lib/actions/`.
  - Read all 12 hooks in `hooks/`.
  - Read types (`database.ts`, `index.ts`, `next-auth.d.ts`).
  - Sampled key migrations (001, 002, 003, 006, 017, 026, 046).
  - Sampled providers, sidebar, dashboard page, scripts.
  - Wrote `phnote.md` with 20 sections covering: product overview, tech stack, directory map, auth & RBAC, server actions, UI components, hooks, DB schema, subscription/quota logic, task bundles, points wallet, payments, SEO/perf, uploads, email, env, quirks, scripts, git state, quick reference.
- **Files touched:** `phnote.md` (new).
- **State:** Project tour complete. Ready for ongoing development.
- **Next step:** None on its own.

---

### Entry #1–#2 · Session start (no log entries)
- Initial system briefing + project context loaded. No user requests yet.

---
