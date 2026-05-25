<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useIndicadoresStore } from '@/stores/indicadores'
import { useDashboardFilters } from '@/composables/useDashboardFilters'

import DashboardFilters from './components/DashboardFilters.vue'
import RiskScaleLegend from './components/RiskScaleLegend.vue'
import ReportsByUrgencyChart from './components/charts/ReportsByUrgencyChart.vue'
import SlaComplianceChart from './components/charts/SlaComplianceChart.vue'
import WeeklyTrendChart from './components/charts/WeeklyTrendChart.vue'
import ChannelsChart from './components/charts/ChannelsChart.vue'
import ZoneEfficiencyChart from './components/charts/ZoneEfficiencyChart.vue'
import VerificationPanel from './components/VerificationPanel.vue'

const store = useIndicadoresStore()
const { cargando, error } = storeToRefs(store)
const { initFiltersFromUrl } = useDashboardFilters()

// Cargar inicial y reaccionar a filtros
onMounted(() => {
  initFiltersFromUrl()
  store.cargarDatosDashboard()
})

watch(() => store.filtros, () => {
  store.cargarDatosDashboard()
}, { deep: true })
</script>

<template>
  <main class="dashboard-page">
    <header class="dashboard-header">
      <div class="header-content">
        <h1 class="header-title">Tablero de Control Operativo</h1>
        <p class="header-subtitle">Gestión y estado del sistema SIGVI en tiempo real</p>
      </div>
      
      <div class="header-actions">
        <RiskScaleLegend />
        <button class="btn-refresh" @click="store.cargarDatosDashboard" :disabled="cargando">
          <span v-if="cargando" class="spinner-sm"></span>
          {{ cargando ? 'Sincronizando...' : 'Actualizar Datos' }}
        </button>
      </div>
    </header>

    <div v-if="error" class="error-banner">
      ⚠️ {{ error }}
    </div>

    <!-- Barra de Filtros Globales -->
    <DashboardFilters />

    <div v-if="cargando && (!store.kpiData || store.kpiData.length === 0)" class="loading-state">
      <span class="spinner-lg"></span>
      <p>Cargando analíticas operativas...</p>
    </div>

    <template v-else>
      <!-- Grilla Principal -->
      <section class="kpi-grid">
        <div class="kpi-col main-urgency">
          <ReportsByUrgencyChart />
        </div>
        <div class="kpi-col">
          <SlaComplianceChart />
        </div>
      </section>

      <section class="kpi-grid-3">
        <div class="kpi-col lg-span">
          <ZoneEfficiencyChart />
        </div>
        <div class="kpi-col">
          <WeeklyTrendChart />
        </div>
        <div class="kpi-col">
          <ChannelsChart />
        </div>
      </section>

      <!-- Panel de Verificación de Evidencias (Supervisores) -->
      <section class="verification-section">
        <VerificationPanel />
      </section>
    </template>
  </main>
</template>

<style scoped>
.dashboard-page {
  padding: 32px 40px;
  background: var(--page-bg, #0f172a);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}
.header-title { font-size: 2rem; font-weight: 800; color: var(--text, #f8fafc); margin: 0; letter-spacing: -0.02em; }
.header-subtitle { color: var(--muted, #94a3b8); font-size: 1rem; margin: 4px 0 0 0; }
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.btn-refresh {
  background: var(--card, #1e293b);
  border: 1px solid var(--stroke, #334155);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  color: var(--primary, #3b82f6);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  height: 44px;
}
.btn-refresh:hover:not(:disabled) { background: var(--bg-subtle, #334155); transform: scale(1.02); }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.kpi-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}
.kpi-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.lg-span {
  grid-column: span 1;
}

.verification-section {
  margin-top: 24px;
}

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .kpi-grid-3 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px) {
  .kpi-grid, .kpi-grid-3 { grid-template-columns: 1fr; }
  .dashboard-page { padding: 20px; }
  .dashboard-header { flex-direction: column; align-items: flex-start; }
}

/* Spinners */
.spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(0,0,0,0.1); border-top-color: var(--primary, #3b82f6); border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner-lg { width: 32px; height: 32px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary, #3b82f6); border-radius: 50%; animation: spin 0.8s linear infinite; display: block; margin-bottom: 16px; }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--muted, #94a3b8); font-weight: 500; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
