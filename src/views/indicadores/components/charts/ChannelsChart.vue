<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { storeToRefs } from 'pinia'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'
import { DevicePhoneMobileIcon } from '@heroicons/vue/24/outline'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const store = useIndicadoresStore()
const { filtros } = storeToRefs(store)

const getThemeColor = (variable: string) => {
  if (typeof document === 'undefined') return '#ccc'
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#ccc'
}

const chartData = computed(() => {
  return {
    labels: ['App Móvil', 'Web', 'WhatsApp', 'Teléfono'],
    datasets: [{
      backgroundColor: [
        getThemeColor('--primary') || '#3b82f6', 
        getThemeColor('--accent') || '#8b5cf6',
        '#22c55e', // Verde whatsapp
        getThemeColor('--stroke') || '#334155'
      ],
      data: [45, 25, 20, 10], // Mock values
      borderWidth: 0,
      hoverOffset: 15
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { 
      position: 'right' as const, 
      labels: { usePointStyle: true, padding: 15, color: getThemeColor('--text') || '#f8fafc' } 
    } 
  }
}))
</script>

<template>
  <KpiCard
    titulo="¿Por dónde nos están reportando?"
    subtitulo="Distribución de reportes por canal de recepción"
    tooltip="Identifica las vías más utilizadas por los ciudadanos o personal para ingresar reportes. Ayuda a focalizar campañas de adopción digital (ej. promover la App Móvil sobre la línea telefónica)."
    unidad="reportes"
    :periodo="filtros.periodo"
    filtroActivo="Todos"
  >
    <template #icon>
      <DevicePhoneMobileIcon class="w-6 h-6 text-purple-500" />
    </template>
    
    <div class="chart-wrapper">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
  </KpiCard>
</template>

<style scoped>
.w-6 { width: 1.5rem; }
.h-6 { height: 1.5rem; }
.text-purple-500 { color: #a855f7; }
.chart-wrapper {
  position: relative;
  height: 250px;
  width: 100%;
}
</style>
