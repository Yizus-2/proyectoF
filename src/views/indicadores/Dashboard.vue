<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'
import { useReportsStore } from '@/stores/reports'
import DashboardFilters from './components/DashboardFilters.vue'
import ReportsByUrgencyChart from './components/charts/ReportsByUrgencyChart.vue'
import SlaComplianceChart from './components/charts/SlaComplianceChart.vue'
import WeeklyTrendChart from './components/charts/WeeklyTrendChart.vue'
import ChannelsChart from './components/charts/ChannelsChart.vue'
import ZoneEfficiencyChart from './components/charts/ZoneEfficiencyChart.vue'
import RiskScaleLegend from './components/RiskScaleLegend.vue'
import { useIndicadoresStore } from '@/stores/indicadores'

const activeTab = ref<'analytics' | 'operations' | 'verification'>('analytics')
const auth = useAuthStore()
const reportsStore = useReportsStore()
const indicadoresStore = useIndicadoresStore()

const GestionView = defineAsyncComponent(() => import('./GestionView.vue'))
const VerificacionPanel = defineAsyncComponent(() => import('../supervisor/VerificacionPanel.vue'))

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
        '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc',
        '#bae6fd', '#0369a1', '#075985', '#0c4a6e'
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
      borderColor: '#8b5cf6',
      backgroundColor: '#8b5cf6',
      pointBackgroundColor: '#fff',
      pointBorderColor: '#8b5cf6',
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 3,
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
          Analíticas y KPIs
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'operations' }"
          @click="activeTab = 'operations'"
        >
          Gestión de Operaciones
        </button>
        <button
          v-if="auth.isSupervisor || auth.isAdmin"
          class="tab-btn"
          :class="{ active: activeTab === 'verification' }"
          @click="activeTab = 'verification'"
        >
          Verificación de Evidencias
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
        <!-- Barra Global de Filtros (Contexto Visible) -->
        <DashboardFilters />

        <!-- Escala Viva -->
        <RiskScaleLegend :contexto="indicadoresStore.contextoActual" />

        <!-- Resumen de Alto Nivel (KPIs) -->
        <div class="kpi-banner">
          <div class="kpi-card glass-card">
            <div class="kpi-icon">📋</div>
            <div class="kpi-data">
              <h3>{{ kpis.total }}</h3>
              <p>Total Reportes</p>
            </div>
          </div>
          <div class="kpi-card glass-card warning">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-data">
              <h3>{{ kpis.pending }}</h3>
              <p>Pendientes</p>
            </div>
          </div>
          <div class="kpi-card glass-card success">
            <div class="kpi-icon">✅</div>
            <div class="kpi-data">
              <h3>{{ kpis.resolved }}</h3>
              <p>Resueltos</p>
            </div>
          </div>
          <div class="kpi-card glass-card danger">
            <div class="kpi-icon">🚨</div>
            <div class="kpi-data">
              <h3>{{ kpis.critical }}</h3>
              <p>Críticos Activos</p>
            </div>
          </div>
        </div>

        <!-- Nueva Cuadrícula v2.1 Mejorada -->
        <section class="dashboard-grid">
          <div class="chart-wrapper">
            <ReportsByUrgencyChart />
          </div>
          <div class="chart-wrapper">
            <SlaComplianceChart />
          </div>
          
          <div class="chart-wrapper span-2">
            <WeeklyTrendChart />
          </div>

          <div class="chart-wrapper">
            <ZoneEfficiencyChart />
          </div>
          <div class="chart-wrapper">
            <ChannelsChart />
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
.glass-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0,0,0,0.05);
  backdrop-filter: blur(16px);
}

.kpi-banner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 24px 0;
}

.kpi-card {
  display: flex;
  align-items: center;
  padding: 24px;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.08);
}

.kpi-icon {
  font-size: 2.5rem;
  background: var(--bg-subtle);
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}

.kpi-data h3 {
  font-size: 2rem;
  font-weight: 900;
  margin: 0;
  color: var(--text);
  line-height: 1;
}

.kpi-data p {
  color: var(--muted);
  margin: 4px 0 0;
  font-weight: 600;
  font-size: 0.95rem;
}

.kpi-card.warning .kpi-icon { background: rgba(245, 158, 11, 0.15); }
.kpi-card.warning h3 { color: #f59e0b; }

.kpi-card.success .kpi-icon { background: rgba(16, 185, 129, 0.15); }
.kpi-card.success h3 { color: #10b981; }

.kpi-card.danger .kpi-icon { background: rgba(239, 68, 68, 0.15); }
.kpi-card.danger h3 { color: #ef4444; }

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.chart-wrapper {
  background: var(--card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  box-shadow: 0 8px 24px rgba(0,0,0,0.04);
  overflow: hidden;
}

@media (min-width: 1100px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .span-2 {
    grid-column: span 2;
  }
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
