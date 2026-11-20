<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useReportsStore } from '@/stores/reports'
import { useToastStore } from '@/stores/toast'
import type { ArchivedDocument } from '@/types/report'
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
const toastStore = useToastStore()

const GestionView = defineAsyncComponent(() => import('./GestionView.vue'))
const VerificacionPanel = defineAsyncComponent(() => import('../supervisor/VerificacionPanel.vue'))

const loading = computed(() => reportsStore.loading)
const errorMsg = computed(() => reportsStore.error || '')
const kpis = computed(() => reportsStore.kpis)

const exportingPdf = ref(false)
const exportingCsv = ref(false)
const archivedDocs = ref<ArchivedDocument[]>([])

async function loadDocuments() {
  try {
    archivedDocs.value = await api.get<ArchivedDocument[]>('/api/documents')
  } catch (err) {
    console.warn('No se pudieron cargar documentos archivados:', err)
  }
}

async function loadDashboardData() {
  await Promise.all([reportsStore.fetchReports(), loadDocuments()])
}

async function exportExecutivePdf() {
  exportingPdf.value = true
  try {
    const meta = await api.download('/api/analytics/export/pdf?download=1', {
      method: 'POST',
      body: indicadoresStore.filtros,
      fallbackFilename: `Informe-Ejecutivo-ESSMAR.pdf`
    })
    toastStore.addToast({
      title: 'Informe PDF archivado en S3',
      message: meta.s3Key ? `Guardado en MinIO S3 (${meta.s3Key})` : `Descargado ${meta.fileName}`,
      type: 'success'
    })
    await loadDocuments()
  } catch (e: any) {
    toastStore.addToast({
      title: 'Error exportando PDF',
      message: e.message || 'No se pudo generar el informe ejecutivo.',
      type: 'error'
    })
  } finally {
    exportingPdf.value = false
  }
}

async function exportCsv() {
  exportingCsv.value = true
  try {
    const params = new URLSearchParams({
      periodo: indicadoresStore.filtros.periodo,
      categoria: indicadoresStore.filtros.categoria,
      zona: String(indicadoresStore.filtros.zona),
      nivelRiesgo: indicadoresStore.filtros.nivelRiesgo
    })
    const meta = await api.download(`/api/analytics/export/csv?${params.toString()}`, {
      fallbackFilename: 'Reportes-ESSMAR.csv'
    })
    toastStore.addToast({
      title: 'Exportación CSV lista',
      message: `Se descargó ${meta.fileName}`,
      type: 'success'
    })
  } catch (e: any) {
    toastStore.addToast({
      title: 'Error exportando CSV',
      message: e.message || 'No se pudo exportar CSV.',
      type: 'error'
    })
  } finally {
    exportingCsv.value = false
  }
}

async function downloadArchivedDoc(doc: ArchivedDocument) {
  try {
    await api.download(`/api/documents/${doc.id}/download`, {
      fallbackFilename: doc.file_name
    })
  } catch (e: any) {
    toastStore.addToast({
      title: 'Error descargando PDF',
      message: e.message || 'No se pudo descargar el documento desde S3.',
      type: 'error'
    })
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function handleKpiClick(filter: 'ALL' | 'PENDING' | 'RESOLVED' | 'CRITICAL') {
  reportsStore.kpiFilter = filter
  activeTab.value = 'operations'
}

onMounted(() => {
  loadDashboardData()
  reportsStore.subscribeToReports()
})

onUnmounted(() => {
  reportsStore.unsubscribe()
})
</script>

<template>
  <main class="dashboard-v4">
    <!-- Encabezado Principal -->
    <header class="dashboard-header">
      <div class="header-content">
        <h1 class="header-title">Centro de Control e Indicadores</h1>
        <p class="header-subtitle">Monitoreo operativo y analítica en tiempo real – ESSMAR SIGVI</p>
      </div>

      <div class="export-actions" v-if="auth.isSupervisor">
        <button class="btn-primary" @click="exportExecutivePdf" :disabled="exportingPdf">
          {{ exportingPdf ? '⏳ Generando PDF...' : '📄 Exportar Informe PDF (S3)' }}
        </button>
        <button class="btn-ghost" @click="exportCsv" :disabled="exportingCsv">
          {{ exportingCsv ? '⏳ Exportando...' : '📊 Exportar CSV' }}
        </button>
      </div>
      
      <!-- Resumen de Alto Nivel (KPIs) -->
      <div class="kpi-banner" style="width: 100%; margin: 16px 0;">
        <div class="kpi-card glass-card kpi-clickable" @click="handleKpiClick('ALL')">
          <div class="kpi-icon">📋</div>
          <div class="kpi-data">
            <h3>{{ kpis.total }}</h3>
            <p>Total Reportes</p>
          </div>
        </div>
        <div class="kpi-card glass-card warning kpi-clickable" @click="handleKpiClick('PENDING')">
          <div class="kpi-icon">⏳</div>
          <div class="kpi-data">
            <h3>{{ kpis.pending }}</h3>
            <p>Pendientes</p>
          </div>
        </div>
        <div class="kpi-card glass-card success kpi-clickable" @click="handleKpiClick('RESOLVED')">
          <div class="kpi-icon">✅</div>
          <div class="kpi-data">
            <h3>{{ kpis.resolved }}</h3>
            <p>Resueltos</p>
          </div>
        </div>
        <div class="kpi-card glass-card danger kpi-clickable" @click="handleKpiClick('CRITICAL')">
          <div class="kpi-icon">🚨</div>
          <div class="kpi-data">
            <h3>{{ kpis.critical }}</h3>
            <p>Críticos Activos</p>
          </div>
        </div>
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

        <!-- Repositorio de Documentos PDF archivados en MinIO S3 -->
        <section class="glass-card docs-archive-card" v-if="archivedDocs.length > 0">
          <div class="card-header">
            <div class="header-titles">
              <h3>🗄️ Repositorio de Documentos PDF (MinIO S3)</h3>
              <p class="chart-subtitle">Comprobantes legales PQR e informes ejecutivos archivados con integridad SHA-256</p>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Archivo</th>
                  <th>Objeto S3</th>
                  <th>Tamaño</th>
                  <th>SHA-256</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in archivedDocs.slice(0, 10)" :key="doc.id">
                  <td>
                    <span class="badge-pill" :class="doc.doc_type === 'REPORTE_EJECUTIVO' ? 'bg-warn' : 'bg-success'">
                      {{ doc.doc_type === 'REPORTE_EJECUTIVO' ? 'Ejecutivo' : 'PQR Legal' }}
                    </span>
                  </td>
                  <td class="td-primary">{{ doc.file_name }}</td>
                  <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--muted);">{{ doc.s3_key }}</td>
                  <td>{{ formatBytes(doc.size_bytes) }}</td>
                  <td style="font-family: var(--font-mono); font-size: 0.78rem;">{{ doc.sha256_hash.slice(0, 12) }}…</td>
                  <td>
                    <button class="btn-ghost" style="padding: 6px 12px; font-size: 0.8rem;" @click="downloadArchivedDoc(doc)">
                      ⬇️ Descargar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
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

.export-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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

.kpi-clickable {
  cursor: pointer;
}

.kpi-clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.08);
  border-color: var(--primary);
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
