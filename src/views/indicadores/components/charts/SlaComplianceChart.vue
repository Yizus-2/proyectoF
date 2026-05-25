<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { storeToRefs } from 'pinia'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'
import { ClockIcon } from '@heroicons/vue/24/outline'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const store = useIndicadoresStore()
const { filtros } = storeToRefs(store)

const getThemeColor = (variable: string) => {
  if (typeof document === 'undefined') return '#ccc'
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#ccc'
}

const chartData = computed(() => {
  return {
    labels: ['A Tiempo', 'Fuera de Tiempo / Riesgo'],
    datasets: [{
      backgroundColor: [
        getThemeColor('--success') || '#22c55e', 
        getThemeColor('--danger') || '#ef4444'
      ],
      data: [85, 15], // Mock values, would come from store
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
      position: 'bottom' as const, 
      labels: { usePointStyle: true, padding: 20, color: getThemeColor('--text') || '#f8fafc' } 
    } 
  }
}))
</script>

<template>
  <KpiCard
    titulo="¿Se atendieron los reportes a tiempo?"
    subtitulo="Porcentaje de reportes resueltos dentro del tiempo establecido"
    tooltip="Compara el tiempo de resolución real contra el SLA (Acuerdo de Nivel de Servicio) correspondiente a la escala de riesgo del reporte. Si la porción roja crece, es probable que falten recursos o repuestos."
    unidad="%"
    :periodo="filtros.periodo"
    :filtroActivo="filtros.tipoReporte"
  >
    <template #icon>
      <ClockIcon class="w-6 h-6 text-green-500" />
    </template>
    
    <div class="chart-wrapper">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
  </KpiCard>
</template>

<style scoped>
.w-6 { width: 1.5rem; }
.h-6 { height: 1.5rem; }
.text-green-500 { color: #22c55e; }
.chart-wrapper {
  position: relative;
  height: 250px;
  width: 100%;
}
</style>
