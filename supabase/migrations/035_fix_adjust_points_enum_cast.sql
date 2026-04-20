-- ============================================================================
-- 035: Fix adjust_user_points — cast p_action TEXT → points_action enum
-- ============================================================================
-- The original RPC in migration 034 inserted `p_action` (TEXT) directly into
-- points_history.action which is a `points_action` ENUM column. Postgres
-- doesn't implicitly cast TEXT → enum inside plpgsql, so every RPC call
-- failed with "invalid input value for enum". Symptoms: points never credited,
-- "Failed to adjust points" surfaced in admin UI.
--
-- Fix: explicit `::points_action` cast at the INSERT site. The caller still
-- passes a plain string — the cast fails loud if the string isn't a valid
-- enum value, which is the desired behaviour.

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
    VALUES (p_user_id, p_delta, p_action::points_action, p_description, p_reference_type, p_reference_id);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;
