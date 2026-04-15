-- Appeals submitted by suspended users requesting reinstatement
CREATE TABLE IF NOT EXISTS suspension_appeals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  category TEXT NOT NULL,
  category_other TEXT,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  accepted_terms BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appeals_user ON suspension_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON suspension_appeals(status, created_at DESC);

ALTER TABLE suspension_appeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appeals_read_own" ON suspension_appeals;
CREATE POLICY "appeals_read_own" ON suspension_appeals FOR SELECT USING (user_id = auth.uid());
