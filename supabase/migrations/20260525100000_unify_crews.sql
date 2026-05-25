-- 20260525100000_unify_crews.sql
-- 1. Migrar datos de cuadrillas → crews (los que no existan)
INSERT INTO public.crews (name, zone_id, is_available, workload, specialty, lat, lng)
SELECT 
  c.nombre, 
  c.zone_id, 
  true, 
  c.casos_activos, 
  '{}',
  z.lat,   -- Si zones tiene lat/lng
  z.lng
FROM public.cuadrillas c
LEFT JOIN public.zones z ON z.id = c.zone_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.crews cr WHERE cr.name = c.nombre
);

-- 2. Migrar FK de profiles.cuadrilla_id → profiles.crew_id (bigint)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crew_id BIGINT REFERENCES public.crews(id);

UPDATE public.profiles p
SET crew_id = cr.id
FROM public.cuadrillas c
JOIN public.crews cr ON cr.name = c.nombre
WHERE p.cuadrilla_id = c.id;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS cuadrilla_id;

-- 3. Dropear tabla duplicada
DROP TABLE IF EXISTS public.cuadrillas CASCADE;

-- 4. Reescribir función RPC con fallback global
CREATE OR REPLACE FUNCTION public.assign_crew_automatically(p_report_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
  v_zone_id BIGINT;
  v_crew_id BIGINT;
  v_crew_name TEXT;
BEGIN
  SELECT zone_id INTO v_zone_id FROM public.reports WHERE id = p_report_id;

  -- Buscar en misma zona, luego fallback global
  SELECT id, name INTO v_crew_id, v_crew_name
  FROM public.crews
  WHERE is_available = TRUE
    AND workload < 3
    AND (zone_id = v_zone_id OR v_zone_id IS NULL)
  ORDER BY
    CASE WHEN zone_id = v_zone_id THEN 0 ELSE 1 END,
    workload ASC
  LIMIT 1;

  -- Fallback: cualquier cuadrilla disponible en cualquier zona
  IF v_crew_id IS NULL THEN
    SELECT id, name INTO v_crew_id, v_crew_name
    FROM public.crews
    WHERE is_available = TRUE AND workload < 3
    ORDER BY workload ASC
    LIMIT 1;
  END IF;

  IF v_crew_id IS NOT NULL THEN
    UPDATE public.reports
    SET status = 'ASIGNADO',
        work_order = v_crew_name,
        assigned_at = NOW()
    WHERE id = p_report_id;

    UPDATE public.crews
    SET workload = workload + 1,
        is_available = CASE WHEN workload + 1 >= 3 THEN FALSE ELSE TRUE END
    WHERE id = v_crew_id;
  END IF;

  RETURN v_crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
