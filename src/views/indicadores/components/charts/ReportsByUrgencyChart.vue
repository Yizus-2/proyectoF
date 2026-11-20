<script setup lang="ts">
import { computed } from 'vue'
import { useIndicadoresStore } from '@/stores/indicadores'
import KpiCard from '../KpiCard.vue'

const store = useIndicadoresStore()

const kpiConfig = computed(() => store.kpis.find(k => k.id === 'urgencia'))

const datos = computed(() => {
  const reports = store.reportesFiltrados
  const counts: Record<string, number> = { critica: 0, alta: 0, media: 0, baja: 0 }
  
  reports.forEach(r => {
    // Solo contar reportes activos
    if (!['completado', 'rechazado', 'cerrado', 'resuelto', 'evaluado'].includes(r.status.toLowerCase())) {
      const p = r.priority?.toLowerCase() || 'media'
      if (counts[p] !== undefined) counts[p]++
    }
  })

  return [
    { nivel: 'Crítico', cantidad: counts.critica, color: '#dc2626', tiempoMaximo: '< 30 minutos', accionRequerida: 'Cuadrilla inmediata' },
    { nivel: 'Alto', cantidad: counts.alta, color: '#ea580c', tiempoMaximo: '< 2 horas', accionRequerida: 'Priorizar recurso' },
    { nivel: 'Medio', cantidad: counts.media, color: '#d97706', tiempoMaximo: '< 8 horas', accionRequerida: 'Programar visita' },
    { nivel: 'Bajo', cantidad: counts.baja, color: '#059669', tiempoMaximo: '< 24 horas', accionRequerida: 'Mantenimiento planeado' }
  ]
})

const totalActivos = computed(() => datos.value.reduce((sum, d) => sum + d.cantidad, 0))
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
    <div class="urgency-container">
      <div v-for="item in datos" :key="item.nivel" class="urgency-row">
        <div class="urgency-header">
          <div class="urgency-label">
            <span class="color-dot" :style="{ backgroundColor: item.color }"></span>
            <span class="nivel-text">{{ item.nivel.toUpperCase() }}</span>
          </div>
          <span class="cantidad-text" :style="{ color: item.color }">{{ item.cantidad }}</span>
        </div>
        
        <div class="urgency-meta">
          <span>Tiempo máximo: <strong>{{ item.tiempoMaximo }}</strong></span> • 
          <span>Acción: <strong>{{ item.accionRequerida }}</strong></span>
        </div>
        
        <div class="progress-bg">
          <div 
            class="progress-fill"
            :style="{ 
              width: totalActivos > 0 ? `${(item.cantidad / totalActivos) * 100}%` : '0%', 
              backgroundColor: item.color 
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <template #tooltip>
      <div class="tooltip-body">
        <p><strong>Qué mide:</strong> Cantidad de reportes activos según su nivel de riesgo.</p>
        <p><strong>Cómo se calcula:</strong> Suma de reportes con estado diferente a completado o cerrado.</p>
        <p><strong>Decisión operativa:</strong> {{ kpiConfig.accionSugerida.malo }}</p>
      </div>
    </template>
  </KpiCard>
</template>

<style scoped>
.urgency-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.urgency-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.urgency-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.urgency-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nivel-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.cantidad-text {
  font-size: 1.2rem;
  font-weight: 800;
}

.urgency-meta {
  font-size: 0.75rem;
  color: var(--muted);
}

.urgency-meta strong {
  color: var(--text);
}

.progress-bg {
  width: 100%;
  height: 8px;
  background-color: var(--bg-subtle);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 4px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tooltip-body p {
  margin: 0;
}
</style>
