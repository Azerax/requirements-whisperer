-- Temporarily disable RLS for testing purposes
ALTER TABLE public.repositories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create a function to check if current user exists in profiles
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile_id uuid;
BEGIN
  -- If no auth user, return a default UUID for testing
  IF auth.uid() IS NULL THEN
    RETURN '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  -- Check if profile exists for authenticated user
  SELECT id INTO user_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- If no profile exists, create one
  IF user_profile_id IS NULL THEN
    INSERT INTO public.profiles (user_id)
    VALUES (auth.uid())
    RETURNING id INTO user_profile_id;
  END IF;
  
  RETURN user_profile_id;
END;
$$;