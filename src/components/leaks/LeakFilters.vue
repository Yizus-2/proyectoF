<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'filter-change', filters: { status: string, sector: string, q: string }): void
  (e: 'export'): void
}>()

const status = ref<string>('')
const sector = ref('')
const q = ref('')

function apply() {
  emit('filter-change', {
    status: status.value,
    sector: sector.value.trim(),
    q: q.value.trim()
  })
}
</script>

<template>
  <div class="card">
    <h3>Fugas registradas</h3>
    <div class="filter-grid">
      <div class="field">
        <label>Estado</label>
        <select v-model="status">
          <option value="">Todos</option>
          <option value="REPORTADA">Reportada</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="ATENDIDA">Atendida</option>
          <option value="CERRADA">Cerrada</option>
        </select>
      </div>
      <div class="field">
        <label>Sector</label>
        <input v-model="sector" placeholder="Ej: San Juan" @keyup.enter="apply"/>
      </div>
      <div class="field">
        <label>Buscar</label>
        <input v-model="q" placeholder="OT, persona o dirección" @keyup.enter="apply"/>
      </div>
      <div class="field" style="align-self: end;">
        <div class="action-bar" style="margin-top: 0;">
          <button class="btn" @click="apply">Aplicar</button>
          <button class="btn" @click="$emit('export')">Exportar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 920px) {
  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 520px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
