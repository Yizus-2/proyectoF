-- 002_setup_cuadrillas_operaciones.sql
-- Migración para el módulo de Operaciones, Cuadrillas y Evidencias.

-- 1. Insertar 10 cuadrillas iniciales si no existen
INSERT INTO public.cuadrillas (id, nombre, casos_activos, casos_maximos, rendimiento_score)
VALUES 
  (gen_random_uuid(), 'Cuadrilla Alfa - Norte', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Beta - Norte', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Gamma - Centro', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Delta - Centro', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Epsilon - Sur', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Zeta - Sur', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Eta - Oriente', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Theta - Oriente', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Iota - Occidente', 0, 3, 100),
  (gen_random_uuid(), 'Cuadrilla Kappa - Occidente', 0, 3, 100)
ON CONFLICT (nombre) DO NOTHING;

-- 2. Asegurar Políticas RLS para Asignaciones (Solo Admins)
-- Habilitar RLS si no está habilitado
ALTER TABLE public.asignaciones ENABLE ROW LEVEL SECURITY;

-- Política: Solo Administradores pueden insertar en asignaciones
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'asignaciones' AND policyname = 'Admins can assign cases'
    ) THEN
        CREATE POLICY "Admins can assign cases" ON public.asignaciones
            FOR INSERT 
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- Política: Lectura de asignaciones para todos los usuarios autenticados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'asignaciones' AND policyname = 'Users can read asignaciones'
    ) THEN
        CREATE POLICY "Users can read asignaciones" ON public.asignaciones
            FOR SELECT 
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 3. Trigger para actualizar la carga de la cuadrilla (casos_activos)
CREATE OR REPLACE FUNCTION update_cuadrilla_load()
RETURNS TRIGGER AS $$
BEGIN
    -- Incrementar carga al asignar
    IF TG_OP = 'INSERT' THEN
        UPDATE public.cuadrillas 
        SET casos_activos = casos_activos + 1 
        WHERE id = NEW.cuadrilla_id;
    END IF;
    -- Decrementar carga al remover asignacion
    IF TG_OP = 'DELETE' THEN
        UPDATE public.cuadrillas 
        SET casos_activos = GREATEST(casos_activos - 1, 0)
        WHERE id = OLD.cuadrilla_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cuadrilla_load ON public.asignaciones;
CREATE TRIGGER trigger_update_cuadrilla_load
AFTER INSERT OR DELETE ON public.asignaciones
FOR EACH ROW EXECUTE FUNCTION update_cuadrilla_load();

-- 4. Trigger de Verificación: Cuando llega una evidencia, actualizar reporte
CREATE OR REPLACE FUNCTION process_evidencia_reporte()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es falso aviso, marcarlo y enviar a verificacion
    IF NEW.tipo = 'FALSO_AVISO' THEN
        UPDATE public.reportes 
        SET es_falso_aviso = true, estado = 'VERIFICACION_SUPERVISOR'
        WHERE id = NEW.reporte_id;
    END IF;
    
    -- Si es evidencia de completado
    IF NEW.tipo = 'FINALIZADO' THEN
        UPDATE public.reportes 
        SET estado = 'VERIFICACION_SUPERVISOR', completado_en = NOW()
        WHERE id = NEW.reporte_id;
    END IF;

    -- Si es evidencia de llegada
    IF NEW.tipo = 'LLEGADA_SITIO' THEN
        UPDATE public.reportes 
        SET estado = 'EN_PROGRESO'
        WHERE id = NEW.reporte_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_evidencia ON public.evidencias;
CREATE TRIGGER trigger_process_evidencia
AFTER INSERT ON public.evidencias
FOR EACH ROW EXECUTE FUNCTION process_evidencia_reporte();
