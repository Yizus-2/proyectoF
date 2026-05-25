<script setup lang="ts">
import { computed } from 'vue'
import { useIndicadoresStore } from '@/stores/indicadores'
import { useReportsStore } from '@/stores/reports'
import KpiCard from '../KpiCard.vue'

const store = useIndicadoresStore()
const reportsStore = useReportsStore()

const kpiConfig = {
  pregunta: '¿Qué zonas tienen más carga?',
  contexto: 'Reportes activos distribuidos por zona geográfica',
  icono: 'MapPin',
  unidad: 'reportes',
  color: 'blue',
  accionSugerida: { malo: 'Reasignar cuadrillas de zonas verdes a rojas' }
}

const datos = computed(() => {
  const reports = store.reportesFiltrados
  const counts: Record<string, number> = {}
  
  reports.forEach(r => {
    if (!['completado', 'rechazado', 'cerrado', 'resuelto'].includes(r.status.toLowerCase())) {
      let zonaStr = r.zona || r.zone_id?.toString() || 'Sin Asignar'
      
      // Buscar en reportsStore.zonesData
      if (r.zone_id) {
        const found = reportsStore.zonesData.find(z => z.zone_id === r.zone_id || z.id === r.zone_id)
        if (found) zonaStr = found.zone_name || found.name || zonaStr
      }
      
      if (!counts[zonaStr]) counts[zonaStr] = 0
      counts[zonaStr]++
    }
  })

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(i => ({ zona: i[0], cantidad: i[1] }))

  const max = sorted[0]?.cantidad || 1

  return { sorted, max }
})
</script>

<template>
  <KpiCard
    :pregunta="kpiConfig.pregunta"
    :contexto="kpiConfig.contexto"
    :icono="kpiConfig.icono"
    :unidad="kpiConfig.unidad"
    :color="kpiConfig.color"
    :categoria-actual="store.contextoActual"
  >
    <div class="zones-container">
      <div v-for="item in datos.sorted" :key="item.zona" class="zone-row">
        <div class="zone-header">
          <span class="zone-name">{{ item.zona.toUpperCase() }}</span>
          <span class="zone-count">{{ item.cantidad }} activos</span>
        </div>
        <div class="progress-bg">
          <div 
            class="progress-fill"
            :style="{ width: `${(item.cantidad / datos.max) * 100}%` }"
          ></div>
        </div>
      </div>
      <div v-if="datos.sorted.length === 0" class="empty-state">
        No hay reportes activos en las zonas
      </div>
    </div>

    <template #tooltip>
      <div class="tooltip-body">
        <p><strong>Qué mide:</strong> Concentración de reportes sin resolver segmentado por la zona de operación.</p>
        <p><strong>Decisión operativa:</strong> {{ kpiConfig.accionSugerida.malo }}</p>
      </div>
    </template>
  </KpiCard>
</template>

<style scoped>
.zones-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 8px;
}

.zones-container::-webkit-scrollbar {
  width: 4px;
}
.zones-container::-webkit-scrollbar-thumb {
  background: var(--stroke);
  border-radius: 4px;
}

.zone-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.zone-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.zone-count {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
}

.progress-bg {
  width: 100%;
  height: 6px;
  background-color: var(--bg-subtle);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary);
  border-radius: 3px;
  transition: width 0.8s ease;
}

.empty-state {
  font-size: 0.85rem;
  color: var(--muted);
  text-align: center;
  padding: 16px 0;
}
.tooltip-body p { margin: 0; }
</style>
