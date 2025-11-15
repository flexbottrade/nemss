-- Add unique constraint to prevent duplicate votes
ALTER TABLE votes ADD CONSTRAINT votes_election_voter_unique UNIQUE (election_id, voter_id);

-- Create function to update nominee votes count
CREATE OR REPLACE FUNCTION update_nominee_votes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE election_nominees
    SET votes_count = votes_count + 1
    WHERE id = NEW.nominee_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE election_nominees
    SET votes_count = votes_count - 1
    WHERE id = OLD.nominee_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for votes
DROP TRIGGER IF EXISTS update_nominee_votes_count_trigger ON votes;
CREATE TRIGGER update_nominee_votes_count_trigger
AFTER INSERT OR DELETE ON votes
FOR EACH ROW
EXECUTE FUNCTION update_nominee_votes_count();

-- Enable realtime for votes and election_nominees
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE election_nominees;
ALTER PUBLICATION supabase_realtime ADD TABLE elections;