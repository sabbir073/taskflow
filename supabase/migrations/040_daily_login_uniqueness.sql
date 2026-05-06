-- 040_daily_login_uniqueness.sql
-- Race-safe daily-login bonus.
--
-- Two concurrent calls to awardDailyLoginBonus (e.g. user with two open
-- browser tabs both firing on first-render) currently both pass the JS
-- pre-check (SELECT existing row → none → award) before either has
-- committed its INSERT. The result: two `daily_login` rows for the same
-- UTC day and the user collects the bonus twice.
--
-- This migration adds a unique partial index keyed on
-- (user_id, action, UTC-day-bucket) restricted to action = 'daily_login'.
-- The second concurrent INSERT fails with 23505 (unique_violation); the
-- JS caller swallows that as `{ awarded: false }`.
--
-- Idempotent: re-running is a no-op once the index exists.

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_history_daily_login_unique
ON public.points_history (
  user_id,
  action,
  ((created_at AT TIME ZONE 'UTC')::date)
)
WHERE action = 'daily_login';
