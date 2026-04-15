-- Group rules visible to all members
ALTER TABLE groups ADD COLUMN IF NOT EXISTS rules TEXT;
