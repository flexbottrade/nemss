-- Add super_admin to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Create a helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
      AND email = 'nemss09set@gmail.com'
  )
$$;