-- Create forum_topics table for admin announcements
CREATE TABLE public.forum_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_polls table
CREATE TABLE public.forum_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_poll_options table
CREATE TABLE public.forum_poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.forum_polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_poll_votes table
CREATE TABLE public.forum_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.forum_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.forum_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_topics
CREATE POLICY "Anyone can view topics"
  ON public.forum_topics FOR SELECT
  USING (true);

CREATE POLICY "Only admins can create topics"
  ON public.forum_topics FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update topics"
  ON public.forum_topics FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete topics"
  ON public.forum_topics FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for forum_polls
CREATE POLICY "Anyone can view polls"
  ON public.forum_polls FOR SELECT
  USING (true);

CREATE POLICY "Only admins can create polls"
  ON public.forum_polls FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update polls"
  ON public.forum_polls FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete polls"
  ON public.forum_polls FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for forum_poll_options
CREATE POLICY "Anyone can view poll options"
  ON public.forum_poll_options FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage poll options"
  ON public.forum_poll_options FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for forum_poll_votes
CREATE POLICY "Users can view all votes"
  ON public.forum_poll_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own votes"
  ON public.forum_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update votes_count
CREATE OR REPLACE FUNCTION public.update_poll_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_poll_options
    SET votes_count = votes_count + 1
    WHERE id = NEW.option_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_poll_options
    SET votes_count = votes_count - 1
    WHERE id = OLD.option_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_poll_votes_count_trigger
AFTER INSERT OR DELETE ON public.forum_poll_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_poll_votes_count();

-- Trigger to update updated_at
CREATE TRIGGER update_forum_topics_updated_at
BEFORE UPDATE ON public.forum_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_forum_polls_updated_at
BEFORE UPDATE ON public.forum_polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();