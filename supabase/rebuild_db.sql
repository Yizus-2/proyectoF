-- ==============================================================================
-- ESSMAR SIGVI - SCRIPT DE REINICIO DE BASE DE DATOS SUPABASE
-- CUIDADO: Este script eliminará todas las tablas (fugas, hidrantes, etc)
-- y las volverá a crear desde cero ajustadas exactamente a lo que pide el frontend.
-- ==============================================================================

-- 1. Eliminar tablas existentes (en orden inverso de dependencia)
DROP TABLE IF EXISTS public.pressure_readings CASCADE;
DROP TABLE IF EXISTS public.hydrants CASCADE;
DROP TABLE IF EXISTS public.leaks CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Crear tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'))
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Disparador para crear el perfil automáticamente cuando un usuario se registra.
-- El primer usuario será administrador automáticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;
  
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, CASE WHEN is_first_user THEN 'admin' ELSE 'user' END)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. Crear tabla de Fugas (Leaks) - Ajustada al front
CREATE TABLE public.leaks (
    id BIGSERIAL PRIMARY KEY,
    work_order TEXT,
    reporter_name TEXT NOT NULL,
    reporter_phone TEXT,
    address TEXT NOT NULL,
    sector TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    photo_path TEXT,
    status TEXT NOT NULL DEFAULT 'REPORTADA',
    source TEXT NOT NULL DEFAULT 'WEB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.leaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_insert_leaks" ON public.leaks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "admins_can_manage_leaks" ON public.leaks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);


-- 5. Crear tabla de Hidrantes (Hydrants) - Ajustada al front
CREATE TABLE public.hydrants (
    id BIGSERIAL PRIMARY KEY,
    internal_code TEXT UNIQUE NOT NULL,
    common_name TEXT NOT NULL,
    address TEXT NOT NULL,
    sector TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.hydrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_view_hydrants" ON public.hydrants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admins_can_manage_hydrants" ON public.hydrants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);


-- 6. Crear tabla de Presiones (Pressure Readings) - Ajustada al front
CREATE TABLE public.pressure_readings (
    id BIGSERIAL PRIMARY KEY,
    hydrant_id BIGINT REFERENCES public.hydrants(id) ON DELETE CASCADE NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    measured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_name TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    source TEXT NOT NULL DEFAULT 'WEB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.pressure_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_insert_pressures" ON public.pressure_readings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "admins_can_manage_pressures" ON public.pressure_readings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ==============================================================================
-- FIN DEL SCRIPT. 
-- Ejecuta esto en el SQL Editor de Supabase para tener la base de datos limpia.
-- ==============================================================================
