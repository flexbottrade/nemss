-- Add forum_username to profiles
ALTER TABLE public.profiles 
ADD COLUMN forum_username TEXT;

-- Add unique constraint for forum usernames
CREATE UNIQUE INDEX profiles_forum_username_unique ON public.profiles(forum_username) 
WHERE forum_username IS NOT NULL;

-- Add reply functionality to forum_posts
ALTER TABLE public.forum_posts
ADD COLUMN reply_to UUID REFERENCES public.forum_posts(id) ON DELETE SET NULL;

-- Add index for faster reply queries
CREATE INDEX forum_posts_reply_to_idx ON public.forum_posts(reply_to);