---
name: TaskFlow QA conventions
description: How validation, gating, and error reporting are structured in TaskFlow — and where the gaps tend to be
type: project
---

Conventions to assume when auditing this codebase:

- **Validation split:** Server actions use `zod` schemas (e.g. `lib/actions/notices.ts` `noticeSchema`, `lib/actions/users.ts` `profileUpdateSchema`). Client forms use `react-hook-form` + zod resolver. The two are not always in sync — admin-only actions sometimes skip the client zod schema entirely, doing only inline checks (e.g. `users-table.tsx` AssignPlanModal, points-modal).
- **Permission gating:** Sidebar items filter by `hasPermission(role, perm)` (`lib/constants/roles.ts`); pages call `requireRole`/`requireAuth`; actions check `session.user.role`. All three layers must be checked when reviewing a new admin feature.
- **Error UX:** Many server actions wrap in `try { ... } catch { return { success: false, error: "Failed to X" } }`. The original error is dropped, so client toasts say "Failed to update" with no detail. Useful to flag when a precise error matters (e.g. file upload, payment).
- **Mobile vs desktop:** Recently the team has been adding parallel mobile (`sm:hidden`) and desktop (`hidden sm:block`) layouts in the same component (see `leaderboard-view.tsx`) rather than separate components. Verify both sides when auditing a recently-touched layout.

**Why:** Avoids re-discovering the same patterns each audit; lets findings target the layer where the gap actually lives.

**How to apply:** When asked to evaluate a feature, scan all three layers (route guard, action guard, hook) and note whichever is missing. When a UI issue mentions "mobile", check both halves of the same component before assuming it's only one side.
