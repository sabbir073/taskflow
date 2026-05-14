-- ============================================================================
-- Bundle tasks (Phase 2)
-- ============================================================================
-- A task is no longer 1:1 with a task_type. Each task carries a list of
-- "bundle items" — each item has its own task_type, points, proof_type,
-- per-item required-field values, and (for watch-video) a watch_duration.
--
-- Worker submissions are also per-item: assignment_item_submissions has one
-- row per (assignment, bundle_item) with its own status / proof arrays /
-- approval.
--
-- This migration only adds the new shapes; the backfill (047) and RPCs (048)
-- come in separate files to keep each one short and re-runnable.

-- Per-task list of action items the worker must do.
CREATE TABLE IF NOT EXISTS task_bundle_items (
  id                  SERIAL PRIMARY KEY,
  task_id             INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_type_id        INTEGER NOT NULL REFERENCES task_types(id),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  points              DECIMAL(12,2) NOT NULL DEFAULT 0,
  proof_type          proof_type NOT NULL DEFAULT 'screenshot',
  item_data           JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Only used when task_types.slug = 'watch-video'. NULL means
  -- "fall back to legacy ENDED-state auto-submit" (old behavior).
  watch_duration_sec  INTEGER,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_bundle_items_task_id_idx ON task_bundle_items(task_id);
CREATE INDEX IF NOT EXISTS task_bundle_items_sort_idx ON task_bundle_items(task_id, sort_order);

-- One row per (assignment, bundle_item). Holds the worker's proof for that
-- specific item plus admin's per-item review verdict. The parent
-- task_assignments row stays — it represents the bundle as a whole and its
-- status is derived from the children: `in_progress` until all items are
-- submitted, `submitted` once they all are, `approved` once they're all
-- approved (which is also when the bundle completion bonus pays out).
CREATE TABLE IF NOT EXISTS assignment_item_submissions (
  id                SERIAL PRIMARY KEY,
  assignment_id     INTEGER NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  bundle_item_id    INTEGER NOT NULL REFERENCES task_bundle_items(id) ON DELETE CASCADE,
  status            assignment_status NOT NULL DEFAULT 'in_progress',
  proof_urls        TEXT[] NOT NULL DEFAULT '{}'::text[],
  proof_screenshots TEXT[] NOT NULL DEFAULT '{}'::text[],
  proof_notes       TEXT,
  submitted_at      TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES users(id),
  points_awarded    DECIMAL(12,2),
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, bundle_item_id)
);
CREATE INDEX IF NOT EXISTS ais_assignment_id_idx ON assignment_item_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS ais_status_idx ON assignment_item_submissions(status);
CREATE INDEX IF NOT EXISTS ais_bundle_item_idx ON assignment_item_submissions(bundle_item_id);

-- updated_at trigger to mirror the rest of the schema
DROP TRIGGER IF EXISTS trg_task_bundle_items_updated_at ON task_bundle_items;
CREATE TRIGGER trg_task_bundle_items_updated_at
  BEFORE UPDATE ON task_bundle_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_ais_updated_at ON assignment_item_submissions;
CREATE TRIGGER trg_ais_updated_at
  BEFORE UPDATE ON assignment_item_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Bundle completion bonus — paid to the worker only when every item in the
-- bundle gets admin approval. 0 disables the bonus.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completion_bonus DECIMAL(12,2) NOT NULL DEFAULT 0;
