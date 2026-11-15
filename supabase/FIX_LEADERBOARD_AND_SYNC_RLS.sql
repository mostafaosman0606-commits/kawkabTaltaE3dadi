-- ==============================================================================
-- KAWKAB TALTA E3DADI — FIX LEADERBOARD & CROSS-DEVICE SYNC RLS
-- ==============================================================================

-- 1. Allow reading non-suspended profiles so the Leaderboard & Certificates display real students across devices
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  is_suspended = FALSE
  OR id = auth.uid()
  OR is_admin()
  OR is_teacher()
);

-- 2. Allow reading graded exam attempts so live scores sync to Leaderboard across devices
DROP POLICY IF EXISTS "attempts_select" ON public.exam_attempts;
CREATE POLICY "attempts_select" ON public.exam_attempts FOR SELECT USING (
  status = 'graded'
  OR student_id = auth.uid()
  OR is_admin()
  OR is_teacher()
);

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
