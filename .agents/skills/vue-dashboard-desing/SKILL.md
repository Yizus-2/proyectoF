---
name: vue-dashboard-design
description: >
  Diseno e implementacion de dashboards en Vue.js con enfoque en claridad, concision y comunicacion
  efectiva de datos. NO es solo colocar graficas: se prioriza la jerarquia visual, seleccion correcta
  de visualizaciones, KPI cards efectivas, y densidad de informacion controlada. Usar cuando el
  usuario solicite crear un dashboard, panel de control, o visualizacion de datos en Vue. Tambien
  aplica cuando se pida mejorar un dashboard existente, agregar metricas/ KPIs, o construir
  interfaces analiticas. Incluye patrones para layouts responsive, componentes reutilizables,
  composables para datos, integracion con librerias de charts, y principios de diseño de
  informacion aplicados a Vue.
---

# Vue Dashboard Design

Disenar dashboards efectivos en Vue que comunican informacion critica de forma clara y concisa.

## Filosofia Core

Un dashboard es una herramienta de toma de decisiones, no una galeria de graficas.

**Regla de los 5 segundos**: El usuario debe entender el estado actual en 5 segundos.

**Principios no negociables**:
- Claridad sobre belleza visual
- Cada elemento justifica su espacio
- Resumen primero, detalle bajo demanda
- Un numero sin contexto (tendencia, meta, periodo anterior) es solo un numero

Para profundizar en principios de diseno: ver [references/design-principles.md](references/design-principles.md)

## Workflow de Creacion

### Paso 1: Definir el proposito

Responder estas preguntas antes de escribir codigo:

1. **Audiencia**: Analista tecnico, gerente de negocio, o ejecutivo C-level?
2. **Decisiones**: Que decisiones tomara el usuario con este dashboard?
3. **Frecuencia**: Lo consulta cada hora, dia, semana o mes?
4. **Accion**: El dashboard conduce a una accion concreta o solo informa?

### Paso 2: Seleccionar el layout base

| Audiencia | Layout | Densidad | Interactividad |
|-----------|--------|----------|----------------|
| Ejecutivo | Resumen amplio, 2-3 secciones | Baja | Baja (exportar) |
| Gerente/Analista | KPI + graficas + tabla | Media | Media (filtros, drill-down) |
| Operaciones | Monitor en tiempo real | Alta (alertas) | Alta (acciones rapidas) |

Para patrones de layout detallados: ver [references/layout-patterns.md](references/layout-patterns.md)

### Paso 3: Estructurar la jerarquia visual

```
Fila 1 (alto valor):  KPI Cards con sparklines
Fila 2 (alto valor):  Grafica principal de tendencia
Fila 3 (medio valor): Graficas de desglose secundarias
Fila 4 (detalle):     Tabla con datos o mapa/drill-down
```

### Paso 4: Implementar en Vue

Estructura de componentes recomendada:

```
components/dashboard/
  KpiCard.vue          → Metrica con valor, delta, sparkline
  DashboardPanel.vue   → Wrapper de seccion (titulo + slot)
  FilterBar.vue        → Filtros globales (fecha, region, etc.)
  SectionTitle.vue     → Titulo de seccion estilizado
  DataTable.vue        → Tabla con loading, empty, ordenamiento
components/charts/
  LineChart.vue        → Tendencias temporales
  BarChart.vue         → Comparaciones categoricas
  DonutChart.vue       → Proporciones (max 5 categorias)
  ChartSkeleton.vue    → Estado de carga
composables/
  useDateRange.ts      → Rango de fechas con presets
  useDashboardData.ts  → Fetch con loading/error/refresh
  useChartTheme.ts     → Colores y tipografia consistentes
```

Para implementacion detallada de componentes y composables: ver [references/vue-patterns.md](references/vue-patterns.md)

## Guia de Seleccion de Visualizaciones

| Objetivo | Visualizacion | Evitar |
|----------|--------------|--------|
| Tendencia temporal | Linea, Area | Torta, Barras |
| Comparacion categ. | Barras (V/H) | Linea |
| Proporcion (<=5) | Donut | Torta 3D |
| Proporcion (>5) | Tabla con barras de progreso | Torta |
| Distribucion | Histograma | Barras simples |
| Correlacion | Scatter plot | Dos graficas separadas |
| Geografico | Mapa coropletico | Tabla de ciudades |

**Reglas de oro**:
- Maximo 3-4 tipos de grafica por dashboard
- Las tortas son la ultima opcion; las barras horizontales son casi siempre mejores
- Las graficas 3D distorsionan; nunca usar en dashboards serios
- El color significa algo; no es decorativo

## KPI Card Efectiva

Cada KPI card debe comunicar en 1 segundo:

```
+----------------------------+
| TASA DE CONVERSION         |  ← Titulo: claro, accionable
| 3.2%            ↑ 12%      |  ← Valor grande + delta con color
| vs. mes anterior           |  ← Contexto explicito
| ~~~/\/\/\/~~               |  ← Sparkline sin ejes
+----------------------------+
```

El valor principal usa `font-variant-numeric: tabular-nums`. La variacion siempre incluye direccion (flecha) y referencia temporal.

## Sistema Visual Base

```css
/* Tokens de color */
--bg-page: #f1f5f9;
--bg-card: #ffffff;
--border-card: #e2e8f0;
--text-primary: #0f172a;
--text-secondary: #64748b;
--text-tertiary: #94a3b8;
--accent-primary: #3b82f6;
--accent-positive: #059669;
--accent-negative: #dc2626;
--accent-warning: #d97706;

/* Tokens de tipografia */
--font-kpi: 32px/700;       /* Valor principal */
--font-title: 14px/600;     /* Titulo de seccion */
--font-label: 12px/500;     /* Label de KPI, uppercase tracking */
--font-body: 13px/400;      /* Tablas y cuerpo */
--font-caption: 11px/400;   /* Contexto, notas */

/* Layout */
--radius-card: 12px;
--gap-section: 20px;
--padding-card: 20px;
--max-width: 1440px;
```

## Anti-Patrones Comunes (Evitar)

1. **Dashboard sin jerarquia**: Todo del mismo tamano y color
2. **Sobrecarga de tortas**: Mas de 3 segmentos en pie chart
3. **Graficas sin titulo descriptivo**: Titulo generico como "Grafica 1"
4. **KPI sin contexto**: "$50K" sin saber si es bueno o malo
5. **Filtros ocultos**: El usuario no sabe que filtros estan activos
6. **Loading generico**: Spinner en lugar de skeleton que imite la estructura
7. **Doble eje Y**: Distorsiona la comparacion; preferir paneles separados
8. **Tablas con 20 columnas**: Nadie puede procesarlas; priorizar las 5-7 clave
9. **Colores aleatorios**: Cada grafica con paleta diferente
10. **Scroll horizontal**: Nunca en un dashboard bien disenado

## Checklist de Entrega

- [ ] KPIs visibles sin scroll, con contexto completo
- [ ] Maximo 7 elementos visuales en primera pantalla
- [ ] Responsive: funciona en 1024px (tablet) y 375px (mobile)
- [ ] Estados de loading con skeleton placeholders
- [ ] Estados vacios con mensaje explicativo y accion sugerida
- [ ] Estados de error con mensaje claro y boton de reintentar
- [ ] Contraste de texto pasa WCAG AA (4.5:1)
- [ ] Filtros activos visibles sin abrir dropdowns
- [ ] Graficas no dependen solo de color (iconos + color)
- [ ] Numeros tabulares alineados en tablas y KPIs
