<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useDashboardStore } from '@/features/indicators/stores/dashboard.store'
import { fetchDashboardKpis, fetchZoneStats } from '@/features/indicators/api/dashboard.api'
import { useDashboardFilters } from '@/features/indicators/composables/useDashboardFilters'
import { useDashboardRealtime } from '@/features/indicators/composables/useDashboardRealtime'

import DashboardShell from '@/features/indicators/components/DashboardShell.vue'
import KpiCard from '@/features/indicators/components/KpiCard.vue'
import ZoneLoad from '@/features/indicators/components/charts/ZoneLoad.vue'
import SlaCompliance from '@/features/indicators/components/charts/SlaCompliance.vue'
import ChannelsChart from '@/features/indicators/components/charts/ChannelsChart.vue'

// Importar íconos profesionales (Heroicons) en lugar de emojis
import { ChartBarIcon, ClockIcon, DevicePhoneMobileIcon, CheckBadgeIcon } from '@heroicons/vue/24/outline'

const store = useDashboardStore()
const { initFiltersFromUrl } = useDashboardFilters()

const loadDashboardData = async () => {
  store.setLoading(true)
  try {
    const [kpiData, zones] = await Promise.all([
      fetchDashboardKpis(store.filters),
      fetchZoneStats(store.filters)
    ])
    if (kpiData) store.kpiSummary = kpiData
    if (zones) store.zoneStats = zones
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    store.setLoading(false)
  }
}

// Escuchar cambios de Supabase Realtime
useDashboardRealtime(loadDashboardData)

// Reactividad a cambios de filtros (cuando el usuario cambia un filtro, recargar)
watch(() => store.filters, loadDashboardData, { deep: true })

onMounted(() => {
  initFiltersFromUrl()
  loadDashboardData()
})
</script>

<template>
  <DashboardShell @refresh="loadDashboardData">
    <template v-if="store.kpiSummary">
      <!-- KPIs principales con preguntas operativas e íconos Heroicons -->
      <section class="kpi-row">
        <KpiCard 
          title="¿Cuántos reportes activos hay?" 
          :value="store.kpiSummary.active_reports" 
          :icon="ChartBarIcon" 
          trend="+12% hoy" 
          :trendUp="true" 
        />
        <KpiCard 
          title="¿Se atendieron rápido?" 
          :value="store.kpiSummary.avg_attention_hours ? `${store.kpiSummary.avg_attention_hours}h` : '—'" 
          :icon="ClockIcon" 
          trend="-5h vs ayer" 
          :trendUp="true" 
        />
        <KpiCard 
          title="¿Hay adopción digital?" 
          :value="`${store.kpiSummary.digital_adoption_pct}%`" 
          :icon="DevicePhoneMobileIcon" 
          trend="+2.4%" 
          :trendUp="true" 
        />
        <KpiCard 
          title="¿Están satisfechos? (CSAT)" 
          :value="store.kpiSummary.avg_csat_score || '0.0'" 
          :icon="CheckBadgeIcon" 
          trend="Excelente" 
          :trendUp="true" 
        />
      </section>

      <!-- Grillas de gráficas -->
      <section class="main-grid">
        <div class="lg-span">
          <ZoneLoad />
        </div>
        <div>
          <SlaCompliance />
        </div>
        <div>
          <ChannelsChart />
        </div>
      </section>
      
      <!-- Opcional: Agregar tablas o activity feed aquí, refactorizados con los mismos principios -->
    </template>
    
    <!-- Estado de Carga / Vacío -->
    <template v-else-if="store.loading">
      <div class="loading-state">Cargando métricas analíticas...</div>
    </template>
  </DashboardShell>
</template>

<style scoped>
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}
.main-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.lg-span {
  grid-column: span 1;
}
@media (min-width: 1200px) {
  .lg-span {
    grid-column: span 1;
  }
}
@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
  .lg-span {
    grid-column: span 1;
  }
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--muted, #94a3b8);
  font-size: 1.1rem;
}
</style>