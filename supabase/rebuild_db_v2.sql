-- ==============================================================================
-- ESSMAR SIGVI v2 – INSTALACIÓN LIMPIA DESDE CERO
-- Ejecutar en el SQL Editor de Supabase sobre un proyecto nuevo/reiniciado.
-- ==============================================================================

-- ─────────────────────────────────────────────
-- 0. EXTENSIONES
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "postgis";  -- Descomentar si se necesitan geometrías reales

-- ─────────────────────────────────────────────
-- 1. ELIMINAR OBJETOS EXISTENTES (orden inverso de dependencia)
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS public.kpi_summary CASCADE;
DROP VIEW IF EXISTS public.reports_by_zone CASCADE;
-- (Triggers are dropped automatically when tables are dropped via CASCADE)
DROP FUNCTION IF EXISTS public.check_recurrence() CASCADE;
DROP FUNCTION IF EXISTS public.log_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.generate_tracking_code() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_kpi_summary() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.report_history CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;
DROP TABLE IF EXISTS public.pressure_readings CASCADE;
DROP TABLE IF EXISTS public.hydrants CASCADE;
DROP TABLE IF EXISTS public.leaks CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ─────────────────────────────────────────────
-- 2. PROFILES (vinculada a auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email       TEXT,
  full_name   TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'citizen'
              CHECK (role IN ('admin', 'operator', 'citizen')),
  zone_id     BIGINT,  -- FK se agrega después de crear zones
  updated_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_viewable_by_authenticated"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "users_can_insert_own_profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "admins_can_update_any_profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Trigger: auto-crear perfil al registrarse.
-- El primer usuario se convierte en admin automáticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first;

  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN is_first THEN 'admin' ELSE 'citizen' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- 3. ZONES (sectores geográficos)
-- ─────────────────────────────────────────────
CREATE TABLE public.zones (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  sla_hours   INTEGER NOT NULL DEFAULT 24,
  created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Agregar FK de profiles → zones (ahora que zones existe)
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_zone
  FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zones_viewable_by_authenticated"
  ON public.zones FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admins_can_manage_zones"
  ON public.zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Zonas iniciales de Santa Marta (ajustar según necesidad)
INSERT INTO public.zones (name, code, sla_hours) VALUES
  ('Centro Histórico',  'ZONA-01', 12),
  ('Rodadero',          'ZONA-02', 24),
  ('Mamatoco',          'ZONA-03', 24),
  ('Bastidas',          'ZONA-04', 24),
  ('Gaira',             'ZONA-05', 24),
  ('Taganga',           'ZONA-06', 48),
  ('Bonda',             'ZONA-07', 48),
  ('Zona Industrial',   'ZONA-08', 24),
  ('Pescaíto',          'ZONA-09', 24),
  ('Otros',             'ZONA-99', 48);

-- ─────────────────────────────────────────────
-- 4. REPORTS (tabla principal de reportes ciudadanos)
-- ─────────────────────────────────────────────
CREATE TABLE public.reports (
  id                    BIGSERIAL PRIMARY KEY,
  tracking_code         TEXT UNIQUE,

  -- Reportante
  reporter_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name         TEXT NOT NULL,
  reporter_phone        TEXT,
  reporter_email        TEXT,

  -- Clasificación
  category              TEXT NOT NULL DEFAULT 'otro'
                        CHECK (category IN (
                          'fuga_agua', 'fuga_alcantarillado', 'tuberia_rota',
                          'dano_pavimento', 'dano_infraestructura', 'otro'
                        )),
  priority              TEXT NOT NULL DEFAULT 'MEDIA'
                        CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  status                TEXT NOT NULL DEFAULT 'REPORTADO'
                        CHECK (status IN (
                          'REPORTADO', 'CLASIFICADO', 'ASIGNADO',
                          'EN_PROGRESO', 'RESUELTO', 'CERRADO',
                          'EVALUADO', 'RECHAZADO'
                        )),

  -- Descripción y ubicación
  description           TEXT,
  address               TEXT NOT NULL,
  zone_id               BIGINT REFERENCES public.zones(id) ON DELETE SET NULL,
  sector                TEXT,
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,

  -- Evidencia
  photo_path            TEXT,   -- foto del ciudadano
  evidence_path         TEXT,   -- foto de resolución del operador

  -- Operador y SLA
  assigned_operator_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at           TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  attention_hours       DOUBLE PRECISION,

  -- Metadatos
  source                TEXT NOT NULL DEFAULT 'WEB'
                        CHECK (source IN ('WEB', 'OFFLINE', 'WHATSAPP')),
  is_recurrent          BOOLEAN DEFAULT FALSE,
  work_order            TEXT,

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at            TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Índices para rendimiento
CREATE INDEX idx_reports_status     ON public.reports(status);
CREATE INDEX idx_reports_zone       ON public.reports(zone_id);
CREATE INDEX idx_reports_priority   ON public.reports(priority);
CREATE INDEX idx_reports_reporter   ON public.reports(reporter_id);
CREATE INDEX idx_reports_operator   ON public.reports(assigned_operator_id);
CREATE INDEX idx_reports_created    ON public.reports(created_at DESC);
CREATE INDEX idx_reports_category   ON public.reports(category);
CREATE INDEX idx_reports_recurrent  ON public.reports(is_recurrent) WHERE is_recurrent = TRUE;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Cualquier autenticado puede crear reportes
CREATE POLICY "authenticated_can_insert_reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Ciudadanos ven SUS reportes; operadores/admins ven todos
CREATE POLICY "reports_select_policy"
  ON public.reports FOR SELECT
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'operator')
    )
  );

-- Solo operadores y admins pueden actualizar/eliminar
CREATE POLICY "operators_can_update_reports"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "admins_can_delete_reports"
  ON public.reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────
-- 5. REPORT_HISTORY (historial de cambios de estado)
-- ─────────────────────────────────────────────
CREATE TABLE public.report_history (
  id              BIGSERIAL PRIMARY KEY,
  report_id       BIGINT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_report_history_report ON public.report_history(report_id);

ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_viewable_by_involved"
  ON public.report_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'operator')
    )
    OR EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_history.report_id
        AND reports.reporter_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_can_insert_history"
  ON public.report_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- 6. RATINGS (calificación CSAT post-servicio)
-- ─────────────────────────────────────────────
CREATE TABLE public.ratings (
  id          BIGSERIAL PRIMARY KEY,
  report_id   BIGINT NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  citizen_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  score       INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "citizens_can_rate_own_reports"
  ON public.ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_id
        AND reports.reporter_id = auth.uid()
        AND reports.status IN ('CERRADO', 'EVALUADO')
    )
  );

CREATE POLICY "ratings_viewable"
  ON public.ratings FOR SELECT
  USING (
    citizen_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'operator')
    )
  );

-- ─────────────────────────────────────────────
-- 7. FUNCIONES Y TRIGGERS
-- ─────────────────────────────────────────────

-- 7a. Auto-generar código de seguimiento: REP-YYYYMMDD-0001
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.reports
  WHERE DATE(created_at) = CURRENT_DATE AND id != NEW.id;

  NEW.tracking_code := 'REP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_tracking_code
  BEFORE INSERT ON public.reports
  FOR EACH ROW WHEN (NEW.tracking_code IS NULL)
  EXECUTE FUNCTION public.generate_tracking_code();

-- 7b. Auto-registrar historial + calcular timestamps al cambiar estado
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.report_history (report_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    IF NEW.status = 'ASIGNADO' AND OLD.status != 'ASIGNADO' THEN
      NEW.assigned_at := NOW();
    END IF;

    IF NEW.status = 'RESUELTO' AND OLD.status != 'RESUELTO' THEN
      NEW.resolved_at := NOW();
    END IF;

    IF NEW.status = 'CERRADO' AND OLD.status != 'CERRADO' THEN
      NEW.closed_at := NOW();
      IF NEW.assigned_at IS NOT NULL THEN
        NEW.attention_hours := EXTRACT(EPOCH FROM (NOW() - NEW.assigned_at)) / 3600.0;
      END IF;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_status_change
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.log_status_change();

-- 7c. Detección de reincidencia (~100m, últimos 90 días)
CREATE OR REPLACE FUNCTION public.check_recurrence()
RETURNS TRIGGER AS $$
DECLARE
  nearby_count INTEGER;
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    SELECT COUNT(*) INTO nearby_count
    FROM public.reports r
    WHERE r.id != NEW.id
      AND r.lat IS NOT NULL AND r.lng IS NOT NULL
      AND r.created_at > NOW() - INTERVAL '90 days'
      AND r.status NOT IN ('RECHAZADO')
      AND ABS(r.lat - NEW.lat) < 0.001
      AND ABS(r.lng - NEW.lng) < 0.001;

    IF nearby_count > 0 THEN
      NEW.is_recurrent := TRUE;
      IF NEW.priority = 'BAJA' THEN NEW.priority := 'MEDIA';
      ELSIF NEW.priority = 'MEDIA' THEN NEW.priority := 'ALTA';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_recurrence
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_recurrence();

-- ─────────────────────────────────────────────
-- 8. VISTAS ANALÍTICAS
-- ─────────────────────────────────────────────

-- 8a. Vista materializada de KPIs globales
CREATE MATERIALIZED VIEW public.kpi_summary AS
SELECT
  COUNT(*)                                                         AS total_reports,
  COUNT(*) FILTER (WHERE source = 'WEB')                           AS digital_reports,
  ROUND(
    (COUNT(*) FILTER (WHERE source = 'WEB')::NUMERIC
     / NULLIF(COUNT(*), 0)) * 100, 2
  )                                                                AS digital_adoption_pct,
  COUNT(*) FILTER (
    WHERE status NOT IN ('CERRADO','EVALUADO','RECHAZADO')
  )                                                                AS active_reports,
  ROUND((AVG(attention_hours) FILTER (
    WHERE attention_hours IS NOT NULL
  ))::NUMERIC, 2)                                                  AS avg_attention_hours,
  COUNT(*) FILTER (WHERE status IN ('CERRADO','EVALUADO'))         AS total_closed,
  COUNT(*) FILTER (WHERE is_recurrent = TRUE)                      AS recurrent_reports,
  ROUND(
    (COUNT(*) FILTER (WHERE is_recurrent = TRUE)::NUMERIC
     / NULLIF(COUNT(*) FILTER (
         WHERE status NOT IN ('REPORTADO','RECHAZADO')
       ), 0)) * 100, 2
  )                                                                AS recurrence_rate_pct,
  (SELECT ROUND(AVG(score)::NUMERIC, 2) FROM public.ratings)      AS avg_csat_score,
  (SELECT COUNT(*) FROM public.ratings)                            AS total_ratings,
  NOW()                                                            AS last_refreshed
FROM public.reports;

CREATE OR REPLACE FUNCTION public.refresh_kpi_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.kpi_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8b. Vista: reportes agrupados por zona
CREATE OR REPLACE VIEW public.reports_by_zone AS
SELECT
  z.id        AS zone_id,
  z.name      AS zone_name,
  z.code      AS zone_code,
  z.sla_hours,
  COUNT(r.id)                                                      AS total_reports,
  COUNT(r.id) FILTER (
    WHERE r.status NOT IN ('CERRADO','EVALUADO','RECHAZADO')
  )                                                                AS active_reports,
  COUNT(r.id) FILTER (WHERE r.is_recurrent = TRUE)                 AS recurrent_reports,
  ROUND((AVG(r.attention_hours) FILTER (
    WHERE r.attention_hours IS NOT NULL
  ))::NUMERIC, 2)                                                  AS avg_hours
FROM public.zones z
LEFT JOIN public.reports r ON r.zone_id = z.id
GROUP BY z.id, z.name, z.code, z.sla_hours
ORDER BY total_reports DESC;

-- ─────────────────────────────────────────────
-- 9. HABILITAR REALTIME
-- ─────────────────────────────────────────────
-- Supabase Realtime: escuchar cambios en reports para notificar operadores
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;

-- ==============================================================================
-- FIN – INSTALACIÓN LIMPIA v2
--
-- Tablas:     profiles, zones, reports, report_history, ratings
-- Funciones:  handle_new_user, generate_tracking_code, log_status_change,
--             check_recurrence, refresh_kpi_summary
-- Triggers:   on_auth_user_created, trg_generate_tracking_code,
--             trg_log_status_change, trg_check_recurrence
-- Vistas:     kpi_summary (materializada), reports_by_zone
-- Índices:    8 en reports, 1 en report_history
-- RLS:        Completo para 3 roles (admin, operator, citizen)
-- Realtime:   Habilitado en reports, report_history, ratings
--
-- PASOS POST-EJECUCIÓN:
--   1. Crear bucket "reports" en Storage (Dashboard → Storage → New Bucket)
--   2. Registrar primer usuario → será admin automáticamente
--   3. SELECT public.refresh_kpi_summary();
-- ==============================================================================
