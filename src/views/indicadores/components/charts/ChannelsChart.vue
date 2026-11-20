<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const store = useIndicadoresStore()
const kpiConfig = computed(() => store.kpis.find(k => k.id === 'channels'))

const datos = computed(() => {
  const reports = store.reportesFiltrados
  const countsChannels: Record<string, number> = {
    'APP_MOVIL': 0, 'WEB': 0, 'WHATSAPP': 0, 'TELEFONO': 0,
    'CORREO': 0, 'PRESENCIAL': 0, 'BOTON_EMERGENCIA': 0
  }
  
  reports.forEach(r => {
    const src = r.source || 'WEB'
    if (countsChannels[src] !== undefined) countsChannels[src]++
  })

  const channelMapping: Record<string, string> = {
    'APP_MOVIL': 'App Móvil',
    'WEB': 'Portal Web',
    'WHATSAPP': 'WhatsApp',
    'TELEFONO': 'Teléfono',
    'CORREO': 'Correo',
    'PRESENCIAL': 'Presencial',
    'BOTON_EMERGENCIA': 'Botón S.O.S'
  }

  // Ordenar de mayor a menor
  const sorted = Object.entries(countsChannels)
    .sort((a, b) => b[1] - a[1])
    .filter((_, i) => i < 5) // Mostrar Top 5 para legibilidad

  return {
    labels: sorted.map(i => channelMapping[i[0]] || i[0]),
    data: sorted.map(i => i[1])
  }
})

const chartData = computed(() => ({
  labels: datos.value.labels,
  datasets: [{
    label: 'Reportes',
    data: datos.value.data,
    backgroundColor: ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'],
    borderRadius: 4,
    barPercentage: 0.7
  }]
}))

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 10
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: {
        color: 'rgba(160, 160, 160, 0.1)',
        drawBorder: false,
      },
      ticks: { precision: 0, color: '#8a82a0' }
    },
    y: {
      grid: { display: false },
      ticks: { color: '#8a82a0', font: { weight: 'bold' as const } }
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
      <Bar :data="chartData" :options="chartOptions" />
    </div>

    <template #tooltip>
      <div class="tooltip-body">
        <p><strong>Qué mide:</strong> Volumen de reportes agrupados por el canal de recepción original (Top 5).</p>
        <p><strong>Cómo se calcula:</strong> Suma absoluta por el campo "origen" del reporte ciudadano.</p>
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
