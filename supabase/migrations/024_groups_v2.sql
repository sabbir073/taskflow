-- Groups v2: cover image, status (active/suspended), deletion requests
ALTER TABLE groups ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deletion_request_reason TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deletion_requested_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_deletion_requested ON groups(deletion_requested) WHERE deletion_requested = true;
