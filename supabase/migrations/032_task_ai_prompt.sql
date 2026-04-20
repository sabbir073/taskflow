-- AI prompt field on tasks — used for content-heavy task types
-- (comments, posts, captions, messages, etc.) so creators can provide a
-- prompt that users copy/paste into ChatGPT to generate the content.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_prompt TEXT;
