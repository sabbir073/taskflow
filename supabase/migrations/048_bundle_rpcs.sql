-- ============================================================================
-- Bundle-aware RPCs
-- Replaces the single-assignment-scoped submit_proof_if_capacity with three
-- functions:
--   - submit_item_proof_if_capacity: per-item submission with bundle-wide
--                                    capacity enforcement.
--   - approve_item_and_finalize:     per-item approval; pays the bundle
--                                    completion bonus + flips parent to
--                                    'approved' when the last item lands.
--   - reject_item:                   per-item rejection; flips parent to
--                                    'rejected' + fires the existing
--                                    apply_rejection_penalty_if_threshold
--                                    when every item is rejected.
-- ============================================================================

-- Drop the single-row variant — the new per-item function supersedes it. The
-- TS-side server actions are updated in lockstep to call the new function.
DROP FUNCTION IF EXISTS submit_proof_if_capacity(INT, TEXT[], TEXT[], TEXT);

-- ----------------------------------------------------------------------------
-- submit_item_proof_if_capacity
-- ----------------------------------------------------------------------------
-- Atomically:
--   1. Lock the parent task row.
--   2. If THIS submission would promote the parent assignment to 'submitted'
--      (i.e., this is the last in-flight item for the bundle) AND the
--      capacity is already filled, refuse with code='cap_reached'.
--   3. Upsert the item submission (proof + status='submitted').
--   4. Recompute parent assignment.status: 'submitted' once every item has
--      status IN ('submitted','approved'); else leave it at the prior state.
--   5. If the parent just became 'submitted' AND that filled the last slot,
--      cancel every sibling assignment that was still pending / in_progress.
-- Returns: { success: bool, code: text, parent_status: text, cancelled_remaining: int }
-- Error codes: 'not_found' | 'wrong_status' | 'cap_reached'
CREATE OR REPLACE FUNCTION submit_item_proof_if_capacity(
  p_assignment_id     INT,
  p_bundle_item_id    INT,
  p_proof_urls        TEXT[],
  p_proof_screenshots TEXT[],
  p_proof_notes       TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_task_id            INT;
  v_max                INT;
  v_filled_slots       INT;
  v_total_items        INT;
  v_submitted_after    INT;
  v_parent_status      TEXT;
  v_current_item_status TEXT;
  v_promote_to_submit  BOOLEAN := false;
  v_cancelled          INT := 0;
BEGIN
  -- Look up the parent assignment + task; bail if missing.
  SELECT task_id, status INTO v_task_id, v_parent_status
    FROM task_assignments
   WHERE id = p_assignment_id;

  IF v_task_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  -- Row-lock the parent task so concurrent submitters can't race past the
  -- capacity cap.
  PERFORM 1 FROM tasks WHERE id = v_task_id FOR UPDATE;

  SELECT max_completions INTO v_max FROM tasks WHERE id = v_task_id;

  -- Current state of THIS item
  SELECT status INTO v_current_item_status
    FROM assignment_item_submissions
   WHERE assignment_id = p_assignment_id
     AND bundle_item_id = p_bundle_item_id;

  -- This item must not be in a terminal state (approved / cancelled).
  IF v_current_item_status IN ('approved', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'code', 'wrong_status');
  END IF;

  -- Count of every bundle item for the parent task and how many would be
  -- in {submitted, approved} AFTER this submission.
  SELECT COUNT(*) INTO v_total_items
    FROM task_bundle_items
   WHERE task_id = v_task_id;

  SELECT COUNT(*) INTO v_submitted_after
    FROM assignment_item_submissions
   WHERE assignment_id = p_assignment_id
     AND (
       (bundle_item_id = p_bundle_item_id) -- the one we're about to write
       OR status IN ('submitted', 'approved')
     );

  v_promote_to_submit := (v_submitted_after >= v_total_items);

  -- Capacity check fires only when this submission would FILL the bundle
  -- (i.e., promote parent to 'submitted'). Partial submissions don't occupy
  -- a slot.
  IF v_promote_to_submit AND v_max IS NOT NULL AND v_max > 0 THEN
    SELECT COUNT(*) INTO v_filled_slots
      FROM task_assignments
     WHERE task_id = v_task_id
       AND status IN ('submitted', 'approved')
       AND id <> p_assignment_id;
    IF v_filled_slots >= v_max THEN
      RETURN jsonb_build_object('success', false, 'code', 'cap_reached');
    END IF;
  END IF;

  -- Upsert the per-item submission. status='submitted' regardless of whether
  -- it was previously in_progress or rejected (resubmission case).
  INSERT INTO assignment_item_submissions
    (assignment_id, bundle_item_id, status, proof_urls, proof_screenshots,
     proof_notes, submitted_at)
  VALUES
    (p_assignment_id, p_bundle_item_id, 'submitted', COALESCE(p_proof_urls, '{}'),
     COALESCE(p_proof_screenshots, '{}'), p_proof_notes, now())
  ON CONFLICT (assignment_id, bundle_item_id) DO UPDATE
    SET status            = 'submitted',
        proof_urls        = EXCLUDED.proof_urls,
        proof_screenshots = EXCLUDED.proof_screenshots,
        proof_notes       = EXCLUDED.proof_notes,
        submitted_at      = now(),
        -- Reset review fields on resubmission so admin sees a fresh review.
        reviewed_at       = NULL,
        reviewed_by       = NULL,
        rejection_reason  = NULL;

  -- Recompute parent status based on the children.
  IF v_promote_to_submit THEN
    UPDATE task_assignments
       SET status       = 'submitted',
           submitted_at = COALESCE(submitted_at, now())
     WHERE id = p_assignment_id
       AND status NOT IN ('approved', 'cancelled');
    v_parent_status := 'submitted';

    -- Sibling cancellation if this filled the LAST slot.
    IF v_max IS NOT NULL AND v_max > 0 THEN
      SELECT COUNT(*) INTO v_filled_slots
        FROM task_assignments
       WHERE task_id = v_task_id
         AND status IN ('submitted', 'approved');
      IF v_filled_slots >= v_max THEN
        UPDATE task_assignments
           SET status = 'cancelled'
         WHERE task_id = v_task_id
           AND id <> p_assignment_id
           AND status IN ('pending', 'in_progress');
        GET DIAGNOSTICS v_cancelled = ROW_COUNT;

        -- Cascade the cancel to in-flight item submissions on those siblings.
        UPDATE assignment_item_submissions ais
           SET status = 'cancelled'
         WHERE ais.assignment_id IN (
                 SELECT id FROM task_assignments
                  WHERE task_id = v_task_id
                    AND status = 'cancelled'
                    AND id <> p_assignment_id
               )
           AND ais.status IN ('pending', 'in_progress');
      END IF;
    END IF;
  ELSE
    -- Parent stays in_progress (some items still pending submission).
    -- Make sure it's marked at least in_progress (it may have been 'pending').
    UPDATE task_assignments
       SET status = 'in_progress'
     WHERE id = p_assignment_id
       AND status = 'pending';
    IF v_parent_status = 'pending' THEN
      v_parent_status := 'in_progress';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'parent_status', v_parent_status,
    'cancelled_remaining', v_cancelled
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- approve_item_and_finalize
-- ----------------------------------------------------------------------------
-- Atomically:
--   1. Mark the item 'approved' (idempotent — guarded by points_awarded IS NULL).
--   2. Credit the worker the item's points via adjust_user_points.
--   3. Bump tasks.points_spent by the item's points.
--   4. If THIS approval was the last item:
--      - flip parent assignment to 'approved'
--      - pay completion_bonus (if > 0) via a second adjust_user_points call
--      - bump tasks.points_spent by completion_bonus
--      - bump submitter's profiles.tasks_completed by 1
--      - mirror the parent's denormalised points_awarded (sum of items + bonus)
-- Returns: { success: bool, code: text, bonus_paid: bool, points_credited: numeric }
CREATE OR REPLACE FUNCTION approve_item_and_finalize(
  p_item_submission_id INT,
  p_reviewer_id        UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_assignment_id    INT;
  v_bundle_item_id   INT;
  v_task_id          INT;
  v_submitter_id     UUID;
  v_item_status      TEXT;
  v_item_points      NUMERIC(12,2);
  v_already_credited NUMERIC(12,2);
  v_task_title       TEXT;
  v_type_name        TEXT;
  v_bonus            NUMERIC(12,2);
  v_total_items      INT;
  v_approved_count   INT;
  v_bonus_paid       BOOLEAN := false;
  v_credited         NUMERIC(12,2) := 0;
  v_parent_total     NUMERIC(12,2);
BEGIN
  SELECT ais.assignment_id, ais.bundle_item_id, ais.status, ais.points_awarded,
         bi.points, ta.user_id, ta.task_id, t.title, t.completion_bonus, tt.name
    INTO v_assignment_id, v_bundle_item_id, v_item_status, v_already_credited,
         v_item_points, v_submitter_id, v_task_id, v_task_title, v_bonus, v_type_name
    FROM assignment_item_submissions ais
    JOIN task_bundle_items bi ON bi.id = ais.bundle_item_id
    JOIN task_assignments ta  ON ta.id = ais.assignment_id
    JOIN tasks t              ON t.id = ta.task_id
    JOIN task_types tt        ON tt.id = bi.task_type_id
   WHERE ais.id = p_item_submission_id;

  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  -- Idempotency guard: if this item already paid out, no-op.
  IF v_item_status = 'approved' AND v_already_credited IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'already_approved');
  END IF;

  IF v_item_status NOT IN ('submitted', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'code', 'wrong_status');
  END IF;

  -- Row-lock the parent task so concurrent approvals don't double-credit
  -- the bundle bonus.
  PERFORM 1 FROM tasks WHERE id = v_task_id FOR UPDATE;

  -- Mark item approved
  UPDATE assignment_item_submissions
     SET status         = 'approved',
         points_awarded = v_item_points,
         reviewed_at    = now(),
         reviewed_by    = p_reviewer_id,
         rejection_reason = NULL
   WHERE id = p_item_submission_id;

  -- Credit the worker for this item
  IF v_item_points > 0 THEN
    PERFORM adjust_user_points(
      v_submitter_id,
      v_item_points,
      'task_completed',
      v_task_title || COALESCE(' — ' || v_type_name, ''),
      'assignment_item',
      p_item_submission_id::text
    );
    v_credited := v_credited + v_item_points;
  END IF;

  UPDATE tasks
     SET points_spent = COALESCE(points_spent, 0) + v_item_points
   WHERE id = v_task_id;

  -- Did this approval finalise the bundle?
  SELECT COUNT(*) INTO v_total_items
    FROM task_bundle_items
   WHERE task_id = v_task_id;

  SELECT COUNT(*) INTO v_approved_count
    FROM assignment_item_submissions
   WHERE assignment_id = v_assignment_id
     AND status = 'approved';

  IF v_approved_count >= v_total_items THEN
    -- Flip parent assignment to approved + pay bonus.
    UPDATE task_assignments
       SET status      = 'approved',
           reviewed_at = now(),
           reviewed_by = p_reviewer_id
     WHERE id = v_assignment_id
       AND status <> 'approved';

    IF v_bonus IS NOT NULL AND v_bonus > 0 THEN
      PERFORM adjust_user_points(
        v_submitter_id,
        v_bonus,
        'milestone',
        v_task_title || ' — Bundle completion bonus',
        'bundle_bonus',
        v_assignment_id::text
      );
      UPDATE tasks
         SET points_spent = COALESCE(points_spent, 0) + v_bonus
       WHERE id = v_task_id;
      v_credited := v_credited + v_bonus;
      v_bonus_paid := true;
    END IF;

    -- Bump the submitter's "tasks completed" counter once per bundle.
    UPDATE profiles
       SET tasks_completed = COALESCE(tasks_completed, 0) + 1
     WHERE user_id = v_submitter_id;

    -- Denormalise parent.points_awarded = sum of item points + bonus.
    SELECT COALESCE(SUM(points_awarded), 0) INTO v_parent_total
      FROM assignment_item_submissions
     WHERE assignment_id = v_assignment_id
       AND status = 'approved';
    UPDATE task_assignments
       SET points_awarded = v_parent_total + COALESCE(v_bonus, 0)
     WHERE id = v_assignment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bonus_paid', v_bonus_paid,
    'points_credited', v_credited,
    'parent_finalized', (v_approved_count >= v_total_items)
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- reject_item
-- ----------------------------------------------------------------------------
-- Marks the item 'rejected'. If every item for the parent assignment is now
-- rejected, flip the parent to 'rejected' and fire the existing rejection
-- penalty function (which is task-level, idempotent on points_history).
CREATE OR REPLACE FUNCTION reject_item(
  p_item_submission_id INT,
  p_reviewer_id        UUID,
  p_reason             TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_assignment_id   INT;
  v_task_id         INT;
  v_submitter_id    UUID;
  v_item_status     TEXT;
  v_total_items     INT;
  v_rejected_count  INT;
  v_all_rejected    BOOLEAN := false;
BEGIN
  SELECT ais.assignment_id, ais.status, ta.user_id, ta.task_id
    INTO v_assignment_id, v_item_status, v_submitter_id, v_task_id
    FROM assignment_item_submissions ais
    JOIN task_assignments ta ON ta.id = ais.assignment_id
   WHERE ais.id = p_item_submission_id;

  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  IF v_item_status NOT IN ('submitted') THEN
    RETURN jsonb_build_object('success', false, 'code', 'wrong_status');
  END IF;

  PERFORM 1 FROM tasks WHERE id = v_task_id FOR UPDATE;

  UPDATE assignment_item_submissions
     SET status            = 'rejected',
         rejection_reason  = p_reason,
         reviewed_at       = now(),
         reviewed_by       = p_reviewer_id,
         points_awarded    = NULL
   WHERE id = p_item_submission_id;

  -- Is every item now rejected?
  SELECT COUNT(*) INTO v_total_items
    FROM task_bundle_items
   WHERE task_id = v_task_id;

  SELECT COUNT(*) INTO v_rejected_count
    FROM assignment_item_submissions
   WHERE assignment_id = v_assignment_id
     AND status = 'rejected';

  IF v_rejected_count >= v_total_items THEN
    v_all_rejected := true;
    UPDATE task_assignments
       SET status            = 'rejected',
           rejection_reason  = p_reason,
           reviewed_at       = now(),
           reviewed_by       = p_reviewer_id
     WHERE id = v_assignment_id;
    -- Fire the existing penalty-threshold function. Idempotent at task level.
    PERFORM apply_rejection_penalty_if_threshold(v_task_id, v_submitter_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'all_rejected', v_all_rejected
  );
END;
$$;
