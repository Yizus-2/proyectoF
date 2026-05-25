<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'

defineProps<{
  titulo: string
  subtitulo: string
  tooltip: string
  unidad: string
  periodo: string
  filtroActivo: string
}>()
</script>

<template>
  <div class="kpi-card glass-card">
    <div class="kpi-header">
      <div class="kpi-title-row">
        <slot name="icon"></slot>
        <h3 class="kpi-title">{{ titulo }}</h3>
        
        <div class="tooltip-wrapper">
          <InformationCircleIcon class="info-icon" />
          <div class="tooltip-content">
            {{ tooltip }}
          </div>
        </div>
      </div>
      <p class="kpi-subtitle">{{ subtitulo }}</p>
    </div>

    <div class="kpi-body">
      <!-- Aquí se renderiza la gráfica, número o tabla -->
      <slot></slot>
    </div>

    <div class="kpi-footer">
      <span class="meta-item">📊 Unidad: {{ unidad }}</span>
      <span class="meta-item">🕒 Período: {{ periodo }}</span>
      <span class="meta-item">🔍 Filtro: {{ filtroActivo }}</span>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  background: var(--card, #1e293b);
  border: 1px solid var(--stroke, #334155);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
.kpi-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kpi-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.kpi-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text, #f8fafc);
  margin: 0;
  flex-grow: 1;
}
.kpi-subtitle {
  font-size: 0.9rem;
  color: var(--muted, #94a3b8);
  margin: 0;
}

/* Tooltip Educativo */
.tooltip-wrapper {
  position: relative;
  display: inline-block;
  cursor: help;
}
.info-icon {
  width: 20px;
  height: 20px;
  color: var(--muted, #94a3b8);
  transition: color 0.2s;
}
.tooltip-wrapper:hover .info-icon {
  color: var(--primary, #3b82f6);
}
.tooltip-content {
  visibility: hidden;
  opacity: 0;
  width: 260px;
  background-color: var(--card, #0f172a);
  color: var(--text, #f8fafc);
  text-align: left;
  border-radius: 8px;
  padding: 12px;
  position: absolute;
  z-index: 10;
  bottom: 125%;
  right: -10px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--stroke, #334155);
  font-size: 0.85rem;
  line-height: 1.4;
  transition: opacity 0.3s;
}
.tooltip-wrapper:hover .tooltip-content {
  visibility: visible;
  opacity: 1;
}
.tooltip-content::after {
  content: "";
  position: absolute;
  top: 100%;
  right: 15px;
  border-width: 6px;
  border-style: solid;
  border-color: var(--stroke, #334155) transparent transparent transparent;
}

.kpi-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 250px;
}

.kpi-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--stroke, #334155);
  font-size: 0.8rem;
  color: var(--muted, #94a3b8);
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
