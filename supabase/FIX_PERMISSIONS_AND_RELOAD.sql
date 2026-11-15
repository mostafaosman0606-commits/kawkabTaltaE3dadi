-- ==============================================================================
-- KAWKAB TALTA E3DADI — FIX SUPABASE PERMISSIONS & POSTGREST CACHE
-- ==============================================================================
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> RUN
-- ==============================================================================

-- 1. Grant Schema Usage to anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant Table & Sequence permissions (RLS still strictly protects rows!)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Ensure future tables/sequences inherit permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- 3. Crucial Fix: Allow anon + authenticated to execute helper functions
-- (When auth.uid() is NULL, they safely return FALSE without raising 42501 permission denied)
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_subject(UUID) TO anon, authenticated;

-- 4. Immediately notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
