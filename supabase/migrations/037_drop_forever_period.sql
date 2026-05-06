-- 037_drop_forever_period.sql
-- Forever-period plans are being retired in favour of bounded billing
-- windows (monthly / half_yearly / yearly). This migration normalises any
-- legacy rows so the application code can drop its forever branches
-- without losing data on rows that still carry the old value.
--
-- Idempotent: re-running is a no-op once the rows are normalised.

-- 1) Convert any subscription rows still tagged forever into a yearly window
--    starting at the original starts_at (or now() if missing). expires_at is
--    set to one year from that anchor so the row has a real boundary.
UPDATE user_subscriptions
SET    period_type = 'yearly',
       expires_at  = COALESCE(starts_at, now()) + INTERVAL '1 year'
WHERE  period_type = 'forever';

-- 2) Convert any plan rows still tagged forever into yearly. Admins can
--    re-price them via the plans UI if needed.
UPDATE plans
SET    period = 'yearly'
WHERE  period = 'forever';
