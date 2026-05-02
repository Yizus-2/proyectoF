<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/composables/useTheme'
import KpiCard from '@/components/common/KpiCard.vue'
import type { KpiSummary, ReportsByZone } from '@/types/dashboard'
import { Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const loading = ref(true)
const errorMsg = ref('')
const summary = ref<KpiSummary | null>(null)
const zonesData = ref<ReportsByZone[]>([])
const slaStats = ref<any[]>([])
const crewStats = ref<any[]>([])
const recentReports = ref<any[]>([])

const { isDark } = useTheme()

// Helper para obtener colores del tema
function getThemeColor(variable: string) {
  if (typeof document === 'undefined') return '#ccc'
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#ccc'
}

async function loadKpis() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { error: rpcErr } = await supabase.rpc('refresh_kpi_summary')
    if (rpcErr) console.warn('refresh_kpi_summary RPC error:', rpcErr.message)

    const { data: kpiData, error: kpiErr } = await supabase.from('kpi_summary').select('*').single()
    if (kpiErr) throw kpiErr
    if (kpiData) summary.value = kpiData

    const { data: zoneData } = await supabase.from('reports_by_zone').select('*')
    if (zoneData) zonesData.value = zoneData

    const { data: slaData } = await supabase.from('reports_sla_status').select('sla_status')
    if (slaData) {
      const counts: any = { 'A TIEMPO': 0, 'RIESGO': 0, 'VENCIDO': 0, 'FINALIZADO': 0 }
      slaData.forEach((r: any) => { if (counts[r.sla_status] !== undefined) counts[r.sla_status]++ })
      slaStats.value = Object.entries(counts).map(([label, value]) => ({ label, value }))
    }

    const { data: crewData } = await supabase.from('crew_efficiency').select('*')
    if (crewData) crewStats.value = crewData

    const { data: recentData } = await supabase.from('reports').select('tracking_code, status, address, created_at').order('created_at', { ascending: false }).limit(5)
    if (recentData) recentReports.value = recentData
  } catch (e: any) {
    console.error('Error dashboard:', e)
    errorMsg.value = e.message || 'Error inesperado.'
  } finally {
    loading.value = false
  }
}

const barChartData = computed(() => {
  isDark.value // Forzar reactividad
  return {
    labels: zonesData.value.map(z => z.zone_name),
    datasets: [
      { label: 'Total', backgroundColor: getThemeColor('--primary'), data: zonesData.value.map(z => z.total_reports), borderRadius: 6 },
      { label: 'Activos', backgroundColor: getThemeColor('--accent'), data: zonesData.value.map(z => z.active_reports), borderRadius: 6 }
    ]
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
        labels: { usePointStyle: true, padding: 20, color: getThemeColor('--text') } 
      } 
    },
    scales: { 
      y: { grid: { display: false }, ticks: { color: getThemeColor('--muted') } }, 
      x: { grid: { display: false }, ticks: { color: getThemeColor('--muted') } } 
    }
  }
})

const slaChartData = computed(() => {
  isDark.value
  return {
    labels: slaStats.value.map(s => s.label),
    datasets: [{
      backgroundColor: [
        getThemeColor('--accent'), 
        getThemeColor('--warning'), 
        getThemeColor('--danger'), 
        getThemeColor('--primary')
      ],
      data: slaStats.value.map(s => s.value),
      borderWidth: 0,
      hoverOffset: 15
    }]
  }
})

const doughnutData = computed(() => {
  isDark.value
  const online = summary.value?.digital_reports || 0
  const total = summary.value?.total_reports || 0
  const offline = total - online
  return {
    labels: ['Digital', 'Otros'],
    datasets: [{ backgroundColor: [getThemeColor('--accent'), getThemeColor('--stroke')], data: [online, offline], borderWidth: 0 }]
  }
})

onMounted(loadKpis)

const icons = {
  active: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>',
  time: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  adoption: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 12h8"/><path d="M21 9l3 3-3 3"/></svg>',
  csat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
}
</script>

<template>
  <main class="dashboard-v4">
    <header class="dashboard-header">
      <div class="header-content">
        <h1 class="header-title">Analítica Estratégica</h1>
        <p class="header-subtitle">Monitoreo en tiempo real del sistema ESSMAR SIGVI</p>
      </div>
      <button class="btn-refresh" @click="loadKpis" :disabled="loading">
        <span v-if="loading" class="spinner-sm"></span>
        {{ loading ? 'Sincronizando...' : 'Actualizar Datos' }}
      </button>
    </header>

    <div v-if="errorMsg" class="error-banner">
      ⚠️ {{ errorMsg }}
    </div>

    <template v-if="summary">
      <section class="kpi-row">
        <KpiCard title="Reportes Activos" :value="summary.active_reports" :icon="icons.active" trend="+12% hoy" trendUp />
        <KpiCard title="T. Promedio" :value="summary.avg_attention_hours ? `${summary.avg_attention_hours}h` : '—'" :icon="icons.time" trend="-5h vs ayer" trendUp />
        <KpiCard title="Adopción Digital" :value="`${summary.digital_adoption_pct}%`" :icon="icons.adoption" trend="+2.4%" trendUp />
        <KpiCard title="Satisfacción (CSAT)" :value="summary.avg_csat_score || '0.0'" :icon="icons.csat" trend="Excelente" trendUp />
      </section>

      <section class="main-grid">
        <div class="glass-card chart-container lg-span">
          <div class="card-header">
            <h3>Distribución Operativa por Zona</h3>
          </div>
          <div class="chart-box">
            <Bar :data="barChartData" :options="chartOptions" />
          </div>
        </div>
        <div class="glass-card chart-container">
          <div class="card-header">
            <h3>Salud del SLA</h3>
          </div>
          <div class="chart-box">
            <Doughnut :data="slaChartData" :options="chartOptions" />
          </div>
        </div>
        <div class="glass-card chart-container">
          <div class="card-header">
            <h3>Canales de Reporte</h3>
          </div>
          <div class="chart-box">
            <Doughnut :data="doughnutData" :options="chartOptions" />
          </div>
        </div>
      </section>

      <section class="footer-grid">
        <div class="glass-card table-section">
          <div class="card-header">
            <h3>Eficiencia de Zonas</h3>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Total</th>
                  <th>Activos</th>
                  <th>T. Promedio</th>
                  <th>Salud</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="z in zonesData" :key="z.zone_id">
                  <td class="td-primary">{{ z.zone_name }}</td>
                  <td>{{ z.total_reports }}</td>
                  <td><span class="badge-pill" :class="z.active_reports > 0 ? 'bg-warn' : 'bg-success'">{{ z.active_reports }}</span></td>
                  <td>{{ z.avg_hours }}h</td>
                  <td>
                    <div class="health-bar">
                      <div class="health-fill" :style="{ width: '85%', background: z.active_reports > 5 ? '#ef4444' : '#10b981' }"></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass-card activity-section">
          <div class="card-header">
            <h3>Últimos Eventos</h3>
          </div>
          <div class="feed-list">
            <div v-for="item in recentReports" :key="item.tracking_code" class="feed-item">
              <div class="status-dot" :class="item.status.toLowerCase()"></div>
              <div class="feed-body">
                <div class="feed-top">
                  <span class="feed-code">{{ item.tracking_code }}</span>
                  <span class="feed-time">{{ new Date(item.created_at).toLocaleTimeString() }}</span>
                </div>
                <p class="feed-address">{{ item.address }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
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
.dashboard-header { display: flex; justify-content: space-between; align-items: center; }
.header-title { font-size: 2.5rem; font-weight: 800; color: var(--text); letter-spacing: -0.02em; }
.header-subtitle { color: var(--muted); font-size: 1.1rem; }
.btn-refresh { background: var(--card); border: 1px solid var(--stroke); padding: 12px 24px; border-radius: 12px; font-weight: 700; color: var(--primary); cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
.btn-refresh:hover { background: var(--bg-subtle); transform: scale(1.02); }
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
.main-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.glass-card { background: var(--card); border: 1px solid var(--stroke); border-radius: 24px; padding: 24px; box-shadow: var(--shadow-sm); }
.chart-container { display: flex; flex-direction: column; min-height: 400px; }
.chart-box { flex-grow: 1; position: relative; margin-top: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.card-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text); }
.footer-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
.table-wrapper { margin-top: 20px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 12px; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; border-bottom: 1px solid var(--bg-subtle); }
td { padding: 16px 12px; border-bottom: 1px solid var(--bg-subtle); font-size: 0.95rem; color: var(--text); }
.td-primary { font-weight: 700; color: var(--text); }
.badge-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
.bg-warn { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.bg-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.health-bar { height: 6px; background: var(--bg-subtle); border-radius: 3px; overflow: hidden; width: 80px; }
.health-fill { height: 100%; }
.feed-list { display: flex; flex-direction: column; gap: 20px; margin-top: 20px; }
.feed-item { display: flex; gap: 16px; align-items: flex-start; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.status-dot.reportado { background: var(--warning); }
.status-dot.resuelto { background: var(--success); }
.status-dot.cerrado { background: var(--primary); }
.feed-body { flex-grow: 1; }
.feed-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
.feed-code { font-weight: 800; font-size: 0.9rem; color: var(--text); font-family: monospace; }
.feed-time { font-size: 0.75rem; color: var(--muted); }
.feed-address { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }
.spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 1024px) { .main-grid, .footer-grid { grid-template-columns: 1fr; } .dashboard-v4 { padding: 20px; } }
</style>