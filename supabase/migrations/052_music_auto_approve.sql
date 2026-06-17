-- ============================================================================
-- 052_music_auto_approve.sql
-- ----------------------------------------------------------------------------
-- WHY: Reference §7's 5th music-play-lock requirement says music streams
--   should auto-approve on MusicPlayLockModal completion (no admin review).
--   Per user decision (Entry #11), we implement auto-approve with a SAFETY NET:
--   admin can REVERSE the auto-approval within 24h if they detect fraud.
--
-- IMPACT:
--   * assignment_item_submissions: +4 columns to mark auto-approval state and
--     allow time-bounded reverse (auto_approved_at, auto_approve_reversed_at,
--     auto_approve_reversed_by, auto_approve_reverse_reason).
--   * One partial index to query "auto-approvals still reversible" cheaply.
--   * One RPC reverse_auto_approved_item(item_submission_id, reviewer_id,
--     reason) that flips status back to 'rejected', debits the worker,
--     refunds the task budget, writes a points_history entry, and stamps the
--     reverse metadata. Refuses outside the 24h window.
--
-- ROLLBACK:
--   ALTER TABLE assignment_item_submissions DROP COLUMN auto_approved_at, ...;
--   DROP FUNCTION reverse_auto_approved_item;
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / CREATE
--   OR REPLACE FUNCTION. Safe to re-run.
-- ============================================================================

-- 1. Reverse-tracking columns -------------------------------------------------
ALTER TABLE assignment_item_submissions
  ADD COLUMN IF NOT EXISTS auto_approved_at          TIMESTAMPTZ;
ALTER TABLE assignment_item_submissions
  ADD COLUMN IF NOT EXISTS auto_approve_reversed_at  TIMESTAMPTZ;
ALTER TABLE assignment_item_submissions
  ADD COLUMN IF NOT EXISTS auto_approve_reversed_by  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE assignment_item_submissions
  ADD COLUMN IF NOT EXISTS auto_approve_reverse_reason TEXT;

-- Partial index — fast lookup for "still-reversible auto-approvals". Used by
-- the admin reverse list (not yet wired in UI as of migration 052).
CREATE INDEX IF NOT EXISTS idx_aim_auto_approve_pending_reverse
  ON assignment_item_submissions(auto_approved_at)
  WHERE auto_approved_at IS NOT NULL
    AND auto_approve_reversed_at IS NULL;


-- 2. RPC: reverse_auto_approved_item ----------------------------------------
-- Admin-facing. Caller-side enforces the 'staff role' check; this function
-- enforces only state-machine + 24h-window invariants. Atomic: status flip +
-- worker debit + task-budget refund + points_history entry all run in one
-- transaction.
CREATE OR REPLACE FUNCTION reverse_auto_approved_item(
  p_item_submission_id INT,
  p_reviewer_id        UUID,
  p_reason             TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item          RECORD;
  v_submitter_id  UUID;
  v_task_id       INT;
  v_assignment_id INT;
  v_points        DECIMAL(12,2);
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- Load context. We need: current status, points_awarded, submitter, task,
  -- assignment, and the auto-approve timing flags.
  SELECT ais.id, ais.status, ais.points_awarded, ais.auto_approved_at,
         ais.auto_approve_reversed_at, ais.assignment_id,
         ta.user_id AS submitter_id, ta.task_id
  INTO v_item
  FROM assignment_item_submissions ais
  JOIN task_assignments ta ON ta.id = ais.assignment_id
  WHERE ais.id = p_item_submission_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  IF v_item.auto_approved_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_auto_approved');
  END IF;

  IF v_item.auto_approve_reversed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'already_reversed');
  END IF;

  IF v_item.auto_approved_at + INTERVAL '24 hours' < v_now THEN
    RETURN jsonb_build_object('success', false, 'code', 'window_expired');
  END IF;

  v_submitter_id  := v_item.submitter_id;
  v_task_id       := v_item.task_id;
  v_assignment_id := v_item.assignment_id;
  v_points        := COALESCE(v_item.points_awarded, 0);

  -- 1. Flip item-submission status + stamp the reverse metadata
  UPDATE assignment_item_submissions
     SET status                      = 'rejected',
         rejection_reason            = p_reason,
         auto_approve_reversed_at    = v_now,
         auto_approve_reversed_by    = p_reviewer_id,
         auto_approve_reverse_reason = p_reason,
         updated_at                  = v_now
   WHERE id = p_item_submission_id;

  -- 2. Debit worker's wallet (subtract what they were credited)
  IF v_points > 0 THEN
    UPDATE profiles
       SET total_points     = total_points - v_points,
           tasks_completed  = GREATEST(0, tasks_completed - 1),
           updated_at       = v_now
     WHERE user_id = v_submitter_id;

    -- 3. Refund the task budget (the points are no longer "spent")
    UPDATE tasks
       SET points_spent = GREATEST(0, points_spent - v_points),
           updated_at   = v_now
     WHERE id = v_task_id;

    -- 4. Ledger entry — log the reversal so future audits can trace the debit
    INSERT INTO points_history (user_id, amount, action, description, reference_type, reference_id)
    VALUES (
      v_submitter_id,
      -v_points,
      'penalty',
      'Auto-approve reversed: ' || p_reason,
      'task_assignment',
      v_assignment_id::text
    );
  END IF;

  -- 5. Roll the parent assignment back from 'approved' if it had finalised
  -- on this item. Anything else (still in_progress, submitted, etc.) leave
  -- alone — only the FINAL approval state is invalidated by reverting one
  -- of its children.
  UPDATE task_assignments
     SET status         = 'rejected',
         rejection_reason = p_reason,
         reviewed_at    = v_now,
         reviewed_by    = p_reviewer_id,
         updated_at     = v_now
   WHERE id = v_assignment_id
     AND status = 'approved';

  RETURN jsonb_build_object('success', true, 'reversed_at', v_now);
END;
$$;
