-- Check current constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('repositories', 'profiles') 
    AND tc.constraint_type = 'FOREIGN KEY';

-- Drop ALL foreign key constraints from repositories and profiles
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints 
              WHERE table_name = 'repositories' AND constraint_type = 'FOREIGN KEY')
    LOOP
        EXECUTE 'ALTER TABLE repositories DROP CONSTRAINT ' || r.constraint_name;
    END LOOP;
    
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints 
              WHERE table_name = 'profiles' AND constraint_type = 'FOREIGN KEY')
    LOOP
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || r.constraint_name;
    END LOOP;
END $$;