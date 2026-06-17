---
name: finding-getpendingapprovalusers-ungated
description: lib/actions/users.ts getPendingApprovalUsers has no auth()/role gate — any authenticated user can enumerate pending-signup PII via direct server-action call
metadata:
  type: project
---

`getPendingApprovalUsers` in `lib/actions/users.ts` (~line 791) is the ONE privileged action in users.ts that lacks an `auth()` + `isStaffRole` gate. Every other action in that file self-guards; this one starts straight at `getServerClient()`.

**Why it matters:** Server actions are invocable by any logged-in client regardless of whether a hook/component calls them (currently zero callers — found via grep). Because the action uses the service-role client (RLS bypass — see [[project_taskflow_architecture]]), a plain `user` could POST to it and read every pending signup's name + email + image (PII leak / user enumeration).

**How to apply:** Flag as HIGH on any auth audit. Fix = prepend the same guard the sibling actions use:
`const session = await auth(); if (!session?.user?.id || !isStaffRole(session.user.role)) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };`

Found 2026-05-29 audit. Re-verify it's still ungated before recommending (someone may have patched it).
