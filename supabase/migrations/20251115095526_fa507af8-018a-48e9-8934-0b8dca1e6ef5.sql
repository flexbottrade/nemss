-- Enable realtime for forum_topics table
ALTER TABLE public.forum_topics REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_topics;