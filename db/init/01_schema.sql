-- ==============================================================================
-- ESSMAR SIGVI - Esquema Unificado PostgreSQL 17 (Local / On-Premise)
-- Reemplaza la arquitectura fragmentada de Supabase por PostgreSQL puro
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. ZONAS GEOGRÁFICAS (SLA por zona)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zones (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  sla_hours   INTEGER NOT NULL DEFAULT 24 CHECK (sla_hours > 0),
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. CUADRILLAS OPERATIVAS (CREWS)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crews (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT UNIQUE NOT NULL,
  zone_id      BIGINT REFERENCES public.zones(id) ON DELETE SET NULL,
  specialty    TEXT[] NOT NULL DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  workload     INTEGER NOT NULL DEFAULT 0 CHECK (workload >= 0 AND workload <= 3),
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. USUARIOS Y ROLES (Reemplaza auth.users + profiles)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'citizen'
                CHECK (role IN ('admin', 'supervisor', 'operator', 'citizen')),
  zone_id       BIGINT REFERENCES public.zones(id) ON DELETE SET NULL,
  crew_id       BIGINT REFERENCES public.crews(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. REPORTES CIUDADANOS (PQR)
-- ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.report_tracking_seq START 1;

CREATE TABLE IF NOT EXISTS public.reports (
  id                    BIGSERIAL PRIMARY KEY,
  tracking_code         TEXT UNIQUE,

  -- Reportante (PII protegida: nunca exponer en endpoints públicos)
  reporter_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reporter_name         TEXT NOT NULL DEFAULT 'Ciudadano Anónimo',
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
                          'EN_PROGRESO', 'EVIDENCIA_PENDIENTE',
                          'VERIFICACION_SUPERVISOR', 'RESUELTO',
                          'CERRADO', 'EVALUADO', 'RECHAZADO'
                        )),

  -- Ubicación y descripción
  description           TEXT,
  address               TEXT NOT NULL,
  zone_id               BIGINT REFERENCES public.zones(id) ON DELETE SET NULL,
  sector                TEXT,
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,

  -- Evidencia multimedia (rutas relativas en almacenamiento local)
  photo_path            TEXT,
  evidence_path         TEXT,

  -- Trazabilidad operativa y SLA
  assigned_operator_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_crew_id      BIGINT REFERENCES public.crews(id) ON DELETE SET NULL,
  work_order            TEXT,
  assigned_at           TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  attention_hours       DOUBLE PRECISION,

  -- Metadatos
  source                TEXT NOT NULL DEFAULT 'WEB'
                        CHECK (source IN (
                          'WEB', 'OFFLINE', 'WHATSAPP', 'APP_MOVIL',
                          'TELEFONO', 'CORREO', 'PRESENCIAL', 'BOTON_EMERGENCIA'
                        )),
  is_recurrent          BOOLEAN NOT NULL DEFAULT FALSE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status    ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_zone      ON public.reports(zone_id);
CREATE INDEX IF NOT EXISTS idx_reports_priority  ON public.reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_created   ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category  ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_crew      ON public.reports(assigned_crew_id);
CREATE INDEX IF NOT EXISTS idx_reports_recurrent ON public.reports(is_recurrent) WHERE is_recurrent = TRUE;

-- ─────────────────────────────────────────────
-- 5. HISTORIAL DE ESTADOS (AUDITORÍA)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_history (
  id              BIGSERIAL PRIMARY KEY,
  report_id       BIGINT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_history_report ON public.report_history(report_id);

-- ─────────────────────────────────────────────
-- 6. EVIDENCIAS DE CAMPO (OPERARIOS)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evidences (
  id             BIGSERIAL PRIMARY KEY,
  report_id      BIGINT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  evidence_url   TEXT NOT NULL,
  description    TEXT NOT NULL,
  materials      TEXT,
  hours_spent    DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (hours_spent >= 0),
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  uploaded_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidences_report ON public.evidences(report_id);

-- ─────────────────────────────────────────────
-- 7. VERIFICACIONES DE SUPERVISOR
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verifications (
  id             BIGSERIAL PRIMARY KEY,
  report_id      BIGINT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  supervisor_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decision       TEXT NOT NULL CHECK (decision IN ('APROBADO', 'RECHAZADO', 'REGLAMENTO_PENDIENTE')),
  comments       TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_report ON public.verifications(report_id);

-- ─────────────────────────────────────────────
-- 8. CALIFICACIONES CSAT (ENCUESTAS)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ratings (
  id          BIGSERIAL PRIMARY KEY,
  report_id   BIGINT NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  citizen_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  score       INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8b. DOCUMENTOS PDF ARCHIVADOS EN S3 / MINIO
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id           BIGSERIAL PRIMARY KEY,
  report_id    BIGINT REFERENCES public.reports(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL CHECK (doc_type IN ('COMPROBANTE_PQR', 'REPORTE_EJECUTIVO')),
  s3_bucket    TEXT NOT NULL,
  s3_key       TEXT UNIQUE NOT NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes   INTEGER NOT NULL CHECK (size_bytes > 0),
  sha256_hash  TEXT NOT NULL,
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_report   ON public.documents(report_id);
CREATE INDEX IF NOT EXISTS idx_documents_type     ON public.documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_created  ON public.documents(created_at DESC);

-- ─────────────────────────────────────────────
-- 8c. BITÁCORA DE NOTIFICACIONES (CORREO SMTP)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id            BIGSERIAL PRIMARY KEY,
  report_id     BIGINT REFERENCES public.reports(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL', 'WHATSAPP')),
  event_type    TEXT NOT NULL,
  recipient     TEXT NOT NULL,
  subject       TEXT,
  status        TEXT NOT NULL CHECK (status IN ('ENVIADO', 'ERROR', 'OMITIDO')),
  provider_id   TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_report  ON public.notification_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notification_logs(created_at DESC);

-- ─────────────────────────────────────────────
-- 9. FUNCIONES Y TRIGGERS (SIN RACE CONDITIONS NI DOBLE CONTEO)
-- ─────────────────────────────────────────────

-- 9a. Generación atómica de código PQR usando SEQUENCE
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TRIGGER AS $$
DECLARE
  seq_num BIGINT;
BEGIN
  IF NEW.tracking_code IS NULL THEN
    seq_num := nextval('public.report_tracking_seq');
    NEW.tracking_code := 'REP-' || TO_CHAR(NOW() AT TIME ZONE 'America/Bogota', 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_tracking_code ON public.reports;
CREATE TRIGGER trg_generate_tracking_code
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tracking_code();

-- 9b. Detección automática de reincidencia (~100m en los últimos 90 días)
CREATE OR REPLACE FUNCTION public.check_recurrence()
RETURNS TRIGGER AS $$
DECLARE
  nearby_count INTEGER;
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    SELECT COUNT(*) INTO nearby_count
    FROM public.reports r
    WHERE r.lat IS NOT NULL AND r.lng IS NOT NULL
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_recurrence ON public.reports;
CREATE TRIGGER trg_check_recurrence
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_recurrence();

-- 9c. Auditoría de historial + cálculo automático de timestamps y SLA
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
  v_notes TEXT;
BEGIN
  BEGIN
    v_actor := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  v_notes := NULLIF(current_setting('app.status_change_notes', true), '');

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.report_history (report_id, previous_status, new_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, v_actor, v_notes);

    IF NEW.status = 'ASIGNADO' AND OLD.status IS DISTINCT FROM 'ASIGNADO' THEN
      NEW.assigned_at := COALESCE(NEW.assigned_at, NOW());
    END IF;

    IF NEW.status = 'RESUELTO' AND OLD.status IS DISTINCT FROM 'RESUELTO' THEN
      NEW.resolved_at := COALESCE(NEW.resolved_at, NOW());
      NEW.attention_hours := ROUND((EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.created_at)) / 3600.0)::NUMERIC, 2);
    END IF;

    IF NEW.status = 'CERRADO' AND OLD.status IS DISTINCT FROM 'CERRADO' THEN
      NEW.closed_at := COALESCE(NEW.closed_at, NOW());
      NEW.resolved_at := COALESCE(NEW.resolved_at, NOW());
      NEW.attention_hours := ROUND((EXTRACT(EPOCH FROM (COALESCE(NEW.resolved_at, NOW()) - NEW.created_at)) / 3600.0)::NUMERIC, 2);
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_status_change ON public.reports;
CREATE TRIGGER trg_log_status_change
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.log_status_change();

-- 9d. Sincronización exacta de carga (workload) de cuadrillas (sin doble conteo ni bug NULL !=)
CREATE OR REPLACE FUNCTION public.sync_crew_workload()
RETURNS TRIGGER AS $$
DECLARE
  v_old_active BOOLEAN := FALSE;
  v_new_active BOOLEAN := FALSE;
  v_old_crew   BIGINT;
  v_new_crew   BIGINT;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_active := OLD.status IN ('ASIGNADO', 'EN_PROGRESO', 'EVIDENCIA_PENDIENTE', 'VERIFICACION_SUPERVISOR');
    v_old_crew := OLD.assigned_crew_id;
    IF v_old_crew IS NULL AND OLD.work_order IS NOT NULL THEN
      SELECT id INTO v_old_crew FROM public.crews WHERE name = OLD.work_order LIMIT 1;
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_active := NEW.status IN ('ASIGNADO', 'EN_PROGRESO', 'EVIDENCIA_PENDIENTE', 'VERIFICACION_SUPERVISOR');
    v_new_crew := NEW.assigned_crew_id;
    IF v_new_crew IS NULL AND NEW.work_order IS NOT NULL THEN
      SELECT id INTO v_new_crew FROM public.crews WHERE name = NEW.work_order LIMIT 1;
    END IF;
  END IF;

  -- Si cambia cuadrilla o pasa de activo a inactivo, recalcular cuadrilla anterior
  IF v_old_crew IS NOT NULL AND (TG_OP = 'DELETE' OR v_old_crew IS DISTINCT FROM v_new_crew OR v_old_active IS DISTINCT FROM v_new_active) THEN
    UPDATE public.crews c
    SET
      workload = LEAST(3, (
        SELECT COUNT(*) FROM public.reports r
        WHERE (r.assigned_crew_id = c.id OR (r.assigned_crew_id IS NULL AND r.work_order = c.name))
          AND r.status IN ('ASIGNADO', 'EN_PROGRESO', 'EVIDENCIA_PENDIENTE', 'VERIFICACION_SUPERVISOR')
      )),
      is_available = (
        SELECT COUNT(*) FROM public.reports r
        WHERE (r.assigned_crew_id = c.id OR (r.assigned_crew_id IS NULL AND r.work_order = c.name))
          AND r.status IN ('ASIGNADO', 'EN_PROGRESO', 'EVIDENCIA_PENDIENTE', 'VERIFICACION_SUPERVISOR')
      ) < 3
    WHERE c.id = v_old_crew;
  END IF;

  -- Recalcular cuadrilla nueva si aplica
  IF v_new_crew IS NOT NULL AND (TG_OP = 'INSERT' OR v_old_crew IS DISTINCT FROM v_new_crew OR v_old_active IS DISTINCT FROM v_new_active) THEN
    UPDATE public.crews c
    SET
      workload = LEAST(3, (
        SELECT COUNT(*) FROM public.reports r
        WHERE (r.assigned_crew_id = c.id OR (r.assigned_crew_id IS NULL AND r.work_order = c.name))
          AND r.status IN ('ASIGNADO', 'EN_PROGRESO', 'EVIDENCIA_PENDIENTE', 'VERIFICACION_SUPERVISOR')
      )),
      is_available = (
        SELECT COUNT(*) FROM public.reports r
        WHERE (r.assigned_crew_id = c.id OR (r.assigned_crew_id IS NULL AND r.work_order = c.name))
          AND r.status IN ('ASIGNADO', 'EN_PROGRESO', 'EVIDENCIA_PENDIENTE', 'VERIFICACION_SUPERVISOR')
      ) < 3
    WHERE c.id = v_new_crew;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_crew_workload ON public.reports;
CREATE TRIGGER trg_sync_crew_workload
  AFTER INSERT OR UPDATE OR DELETE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_crew_workload();

-- 9e. Auto-cambiar reporte a EVALUADO al registrar calificación CSAT
CREATE OR REPLACE FUNCTION public.mark_report_as_evaluated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reports
  SET status = 'EVALUADO', updated_at = NOW()
  WHERE id = NEW.report_id AND status = 'CERRADO';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mark_report_evaluated ON public.ratings;
CREATE TRIGGER trg_mark_report_evaluated
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_report_as_evaluated();

-- 9f. Asignación automática de cuadrilla (con lock para evitar colisiones concurrentes)
CREATE OR REPLACE FUNCTION public.assign_crew_automatically(p_report_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
  v_zone_id   BIGINT;
  v_lat       DOUBLE PRECISION;
  v_lng       DOUBLE PRECISION;
  v_crew_id   BIGINT;
  v_crew_name TEXT;
BEGIN
  SELECT zone_id, lat, lng INTO v_zone_id, v_lat, v_lng
  FROM public.reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Prioridad 1: misma zona, menor carga, mayor cercanía
  SELECT id, name INTO v_crew_id, v_crew_name
  FROM public.crews
  WHERE is_available = TRUE
    AND workload < 3
    AND (zone_id = v_zone_id OR v_zone_id IS NULL)
  ORDER BY
    CASE WHEN zone_id = v_zone_id THEN 0 ELSE 1 END,
    workload ASC,
    CASE
      WHEN lat IS NOT NULL AND lng IS NOT NULL AND v_lat IS NOT NULL AND v_lng IS NOT NULL
      THEN POWER(lat - v_lat, 2) + POWER(lng - v_lng, 2)
      ELSE 999999
    END ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Prioridad 2 (fallback global): cualquier cuadrilla con capacidad disponible
  IF v_crew_id IS NULL THEN
    SELECT id, name INTO v_crew_id, v_crew_name
    FROM public.crews
    WHERE is_available = TRUE AND workload < 3
    ORDER BY workload ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  IF v_crew_id IS NOT NULL THEN
    UPDATE public.reports
    SET
      status = 'ASIGNADO',
      work_order = v_crew_name,
      assigned_crew_id = v_crew_id,
      assigned_at = COALESCE(assigned_at, NOW())
    WHERE id = p_report_id;
  END IF;

  RETURN v_crew_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 10. VISTAS ANALÍTICAS
-- ─────────────────────────────────────────────

CREATE OR REPLACE VIEW public.reports_by_zone AS
SELECT
  z.id        AS zone_id,
  z.name      AS zone_name,
  z.code      AS zone_code,
  z.sla_hours,
  COUNT(r.id) AS total_reports,
  COUNT(r.id) FILTER (
    WHERE r.status NOT IN ('CERRADO', 'EVALUADO', 'RECHAZADO', 'RESUELTO')
  )           AS active_reports,
  COUNT(r.id) FILTER (WHERE r.is_recurrent = TRUE) AS recurrent_reports,
  ROUND((AVG(r.attention_hours) FILTER (WHERE r.attention_hours IS NOT NULL))::NUMERIC, 2) AS avg_hours
FROM public.zones z
LEFT JOIN public.reports r ON r.zone_id = z.id
GROUP BY z.id, z.name, z.code, z.sla_hours
ORDER BY total_reports DESC, z.name ASC;

CREATE OR REPLACE VIEW public.reports_sla_status AS
SELECT
  r.id,
  r.tracking_code,
  r.status,
  r.priority,
  z.name AS zone_name,
  z.sla_hours,
  r.created_at,
  ROUND((EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0)::NUMERIC, 2) AS hours_elapsed,
  CASE
    WHEN r.status IN ('CERRADO', 'EVALUADO', 'RESUELTO', 'RECHAZADO') THEN 'FINALIZADO'
    WHEN z.sla_hours IS NULL THEN 'A TIEMPO'
    WHEN (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) > z.sla_hours THEN 'VENCIDO'
    WHEN (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) > (z.sla_hours * 0.75) THEN 'RIESGO'
    ELSE 'A TIEMPO'
  END AS sla_status
FROM public.reports r
LEFT JOIN public.zones z ON r.zone_id = z.id;

CREATE OR REPLACE VIEW public.vw_kpi_sla_compliance AS
WITH evaluated AS (
  SELECT
    r.id,
    CASE
      WHEN EXTRACT(EPOCH FROM (COALESCE(r.resolved_at, r.updated_at) - r.created_at)) / 3600.0 <=
        CASE r.priority
          WHEN 'CRITICA' THEN 0.5
          WHEN 'ALTA'    THEN 2.0
          WHEN 'MEDIA'   THEN 8.0
          ELSE 24.0
        END
      THEN 'A TIEMPO'
      ELSE 'VENCIDO'
    END AS sla_result
  FROM public.reports r
  WHERE r.status IN ('RESUELTO', 'CERRADO', 'EVALUADO')
)
SELECT
  COUNT(*) AS total_resolved,
  COUNT(*) FILTER (WHERE sla_result = 'A TIEMPO') AS on_time_count,
  ROUND(
    (COUNT(*) FILTER (WHERE sla_result = 'A TIEMPO')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS compliance_percentage
FROM evaluated;

CREATE OR REPLACE VIEW public.crew_efficiency AS
SELECT
  c.id AS crew_id,
  c.name AS crew_name,
  c.workload,
  c.is_available,
  COUNT(r.id) FILTER (WHERE r.status IN ('CERRADO', 'EVALUADO', 'RESUELTO')) AS total_resolved,
  ROUND((AVG(r.attention_hours) FILTER (WHERE r.attention_hours IS NOT NULL))::NUMERIC, 2) AS avg_resolution_time
FROM public.crews c
LEFT JOIN public.reports r ON r.assigned_crew_id = c.id OR r.work_order = c.name
GROUP BY c.id, c.name, c.workload, c.is_available;
