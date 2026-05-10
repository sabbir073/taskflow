-- Adds the 'moderator' role to user_role. Moderators sit between admin and
-- group_leader: they can review submissions, manage tasks, broadcast, manage
-- users (but not promote anyone), approve signups, manage notices, and
-- manage payments. They cannot access system_settings, landing-page edit,
-- popups, appeals, audit logs, or plan CRUD.
--
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction.
-- Keep this migration in its own file with no other DDL above it so the
-- supabase CLI / migration runner runs it standalone.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator' BEFORE 'group_leader';
