# Patrones de Layout de Dashboard

## Tabla de Contenidos
1. [Analitico/BI](#layout-analiticobi)
2. [Operativo/Monitor](#layout-operativomonitor)
3. [Ejecutivo/Resumen](#layout-ejecutivoresumen)
4. [Analitico con Sidebar](#layout-analitico-con-sidebar)
5. [Plantilla Vue Completa](#plantilla-vue-completa)

---

## Layout Analitico/BI

Para usuarios que analizan datos, exploran y comparan. Requiere densidad controlada y multiples vistas.

```
+--------------------------------------------------+
| [Logo]  Dashboard Ventas      [Filtros: Fecha v]  |
+--------------------------------------------------+
| [KPI: $125K] [KPI: 1,240] [KPI: 3.2%] [KPI: 98%] |
+--------------------------------------------------+
| [Grafica principal: Ventas x Tiempo - 2/3 ancho]  |
|                                                    |
|                                    [Top Productos] |
|                                                    | [Prod A: $45K] |
+                                    [Prod B: $32K]  |
|                                                    | [Prod C: $28K] |
+--------------------------------------------------+
| [Tabla detalle con paginacion y ordenamiento]     |
| [Producto] [Ventas] [Unidades] [Conversion] [Acc]  |
+--------------------------------------------------+
```

### Caracteristicas
- 4 KPIs en fila superior
- Grafica principal ocupa 2/3 del ancho
- Panel lateral con top-N ranking
- Tabla completa con filtros y ordenamiento
- Ideal para: analistas de negocio, gerentes de producto

---

## Layout Operativo/Monitor

Para operaciones en tiempo real. Enfasis en alertas y estado actual.

```
+--------------------------------------------------+
| [Alertas activas: 3]        [Ultimo refresh: 14:02]|
+--------------------------------------------------+
| [KPI grande: 98.2% Uptime] [KPI: 142ms Latencia]  |
+--------------------------------------------------+
| [Grafica en tiempo real: Requests/seg]            |
|                                                    |
|  ^~~~~~pico a las 13:45                            |
|                                                    |
+--------------------------------------------------+
| [Tabla: Alertas recientes]  | [Tabla: Top Errors] |
| [CRIT] DB Timeout  13:45    | [404]  234          |
| [WARN] High CPU    13:38    | [500]  89           |
+--------------------------------------------------+
```

### Caracteristicas
- KPIs grandes con auto-refresh
- Grafica de linea en tiempo real (WebSocket)
- Tablas de incidentes/errors recientes
- Color semantico predominante (rojo/verde/amarillo)
- Ideal para: SRE, NOC, DevOps

---

## Layout Ejecutivo/Resumen

Para C-level y directores. Resumen de alto nivel, sin interaccion compleja.

```
+--------------------------------------------------+
| Resumen Ejecutivo - Mayo 2026        [Exportar PDF]|
+--------------------------------------------------+
|  +--------+  +--------+  +--------+  +--------+   |
|  |Ventas  |  |Clientes|  | Margen |  | NPS    |   |
  | $1.2M  |  |  +234  |  |  42%   |  |  72    |   |
  | +12%   |  |  +5%   |  |  +2pp  |  |  +4    |   |
  +--------+  +--------+  +--------+  +--------+   |
+--------------------------------------------------+
| [Grafica: Comparativa YTD vs Ano Anterior]        |
|                                                    |
|  Barras agrupadas mensuales                        |
|                                                    |
+--------------------------------------------------+
| [Grafica: Mix de Ventas por Region]               |
| [Horizontal stacked bars: Norte, Sur, Este, Oeste]|
+--------------------------------------------------+
```

### Caracteristicas
- Maximo 4 KPIs
- Maximo 2 graficas, comparativas claras
- Sin tablas detalle (drill-down a otro dashboard si es necesario)
- Boton de exportar prominente
- Ideal para: C-suite, board meetings

---

## Layout Analitico con Sidebar

Para dashboards con muchas dimensiones de filtrado y navegacion.

```
+------------+---------------------------------------+
| NAVEGACION |  [KPI] [KPI] [KPI] [KPI]              |
|            +---------------------------------------+
| Dashboard  |  [Grafica principal]                  |
| Ventas     |                                       |
| Clientes > |                                       |
| Productos >|  [Tabla detallada]                    |
| Regiones > +---------------------------------------+
|            |  [Footer: Ayuda | Feedback]            |
+------------+---------------------------------------+
```

### Caracteristicas
- Sidebar colapsable (persiste estado en localStorage)
- Filtros globales en top bar
- Navegacion entre vistas relacionadas
- Ideal para: plataformas analiticas completas, multi-vista

---

## Plantilla Vue Completa

### App.vue - Entry Point

```vue
<template>
  <div class="dashboard-app">
    <FilterBar
      v-model:date-range="dateRange"
      v-model:region="selectedRegion"
      :regions="availableRegions"
    />

    <div class="dashboard-grid">
      <!-- KPI Row -->
      <div class="kpi-section">
        <KpiCard
          v-for="kpi in dashboardKpis"
          :key="kpi.id"
          v-bind="kpi"
        />
      </div>

      <!-- Charts Row -->
      <div class="charts-section">
        <DashboardPanel title="Tendencia de Ventas" class="chart-trend">
          <LineChart :data="salesTrend" :loading="trendLoading" />
        </DashboardPanel>

        <DashboardPanel title="Por Canal" class="chart-channel">
          <DonutChart :data="channelBreakdown" :loading="channelLoading" />
        </DashboardPanel>
      </div>

      <!-- Bottom Section -->
      <div class="bottom-section">
        <DashboardPanel title="Top 10 Productos" class="top-products">
          <ProductTable :data="topProducts" :loading="productsLoading" />
        </DashboardPanel>

        <DashboardPanel title="Mapa de Calor Regional" class="heatmap">
          <RegionalHeatmap :data="regionalData" :loading="regionalLoading" />
        </DashboardPanel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDateRange } from './composables/useDateRange'
import { useDashboardData } from './composables/useDashboardData'
import FilterBar from './components/dashboard/FilterBar.vue'
import KpiCard from './components/dashboard/KpiCard.vue'
import DashboardPanel from './components/dashboard/DashboardPanel.vue'
import LineChart from './components/charts/LineChart.vue'
import DonutChart from './components/charts/DonutChart.vue'
import ProductTable from './components/dashboard/ProductTable.vue'
import RegionalHeatmap from './components/dashboard/RegionalHeatmap.vue'

const { range: dateRange, startDate, endDate } = useDateRange()
const selectedRegion = ref('all')
const availableRegions = ref(['all', 'norte', 'sur', 'este', 'oeste'])

// Cada KPI es independiente para carga progresiva
const { data: dashboardKpis, loading: kpisLoading } = useDashboardData(
  () => fetchKpis({ start: startDate.value, end: endDate.value, region: selectedRegion.value }),
  [dateRange, selectedRegion]
)

const { data: salesTrend, loading: trendLoading } = useDashboardData(
  () => fetchSalesTrend({ start: startDate.value, end: endDate.value, region: selectedRegion.value }),
  [dateRange, selectedRegion]
)

const { data: channelBreakdown, loading: channelLoading } = useDashboardData(
  () => fetchChannelBreakdown({ start: startDate.value, end: endDate.value }),
  [dateRange]
)

const { data: topProducts, loading: productsLoading } = useDashboardData(
  () => fetchTopProducts({ start: startDate.value, end: endDate.value, region: selectedRegion.value }),
  [dateRange, selectedRegion]
)

const { data: regionalData, loading: regionalLoading } = useDashboardData(
  () => fetchRegionalData({ start: startDate.value, end: endDate.value }),
  [dateRange]
)
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f1f5f9;
  color: #334155;
}

.dashboard-app {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.kpi-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.bottom-section {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 16px;
}

/* Responsive */
@media (max-width: 1200px) {
  .charts-section { grid-template-columns: 1fr; }
  .bottom-section { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .kpi-section { grid-template-columns: repeat(2, 1fr); }
  .dashboard-app { padding: 16px; gap: 16px; }
}
@media (max-width: 480px) {
  .kpi-section { grid-template-columns: 1fr; }
}
</style>
```

### DashboardPanel.vue (Wrapper de Seccion)

```vue
<template>
  <div class="panel">
    <div class="panel-header">
      <h3 class="panel-title">{{ title }}</h3>
      <slot name="actions" />
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped>
.panel {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.panel-body {
  padding: 20px;
}
</style>
```

---

## Checklist de Layout Final

Antes de entregar un dashboard, verificar:

- [ ] La jerarquia visual sigue el patron F/Z
- [ ] Los KPIs estan en la primera fila, visibles sin scroll
- [ ] No hay mas de 7 elementos visuales en la primera pantalla
- [ ] Las graficas tienen titulo descriptivo
- [ ] Los filtros globales son obvios y accessibles
- [ ] El layout es responsive (testear en 1024px y 375px)
- [ ] Los estados de loading tienen skeleton placeholders
- [ ] Los estados vacios tienen mensaje y accion sugerida
- [ ] La accion principal esta en maximo 2 clicks de distancia
