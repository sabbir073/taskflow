-- ============================================================================
-- 036: Contact form submissions (landing /contact)
-- ============================================================================
-- Captures messages from the public contact form on the landing page so
-- admins can triage/respond instead of emails getting lost. Stores the IP
-- and user agent for abuse review. Status transitions: unread -> read ->
-- archived. Admin-only CRUD (enforced in application code; RLS is bypassed
-- by the service role anyway).

CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  admin_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  handled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_submissions(email);
