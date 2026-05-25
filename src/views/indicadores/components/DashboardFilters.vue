<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useIndicadoresStore } from '@/stores/indicadores'
import type { PeriodoFiltro, TipoReporte, ZonaFiltro, NivelRiesgo } from '@/types/indicadores'

const store = useIndicadoresStore()
const { filtros } = storeToRefs(store)

const setFiltro = (key: keyof typeof filtros.value, val: string) => {
  store.actualizarFiltros({ [key]: val })
}
</script>

<template>
  <div class="dashboard-filters glass-card">
    <div class="filter-item">
      <label>📅 Período:</label>
      <select :value="filtros.periodo" @change="e => setFiltro('periodo', (e.target as HTMLSelectElement).value as PeriodoFiltro)">
        <option value="hoy">Hoy</option>
        <option value="7dias">Últimos 7 días</option>
        <option value="30dias">Este mes</option>
        <option value="personalizado">Personalizado</option>
      </select>
    </div>

    <div class="filter-item">
      <label>📂 Tipo de reporte:</label>
      <select :value="filtros.tipoReporte" @change="e => setFiltro('tipoReporte', (e.target as HTMLSelectElement).value as TipoReporte)">
        <option value="todos">Todos</option>
        <option value="fuga">Fugas</option>
        <option value="presion">Presión</option>
        <option value="hidrante">Hidrantes</option>
        <option value="infraestructura">Infraestructura</option>
      </select>
    </div>

    <div class="filter-item">
      <label>🌍 Zona:</label>
      <select :value="filtros.zona" @change="e => setFiltro('zona', (e.target as HTMLSelectElement).value as ZonaFiltro)">
        <option value="todas">Todas</option>
        <option value="norte">Zona Norte</option>
        <option value="centro">Zona Centro</option>
        <option value="sur">Zona Sur</option>
        <option value="oriente">Zona Oriente</option>
        <option value="occidente">Zona Occidente</option>
      </select>
    </div>

    <div class="filter-item">
      <label>⚡ Nivel de riesgo:</label>
      <select :value="filtros.nivelRiesgo" @change="e => setFiltro('nivelRiesgo', (e.target as HTMLSelectElement).value as NivelRiesgo)">
        <option value="todos">Todos</option>
        <option value="critico">Crítico</option>
        <option value="alto">Alto</option>
        <option value="medio">Medio</option>
        <option value="bajo">Bajo</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.dashboard-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 16px 24px;
  align-items: center;
  background: var(--card, #1e293b);
  border: 1px solid var(--stroke, #334155);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-item label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text, #f8fafc);
  white-space: nowrap;
}
.filter-item select {
  background: var(--bg-subtle, #0f172a);
  border: 1px solid var(--stroke, #334155);
  color: var(--text, #f8fafc);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}
.filter-item select:focus {
  border-color: var(--primary, #3b82f6);
}
</style>
