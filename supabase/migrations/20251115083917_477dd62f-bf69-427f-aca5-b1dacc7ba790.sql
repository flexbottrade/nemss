-- Add topic_id to forum_posts to isolate chats by topic (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'forum_posts' 
    AND column_name = 'topic_id'
  ) THEN
    ALTER TABLE public.forum_posts ADD COLUMN topic_id uuid REFERENCES public.forum_topics(id) ON DELETE CASCADE;
    CREATE INDEX idx_forum_posts_topic_id ON public.forum_posts(topic_id);
  END IF;
END $$;