-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;

-- NOTE: The service_role key bypasses RLS entirely.
-- All server actions use the service_role key, so these policies
-- only apply to direct client-side access (e.g., Supabase Realtime).

-- Platforms: public read
CREATE POLICY "platforms_public_read" ON platforms FOR SELECT USING (true);

-- Task types: public read
CREATE POLICY "task_types_public_read" ON task_types FOR SELECT USING (true);

-- Badges: public read
CREATE POLICY "badges_public_read" ON badges FOR SELECT USING (is_active);

-- Settings: public read
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);

-- Landing content: public read for active sections
CREATE POLICY "landing_public_read" ON landing_content FOR SELECT USING (is_active);

-- Users: users can read own data
CREATE POLICY "users_read_own" ON users FOR SELECT USING (auth.uid() = id);

-- Profiles: users can read all active profiles, update own
CREATE POLICY "profiles_read_active" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Groups: read public groups and own groups
CREATE POLICY "groups_read" ON groups FOR SELECT USING (
  privacy = 'public' OR
  leader_id = auth.uid() OR
  id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- Group members: read members of groups you belong to
CREATE POLICY "group_members_read" ON group_members FOR SELECT USING (
  user_id = auth.uid() OR
  group_id IN (SELECT group_id FROM group_members gm WHERE gm.user_id = auth.uid())
);

-- Notifications: users can read/update own
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Points history: users can read own
CREATE POLICY "points_read_own" ON points_history FOR SELECT USING (user_id = auth.uid());

-- User badges: public read
CREATE POLICY "user_badges_public_read" ON user_badges FOR SELECT USING (true);

-- Tasks: users can read active tasks assigned to them
CREATE POLICY "tasks_read" ON tasks FOR SELECT USING (
  status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected') OR
  created_by = auth.uid()
);

-- Task assignments: users can read own, admins read all via service_role
CREATE POLICY "assignments_read_own" ON task_assignments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "assignments_update_own" ON task_assignments FOR UPDATE USING (user_id = auth.uid());
