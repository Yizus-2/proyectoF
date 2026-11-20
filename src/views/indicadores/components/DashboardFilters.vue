<script setup lang="ts">
import { computed } from 'vue'
import { useIndicadoresStore } from '@/stores/indicadores'
import { useReportsStore } from '@/stores/reports'

const store = useIndicadoresStore()
const reportsStore = useReportsStore()

const periodos = [
  { label: 'Hoy', value: 'hoy' },
  { label: 'Últimos 7 días', value: '7dias' },
  { label: 'Últimos 30 días', value: '30dias' },
  { label: 'Todo', value: 'todos' }
]

const categorias = [
  { label: 'Todas las categorías', value: 'todos' },
  { label: 'Fugas de agua', value: 'fuga_agua' },
  { label: 'Alcantarillado', value: 'fuga_alcantarillado' },
  { label: 'Tubería rota', value: 'tuberia_rota' },
  { label: 'Daño vial', value: 'dano_pavimento' },
  { label: 'Infraestructura', value: 'dano_infraestructura' },
  { label: 'Otros', value: 'otro' }
]

const zonas = computed(() => [
  { label: 'Todas las zonas', value: 'todas' as const },
  ...reportsStore.zones.map((z) => ({ label: z.name, value: z.id }))
])

const riesgos = [
  { label: 'Todas', value: 'todos' },
  { label: 'Crítico (< 30 min)', value: 'CRITICA' },
  { label: 'Alto (< 2 h)', value: 'ALTA' },
  { label: 'Medio (< 8 h)', value: 'MEDIA' },
  { label: 'Regular (< 24 h)', value: 'BAJA' }
]
</script>

<template>
  <div class="filters-glass-bar">
    <div class="filter-group focus-highlight">
      <label for="categoria">Categoría</label>
      <select id="categoria" v-model="store.filtros.categoria" class="primary-select">
        <option v-for="c in categorias" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>
    </div>
    
    <div class="filter-group">
      <label for="periodo">Período</label>
      <select id="periodo" v-model="store.filtros.periodo">
        <option v-for="p in periodos" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="zona">Zona</label>
      <select id="zona" v-model="store.filtros.zona">
        <option v-for="z in zonas" :key="z.value" :value="z.value">{{ z.label }}</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="riesgo">Urgencia</label>
      <select id="riesgo" v-model="store.filtros.nivelRiesgo">
        <option v-for="r in riesgos" :key="r.value" :value="r.value">{{ r.label }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.filters-glass-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  background: color-mix(in srgb, var(--card) 85%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 16px 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
  position: sticky;
  top: 16px;
  z-index: 50;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 220px;
  min-width: 220px;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.filter-group select {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--stroke);
  background: var(--bg-subtle);
  color: var(--text);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all var(--transition);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238a82a0%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

.filter-group select:hover {
  border-color: var(--primary);
}

.filter-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.focus-highlight select.primary-select {
  background-color: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary);
}
.dark .focus-highlight select.primary-select {
  background-color: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary-light);
}
</style>
