-- Add 'cancelled' to assignment_status for tasks that reached max completions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cancelled'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assignment_status')
  ) THEN
    ALTER TYPE assignment_status ADD VALUE 'cancelled';
  END IF;
END $$;
