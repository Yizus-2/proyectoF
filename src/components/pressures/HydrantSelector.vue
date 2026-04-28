<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import type { Hydrant } from '@/types/hydrant'

defineProps<{
  modelValue: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: number | null): void
}>()

const { get } = useApi()
const q = ref('')
const hydrants = ref<Hydrant[]>([])

async function search() {
  const params = new URLSearchParams()
  if (q.value.trim()) params.set('q', q.value.trim())
  
  const res = await get<Hydrant[]>('/hydrants?' + params.toString())
  if (res) hydrants.value = res
}

onMounted(() => search())
</script>

<template>
  <div class="field">
    <label>Buscar hidrante</label>
    <div class="hydrant-search-row">
      <input v-model="q" placeholder="Ej: H-100 o Parque" @keyup.enter="search" />
      <button class="btn" @click="search">Buscar</button>
    </div>
  </div>
  <div class="field" style="margin-top: 12px;">
    <label>Hidrante seleccionado *</label>
    <select :value="modelValue || ''" @change="e => emit('update:modelValue', Number((e.target as HTMLSelectElement).value) || null)">
      <option value="" disabled>Seleccione un hidrante</option>
      <option v-for="h in hydrants" :key="h.id" :value="h.id">
        {{ h.internal_code }} — {{ h.common_name }} {{ h.sector ? '— ' + h.sector : '' }}
      </option>
      <option v-if="hydrants.length === 0" value="" disabled>No hay hidrantes registrados</option>
    </select>
  </div>
</template>

<style scoped>
.hydrant-search-row {
  display: flex;
  gap: 10px;
}

@media (max-width: 480px) {
  .hydrant-search-row {
    flex-direction: column;
  }
  .hydrant-search-row .btn {
    width: 100%;
  }
}
</style>
