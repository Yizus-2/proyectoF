<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const store = useIndicadoresStore()
const kpiConfig = computed(() => store.kpis.find(k => k.id === 'trend'))

const datos = computed(() => {
  const reports = store.reportesFiltrados
  
  // Generar últimos 7 días
  const days = []
  const counts: Record<string, number> = {}
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push(dateStr)
    counts[dateStr] = 0
  }

  reports.forEach(r => {
    const date = r.created_at.split('T')[0]
    if (counts[date] !== undefined) {
      counts[date]++
    }
  })

  // Format labels to DD/MM
  const labels = days.map(d => {
    const parts = d.split('-')
    return `${parts[2]}/${parts[1]}`
  })
  
  return {
    labels,
    data: Object.values(counts)
  }
})

const chartData = computed(() => ({
  labels: datos.value.labels,
  datasets: [{
    label: 'Reportes Diarios',
    data: datos.value.data,
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 3,
    pointBackgroundColor: '#fff',
    pointBorderColor: '#8b5cf6',
    pointRadius: 4,
    pointHoverRadius: 6,
    fill: true,
    tension: 0.4
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 10,
      displayColors: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(160, 160, 160, 0.1)',
        drawBorder: false,
      },
      ticks: { precision: 0, color: '#8a82a0' }
    },
    x: {
      grid: { display: false },
      ticks: { color: '#8a82a0' }
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
    <div class="chart-container">
      <Line :data="chartData" :options="chartOptions" />
    </div>

    <template #tooltip>
      <div class="tooltip-body">
        <p><strong>Qué mide:</strong> Volumen diario de incidentes ingresados al sistema.</p>
        <p><strong>Cómo se calcula:</strong> Suma de reportes recibidos por fecha de creación (últimos 7 días naturales independientemente del filtro).</p>
        <p><strong>Decisión operativa:</strong> {{ kpiConfig.accionSugerida.malo }}</p>
      </div>
    </template>
  </KpiCard>
</template>

<style scoped>
.chart-container {
  position: relative;
  height: 180px;
  width: 100%;
}
.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tooltip-body p { margin: 0; }
</style>
