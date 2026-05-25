<script setup lang="ts">
import { ref } from 'vue'
import { Info } from 'lucide-vue-next'
import { useIndicadoresStore } from '@/stores/indicadores'

const props = defineProps<{
  pregunta: string
  contexto: string
  icono?: string
  unidad: string
  color: string
  categoriaActual: string
}>()

const store = useIndicadoresStore()
const showTooltip = ref(false)

const getPeriodoText = () => {
  const p = store.filtros.periodo
  if (p === 'hoy') return 'Hoy'
  if (p === '7dias') return 'Últimos 7 días'
  if (p === '30dias') return 'Últimos 30 días'
  return 'Histórico'
}
</script>

<template>
  <div class="kpi-card-v2" :class="`border-t-${color}`">
    <!-- Header: Pregunta Operativa -->
    <header class="kpi-header">
      <div class="kpi-title-row">
        <!-- Puedes inyectar iconos dinámicamente si los pasas como componente o SVG. Usaremos slot o prop icono -->
        <h3 class="kpi-question">{{ pregunta }}</h3>
      </div>
      <p class="kpi-context">{{ contexto }}</p>
    </header>

    <!-- Slot Principal: Visualización / Número -->
    <div class="kpi-visualization">
      <slot></slot>
    </div>

    <!-- Footer: Contexto estricto -->
    <footer class="kpi-footer">
      <div class="kpi-meta">
        <span class="meta-tag">📊 {{ unidad }}</span>
        <span class="meta-tag">🕒 {{ getPeriodoText() }}</span>
        <span class="meta-tag highlight">📂 {{ categoriaActual }}</span>
      </div>

      <!-- Tooltip Educativo -->
      <div class="kpi-tooltip-container" @mouseenter="showTooltip = true" @mouseleave="showTooltip = false">
        <button class="tooltip-btn" aria-label="Información del indicador">
          <Info size="18" />
        </button>
        <div v-if="showTooltip" class="tooltip-content">
          <slot name="tooltip"></slot>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.kpi-card-v2 {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
  border-top-width: 4px;
}
.kpi-card-v2:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* Colores dinámicos para el border top */
.border-t-orange { border-top-color: #f59e0b; }
.border-t-emerald { border-top-color: #10b981; }
.border-t-purple { border-top-color: #8b5cf6; }
.border-t-sky { border-top-color: #0ea5e9; }
.border-t-blue { border-top-color: #3b82f6; }
.border-t-red { border-top-color: #ef4444; }

.kpi-header {
  border-bottom: 1px solid var(--stroke);
  padding-bottom: 12px;
}

.kpi-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.kpi-question {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.3;
}

.kpi-context {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.4;
}

.kpi-visualization {
  flex: 1;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kpi-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed var(--stroke);
  padding-top: 12px;
  margin-top: auto;
}

.kpi-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  background: var(--bg-subtle);
  padding: 4px 8px;
  border-radius: 6px;
}

.meta-tag.highlight {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
}
.dark .meta-tag.highlight {
  color: var(--primary-light);
}

.kpi-tooltip-container {
  position: relative;
}

.tooltip-btn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: help;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}
.tooltip-btn:hover {
  color: var(--primary);
}

.tooltip-content {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  width: 280px;
  background: var(--text);
  color: var(--card);
  padding: 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  pointer-events: none;
}
.tooltip-content::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 12px;
  border-width: 6px;
  border-style: solid;
  border-color: var(--text) transparent transparent transparent;
}
.dark .tooltip-content {
  background: #2a2244;
  color: #f0f0f8;
  border: 1px solid var(--stroke);
}
.dark .tooltip-content::after {
  border-color: #2a2244 transparent transparent transparent;
}
</style>
