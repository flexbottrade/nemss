-- First, delete any duplicate rows, keeping only the most recent one
DELETE FROM forum_read_status a
USING forum_read_status b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND (a.topic_id = b.topic_id OR (a.topic_id IS NULL AND b.topic_id IS NULL));

-- Drop the constraint if it exists (in case previous migration partially succeeded)
ALTER TABLE forum_read_status
DROP CONSTRAINT IF EXISTS forum_read_status_user_topic_unique;

-- Add unique constraint to forum_read_status to ensure upsert works correctly
ALTER TABLE forum_read_status
ADD CONSTRAINT forum_read_status_user_topic_unique 
UNIQUE (user_id, topic_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_forum_read_status_user_topic 
ON forum_read_status(user_id, topic_id);