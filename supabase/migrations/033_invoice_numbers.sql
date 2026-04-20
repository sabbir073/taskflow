-- Human-readable invoice numbers on payments: "INV-YYYY-000042"

ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

CREATE OR REPLACE FUNCTION set_invoice_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(COALESCE(NEW.created_at, NOW()), 'YYYY') || '-' || LPAD(NEW.id::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_number_trigger ON payments;
CREATE TRIGGER set_invoice_number_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- Backfill existing rows
UPDATE payments
SET invoice_number = 'INV-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(id::TEXT, 6, '0')
WHERE invoice_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments(invoice_number);
