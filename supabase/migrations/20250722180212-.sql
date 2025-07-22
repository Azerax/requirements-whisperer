-- Remove foreign key constraints temporarily for testing
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Test insert a sample profile
INSERT INTO public.profiles (id, user_id) 
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (user_id) DO NOTHING;