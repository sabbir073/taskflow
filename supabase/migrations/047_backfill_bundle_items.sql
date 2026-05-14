-- ============================================================================
-- Backfill: every existing task -> bundle-of-1
-- Every existing assignment -> one assignment_item_submissions row mirroring
-- its current proof + status.
-- ============================================================================
-- Idempotent: re-running this is a no-op (guarded by NOT EXISTS subqueries
-- and the assignment_item_submissions UNIQUE constraint).

-- 1. Create one bundle item per task that doesn't already have one.
INSERT INTO task_bundle_items (task_id, task_type_id, sort_order, points, proof_type, item_data)
SELECT t.id,
       t.task_type_id,
       0,
       COALESCE(t.points_per_completion, 0),
       COALESCE(t.proof_type::text::proof_type, 'screenshot'::proof_type),
       COALESCE(t.task_data, '{}'::jsonb)
  FROM tasks t
 WHERE NOT EXISTS (
   SELECT 1 FROM task_bundle_items bi WHERE bi.task_id = t.id
 );

-- 2. For watch-video tasks, lift the legacy `watch_duration` (stored in
--    minutes in task_data) into the new seconds column. Strip the key from
--    item_data so it isn't shown twice in the UI.
UPDATE task_bundle_items bi
   SET watch_duration_sec = (bi.item_data->>'watch_duration')::int * 60,
       item_data = bi.item_data - 'watch_duration'
  FROM task_types tt
 WHERE tt.id = bi.task_type_id
   AND tt.slug = 'watch-video'
   AND bi.item_data ? 'watch_duration'
   AND bi.watch_duration_sec IS NULL;

-- 3. For every task_assignment, ensure there's an assignment_item_submissions
--    row mirroring its current state. UNIQUE(assignment_id, bundle_item_id)
--    makes this safe to re-run.
INSERT INTO assignment_item_submissions
  (assignment_id, bundle_item_id, status, proof_urls, proof_screenshots,
   proof_notes, submitted_at, reviewed_at, reviewed_by, points_awarded, rejection_reason)
SELECT a.id,
       bi.id,
       a.status,
       COALESCE(a.proof_urls, '{}'::text[]),
       COALESCE(a.proof_screenshots, '{}'::text[]),
       a.proof_notes,
       a.submitted_at,
       a.reviewed_at,
       a.reviewed_by,
       a.points_awarded,
       a.rejection_reason
  FROM task_assignments a
  JOIN task_bundle_items bi ON bi.task_id = a.task_id AND bi.sort_order = 0
ON CONFLICT (assignment_id, bundle_item_id) DO NOTHING;
