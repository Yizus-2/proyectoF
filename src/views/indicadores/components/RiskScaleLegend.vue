<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  contexto: string
  mostrarSla?: boolean
}>()

const niveles = [
  { nivel: 'Crítico', color: '#dc2626', maxTime: '< 30 minutos', accion: 'Cuadrilla inmediata' },
  { nivel: 'Alto', color: '#ea580c', maxTime: '< 2 horas', accion: 'Priorizar recurso' },
  { nivel: 'Medio', color: '#d97706', maxTime: '< 8 horas', accion: 'Programar visita' },
  { nivel: 'Bajo', color: '#059669', maxTime: '< 24 horas', accion: 'Mantenimiento planeado' }
]
</script>

<template>
  <div class="risk-scale-legend">
    <h4 class="legend-title">Escala de Urgencia ({{ contexto }})</h4>
    <div class="legend-grid">
      <div class="legend-header">Nivel</div>
      <div class="legend-header">Tiempo Máximo</div>
      <div class="legend-header">Acción Operativa</div>
      
      <template v-for="n in niveles" :key="n.nivel">
        <div class="legend-cell flex-center gap-2">
          <span class="color-dot" :style="{ backgroundColor: n.color }"></span>
          <span class="font-bold">{{ n.nivel }}</span>
        </div>
        <div class="legend-cell text-muted">{{ n.maxTime }}</div>
        <div class="legend-cell text-sm">{{ n.accion }}</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.risk-scale-legend {
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  padding: 16px;
  font-size: 0.85rem;
}

.legend-title {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.legend-grid {
  display: grid;
  grid-template-columns: minmax(100px, 1fr) minmax(100px, 1fr) minmax(150px, 2fr);
  gap: 8px 12px;
  align-items: center;
}

.legend-header {
  font-weight: 700;
  color: var(--muted);
  border-bottom: 1px solid var(--stroke);
  padding-bottom: 4px;
}

.legend-cell {
  padding: 4px 0;
  color: var(--text);
}

.flex-center {
  display: flex;
  align-items: center;
}

.gap-2 {
  gap: 8px;
}

.font-bold {
  font-weight: 700;
}

.text-muted {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.text-sm {
  font-size: 0.8rem;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
</style>
