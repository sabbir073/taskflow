-- 041_submit_proof_atomic.sql
-- Race-safe proof submission for capacity-limited tasks.
--
-- The previous JS flow read filledBefore via two queries, validated
-- against tasks.max_completions, then issued a separate UPDATE on the
-- assignment. Two concurrent submitters could both observe
-- filledBefore = max - 1 and both transition to 'submitted', exceeding
-- the cap and over-spending point_budget.
--
-- This function performs the count-and-update inside a single
-- transaction with a row-level lock on the parent task. Any concurrent
-- caller waits behind the lock and re-evaluates capacity after the
-- previous transaction commits — exactly N submitters can win on a
-- task with max_completions = N.
--
-- Returns a JSON envelope:
--   { success: true,  cancelled_remaining: <int> }
--   { success: false, code: 'not_found' | 'wrong_status' | 'cap_reached' }
--
-- Caller still validates auth, ownership, subscription, suspension,
-- proof-type requirements, and emits notifications. Only the cap+update
-- becomes atomic.

CREATE OR REPLACE FUNCTION public.submit_proof_if_capacity(
  p_assignment_id INT,
  p_proof_urls TEXT[],
  p_proof_screenshots TEXT[],
  p_proof_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_task_id INT;
  v_status assignment_status;
  v_max INT;
  v_filled INT;
  v_cancelled INT := 0;
BEGIN
  -- Resolve the assignment's task + current status without locking it
  -- yet — the meaningful lock is on the parent task row, which
  -- serialises all submissions for the same task.
  SELECT task_id, status INTO v_task_id, v_status
  FROM task_assignments
  WHERE id = p_assignment_id;

  IF v_task_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  IF v_status NOT IN ('in_progress', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'code', 'wrong_status');
  END IF;

  -- Take a row-level lock on the task. Concurrent submissions for the
  -- same task queue here; submissions for other tasks proceed in
  -- parallel.
  SELECT max_completions INTO v_max FROM tasks WHERE id = v_task_id FOR UPDATE;

  IF v_max IS NULL THEN
    v_max := 0; -- treat NULL as "no cap" for safety
  END IF;

  -- Count under the lock — value can't change until this transaction
  -- commits.
  IF v_max > 0 THEN
    SELECT COUNT(*) INTO v_filled
    FROM task_assignments
    WHERE task_id = v_task_id AND status IN ('submitted', 'approved');

    IF v_filled >= v_max THEN
      RETURN jsonb_build_object('success', false, 'code', 'cap_reached');
    END IF;
  END IF;

  -- Atomically transition to submitted while still holding the lock.
  UPDATE task_assignments
  SET    status = 'submitted',
         proof_urls = p_proof_urls,
         proof_screenshots = p_proof_screenshots,
         proof_notes = p_proof_notes,
         submitted_at = now()
  WHERE  id = p_assignment_id
    AND  status IN ('in_progress', 'rejected');

  -- If this submission filled the last slot, cancel remaining open
  -- assignments for this task so users don't waste effort on closed
  -- work.
  IF v_max > 0 AND v_filled + 1 >= v_max THEN
    WITH cancelled AS (
      UPDATE task_assignments
      SET    status = 'cancelled'
      WHERE  task_id = v_task_id
        AND  status IN ('pending', 'in_progress')
      RETURNING id
    )
    SELECT COUNT(*) INTO v_cancelled FROM cancelled;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_remaining', COALESCE(v_cancelled, 0)
  );
END;
$$;
