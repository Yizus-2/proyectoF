<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LeakCreatePayload } from '@/types/leak'
import { useGeolocation } from '@/composables/useGeolocation'

const emit = defineEmits<{
  (e: 'submit', payload: LeakCreatePayload, photo: File | null): void
  (e: 'sync'): void
}>()

const form = ref({
  work_order: '',
  reporter_name: '',
  reporter_phone: '',
  address: '',
  sector: ''
})

const photoFile = ref<File | null>(null)
const { lat, lng, loading: gpsLoading, error: gpsError, capture: getGps } = useGeolocation()

const isComplete = computed(() => {
  return form.value.reporter_name.trim() && 
         form.value.address.trim() && 
         lat.value !== null && 
         lng.value !== null
})

function handlePhoto(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    photoFile.value = target.files[0]
  }
}

function submit() {
  if (!isComplete.value) return
  
  const payload: LeakCreatePayload = {
    work_order: form.value.work_order.trim() || null,
    reporter_name: form.value.reporter_name.trim(),
    reporter_phone: form.value.reporter_phone.trim() || null,
    address: form.value.address.trim(),
    sector: form.value.sector.trim() || null,
    lat: lat.value,
    lng: lng.value,
    status: 'REPORTADA',
    source: navigator.onLine ? 'WEB' : 'OFFLINE'
  }
  
  emit('submit', payload, photoFile.value)
  
  // Limpiar form
  form.value.work_order = ''
  form.value.reporter_name = ''
  form.value.reporter_phone = ''
  form.value.address = ''
  form.value.sector = ''
  photoFile.value = null
}
</script>

<template>
  <div class="card">
    <h3>Registrar fuga</h3>
    <div class="field"><label>OT</label><input v-model="form.work_order" placeholder="Ej: OT-12345"/></div>
    <div class="field"><label>Nombre de quien reporta *</label><input v-model="form.reporter_name" placeholder="Ej: Juan Pérez"/></div>
    <div class="field"><label>Teléfono</label><input v-model="form.reporter_phone" placeholder="Ej: 3001234567"/></div>
    <div class="field"><label>Dirección *</label><input v-model="form.address" placeholder="Ej: Calle 10 # 5-20"/></div>
    <div class="field"><label>Sector</label><input v-model="form.sector" placeholder="Ej: San Juan"/></div>
    <div class="grid2" style="grid-template-columns:1fr 1fr">
      <div class="field"><label>Latitud</label><input :value="lat" readonly placeholder="Calculado..."/></div>
      <div class="field"><label>Longitud</label><input :value="lng" readonly placeholder="Calculado..."/></div>
    </div>
    <div class="field"><label>Foto (opcional)</label><input type="file" accept="image/*" @change="handlePhoto"/></div>
    
    <div v-if="!lat || !lng" class="notice notice--warning" style="margin-top: 10px;">
      Es obligatorio capturar las coordenadas GPS para que el reporte aparezca en el Panel de Control.
    </div>
    <div v-if="gpsError" class="notice notice--error" style="margin-top: 10px;">{{ gpsError }}</div>

    <div class="action-bar">
      <button class="btn" @click="getGps" :disabled="gpsLoading">
        {{ gpsLoading ? 'Obteniendo GPS...' : 'Tomar coordenadas GPS' }}
      </button>
      <button class="btn-primary" @click="submit" :disabled="!isComplete">Guardar</button>
      <button class="btn" @click="$emit('sync')">Sincronizar datos</button>
    </div>
  </div>
</template>
