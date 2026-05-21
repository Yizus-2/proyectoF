-- ==============================================================================
-- MIGRACIÓN: Vistas Analíticas para KPIs de Gestión (ESSMAR SIGVI)
-- Fecha: 2026-05-21
-- ==============================================================================

-- 1. Vista: Tiempo promedio de atención de reportes (General y por Zona)
-- Mide cuánto tarda la empresa desde que el usuario reporta el daño hasta que finaliza la atención.
CREATE OR REPLACE VIEW public.vw_kpi_avg_resolution_time AS
SELECT 
    z.id AS zone_id,
    z.name AS zone_name,
    COUNT(r.id) AS total_resolved,
    ROUND(AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600)::numeric, 2) AS avg_hours_to_resolve
FROM public.reports r
LEFT JOIN public.zones z ON r.zone_id = z.id
WHERE r.status IN ('RESUELTO', 'CERRADO', 'EVALUADO') 
  AND r.resolved_at IS NOT NULL
GROUP BY z.id, z.name;

GRANT SELECT ON public.vw_kpi_avg_resolution_time TO anon, authenticated;

-- 2. Vista: Cumplimiento de SLA (Tiempos Objetivo)
-- Porcentaje de reportes resueltos dentro del tiempo objetivo.
CREATE OR REPLACE VIEW public.vw_kpi_sla_compliance AS
WITH categorized_reports AS (
    SELECT 
        r.id,
        CASE 
            WHEN EXTRACT(EPOCH FROM (r.resolved_at - r.created_at))/3600 <= z.sla_hours THEN 'A TIEMPO'
            ELSE 'VENCIDO'
        END as sla_status
    FROM public.reports r
    JOIN public.zones z ON r.zone_id = z.id
    WHERE r.status IN ('RESUELTO', 'CERRADO', 'EVALUADO')
)
SELECT 
    COUNT(*) as total_resolved,
    SUM(CASE WHEN sla_status = 'A TIEMPO' THEN 1 ELSE 0 END) as on_time_count,
    ROUND((SUM(CASE WHEN sla_status = 'A TIEMPO' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 2) as compliance_percentage
FROM categorized_reports;

GRANT SELECT ON public.vw_kpi_sla_compliance TO anon, authenticated;

-- 3. Vista: Adopción Digital (Digitalización de reportes)
-- Porcentaje de adopción de canales digitales (APP, WEB) vs Tradicionales (PRESENCIAL, TELEFONO)
CREATE OR REPLACE VIEW public.vw_kpi_digital_adoption AS
SELECT 
    COUNT(*) as total_reports,
    SUM(CASE WHEN source IN ('WEB', 'APP_MOVIL', 'WHATSAPP') THEN 1 ELSE 0 END) as digital_reports,
    SUM(CASE WHEN source IN ('TELEFONO', 'CORREO', 'PRESENCIAL', 'OFFLINE') THEN 1 ELSE 0 END) as traditional_reports,
    ROUND((SUM(CASE WHEN source IN ('WEB', 'APP_MOVIL', 'WHATSAPP') THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 2) as digital_adoption_percentage
FROM public.reports;

GRANT SELECT ON public.vw_kpi_digital_adoption TO anon, authenticated;

-- 4. Vista: Tasa de Reincidencia de Daños
-- Mide cuántos daños vuelven a presentarse en el mismo sector
CREATE OR REPLACE VIEW public.vw_kpi_recurrence_rate AS
SELECT 
    COUNT(*) as total_reports,
    SUM(CASE WHEN is_recurrent = TRUE THEN 1 ELSE 0 END) as recurrent_reports,
    ROUND((SUM(CASE WHEN is_recurrent = TRUE THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 2) as recurrence_percentage
FROM public.reports;

GRANT SELECT ON public.vw_kpi_recurrence_rate TO anon, authenticated;
