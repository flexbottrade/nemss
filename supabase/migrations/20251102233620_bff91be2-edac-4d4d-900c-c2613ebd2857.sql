-- Fix search_path for security functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, first_name, last_name, phone_number, member_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'member_id', '')
  );
  
  -- Check if this is the admin email and assign admin role
  IF NEW.email = 'nemss09set@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Assign member role to all other users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix search_path for generate_member_id function
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  new_member_id TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(member_id FROM 10) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.profiles;
  
  new_member_id := 'NEMSS09S' || LPAD(next_number::TEXT, 3, '0');
  RETURN new_member_id;
END;
$$;

-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;