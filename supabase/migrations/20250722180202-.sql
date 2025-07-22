-- Remove foreign key constraint temporarily for testing
ALTER TABLE public.repositories DROP CONSTRAINT IF EXISTS repositories_user_id_fkey;

-- Test insert a sample profile first
INSERT INTO public.profiles (id, user_id) 
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (user_id) DO NOTHING;