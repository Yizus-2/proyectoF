-- 004_setup_10_operarios.sql
-- Vincula perfiles de usuario (Operarios) con sus respectivas cuadrillas base.

-- 1. Añadir columna a profiles para asociarlos a una cuadrilla (Opcional, pero recomendado)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cuadrilla_id uuid REFERENCES public.cuadrillas(id);

-- 2. Asegurarnos que pgcrypto está activo para generar contraseñas (solo para inserts directos en BD)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Crear 10 operarios vinculados 1 a 1 con las cuadrillas insertadas en el paso 002
DO $$
DECLARE
    c record;
    uid uuid;
    i integer := 1;
BEGIN
    FOR c IN SELECT id, nombre, zone_id FROM public.cuadrillas ORDER BY nombre LIMIT 10 LOOP
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
        
        -- Insertar en public.profiles (O actualizar si existe un trigger)
        INSERT INTO public.profiles (id, email, full_name, role, zone_id, cuadrilla_id)
        VALUES (uid, 'operador' || i || '@essmar.co', 'Operario - ' || c.nombre, 'operator', c.zone_id, c.id)
        ON CONFLICT (id) DO UPDATE 
        SET role = 'operator', cuadrilla_id = EXCLUDED.cuadrilla_id, zone_id = EXCLUDED.zone_id, full_name = EXCLUDED.full_name;
        
        i := i + 1;
    END LOOP;
END $$;
