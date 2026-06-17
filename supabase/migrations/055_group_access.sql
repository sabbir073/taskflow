-- ===========================================================================
-- 055_group_access.sql
-- ---------------------------------------------------------------------------
-- WHY: Groups become a paid, admin-approved capability. A user applies for
-- group access (Apply for Group), optionally pays (auto-priced or admin-quoted),
-- an admin approves, and the user is promoted to group_leader with explicit
-- limits (max groups / members / tasks). This adds the application + grant
-- tables and seeds the pricing settings.
-- IMPACT: 2 new tables + up to 5 new settings rows. No existing rows changed.
-- ROLLBACK:
--   DROP TABLE IF EXISTS group_access_grants;
--   DROP TABLE IF EXISTS group_access_applications;
--   DELETE FROM settings WHERE key LIKE 'group_access_%';
-- ===========================================================================

-- Applications: one row per submission; status drives the user-side gate UI
-- and the admin review queue.
CREATE TABLE IF NOT EXISTS group_access_applications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_number TEXT,
  requested_groups INTEGER NOT NULL DEFAULT 1,
  requested_members INTEGER NOT NULL DEFAULT 0,
  requested_tasks INTEGER NOT NULL DEFAULT 0,
  -- Snapshot of the pricing mode at apply time ('auto' | 'admin').
  pricing_mode TEXT NOT NULL DEFAULT 'admin',
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'usd',
  -- Payment is captured on the application itself in v1 (no payments-table row).
  payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  -- awaiting_quote | awaiting_payment | pending_review | approved | rejected
  status TEXT NOT NULL DEFAULT 'pending_review',
  -- Admin-confirmed limits granted on approval (fall back to requested_* if null).
  granted_groups INTEGER,
  granted_members INTEGER,
  granted_tasks INTEGER,
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_access_apps_user ON group_access_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_group_access_apps_status ON group_access_applications(status, created_at DESC);

-- Grants: the active entitlement. One active grant per user (unique user_id).
CREATE TABLE IF NOT EXISTS group_access_grants (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  max_groups INTEGER NOT NULL DEFAULT 1,
  max_members INTEGER NOT NULL DEFAULT 0,
  max_tasks INTEGER NOT NULL DEFAULT 0,
  application_id INTEGER REFERENCES group_access_applications(id) ON DELETE SET NULL,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_access_grants_user ON group_access_grants(user_id);

-- updated_at trigger on applications (reuses the generic update_updated_at fn).
DROP TRIGGER IF EXISTS trg_group_access_apps_updated_at ON group_access_applications;
CREATE TRIGGER trg_group_access_apps_updated_at
  BEFORE UPDATE ON group_access_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Pricing settings (category 'general' so they surface in the /settings UI).
INSERT INTO settings (key, value, category) VALUES
  ('group_access_pricing_mode', '"admin"', 'general'),
  ('group_access_rate_per_group', '50', 'general'),
  ('group_access_rate_per_member', '5', 'general'),
  ('group_access_rate_per_task', '10', 'general'),
  ('group_access_base_price', '0', 'general')
ON CONFLICT (key) DO NOTHING;
