-- 038_rejection_penalty_atomic.sql
-- Race-safe rejection penalty.
--
-- Two admins rejecting different assignments for the same (task, user)
-- concurrently could both observe `count = 3` after their respective
-- UPDATEs and each fire a -5 penalty, double-charging the user. This
-- migration introduces an atomic helper that:
--
--   1. Takes a row-level lock on the user's profile so only one caller
--      can be adjusting that user's points at a time.
--   2. Counts current rejected assignments for (task_id, user_id).
--   3. Bails if not exactly 3 (matching the existing JS semantics: fire
--      once, on the third rejection).
--   4. Bails if a penalty for this (task_id, user_id) was already
--      recorded — keyed on reference_type='task_rejection_penalty' and
--      reference_id=task_id::text — so retries are idempotent.
--   5. Calls adjust_user_points with -5 if balance allows, otherwise the
--      remaining positive balance (so the user lands on 0 rather than
--      going negative).
--
-- The JS caller (`reviewAssignment` in lib/actions/assignments.ts)
-- replaces its count + if + rpc + balance-check block with a single
-- invocation of this function.

CREATE OR REPLACE FUNCTION public.apply_rejection_penalty_if_threshold(
  p_task_id INT,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  rejection_count INT;
  existing_penalty INT;
  current_balance NUMERIC;
BEGIN
  -- Serialise concurrent attempts on the same user. The lock is held for
  -- the duration of the transaction; once released, any waiting caller
  -- will re-read the count + existing-penalty rows and see the updates
  -- the previous caller committed.
  PERFORM 1 FROM profiles WHERE user_id = p_user_id FOR UPDATE;

  SELECT COUNT(*) INTO rejection_count
  FROM task_assignments
  WHERE task_id = p_task_id AND user_id = p_user_id AND status = 'rejected';

  IF rejection_count <> 3 THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO existing_penalty
  FROM points_history
  WHERE user_id = p_user_id
    AND reference_type = 'task_rejection_penalty'
    AND reference_id = p_task_id::text;

  IF existing_penalty > 0 THEN
    RETURN;
  END IF;

  SELECT total_points INTO current_balance FROM profiles WHERE user_id = p_user_id;
  IF current_balance IS NULL THEN
    RETURN;
  END IF;

  IF current_balance >= 5 THEN
    PERFORM adjust_user_points(
      p_user_id,
      -5,
      'task_rejected',
      'Penalty: 3+ rejections on same task',
      'task_rejection_penalty',
      p_task_id::text
    );
  ELSIF current_balance > 0 THEN
    PERFORM adjust_user_points(
      p_user_id,
      -current_balance,
      'task_rejected',
      'Penalty: 3+ rejections (partial — balance too low)',
      'task_rejection_penalty',
      p_task_id::text
    );
  END IF;
END;
$$;
