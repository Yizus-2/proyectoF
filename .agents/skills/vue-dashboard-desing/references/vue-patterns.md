# Patrones de Implementacion en Vue

## Tabla de Contenidos
1. [Estructura de Proyecto](#estructura-de-proyecto)
2. [Componentes Base](#componentes-base)
3. [Composables](#composables)
4. [Layouts Comunes](#layouts-comunes)
5. [Integracion con Librerias de Charts](#integracion-con-librerias-de-charts)
6. [Reutilizacion y Props](#reutilizacion-y-props)
7. [Performance](#performance)
8. [Ejemplo Completo](#ejemplo-completo)

---

## Estructura de Proyecto

```
src/
├── components/
│   ├── dashboard/
│   │   ├── KpiCard.vue
│   │   ├── TrendChart.vue
│   │   ├── DataTable.vue
│   │   ├── FilterBar.vue
│   │   └── SectionTitle.vue
│   ├── charts/
│   │   ├── LineChart.vue
│   │   ├── BarChart.vue
│   │   ├── DonutChart.vue
│   │   └── ChartSkeleton.vue
│   └── ui/
│       ├── StatDelta.vue
│       ├── MiniSparkline.vue
│       └── EmptyState.vue
├── composables/
│   ├── useDashboardData.ts
│   ├── useDateRange.ts
│   └── useChartTheme.ts
├── types/
│   └── dashboard.ts
└── utils/
    ├── formatters.ts
    └── chartConfig.ts
```

---

## Componentes Base

### KpiCard.vue (Patron Principal)

```vue
<template>
  <div class="kpi-card">
    <span class="kpi-label">{{ label }}</span>
    <div class="kpi-value-row">
      <span class="kpi-value">{{ formattedValue }}</span>
      <StatDelta :value="delta" :format="deltaFormat" />
    </div>
    <span class="kpi-context">{{ context }}</span>
    <MiniSparkline v-if="sparklineData" :data="sparklineData" :trend="delta >= 0" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatDelta from './StatDelta.vue'
import MiniSparkline from './MiniSparkline.vue'

interface Props {
  label: string
  value: number
  delta: number
  format?: 'currency' | 'percentage' | 'number' | 'compact'
  deltaFormat?: 'percentage' | 'absolute'
  context?: string
  sparklineData?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  format: 'number',
  deltaFormat: 'percentage',
  context: 'vs. periodo anterior'
})

const formattedValue = computed(() => {
  const f = props.format
  const v = props.value
  if (f === 'currency') return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(v)
  if (f === 'percentage') return `${v.toFixed(1)}%`
  if (f === 'compact') return new Intl.NumberFormat('es', { notation: 'compact' }).format(v)
  return new Intl.NumberFormat('es').format(v)
})
</script>

<style scoped>
.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kpi-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}
.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.kpi-value {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}
.kpi-context {
  font-size: 12px;
  color: #94a3b8;
}
</style>
```

### StatDelta.vue (Indicador de Variacion)

```vue
<template>
  <span class="stat-delta" :class="{ positive: value >= 0, negative: value < 0 }">
    <svg v-if="value >= 0" class="delta-icon" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>
    <svg v-else class="delta-icon" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
    {{ formatted }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ value: number; format?: 'percentage' | 'absolute' }>()
const formatted = computed(() => {
  const abs = Math.abs(props.value)
  if (props.format === 'absolute') return new Intl.NumberFormat('es').format(abs)
  return `${abs.toFixed(1)}%`
})
</script>

<style scoped>
.stat-delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.positive { color: #059669; }
.negative { color: #dc2626; }
.delta-icon { width: 16px; height: 16px; fill: currentColor; }
</style>
```

### MiniSparkline.vue (Tendencia en Card)

```vue
<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="sparkline" preserveAspectRatio="none">
    <path
      :d="pathD"
      fill="none"
      :stroke="trend ? '#059669' : '#dc2626'"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle :cx="lastX" :cy="lastY" r="3" :fill="trend ? '#059669' : '#dc2626'" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  data: number[]
  trend: boolean
  width?: number
  height?: number
}>()
const w = props.width || 120
const h = props.height || 30

const pathD = computed(() => {
  const max = Math.max(...props.data)
  const min = Math.min(...props.data)
  const range = max - min || 1
  const step = w / (props.data.length - 1)
  return props.data.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
})

const lastX = computed(() => w)
const lastY = computed(() => {
  const max = Math.max(...props.data)
  const min = Math.min(...props.data)
  const range = max - min || 1
  return h - ((props.data[props.data.length - 1] - min) / range) * (h - 4) - 2
})
</script>

<style scoped>
.sparkline { width: 100%; height: 30px; }
</style>
```

---

## Composables

### useDateRange.ts

```typescript
import { ref, computed } from 'vue'

export type DateRange = '7d' | '30d' | '90d' | 'ytd' | 'custom'

export function useDateRange(defaultRange: DateRange = '30d') {
  const range = ref<DateRange>(defaultRange)
  const customStart = ref<Date>()
  const customEnd = ref<Date>()

  const startDate = computed(() => {
    const now = new Date()
    const end = customEnd.value || now
    switch (range.value) {
      case '7d': return new Date(end.getTime() - 7 * 86400000)
      case '30d': return new Date(end.getTime() - 30 * 86400000)
      case '90d': return new Date(end.getTime() - 90 * 86400000)
      case 'ytd': return new Date(end.getFullYear(), 0, 1)
      case 'custom': return customStart.value || new Date(end.getTime() - 30 * 86400000)
    }
  })

  const endDate = computed(() => customEnd.value || new Date())

  const label = computed(() => {
    if (range.value === 'custom' && customStart.value && customEnd.value) {
      return `${fmt(customStart.value)} - ${fmt(customEnd.value)}`
    }
    const labels: Record<DateRange, string> = { '7d': '7 dias', '30d': '30 dias', '90d': '90 dias', 'ytd': 'Este ano', 'custom': 'Personalizado' }
    return labels[range.value]
  })

  return { range, startDate, endDate, label, customStart, customEnd }
}

function fmt(d: Date) { return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) }
```

### useDashboardData.ts

```typescript
import { ref, watch, type Ref } from 'vue'

interface FetchState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
}

export function useDashboardData<T>(
  fetcher: () => Promise<T>,
  deps: Ref<unknown>[] = []
): FetchState<T> {
  const data = ref<T | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const refresh = async () => {
    loading.value = true
    error.value = null
    try {
      data.value = await fetcher()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido'
    } finally {
      loading.value = false
    }
  }

  watch(deps, refresh, { immediate: true })
  return { data, loading, error, refresh }
}
```

---

## Layouts Comunes

### Grid Responsive para Dashboard

```vue
<template>
  <div class="dashboard">
    <!-- KPI Row -->
    <div class="kpi-row">
      <KpiCard
        v-for="kpi in kpis"
        :key="kpi.id"
        v-bind="kpi"
      />
    </div>

    <!-- Main Charts Row -->
    <div class="charts-row">
      <div class="chart-main">
        <SectionTitle title="Tendencia de Ventas" />
        <TrendChart :data="salesData" :loading="salesLoading" />
      </div>
      <div class="chart-side">
        <SectionTitle title="Por Categoria" />
        <DonutChart :data="categoryData" :loading="catLoading" />
      </div>
    </div>

    <!-- Table Row -->
    <div class="table-row">
      <SectionTitle title="Detalle de Transacciones" />
      <DataTable :data="transactions" :loading="txLoading" />
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  max-width: 1440px;
  margin: 0 auto;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.chart-main, .chart-side {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.table-row {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

/* Responsive */
@media (max-width: 1024px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .charts-row { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .kpi-row { grid-template-columns: 1fr; }
  .dashboard { padding: 12px; gap: 12px; }
}
</style>
```

---

## Integracion con Librerias de Charts

### Chart.js (Recomendado para dashboards simples)

```vue
<script setup lang="ts">
import { Chart } from 'chart.js/auto'
import { ref, onMounted, onUnmounted, watch } from 'vue'

const canvasRef = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const props = defineProps<{
  data: { labels: string[]; datasets: Array<{ label: string; data: number[]; color?: string }> }
  loading?: boolean
}>()

function createChart() {
  if (!canvasRef.value) return
  if (chart) chart.destroy()

  chart = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels: props.data.labels,
      datasets: props.data.datasets.map(d => ({
        label: d.label,
        data: d.data,
        borderColor: d.color || '#3b82f6',
        backgroundColor: (d.color || '#3b82f6') + '20',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: props.data.datasets.length > 1, position: 'top', align: 'end' }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
        y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' } }
      }
    }
  })
}

onMounted(createChart)
onUnmounted(() => chart?.destroy())
watch(() => props.data, createChart, { deep: true })
</script>

<template>
  <ChartSkeleton v-if="loading" />
  <div v-else class="chart-wrapper">
    <canvas ref="canvasRef" />
  </div>
</template>

<style scoped>
.chart-wrapper { position: relative; height: 280px; width: 100%; }
</style>
```

### D3.js (Recomendado para visualizaciones custom complejas)

Usar solo cuando Chart.js/otros no cubran el caso. D3 da control total pero requiere mas codigo.

---

## Performance

### Checklist de Performance
- [ ] Usar `shallowRef` para datos grandes que no necesitan reactividad profunda
- [ ] Virtual scroll para tablas con >50 filas (`vue-virtual-scroller`)
- [ ] Debounce de 300ms en filtros de texto
- [ ] Lazy loading de componentes de graficas: `defineAsyncComponent(() => import('./HeavyChart.vue'))`
- [ ] `v-once` en KPI cards que no cambian en tiempo real
- [ ] Cancelar requests pendientes con AbortController al cambiar filtros
- [ ] Memoizar computados pesados con `computed` (ya lo hace Vue) o dividir en computed mas pequenos

---

## Ejemplo Completo

Ver `SKILL.md` seccion "Dashboard de Ejemplo" para un caso completo de un dashboard de ventas integrando todos los patrones.
