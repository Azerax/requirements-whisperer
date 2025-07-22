-- Remove all RLS policies permanently since no authentication is needed
DROP POLICY IF EXISTS "Users can manage audits for their repositories" ON public.audits;
DROP POLICY IF EXISTS "Users can view audits for their repositories" ON public.audits;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own repositories" ON public.repositories;
DROP POLICY IF EXISTS "Users can view their own repositories" ON public.repositories;
DROP POLICY IF EXISTS "Users can manage violations for their repositories" ON public.violations;
DROP POLICY IF EXISTS "Users can view violations for their repositories" ON public.violations;

-- Keep RLS disabled permanently
ALTER TABLE public.repositories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create a single default profile for "Unlovable"
INSERT INTO public.profiles (id, user_id, github_username) 
VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Unlovable')
ON CONFLICT (user_id) DO UPDATE SET github_username = 'Unlovable';

-- Update the helper function to always return the Unlovable user
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Always return the Unlovable user ID
  RETURN '11111111-1111-1111-1111-111111111111'::uuid;
END;
$$;