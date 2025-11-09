-- Ensure donation_payments has is_manually_updated field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'donation_payments' 
    AND column_name = 'is_manually_updated'
  ) THEN
    ALTER TABLE donation_payments 
    ADD COLUMN is_manually_updated boolean DEFAULT false;
  END IF;
END $$;