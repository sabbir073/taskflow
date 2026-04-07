-- Additional composite indexes for common query patterns

-- Dashboard: recent submissions for admin review
CREATE INDEX idx_assignments_status_submitted ON task_assignments(status, submitted_at DESC)
  WHERE status = 'submitted';

-- Dashboard: user's active tasks
CREATE INDEX idx_assignments_user_active ON task_assignments(user_id, status)
  WHERE status IN ('pending', 'in_progress');

-- Leaderboard: active users ranked by points
CREATE INDEX idx_profiles_active_points ON profiles(total_points DESC)
  WHERE status = 'active';

-- Tasks: active tasks with deadline
CREATE INDEX idx_tasks_active_deadline ON tasks(deadline ASC NULLS LAST)
  WHERE status IN ('pending', 'in_progress');

-- Notifications: unread count per user
CREATE INDEX idx_notifications_unread ON notifications(user_id)
  WHERE is_read = false;
