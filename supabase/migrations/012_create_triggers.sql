-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER task_assignments_updated_at BEFORE UPDATE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER landing_content_updated_at BEFORE UPDATE ON landing_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update profile stats when task assignment is approved
CREATE OR REPLACE FUNCTION on_assignment_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.points_awarded IS NOT NULL THEN
    UPDATE profiles SET
      total_points = total_points + NEW.points_awarded,
      tasks_completed = tasks_completed + 1
    WHERE user_id = NEW.user_id;

    INSERT INTO points_history (user_id, amount, action, description, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      NEW.points_awarded,
      'task_completed',
      'Task completed and approved',
      'task_assignment',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignment_approved_trigger
  AFTER UPDATE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION on_assignment_approved();

-- Auto-create profile when user is created
CREATE OR REPLACE FUNCTION on_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, role, status)
  VALUES (NEW.id, 'user', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_created_profile_trigger
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION on_user_created();
