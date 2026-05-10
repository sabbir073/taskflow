-- Backfill: existing Watch Video task type and any tasks created from it
-- should no longer require a screenshot now that proof_type='none' exists.
-- Newly-created task instances will pick up the new default from the
-- updated seed in 013_seed_platforms.

UPDATE task_types
   SET proof_type = 'none'
 WHERE platform_id = (SELECT id FROM platforms WHERE slug = 'youtube')
   AND slug = 'watch-video';

UPDATE tasks
   SET proof_type = 'none'
 WHERE task_type_id IN (
   SELECT id FROM task_types
    WHERE platform_id = (SELECT id FROM platforms WHERE slug = 'youtube')
      AND slug = 'watch-video'
 );
