<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'

ChartJS.register(ArcElement, Tooltip, Legend)

const store = useIndicadoresStore()
const kpiConfig = computed(() => store.kpis.find(k => k.id === 'sla'))

const datos = computed(() => {
  const reports = store.reportesFiltrados
  let aTiempo = 0
  let vencidos = 0
  
  reports.forEach(r => {
    // Solo contar reportes finalizados para SLA
    if (['cerrado', 'resuelto', 'completado', 'evaluado'].includes(r.status.toLowerCase())) {
      const created = new Date(r.created_at).getTime()
      const resolved = r.resolved_at ? new Date(r.resolved_at).getTime() : new Date(r.updated_at).getTime()
      const hoursTaken = (resolved - created) / (1000 * 60 * 60)
      
      const p = r.priority?.toLowerCase() || 'media'
      let maxHours = 8
      if (p === 'critica') maxHours = 0.5
      else if (p === 'alta') maxHours = 2
      else if (p === 'baja') maxHours = 24
      
      if (hoursTaken <= maxHours) {
        aTiempo++
      } else {
        vencidos++
      }
    }
  })

  // Evitar NaN
  if (aTiempo === 0 && vencidos === 0) {
    aTiempo = 1
  }

  const total = aTiempo + vencidos
  const aTiempoPct = Math.round((aTiempo / total) * 100)
  
  return { aTiempo, vencidos, aTiempoPct }
})

const chartData = computed(() => ({
  labels: ['A tiempo', 'Vencidos'],
  datasets: [{
    data: [datos.value.aTiempo, datos.value.vencidos],
    backgroundColor: ['#10b981', '#ef4444'],
    borderWidth: 0,
    cutout: '75%'
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      bodyFont: { size: 14 }
    }
  }
}
</script>

<template>
  <KpiCard
    v-if="kpiConfig"
    :pregunta="kpiConfig.pregunta"
    :contexto="kpiConfig.contexto"
    :icono="kpiConfig.icono"
    :unidad="kpiConfig.unidad"
    :color="kpiConfig.color"
    :categoria-actual="store.contextoActual"
  >
    <div class="chart-wrapper">
      <div class="doughnut-container">
        <Doughnut :data="chartData" :options="chartOptions" />
        <div class="center-metric">
          <span class="pct">{{ datos.aTiempoPct }}%</span>
          <span class="label">A tiempo</span>
        </div>
      </div>
      
      <div class="sla-legend">
        <div class="legend-item">
          <span class="dot" style="background: #10b981"></span>
          <span>A tiempo ({{ datos.aTiempo }})</span>
        </div>
        <div class="legend-item">
          <span class="dot" style="background: #ef4444"></span>
          <span>Vencidos ({{ datos.vencidos }})</span>
        </div>
      </div>
    </div>

    <template #tooltip>
      <div class="tooltip-body">
        <p><strong>Qué mide:</strong> El porcentaje de reportes resueltos antes del tiempo límite.</p>
        <p><strong>Referencia SLA:</strong> Crítico &lt;30m | Alto &lt;2h | Medio &lt;8h | Bajo &lt;24h.</p>
        <p><strong>Decisión operativa:</strong> {{ kpiConfig.accionSugerida.malo }}</p>
      </div>
    </template>
  </KpiCard>
</template>

<style scoped>
.chart-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  gap: 16px;
}

.doughnut-container {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.center-metric {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.center-metric .pct {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.center-metric .label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--emerald);
}

.sla-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tooltip-body p { margin: 0; }
</style>
