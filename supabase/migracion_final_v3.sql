-- ==============================================================================
-- ESSMAR SIGVI v3 – SCRIPT DE MIGRACIÓN FINAL (MÍNIMO VIABLE Y ESCALABLE)
-- Arquitectura: Startup + Académica. Elimina fricciones, automatiza SLA y CSAT.
-- Ejecutar en el SQL Editor de Supabase sobre un proyecto nuevo.
-- ==============================================================================

-- ─────────────────────────────────────────────
-- 0. EXTENSIONES
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. LIMPIEZA DE OBJETOS EXISTENTES
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS public.kpi_summary CASCADE;
DROP VIEW IF EXISTS public.reports_by_zone CASCADE;
DROP FUNCTION IF EXISTS public.check_recurrence() CASCADE;
DROP FUNCTION IF EXISTS public.log_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.generate_tracking_code() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_kpi_summary() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.mark_report_as_evaluated() CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.report_history CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ─────────────────────────────────────────────
-- 2. TABLAS DIMENSIONALES Y DE USUARIO
-- ─────────────────────────────────────────────

-- Zonas Geográficas (SLA dinámico)
CREATE TABLE public.zones (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  sla_hours   INTEGER NOT NULL DEFAULT 24,
  created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Perfiles de Usuario (Admin, Operator, Citizen)
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email       TEXT,
  full_name   TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'citizen'
              CHECK (role IN ('admin', 'operator', 'citizen')),
  zone_id     BIGINT REFERENCES public.zones(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ─────────────────────────────────────────────
-- 3. TABLA CENTRAL: REPORTES
-- ─────────────────────────────────────────────
CREATE TABLE public.reports (
  id                    BIGSERIAL PRIMARY KEY,
  tracking_code         TEXT UNIQUE,
  
  -- Identificación Ciudadana (Sin fricción)
  reporter_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name         TEXT NOT NULL DEFAULT 'Ciudadano Anónimo',
  reporter_phone        TEXT,
  reporter_email        TEXT,
  
  -- Clasificación del Daño
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
                        
  -- Contexto y Ubicación
  description           TEXT,
  address               TEXT NOT NULL,
  zone_id               BIGINT REFERENCES public.zones(id) ON DELETE SET NULL,
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,
  
  -- Evidencia Multimedia
  photo_path            TEXT,
  evidence_path         TEXT,
  
  -- Trazabilidad Operativa
  assigned_operator_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  work_order            TEXT, -- Cuadrilla asignada
  assigned_at           TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  attention_hours       DOUBLE PRECISION, -- Cálculo automático SLA
  
  -- Metadatos Analíticos
  source                TEXT NOT NULL DEFAULT 'WEB'
                        CHECK (source IN ('WEB', 'OFFLINE', 'WHATSAPP')),
  is_recurrent          BOOLEAN DEFAULT FALSE,
  
  created_at            TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at            TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ─────────────────────────────────────────────
-- 4. TABLAS DE TRAZABILIDAD Y SATISFACCIÓN
-- ─────────────────────────────────────────────

-- Historial de Estados (Auditoría)
CREATE TABLE public.report_history (
  id              BIGSERIAL PRIMARY KEY,
  report_id       BIGINT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Calificaciones CSAT (Satisfacción)
CREATE TABLE public.ratings (
  id          BIGSERIAL PRIMARY KEY,
  report_id   BIGINT NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  citizen_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  score       INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Índices de Rendimiento
CREATE INDEX idx_reports_status     ON public.reports(status);
CREATE INDEX idx_reports_zone       ON public.reports(zone_id);
CREATE INDEX idx_reports_created    ON public.reports(created_at DESC);
CREATE INDEX idx_history_report     ON public.report_history(report_id);

-- ─────────────────────────────────────────────
-- 5. LÓGICA DE NEGOCIO (TRIGGERS & FUNCIONES)
-- ─────────────────────────────────────────────

-- 5A. Auto-crear perfil (Primer usuario es admin)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first;
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, CASE WHEN is_first THEN 'admin' ELSE 'citizen' END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5B. Generar Código de Seguimiento
CREATE OR REPLACE FUNCTION public.generate_tracking_code() RETURNS TRIGGER AS $$
DECLARE seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.reports WHERE DATE(created_at) = CURRENT_DATE AND id != NEW.id;
  NEW.tracking_code := 'REP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_tracking_code BEFORE INSERT ON public.reports FOR EACH ROW WHEN (NEW.tracking_code IS NULL) EXECUTE FUNCTION public.generate_tracking_code();

-- 5C. Trazabilidad y Cálculo Automático de Tiempos (SLA)
CREATE OR REPLACE FUNCTION public.log_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.report_history (report_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    IF NEW.status = 'ASIGNADO' AND OLD.status != 'ASIGNADO' THEN NEW.assigned_at := NOW(); END IF;
    IF NEW.status = 'RESUELTO' AND OLD.status != 'RESUELTO' THEN NEW.resolved_at := NOW(); END IF;
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

CREATE TRIGGER trg_log_status_change BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

-- 5D. Auto-cambiar estado a EVALUADO al recibir CSAT
CREATE OR REPLACE FUNCTION public.mark_report_as_evaluated() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reports SET status = 'EVALUADO', updated_at = NOW() WHERE id = NEW.report_id AND status = 'CERRADO';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_mark_report_evaluated AFTER INSERT ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.mark_report_as_evaluated();

-- ─────────────────────────────────────────────
-- 6. ANALÍTICA (VISTAS MATERIALIZADAS)
-- ─────────────────────────────────────────────
CREATE MATERIALIZED VIEW public.kpi_summary AS
SELECT
  COUNT(*) AS total_reports,
  COUNT(*) FILTER (WHERE source = 'WEB') AS digital_reports,
  ROUND((COUNT(*) FILTER (WHERE source = 'WEB')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS digital_adoption_pct,
  COUNT(*) FILTER (WHERE status NOT IN ('CERRADO','EVALUADO','RECHAZADO')) AS active_reports,
  ROUND((AVG(attention_hours) FILTER (WHERE attention_hours IS NOT NULL))::NUMERIC, 2) AS avg_attention_hours,
  COUNT(*) FILTER (WHERE status IN ('CERRADO','EVALUADO')) AS total_closed,
  (SELECT ROUND(AVG(score)::NUMERIC, 2) FROM public.ratings) AS avg_csat_score,
  (SELECT COUNT(*) FROM public.ratings) AS total_ratings,
  NOW() AS last_refreshed
FROM public.reports;

CREATE OR REPLACE FUNCTION public.refresh_kpi_summary() RETURNS VOID AS $$
BEGIN REFRESH MATERIALIZED VIEW public.kpi_summary; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE VIEW public.reports_by_zone AS
SELECT z.id AS zone_id, z.name AS zone_name, z.code AS zone_code,
  COUNT(r.id) AS total_reports,
  COUNT(r.id) FILTER (WHERE r.status NOT IN ('CERRADO','EVALUADO','RECHAZADO')) AS active_reports,
  ROUND((AVG(r.attention_hours))::NUMERIC, 2) AS avg_hours
FROM public.zones z
LEFT JOIN public.reports r ON r.zone_id = z.id
GROUP BY z.id, z.name, z.code
ORDER BY total_reports DESC;

-- ─────────────────────────────────────────────
-- 7. SEGURIDAD RLS (Fricción Cero para Ciudadanos)
-- ─────────────────────────────────────────────
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Reportes: Ciudadanos (anon) pueden insertar. Operadores pueden ver todo.
CREATE POLICY "anyone_can_insert_reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "reports_viewable_by_all" ON public.reports FOR SELECT USING (
  auth.role() = 'anon' OR reporter_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
  )
);
CREATE POLICY "operators_can_update" ON public.reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
);

-- Encuestas: Anónimos pueden calificar si el reporte está CERRADO
CREATE POLICY "anyone_can_insert_ratings" ON public.ratings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.reports WHERE reports.id = report_id AND reports.status IN ('CERRADO', 'EVALUADO'))
);
CREATE POLICY "ratings_viewable" ON public.ratings FOR SELECT USING (true);

-- Permisos PostgREST Analítica
GRANT SELECT ON public.kpi_summary TO anon, authenticated;
GRANT SELECT ON public.reports_by_zone TO anon, authenticated;
GRANT SELECT ON public.zones TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_kpi_summary() TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.reports TO anon, authenticated;
GRANT INSERT, SELECT ON public.ratings TO anon, authenticated;

-- Datos Semilla
INSERT INTO public.zones (name, code, sla_hours) VALUES
  ('Centro Histórico', 'ZONA-01', 12), ('Rodadero', 'ZONA-02', 24),
  ('Mamatoco', 'ZONA-03', 24), ('Gaira', 'ZONA-04', 24) ON CONFLICT DO NOTHING;

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
