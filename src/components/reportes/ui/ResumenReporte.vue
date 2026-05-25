<script setup lang="ts">
import { useReporteForm } from '@/composables/useReporteForm'

const { state } = useReporteForm()

const mapTipo = {
  fuga: 'Fuga de agua',
  presion: 'Problemas de presión',
  hidrante: 'Daño en hidrante',
  infraestructura: 'Daño en infraestructura'
}

const mapUrgencia = {
  critica: '🔴 Crítico',
  alta: '🟠 Alto',
  media: '🟡 Medio',
  baja: '🟢 Bajo'
}
</script>

<template>
  <div class="resumen-card">
    <h3 class="resumen-title">📋 Resumen del Reporte</h3>
    
    <div class="resumen-grid">
      <div class="resumen-item">
        <span class="label">Tipo de problema:</span>
        <span class="value">{{ state.paso1.tipo ? mapTipo[state.paso1.tipo] : '—' }}</span>
      </div>
      
      <div class="resumen-item">
        <span class="label">Urgencia percibida:</span>
        <span class="value">{{ state.paso1.urgenciaUsuario ? mapUrgencia[state.paso1.urgenciaUsuario] : '—' }}</span>
      </div>

      <div class="resumen-item full-width">
        <span class="label">Descripción:</span>
        <p class="value text-desc">"{{ state.paso1.descripcion || '—' }}"</p>
      </div>
      
      <div class="resumen-item">
        <span class="label">Dirección:</span>
        <span class="value">{{ state.paso2.direccion || '—' }}</span>
      </div>

      <div class="resumen-item">
        <span class="label">Zona:</span>
        <span class="value">{{ state.paso2.zona || '—' }}</span>
      </div>

      <div class="resumen-item full-width">
        <span class="label">Ubicación GPS:</span>
        <div class="value gps-value" v-if="state.paso2.latitud && state.paso2.longitud">
          {{ state.paso2.latitud.toFixed(5) }}, {{ state.paso2.longitud.toFixed(5) }}
          <span class="badge success">Detectado ✓</span>
        </div>
        <div class="value gps-value text-muted" v-else>
          Sin coordenadas GPS precisas
          <span class="badge warning">Manual</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resumen-card {
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-top: 16px;
}

.resumen-title {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  border-bottom: 1px solid var(--stroke);
  padding-bottom: 8px;
}

.resumen-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.resumen-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.full-width {
  grid-column: span 2;
}

.label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text);
}

.text-desc {
  margin: 0;
  font-style: italic;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--card) 50%, transparent);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary);
}

.gps-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-muted {
  color: var(--muted);
}

.badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge.success {
  background: color-mix(in srgb, var(--emerald) 15%, transparent);
  color: var(--emerald);
  border: 1px solid color-mix(in srgb, var(--emerald) 30%, transparent);
}

.badge.warning {
  background: color-mix(in srgb, var(--orange) 15%, transparent);
  color: var(--orange);
  border: 1px solid color-mix(in srgb, var(--orange) 30%, transparent);
}
</style>
