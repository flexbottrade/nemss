-- Drop constraints if they exist and recreate them
ALTER TABLE donation_payments
  DROP CONSTRAINT IF EXISTS donation_payments_donation_id_fkey;

ALTER TABLE donation_payments
  DROP CONSTRAINT IF EXISTS donation_payments_user_id_fkey;

-- Add foreign key constraints to donation_payments table
ALTER TABLE donation_payments
  ADD CONSTRAINT donation_payments_donation_id_fkey 
  FOREIGN KEY (donation_id) 
  REFERENCES donations(id) 
  ON DELETE SET NULL;

ALTER TABLE donation_payments
  ADD CONSTRAINT donation_payments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;