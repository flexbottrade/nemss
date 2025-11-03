-- Add foreign key constraints to votes table if they don't exist
DO $$ 
BEGIN
    -- Add foreign key for election_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'votes_election_id_fkey' 
        AND table_name = 'votes'
    ) THEN
        ALTER TABLE votes 
        ADD CONSTRAINT votes_election_id_fkey 
        FOREIGN KEY (election_id) 
        REFERENCES elections(id) 
        ON DELETE CASCADE;
    END IF;

    -- Add foreign key for nominee_id referencing election_nominees(id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'votes_nominee_id_fkey' 
        AND table_name = 'votes'
    ) THEN
        ALTER TABLE votes 
        ADD CONSTRAINT votes_nominee_id_fkey 
        FOREIGN KEY (nominee_id) 
        REFERENCES election_nominees(id) 
        ON DELETE CASCADE;
    END IF;

    -- Add foreign key for voter_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'votes_voter_id_fkey' 
        AND table_name = 'votes'
    ) THEN
        ALTER TABLE votes 
        ADD CONSTRAINT votes_voter_id_fkey 
        FOREIGN KEY (voter_id) 
        REFERENCES profiles(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Create a global election settings table for controlling election visibility
CREATE TABLE IF NOT EXISTS election_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Insert default row if not exists
INSERT INTO election_settings (is_active)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM election_settings);

-- Enable RLS on election_settings
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view election settings
CREATE POLICY "Anyone can view election settings" 
ON election_settings 
FOR SELECT 
USING (true);

-- Policy: Only admins can update election settings
CREATE POLICY "Only admins can update election settings" 
ON election_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Make payment-proofs bucket public for viewing
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-proofs';