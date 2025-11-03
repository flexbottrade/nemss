-- Fix finance_adjustments check constraint to allow 'income' and 'expense'
ALTER TABLE finance_adjustments DROP CONSTRAINT IF EXISTS finance_adjustments_adjustment_type_check;
ALTER TABLE finance_adjustments ADD CONSTRAINT finance_adjustments_adjustment_type_check 
  CHECK (adjustment_type IN ('income', 'expense'));

-- Add foreign key for votes.nominee_id to election_nominees.id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'votes_nominee_id_fkey'
  ) THEN
    ALTER TABLE votes ADD CONSTRAINT votes_nominee_id_fkey 
      FOREIGN KEY (nominee_id) REFERENCES election_nominees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for votes.election_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'votes_election_id_fkey'
  ) THEN
    ALTER TABLE votes ADD CONSTRAINT votes_election_id_fkey 
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE;
  END IF;
END $$;