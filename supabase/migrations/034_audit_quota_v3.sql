-- ============================================================================
-- 034: Quota carry-over, admin audit log, atomic points RPC
-- ============================================================================

-- 1. Quota carry-over columns -----------------------------------------------
-- When a user buys a new subscription before the previous one's quota is
-- fully used, the remainder is stored here on the NEW subscription and
-- surfaced by getQuota as an additive bonus on top of the base plan limit.
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS carry_over_tasks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carry_over_groups INTEGER NOT NULL DEFAULT 0;

-- 2. Admin audit log --------------------------------------------------------
-- Records every privileged mutation (role change, ban, payment review, etc.)
-- so an admin can audit who did what and when. Never blocks the originating
-- action if insert fails; the log is best-effort for forensics.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id SERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON admin_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

-- 3. Atomic points adjust ---------------------------------------------------
-- Kills the read-modify-write race where two parallel approvals could both
-- read the same balance and overwrite each other. The UPDATE + INSERT run
-- inside one transaction at the DB level; no application locking needed.
--
-- Positive delta = credit, negative = debit. Raises `insufficient_balance`
-- if the result would go below zero so the caller can reject cleanly.
CREATE OR REPLACE FUNCTION adjust_user_points(
  p_user_id UUID,
  p_delta NUMERIC,
  p_action TEXT,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE profiles
    SET total_points = total_points + p_delta
    WHERE user_id = p_user_id
    RETURNING total_points INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF new_balance < 0 THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO points_history (user_id, amount, action, description, reference_type, reference_id)
    VALUES (p_user_id, p_delta, p_action, p_description, p_reference_type, p_reference_id);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;
