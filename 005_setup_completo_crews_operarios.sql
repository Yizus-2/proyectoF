-- =================================================================
-- SCRIPT COMPLETO: Crear crews, migrar cuadrillas, crear operarios
-- Ejecutar de una sola vez en el SQL Editor de Supabase
-- =================================================================

-- ===================== PASO 1: Crear tabla crews =====================
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

-- ===================== PASO 2: Crear tabla evidences =====================
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

-- ===================== PASO 3: Añadir crew_id a profiles =====================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crew_id BIGINT REFERENCES public.crews(id);

-- ===================== PASO 4: Migrar cuadrillas -> crews (si existen) =====================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cuadrillas') THEN
    -- Migrar datos
    INSERT INTO public.crews (name, zone_id, is_available, workload, specialty)
    SELECT 
      c.nombre, 
      c.zone_id, 
      true, 
      c.casos_activos, 
      '{}'
    FROM public.cuadrillas c
    WHERE NOT EXISTS (SELECT 1 FROM public.crews cr WHERE cr.name = c.nombre);

    -- Migrar FK de profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cuadrilla_id') THEN
      UPDATE public.profiles p
      SET crew_id = cr.id
      FROM public.cuadrillas c
      JOIN public.crews cr ON cr.name = c.nombre
      WHERE p.cuadrilla_id = c.id;

      ALTER TABLE public.profiles DROP COLUMN IF EXISTS cuadrilla_id;
    END IF;

    -- Eliminar tabla vieja
    DROP TABLE IF EXISTS public.cuadrillas CASCADE;
    
    RAISE NOTICE 'Tabla cuadrillas migrada y eliminada exitosamente.';
  ELSE
    RAISE NOTICE 'Tabla cuadrillas no existe, insertando cuadrillas semilla directamente en crews...';
    
    -- Insertar cuadrillas semilla si crews está vacía
    INSERT INTO public.crews (name, zone_id, is_available, workload, specialty)
    SELECT name, zone_id, true, 0, '{}'
    FROM (VALUES
      ('Cuadrilla Alfa - Norte',      (SELECT id FROM public.zones WHERE name ILIKE '%Norte%' LIMIT 1)),
      ('Cuadrilla Beta - Norte',      (SELECT id FROM public.zones WHERE name ILIKE '%Norte%' LIMIT 1)),
      ('Cuadrilla Gamma - Centro',    (SELECT id FROM public.zones WHERE name ILIKE '%Centro%' LIMIT 1)),
      ('Cuadrilla Delta - Centro',    (SELECT id FROM public.zones WHERE name ILIKE '%Centro%' LIMIT 1)),
      ('Cuadrilla Epsilon - Sur',     (SELECT id FROM public.zones WHERE name ILIKE '%Sur%' LIMIT 1)),
      ('Cuadrilla Zeta - Sur',        (SELECT id FROM public.zones WHERE name ILIKE '%Sur%' LIMIT 1)),
      ('Cuadrilla Eta - Oriente',     (SELECT id FROM public.zones WHERE name ILIKE '%Oriente%' LIMIT 1)),
      ('Cuadrilla Theta - Oriente',   (SELECT id FROM public.zones WHERE name ILIKE '%Oriente%' LIMIT 1)),
      ('Cuadrilla Iota - Occidente',  (SELECT id FROM public.zones WHERE name ILIKE '%Occidente%' LIMIT 1)),
      ('Cuadrilla Kappa - Occidente', (SELECT id FROM public.zones WHERE name ILIKE '%Occidente%' LIMIT 1))
    ) AS seed(name, zone_id)
    WHERE NOT EXISTS (SELECT 1 FROM public.crews);
  END IF;
END $$;

-- ===================== PASO 5: Reescribir función RPC =====================
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

    UPDATE public.crews
    SET workload = workload + 1,
        is_available = CASE WHEN workload + 1 >= 3 THEN FALSE ELSE TRUE END
    WHERE id = v_crew_id;
  END IF;

  RETURN v_crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_crew_automatically(BIGINT) TO anon, authenticated;

-- ===================== PASO 6: Crear 10 operarios =====================
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
          -- Si ya existe, solo actualizar el profile
          UPDATE public.profiles 
          SET crew_id = c.id, zone_id = c.zone_id, full_name = 'Operario - ' || c.name
          WHERE email = 'operador' || i || '@essmar.co';
          
          RAISE NOTICE 'Actualizado: operador%@essmar.co -> %', i, c.name;
        END IF;
        
        i := i + 1;
    END LOOP;
END $$;
