-- ==============================================================================
-- ESSMAR SIGVI v2 – PARCHE: Permitir reportes anónimos
-- Ejecutar en SQL Editor de Supabase DESPUÉS de rebuild_db_v2.sql
-- ==============================================================================

-- 1. Permitir que CUALQUIER persona (anon o authenticated) cree reportes
DROP POLICY IF EXISTS "authenticated_can_insert_reports" ON public.reports;
DROP POLICY IF EXISTS "anyone_can_insert_reports" ON public.reports;
CREATE POLICY "anyone_can_insert_reports"
  ON public.reports FOR INSERT
  WITH CHECK (true);

-- 2. Permitir SELECT público en reports (para que el ciudadano pueda ver
--    su reporte después con el tracking_code, sin estar logueado)
DROP POLICY IF EXISTS "reports_select_policy" ON public.reports;
CREATE POLICY "reports_select_policy"
  ON public.reports FOR SELECT
  USING (
    -- Anon users: solo pueden ver su propio reporte con tracking_code (via API filter)
    -- Authenticated operators/admins: ven todos
    auth.role() = 'anon'
    OR reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'operator')
    )
  );

-- 3. Permitir inserts en report_history (el trigger log_status_change lo necesita)
DROP POLICY IF EXISTS "authenticated_can_insert_history" ON public.report_history;
CREATE POLICY "system_can_insert_history"
  ON public.report_history FOR INSERT
  WITH CHECK (true);

-- 4. Permitir que la función refresh_kpi_summary sea llamada por usuarios autenticados
GRANT EXECUTE ON FUNCTION public.refresh_kpi_summary() TO authenticated;

-- 5. Permitir acceso anon a las vistas de zonas (para el formulario de reporte)
DROP POLICY IF EXISTS "zones_viewable_by_authenticated" ON public.zones;
CREATE POLICY "zones_viewable_by_anyone"
  ON public.zones FOR SELECT
  USING (true);

-- 6. GRANT SELECT en vistas analíticas (PostgREST necesita esto)
GRANT SELECT ON public.kpi_summary TO authenticated;
GRANT SELECT ON public.kpi_summary TO anon;
GRANT SELECT ON public.reports_by_zone TO authenticated;
GRANT SELECT ON public.reports_by_zone TO anon;
GRANT SELECT ON public.zones TO anon;

-- 7. Permitir que anon también pueda ejecutar refresh (por si se accede sin login)
GRANT EXECUTE ON FUNCTION public.refresh_kpi_summary() TO anon;

-- ==============================================================================
-- FIN DEL PARCHE – EJECUTAR COMPLETO EN SQL EDITOR DE SUPABASE
-- ==============================================================================
