<script setup lang="ts">
// Leyenda contextual de escalas de riesgo
</script>

<template>
  <div class="risk-legend">
    <div class="legend-title">Escalas de Riesgo (SLA):</div>
    
    <div class="legend-item">
      <span class="dot critico"></span>
      <span class="label">Crítico (< 30m)</span>
    </div>
    
    <div class="legend-item">
      <span class="dot alto"></span>
      <span class="label">Alto (< 2h)</span>
    </div>
    
    <div class="legend-item">
      <span class="dot medio"></span>
      <span class="label">Medio (< 8h)</span>
    </div>
    
    <div class="legend-item">
      <span class="dot bajo"></span>
      <span class="label">Bajo (< 24h)</span>
    </div>
  </div>
</template>

<style scoped>
.risk-legend {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--card, #1e293b);
  border: 1px solid var(--stroke, #334155);
  border-radius: 8px;
  font-size: 0.85rem;
}
.legend-title {
  font-weight: 700;
  color: var(--text, #f8fafc);
  margin-right: 8px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
.dot.critico { background-color: #ef4444; }
.dot.alto { background-color: #f97316; }
.dot.medio { background-color: #eab308; }
.dot.bajo { background-color: #22c55e; }

.label {
  color: var(--muted, #94a3b8);
  font-weight: 500;
}
</style>
