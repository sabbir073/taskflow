-- ==========================================================================
-- Support ticket system
-- ==========================================================================

-- Per-plan toggle: whether users on this plan can access support tickets.
-- Admin configures this from the plan management UI.
-- Values: 'none' | 'medium' | 'high'
--   none   = no access (e.g. Basic plan)
--   medium = can create tickets with Medium priority (e.g. Standard)
--   high   = can create tickets with High priority (e.g. Premium)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS support_ticket_access TEXT NOT NULL DEFAULT 'none';

-- Backfill the three seeded plans
UPDATE plans SET support_ticket_access = 'none'   WHERE name = 'Basic'    AND support_ticket_access = 'none';
UPDATE plans SET support_ticket_access = 'medium'  WHERE name = 'Standard' AND support_ticket_access = 'none';
UPDATE plans SET support_ticket_access = 'high'    WHERE name = 'Premium'  AND support_ticket_access = 'none';

-- The tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',   -- 'low' | 'medium' | 'high' | 'urgent'
  status TEXT NOT NULL DEFAULT 'open',       -- 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket replies / messages (thread)
CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments TEXT[] NOT NULL DEFAULT '{}',
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_read_own" ON support_tickets;
CREATE POLICY "tickets_read_own" ON support_tickets FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "messages_read_own_ticket" ON ticket_messages;
CREATE POLICY "messages_read_own_ticket" ON ticket_messages FOR SELECT
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));
