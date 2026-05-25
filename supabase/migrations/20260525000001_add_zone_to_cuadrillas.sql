-- 1. Añadir zone_id a cuadrillas
ALTER TABLE public.cuadrillas ADD COLUMN zone_id bigint REFERENCES public.zones(id);

-- 2. Asignar zonas a cuadrillas basado en su nombre
UPDATE public.cuadrillas SET zone_id = (SELECT id FROM public.zones WHERE name ILIKE '%Norte%' LIMIT 1) WHERE nombre ILIKE '%Norte%';
UPDATE public.cuadrillas SET zone_id = (SELECT id FROM public.zones WHERE name ILIKE '%Centro%' LIMIT 1) WHERE nombre ILIKE '%Centro%';
UPDATE public.cuadrillas SET zone_id = (SELECT id FROM public.zones WHERE name ILIKE '%Sur%' LIMIT 1) WHERE nombre ILIKE '%Sur%';
UPDATE public.cuadrillas SET zone_id = (SELECT id FROM public.zones WHERE name ILIKE '%Oriente%' LIMIT 1) WHERE nombre ILIKE '%Oriente%';
UPDATE public.cuadrillas SET zone_id = (SELECT id FROM public.zones WHERE name ILIKE '%Occidente%' LIMIT 1) WHERE nombre ILIKE '%Occidente%';
