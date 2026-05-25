-- 004_setup_10_operarios.sql
-- Vincula perfiles de usuario (Operarios) con sus respectivas cuadrillas base.
-- IMPORTANTE: Ejecutar DESPUÉS de 20260525100000_unify_crews.sql

-- 1. Asegurarnos que pgcrypto está activo
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Crear 10 operarios vinculados 1 a 1 con las cuadrillas en public.crews
DO $$
DECLARE
    c record;
    uid uuid;
    i integer := 1;
BEGIN
    FOR c IN SELECT id, name, zone_id FROM public.crews ORDER BY name LIMIT 10 LOOP
        uid := gen_random_uuid();
        
        -- Insertar en auth.users (Supabase Auth Core)
        -- Contraseña por defecto: Operario123*
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            uid, '00000000-0000-0000-0000-000000000000', 'operador' || i || '@essmar.co',
            crypt('Operario123*', gen_salt('bf')), now(), 'authenticated', 'authenticated',
            '{"provider":"email","providers":["email"]}', '{"role":"operator"}', now(), now()
        );
        
        -- Insertar en public.profiles con crew_id (tabla unificada)
        INSERT INTO public.profiles (id, email, full_name, role, zone_id, crew_id)
        VALUES (uid, 'operador' || i || '@essmar.co', 'Operario - ' || c.name, 'operator', c.zone_id, c.id)
        ON CONFLICT (id) DO UPDATE 
        SET role = 'operator', crew_id = EXCLUDED.crew_id, zone_id = EXCLUDED.zone_id, full_name = EXCLUDED.full_name;
        
        i := i + 1;
    END LOOP;
END $$;
