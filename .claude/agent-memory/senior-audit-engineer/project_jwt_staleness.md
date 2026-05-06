---
name: TaskFlow JWT auth caches role/status/is_approved for 24h
description: Where the auth state can drift from DB and how the codebase compensates
type: project
---

`auth.ts`'s `jwt` callback only reads `role`/`status`/`is_approved` from the DB on initial sign-in (when `user` is set). Session has `maxAge: 24*60*60`, so admins demoted mid-session keep admin power until the JWT expires.

The codebase mitigates **status drift** specifically by re-reading `profiles.status` from the DB inside `app/(dashboard)/layout.tsx` on every request, and proxy.ts notes "DO NOT use [JWT user.status] to route between /dashboard and /suspended — that would loop against the fresh-DB check." The single source of truth for active/suspended routing is the dashboard layout + `app/suspended/page.tsx`.

**Role** and **is_approved** drift have NOT been mitigated this way.

**How to apply:** When auditing role-gated paths, distinguish "page-level fresh DB check" from "JWT-cached role check." Don't propose moving status enforcement back into the proxy — that has been tried and creates a loop. Do flag missing fresh-DB checks for role-sensitive operations, especially admin-only mutations.
