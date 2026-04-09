-- =============================================
-- TaskFlow Platform v2 - Major Update Migration
-- =============================================

-- 1. MULTIPLE PROOFS (arrays instead of single values)
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS proof_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS proof_screenshots TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing data from old columns to new arrays
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_assignments' AND column_name = 'proof_url') THEN
    UPDATE task_assignments SET proof_urls = ARRAY[proof_url] WHERE proof_url IS NOT NULL AND proof_url != '';
    UPDATE task_assignments SET proof_screenshots = ARRAY[proof_screenshot_url] WHERE proof_screenshot_url IS NOT NULL AND proof_screenshot_url != '';
    ALTER TABLE task_assignments DROP COLUMN proof_url;
    ALTER TABLE task_assignments DROP COLUMN proof_screenshot_url;
  END IF;
END $$;

-- 2. TASK IMAGES & URLS (optional reference materials when creating tasks)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS urls TEXT[] NOT NULL DEFAULT '{}';

-- 3. USER SIGNUP APPROVAL
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true;
INSERT INTO settings (key, value, category) VALUES ('require_user_approval', 'false', 'security')
  ON CONFLICT (key) DO NOTHING;

-- 4. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INT NOT NULL REFERENCES plans(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subs_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active, display_order);

INSERT INTO settings (key, value, category) VALUES ('require_subscription', 'false', 'security')
  ON CONFLICT (key) DO NOTHING;

-- Seed default plans
INSERT INTO plans (name, price, period, description, features, display_order) VALUES
  ('Free', 0, 'forever', 'Basic access for getting started', '["Up to 5 tasks/month", "Basic features", "Community support"]', 1),
  ('Pro', 29.99, 'monthly', 'For active teams and creators', '["Unlimited tasks", "Priority support", "Advanced analytics", "Custom branding"]', 2),
  ('Enterprise', 99.99, 'monthly', 'For large organizations', '["Everything in Pro", "Custom integrations", "Dedicated support", "SLA guarantee", "SSO/SAML"]', 3)
ON CONFLICT DO NOTHING;

-- 5. ENABLE RLS on new tables
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON plans FOR SELECT USING (is_active);
CREATE POLICY "user_subs_read_own" ON user_subscriptions FOR SELECT USING (user_id = auth.uid());
