-- ==========================================================================
-- Plans v2: structured limits + currency + final Basic/Standard/Premium seed
-- ==========================================================================
ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'usd';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_tasks INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_groups INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS included_credits DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS support_level TEXT NOT NULL DEFAULT 'none';

-- Deactivate the old Free/Pro/Enterprise seed (kept for historical subscriptions)
UPDATE plans SET is_active = false WHERE name IN ('Free', 'Pro', 'Enterprise');

-- Seed the final Basic / Standard / Premium plans (idempotent — skip if already present)
INSERT INTO plans (name, price, currency, period, description, features, max_tasks, max_groups, included_credits, support_level, is_active, display_order)
SELECT 'Basic', 199, 'bdt', 'monthly', 'Essential features to get started',
       '["10 tasks","3 groups","50 credits"]'::jsonb, 10, 3, 50, 'none', true, 1
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Basic');

INSERT INTO plans (name, price, currency, period, description, features, max_tasks, max_groups, included_credits, support_level, is_active, display_order)
SELECT 'Standard', 499, 'bdt', 'monthly', 'More tasks with community support',
       '["20 tasks","5 groups","200 credits","Community support"]'::jsonb, 20, 5, 200, 'community', true, 2
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Standard');

INSERT INTO plans (name, price, currency, period, description, features, max_tasks, max_groups, included_credits, support_level, is_active, display_order)
SELECT 'Premium', 999, 'bdt', 'monthly', 'Unlock premium features and priority support',
       '["30 tasks","10 groups","500 credits","Priority support"]'::jsonb, 30, 10, 500, 'priority', true, 3
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Premium');
