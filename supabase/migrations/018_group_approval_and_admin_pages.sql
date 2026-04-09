-- Add approval_status to groups (same pattern as tasks)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
-- 'approved' = live, 'pending_approval' = waiting admin, 'rejected_by_admin' = denied
