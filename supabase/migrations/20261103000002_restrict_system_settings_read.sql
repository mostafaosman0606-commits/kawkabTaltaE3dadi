-- system_settings is not read by the client application. Keep it admin-only;
-- the prior TRUE policy allowed any role with table SELECT grants to read rows.
DROP POLICY IF EXISTS "settings_read_all" ON public.system_settings;
DROP POLICY IF EXISTS "settings_read_admin" ON public.system_settings;
CREATE POLICY "settings_read_admin"
  ON public.system_settings
  FOR SELECT
  USING (is_admin());
