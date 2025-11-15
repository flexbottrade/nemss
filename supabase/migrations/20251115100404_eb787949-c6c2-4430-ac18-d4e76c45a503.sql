-- Drop the old check constraint if it exists
ALTER TABLE public.elections DROP CONSTRAINT IF EXISTS elections_status_check;

-- Add new check constraint that allows 'active', 'concluded', and 'cancelled'
ALTER TABLE public.elections 
ADD CONSTRAINT elections_status_check 
CHECK (status IN ('active', 'concluded', 'cancelled'));