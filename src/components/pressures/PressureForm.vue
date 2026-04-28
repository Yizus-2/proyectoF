<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PressureCreatePayload } from '@/types/pressure'
import HydrantSelector from '@/components/pressures/HydrantSelector.vue'
import { useApi } from '@/composables/useApi'

const emit = defineEmits<{
  (e: 'submit', payload: PressureCreatePayload): void
  (e: 'sync'): void
}>()

const { API_BASE } = useApi()

function nowLocalDT() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const form = ref({
  hydrant_id: null as number | null,
  value: '',
  user_name: '',
  measured_at: nowLocalDT()
})

const isComplete = computed(() => form.value.hydrant_id !== null && form.value.value !== '' && form.value.user_name.trim())

function submit() {
  if (!isComplete.value || form.value.hydrant_id === null) return
  
  const payload: PressureCreatePayload = {
    hydrant_id: form.value.hydrant_id,
    value: Number(form.value.value),
    user_name: form.value.user_name.trim(),
    measured_at: new Date(form.value.measured_at).toISOString(),
    source: navigator.onLine ? 'WEB' : 'OFFLINE'
  }
  
  emit('submit', payload)
  
  // reset
  form.value.hydrant_id = null
  form.value.value = ''
  form.value.user_name = ''
  form.value.measured_at = nowLocalDT()
}

function handleExport() {
  window.open(`${API_BASE}/pressures/export/xlsx`, '_blank')
}
</script>

<template>
  <div class="card">
    <h3>Registrar medición de presión</h3>
    
    <HydrantSelector v-model="form.hydrant_id" />
    
    <div class="grid2" style="grid-template-columns: 1fr 1fr; margin-top: 12px;">
      <div class="field"><label>Valor de presión *</label><input type="number" step="0.1" v-model="form.value" placeholder="Ej: 35"/></div>
      <div class="field"><label>Usuario *</label><input v-model="form.user_name" placeholder="Ej: Operario 1"/></div>
    </div>
    <div class="field" style="margin-top: 12px;"><label>Fecha y hora</label><input type="datetime-local" v-model="form.measured_at"/></div>
    
    <div class="action-bar">
      <button class="btn-primary" @click="submit" :disabled="!isComplete">Guardar</button>
      <button class="btn" @click="handleExport">Exportar</button>
      <button class="btn" @click="$emit('sync')">Sincronizar datos</button>
    </div>
  </div>
</template>
