<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'
import { useReportsStore } from '@/stores/reports'
import KpiCard from '@/components/common/KpiCard.vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'

const GestionView = defineAsyncComponent(() => import('./GestionView.vue'))
const VerificacionPanel = defineAsyncComponent(() => import('../supervisor/VerificacionPanel.vue'))
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, LineElement, PointElement } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, LineElement, PointElement)

const activeTab = ref<'analytics' | 'operations' | 'verification'>('analytics')
const auth = useAuthStore()
const reportsStore = useReportsStore()

// Bindings to the centralized store
const loading = computed(() => reportsStore.loading)
const errorMsg = computed(() => reportsStore.error || '')
const kpis = computed(() => reportsStore.kpis)
const slaStats = computed(() => reportsStore.slaStats)
const channelStats = computed(() => reportsStore.channelStats)
const priorityStats = computed(() => reportsStore.priorityStats)
const trendStats = computed(() => reportsStore.trendStats)
const zonesData = computed(() => reportsStore.zonesData)
const recentEvents = computed(() => reportsStore.recentEvents)

const { isDark } = useTheme()

function getThemeColor(variable: string) {
  if (typeof document === 'undefined') return '#ccc'
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#ccc'
}

async function loadDashboardData() {
  await reportsStore.fetchReports()
}

onMounted(() => {
  loadDashboardData()
  reportsStore.subscribeToReports()
})

onUnmounted(() => {
  reportsStore.unsubscribe()
})

// Chart Data Definition
const complianceChartData = computed(() => {
  isDark.value
  return {
    labels: slaStats.value.map(s => s.label),
    datasets: [{
      backgroundColor: [
        '#10b981', // A TIEMPO - Emerald
        '#f59e0b', // RIESGO - Amber
        '#ef4444', // VENCIDO - Red
        '#3b82f6'  // FINALIZADO - Blue
      ],
      data: slaStats.value.map(s => s.value),
      borderWidth: 0,
      hoverOffset: 12
    }]
  }
})

const channelsChartData = computed(() => {
  isDark.value
  return {
    labels: channelStats.value.map(c => c.label),
    datasets: [{
      label: 'Reportes',
      backgroundColor: [
        '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f43f5e', '#64748b'
      ],
      data: channelStats.value.map(c => c.value),
      borderWidth: 0,
      borderRadius: 4
    }]
  }
})

const trendChartData = computed(() => {
  isDark.value
  return {
    labels: trendStats.value.map(t => t.label),
    datasets: [{
      label: 'Reportes Diarios',
      borderColor: '#3b82f6',
      backgroundColor: '#3b82f6',
      data: trendStats.value.map(t => t.value),
      tension: 0.3
    }]
  }
})

const riskChartData = computed(() => {
  isDark.value
  return {
    labels: priorityStats.value.map(p => p.label),
    datasets: [{
      label: 'Reportes',
      backgroundColor: [
        '#991b1b', // CRITICA - Dark Red
        '#ef4444', // ALTA - Red
        '#f59e0b', // MEDIA - Amber
        '#10b981'  // BAJA - Emerald
      ],
      data: priorityStats.value.map(p => p.value),
      borderRadius: 6
    }]
  }
})

const chartOptions = computed(() => {
  isDark.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom' as const, 
        labels: { usePointStyle: true, padding: 16, color: getThemeColor('--text') } 
      } 
    },
    scales: { 
      y: { grid: { display: false }, ticks: { color: getThemeColor('--muted') } }, 
      x: { grid: { display: false }, ticks: { color: getThemeColor('--muted') } } 
    }
  }
})

const horizontalBarOptions = computed(() => {
  isDark.value
  return {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false } 
    },
    scales: { 
      x: { grid: { display: false }, ticks: { color: getThemeColor('--muted') } },
      y: { grid: { display: false }, ticks: { color: getThemeColor('--text') } }
    }
  }
})

const doughnutOptions = computed(() => {
  isDark.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom' as const, 
        labels: { usePointStyle: true, padding: 14, color: getThemeColor('--text') } 
      } 
    }
  }
})

const icons = {
  active: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>',
  progress: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>',
  done: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  time: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
}
</script>

<template>
  <main class="dashboard-v4">
    <!-- Encabezado Principal -->
    <header class="dashboard-header">
      <div class="header-content">
        <h1 class="header-title">Centro de Control e Indicadores</h1>
        <p class="header-subtitle">Monitoreo operativo y analítica en tiempo real – ESSMAR SIGVI</p>
      </div>
      
      <!-- Sub-navegación de Pestañas (Premium Glass) -->
      <div class="navigation-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'analytics' }"
          @click="activeTab = 'analytics'"
        >
          📊 Analíticas y KPIs
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'operations' }"
          @click="activeTab = 'operations'"
        >
          🔄 Gestión de Operaciones
        </button>
        <button
          v-if="auth.isSupervisor || auth.isAdmin"
          class="tab-btn"
          :class="{ active: activeTab === 'verification' }"
          @click="activeTab = 'verification'"
        >
          ✅ Verificación de Evidencias
        </button>
      </div>
    </header>

    <div v-if="errorMsg" class="error-banner">
      ⚠️ {{ errorMsg }}
    </div>

    <!-- PESTAÑA 1: ANALÍTICAS Y KPIS -->
    <div v-if="activeTab === 'analytics'" class="tab-pane">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando estadísticas del sistema...</p>
      </div>

      <div v-else class="analytics-content-flow">
        <!-- Fila de KPIs -->
        <section class="kpi-row">
          <KpiCard title="Reportes Activos" :value="kpis.activos" :icon="icons.active" trend="Total sin resolver" trendUp />
          <KpiCard title="En Progreso" :value="kpis.enProgreso" :icon="icons.progress" trend="Cuadrillas activas" trendUp />
          <KpiCard title="Resueltos (Mes)" :value="kpis.resueltos" :icon="icons.done" trend="Resoluciones del mes" trendUp />
          <KpiCard title="T. Promedio de Respuesta" :value="kpis.tiempoPromedio + 'h'" :icon="icons.time" trend="Desde asignación" trendUp />
        </section>

        <!-- Fila de Gráficos -->
        <section class="charts-grid">
          <!-- Gráfico de Tendencia -->
          <div class="glass-card chart-container" style="grid-column: span 2;">
            <div class="card-header">
              <h3>📈 Tendencia de Reportes (7 días)</h3>
              <span class="info-tooltip" title="Volumen de incidentes reportados en la última semana.">ℹ️</span>
            </div>
            <div class="chart-box">
              <Line :data="trendChartData" :options="chartOptions" />
            </div>
          </div>

          <!-- Gráfico 1: Cumplimiento de Tiempos de Respuesta -->
          <div class="glass-card chart-container">
            <div class="card-header">
              <div class="header-titles">
                <h3>⏱️ Cumplimiento SLA de Atención</h3>
                <p class="chart-subtitle">Resueltos dentro del tiempo objetivo según riesgo</p>
              </div>
              <span class="info-tooltip" title="SLA: Crítico <30min, Alto <2h, Medio <8h, Bajo <24h">ℹ️</span>
            </div>
            <div class="chart-box">
              <Doughnut :data="complianceChartData" :options="doughnutOptions" />
            </div>
          </div>

          <!-- Gráfico 3: Escalas de Riesgo -->
          <div class="glass-card chart-container">
            <div class="card-header">
              <div class="header-titles">
                <h3>⚠️ Reportes por Nivel de Riesgo</h3>
                <p class="chart-subtitle">Reportes activos distribuidos por urgencia de atención</p>
              </div>
              <span class="info-tooltip" title="Clasificación de incidentes según su nivel de riesgo y urgencia de atención.">ℹ️</span>
            </div>
            <div class="chart-box" style="height: 220px;">
              <Bar :data="riskChartData" :options="chartOptions" />
            </div>
            <div class="mini-legend">
              <span class="legend-item"><span class="dot red"></span> Crítico (<30m)</span>
              <span class="legend-item"><span class="dot orange"></span> Alto (<2h)</span>
              <span class="legend-item"><span class="dot yellow"></span> Medio (<8h)</span>
              <span class="legend-item"><span class="dot green"></span> Bajo (<24h)</span>
            </div>
          </div>
          
          <!-- Gráfico 2: Canales de Reporte Completos -->
          <div class="glass-card chart-container" style="grid-column: span 2;">
            <div class="card-header">
              <h3>📡 Canales de Reporte Utilizados</h3>
              <span class="info-tooltip" title="Distribución de reportes recibidos según el canal ciudadano de entrada.">ℹ️</span>
            </div>
            <div class="chart-box">
              <Bar :data="channelsChartData" :options="horizontalBarOptions" />
            </div>
          </div>
        </section>

        <!-- Leyendas y Umbrales de Riesgo -->
        <section class="glass-card risk-scale-card">
          <h3>Escalas y Umbrales de Prioridad de Atención</h3>
          <div class="risk-grid">
            <div class="risk-item critica">
              <span class="dot-indicator red"></span>
              <div class="risk-info">
                <strong>Riesgo Crítico:</strong> Tiempos de respuesta menores a <strong>30 minutos</strong>. Fugas masivas, roturas de tuberías matrices, incidentes con peligro físico inmediato.
              </div>
            </div>
            <div class="risk-item alta">
              <span class="dot-indicator orange"></span>
              <div class="risk-info">
                <strong>Riesgo Alto:</strong> Tiempos de respuesta menores a <strong>2 horas</strong>. Fugas de agua en calzadas principales, daños severos a hidrantes públicos.
              </div>
            </div>
            <div class="risk-item media">
              <span class="dot-indicator yellow"></span>
              <div class="risk-info">
                <strong>Riesgo Medio:</strong> Tiempos de respuesta menores a <strong>8 horas</strong>. Presión de red disminuida, goteos constantes en redes de distribución secundaria.
              </div>
            </div>
            <div class="risk-item baja">
              <span class="dot-indicator green"></span>
              <div class="risk-info">
                <strong>Riesgo Bajo:</strong> Tiempos de respuesta menores a <strong>24 horas</strong>. Daños menores de infraestructura, lecturas de presión estándar o reportes preventivos.
              </div>
            </div>
          </div>
        </section>

        <!-- Eficiencia por Zonas & Feed de Eventos -->
        <section class="footer-grid">
          <div class="glass-card table-section">
            <div class="card-header">
              <h3>Eficiencia y Carga de Trabajo por Zonas</h3>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th>Total Reportes</th>
                    <th>Activos</th>
                    <th>Tiempo Prom.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="z in zonesData" :key="z.zone_id">
                    <td class="td-primary">{{ z.zone_name }}</td>
                    <td>{{ z.total_reports }}</td>
                    <td>
                      <span class="badge-pill" :class="z.active_reports > 0 ? 'bg-warn' : 'bg-success'">
                        {{ z.active_reports }} activos
                      </span>
                    </td>
                    <td>{{ z.avg_hours ? z.avg_hours + 'h' : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="glass-card activity-section">
            <div class="card-header">
              <h3>Historial Reciente de Incidencias</h3>
            </div>
            <div class="feed-list">
              <div v-for="item in recentEvents" :key="item.id" class="feed-item">
                <div class="status-dot" :class="item.status.toLowerCase()"></div>
                <div class="feed-body">
                  <div class="feed-top">
                    <span class="feed-code">{{ item.tracking_code || `#${item.id}` }}</span>
                    <span class="feed-time">{{ new Date(item.created_at).toLocaleDateString() }}</span>
                  </div>
                  <p class="feed-address">{{ item.address }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- PESTAÑA 2: GESTIÓN DE OPERACIONES -->
    <div v-else-if="activeTab === 'operations'" class="tab-pane">
      <div class="glass-card wrapper-card">
        <GestionView />
      </div>
    </div>

    <!-- PESTAÑA 3: VERIFICACIÓN DEL SUPERVISOR -->
    <div v-else-if="activeTab === 'verification'" class="tab-pane">
      <div class="glass-card wrapper-card">
        <VerificacionPanel />
      </div>
    </div>
  </main>
</template>

<style scoped>
.dashboard-v4 {
  padding: 40px;
  background: var(--page-bg);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.header-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  margin: 0;
}

.header-subtitle {
  color: var(--muted);
  font-size: 1.05rem;
  margin: 4px 0 0 0;
}

/* Tabs Navigation */
.navigation-tabs {
  display: flex;
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 14px;
  padding: 4px;
  backdrop-filter: blur(8px);
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  background: var(--bg-subtle);
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.tab-pane {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.analytics-content-flow {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.glass-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.wrapper-card {
  padding: 28px;
}

.chart-container {
  display: flex;
  flex-direction: column;
  min-height: 380px;
}

.chart-box {
  flex-grow: 1;
  position: relative;
  margin-top: 16px;
  height: 260px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-header h3 {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
  color: var(--text);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chart-subtitle {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.3;
}

.mini-legend {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.legend-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-item .dot.red { background: #991b1b; }
.legend-item .dot.orange { background: #ef4444; }
.legend-item .dot.yellow { background: #f59e0b; }
.legend-item .dot.green { background: #10b981; }

.info-tooltip {
  cursor: help;
  font-size: 0.9rem;
  opacity: 0.7;
}

/* Risk Scales */
.risk-scale-card h3 {
  margin: 0 0 16px 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.risk-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: 14px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.dot-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.dot-indicator.red { background: #991b1b; box-shadow: 0 0 8px #991b1b; }
.dot-indicator.orange { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
.dot-indicator.yellow { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
.dot-indicator.green { background: #10b981; box-shadow: 0 0 8px #10b981; }

.footer-grid {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}

.table-wrapper {
  margin-top: 16px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 12px;
  color: var(--muted);
  font-size: 0.85rem;
  text-transform: uppercase;
  border-bottom: 1px solid var(--stroke);
}

td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--stroke);
  font-size: 0.9rem;
}

.td-primary {
  font-weight: 700;
}

.badge-pill {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
}

.bg-warn { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.bg-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }

/* Event Feed */
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.feed-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.status-dot.reportado { background: var(--warning); }
.status-dot.asignado { background: var(--primary); }
.status-dot.en_progreso { background: #f59e0b; }
.status-dot.resuelto { background: #10b981; }
.status-dot.cerrado { background: var(--muted); }

.feed-body {
  flex-grow: 1;
}

.feed-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.feed-code {
  font-weight: 800;
  font-size: 0.85rem;
  font-family: monospace;
}

.feed-time {
  font-size: 0.75rem;
  color: var(--muted);
}

.feed-address {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 600;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: var(--muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
  margin-bottom: 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 860px) {
  .dashboard-v4 { padding: 20px; }
  .dashboard-header { flex-direction: column; align-items: stretch; }
  .navigation-tabs { width: 100%; flex-direction: column; }
  .tab-btn { text-align: center; }
}
</style>
