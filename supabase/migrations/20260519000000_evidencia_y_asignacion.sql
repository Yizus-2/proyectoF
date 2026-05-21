-- ==============================================================================
-- MIGRACIÓN: Gestión de Cuadrillas, Evidencias y Verificación
-- ==============================================================================

-- 1. Modificación de roles válidos en perfiles de usuario
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'operator', 'supervisor', 'citizen'));

-- 2. Modificación de estados válidos del Reporte
ALTER TABLE public.reports 
  DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports 
  ADD CONSTRAINT reports_status_check 
  CHECK (status IN (
    'REPORTADO', 
    'CLASIFICADO', 
    'ASIGNADO', 
    'EN_PROGRESO', 
    'EVIDENCIA_PENDIENTE',
    'VERIFICACION_SUPERVISOR',
    'RESUELTO', 
    'CERRADO', 
    'EVALUADO', 
    'RECHAZADO'
  ));

-- 2b. Modificación de canales válidos del Reporte
ALTER TABLE public.reports 
  DROP CONSTRAINT IF EXISTS reports_source_check;

ALTER TABLE public.reports 
  ADD CONSTRAINT reports_source_check 
  CHECK (source IN ('WEB', 'OFFLINE', 'WHATSAPP', 'APP_MOVIL', 'TELEFONO', 'CORREO', 'PRESENCIAL', 'BOTON_EMERGENCIA'));

-- 3. Crear Tabla de Cuadrillas (Crews)
CREATE TABLE IF NOT EXISTS public.crews (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  zone_id     BIGINT REFERENCES public.zones(id) ON DELETE SET NULL,
  specialty   TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT TRUE,
  workload    INTEGER DEFAULT 0,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para crews
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crews_viewable_by_authenticated"
  ON public.crews FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admins_can_manage_crews"
  ON public.crews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. Crear Tabla de Evidencias (Evidences)
CREATE TABLE IF NOT EXISTS public.evidences (
  id             BIGSERIAL PRIMARY KEY,
  report_id      BIGINT REFERENCES public.reports(id) ON DELETE CASCADE,
  evidence_url   TEXT NOT NULL,
  description    TEXT NOT NULL,
  materials      TEXT,
  hours_spent    DECIMAL(4,2) NOT NULL,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  uploaded_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para evidences
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidences_viewable_by_operators_and_admins"
  ON public.evidences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'supervisor')
    )
  );

CREATE POLICY "operators_can_insert_evidences"
  ON public.evidences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'supervisor')
    )
  );

-- 5. Crear Tabla de Verificaciones (Verifications)
CREATE TABLE IF NOT EXISTS public.verifications (
  id             BIGSERIAL PRIMARY KEY,
  report_id      BIGINT REFERENCES public.reports(id) ON DELETE CASCADE,
  supervisor_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision       TEXT NOT NULL CHECK (decision IN ('APROBADO', 'RECHAZADO', 'REGLAMENTO_PENDIENTE')),
  comments       TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para verifications
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verifications_viewable_by_operators_and_admins"
  ON public.verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'supervisor')
    )
  );

CREATE POLICY "supervisors_can_insert_verifications"
  ON public.verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'supervisor')
    )
  );

-- Habilitar permisos PostgREST para nuevas tablas
GRANT SELECT ON public.crews TO anon, authenticated;
GRANT SELECT, INSERT ON public.evidences TO anon, authenticated;
GRANT SELECT, INSERT ON public.verifications TO anon, authenticated;

-- 6. Insertar algunas cuadrillas semilla si no existen
INSERT INTO public.crews (name, zone_id, specialty, is_available, workload, lat, lng) VALUES
  ('Cuadrilla Alfa - Fugas', 1, '{"fuga_agua", "tuberia_rota"}', true, 0, 11.2404, -74.2110),
  ('Cuadrilla Beta - Pavimento', 1, '{"dano_pavimento"}', true, 0, 11.2425, -74.2050),
  ('Cuadrilla Gamma - Redes', 2, '{"fuga_alcantarillado"}', true, 0, 11.2185, -74.2255),
  ('Cuadrilla Delta - General', 3, '{"otro", "dano_infraestructura"}', true, 0, 11.2250, -74.1880)
ON CONFLICT DO NOTHING;

-- 7. Función para asignación automática de cuadrillas
CREATE OR REPLACE FUNCTION public.assign_crew_automatically(p_report_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
  v_report_lat DOUBLE PRECISION;
  v_report_lng DOUBLE PRECISION;
  v_report_zone_id BIGINT;
  v_crew_id BIGINT;
  v_crew_name TEXT;
BEGIN
  -- Obtener ubicación y zona del reporte
  SELECT lat, lng, zone_id INTO v_report_lat, v_report_lng, v_report_zone_id
  FROM public.reports
  WHERE id = p_report_id;

  -- Seleccionar cuadrilla óptima basada en:
  -- 1. Disponibilidad = TRUE
  -- 2. Misma zona geográfica (o fallback si no hay disponibles)
  -- 3. Menor carga de trabajo
  -- 4. Mayor cercanía geográfica (Haversine)
  SELECT id, name INTO v_crew_id, v_crew_name
  FROM public.crews
  WHERE is_available = TRUE
    AND (zone_id = v_report_zone_id OR v_report_zone_id IS NULL)
  ORDER BY 
    workload ASC,
    ( 6371 * acos( 
      LEAST(1.0, GREATEST(-1.0, 
        cos( radians(COALESCE(v_report_lat, 11.2404)) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(COALESCE(v_report_lng, -74.2110)) ) + 
        sin( radians(COALESCE(v_report_lat, 11.2404)) ) * sin( radians( lat ) )
      ))
    ) ) ASC
  LIMIT 1;

  -- Si se encuentra una cuadrilla, actualizar reporte
  IF v_crew_id IS NOT NULL THEN
    UPDATE public.reports
    SET 
      status = 'ASIGNADO',
      work_order = v_crew_name,
      assigned_operator_id = auth.uid(), -- Asignado bajo el operador actual
      assigned_at = NOW()
    WHERE id = p_report_id;

    -- Incrementar carga de la cuadrilla
    UPDATE public.crews
    SET workload = workload + 1
    WHERE id = v_crew_id;
  END IF;

  RETURN v_crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_crew_automatically(BIGINT) TO anon, authenticated;
