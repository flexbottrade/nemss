-- Create function to check if user is financial secretary
CREATE OR REPLACE FUNCTION public.is_financial_secretary(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'financial_secretary'
  )
$$;