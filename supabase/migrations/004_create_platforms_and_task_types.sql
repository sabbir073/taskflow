-- Social media platforms
CREATE TABLE platforms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'globe',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform-specific task types
CREATE TABLE task_types (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof_type proof_type NOT NULL DEFAULT 'url',
  default_points INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform_id, slug)
);

CREATE INDEX idx_task_types_platform ON task_types(platform_id);
CREATE INDEX idx_task_types_active ON task_types(is_active);
CREATE INDEX idx_platforms_active ON platforms(is_active);
CREATE INDEX idx_platforms_order ON platforms(display_order);
