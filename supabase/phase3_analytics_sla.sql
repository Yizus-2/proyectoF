-- ==============================================================================
-- ESSMAR SIGVI v3 – FASE 3: INTELIGENCIA OPERATIVA Y SLA
-- Lógica para el semáforo de prioridad y analítica avanzada.
-- ==============================================================================

-- 1. Vista de Semáforo de SLA (Cálculo dinámico de urgencia)
CREATE OR REPLACE VIEW public.reports_sla_status AS
SELECT 
  r.id,
  r.tracking_code,
  r.status,
  r.priority,
  z.name as zone_name,
  z.sla_hours,
  r.created_at,
  EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600 as hours_elapsed,
  CASE 
    WHEN r.status IN ('CERRADO', 'EVALUADO', 'RESUELTO', 'RECHAZADO') THEN 'FINALIZADO'
    WHEN (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600) > z.sla_hours THEN 'VENCIDO'
    WHEN (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600) > (z.sla_hours * 0.75) THEN 'RIESGO'
    ELSE 'A TIEMPO'
  END as sla_status
FROM public.reports r
LEFT JOIN public.zones z ON r.zone_id = z.id;

-- 2. Función para obtener eficiencia de cuadrillas
CREATE OR REPLACE VIEW public.crew_efficiency AS
SELECT 
  work_order as crew_name,
  COUNT(*) as total_resolved,
  ROUND(AVG(attention_hours)::NUMERIC, 2) as avg_resolution_time,
  COUNT(*) FILTER (WHERE attention_hours <= (SELECT sla_hours FROM public.zones z WHERE z.id = reports.zone_id LIMIT 1)) as within_sla_count
FROM public.reports
WHERE status IN ('CERRADO', 'EVALUADO', 'RESUELTO') 
  AND work_order IS NOT NULL
GROUP BY work_order;

-- 3. Permisos para roles
GRANT SELECT ON public.reports_sla_status TO authenticated, anon;
GRANT SELECT ON public.crew_efficiency TO authenticated, anon;

-- 4. Notificar cambios para Realtime (opcional para estas vistas si se usan rpc)
-- REFRESH MATERIALIZED VIEW si fuera necesario, pero estas son vistas normales para ser dinámicas.
