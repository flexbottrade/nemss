-- Add unique constraint to forum_read_status to ensure upsert works correctly
-- This prevents duplicate read status entries for the same user and topic
ALTER TABLE forum_read_status
ADD CONSTRAINT forum_read_status_user_topic_unique 
UNIQUE (user_id, topic_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_forum_read_status_user_topic 
ON forum_read_status(user_id, topic_id);