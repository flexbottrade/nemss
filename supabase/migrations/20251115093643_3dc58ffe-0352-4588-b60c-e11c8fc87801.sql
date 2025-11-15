-- Fix the trigger function to update based on nominee_id (profile id) not election_nominees.id
DROP TRIGGER IF EXISTS update_nominee_votes_count_trigger ON votes;
DROP FUNCTION IF EXISTS update_nominee_votes_count();

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
    WHERE nominee_id = NEW.nominee_id 
      AND election_id = NEW.election_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE election_nominees
    SET votes_count = votes_count - 1
    WHERE nominee_id = OLD.nominee_id 
      AND election_id = OLD.election_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_nominee_votes_count_trigger
AFTER INSERT OR DELETE ON votes
FOR EACH ROW
EXECUTE FUNCTION update_nominee_votes_count();

-- Sync existing votes to update vote counts
UPDATE election_nominees en
SET votes_count = (
  SELECT COUNT(*)
  FROM votes v
  WHERE v.nominee_id = en.nominee_id
    AND v.election_id = en.election_id
);