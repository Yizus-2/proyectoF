-- ==============================================================================
-- ESSMAR SIGVI v2 – PARCHE: Permitir encuestas anónimas y Auto-Evaluado
-- Ejecutar en SQL Editor de Supabase
-- ==============================================================================

-- 1. Permitir inserts en ratings para usuarios anónimos (siempre que el reporte esté cerrado)
DROP POLICY IF EXISTS "anyone_can_insert_ratings" ON public.ratings;
CREATE POLICY "anyone_can_insert_ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_id
        AND reports.status IN ('CERRADO', 'EVALUADO')
    )
  );

-- 2. Trigger para actualizar automáticamente el estado del reporte a 'EVALUADO'
CREATE OR REPLACE FUNCTION public.mark_report_as_evaluated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reports
  SET status = 'EVALUADO',
      updated_at = NOW()
  WHERE id = NEW.report_id AND status = 'CERRADO';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mark_report_evaluated ON public.ratings;
CREATE TRIGGER trg_mark_report_evaluated
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_report_as_evaluated();

-- 3. Asegurar permisos de tabla para PostgREST
GRANT INSERT ON public.ratings TO anon;
GRANT INSERT ON public.ratings TO authenticated;
GRANT SELECT ON public.ratings TO anon;
GRANT SELECT ON public.ratings TO authenticated;

-- ==============================================================================
-- NOTA: El envío de correos automáticos requerirá usar Supabase Edge Functions + Resend
-- o Database Webhooks. El campo `reporter_email` ya se está guardando.
-- ==============================================================================
