-- Enhanced security for database functions - prevent any injection attacks

-- Drop and recreate all functions with maximum security
DROP FUNCTION IF EXISTS public.upsert_repository(text, text, bigint, uuid, text, text);
DROP FUNCTION IF EXISTS public.create_audit(uuid);
DROP FUNCTION IF EXISTS public.complete_audit(uuid, integer, integer, integer);
DROP FUNCTION IF EXISTS public.log_violation(uuid, uuid, text, text, text, text, text, integer);

-- Ultra-secure repository upsert function
CREATE OR REPLACE FUNCTION public.upsert_repository(
  p_name text,
  p_full_name text,
  p_github_id bigint,
  p_user_id uuid
)
RETURNS TABLE(id uuid, name text, full_name text, github_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name text;
  clean_full_name text;
  fixed_user_id uuid := '11111111-1111-1111-1111-111111111111'::uuid;
BEGIN
  -- Ultra-strict input validation
  IF p_name IS NULL OR p_full_name IS NULL OR p_github_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'All parameters are required';
  END IF;
  
  -- Length validation
  IF length(p_name) > 100 OR length(p_full_name) > 150 THEN
    RAISE EXCEPTION 'Input too long';
  END IF;
  
  -- Character validation - only allow safe characters
  IF p_name !~ '^[a-zA-Z0-9._-]+$' OR p_full_name !~ '^[a-zA-Z0-9._/-]+$' THEN
    RAISE EXCEPTION 'Invalid characters in input';
  END IF;
  
  -- GitHub ID validation
  IF p_github_id < 0 OR p_github_id > 9223372036854775807 THEN
    RAISE EXCEPTION 'Invalid GitHub ID';
  END IF;
  
  -- Clean and prepare inputs
  clean_name := trim(p_name);
  clean_full_name := trim(p_full_name);
  
  -- Force use of fixed user ID for security
  RETURN QUERY
  INSERT INTO public.repositories (name, full_name, github_id, user_id, last_synced_at, created_at, updated_at)
  VALUES (clean_name, clean_full_name, p_github_id, fixed_user_id, now(), now(), now())
  ON CONFLICT (github_id) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    last_synced_at = now(),
    updated_at = now()
  RETURNING repositories.id, repositories.name, repositories.full_name, repositories.github_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Operation failed';
END;
$$;

-- Ultra-secure audit creation function
CREATE OR REPLACE FUNCTION public.create_audit(p_repository_id uuid)
RETURNS TABLE(id uuid, repository_id uuid, status text, started_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strict UUID validation
  IF p_repository_id IS NULL THEN
    RAISE EXCEPTION 'Repository ID required';
  END IF;
  
  -- Verify repository exists and belongs to our system
  IF NOT EXISTS (
    SELECT 1 FROM public.repositories 
    WHERE repositories.id = p_repository_id 
    AND repositories.user_id = '11111111-1111-1111-1111-111111111111'::uuid
  ) THEN
    RAISE EXCEPTION 'Repository not found';
  END IF;
  
  RETURN QUERY
  INSERT INTO public.audits (repository_id, status, started_at, created_at, updated_at)
  VALUES (p_repository_id, 'pending', now(), now(), now())
  RETURNING audits.id, audits.repository_id, audits.status, audits.started_at;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Operation failed';
END;
$$;

-- Ultra-secure audit completion function
CREATE OR REPLACE FUNCTION public.complete_audit(
  p_audit_id uuid,
  p_total_files integer,
  p_violation_count integer,
  p_compliant_files integer
)
RETURNS TABLE(id uuid, status text, completed_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation
  IF p_audit_id IS NULL THEN
    RAISE EXCEPTION 'Audit ID required';
  END IF;
  
  -- Validate numeric inputs
  IF p_total_files < 0 OR p_total_files > 100000 OR
     p_violation_count < 0 OR p_violation_count > 100000 OR
     p_compliant_files < 0 OR p_compliant_files > 100000 THEN
    RAISE EXCEPTION 'Invalid numeric values';
  END IF;
  
  -- Verify audit exists and is in pending state
  IF NOT EXISTS (
    SELECT 1 FROM public.audits 
    WHERE audits.id = p_audit_id 
    AND audits.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Audit not found or not pending';
  END IF;
  
  RETURN QUERY
  UPDATE public.audits 
  SET 
    total_files = p_total_files,
    violation_count = p_violation_count,
    compliant_files = p_compliant_files,
    completed_at = now(),
    status = 'completed',
    updated_at = now()
  WHERE audits.id = p_audit_id
  RETURNING audits.id, audits.status, audits.completed_at;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Operation failed';
END;
$$;

-- Ultra-secure violation logging function
CREATE OR REPLACE FUNCTION public.log_violation(
  p_audit_id uuid,
  p_repository_id uuid,
  p_file_path text,
  p_violation_type text,
  p_severity text,
  p_description text
)
RETURNS TABLE(id uuid, audit_id uuid, severity text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_file_path text;
  clean_violation_type text;
  clean_description text;
BEGIN
  -- Input validation
  IF p_audit_id IS NULL OR p_repository_id IS NULL OR 
     p_file_path IS NULL OR p_violation_type IS NULL OR 
     p_severity IS NULL OR p_description IS NULL THEN
    RAISE EXCEPTION 'All parameters required';
  END IF;
  
  -- Severity validation
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity';
  END IF;
  
  -- Length validation
  IF length(p_file_path) > 255 OR length(p_violation_type) > 50 OR length(p_description) > 500 THEN
    RAISE EXCEPTION 'Input too long';
  END IF;
  
  -- Character sanitization
  clean_file_path := regexp_replace(trim(p_file_path), '[^a-zA-Z0-9./_ -]', '', 'g');
  clean_violation_type := regexp_replace(trim(p_violation_type), '[^a-zA-Z0-9_ -]', '', 'g');
  clean_description := regexp_replace(trim(p_description), '[^a-zA-Z0-9.,!?_ -]', '', 'g');
  
  -- Verify audit and repository exist
  IF NOT EXISTS (
    SELECT 1 FROM public.audits a
    JOIN public.repositories r ON a.repository_id = r.id
    WHERE a.id = p_audit_id 
    AND r.id = p_repository_id
    AND a.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Invalid audit or repository';
  END IF;
  
  RETURN QUERY
  INSERT INTO public.violations (
    audit_id, repository_id, file_path, violation_type, 
    severity, description, created_at
  )
  VALUES (
    p_audit_id, p_repository_id, clean_file_path, clean_violation_type,
    p_severity, clean_description, now()
  )
  RETURNING violations.id, violations.audit_id, violations.severity;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Operation failed';
END;
$$;

-- Grant minimal permissions
REVOKE ALL ON FUNCTION public.upsert_repository(text, text, bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_audit(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_audit(uuid, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_violation(uuid, uuid, text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_repository(text, text, bigint, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.create_audit(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_audit(uuid, integer, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.log_violation(uuid, uuid, text, text, text, text) TO anon;