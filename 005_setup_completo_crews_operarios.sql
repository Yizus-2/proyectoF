-- =================================================================
-- SCRIPT COMPLETO CORREGIDO: Crews, Evidences, RLS y Operarios
-- Ejecutar en el SQL Editor de Supabase (Dashboard)
-- =================================================================

-- 1. Crear tabla crews (unificada)
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

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crews' AND policyname = 'crews_viewable_by_authenticated') THEN
    CREATE POLICY "crews_viewable_by_authenticated" ON public.crews FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crews' AND policyname = 'admins_can_manage_crews') THEN
    CREATE POLICY "admins_can_manage_crews" ON public.crews FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.crews TO anon, authenticated;

-- 2. Crear tabla evidences (unificada)
CREATE TABLE IF NOT EXISTS public.evidences (
  id             BIGSERIAL PRIMARY KEY,
  report_id      BIGINT REFERENCES public.reports(id) ON DELETE CASCADE,
  evidence_url   TEXT NOT NULL,
  description    TEXT NOT NULL,
  materials      TEXT,
  hours_spent    DECIMAL(4,2) NOT NULL DEFAULT 0,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  uploaded_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'evidences' AND policyname = 'evidences_viewable_by_operators_and_admins') THEN
    CREATE POLICY "evidences_viewable_by_operators_and_admins" ON public.evidences FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'supervisor'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'evidences' AND policyname = 'operators_can_insert_evidences') THEN
    CREATE POLICY "operators_can_insert_evidences" ON public.evidences FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'supervisor'))
    );
  END IF;
END $$;

GRANT SELECT, INSERT ON public.evidences TO anon, authenticated;

-- 3. Asegurar que el rol 'supervisor' esté permitido en profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'operator', 'supervisor', 'citizen'));

-- Añadir crew_id a profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crew_id BIGINT REFERENCES public.crews(id);

-- 4. Parche RLS en reports para incluir al rol 'supervisor'
DROP POLICY IF EXISTS "reports_viewable_by_all" ON public.reports;
CREATE POLICY "reports_viewable_by_all" ON public.reports FOR SELECT USING (
  auth.role() = 'anon' OR reporter_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'supervisor')
  )
);

DROP POLICY IF EXISTS "operators_can_update" ON public.reports;
CREATE POLICY "operators_can_update" ON public.reports FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'supervisor')
  )
);

-- 5. Cargar cuadrillas semilla alineadas con las zonas de la base de datos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cuadrillas') THEN
    DROP TABLE IF EXISTS public.cuadrillas CASCADE;
  END IF;

  -- Insertar cuadrillas semilla si crews está vacía
  INSERT INTO public.crews (name, zone_id, is_available, workload, specialty)
  SELECT name, zone_id, true, 0, '{}'
  FROM (VALUES
    ('Cuadrilla Alfa - Centro Histórico', (SELECT id FROM public.zones WHERE name ILIKE '%Centro%' LIMIT 1)),
    ('Cuadrilla Beta - Rodadero',         (SELECT id FROM public.zones WHERE name ILIKE '%Rodadero%' LIMIT 1)),
    ('Cuadrilla Gamma - Mamatoco',       (SELECT id FROM public.zones WHERE name ILIKE '%Mamatoco%' LIMIT 1)),
    ('Cuadrilla Delta - Bastidas',       (SELECT id FROM public.zones WHERE name ILIKE '%Bastidas%' LIMIT 1)),
    ('Cuadrilla Epsilon - Gaira',        (SELECT id FROM public.zones WHERE name ILIKE '%Gaira%' LIMIT 1)),
    ('Cuadrilla Zeta - Taganga',         (SELECT id FROM public.zones WHERE name ILIKE '%Taganga%' LIMIT 1)),
    ('Cuadrilla Eta - Bonda',            (SELECT id FROM public.zones WHERE name ILIKE '%Bonda%' LIMIT 1)),
    ('Cuadrilla Theta - Zona Industrial', (SELECT id FROM public.zones WHERE name ILIKE '%Industrial%' LIMIT 1)),
    ('Cuadrilla Iota - Pescaíto',        (SELECT id FROM public.zones WHERE name ILIKE '%Pescaíto%' LIMIT 1)),
    ('Cuadrilla Kappa - General',        (SELECT id FROM public.zones WHERE name ILIKE '%Otros%' LIMIT 1))
  ) AS seed(name, zone_id)
  WHERE NOT EXISTS (SELECT 1 FROM public.crews);
END $$;

-- 6. Reescribir función RPC con fallback global
CREATE OR REPLACE FUNCTION public.assign_crew_automatically(p_report_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
  v_zone_id BIGINT;
  v_crew_id BIGINT;
  v_crew_name TEXT;
BEGIN
  SELECT zone_id INTO v_zone_id FROM public.reports WHERE id = p_report_id;

  -- Intentar asignar cuadrilla de la misma zona
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
  END IF;

  RETURN v_crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_crew_automatically(BIGINT) TO anon, authenticated;

-- ===================== TRIGGER AUTOMÁTICO DE WORKLOAD =====================
CREATE OR REPLACE FUNCTION public.update_crew_workload_on_report_change()
RETURNS TRIGGER AS $$
DECLARE
  v_crew_id BIGINT;
BEGIN
  -- Decrementar workload de la cuadrilla vieja si el reporte pasa a no estar activo o cambió de cuadrilla
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    IF (OLD.status IN ('ASIGNADO', 'EN_PROGRESO', 'VERIFICACION_SUPERVISOR') AND OLD.work_order IS NOT NULL) THEN
      IF (TG_OP = 'DELETE' OR NEW.status NOT IN ('ASIGNADO', 'EN_PROGRESO', 'VERIFICACION_SUPERVISOR') OR OLD.work_order != NEW.work_order) THEN
        SELECT id INTO v_crew_id FROM public.crews WHERE name = OLD.work_order;
        IF v_crew_id IS NOT NULL THEN
          UPDATE public.crews
          SET workload = GREATEST(0, workload - 1),
              is_available = CASE WHEN GREATEST(0, workload - 1) >= 3 THEN FALSE ELSE TRUE END
          WHERE id = v_crew_id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Incrementar workload de la cuadrilla nueva si el reporte pasa a estar activo o cambió de cuadrilla
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.status IN ('ASIGNADO', 'EN_PROGRESO', 'VERIFICACION_SUPERVISOR') AND NEW.work_order IS NOT NULL) THEN
      IF (TG_OP = 'INSERT' OR OLD.status NOT IN ('ASIGNADO', 'EN_PROGRESO', 'VERIFICACION_SUPERVISOR') OR OLD.work_order != NEW.work_order) THEN
        SELECT id INTO v_crew_id FROM public.crews WHERE name = NEW.work_order;
        IF v_crew_id IS NOT NULL THEN
          UPDATE public.crews
          SET workload = LEAST(3, workload + 1),
              is_available = CASE WHEN LEAST(3, workload + 1) >= 3 THEN FALSE ELSE TRUE END
          WHERE id = v_crew_id;
        END IF;
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_crew_workload ON public.reports;
CREATE TRIGGER trg_update_crew_workload
AFTER INSERT OR UPDATE OR DELETE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_crew_workload_on_report_change();


-- 7. Crear 10 operarios vinculados a sus cuadrillas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    c record;
    uid uuid;
    i integer := 1;
BEGIN
    FOR c IN SELECT id, name, zone_id FROM public.crews ORDER BY name LIMIT 10 LOOP
        -- Verificar si el email ya existe
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'operador' || i || '@essmar.co') THEN
          uid := gen_random_uuid();
          
          INSERT INTO auth.users (
              id, instance_id, email, encrypted_password, email_confirmed_at, 
              aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
          ) VALUES (
              uid, '00000000-0000-0000-0000-000000000000', 'operador' || i || '@essmar.co',
              crypt('Operario123*', gen_salt('bf')), now(), 'authenticated', 'authenticated',
              '{"provider":"email","providers":["email"]}', '{"role":"operator"}', now(), now()
          );
          
          INSERT INTO public.profiles (id, email, full_name, role, zone_id, crew_id)
          VALUES (uid, 'operador' || i || '@essmar.co', 'Operario - ' || c.name, 'operator', c.zone_id, c.id)
          ON CONFLICT (id) DO UPDATE 
          SET role = 'operator', crew_id = EXCLUDED.crew_id, zone_id = EXCLUDED.zone_id, full_name = EXCLUDED.full_name;
          
          RAISE NOTICE 'Creado: operador%@essmar.co -> %', i, c.name;
        ELSE
          -- Si ya existe, actualizar
          UPDATE public.profiles 
          SET crew_id = c.id, zone_id = c.zone_id, full_name = 'Operario - ' || c.name
          WHERE email = 'operador' || i || '@essmar.co';
          
          RAISE NOTICE 'Actualizado: operador%@essmar.co -> %', i, c.name;
        END IF;
        
        i := i + 1;
    END LOOP;
END $$;
