# ESSMAR SIGVI (Frontend)

**Sistema Interno de Gestión de Vías e Infraestructura**

La aplicación cliente de ESSMAR SIGVI, orientada a gestionar y visualizar reportes de infraestructura, captura de incidencias (fugas de agua), levantamiento del inventario técnico (hidrantes), e ingreso de métricas de presión de redes. Forma la base de interacción con los usuarios bajo diferentes perfiles de seguridad.

Esta aplicación se encuentra completamente conectada al modelo Backend-as-a-Service (BaaS) usando **Supabase** (Postgres y Edge Authentication) o bien, hacia una API REST a medida.

---

## 💻 Entorno y Tecnologías

El cliente es una aplicación SPA optimizada y moderna.

### Componentes Clave:
- **Vue 3 (Composition API):** Lógica visual rápida, escalable y mantenible.
- **Vite (Versión 5.x):** Empaquetador de dependencias extremadamente veloz, compatible con **Node.js 18+**.
- **TypeScript:** Fuertemente tipado para estructuras de datos como `Leak`, `Hydrant` o `PressureReading`.
- **Leaflet:** Integración con mapas vectoriales para plasmar coordenadas.
- **Pinia:** Gestor de estado para la sesión (`useAuthStore`).
- **Vue Router:** Protección estricta de rutas con metas como `requiresAuth` y control de perfiles basado en `role`.
- **Modo Offline:** Cuenta con `useOfflineSync`, un composable propio diseñado para capturar la petición, guardarla en cola local, y vaciarse apenas vuelva el internet.

---

## ⚙️ Estructura del Proyecto

```
src/
├── components/          # Piezas modulares e interfaz gráfica
│   ├── forms/           # Formularios reutilizables (fugas, hidrantes, presión)
│   ├── maps/            # Componentes Leaflet (selectores, marcadores, polígonos)
│   ├── ui/              # Componentes atómicos (KpiCard, ChartWrapper, Modal)
│   └── layout/          # Navbar, Sidebar, Footer
├── composables/         # Lógica de negocio extraída
│   ├── useApi.ts        # Interceptores HTTP centralizados
│   ├── useOfflineSync.ts # Cola local + sincronización
│   ├── useGeolocation.ts # Wrapper de geolocalización con fallback
│   ├── useCuadrillaAssignment.ts # Algoritmo de asignación automática
│   └── useAuthGuard.ts  # Guardias de navegación por rol
├── views/               # Páginas principales del Router
│   ├── auth/
│   ├── indicadores/     # Dashboard, métricas, canales, escalas de riesgo
│   ├── mapa/            # Visualización de infraestructura
│   ├── reportes/        # Crear, listar, detalle de reportes
│   ├── operario/        # Panel de operario: evidencias
│   ├── supervisor/      # Panel de supervisor: verificación
│   └── admin/           # Gestión de usuarios, cuadrillas, configuración
├── stores/              # Lógica central de datos compartidos
│   ├── auth.ts          # Sesión, roles, permisos
│   ├── reportes.ts      # Estado global de reportes
│   ├── offlineQueue.ts  # Cola de sincronización offline
│   └── indicadores.ts   # Datos de dashboard y KPIs
├── types/               # Definiciones TypeScript
│   ├── reporte.ts
│   ├── cuadrilla.ts
│   ├── evidencia.ts
│   └── index.ts
├── router/              # Configuración de rutas con guards
├── supabase/            # Cliente y helpers
└── legacy/              # Versiones previas guardadas del prototipado

supabase/
├── migrations/          # Scripts SQL definitivos
│   ├── 001_schema_base.sql
│   ├── 002_funciones_asignacion.sql
│   ├── 003_politicas_rls.sql
│   └── 004_triggers_estado.sql
└── seed.sql             # Datos iniciales de prueba
```

---

## 🚀 Instalación y Puesta en Marcha

Para correr el proyecto asegúrate de tener una versión de Node (e.g., v18 o superior).

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar ambiente virtual local y colocar credenciales
cp .env.example .env
# Configurar en .env:
#   VITE_SUPABASE_URL=<tu-url>
#   VITE_SUPABASE_ANON_KEY=<tu-anon-key>
#   O bien:
#   VITE_API_URL=<url-fastapi>

# 3. Lanzar servidor de desarrollo en caliente
npm run dev

# 4. Empaquetar para Producción
npm run build
```

---

## 🔒 Control de Permisos y Modos

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| **Visitante** | `/login` únicamente | Redirigido sistemáticamente. Solo pantalla inicial o crear cuenta. |
| **Standard User** | `/fugas/nueva`, `/reportes/mis-reportes` | Reportar fugas en el panel. Nivel por defecto. |
| **Operario** | `/operario/evidencia`, `/operario/mis-tareas` | Subir evidencias (foto + formulario). **NO puede cambiar estado del reporte.** |
| **Supervisor** | `/supervisor/verificacion`, `/indicadores` | Verificar evidencias, aprobar/rechazar/reenviar. **Único con permiso para cambiar estado a `completado`.** |
| **Administrador (`admin`)** | Todo el sistema | Dashboard principal, listar cualquier registro, visualizar métricas, inventario, borrar elementos. El primer usuario en registrarse recibe `admin`. |

> **Nota para Desarrolladores:** Las llamadas se engloban dentro del helper de interfaz de `useApi()`. Las credenciales y llaves `.env` quedan fuera del control de este rastreador de versiones, pero pueden requerirse para los componentes de autenticación.

---

## 📊 Módulo de Indicadores (Dashboard)

El apartado de **Indicadores** centraliza toda la gestión operativa y las métricas del sistema, alojando además la Gestión de Operaciones.

### KPIs Principales (Actualizados 2026)
- **Tiempo Promedio de Atención:** Horas promedio desde el reporte hasta el cierre de la atención.
- **Cumplimiento de SLA:** Porcentaje de reportes resueltos dentro del tiempo objetivo (A tiempo vs Vencido).
- **Reportes por Zona:** Total de daños y cuellos de botella geográficos.
- **Tasa de Reincidencia:** Porcentaje de reportes catalogados como recurrentes.
- **Adopción Digital:** Porcentaje de reportes ingresados vía App Móvil y Web vs Canales Tradicionales (Teléfono, Presencial).

### Gráficas
| Gráfica | Descripción |
|---------|-------------|
| **Tendencia de Reportes (7 días)** | Gráfico de área (línea gruesa púrpura) que muestra el volumen de ingresos temporales. |
| **Cumplimiento SLA de Atención** | Gráfico de dona con paleta estándar de semáforo. |
| **Reportes por Nivel de Riesgo** | Gráfico de barras verticales clasificando activos. |
| **Canales de Reporte** | Distribución de reportes utilizando una paleta distintiva de azules para evitar confusiones de color. |
| **Gestión de Operaciones** *(pestaña integrada)* | Interfaz de asignación automática de cuadrillas y gestión rápida. |

### Filtros en Tiempo Real
El Dashboard soporta filtrado reactivo de tiempo ("Hoy", "Esta Semana", "Este Mes", "Todos"), el cual recalcula y re-renderiza todas las gráficas y KPIs instantáneamente usando la potencia de Pinia en Vue 3. Además, los gráficos analíticos tienen un diseño limpio, profesional y **libre de emojis** para mejorar la legibilidad.

### Canales de Reporte Completos
La gráfica de Canales de Reporte incluye todos los medios disponibles:
- 📱 **App Móvil**
- 💻 **Portal Web**
- 💬 **WhatsApp**
- 📞 **Línea Telefónica**
- 📧 **Correo Electrónico**
- 🏢 **Oficina Física**
- 🚨 **Botón de Emergencia**

### Escalas de Riesgo
Las escalas de respuesta se establecen según nivel de riesgo:

---

### 📝 Plan de Tareas: Clarificar y Rediseñar Gráficas del Dashboard
*(Agregado según solicitud del stakeholder)*

**Contexto:**
El usuario final (stakeholder) reportó que la gráfica **"Distribución de Prioridad"** no es comprensible sin explicación adicional. Además, la gráfica de **"Cumplimiento SLA"** carece de contexto sobre qué tipo de actividades se miden.

**Objetivo:**
Hacer que el dashboard "cuente una historia clara" sin necesidad de explicación verbal. Si una persona externa no entiende un indicador, el dashboard requiere replanteamiento.

**Acciones Requeridas:**
1. **Gráfica "Distribución de Prioridad" (Rediseñar o Eliminar):**
   - Definir claramente qué representa cada nivel de prioridad.
   - Agregar subtítulo explicativo visible en la UI (ej: "Reportes activos por nivel de riesgo").
   - Considerar cambiar el nombre a "Reportes por Nivel de Riesgo".
   - Incluir leyenda con descripción breve de cada categoría.
2. **Gráfica "Cumplimiento SLA" (Agregar Contexto):**
   - Agregar título completo: "Cumplimiento SLA de Atención de Reportes".
   - Incluir subtítulo: "Porcentaje de reportes resueltos dentro del tiempo objetivo según su nivel de riesgo".
   - Agregar tooltip o nota al pie que especifique: "SLA: Crítico <30min, Alto <2h, Medio <8h, Bajo <24h".
3. **Validación con Usuario Final:**
   - Presentar mockups o capturas de las gráficas rediseñadas al stakeholder antes de implementar.
   - Confirmar que la información es autoexplicativa.

**Criterio de Aceptación:**
- [x] Un usuario externo al proyecto puede interpretar correctamente ambas gráficas sin explicación adicional.
- [x] Los títulos, subtítulos y leyendas están implementados en el código del dashboard.
- [x] El feedback del stakeholder está documentado y aprobado.

> "Si una persona externa no entiende los indicadores, el dashboard requiere replanteamiento."

---

| Nivel | Color | Tiempo Máximo de Respuesta | Descripción |
|-------|-------|---------------------------|-------------|
| **Crítico** | 🔴 Rojo | < 30 minutos | Ruptura mayor, afectación masiva, riesgo sanitario |
| **Alto** | 🟠 Naranja | < 2 horas | Fuga significativa, afectación parcial |
| **Medio** | 🟡 Amarillo | < 8 horas | Fuga moderada, sin afectación inmediata |
| **Bajo** | 🟢 Verde | < 24 horas | Mantenimiento preventivo, ajustes menores |

> **Validación del Dashboard:** Se recomienda validar la legibilidad con terceros. Un dashboard debe "contar una historia clara". Si una persona externa no entiende los indicadores, el dashboard requiere replanteamiento.

---

## 🔧 Asignación Automática de Cuadrillas

El sistema implementa un algoritmo de asignación automática basado en múltiples factores ponderados:

### Factores de Ponderación
| Factor | Peso | Descripción |
|--------|------|-------------|
| **Proximidad Geográfica** | 35% | Distancia entre ubicación actual de la cuadrilla y el reporte |
| **Carga de Trabajo** | 25% | Cantidad de reportes activos asignados a la cuadrilla |
| **Nivel de Riesgo** | 40% | Prioridad según criticidad del incidente |

### Flujo de Asignación
1. El reporte ingresa con ubicación, zona y nivel de riesgo.
2. Se filtran cuadrillas disponibles en la misma zona.
3. Se calcula un **score** para cada cuadrilla candidata.
4. Se selecciona la cuadrilla con mayor score.
5. Se registra la asignación en la tabla `asignaciones` con `tipo_asignacion = 'automatica'`.
6. Se incrementa la `carga_trabajo` de la cuadrilla asignada.

### Composable: `useCuadrillaAssignment.ts`
```typescript
import { ref } from 'vue'
import { useSupabaseClient } from '@supabase/supabase-js'

interface Cuadrilla {
  id: string
  nombre: string
  zona: string
  especialidad: string[]
  disponibilidad: boolean
  carga_trabajo: number
  ubicacion_actual: [number, number]
}

interface Reporte {
  id: string
  tipo: 'fuga' | 'presion' | 'hidrante'
  ubicacion: [number, number]
  zona: string
  riesgo: 'bajo' | 'medio' | 'alto' | 'critico'
}

export function useCuadrillaAssignment() {
  const supabase = useSupabaseClient()
  const asignando = ref(false)

  async function asignarCuadrillaAutomatica(reporte: Reporte): Promise<string | null> {
    asignando.value = true
    try {
      const { data: cuadrillas } = await supabase
        .from('cuadrillas')
        .select('*')
        .eq('disponibilidad', true)
        .eq('zona', reporte.zona)

      if (!cuadrillas || cuadrillas.length === 0) return null

      const scored = cuadrillas.map((c: Cuadrilla) => ({
        ...c,
        score: calcularScore(c, reporte)
      }))

      const mejorCuadrilla = scored.sort((a, b) => b.score - a.score)[0]

      await supabase.from('asignaciones').insert({
        reporte_id: reporte.id,
        cuadrilla_id: mejorCuadrilla.id,
        asignado_en: new Date().toISOString(),
        tipo_asignacion: 'automatica'
      })

      return mejorCuadrilla.id
    } finally {
      asignando.value = false
    }
  }

  function calcularScore(cuadrilla: Cuadrilla, reporte: Reporte): number {
    const distancia = calcularDistancia(cuadrilla.ubicacion_actual, reporte.ubicacion)
    const scoreDistancia = 1 / (1 + distancia / 1000)
    const scoreCarga = 1 / (1 + cuadrilla.carga_trabajo)
    const scoreRiesgo = reporte.riesgo === 'critico' ? 1 :
                        reporte.riesgo === 'alto' ? 0.7 :
                        reporte.riesgo === 'medio' ? 0.4 : 0.1

    return (scoreDistancia * 0.35) + (scoreCarga * 0.25) + (scoreRiesgo * 0.40)
  }

  function calcularDistancia(p1: [number, number], p2: [number, number]): number {
    const R = 6371
    const dLat = (p2[0] - p1[0]) * Math.PI / 180
    const dLon = (p2[1] - p1[1]) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 +
              Math.cos(p1[0] * Math.PI/180) * Math.cos(p2[0] * Math.PI/180) * Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  return { asignarCuadrillaAutomatica, asignando }
}
```

---

## 📸 Sistema de Evidencias y Verificación

### Flujo de Estados del Reporte
```
reportado → asignado → en_progreso (Llegada) → resuelto (Fin trabajo) → cerrado (Verificado)
                                                 ↘ reenviar (regresa a en_progreso)
                                                 ↘ rechazado
```

### Automatización de Carga de Cuadrillas
El workload de las cuadrillas se gestiona por completo mediante un Trigger en PostgreSQL (`trg_update_crew_workload`). Cuando un reporte alcanza el estado `resuelto`, la base de datos detecta que la cuadrilla ha terminado y descuenta automáticamente `-1` a su carga de trabajo. Esto libera a los operarios para recibir nuevas asignaciones inmediatas.

### Operario: Subida de Evidencias
El operario debe subir evidencia del trabajo realizado antes de que el reporte pueda avanzar:

- **Fotografía doble obligatoria**: Foto de "Llegada al sitio" para iniciar (`en_progreso`), y foto de "Finalización" para culminar (`resuelto`).
- **Validaciones estrictas**: El formulario valida campos de contacto usando HTML5 (patrones para texto y tipo "tel" en teléfonos) y el modo oscuro maneja paletas contrastantes en todos los componentes.
- **Geolocalización automática** al momento de la captura.

> **Restricción:** El operario mueve el estado a `resuelto` para indicar que terminó en calle, pero el caso no se cierra oficialmente. Su acción genera la evidencia y lanza el reporte a la cola del supervisor.

### Supervisor: Verificación de Evidencias
El supervisor es el **único rol con permiso para cambiar el estado final** del reporte:

| Acción | Estado Resultante | Descripción |
|--------|-------------------|-------------|
| ✅ **Aprobar y Completar** | `cerrado` | La evidencia fotográfica (Llegada y Finalización) es válida, se cierra el ciclo. |
| 🔄 **Solicitar Reenvío** | `en_progreso` | La evidencia es insuficiente, se devuelve el estado a la cuadrilla. |
| ❌ **Rechazar** | `rechazado` | El trabajo no se realizó o la evidencia es inválida. |

> **Obligatorio:** El supervisor debe dejar un **comentario de verificación** en cada acción.

### Tipos TypeScript
```typescript
export type EstadoReporte =
  | 'reportado'
  | 'asignado'
  | 'en_progreso'
  | 'evidencia_pendiente'
  | 'verificacion_supervisor'
  | 'completado'
  | 'rechazado'

export interface Evidencia {
  id: string
  reporte_id: string
  tipo: 'foto' | 'video' | 'documento'
  url: string
  descripcion: string
  materiales: string
  tiempo_dedicado: number
  coordenadas?: [number, number]
  subido_por: string // operario_id
  subido_en: string
}

export interface VerificacionSupervisor {
  id: string
  reporte_id: string
  supervisor_id: string
  estado_final: 'completado' | 'rechazado' | 'reenviar'
  comentario: string
  verificado_en: string
}
```

---

## 🗄️ Esquema SQL para Supabase (PostgreSQL)

### Tablas Principales

```sql
-- ============================================================
-- 1. PERFILES DE USUARIO (extensión de auth.users)
-- ============================================================
CREATE TABLE perfiles_usuario (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(150),
  telefono VARCHAR(20),
  rol VARCHAR(20) NOT NULL DEFAULT 'standard'
    CHECK (rol IN ('standard', 'operario', 'supervisor', 'admin')),
  zona_asignada VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: primer usuario registrado recibe rol 'admin'
CREATE OR REPLACE FUNCTION asignar_primer_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM perfiles_usuario WHERE rol = 'admin') THEN
    UPDATE perfiles_usuario SET rol = 'admin' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_primer_admin
AFTER INSERT ON perfiles_usuario
FOR EACH ROW
EXECUTE FUNCTION asignar_primer_admin();

-- ============================================================
-- 2. CUADRILLAS
-- ============================================================
CREATE TABLE cuadrillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  zona VARCHAR(50) NOT NULL,
  especialidad TEXT[] DEFAULT '{}',
  disponibilidad BOOLEAN DEFAULT true,
  carga_trabajo INTEGER DEFAULT 0,
  ubicacion_actual GEOGRAPHY(POINT),
  lider_id UUID REFERENCES perfiles_usuario(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. REPORTES / INCIDENCIAS
-- ============================================================
CREATE TABLE reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(30) NOT NULL
    CHECK (tipo IN ('fuga', 'presion', 'hidrante', 'infraestructura')),
  estado VARCHAR(30) NOT NULL DEFAULT 'reportado'
    CHECK (estado IN (
      'reportado', 'asignado', 'en_progreso', 'evidencia_pendiente',
      'verificacion_supervisor', 'completado', 'rechazado'
    )),
  riesgo VARCHAR(20) NOT NULL DEFAULT 'medio'
    CHECK (riesgo IN ('bajo', 'medio', 'alto', 'critico')),
  zona VARCHAR(50) NOT NULL,
  coordenadas GEOGRAPHY(POINT) NOT NULL,
  direccion TEXT,
  descripcion TEXT,
  reportado_por UUID REFERENCES perfiles_usuario(id),
  canal_reporte VARCHAR(30) NOT NULL DEFAULT 'app_movil'
    CHECK (canal_reporte IN (
      'app_movil', 'web', 'whatsapp', 'telefono',
      'correo', 'presencial', 'boton_emergencia'
    )),
  asignado_a UUID REFERENCES cuadrillas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completado_en TIMESTAMPTZ
);

-- ============================================================
-- 4. ASIGNACIONES
-- ============================================================
CREATE TABLE asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id UUID REFERENCES reportes(id) ON DELETE CASCADE,
  cuadrilla_id UUID REFERENCES cuadrillas(id) ON DELETE SET NULL,
  asignado_en TIMESTAMPTZ DEFAULT NOW(),
  tipo_asignacion VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (tipo_asignacion IN ('manual', 'automatica')),
  asignado_por UUID REFERENCES perfiles_usuario(id)
);

-- ============================================================
-- 5. EVIDENCIAS
-- ============================================================
CREATE TABLE evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id UUID REFERENCES reportes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('foto', 'video', 'documento')),
  url TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  materiales TEXT,
  tiempo_dedicado DECIMAL(4,2),
  coordenadas GEOGRAPHY(POINT),
  subido_por UUID REFERENCES perfiles_usuario(id),
  subido_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. VERIFICACIONES (solo supervisores)
-- ============================================================
CREATE TABLE verificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id UUID REFERENCES reportes(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES perfiles_usuario(id),
  estado_final VARCHAR(20) NOT NULL
    CHECK (estado_final IN ('completado', 'rechazado', 'reenviar')),
  comentario TEXT NOT NULL,
  verificado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. VISTAS ANALÍTICAS (Métricas de Dashboard)
-- ============================================================
-- Nota: Las vistas están definidas en la migración `20260521000000_kpi_views.sql`
-- Incluyen:
-- * vw_kpi_avg_resolution_time
-- * vw_kpi_sla_compliance
-- * vw_kpi_digital_adoption
-- * vw_kpi_recurrence_rate

-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

-- Función: Asignación automática de cuadrilla
CREATE OR REPLACE FUNCTION asignar_cuadrilla_automatica(p_reporte_id UUID)
RETURNS UUID AS $$
DECLARE
  v_reporte RECORD;
  v_cuadrilla_id UUID;
BEGIN
  SELECT * INTO v_reporte FROM reportes WHERE id = p_reporte_id;

  SELECT c.id INTO v_cuadrilla_id
  FROM cuadrillas c
  WHERE c.disponibilidad = true
    AND c.zona = v_reporte.zona
  ORDER BY
    ST_Distance(c.ubicacion_actual, v_reporte.coordenadas),
    c.carga_trabajo ASC
  LIMIT 1;

  IF v_cuadrilla_id IS NOT NULL THEN
    INSERT INTO asignaciones (reporte_id, cuadrilla_id, tipo_asignacion)
    VALUES (p_reporte_id, v_cuadrilla_id, 'automatica');

    UPDATE cuadrillas SET carga_trabajo = carga_trabajo + 1 WHERE id = v_cuadrilla_id;
    UPDATE reportes SET estado = 'asignado', asignado_a = v_cuadrilla_id WHERE id = p_reporte_id;
  END IF;

  RETURN v_cuadrilla_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar métricas diarias
CREATE OR REPLACE FUNCTION actualizar_metricas_diarias()
RETURNS VOID AS $$
BEGIN
  INSERT INTO metricas_diarias (
    fecha, reportes_activos, reportes_en_progreso, reportes_resueltos
  )
  SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE estado = 'reportado'),
    COUNT(*) FILTER (WHERE estado IN ('asignado', 'en_progreso', 'evidencia_pendiente', 'verificacion_supervisor')),
    COUNT(*) FILTER (WHERE estado = 'completado' AND DATE(completado_en) = CURRENT_DATE)
  FROM reportes
  ON CONFLICT (fecha) DO UPDATE SET
    reportes_activos = EXCLUDED.reportes_activos,
    reportes_en_progreso = EXCLUDED.reportes_en_progreso,
    reportes_resueltos = EXCLUDED.reportes_resueltos;
END;
$$ LANGUAGE plpgsql;

-- Trigger: actualizar métricas al cambiar estado
CREATE OR REPLACE FUNCTION trigger_actualizar_metricas()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM actualizar_metricas_diarias();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_metricas_estado
AFTER UPDATE OF estado ON reportes
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_metricas();

-- ============================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================

ALTER TABLE perfiles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE verificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrillas ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios ven su propio perfil
CREATE POLICY "Ver perfil propio" ON perfiles_usuario
  FOR SELECT TO authenticated USING (id = auth.uid());

-- Política: Admins ven todos los perfiles
CREATE POLICY "Admin ve todos los perfiles" ON perfiles_usuario
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol = 'admin'));

-- Política: Reportes - usuarios ven los suyos, operarios/supervisores/admins ven todos
CREATE POLICY "Reportes acceso por rol" ON reportes
  FOR SELECT TO authenticated
  USING (
    reportado_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol IN ('operario', 'supervisor', 'admin')
    )
  );

-- Política: Solo supervisores y admins pueden crear verificaciones
CREATE POLICY "Solo supervisores verifican" ON verificaciones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol IN ('supervisor', 'admin')
    )
  );

-- Política: Evidencias - operarios suben, todos ven
CREATE POLICY "Evidencias acceso" ON evidencias
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    subido_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol IN ('supervisor', 'admin')
    )
  );
```

---

## 🗺️ Configuración de Rutas (Vue Router)

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    redirect: '/indicadores'
  },
  {
    path: '/indicadores',
    name: 'Indicadores',
    component: () => import('@/views/indicadores/DashboardView.vue'),
    meta: { requiresAuth: true, roles: ['standard', 'operario', 'supervisor', 'admin'] }
  },
  {
    path: '/mapa',
    name: 'Mapa',
    component: () => import('@/views/mapa/MapaView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reportes/nuevo',
    name: 'NuevoReporte',
    component: () => import('@/views/reportes/NuevoReporteView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reportes/mis-reportes',
    name: 'MisReportes',
    component: () => import('@/views/reportes/MisReportesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/operario/evidencia/:reporteId',
    name: 'EvidenciaOperario',
    component: () => import('@/views/operario/EvidenciaFormView.vue'),
    meta: { requiresAuth: true, roles: ['operario', 'admin'] }
  },
  {
    path: '/supervisor/verificacion',
    name: 'VerificacionSupervisor',
    component: () => import('@/views/supervisor/VerificacionPanelView.vue'),
    meta: { requiresAuth: true, roles: ['supervisor', 'admin'] }
  },
  {
    path: '/admin/usuarios',
    name: 'AdminUsuarios',
    component: () => import('@/views/admin/UsuariosView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/admin/cuadrillas',
    name: 'AdminCuadrillas',
    component: () => import('@/views/admin/CuadrillasView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.isAuthenticated) {
    return next('/login')
  }

  if (to.meta.roles && !to.meta.roles.includes(auth.userRole)) {
    return next('/unauthorized')
  }

  next()
})

export default router
```

---

## 🔄 Modo Offline (`useOfflineSync`)

```typescript
// src/composables/useOfflineSync.ts
import { ref, watch } from 'vue'

interface QueuedRequest {
  id: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  url: string
  payload?: any
  timestamp: number
  retries: number
}

const QUEUE_KEY = 'sigvi_offline_queue'
const MAX_RETRIES = 3

export function useOfflineSync() {
  const isOnline = ref(navigator.onLine)
  const syncing = ref(false)
  const queue = ref<QueuedRequest[]>([])

  // Cargar cola desde localStorage
  const loadQueue = () => {
    const stored = localStorage.getItem(QUEUE_KEY)
    queue.value = stored ? JSON.parse(stored) : []
  }

  const saveQueue = () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.value))
  }

  const addToQueue = (request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>) => {
    const item: QueuedRequest = {
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0
    }
    queue.value.push(item)
    saveQueue()
  }

  const processQueue = async () => {
    if (!isOnline.value || queue.value.length === 0) return
    syncing.value = true

    const failed: QueuedRequest[] = []

    for (const item of queue.value) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: item.payload ? JSON.stringify(item.payload) : undefined
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
      } catch (error) {
        item.retries++
        if (item.retries < MAX_RETRIES) {
          failed.push(item)
        }
      }
    }

    queue.value = failed
    saveQueue()
    syncing.value = false
  }

  // Watchers
  window.addEventListener('online', () => {
    isOnline.value = true
    processQueue()
  })
  window.addEventListener('offline', () => { isOnline.value = false })

  loadQueue()

  return { isOnline, syncing, queue, addToQueue, processQueue }
}
```

---

## 📋 Checklist de Implementación

### Fase 1: Base de Datos
- [ ] Ejecutar script SQL en Supabase
- [ ] Configurar políticas RLS
- [ ] Crear bucket de Storage para evidencias (`evidencias`)
- [ ] Configurar triggers de métricas

### Fase 2: Frontend - Estructura
- [ ] Reorganizar router: eliminar `/gestion`, mover a `/indicadores`
- [ ] Crear vistas: `DashboardView`, `EvidenciaFormView`, `VerificacionPanelView`
- [ ] Implementar `useCuadrillaAssignment`
- [ ] Actualizar `useOfflineSync` con cola persistente

### Fase 3: Funcionalidades
- [ ] Formulario de evidencia con captura de foto + geolocalización
- [ ] Panel de verificación con acciones de supervisor
- [ ] Dashboard con KPIs, gráfica de canales completos, escalas de riesgo
- [ ] Asignación automática al crear reporte
- [ ] Validación de roles en router guards

### Fase 4: Validación
- [ ] Probar flujo completo: reporte → asignación → evidencia → verificación
- [ ] Validar dashboard con usuarios externos (comprensibilidad)
- [ ] Pruebas offline: crear reporte sin conexión, sincronizar al reconectar
- [ ] Verificar que operario no puede completar reporte
- [ ] Verificar que solo supervisor puede aprobar/rechazar

---

## 📝 Notas para Desarrolladores

1. **Variables de entorno:** Nunca commitear `.env`. Usar `.env.example` como plantilla.
2. **Storage de evidencias:** Configurar políticas de acceso en Supabase Storage para que operarios puedan subir y supervisores puedan leer.
3. **Geolocalización:** Solicitar permisos al usuario en el momento de la captura de evidencia. Fallback a coordenadas del reporte si el GPS falla.
4. **Escalabilidad:** La función `actualizar_metricas_diarias` puede optimizarse con un job programado (pg_cron) en lugar de trigger por cada cambio de estado.
5. **Conflictos de asignación:** Si dos reportes entran simultáneamente, la transacción de PostgreSQL garantiza atomicidad en la asignación.

---

*ESSMAR SIGVI - Sistema de Atención de Incidentes*
*Última actualización: Mayo 2026*