-- Create secure functions for database operations to bypass RLS restrictions

-- Function to upsert repository securely
CREATE OR REPLACE FUNCTION public.upsert_repository(
  p_name text,
  p_full_name text,
  p_github_id bigint,
  p_user_id uuid,
  p_description text DEFAULT NULL,
  p_url text DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, full_name text, github_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation
  IF p_name IS NULL OR p_full_name IS NULL OR p_github_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Name, full_name, github_id, and user_id are required';
  END IF;
  
  IF length(p_name) > 255 OR length(p_full_name) > 255 THEN
    RAISE EXCEPTION 'Name and full_name must be 255 characters or less';
  END IF;
  
  RETURN QUERY
  INSERT INTO public.repositories (name, full_name, github_id, user_id, description, last_synced_at)
  VALUES (p_name, p_full_name, p_github_id, p_user_id, p_description, now())
  ON CONFLICT (github_id) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    last_synced_at = now()
  RETURNING repositories.id, repositories.name, repositories.full_name, repositories.github_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in upsert_repository: %', SQLERRM;
END;
$$;

-- Function to create audit securely  
CREATE OR REPLACE FUNCTION public.create_audit(p_repository_id uuid)
RETURNS TABLE(id uuid, repository_id uuid, status text, started_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation
  IF p_repository_id IS NULL THEN
    RAISE EXCEPTION 'Repository ID is required';
  END IF;
  
  -- Check if repository exists
  IF NOT EXISTS (SELECT 1 FROM public.repositories WHERE repositories.id = p_repository_id) THEN
    RAISE EXCEPTION 'Repository with ID % does not exist', p_repository_id;
  END IF;
  
  RETURN QUERY
  INSERT INTO public.audits (repository_id, status, started_at)
  VALUES (p_repository_id, 'pending', now())
  RETURNING audits.id, audits.repository_id, audits.status, audits.started_at;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in create_audit: %', SQLERRM;
END;
$$;

-- Function to complete audit securely
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
    RAISE EXCEPTION 'Audit ID is required';
  END IF;
  
  IF p_total_files < 0 OR p_violation_count < 0 OR p_compliant_files < 0 THEN
    RAISE EXCEPTION 'File counts cannot be negative';
  END IF;
  
  -- Check if audit exists
  IF NOT EXISTS (SELECT 1 FROM public.audits WHERE audits.id = p_audit_id) THEN
    RAISE EXCEPTION 'Audit with ID % does not exist', p_audit_id;
  END IF;
  
  RETURN QUERY
  UPDATE public.audits 
  SET 
    total_files = p_total_files,
    violation_count = p_violation_count,
    compliant_files = p_compliant_files,
    completed_at = now(),
    status = 'completed'
  WHERE audits.id = p_audit_id
  RETURNING audits.id, audits.status, audits.completed_at;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in complete_audit: %', SQLERRM;
END;
$$;

-- Function to log violation securely
CREATE OR REPLACE FUNCTION public.log_violation(
  p_audit_id uuid,
  p_repository_id uuid,
  p_file_path text,
  p_violation_type text,
  p_severity text,
  p_description text,
  p_category text DEFAULT NULL,
  p_line_number integer DEFAULT NULL
)
RETURNS TABLE(id uuid, audit_id uuid, severity text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation
  IF p_audit_id IS NULL OR p_repository_id IS NULL OR p_file_path IS NULL 
     OR p_violation_type IS NULL OR p_severity IS NULL OR p_description IS NULL THEN
    RAISE EXCEPTION 'All required parameters must be provided';
  END IF;
  
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity level: %', p_severity;
  END IF;
  
  IF length(p_file_path) > 500 OR length(p_violation_type) > 100 OR length(p_description) > 1000 THEN
    RAISE EXCEPTION 'Input parameters exceed maximum length';
  END IF;
  
  -- Check if audit and repository exist
  IF NOT EXISTS (SELECT 1 FROM public.audits WHERE audits.id = p_audit_id) THEN
    RAISE EXCEPTION 'Audit with ID % does not exist', p_audit_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.repositories WHERE repositories.id = p_repository_id) THEN
    RAISE EXCEPTION 'Repository with ID % does not exist', p_repository_id;
  END IF;
  
  RETURN QUERY
  INSERT INTO public.violations (
    audit_id, repository_id, file_path, violation_type, 
    severity, description, line_number, created_at
  )
  VALUES (
    p_audit_id, p_repository_id, p_file_path, p_violation_type,
    p_severity, p_description, p_line_number, now()
  )
  RETURNING violations.id, violations.audit_id, violations.severity;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in log_violation: %', SQLERRM;
END;
$$;