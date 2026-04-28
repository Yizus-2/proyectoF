-- 1. Leaks Table
CREATE TABLE IF NOT EXISTS public.leaks (
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

-- 2. Hydrants Table
CREATE TABLE IF NOT EXISTS public.hydrants (
    id BIGSERIAL PRIMARY KEY,
    internal_code TEXT UNIQUE NOT NULL,
    common_name TEXT NOT NULL,
    address TEXT NOT NULL,
    sector TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Pressure Readings Table
CREATE TABLE IF NOT EXISTS public.pressure_readings (
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

-- --- Enable RLS ---
ALTER TABLE public.leaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pressure_readings ENABLE ROW LEVEL SECURITY;

-- --- RLS Policies ---

-- Leaks: Anyone authenticated can create, but only admins can read all/update/delete
CREATE POLICY "authenticated_can_insert_leaks" ON public.leaks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "admins_can_all_leaks" ON public.leaks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Hydrants: Only admins can manage, authenticated can Read
CREATE POLICY "authenticated_can_view_hydrants" ON public.hydrants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admins_can_manage_hydrants" ON public.hydrants FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Pressures: Only admins can manage, authenticated can Insert
CREATE POLICY "authenticated_can_insert_pressures" ON public.pressure_readings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "admins_can_manage_pressures" ON public.pressure_readings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Storage Bucket Instructions (Can't be automated in SQL easily for all envs):
-- Create a bucket named 'leaks' and set it to public or with appropriate policies.
