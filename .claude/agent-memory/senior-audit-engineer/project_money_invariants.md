---
name: project-money-invariants
description: How money/points flow through TaskMOS — wallet RPC, payment review claim-revert pattern, subscription quota math, group-access grants. Read before auditing payments/plans/points.
metadata:
  type: project
---

Money + points invariants for TaskMOS, learned auditing lib/actions/payments.ts, plans.ts, points.ts, group-access.ts, subscription-check.ts (2026-05).

**Wallet RPC `adjust_user_points`** (supabase/migrations/035): single source of truth for credit/debit. It is a blind `UPDATE profiles SET total_points += delta` + `INSERT points_history`. **NOT idempotent** — no dedupe on `(reference_type, reference_id)`. So any caller that can run twice for the same logical event double-credits. This is the root cause behind the payment-retry double-credit class.

**`reviewPayment` (Entry #38 claim→deliver→revert)**: atomically claims the row (`update status WHERE status='pending'` + check rowsAffected), then runs value-delivery (deactivate old sub → insert sub → credit RPC → signup approve), each guarded by `{error}` → on failure calls `revertPaymentClaim` (status back to pending). **The revert pattern is unsafe when a downstream step fails AFTER the non-idempotent credit RPC already committed** — admin retry re-credits. Worst case = signup payment with included_credits where the `is_approved` update fails post-credit.

**Subscription quota math** (subscription-check.ts): `limit = plan.max_X * periodMultiplier(period_type) + carry_over_X`. `used = COUNT(table) WHERE created_by=user AND created_at >= sub.starts_at`. Staff bypass via `isStaffRole`. `getQuota`/`computeRemainingQuota`/`getMyQuotaUsage` MUST stay in lockstep — they each recompute the same formula independently (drift risk).

**Group access (NEW, migration 055, lib/actions/group-access.ts)**: paid+admin-approved capability. `group_access_grants` has UNIQUE(user_id). `resolveGroupAccess` precedence: staff → active grant → active subscription → none. Status machine: awaiting_quote → awaiting_payment → pending_review → approved/rejected. Review is `isAdminRole`-only (admin, not moderator). Owner check on payForGroupApplication via `a.user_id === session.user.id`.

**`subscribe()` in plans.ts is self-service with NO payment + NO require_subscription/admin gate** — any authed user calls it to grant themselves an active subscription. Verify whether it's wired to UI/exposed; if reachable it's a free-subscription hole.

**Invoices = payments table.** invoices.ts reads `payments`; `updateInvoiceStatus` delegates approve/reject to `reviewPayment`. Direct-status branch (un-reject etc.) bypasses value delivery by design.
