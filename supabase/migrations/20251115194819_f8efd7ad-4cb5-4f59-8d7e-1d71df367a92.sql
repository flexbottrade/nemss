-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to track when users last read each topic/general
CREATE TABLE public.forum_read_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.forum_read_status ENABLE ROW LEVEL SECURITY;

-- Users can view their own read status
CREATE POLICY "Users can view own read status"
ON public.forum_read_status
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert own read status"
ON public.forum_read_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own read status
CREATE POLICY "Users can update own read status"
ON public.forum_read_status
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_forum_read_status_user_topic ON public.forum_read_status(user_id, topic_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_forum_read_status_updated_at
BEFORE UPDATE ON public.forum_read_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();