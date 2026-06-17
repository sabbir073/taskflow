# TaskMOS (Taskflow) — Project Notes

> Comprehensive code-tour of the repository at `d:/Taskmos/taskflow`.
> Generated: 2026-05-24.

---

## 1. Product Overview

**TaskMOS** ("Social Media Task Exchange Platform" / "Organic Social Media Growth")
is a Next.js + Supabase web app where users earn points by engaging with other
creators' content (likes, shares, comments, music streams, business reviews, etc.)
and spend those points to create their own engagement tasks.

- Brand: **TaskMOS** — taglines around "100% organic growth", "real humans, no bots".
- Pricing: Free + paid plans (monthly / half-yearly / yearly) with **point packages**
  available as separate top-ups.
- Currencies: USD + BDT (with USD→BDT conversion rate stored in settings).
- Payment model: **manual** payment submission (bKash / Nagad / bank / crypto)
  reviewed by staff → subscription / points / signup credits activated on approval.

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Framework | **Next.js 16.2.2** (App Router) — branded "NOT the Next.js you know" in AGENTS.md |
| React | 19.2.4 |
| Auth | **NextAuth v5 (beta.30)** — Credentials provider, JWT sessions (24h) |
| DB / BaaS | **Supabase** (Postgres via `@supabase/supabase-js`, service role used server-side) |
| ORM | None — raw `.from()` queries + RPCs |
| State | **TanStack Query v5** (with devtools dynamically loaded only in dev) |
| Styling | **Tailwind v4** + custom CSS variables, dark mode via `next-themes` |
| UI Primitives | Custom in `components/ui/` (Card, Btn, Badge, Input, Modal, etc.). HeroUI provider is a no-op shim. |
| Rich text | **Tiptap v3** (image, link, table, color, highlight, subscript, superscript, text-align, underline, youtube, placeholder) |
| Forms | `react-hook-form` + `@hookform/resolvers` + `zod` |
| File uploads | **AWS S3** via `@aws-sdk/lib-storage` (multipart), served through **CloudFront** |
| Animation | `framer-motion` |
| Charts | `recharts` |
| PDF | `jspdf` + `html2canvas` (invoice generation, both client + server) |
| Email | `nodemailer` (best-effort, silently disabled if SMTP env missing) |
| Sanitisation | `isomorphic-dompurify` |
| Toasts | `sonner` |
| Date | `date-fns` |
| Crypto | `bcryptjs`, native `crypto.randomUUID()` |
| Validation | `zod` everywhere |
| Package mgr | **pnpm** (workspace, browserslist target: chrome ≥100 / edge ≥100 / firefox ≥100 / safari ≥15.4) |

### Project commands

```
pnpm dev      # next dev
pnpm build    # next build
pnpm start    # next start
pnpm lint     # eslint
pnpm exec node scripts/run-migrations.mjs        # run all SQL migrations against DIRECT_URL
pnpm exec node scripts/create-moderator.mjs ...  # provision moderator account
pnpm exec node scripts/seed-dummy-data.mjs       # seed fake data
```

---

## 3. Directory Map

```
taskflow/
├─ app/                          # Next.js App Router
│  ├─ layout.tsx                 # Root layout, SEO metadata, Organization JSON-LD, viewport themeColor
│  ├─ globals.css                # Tailwind v4 + tokens
│  ├─ error.tsx / not-found.tsx
│  ├─ icon.svg / apple-icon.tsx / opengraph-image.tsx / twitter-image.tsx
│  ├─ robots.ts / sitemap.ts
│  ├─ (auth)/                    # logged-OUT route group
│  │  ├─ layout.tsx              # gradient-bg + logo wrapper
│  │  ├─ login / register / forgot-password / reset-password (via /api/auth)
│  ├─ (marketing)/               # public marketing site
│  │  ├─ layout.tsx              # Navbar + PopupDisplay("website") + Footer
│  │  ├─ page.tsx                # Hero, Platforms, HowItWorks, Features, Benefits,
│  │  │                          # Pricing, Testimonials, FAQ, About, CTA, Contact (dynamic-imported below fold)
│  │  ├─ help / community / status / terms / privacy / refund / cookies
│  ├─ (dashboard)/               # logged-IN app
│  │  ├─ layout.tsx              # Sidebar + Header + BottomNav + StatusWatcher + PopupDisplay("dashboard")
│  │  ├─ dashboard/              # main dashboard (admin vs user stats branches)
│  │  ├─ tasks/                  # list + create + [id] + [id]/edit
│  │  ├─ groups/                 # list + create + [id]
│  │  ├─ billing/ + [id]         # user invoices
│  │  ├─ plans/                  # plan picker + my subscription
│  │  ├─ payments/               # admin payment review + plan/package CRUD
│  │  ├─ users/                  # admin user management
│  │  ├─ notices/ broadcast/ contact-messages/  # staff comms
│  │  ├─ popups/                 # admin popup CRUD
│  │  ├─ landing-editor/         # admin-only landing-content CMS
│  │  ├─ settings/               # admin-only system settings
│  │  ├─ audit/                  # admin-only audit log
│  │  ├─ appeals/                # admin-only suspension appeals review
│  │  ├─ support/ + [id]         # support tickets
│  │  ├─ leaderboard/ reports/ notifications/ profile/
│  ├─ suspended/                 # standalone page outside dashboard layout
│  └─ api/
│     ├─ auth/[...nextauth]/route.ts  # next-auth handlers
│     ├─ auth/verify/route.ts         # email verification redirect
│     └─ upload/route.ts              # S3 upload (auth-gated)
│
├─ auth.ts                       # NextAuth config (Credentials, JWT 24h, role/status callbacks)
├─ proxy.ts                      # Edge middleware: public/auth/admin/staff path gating, RBAC
├─ next.config.ts                # Image remotePatterns, optimizePackageImports, optimizeCss
├─ components/
│  ├─ providers/                 # Session, Query, Theme, HeroUI(no-op), Settings, Providers index
│  ├─ layout/                    # Sidebar, Header, BottomNav, MobileNav, Breadcrumbs
│  ├─ landing/                   # Hero, Platforms, HowItWorks, Features, Benefits, Pricing, FAQ,
│  │                             # Testimonials, About, Contact, CTA, Navbar, Footer, Logo, LegalLayout
│  ├─ shared/                    # ~50 page-level views and modals (see §6)
│  └─ ui/                        # Btn, Card, Input, Select, Textarea, Badge, Modal, IconInput, etc.
│
├─ hooks/                        # 12 TanStack-Query hook bundles (see §7)
│
├─ lib/
│  ├─ actions/                   # 21 server-action modules (see §5)
│  ├─ constants/                 # roles + permissions matrix, platform configs, pagination/upload limits
│  ├─ db/supabase.ts             # singleton server client (service role)
│  ├─ s3/{client,upload}.ts      # S3 client + multipart upload + key generation
│  ├─ pdf/invoice.ts             # shared jsPDF invoice builder (client + server)
│  ├─ audit.ts                   # recordAudit() fire-and-forget
│  ├─ auth-helpers.ts            # getCurrentUser, requireAuth, requireActiveUser, requireRole, checkPermission
│  ├─ subscription-check.ts      # subscription gate, quota calc, lifecycle notifications, carry-over
│  ├─ rate-limit.ts              # in-memory token-bucket rate limiter
│  ├─ email.ts                   # 26 KB of templated transactional emails
│  ├─ env.ts                     # zod-validated env schema (throws at boot)
│  ├─ utils.ts                   # cn, formatDate, formatRelativeTime, slugify, parseFeatures, escapePgLikeOr
│  ├─ currency.ts                # USD↔BDT conversion, period multiplier, expires_at compute
│  ├─ content-task-types.ts      # taskTypeNeedsAiPrompt(slug)
│  └─ landing-content.ts         # static FAQ list (shared between RSC + client)
│
├─ types/
│  ├─ database.ts                # Row interfaces matching Postgres tables
│  ├─ index.ts                   # API/form/dashboard helper types
│  └─ next-auth.d.ts             # Session/JWT augmentation (role, status, is_approved)
│
├─ supabase/migrations/          # 50 sequential SQL migrations (001 → 050)
├─ scripts/                      # run-migrations / create-moderator / seed-dummy-data
├─ public/landing/avatars/       # static landing-page testimonial avatars
├─ AGENTS.md                     # "NOT the Next.js you know — read node_modules/next docs"
├─ CLAUDE.md                     # imports AGENTS.md
├─ README.md                     # vanilla create-next-app boilerplate (unmodified)
└─ .env.local                    # secrets (not in version control)
```

---

## 4. Authentication & Authorization

### 4.1 Auth flow ([auth.ts](auth.ts))

- **Provider**: `Credentials` only (email + password, bcrypt-compared).
- **Session strategy**: JWT, `maxAge = 24h`.
- **Sign-in pages**: `/login` (also error page).
- **Rate limits on `authorize()`**:
  - 5 attempts per email per 15 min
  - 20 attempts per IP per 15 min
  - Returns `null` (generic auth error) on rate-limit hit — never reveals throttle state.
- **JWT callback** populates `role`, `status`, `is_approved` from `profiles` on first sign-in.
  Supports `useSession().update({ name, image })` to push profile changes into the JWT without re-login.
- **Session callback** forwards `id/role/status/is_approved/image` to `session.user`.
- **Redirect callback** restricts to same-origin, defaults to `/dashboard`.

### 4.2 Proxy / middleware ([proxy.ts](proxy.ts))

- Path categories:
  - **publicPaths**: `/`, `/help`, `/community`, `/status`, `/terms`, `/privacy`, `/refund`, `/cookies`
  - **authPaths**: `/login`, `/register`, `/forgot-password`, `/reset-password`
  - **adminOnlyPaths** (super_admin + admin only): `/settings`, `/landing-editor`, `/audit`, `/popups`, `/appeals`
  - **staffOnlyPaths** (super_admin + admin + moderator): `/users`, `/notices`, `/broadcast`, `/payments`, `/contact-messages`, `/support`
- Static asset regex avoids the previous `pathname.includes(".")` permissive bug.
- **Banned** users redirected to `/login?error=AccountBlocked`.
- **Pending-approval** users redirected to `/login?error=PendingApproval`.
- Note: middleware uses JWT cache (24h) — `/suspended` vs `/dashboard` routing is enforced by **fresh DB checks** in the dashboard layout + suspended page, not the proxy. This is to avoid infinite loops.

### 4.3 Roles & permissions ([lib/constants/roles.ts](lib/constants/roles.ts))

```
ROLE_HIERARCHY:
  super_admin (5) > admin (4) > moderator (3) > group_leader (2) > user (1)

Groupings:
  ADMIN_ROLES = ["super_admin", "admin"]
  STAFF_ROLES = ["super_admin", "admin", "moderator"]

Predicates:
  isAdminRole(role) / isStaffRole(role)
```

Full PERMISSIONS matrix lives in `lib/constants/roles.ts` — examples:

| Permission | Roles allowed |
|---|---|
| `create_tasks`, `review_submissions`, `broadcast`, `approve_signup`, `manage_users`, `manage_payments`, `manage_notices`, `view_all_reports` | super_admin + admin + moderator |
| `system_settings`, `landing_page_edit`, `manage_appeals`, `manage_popups`, `manage_plans`, `view_audit` | **admin only** (moderator excluded) |
| `manage_groups` | super_admin + admin + moderator + group_leader |
| `view_dashboard`, `view_own_tasks`, `complete_tasks` | everyone |

### 4.4 Server-side auth helpers ([lib/auth-helpers.ts](lib/auth-helpers.ts))

- `getCurrentUser()` → `SessionUser | null`
- `requireAuth()` → blocks **banned** users, allows suspended (so they can hit /suspended).
- `requireActiveUser()` → also blocks **suspended** (used for mutations).
- `requireRole([...roles])` → role-list gate.
- `checkPermission(permission)` → permission-matrix gate.

### 4.5 Account-state lifecycle

- `status`: `active` → `suspended` → `banned` (and `reactivated` paths via admin).
- `is_approved` defaults true; new signups can require manual approval when
  the `require_user_approval` setting is on.
- Suspended users can submit an **appeal** (one active appeal at a time).
  Appeals review handled at `/appeals` (admin-only).
- Suspended users are routed to `/suspended` (outside the dashboard layout).
- Dashboard layout does a **fresh DB read** of role/status each request — JWT is
  cached 24h so this defeats a stale promotion / demotion / suspension.
- **Demoted-staff compensator**: if JWT still says privileged but DB says no, the
  layout forces a sign-out so the next session is minted with the correct role.

---

## 5. Server Actions (`lib/actions/`)

All files are `"use server"`. Patterns common to every action:
- `auth()` for session, then explicit role/permission check.
- `zod` schema validation on every input.
- `getServerClient()` (singleton, service-role) for DB.
- `recordAudit()` fire-and-forget on every privileged mutation (never blocks the action).
- `checkRate()` for write-heavy or attacker-prone actions.
- Returns `ApiResponse<T>` = `{ success: boolean; data?: T; error?: string; message?: string }`.

| File | Lines | Notable exports |
|---|---:|---|
| `analytics.ts` | 317 | `getAdminDashboardStats`, `getUserDashboardStats`, `getRecentActivity`, `getTopPerformers`, `getOverviewReport`, `getTasksByPlatform`, `getAssignmentStatusDistribution`, `getPointsOverTime`, `getUserGrowth`, `getCompletionTrend`, `getTopUsersReport`, `exportReportCSV` |
| `appeals.ts` | 260 | `getMyStatus`, `getMyLatestAppeal`, `submitAppeal`, `getAppeals`, `reviewAppeal` |
| `assignments.ts` | 637 | `getMyTasks`, `acceptTask`, `submitItemProof`, `submitProof` (legacy wrapper), `reviewItemSubmission`, `reviewAssignment` (legacy wrapper), `getPendingReviews`, `getMyAssignmentForTaskWithItems`, `getPendingItemReviews`, `getGroupTaskStatus` |
| `audit.ts` (action) | 59 | `getAuditLog(filters)` — paginated admin audit feed |
| `audit.ts` (lib) | 64 | `recordAudit(db, actorId, action, targetType, targetId, metadata)` — silent on failure |
| `auth.ts` | 448 | `registerUser` (with optional plan + payment), `verifyEmail`, `forgotPassword`, `getResetTokenStatus`, `resetPassword` — rate-limited |
| `broadcasts.ts` | 130 | `sendBroadcast(recipients, title, message)`, `listBroadcastRecipients(search)` |
| `contact.ts` | 232 | `submitContactForm`, `getContactSubmissions`, `getContactUnreadCount`, `updateContactStatus` (unread→read→archived), `deleteContactSubmission` |
| `exports.ts` | 155 | CSV exports: `exportUsersCsv`, `exportPaymentsCsv`, `exportPointsHistoryCsv` |
| `groups.ts` | 1038 | CRUD + approve/reject/suspend/unsuspend/request-deletion/cancel-deletion, members add/remove/transfer-leader, `getGroupTasks`, `getGroupStats`, `getGroupLeaderboard`, `handleLeaderRemoval` |
| `invoices.ts` | 175 | `getMyInvoices`, `getInvoiceById`, `getAllInvoices` (admin), `updateInvoiceStatus` |
| `notices.ts` | 115 | Notice board CRUD (admin) |
| `notifications.ts` | 108 | `getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`, `deleteNotification`, `createNotification` |
| `payments.ts` | 803 | Payment methods CRUD, point packages CRUD, `submitPayment`, `createSignupPayment`, `getMyPayments`, `getAllPayments`, `reviewPayment` (approve/reject + activates subscription / credits points) |
| `plans.ts` | 407 | `getPlans`, `getMySubscription`, `getMyQuotaUsage`, `getMySubscriptionStatus`, `subscribe`, `checkSubscriptionRequired`, plan CRUD, `adminAssignSubscription`, `getUserSubscription` |
| `platforms.ts` | 94 | `getPlatforms`, `getTaskTypesByPlatform`, `getAllTaskTypes`, `getAllPlatformsForAdmin`, `setPlatformActive` |
| `points.ts` | 237 | `getPointsHistory`, `awardDailyLoginBonus`, `getLeaderboard`, `getUserBadges`, `getAllBadges` |
| `popups.ts` | 123 | `getActivePopups("website" \| "dashboard")`, popup CRUD |
| `settings.ts` | 72 | `getSettings`, `getSettingsMap`, `updateSetting`, `getLandingContent`, `updateLandingContent` |
| `tasks.ts` | 873 | `createTask` (bundle-aware), `approveTask`, `rejectTask`, `updateTask`, `deleteTask`, `publishTask`, `getTasks`, `getTaskById`, `getPendingApprovalTasks` |
| `tickets.ts` | 369 | `getMyTicketAccess`, `createTicket`, `getMyTickets`, `getTicketById`, `replyToTicket`, `getAllTickets`, `updateTicketStatus` |
| `users.ts` | 795 | `getMyProfile`, `updateProfile`, `changePassword`, `getUsers`, `getUserById`, `updateUserRole`, `updateUserStatus`, `deleteUser`, `assignPoints`, `getMyBalance`, `approveUser`, `resendVerificationEmail`, `rejectUser`, `getPendingApprovalUsers` |

**Total**: ~7,400 lines of server actions across 21 modules.

---

## 6. UI Components

### 6.1 Providers ([components/providers/](components/providers/))

Wrapping order in `Providers` component:
`SessionProvider → QueryProvider → ThemeProvider → HeroUIAppProvider → children + <Toaster />`.

- **QueryProvider**: TanStack Query, staleTime 60s, retry 1, devtools only in dev (dynamically imported with `ssr:false`).
- **ThemeProvider**: `next-themes` with `attribute="class"`, default light, `enableSystem`.
- **SettingsProvider**: reads `AppSettings` from server, syncs CSS vars (`--primary`, `--accent`) and dark-mode default.
- **HeroUIAppProvider**: deliberate no-op shim (HeroUI v3 doesn't need a provider — kept for future use).

### 6.2 Layout ([components/layout/](components/layout/))

- `sidebar.tsx` — desktop nav, collapsible, permission-gated nav items, /support hidden when user has no ticket access, /plans hidden when subscription not required.
- `header.tsx`, `bottom-nav.tsx`, `mobile-nav.tsx`, `breadcrumbs.tsx`.

### 6.3 Landing ([components/landing/](components/landing/))

15 components — Hero, Platforms, HowItWorks, Features, Benefits, Pricing, Testimonials, FAQ, About, CTA, Contact, Navbar, Footer, Logo, LegalLayout.

Pricing component receives `initialPlans` (RSC pre-fetch) and refreshes via TanStack Query in the background so admin edits propagate within ~2 minutes.

### 6.4 Shared ([components/shared/](components/shared/))

~50 page-level views and modals. Highlights:

- **Tasks**: `tasks-view`, `task-form`, `task-edit-form`, `task-detail`, `task-approval-queue`, `manage-tasks-view`, `review-queue`.
- **Groups**: `groups-list`, `group-form`, `group-edit-form`, `group-detail`, `manage-groups-view`.
- **Payments**: `payments-admin`, `payment-submission-modal`, `invoice-detail-view`, `billing-view`.
- **Plans**: `plans-view`, `subscription-banner`.
- **Admin queues**: `users-table`, `appeals-manager`, `notices-manager`, `popups-manager`, `contact-messages-view`, `broadcast-view`, `audit-log-view`, `support-view`, `ticket-detail-view`, `reports-view`.
- **Editors**: `rich-text-editor` + `rich-text-content` (Tiptap), `image-upload-field`.
- **Auth forms**: `login-form`, `register-form`, `forgot-password-form`.
- **Modals**: `confirm-dialog`, `user-profile-modal`, `music-play-lock-modal` (fullscreen play-lock overlay for music streaming proof), `youtube-watch-modal`.
- **System UX**: `status-watcher` (polls user status), `dashboard-flash-toast`, `cookie-consent`, `popup-display`, `notice-board`, `subscription-banner`, `empty-state`, `item-gone`, `suspended-view`, `page-header`, `stat-card`, `notifications-list`, `leaderboard-view`, `dashboard-content`, `profile-view`, `settings-view`.

### 6.5 UI primitives ([components/ui/](components/ui/))

Custom TaskMOS primitives — `Card`, `CardHeader/Title/Description/Content/Footer`, `Input`, `Textarea`, `Select`, `Label`, `FieldError`, `Btn` (variants: primary/secondary/outline/ghost/danger × sm/md/lg, with `isLoading` spinner), `Badge` (default/primary/success/warning/error/accent), `Separator`, `IconInput`, `Modal` (re-exported from `./modal`).

---

## 7. Client Hooks ([hooks/](hooks/))

All TanStack-Query wrappers around server actions. Each mutation invalidates a known set of query keys and toasts via `sonner`.

| Hook file | Queries / mutations |
|---|---|
| `use-tasks.ts` | platforms, task types, tasks list, single task, my tasks, pending reviews, create/delete/publish/approve/reject task, accept task, submit proof (item + legacy), review item / assignment, my assignment with items |
| `use-groups.ts` | my groups, group, assignable groups, group tasks, CRUD + approve/reject/suspend/unsuspend/request-deletion/cancel-deletion, members, transfer leadership, notify-to-submit |
| `use-payments.ts` | payment methods CRUD, point packages CRUD, submit payment, my/all payments, review payment |
| `use-plans.ts` | plans list, my subscription, my quota usage, subscribe, plan CRUD, admin assign subscription |
| `use-users.ts` | users list, user detail, pending approvals, role/status updates, delete, assign points, my balance, approve/reject signup |
| `use-tickets.ts` | my ticket access, my tickets, ticket detail, create ticket, reply, all tickets (admin), update status |
| `use-invoices.ts` | my invoices, invoice detail, all invoices (admin), update status |
| `use-notices.ts` | active notices, all notices, CRUD |
| `use-popups.ts` | active popups, CRUD |
| `use-appeals.ts` | my status, my latest appeal, submit appeal, appeals list (admin), review appeal |
| `use-audit.ts` | audit log feed |
| `use-contact.ts` | submit contact form, contact submissions (admin), unread count, status update, delete |

Refetch intervals vary: 30s (payment methods, packages), 60s (my-tasks, my-groups, my-payments, group, assignable-groups).

---

## 8. Database (Supabase / Postgres)

### 8.1 Enums (migration 001 + extensions in 044, 049, etc.)

```
user_role           = super_admin | admin | moderator | group_leader | user
user_status         = active | suspended | banned
task_status         = draft | pending | in_progress | submitted | approved | rejected
task_priority       = low | medium | high
group_privacy       = public | private
recurring_type      = daily | weekly | monthly
proof_type          = url | screenshot | both | none   (none added in migration 043)
assignment_status   = pending | in_progress | submitted | approved | rejected | cancelled (021)
assignment_target   = all_users | group | individual
group_member_role   = leader | member
notification_type   = task_assigned | task_approved | task_rejected | points_earned
                       | badge_earned | group_invited | group_joined | system
points_action       = task_completed | task_rejected | daily_login | streak_bonus
                       | milestone | referral | badge_earned | penalty
```

### 8.2 Core tables

| Table | Purpose |
|---|---|
| `users` | Auth.js v5 schema — id, email, password_hash, email_verified, image, name, timestamps |
| `accounts` / `sessions` / `verification_tokens` | NextAuth/Supabase adapter tables (not actively used — Credentials + JWT) |
| `profiles` | role, status, is_approved, phone, total_points (DECIMAL 12,2 after migration 017), tasks_completed, streaks, social_links JSONB |
| `platforms` | 26 platforms seeded across social + music streaming + business-review categories (013, 019, 049) |
| `task_types` | per-platform action definitions with `required_fields` JSONB schema |
| `groups` | name, slug, description, rules, category, privacy, leader_id, max_members, avatar/cover URLs, approval_status (018, 024, 025) |
| `group_members` | many-to-many with `role` (leader/member) |
| `tasks` | extended in 017 with `point_budget`, `points_per_completion`, `points_spent`, `completion_bonus` (046), `approval_status`, `ai_prompt` (032), `images[]`, `urls[]` |
| `task_bundle_items` (046) | per-item: task_type_id, sort_order, points, proof_type, item_data JSONB, watch_duration_sec |
| `task_assignments` | one row per (task, user); status reflects bundle aggregate |
| `assignment_item_submissions` (046) | per-bundle-item proof + per-item admin verdict |
| `notifications` | per-user inbox, with `link` for click-through |
| `points_history` | every credit/debit, action enum, reference_type/_id |
| `badges` / `user_badges` | gamification |
| `plans` | name, price, period, features[], display_order, max_tasks, max_groups, included_credits |
| `user_subscriptions` | plan_id, period_type, starts_at, expires_at, carry_over_tasks/groups, notified_expiring_7d/1d/expired flags |
| `payment_methods` | bKash/Nagad/bank/crypto methods with QR codes, instructions, per-method currency |
| `point_packages` | top-up packages priced separately from subscriptions |
| `payments` | manual payment submissions — purpose: signup/subscription/points, status: pending/approved/rejected, transaction_id, review_notes, reviewed_by/at, invoice_number (033) |
| `suspension_appeals` (023) | one active appeal per user, status, admin response |
| `notices` (022) | global notice board entries |
| `popups` (031) | targeted popups (website vs dashboard) |
| `support_tickets` (030) | category, priority, status, ticket replies |
| `contact_submissions` (036) | public contact-form inbox — status: unread/read/archived |
| `admin_audit_log` (034) | actor_id, action, target_type/_id, metadata JSONB |
| `settings` / `landing_content` | KV settings store + landing-page section content |

### 8.3 Triggers, functions & RPCs

- `update_updated_at()` — generic timestamp trigger applied across all tables.
- `on_assignment_approved()` (017) — BEFORE UPDATE trigger; debits creator's points
  budget, credits worker, writes paired points_history rows, sets `points_awarded`.
- `submit_proof_atomic()` (041) — atomic proof submission with capacity check.
- `apply_rejection_penalty()` (038) — atomic 3-strikes rejection penalty.
- `adjust_points()` (035) — RPC with enum cast fix.
- `get_user_rank(p_user_id)` (039) — RPC using `RANK() OVER (...)` so rank computation
  doesn't pull every active profile over the wire.
- Bundle RPCs in 048 — submit_bundle_item, review_bundle_item, etc.
- Daily-login uniqueness constraint (040).
- RLS enabled on payment_methods, point_packages, payments (and others).

### 8.4 Notable migrations to know

| # | File | What it did |
|---:|---|---|
| 017 | `points_wallet_system.sql` | Switched all point columns to DECIMAL(12,2); added budget/per-completion/spent on tasks; added approval_status; rewrote approval trigger to do wallet accounting. |
| 019 | `platform_v2.sql` | Expanded platforms with display metadata. |
| 023 | `suspension_appeals.sql` | Appeals table. |
| 026 | `payments.sql` | payment_methods + point_packages + payments. |
| 027–029 | plans v2 + subscription tiers + subscription notifications | Multi-period subscriptions. |
| 030 | `support_tickets.sql` | Support inbox. |
| 031 | `popups.sql` | Targeted popups (website/dashboard). |
| 033 | `invoice_numbers.sql` | Stable invoice numbering. |
| 034 | `audit_quota_v3.sql` | admin_audit_log + quota tracking. |
| 038 | `rejection_penalty_atomic.sql` | 3-strike penalty. |
| 039 | `user_rank_rpc.sql` | get_user_rank RPC. |
| 041 | `submit_proof_atomic.sql` | Atomic proof submit with capacity. |
| 042 | `rebrand_taskmos.sql` | Rebranded from "Taskflow" → "TaskMOS". |
| 044 | `add_moderator_role.sql` | Added `moderator` to user_role enum. |
| 046 | `task_bundles.sql` | Introduced task_bundle_items + assignment_item_submissions. |
| 047 | `backfill_bundle_items.sql` | Backfilled pre-bundle tasks to 1-item bundles. |
| 048 | `bundle_rpcs.sql` | 15.6 KB of bundle-aware RPCs (largest single migration). |
| 049 | `platforms_music_review.sql` | 29.8 KB — added music + business-review platforms and their task types. |
| 050 | `image_field_type_rename.sql` | required_fields type rename for image arrays. |

---

## 9. Subscription & Quota System ([lib/subscription-check.ts](lib/subscription-check.ts))

- `checkActiveSubscription(db, userId)` — returns error string if `require_subscription`
  setting is on and the user has no active, non-expired subscription. Used as a gate
  on createTask / createGroup / etc.
- `getQuota(db, userId, "task" | "group")`:
  - Looks up active subscription, joins plan's `max_tasks` / `max_groups`.
  - `limit = plan.max_X * periodMultiplier(period_type) + carry_over_X`
  - `used = COUNT(table) WHERE created_by = userId AND created_at >= subscription.starts_at`
  - **Staff bypass all quotas** (`isStaffRole(role)`).
- `dispatchSubscriptionNotifications` — called from dashboard layout on every render.
  Idempotent via per-row flags. Race-safe: uses conditional UPDATE (`flagColumn = false`)
  and only the caller whose UPDATE returns a row proceeds to insert the notification
  and send the email. Fires at 7-day, 1-day, expired thresholds.
- `computeRemainingQuota` — at upgrade/renewal, stash leftover quota as
  `carry_over_tasks` / `carry_over_groups` on the new subscription row so the
  user doesn't lose unused capacity.

`periodMultiplier`: monthly=1, half_yearly=6, yearly=12.

---

## 10. Task Bundles (the big architectural shift)

Pre-migration 046, a Task was 1:1 with a `task_type`. Now every Task carries
N `task_bundle_items` (legacy single tasks were backfilled to 1-item bundles).

**Data shape**:
- `tasks` (1) ⟶ `task_bundle_items` (N): each item has its own task_type, points,
  proof_type, item_data JSONB, optional watch_duration_sec.
- `task_assignments` (1) ⟶ `assignment_item_submissions` (N): per-bundle-item proof
  + admin verdict.

**Assignment status semantics** (derived from children):
- `in_progress` — at least one item not yet submitted.
- `submitted` — all items submitted, awaiting review.
- `approved` — all items approved (this is when the **completion_bonus** pays).
- `rejected` — all items rejected (rejection penalty fires here).

**Workflow**:
1. Worker accepts → assignment + item submission rows created.
2. Worker submits per-item proof via `submitItemProof()` (legacy `submitProof` wrapper resolves to a specific item).
3. Admin reviews per-item via `reviewItemSubmission()` (legacy `reviewAssignment` wrapper).
4. When all items approved, completion_bonus credited.

The legacy single-task fields (`task_type_id`, `task_data`, `proof_type`,
`points_per_completion`) on the `tasks` row are **mirrored from `items[0]`** for
backward compat with dashboards/leaderboards reading the old columns.

---

## 11. Points & Wallet Economy

- All point columns are `DECIMAL(12,2)`.
- **Earning**:
  - Task completion → `points_per_completion` per approved item (+ optional completion_bonus when all items pass).
  - Daily login bonus = 5 points; streak multiplier = 1.5×.
  - Milestone bonuses: 10/25, 50/50, 100/100, 500/250, 1000/500 tasks.
  - Admin manual assignment via `assignPoints()` (audited).
  - Signup credits (when payment flow includes `included_credits`).
  - Badges (gamification).
- **Spending**:
  - Creating a task deducts `point_budget` from the creator's wallet.
  - Each approval deducts `points_per_completion` from the budget and credits the worker.
  - Failsafe trigger: budget exhausted → `RAISE EXCEPTION 'Task budget exhausted'`.
- **Penalties**:
  - Rejection penalty: −5 points after 3 rejections on the same task (constants + migration 038).
- **Wallet ledger**: every credit/debit also writes a `points_history` row with `action` enum + `reference_type` + `reference_id`.

Super Admin gets 10,000 initial points (migration 017 seed).

---

## 12. Payments & Subscriptions

- **Three purposes** of a payment submission:
  1. `signup` — pay during registration (creates user + payment in pending state, optionally with `created_payment_id` linked plan).
  2. `subscription` — buy / renew / upgrade a plan.
  3. `points` — buy a point package top-up.
- **Methods**: USD or BDT; each method has `qr_code_url`, `instruction` (markdown), and `is_active` toggle.
- **Submission flow**:
  1. User selects method + amount + plan/package + enters transaction ID + notes.
  2. Server creates `payments` row (status=`pending`), notifies all staff (`STAFF_ROLES`) by in-app notif + email.
  3. Staff reviews via `reviewPayment(paymentId, "approve"|"reject", notes)`.
  4. On approve: activates subscription / credits points / approves signup; generates invoice number; emails user with PDF invoice; audits.
  5. On reject: notifies user + email; audits.
- **Currency conversion**: `usd_to_bdt` rate stored in `settings`; `convertCurrency()` helper.
- **PDF invoice** built by `lib/pdf/invoice.ts` — shared builder used both on the
  client (download button) and server (email attachment).

---

## 13. SEO & Performance

### 13.1 SEO ([app/layout.tsx](app/layout.tsx), [app/(marketing)/page.tsx](app/(marketing)/page.tsx))

- Root metadata: title template `"%s | TaskMOS"`, keywords, OG, Twitter card.
- **JSON-LD** in `<script type="application/ld+json">`:
  - Site-wide `Organization` schema.
  - Home page: `SoftwareApplication` (with aggregate rating 4.9 / 12,000 reviews) + `FAQPage`.
- Marketing pages SSR'd; dashboard + auth pages have `robots: { index: false, follow: false }`.
- Sitemap (`app/sitemap.ts`) + robots (`app/robots.ts`).
- `SITE_URL` resolution order: `NEXT_PUBLIC_SITE_URL` → `AUTH_URL` → `https://taskmos.com`.
- Viewport metadata sets `themeColor: "#9333ea"` and `colorScheme: "light dark"`.

### 13.2 Performance ([next.config.ts](next.config.ts))

- `experimental.optimizePackageImports`: `lucide-react`, `date-fns`, `framer-motion` (per-export tree-shaking).
- `experimental.optimizeCss`: inlines critical CSS to unblock LCP.
- Image `remotePatterns` derived from `CLOUDFRONT_DOMAIN` + `NEXT_PUBLIC_SUPABASE_URL` (no wildcards — SSRF defense).
- Marketing page below-the-fold sections dynamic-imported (Testimonials, FAQ, About, CTA, Contact).
- Pricing pre-fetches plans server-side so the section renders instantly.
- Dashboard layout adds `<link rel="preconnect">` for CloudFront + Supabase
  (scoped to authenticated views to avoid Lighthouse "unused preconnect").
- React Query devtools dynamically imported only in dev.
- Browserslist targets evergreen browsers (chrome ≥100, etc.) — cuts polyfills.

---

## 14. File Uploads ([app/api/upload/route.ts](app/api/upload/route.ts), [lib/s3/](lib/s3/))

- POST `/api/upload` (multipart form) — gated by `auth()` session.
- Validated:
  - MIME type ∈ `ALLOWED_IMAGE_TYPES` (PNG/JPG/GIF/WebP) ∪ `["video/mp4", "video/webm"]`.
  - Extension whitelist double-check (`jpg|jpeg|png|gif|webp|mp4|webm`) — defends
    against MIME spoofing and blocks `.exe` / `.svg` (XSS).
  - Max size 10 MB.
- S3 key format: `uploads/<userId>/<uuid>.<ext>` — filename never interpolated
  (path-traversal defense, only the whitelisted extension is kept).
- Uses `@aws-sdk/lib-storage` `Upload` with 5 MB part size, 4 concurrent parts.
- Returned URL is the CloudFront URL (`https://<CLOUDFRONT_DOMAIN>/<key>`).
- Error logging server-side captures S3 code/message; user-facing message stays generic.

---

## 15. Email ([lib/email.ts](lib/email.ts))

26 KB of nodemailer-based templated emails. SMTP is **optional** — blank env vars
silently disable sending. Emails sent (non-exhaustive):

- Auth: `sendVerificationEmail`, `sendPasswordResetEmail`, `sendPasswordChangedEmail`, `sendWelcomeEmail`.
- User lifecycle: `sendAccountApprovedEmail`, `sendSignupRejectedEmail`, `sendAccountSuspendedEmail`, `sendAccountReactivatedEmail`, `sendAccountBannedEmail`.
- Admin alerts: `sendAdminNewSignupAlert`, `sendAdminNewPaymentAlert`.
- Payments: `sendPaymentReceivedEmail`, `sendPaymentApprovedEmail` (with PDF invoice attachment), `sendPaymentRejectedEmail`.
- Subscriptions: `sendSubscriptionExpiringEmail` (7d/1d), `sendSubscriptionExpiredEmail`.
- Groups: `sendGroupApprovedEmail`, `sendGroupRejectedEmail`.

---

## 16. Environment Variables ([lib/env.ts](lib/env.ts))

Validated at boot via Zod — throws a formatted error listing every missing/invalid
var rather than failing on first DB query.

**Required**:
- `AUTH_SECRET` (≥32 chars)
- `AUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`
- `CLOUDFRONT_DOMAIN`

**Optional**:
- `SUPABASE_ANON_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (all blank → email disabled)
- `NEXT_PUBLIC_SITE_URL` (falls back to AUTH_URL)
- `DIRECT_URL` (used only by `scripts/run-migrations.mjs` and `scripts/create-moderator.mjs`)

---

## 17. Notable Implementation Quirks

1. **JWT vs DB freshness** — Sessions are JWT (24h cache). Role/status changes
   only take effect via the **dashboard layout's fresh DB read** + the demoted-staff
   compensator (forced sign-out on detected demotion). The proxy uses cached values
   for fast routing; the dashboard layout is the source of truth.
2. **Race-safe lifecycle notifications** — `fireOnce()` in subscription-check uses
   a conditional UPDATE pattern so concurrent dashboard renders can't double-notify.
3. **PostgREST filter escaping** — `escapePgLikeOr()` in utils strips
   `, ( ) * " % \` from search terms before they're interpolated into `.or()` chains.
   Not SQL injection (PostgREST has its own grammar) but escapes prevent term-bleed
   into adjacent filters.
4. **S3 key sanitisation** — only the whitelisted extension is kept; the filename is never embedded in the key.
5. **HeroUI no-op shim** — provider exists but does nothing (kept for future use).
6. **Custom UI primitives** — `components/ui/` replaces HeroUI's unstyled components
   with branded variants. `Btn` (not `Button`) is the project-wide CTA component.
7. **Legacy task fields kept** — even after the bundle migration, `tasks` still
   carries `task_type_id`, `task_data`, `proof_type`, `points_per_completion` mirrored
   from `items[0]` for backward compat with dashboards reading the old columns.
8. **`require_subscription` setting** — toggleable in /settings. When off, the entire
   subscription/quota gate is bypassed and `/plans` is hidden from the sidebar.
9. **`require_user_approval` setting** — when on, new signups go to `is_approved=false`
   and need staff approval (rendered as "Pending Approval" on login).
10. **Music-stream task UX** — `MUSIC_STREAM_SLUGS` + `MUSIC_PLATFORM_SLUGS` in
    [lib/constants/platforms.ts](lib/constants/platforms.ts) trigger the
    `MusicPlayLockModal` (fullscreen lock overlay + countdown + tab-focus reset + auto-screenshot)
    instead of the generic proof form.
11. **AI prompt field** — `taskTypeNeedsAiPrompt(slug)` decides whether the task
    creator sees an "AI Prompt" textarea (used for content-generation tasks like
    comments, reviews, captions, but not for pure clicks like likes/follows).
12. **Audit log is fire-and-forget** — `recordAudit()` swallows all errors so an
    audit failure never blocks the user's action. Audit is strictly forensic.
13. **Rate limiter is in-memory** — `lib/rate-limit.ts` is a single-process map.
    Documented to swap for Upstash/Redis if the deploy scales to multiple instances.
14. **AGENTS.md warning** — "This is NOT the Next.js you know" — read
    `node_modules/next/dist/docs/` before writing Next-version-specific code.

---

## 18. Scripts ([scripts/](scripts/))

| Script | Purpose |
|---|---|
| `run-migrations.mjs` | Runs every SQL file in `supabase/migrations/` in order against `DIRECT_URL`. Continues on individual failure so re-runs are idempotent. |
| `create-moderator.mjs` | `node scripts/create-moderator.mjs <email> <password> [name]` — creates or upgrades a user to moderator. |
| `seed-dummy-data.mjs` | Seeds fake platforms/tasks/users for local dev. |

---

## 19. Git State (snapshot at session start)

- Branch: `master`
- Recent commits:
  - `43311a0 updated platform and settings`
  - `af5d4e8 updated`
  - `d5159a7 testing done`
  - `13991e1 fixed youtube`
  - `fdfdb39 view done`
- Modified (uncommitted): `pnpm-workspace.yaml`.

---

## 20. Quick Reference

| Question | Answer |
|---|---|
| Where is auth configured? | [auth.ts](auth.ts) + [types/next-auth.d.ts](types/next-auth.d.ts) |
| Where is route protection? | [proxy.ts](proxy.ts) (middleware) + [lib/auth-helpers.ts](lib/auth-helpers.ts) (per-action) |
| Where are server actions? | [lib/actions/](lib/actions/) (21 files) |
| Where are client hooks? | [hooks/](hooks/) (12 files) |
| Where is the design system? | [components/ui/](components/ui/) + Tailwind v4 in [app/globals.css](app/globals.css) |
| Where is the DB schema? | [supabase/migrations/](supabase/migrations/) (001–050) + [types/database.ts](types/database.ts) |
| Where is the subscription logic? | [lib/subscription-check.ts](lib/subscription-check.ts) |
| Where are uploads handled? | [app/api/upload/route.ts](app/api/upload/route.ts) + [lib/s3/](lib/s3/) |
| Where are emails composed? | [lib/email.ts](lib/email.ts) |
| Where are the public pages? | [app/(marketing)/](app/(marketing)/) + [components/landing/](components/landing/) |
| Where is the dashboard chrome? | [app/(dashboard)/layout.tsx](app/(dashboard)/layout.tsx) + [components/layout/](components/layout/) |
| What env vars are required? | See [lib/env.ts](lib/env.ts) |

---

# Part B — Active Workflow Rules (read before editing)

The sections below (§21–§25) are the active rules for ongoing development.
AGENTS.md auto-imports this file so these rules load into every session.
Update this part when the workflow itself changes — it is the source of truth.

---

## 21. Development Workflow & Safety Rules

### 21.1 Golden rules (apply to every change)

1. **Never edit a migration that has already been applied** (001–050 are frozen). New SQL goes to a new file. See §23.
2. **Touch the whole chain when a column changes.** A new/renamed/dropped column means: migration → `types/database.ts` → `lib/actions/*.ts` query strings → hook in `hooks/` → component in `components/shared/`. See §22.
3. **Every privileged mutation logs an audit event.** Call `recordAudit(db, actorId, action, targetType, targetId, metadata)` from `lib/audit.ts`. It's fire-and-forget and never blocks.
4. **Every write-heavy or attacker-prone action rate-limits.** Call `checkRate(action, subject, limit, windowMs)` from `lib/rate-limit.ts`. Pattern: rate-limit by IP for unauthenticated actions, by user id for authenticated mutations.
5. **Every new admin/staff route updates 3 files:**
   - `proxy.ts` — add to `adminOnlyPaths` or `staffOnlyPaths`.
   - `lib/constants/roles.ts` — add the permission key + role list to `PERMISSIONS`.
   - `components/layout/sidebar.tsx` — add the nav item with the matching `permission`.
6. **Server actions: always `"use server"`, always `auth()` first, always `zod` validate.** Pattern at the top of every action: session check → role/permission check → schema parse → DB call → audit (if mutation) → return `ApiResponse`.
7. **Subscription/quota gates only for non-staff.** `checkActiveSubscription()` + `checkQuota()` bypass for `isStaffRole(role)`. Don't duplicate that bypass at call sites.
8. **Points are `DECIMAL(12,2)`.** Never use `INTEGER` for any new points column. The wallet trigger expects decimals.
9. **All file uploads go through `/api/upload`.** Never call S3 directly from a component. The route enforces auth, MIME whitelist, extension whitelist, and 10 MB cap.
10. **TanStack Query invalidation must match.** When a mutation changes state X, invalidate every query key that displays X. Pattern in existing hooks: list the related keys in a helper like `invalidateAll(qc)` or `invalidateGroups(qc)`.

### 21.2 When to plan vs. go direct

**Plan first** (show approach / use ExitPlanMode before editing):
- Touches DB schema, enum, trigger, RPC.
- Spans multiple layers (action + hook + component).
- Modifies RBAC / proxy.ts / PERMISSIONS matrix.
- Changes the points wallet, subscription gate, or quota math.
- Adds a new top-level route or sidebar entry.
- Refactor across more than 3 files.

**Go direct** (just edit):
- Single-file fix (typo, copy, visual tweak, one validator).
- Bug fix where root cause + fix are obvious.
- Tightening a `zod` schema without changing the shape.

### 21.3 Performance defaults

- New DB queries that select more than a handful of columns: write explicit column lists, never `select("*")` unless every column is actually used downstream.
- New filter columns on hot tables: add an index in the same migration.
- New joins: use Supabase's `!inner` join syntax explicitly; never fetch then filter in JS.
- New list endpoints: paginate via `PaginationParams` (`page`, `pageSize`, `sortBy`, `sortOrder`, `search`). `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`.
- New TanStack Query hooks: set `staleTime` (default 60s in QueryProvider) and `refetchInterval` only when the data actually changes server-side (e.g. notifications, pending reviews).
- Heavy client components below the fold: dynamic-import them like the marketing page does (`const X = dynamic(() => import("..."))`).
- Long string interpolation into `.or()` / `.ilike()`: pass through `escapePgLikeOr()` from `lib/utils.ts`.
- Server actions that fan out to multiple tables: parallelise with `Promise.all([...])`. The existing analytics actions are the reference pattern.

### 21.4 Security defaults

- Never trust `x-forwarded-for` / `x-real-ip` for auth — only for rate-limit subjects.
- Never log secrets or full request bodies; log structured error info only (see the `/api/upload` error log shape).
- Search inputs into PostgREST `.or()`: always escape via `escapePgLikeOr()`.
- New user-uploaded content rendered as HTML: pass through `isomorphic-dompurify`.
- New API routes that mutate: require POST + verify session + verify role.
- New cookie reads/writes: check `lib/auth-helpers.ts` first — most cases should go through the existing helpers.

### 21.5 Verification before claiming done

Don't claim a change works without:
- TypeScript: `pnpm exec tsc --noEmit` clean (or `pnpm build` if a full build is fast enough).
- Lint: `pnpm lint` clean for files you touched.
- If the change is UI: open `pnpm dev` and exercise the golden path + 1 edge case in the browser before marking done.
- If the change is a server action: hit it from the actual page (TanStack Query mutation), not via curl.
- If the change is SQL: apply via `pnpm exec node scripts/run-migrations.mjs` on a local Supabase, then verify the migration is idempotent by running it twice.

---

## 22. Change-Impact Cheat Sheet

When you change one of these, also update the listed files. This list is the antidote to "I changed the column but the UI still shows the old name."

### 22.1 DB column added / renamed / dropped

| Layer | File(s) | Action |
|---|---|---|
| Migration | `supabase/migrations/0NN_*.sql` | New file (§23). |
| Row types | `types/database.ts` | Add/rename/remove the field on the row interface + any insert type. |
| Joined types | `types/index.ts` (if column appears in joined selects) | Update extended interfaces (`TaskWithDetails`, etc.). |
| Server actions | `lib/actions/*.ts` | Update every `select(...)` string and every `.insert/.update` payload. Grep for the old name. |
| Hooks | `hooks/*.ts` | Usually unchanged unless query key shape changes — but cross-check. |
| Components | `components/shared/*.tsx` + `components/layout/*.tsx` | Find every read of the old field; rename / null-check. |
| Audit metadata | `lib/audit.ts` | If the column is privileged, include it in audit `metadata`. |

### 22.2 New role / permission

| Layer | File(s) | Action |
|---|---|---|
| Enum | `supabase/migrations/0NN_*.sql` | `ALTER TYPE user_role ADD VALUE ...` |
| TS union | `types/database.ts` | Widen `UserRole`. |
| Hierarchy | `lib/constants/roles.ts` | Add to `ROLE_HIERARCHY`, `ROLE_LABELS`, `ADMIN_ROLES`/`STAFF_ROLES` groupings as appropriate. |
| Matrix | `lib/constants/roles.ts` PERMISSIONS | Update every permission list to include / exclude. |
| Middleware | `proxy.ts` | Update `adminRoles` / `staffRoles` arrays if the new role is privileged. |
| Helpers | `lib/auth-helpers.ts` | Usually no change — `requireRole` / `checkPermission` will pick up automatically. |
| Sidebar | `components/layout/sidebar.tsx` | Each nav item's `permission` already filters — no change unless adding a new item. |

### 22.3 New server action

| Layer | File(s) | Action |
|---|---|---|
| Action | `lib/actions/<area>.ts` | `"use server"`, `auth()`, `zod` parse, `recordAudit()` if mutation, `ApiResponse` return. |
| Hook | `hooks/use-<area>.ts` | Add the matching `useQuery` / `useMutation`. List query keys to invalidate on success. |
| Type | `types/index.ts` | Add form data type if the action takes structured input (e.g. `XxxFormData`). |
| Component | `components/shared/*.tsx` | Wire the hook to the UI. Surface `toast.success(r.message)` / `toast.error(r.error)`. |

### 22.4 New dashboard route

| Layer | File(s) | Action |
|---|---|---|
| Route | `app/(dashboard)/<route>/page.tsx` | Server component, `requireAuth()` / `requireRole()` / `checkPermission()`. Set `metadata: { title }`. |
| Layout | `app/(dashboard)/layout.tsx` | Usually unchanged. |
| Proxy gate | `proxy.ts` | Add to `publicPaths` / `adminOnlyPaths` / `staffOnlyPaths` as appropriate. Auth pages stay open to signed-out users. |
| Permission | `lib/constants/roles.ts` PERMISSIONS | Add a permission key if RBAC-gated. |
| Sidebar | `components/layout/sidebar.tsx` | Add a `NavItem` with the matching `permission`. |
| Marketing public page? | also `app/sitemap.ts` | Include the URL. |

### 22.5 New marketing route

| Layer | File(s) | Action |
|---|---|---|
| Route | `app/(marketing)/<route>/page.tsx` | Static or RSC. Set SEO metadata. |
| Sitemap | `app/sitemap.ts` | Add. |
| Robots | `app/robots.ts` | Usually no change unless excluding. |
| Layout chrome | `components/landing/Navbar.tsx` / `Footer.tsx` | Add nav link if user-facing. |
| Proxy | `proxy.ts` | Add to `publicPaths`. |

### 22.6 New / changed email

| Layer | File(s) | Action |
|---|---|---|
| Template | `lib/email.ts` | Add `sendXxxEmail(...)`. Keep the function signature minimal — pull data from caller, don't fetch inside. |
| Caller | `lib/actions/*.ts` | Always `await` and **never throw on email failure** — wrap in try/catch and log. |
| SMTP off path | `lib/email.ts` | Existing helper silently no-ops when SMTP env is missing — preserve that. |

### 22.7 New notification trigger

| Layer | File(s) | Action |
|---|---|---|
| Insert | `lib/actions/notifications.ts` `createNotification(...)` or direct `db.from("notifications").insert(...)`. | Always set `type`, `title`, `message`, `link`. |
| In-app realtime | `hooks/` consuming code | Invalidate `["notifications"]` and `["unread-count"]` on the mutation that triggers the notif. |
| Email | `lib/email.ts` | Add a paired email if the notification is high-priority (suspension, payment, subscription). |

### 22.8 New plan field (max_tasks / max_groups / included_credits / etc.)

| Layer | File(s) | Action |
|---|---|---|
| Migration | new file | `ALTER TABLE plans ADD COLUMN ...`. Backfill defaults for existing rows. |
| Subscription math | `lib/subscription-check.ts` | Update `getQuota()` / `computeRemainingQuota()` if the column affects quota. |
| Plan CRUD | `lib/actions/plans.ts` | Update `planSchema` zod + select strings + create/update payloads. |
| Plan UI | `components/shared/plans-view.tsx`, `components/landing/Pricing.tsx`, admin plan editor in payments page | Render the new field. |
| Type | `types/index.ts` `Plan` interface | Add field. |

### 22.9 New points action (earning / spending)

| Layer | File(s) | Action |
|---|---|---|
| Enum (if new) | new migration | `ALTER TYPE points_action ADD VALUE ...`. |
| TS union | `types/database.ts` `PointsAction` | Widen. |
| Trigger / RPC | new migration | Implement debit/credit logic atomically. |
| Constants | `lib/constants/index.ts` | If new bonus / threshold, add to `MILESTONE_BONUSES` / `DAILY_LOGIN_BONUS` / `REJECTION_PENALTY`. |
| Action | `lib/actions/points.ts` | Add server-side entry point if it's user-triggerable. |
| History display | `components/shared/profile-view.tsx` (points history tab) | Render the new action's label. |

### 22.10 Task type / platform additions

| Layer | File(s) | Action |
|---|---|---|
| Migration | new file | `INSERT INTO platforms ...` and/or `INSERT INTO task_types ...` (see 013, 019, 049 for reference). |
| Constants | `lib/constants/platforms.ts` | Add to `PLATFORM_CONFIG`. If music: add to `MUSIC_PLATFORM_SLUGS` / `MUSIC_STREAM_SLUGS`. |
| Content task heuristic | `lib/content-task-types.ts` | If the task type generates user content, ensure `taskTypeNeedsAiPrompt()` returns true (or extend the include/exclude lists). |
| Icon | None — `PLATFORM_CONFIG.icon` is a lucide icon name string, resolved at render time. |

---

## 23. DB Migration Policy

### 23.1 The rules

1. **Migrations 001–050 are frozen.** Never edit a file in `supabase/migrations/` that already exists. To fix a mistake, write a corrective migration (`DROP COLUMN`, `ALTER COLUMN`, etc.).
2. **Numbering is strictly sequential.** Next file after `050_image_field_type_rename.sql` is `051_<descriptive_name>.sql`. Pad to 3 digits. Use `_` as the separator, lowercase.
3. **Idempotent or it's broken.** `scripts/run-migrations.mjs` continues on per-file failure, so a non-idempotent migration silently leaves partial state. Required patterns:
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (Postgres 9.6+)
   - `DROP TRIGGER IF EXISTS xxx ON yyy;` before `CREATE TRIGGER xxx ...`
   - `CREATE OR REPLACE FUNCTION` (always — never bare `CREATE FUNCTION`)
   - For enum additions: `ALTER TYPE name ADD VALUE IF NOT EXISTS '...'` (Postgres 12+).
4. **Same migration adds matching indexes.** Any new FK column gets `CREATE INDEX IF NOT EXISTS idx_table_col ON table(col);` in the same file. Any column joined into the WHERE/JOIN of hot queries gets an index.
5. **Same migration updates `types/database.ts`.** TS row interfaces must move in lockstep so the compiler catches stale call sites.
6. **Same migration updates the relevant action's `select()` strings.** If you added a column you'll use, add it to the select. If you dropped one, remove every read.
7. **Audit table sees the migration.** Schema changes that affect privileged tables (payments, subscriptions, roles) should be reflected in `lib/audit.ts` `AuditTargetType` if a new target type is introduced.

### 23.2 Migration file skeleton

```sql
-- ===========================================================================
-- 0NN_<short_description>.sql
-- ---------------------------------------------------------------------------
-- WHY: <one-paragraph reason — what business need or bug drives this>
-- IMPACT: <which tables, which existing rows are touched>
-- ROLLBACK: <how to undo; usually a paired DROP COLUMN / ALTER ... DROP>
-- ===========================================================================

-- Schema changes
ALTER TABLE <table>
  ADD COLUMN IF NOT EXISTS <col> <type> <default/constraints>;

-- Backfill (idempotent — only updates rows that need it)
UPDATE <table>
SET <col> = <default>
WHERE <col> IS NULL;

-- Indexes for any new column used in filters / joins
CREATE INDEX IF NOT EXISTS idx_<table>_<col> ON <table>(<col>);

-- Triggers (always DROP IF EXISTS before CREATE)
DROP TRIGGER IF EXISTS trg_<name> ON <table>;
CREATE TRIGGER trg_<name>
  BEFORE UPDATE ON <table>
  FOR EACH ROW EXECUTE FUNCTION <fn>();

-- Functions (always CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION <fn>()
RETURNS TRIGGER AS $$
BEGIN
  -- ...
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 23.3 Patterns from existing migrations to mimic

- **Wallet accounting changes**: study `017_points_wallet_system.sql` — every credit/debit writes a `points_history` row, the trigger is `CREATE OR REPLACE`, decimals everywhere.
- **Atomic operations**: study `041_submit_proof_atomic.sql` and `038_rejection_penalty_atomic.sql` — multi-step state changes go inside one PL/pgSQL function so they're transactional.
- **Race-safe notifications**: study `029_subscription_notifications.sql` paired with `lib/subscription-check.ts` `fireOnce()` — flags on the row + conditional UPDATE prevents duplicates under concurrency.
- **Backfill**: study `047_backfill_bundle_items.sql` — converts every pre-bundle task into a 1-item bundle. Always idempotent (checks for existing rows before inserting).
- **Bulk seeds**: study `013_seed_platforms.sql` and `049_platforms_music_review.sql` — use `INSERT ... ON CONFLICT (slug) DO UPDATE SET ...` for idempotent re-runs.

### 23.4 Forbidden patterns

- ❌ Editing `001_*` through `050_*` (frozen).
- ❌ `DROP TABLE` without an explicit user request — destructive.
- ❌ `CREATE FUNCTION` without `OR REPLACE`.
- ❌ `CREATE TRIGGER` without preceding `DROP TRIGGER IF EXISTS`.
- ❌ `INSERT` without `ON CONFLICT` clause when seeding lookup tables.
- ❌ Changing column type from anything to `INTEGER` for points columns (must be `DECIMAL(12,2)`).
- ❌ Dropping a column referenced by the app without first removing every read.

---

## 24. New Feature Checklist

When adding a brand-new feature (not modifying an existing one), walk through this checklist in order. Each step references the file/pattern to copy from.

### 24.1 Plan & scope
- [ ] Write down: who triggers it, what RBAC they need, what tables it touches, what notifications/emails fire.
- [ ] Identify which existing PERMISSIONS key fits, or invent a new one.
- [ ] Identify the audit `action` string and `targetType` (extend `AuditAction` / `AuditTargetType` in `lib/audit.ts` if new).
- [ ] Show the plan to the user before coding (per §21.2 plan-first criteria).

### 24.2 Database
- [ ] New migration `supabase/migrations/051_*.sql` following §23 skeleton.
- [ ] Indexes on every FK + every column used in WHERE/JOIN of the new queries.
- [ ] Idempotent re-run verified locally (`pnpm exec node scripts/run-migrations.mjs` twice).
- [ ] Update `types/database.ts` row interfaces + any new enum unions.
- [ ] Update `types/index.ts` joined types if the new tables join with existing ones.

### 24.3 Server action
- [ ] New action in `lib/actions/<area>.ts` (or new file if it's a new domain).
- [ ] `"use server"` at the top.
- [ ] `auth()` → role/permission check → `zod` schema parse → DB call → `recordAudit()` (if mutation) → `ApiResponse` return.
- [ ] If write-heavy or attacker-prone: `checkRate()`.
- [ ] If gated by subscription: `checkActiveSubscription()` + `checkQuota()` (skipped for staff).
- [ ] Pagination uses `PaginationParams`.
- [ ] Explicit column lists in `.select(...)` — no `*`.

### 24.4 Client hook
- [ ] New hook in `hooks/use-<area>.ts` (or extend the matching one).
- [ ] `useQuery` for reads (with reasonable `staleTime` / `refetchInterval`).
- [ ] `useMutation` for writes — invalidate every related query key on success, `toast.success(r.message)` / `toast.error(r.error)`.
- [ ] Update existing invalidate-all helpers (e.g. `invalidateGroups(qc)`) if the new write affects them.

### 24.5 UI
- [ ] New component in `components/shared/<feature>.tsx` (or extend an existing view).
- [ ] Use `components/ui/` primitives (`Btn`, `Card`, `Input`, `Modal`, `Badge`) — no raw HTML inputs.
- [ ] Loading states use `<Btn isLoading>`. Empty states use `<EmptyState>`. Confirmations use `<ConfirmDialog>`.
- [ ] Forms use `react-hook-form` + `zodResolver`.
- [ ] All user input that becomes HTML goes through `isomorphic-dompurify`.
- [ ] Dark-mode CSS variables (no hardcoded `bg-white` — use `bg-card`, `bg-background`, etc.).

### 24.6 Route + nav
- [ ] New page at `app/(dashboard)/<route>/page.tsx` (or marketing route).
- [ ] `requireAuth()` / `checkPermission()` at the top.
- [ ] `export const metadata = { title: "..." }`.
- [ ] Add to `proxy.ts` `adminOnlyPaths` / `staffOnlyPaths` / `publicPaths` as needed.
- [ ] Add to `components/layout/sidebar.tsx` nav items with matching `permission`.
- [ ] If public: add to `app/sitemap.ts`.

### 24.7 Notifications & email
- [ ] In-app `notifications` row inserted via existing `createNotification()` or direct insert.
- [ ] Paired email in `lib/email.ts` (silent-fail if SMTP env missing).
- [ ] Email is `await`-ed but never throws to caller.
- [ ] Notification template uses the same `link` field that the user can click through to.

### 24.8 Verify
- [ ] `pnpm exec tsc --noEmit` clean.
- [ ] `pnpm lint` clean for changed files.
- [ ] `pnpm dev` and run through the feature in browser — golden path + 1 RBAC denial + 1 edge case.
- [ ] Check that the wallet/quota/subscription totals haven't drifted (compare before/after).

---

## 25. Update-Existing-Feature Checklist

When modifying behavior of something already in the codebase, the trap is leaving a stale call site somewhere. Walk this checklist.

### 25.1 Locate every consumer
- [ ] Grep for the function name (`Grep -p "functionName"`).
- [ ] Grep for the column / field name if you're changing it.
- [ ] Check `types/database.ts` and `types/index.ts` for places the type is reused.
- [ ] Check `hooks/` for every hook that calls the action.
- [ ] Check `components/` for every component that calls the hook.
- [ ] Note any other action that calls it server-to-server.

### 25.2 Compatibility decision
- [ ] If renaming: prefer adding the new name and keeping the old as an alias for one PR; remove old in a follow-up PR after every call site moves.
- [ ] If changing return shape: update every caller in the same PR (no half-migration).
- [ ] If changing semantics (e.g. quota math): announce in audit `metadata` field on the migration so the change is traceable.
- [ ] If changing a column type: paired `ALTER COLUMN` migration + type update + caller updates, all in one PR.

### 25.3 Don't break the wallet / subscription / RBAC
- [ ] Any change to the points wallet trigger (`on_assignment_approved`): re-verify total points before/after on a real account.
- [ ] Any change to `subscription-check.ts`: re-verify the staff bypass still works and the `require_subscription=false` path still skips the gate.
- [ ] Any change to PERMISSIONS matrix: re-verify the sidebar and `proxy.ts` align — a moderator should still see exactly the staff routes, no more, no less.
- [ ] Any change to `auth.ts` callbacks: re-verify the JWT carries every field the dashboard layout reads back.

### 25.4 Don't break the audit / rate-limit / notifications
- [ ] If you remove an audit call: ask why first. Audit removals usually need an explicit reason.
- [ ] If you remove a rate-limit call: same — log the reason in the commit message.
- [ ] If you change a notification's `link` or `type`: check the existing rows in DB won't render weirdly under the new code.

### 25.5 Performance regression checks
- [ ] Did the change add an N+1? (a query inside a loop). Refactor to a single query with `IN (...)` or a join.
- [ ] Did the change add a sequential await that could be `Promise.all`?
- [ ] Did the change add a `select("*")`? Replace with explicit columns.
- [ ] Did the change touch a hot path? Re-check the indexes still cover it.

### 25.6 Verify
- [ ] Same TS / lint / dev / browser-check as §24.8.
- [ ] If you changed a SQL trigger: re-run the migration locally + manually trigger the path (approve a task / reject a payment) and inspect `points_history` / `notifications` / target row state.
- [ ] If you changed a hot query: `EXPLAIN ANALYZE` in Supabase SQL editor before claiming the change is "optimized".

---

## 26. Using External References (screenshots, code samples, "build like this site")

The user frequently provides reference material — screenshots of other apps, code snippets from other projects, links to public sites — saying "ei feature ta baniye den" or "eitar moto kaj koruk". The rule is strict:

### 26.1 Extract these things from the reference
- **What the feature does** — the user flow, the inputs, the outputs.
- **Visual layout structure** — header position, card grouping, table vs list, modal vs page, mobile vs desktop split.
- **Interaction pattern** — drag-and-drop, infinite scroll, accordion, stepper, etc.
- **Information architecture** — what data fields appear together, what's hidden behind a click.

### 26.2 NEVER copy these from the reference
- **Colors** — the reference might be blue/green; TaskMOS is purple primary (`#7C3AED`) + pink accent (`#EC4899`). Use Tailwind tokens `bg-primary`, `text-accent`, `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-border/50`. Never hardcode hex colors.
- **Component libraries** — if the reference uses shadcn/ui, MUI, Chakra, Mantine, Ant Design, HeroUI — **do not import them**. TaskMOS uses its own primitives in `components/ui/` (`Btn`, `Card`, `Input`, `Select`, `Textarea`, `Label`, `FieldError`, `Badge`, `Separator`, `Modal`, `IconInput`). Extend these or write a new one in the same file with the same styling vocabulary.
- **Icon set** — TaskMOS uses `lucide-react` only. Convert any other icon set (Heroicons, Material Icons, custom SVGs) to lucide equivalents.
- **Font** — TaskMOS uses **Inter** via `next/font`. Don't add new fonts.
- **Border radius style** — TaskMOS uses `rounded-xl` for inputs/buttons, `rounded-2xl` for cards. Match that, not the reference's radius scale.
- **Shadow style** — TaskMOS uses `shadow-sm` on cards, `hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5` on primary buttons. Match.
- **Animation library** — `framer-motion` is the only one. Don't add GSAP/Anime.js/etc.
- **Form library** — `react-hook-form` + `@hookform/resolvers` + `zod`. Don't add Formik/Final Form.
- **State library** — TanStack Query for server state, React `useState`/`useReducer` for local. No Redux, Zustand, Jotai, Recoil.
- **CSS-in-JS** — Tailwind v4 + CSS variables only. No styled-components / emotion / vanilla-extract.
- **Class names from reference** — write fresh Tailwind classes using the existing token palette; don't paste the reference's classes.

### 26.3 TaskMOS design vocabulary (use these patterns by default)

| Element | TaskMOS pattern |
|---|---|
| Page wrapper | `<div>` + `<PageHeader title="..." description="..." actions={...} />` (see `components/shared/page-header.tsx`) |
| Card surface | `<Card>` → `<CardHeader><CardTitle/><CardDescription/></CardHeader><CardContent/><CardFooter/></Card>` |
| Primary CTA | `<Btn variant="primary" size="md">...</Btn>` (gradient purple, hover lift) |
| Secondary CTA | `<Btn variant="outline">` or `<Btn variant="ghost">` |
| Danger CTA | `<Btn variant="danger">` (uses `bg-error`) |
| Loading button | `<Btn isLoading>` (built-in spinner) |
| Form input | `<IconInput icon={Mail}><Input placeholder=... error={!!err} /></IconInput>` + `<FieldError>` |
| Status pill | `<Badge variant="success|warning|error|primary|accent|default">...</Badge>` |
| Empty state | `<EmptyState>` from `components/shared/empty-state.tsx` |
| Confirm before delete | `<ConfirmDialog>` from `components/shared/confirm-dialog.tsx` |
| Toast | `toast.success(msg)` / `toast.error(msg)` from `sonner` (already wired in the root Providers) |
| Modal | `<Modal>` from `components/ui/modal.tsx` |
| Page-level metadata | `export const metadata: Metadata = { title: "..." }` on the route's `page.tsx` |
| Data fetching (client) | TanStack Query hook from `hooks/use-*.ts` — never `fetch()` directly from a component |
| Data fetching (server) | server action from `lib/actions/*.ts` called from a server component or via the hook |
| Image | `next/image` only — never `<img>` (the existing `<img>` in sidebar.tsx is a documented exception with eslint-disable) |
| Avatar fallback | `getInitials(name)` from `lib/utils.ts` on a `bg-gradient-to-br from-primary/20 to-accent/20` square |
| Date format | `formatDate(date)` / `formatRelativeTime(date)` from `lib/utils.ts` |
| Points display | `formatPoints(n)` from `lib/utils.ts` (1.2K / 3.5M shorthand) |
| Currency display | `convertCurrency(...)` from `lib/currency.ts` + `${amount.toFixed(2)} ${currency.toUpperCase()}` |

### 26.4 Color tokens (defined in `app/globals.css`, mapped via `SettingsProvider`)

Use these Tailwind class roots — never hex values:

| Token | Use for |
|---|---|
| `bg-primary` / `text-primary` / `border-primary` | Brand purple (default `#7C3AED`, admin-tunable via `settings.primary_color`) |
| `bg-accent` / `text-accent` | Pink secondary (`#EC4899`, admin-tunable) |
| `bg-background` / `text-foreground` | Page background + body text (dark-mode aware) |
| `bg-card` | Card surfaces |
| `bg-muted` / `text-muted-foreground` | Muted backgrounds and secondary text |
| `bg-sidebar-bg` / `border-sidebar-border` | Sidebar chrome |
| `bg-success` / `text-success` | Approvals, "active" state |
| `bg-warning` / `text-warning` | "Pending review" state |
| `bg-error` / `text-error` | Rejections, destructive actions, validation errors |
| `border-border` / `border-border/50` | Default borders (sometimes half-opacity for softer separation) |
| `from-primary to-primary/90` / `from-primary/20 to-accent/20` | Gradients used on primary CTAs and avatar backgrounds |

### 26.5 The translation workflow

When user provides a reference:

1. **Look** — describe back to user what behavior you see ("ok, eta ekta drag-and-drop kanban board with status columns, card preview shows assignee avatar + due date + priority pill"). This confirms you read the reference correctly.
2. **Map** — match each reference element to a TaskMOS primitive (kanban column = `<Card>` with `<CardHeader>` + column body; card preview = small `<Card>` with avatar + `<Badge variant="warning">` for priority).
3. **Plan** (if §21.2 plan-first criteria apply) — show the user the data model + components + hooks before coding.
4. **Build** using TaskMOS conventions — colors, primitives, fonts, animation, state management all from this codebase. The user should be able to drop the new feature into the existing app and have it feel native.

**Anti-example**: "user sent a screenshot of a blue Notion-style sidebar with Material icons → I'll add MUI and use their blue palette." NO. Use `components/layout/sidebar.tsx` as the base, lucide icons, TaskMOS purple, existing nav-item filter pattern.

**Good example**: "user sent a screenshot of a multi-step form wizard with progress bar → I'll build it with `react-hook-form` (already in stack), a custom step indicator using `<Badge>` + connecting lines using `border-border`, primary `<Btn>` for Next, ghost `<Btn>` for Back, TaskMOS purple progress fill, lucide `<Check>` for completed steps."

---

## 27. Session Continuity Log (`phlog.md`)

The repo carries a **session journal** at `d:/Taskmos/taskflow/phlog.md`. It is the persistent
record of "what the user asked, what was done, where work currently stands" — so that a VS Code
restart, laptop reboot, or new chat session never costs context.

### 27.1 What `phlog.md` is for

- Letting the user say "ai jayga theke continue koren" / "where we left off" without re-briefing.
- Tracking what prompts the user has sent and what state each request reached (done / partial / blocked / next step).
- Surviving crashes — every meaningful exchange ends with an appended log entry, so even if a session dies mid-task, the next session can resume cleanly.

### 27.2 Entry format

Each entry appears **at the top** of the "Entries" section (newest first). Date-grouped under
`## YYYY-MM-DD · Session N`. Within a date, entries are numbered backwards (`#6, #5, #4, ...`).

```markdown
### Entry #N · One-line title
- **User prompt (Banglish):** "<verbatim or close paraphrase of the request>"
- **Intent:** <what the user actually wanted, in one sentence>
- **Done:** <bullet list of concrete changes>
- **Files touched:** <comma-separated paths; (new) marker for new files>
- **State:** <"Complete" | "Partial — N% done" | "Blocked on X" | "Awaiting user confirmation">
- **Next step:** <what's pending, or "None on its own">
```

### 27.3 When to append an entry

- **Always:** after finishing any non-trivial user request (feature added, bug fixed, migration written, file restructured, rule changed).
- **Always:** when a user request is partially done and the work needs to pause — capture the exact stopping point under **State** and **Next step** so resumption is mechanical.
- **Skip:** trivial back-and-forth ("read this file", "what does X do?") that produces no artifact change.
- **Skip:** the very first message of a session (initial greeting / context loading).

### 27.4 How to resume from `phlog.md`

When a new session starts (or the user says "continue korun" / "ager theke shuru korun"):

1. Read the top 3–5 entries of `phlog.md` to understand recent context.
2. Find the most recent entry whose **State** is not "Complete" — that's the resumption point.
3. Read the **Next step** of that entry — that's the immediate action.
4. If the user gave a fresh prompt that overrides the next step, prefer the fresh prompt but call out that you saw the pending work in passing.
5. After finishing, append a new entry at the top reflecting what changed.

### 27.5 Archive policy

- Keep up to ~50 most-recent entries inline in `phlog.md`.
- When the file grows beyond that, create `phlog-archive/YYYY-MM.md` and move the oldest entries there, preserving the same format.
- Leave a top-of-file reference in `phlog.md` to the archive folder so older work is still discoverable.

### 27.6 Relationship to memory entries

- **Memory entries** (`~/.claude/projects/d--Taskmos-taskflow/memory/`) capture durable preferences / rules / project facts. They rarely change.
- **`phlog.md`** captures ephemeral per-request work history. It changes constantly.
- Both are auto-loaded each session, but they serve different roles. Don't duplicate; cross-link.

---

## 28. Where this rulebook lives

- `d:/Taskmos/taskflow/phnote.md` (this file) — architecture tour + active rules. Auto-loaded via `AGENTS.md`.
- `d:/Taskmos/taskflow/phlog.md` — session journal. Auto-loaded via `AGENTS.md`. Appended after every meaningful request.
- `~/.claude/projects/d--Taskmos-taskflow/memory/` — durable cross-session preferences and project facts.
- Update §21–§27 when the workflow itself changes — this is the source of truth, not the memory entries.
- Update §1–§20 when the architecture changes — re-run the project tour after big refactors.
