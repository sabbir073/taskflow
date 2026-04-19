-- ==========================================================================
-- Popup management: admin creates image/banner popups shown on the
-- public website or the user dashboard.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS popups (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  text_content TEXT,
  text_position TEXT NOT NULL DEFAULT 'bottom',  -- 'top' | 'bottom'
  target TEXT NOT NULL DEFAULT 'dashboard',       -- 'website' | 'dashboard'
  link_url TEXT,                                  -- optional click-through URL
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_popups_target ON popups(target, is_active, display_order);

ALTER TABLE popups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "popups_public_read" ON popups;
CREATE POLICY "popups_public_read" ON popups FOR SELECT USING (is_active = true);

-- Settings toggles (admin can turn popup display on/off globally)
INSERT INTO settings (key, value, category) VALUES ('enable_website_popup', 'true', 'general') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value, category) VALUES ('enable_dashboard_popup', 'true', 'general') ON CONFLICT (key) DO NOTHING;
