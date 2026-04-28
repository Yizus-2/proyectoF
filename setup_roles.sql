-- 1. Create a table for public profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'))
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Users can read their own profile
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

-- 4. Function & Trigger: Auto-create profile when a new user signs up
-- The first user to EVER sign up will automatically get the 'admin' role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first profile in the system
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;
  
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id, 
    new.email, 
    CASE WHEN is_first_user THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Authorize admin user: Lnieto009@gmail.com
-- If the user already signed up via the UI, promote to admin:
UPDATE public.profiles SET role = 'admin' WHERE email = 'Lnieto009@gmail.com';

-- If the user has NOT signed up yet, create via Supabase Dashboard:
--   Go to Authentication > Users > Invite user
--   Email: Lnieto009@gmail.com
--   Password: @Ghost0412356
-- The trigger will auto-create the profile, then run the UPDATE above.

-- 6. Leaks Table
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

-- 7. Hydrants Table
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

-- 8. Pressure Readings Table
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

-- --- Enable RLS for additional tables ---
ALTER TABLE public.leaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pressure_readings ENABLE ROW LEVEL SECURITY;

-- --- RLS Policies for additional tables ---

-- Leaks: Anyone authenticated can create, but only admins can read all/update/delete
DROP POLICY IF EXISTS "authenticated_can_insert_leaks" ON public.leaks;
CREATE POLICY "authenticated_can_insert_leaks" ON public.leaks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_can_all_leaks" ON public.leaks;
CREATE POLICY "admins_can_all_leaks" ON public.leaks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Hydrants: Only admins can manage, authenticated can Read
DROP POLICY IF EXISTS "authenticated_can_view_hydrants" ON public.hydrants;
CREATE POLICY "authenticated_can_view_hydrants" ON public.hydrants FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_can_manage_hydrants" ON public.hydrants;
CREATE POLICY "admins_can_manage_hydrants" ON public.hydrants FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Pressures: Only admins can manage, authenticated can Insert
DROP POLICY IF EXISTS "authenticated_can_insert_pressures" ON public.pressure_readings;
CREATE POLICY "authenticated_can_insert_pressures" ON public.pressure_readings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_can_manage_pressures" ON public.pressure_readings;
CREATE POLICY "admins_can_manage_pressures" ON public.pressure_readings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Storage Bucket Instructions:
-- Create a bucket named 'leaks' and set it to public or with appropriate policies.
