<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale } from 'chart.js'
import { storeToRefs } from 'pinia'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'
import { ChartBarIcon } from '@heroicons/vue/24/outline'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

const store = useIndicadoresStore()
const { filtros } = storeToRefs(store)

const getThemeColor = (variable: string) => {
  if (typeof document === 'undefined') return '#ccc'
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#ccc'
}

const chartData = computed(() => {
  return {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [{
      label: 'Reportes Recibidos',
      backgroundColor: getThemeColor('--primary') || '#3b82f6',
      borderColor: getThemeColor('--primary') || '#3b82f6',
      data: [12, 19, 15, 25, 22, 10, 8], // Mock values
      tension: 0.4
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { 
      display: false
    } 
  },
  scales: { 
    y: { grid: { display: false }, ticks: { color: getThemeColor('--muted') || '#94a3b8' }, beginAtZero: true }, 
    x: { grid: { display: false }, ticks: { color: getThemeColor('--muted') || '#94a3b8' } } 
  }
}))
</script>

<template>
  <KpiCard
    titulo="¿Cómo ha variado el volumen de reportes?"
    subtitulo="Evolución diaria de reportes ingresados"
    tooltip="Muestra la tendencia de los reportes creados en el tiempo seleccionado. Sirve para identificar picos de demanda y preparar a las cuadrillas ante eventualidades (ej. temporada de lluvias)."
    unidad="reportes/día"
    :periodo="filtros.periodo"
    :filtroActivo="filtros.tipoReporte"
  >
    <template #icon>
      <ChartBarIcon class="w-6 h-6 text-blue-500" />
    </template>
    
    <div class="chart-wrapper">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </KpiCard>
</template>

<style scoped>
.w-6 { width: 1.5rem; }
.h-6 { height: 1.5rem; }
.text-blue-500 { color: #3b82f6; }
.chart-wrapper {
  position: relative;
  height: 250px;
  width: 100%;
}
</style>
