-- Update existing profiles to set email_verified = true for users who have already confirmed their email
UPDATE public.profiles
SET email_verified = true
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL
);