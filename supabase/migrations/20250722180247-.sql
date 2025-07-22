-- First, create a unique constraint on github_id if it doesn't exist
ALTER TABLE repositories ADD CONSTRAINT repositories_github_id_unique UNIQUE (github_id);

-- Now test the insert with proper conflict resolution
INSERT INTO repositories (name, full_name, github_id, user_id) 
VALUES ('test-repo', 'testuser/test-repo', 12345, '00000000-0000-0000-0000-000000000000') 
ON CONFLICT (github_id) DO UPDATE SET 
  name = EXCLUDED.name,
  full_name = EXCLUDED.full_name,
  last_synced_at = now();