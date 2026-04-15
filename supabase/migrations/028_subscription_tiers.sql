-- ==========================================================================
-- Subscription tiers: monthly / half-yearly / yearly pricing per plan
-- ==========================================================================
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(12,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_half_yearly DECIMAL(12,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(12,2);

-- Which tier was purchased (for subscriptions)
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS period_type TEXT;

-- Seed the three final plans with multi-period prices (idempotent — only fills
-- rows that don't already have tier prices so admin edits aren't clobbered)
UPDATE plans SET
  price_monthly = COALESCE(price_monthly, 199),
  price_half_yearly = COALESCE(price_half_yearly, 1074),
  price_yearly = COALESCE(price_yearly, 1910)
WHERE name = 'Basic';

UPDATE plans SET
  price_monthly = COALESCE(price_monthly, 499),
  price_half_yearly = COALESCE(price_half_yearly, 2695),
  price_yearly = COALESCE(price_yearly, 4790)
WHERE name = 'Standard';

UPDATE plans SET
  price_monthly = COALESCE(price_monthly, 999),
  price_half_yearly = COALESCE(price_half_yearly, 5395),
  price_yearly = COALESCE(price_yearly, 9590)
WHERE name = 'Premium';

-- Backfill the base 'price' column for any plan still missing a monthly price
UPDATE plans SET price_monthly = price WHERE price_monthly IS NULL;
