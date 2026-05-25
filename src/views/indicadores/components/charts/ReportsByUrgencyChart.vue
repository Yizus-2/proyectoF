<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const store = useIndicadoresStore()
const { kpiData, filtros } = storeToRefs(store)

const dataSummary = computed(() => {
  const counts = { critico: 0, alto: 0, medio: 0, bajo: 0 }
  const datosFiltrados = kpiData.value || [] // Aquí asumiendo que kpiData es un array plano de mock
  
  // Agrupación mock
  counts.critico = datosFiltrados.filter((d: any) => d.priority === 'CRITICA').length || 12
  counts.alto = datosFiltrados.filter((d: any) => d.priority === 'ALTA').length || 24
  counts.medio = datosFiltrados.filter((d: any) => d.priority === 'MEDIA').length || 45
  counts.bajo = datosFiltrados.filter((d: any) => d.priority === 'BAJA').length || 31
  
  return counts
})
</script>

<template>
  <KpiCard
    titulo="¿Cuántos reportes hay por nivel de urgencia?"
    subtitulo="Distribución actual de reportes según criticidad"
    tooltip="Mide el volumen de reportes activos categorizados por prioridad. Permite al supervisor decidir dónde asignar las cuadrillas de emergencia."
    unidad="reportes activos"
    :periodo="filtros.periodo"
    :filtroActivo="filtros.tipoReporte"
  >
    <template #icon>
      <ExclamationTriangleIcon class="w-6 h-6 text-orange-500" />
    </template>
    
    <div class="urgency-bars">
      <div class="bar-row">
        <div class="bar-label">Crítico</div>
        <div class="bar-track">
          <div class="bar-fill bg-red-500" :style="{ width: `${(dataSummary.critico / 100) * 100}%` }"></div>
        </div>
        <div class="bar-value">{{ dataSummary.critico }}</div>
      </div>
      
      <div class="bar-row">
        <div class="bar-label">Alto</div>
        <div class="bar-track">
          <div class="bar-fill bg-orange-500" :style="{ width: `${(dataSummary.alto / 100) * 100}%` }"></div>
        </div>
        <div class="bar-value">{{ dataSummary.alto }}</div>
      </div>
      
      <div class="bar-row">
        <div class="bar-label">Medio</div>
        <div class="bar-track">
          <div class="bar-fill bg-yellow-500" :style="{ width: `${(dataSummary.medio / 100) * 100}%` }"></div>
        </div>
        <div class="bar-value">{{ dataSummary.medio }}</div>
      </div>
      
      <div class="bar-row">
        <div class="bar-label">Bajo</div>
        <div class="bar-track">
          <div class="bar-fill bg-green-500" :style="{ width: `${(dataSummary.bajo / 100) * 100}%` }"></div>
        </div>
        <div class="bar-value">{{ dataSummary.bajo }}</div>
      </div>
    </div>
  </KpiCard>
</template>

<style scoped>
.w-6 { width: 1.5rem; }
.h-6 { height: 1.5rem; }
.text-orange-500 { color: #f97316; }

.urgency-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bar-label {
  width: 60px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--muted, #94a3b8);
}
.bar-track {
  flex-grow: 1;
  height: 12px;
  background-color: var(--bg-subtle, #0f172a);
  border-radius: 6px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}
.bar-value {
  width: 30px;
  text-align: right;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text, #f8fafc);
}

.bg-red-500 { background-color: #ef4444; }
.bg-orange-500 { background-color: #f97316; }
.bg-yellow-500 { background-color: #eab308; }
.bg-green-500 { background-color: #22c55e; }
</style>
