-- Adds 'none' to proof_type. Used by tasks that auto-submit without
-- explicit proof (currently: YouTube watch-video, where the in-app
-- player records completion when the YouTube IFrame API fires ENDED).
--
-- IMPORTANT: ALTER TYPE ADD VALUE cannot be used in the same transaction
-- as a statement that references the new value. Backfill UPDATEs live in
-- migration 045, which runs after this one commits.
ALTER TYPE proof_type ADD VALUE IF NOT EXISTS 'none';
