-- Add proof_type to tasks table (overrides task_type default)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_type TEXT NOT NULL DEFAULT 'both';
