---
name: TaskFlow recurring QA gaps
description: Patterns of bugs/UX gaps that show up repeatedly in this codebase — useful as a checklist
type: project
---

When auditing TaskFlow features, these gap patterns recur:

1. **Client uploads accept anything.** `profile-view.tsx` `handleAvatarUpload` does no client-side type/size check before POSTing to `/api/upload`. Server enforces (`app/api/upload/route.ts`), but UX is "select 50MB video → spinner → server reject → vague toast". Audit any file picker for client-side `accept`/size validation.
2. **Stale form values inside async handlers.** Same `handleAvatarUpload` calls `updateProfile({ name: sessionUser.name })` — uses session name, not the latest react-hook-form value, so an unsaved name change in the form gets overwritten with the old session name when the user changes avatar.
3. **Admin row-action menus omit role variants.** `users-table.tsx` action menu offers Make Admin / Make Member but no "Make Group Leader" — even though `group_leader` is a valid role and is exposed in the role *filter* dropdown.
4. **Generic catch-all error swallowing.** Many server actions end with `catch { return { success: false, error: "Failed to X" } }`. Real errors (constraint violations, RLS denials) become indistinguishable from network blips in the UI.
5. **Toggle Active vs Save Edit lifecycle.** Notices manager toggles `is_active` via the same hook as edits; if the user is mid-edit and toggles, the in-progress edit text isn't saved (predictable but worth flagging).
6. **Date math during render.** Profile view originally used `Date.now()` directly in render (now wrapped in `useMemo`). The Strict-Mode "purity" rule flags this; future PRs may regress it elsewhere — check any `daysLeft`/`isExpired` computation in render.

**Why:** Saves having to re-derive the same observations on every audit pass.

**How to apply:** Use as a quick checklist when reviewing a new feature touch in users-table, profile-view, notices, plans, or any file-upload path.
