-- 042_rebrand_taskmos.sql
-- ----------------------------------------------------------------------------
-- Rebrand: TaskFlow -> TaskMOS (Task Marketing Operating System).
-- Idempotent: only updates rows that still carry the old brand strings.
-- Forward-only — rollback would require reversing the same UPDATE statements.

-- Site name displayed in the Logo component (when settings.site_name is read)
-- and in invoice headers.
UPDATE settings
   SET value = '"TaskMOS"'::jsonb
 WHERE key = 'site_name'
   AND value::text IN ('"TaskFlow"', 'TaskFlow');

-- Site description (was truncated/empty). Set to the full positioning line.
UPDATE settings
   SET value = '"Task Marketing Operating System"'::jsonb
 WHERE key = 'site_description';

-- Migrate the seeded super-admin email so it matches the new domain.
UPDATE users
   SET email = REPLACE(email, '@taskflow.com', '@taskmos.com')
 WHERE email LIKE '%@taskflow.com';
