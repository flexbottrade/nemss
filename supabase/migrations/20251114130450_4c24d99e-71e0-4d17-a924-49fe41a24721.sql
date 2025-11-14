-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a new policy that allows users to update their own profile OR admins to update any profile
CREATE POLICY "Users can update own profile or admins can update any"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
);