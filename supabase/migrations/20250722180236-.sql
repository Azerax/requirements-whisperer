-- Force remove all foreign key constraints for testing
ALTER TABLE public.repositories DROP CONSTRAINT repositories_user_id_fkey;

-- Now test the insert
INSERT INTO repositories (name, full_name, github_id, user_id) 
VALUES ('test-repo', 'testuser/test-repo', 12345, '00000000-0000-0000-0000-000000000000') 
ON CONFLICT (github_id) DO UPDATE SET 
  name = EXCLUDED.name,
  full_name = EXCLUDED.full_name,
  last_synced_at = now()
RETURNING *;