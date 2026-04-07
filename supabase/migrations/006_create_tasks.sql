-- Tasks created by admins
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  task_type_id INTEGER NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT,
  task_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  points INTEGER NOT NULL DEFAULT 10,
  priority task_priority NOT NULL DEFAULT 'medium',
  deadline TIMESTAMPTZ,
  status task_status NOT NULL DEFAULT 'draft',
  target_type assignment_target NOT NULL DEFAULT 'all_users',
  target_group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_type recurring_type,
  recurring_end_date TIMESTAMPTZ,
  max_completions INTEGER,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User task assignments (one per user per task)
CREATE TABLE task_assignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status assignment_status NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  proof_screenshot_url TEXT,
  proof_notes TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  points_awarded INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_platform ON tasks(platform_id);
CREATE INDEX idx_tasks_task_type ON tasks(task_type_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_target_group ON tasks(target_group_id);
CREATE INDEX idx_tasks_target_user ON tasks(target_user_id);
CREATE INDEX idx_tasks_recurring ON tasks(is_recurring);
CREATE INDEX idx_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_assignments_user ON task_assignments(user_id);
CREATE INDEX idx_assignments_status ON task_assignments(status);
CREATE INDEX idx_assignments_submitted ON task_assignments(submitted_at);
CREATE INDEX idx_assignments_task_user ON task_assignments(task_id, user_id);
CREATE INDEX idx_assignments_user_status ON task_assignments(user_id, status);
