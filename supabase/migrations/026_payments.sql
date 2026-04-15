-- ==========================================================================
-- Payments v1: admin-managed payment methods + point packages + submissions
-- ==========================================================================

-- Payment methods the admin accepts (bKash, Nagad, Bank, Crypto, etc.)
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'usd',   -- 'usd' | 'bdt'
  qr_code_url TEXT,
  instruction TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active, display_order);

-- Point packages users can buy from the plan page
CREATE TABLE IF NOT EXISTS point_packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  points DECIMAL(12,2) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_packages_active ON point_packages(is_active, display_order);

-- Every manual payment submission awaiting admin review
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,                  -- 'signup' | 'subscription' | 'points'
  plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
  package_id INT REFERENCES point_packages(id) ON DELETE SET NULL,
  points_amount DECIMAL(12,2),            -- for 'points' purpose
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_method_id INT REFERENCES payment_methods(id) ON DELETE SET NULL,
  transaction_id TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON payments(purpose);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_methods_public_read" ON payment_methods;
CREATE POLICY "payment_methods_public_read" ON payment_methods FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "point_packages_public_read" ON point_packages;
CREATE POLICY "point_packages_public_read" ON point_packages FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "payments_read_own" ON payments;
CREATE POLICY "payments_read_own" ON payments FOR SELECT USING (user_id = auth.uid());
