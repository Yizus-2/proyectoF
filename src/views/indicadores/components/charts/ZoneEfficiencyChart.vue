<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { storeToRefs } from 'pinia'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'
import { MapPinIcon } from '@heroicons/vue/24/outline'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const store = useIndicadoresStore()
const { filtros } = storeToRefs(store)

const getThemeColor = (variable: string) => {
  if (typeof document === 'undefined') return '#ccc'
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#ccc'
}

const chartData = computed(() => {
  return {
    labels: ['Zona Norte', 'Zona Sur', 'Zona Centro', 'Zona Oriente', 'Zona Occidente'],
    datasets: [
      { 
        label: 'Total', 
        backgroundColor: getThemeColor('--stroke') || '#334155', 
        data: [45, 30, 20, 15, 10], 
        borderRadius: 4 
      },
      { 
        label: 'Activos', 
        backgroundColor: getThemeColor('--primary') || '#3b82f6', 
        data: [20, 15, 8, 5, 2], 
        borderRadius: 4 
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { 
      position: 'bottom' as const, 
      labels: { usePointStyle: true, padding: 20, color: getThemeColor('--text') || '#f8fafc' } 
    } 
  },
  scales: { 
    y: { grid: { display: false }, ticks: { color: getThemeColor('--muted') || '#94a3b8' } }, 
    x: { grid: { display: false }, ticks: { color: getThemeColor('--muted') || '#94a3b8' } } 
  }
}))
</script>

<template>
  <KpiCard
    titulo="¿Qué zonas tienen más carga de trabajo?"
    subtitulo="Distribución geográfica de reportes activos"
    tooltip="Muestra cuántos reportes totales y cuántos activos hay por cada zona operativa. Es clave para el balanceo de carga: si una zona tiene demasiados activos, el supervisor debe enviar cuadrillas de apoyo de otra zona."
    unidad="reportes"
    :periodo="filtros.periodo"
    :filtroActivo="filtros.tipoReporte"
  >
    <template #icon>
      <MapPinIcon class="w-6 h-6 text-indigo-500" />
    </template>
    
    <div class="chart-wrapper">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </KpiCard>
</template>

<style scoped>
.w-6 { width: 1.5rem; }
.h-6 { height: 1.5rem; }
.text-indigo-500 { color: #6366f1; }
.chart-wrapper {
  position: relative;
  height: 250px;
  width: 100%;
}
</style>
