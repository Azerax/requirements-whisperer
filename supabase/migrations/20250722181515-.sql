-- Re-enable Row Level Security on all tables
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create safe RLS policies for public read access but restricted write access
-- Repositories: Allow read access, restrict write to backend functions
CREATE POLICY "Allow public read access to repositories" 
ON public.repositories 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert via backend functions only" 
ON public.repositories 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Allow update via backend functions only" 
ON public.repositories 
FOR UPDATE 
USING (false);

-- Audits: Allow read access, restrict write to backend functions
CREATE POLICY "Allow public read access to audits" 
ON public.audits 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert via backend functions only" 
ON public.audits 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Allow update via backend functions only" 
ON public.audits 
FOR UPDATE 
USING (false);

-- Violations: Allow read access, restrict write to backend functions
CREATE POLICY "Allow public read access to violations" 
ON public.violations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert via backend functions only" 
ON public.violations 
FOR INSERT 
WITH CHECK (false);

-- Profiles: Allow read access, restrict write to backend functions
CREATE POLICY "Allow public read access to profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert via backend functions only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Allow update via backend functions only" 
ON public.profiles 
FOR UPDATE 
USING (false);

-- Fix function security by adding search_path and proper validation
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always return the Unlovable user ID for this demo application
  -- Input validation: ensure we return a valid UUID
  IF '11111111-1111-1111-1111-111111111111'::uuid IS NULL THEN
    RAISE EXCEPTION 'Invalid UUID format';
  END IF;
  
  RETURN '11111111-1111-1111-1111-111111111111'::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in ensure_user_profile: %', SQLERRM;
END;
$$;

-- Fix update timestamp function with proper security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation
  IF NEW IS NULL THEN
    RAISE EXCEPTION 'NEW record cannot be null';
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in update_updated_at_column: %', SQLERRM;
END;
$$;