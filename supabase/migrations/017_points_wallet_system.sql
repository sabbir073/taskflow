-- =============================================
-- Points Wallet & User Task Creation System
-- =============================================

-- 1. Change points from INTEGER to DECIMAL across all tables
ALTER TABLE profiles ALTER COLUMN total_points TYPE DECIMAL(12,2) USING total_points::DECIMAL(12,2);
ALTER TABLE profiles ALTER COLUMN total_points SET DEFAULT 0.00;

ALTER TABLE tasks ALTER COLUMN points TYPE DECIMAL(12,2) USING points::DECIMAL(12,2);
ALTER TABLE tasks ALTER COLUMN points SET DEFAULT 0.00;

ALTER TABLE task_assignments ALTER COLUMN points_awarded TYPE DECIMAL(12,2) USING points_awarded::DECIMAL(12,2);

ALTER TABLE points_history ALTER COLUMN amount TYPE DECIMAL(12,2) USING amount::DECIMAL(12,2);

-- 2. Add task budget fields (wallet/transaction model)
ALTER TABLE tasks ADD COLUMN point_budget DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE tasks ADD COLUMN points_per_completion DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE tasks ADD COLUMN points_spent DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- 3. Add task approval status for user-created tasks
-- 'approved' = live, 'pending_approval' = waiting admin, 'rejected_by_admin' = denied
ALTER TABLE tasks ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved';

-- 4. Update the trigger to handle decimal points and wallet deduction
CREATE OR REPLACE FUNCTION on_assignment_approved()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  creator_id UUID;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get task details
    SELECT points_per_completion, points_spent, point_budget, created_by
    INTO task_record
    FROM tasks WHERE id = NEW.task_id;

    -- Check if budget allows
    IF task_record.points_spent + task_record.points_per_completion > task_record.point_budget THEN
      RAISE EXCEPTION 'Task budget exhausted';
    END IF;

    -- Set points awarded
    NEW.points_awarded := task_record.points_per_completion;

    -- Credit the completer
    UPDATE profiles SET
      total_points = total_points + task_record.points_per_completion,
      tasks_completed = tasks_completed + 1
    WHERE user_id = NEW.user_id;

    -- Track points spent on the task
    UPDATE tasks SET
      points_spent = points_spent + task_record.points_per_completion
    WHERE id = NEW.task_id;

    -- Log credit to completer
    INSERT INTO points_history (user_id, amount, action, description, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      task_record.points_per_completion,
      'task_completed',
      'Task completed and approved',
      'task_assignment',
      NEW.id::text
    );

    -- Log debit from creator wallet (already deducted on task creation, this is just the ledger)
    INSERT INTO points_history (user_id, amount, action, description, reference_type, reference_id)
    VALUES (
      task_record.created_by,
      -task_record.points_per_completion,
      'task_completed',
      'Points paid for task completion',
      'task_assignment',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger (DROP + CREATE to replace)
DROP TRIGGER IF EXISTS assignment_approved_trigger ON task_assignments;
CREATE TRIGGER assignment_approved_trigger
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION on_assignment_approved();

-- 5. Give Super Admin some initial points to work with
UPDATE profiles SET total_points = 10000.00 WHERE role = 'super_admin';
