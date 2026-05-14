-- ============================================================================
-- Phase 3 — convert existing image_url required_fields to type='image'
-- ============================================================================
-- Migration 049 already writes new image fields with type='image'. This
-- migration backfills the legacy seed (013) so old Pinterest / Instagram /
-- etc. tasks render their image fields as upload widgets too.
--
-- Matches required_fields entries whose `name` is one of:
--   image_url, photo_url, screenshot_url, cover_url, avatar_url
-- (with or without the _url suffix) and whose current type is 'url'.
-- Idempotent: rows already at type='image' stay as-is.

UPDATE task_types
SET required_fields = (
  SELECT jsonb_agg(
    CASE
      WHEN field->>'type' = 'url'
        AND field->>'name' ~ '^(image|photo|screenshot|cover|avatar)(_url)?$'
        THEN jsonb_set(field, '{type}', '"image"'::jsonb)
      ELSE field
    END
  )
  FROM jsonb_array_elements(required_fields) AS field
)
WHERE required_fields::text ~ '"name":\s*"(image|photo|screenshot|cover|avatar)(_url)?"';
