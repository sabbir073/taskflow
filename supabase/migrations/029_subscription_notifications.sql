-- Flags to track which lifecycle notifications have been dispatched so we
-- don't send duplicates on every dashboard load.
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS notified_expiring_7d BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS notified_expiring_1d BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS notified_expired BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_subs_expires ON user_subscriptions(expires_at) WHERE status = 'active';
