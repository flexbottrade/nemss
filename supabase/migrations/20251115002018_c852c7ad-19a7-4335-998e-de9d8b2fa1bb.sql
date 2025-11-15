-- Drop the existing foreign key constraint
ALTER TABLE public.forum_posts 
DROP CONSTRAINT IF EXISTS forum_posts_user_id_fkey;

-- Add new foreign key constraint referencing profiles instead
ALTER TABLE public.forum_posts 
ADD CONSTRAINT forum_posts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;