-- ==============================================================================
-- ESSMAR SIGVI - Semilla Idempotente de Zonas y Cuadrillas (Santa Marta)
-- ==============================================================================

INSERT INTO public.zones (name, code, sla_hours, lat, lng) VALUES
  ('Centro Histórico',  'ZONA-01', 12, 11.2444, -74.2127),
  ('Rodadero',          'ZONA-02', 24, 11.2031, -74.2275),
  ('Mamatoco',          'ZONA-03', 24, 11.2263, -74.1798),
  ('Bastidas',          'ZONA-04', 24, 11.2421, -74.1843),
  ('Gaira',             'ZONA-05', 24, 11.1965, -74.2210),
  ('Taganga',           'ZONA-06', 48, 11.2675, -74.1912),
  ('Bonda',             'ZONA-07', 48, 11.2285, -74.1231),
  ('Zona Industrial',   'ZONA-08', 24, 11.2181, -74.1805),
  ('Pescaíto',          'ZONA-09', 24, 11.2501, -74.2122),
  ('Otros',             'ZONA-99', 48, 11.2404, -74.2110)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  sla_hours = EXCLUDED.sla_hours,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng;

INSERT INTO public.crews (name, zone_id, specialty, is_available, workload, lat, lng)
SELECT seed.name, z.id, seed.specialty, TRUE, 0, z.lat, z.lng
FROM (VALUES
  ('Cuadrilla Alfa - Centro Histórico', 'ZONA-01', ARRAY['fuga_agua', 'tuberia_rota']),
  ('Cuadrilla Beta - Rodadero',         'ZONA-02', ARRAY['fuga_agua', 'fuga_alcantarillado']),
  ('Cuadrilla Gamma - Mamatoco',        'ZONA-03', ARRAY['tuberia_rota', 'dano_pavimento']),
  ('Cuadrilla Delta - Bastidas',        'ZONA-04', ARRAY['fuga_agua', 'otro']),
  ('Cuadrilla Epsilon - Gaira',         'ZONA-05', ARRAY['fuga_alcantarillado', 'dano_infraestructura']),
  ('Cuadrilla Zeta - Taganga',          'ZONA-06', ARRAY['fuga_agua', 'tuberia_rota']),
  ('Cuadrilla Eta - Bonda',             'ZONA-07', ARRAY['dano_infraestructura', 'otro']),
  ('Cuadrilla Theta - Zona Industrial', 'ZONA-08', ARRAY['tuberia_rota', 'dano_pavimento']),
  ('Cuadrilla Iota - Pescaíto',         'ZONA-09', ARRAY['fuga_agua', 'fuga_alcantarillado']),
  ('Cuadrilla Kappa - General',         'ZONA-99', ARRAY['otro', 'dano_infraestructura'])
) AS seed(name, zone_code, specialty)
JOIN public.zones z ON z.code = seed.zone_code
ON CONFLICT (name) DO NOTHING;
