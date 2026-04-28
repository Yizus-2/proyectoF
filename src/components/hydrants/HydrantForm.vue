<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HydrantCreatePayload } from '@/types/hydrant'
import { useGeolocation } from '@/composables/useGeolocation'

const emit = defineEmits<{
  (e: 'submit', payload: HydrantCreatePayload): void
}>()

const form = ref({
  internal_code: '',
  common_name: '',
  address: '',
  sector: ''
})

const { lat, lng, loading: gpsLoading, error: gpsError, capture: getGps } = useGeolocation()

const isComplete = computed(() => form.value.internal_code.trim() && form.value.common_name.trim() && form.value.address.trim())

function submit() {
  if (!isComplete.value) return
  
  const payload: HydrantCreatePayload = {
    internal_code: form.value.internal_code.trim(),
    common_name: form.value.common_name.trim(),
    address: form.value.address.trim(),
    sector: form.value.sector.trim() || null,
    lat: lat.value,
    lng: lng.value
  }
  
  emit('submit', payload)
  
  form.value.internal_code = ''
  form.value.common_name = ''
  form.value.address = ''
  form.value.sector = ''
}
</script>

<template>
  <div class="card">
    <h3>Registrar hidrante</h3>
    <div class="field"><label>Código interno *</label><input v-model="form.internal_code" placeholder="Ej: H-100"/></div>
    <div class="field"><label>Nombre común *</label><input v-model="form.common_name" placeholder="Ej: Parque Central"/></div>
    <div class="field"><label>Dirección *</label><input v-model="form.address" placeholder="Ej: Cra 5 #..."/></div>
    <div class="field"><label>Sector</label><input v-model="form.sector" placeholder="Ej: Centro"/></div>
    <div class="grid2" style="grid-template-columns:1fr 1fr">
      <div class="field"><label>Lat</label><input :value="lat" readonly placeholder="Calculado..."/></div>
      <div class="field"><label>Lng</label><input :value="lng" readonly placeholder="Calculado..."/></div>
    </div>
    
    <div v-if="gpsError" class="notice notice--error" style="margin-top: 10px;">{{ gpsError }}</div>

    <div class="action-bar">
      <button class="btn" @click="getGps" :disabled="gpsLoading">
        {{ gpsLoading ? 'Obteniendo GPS...' : 'Tomar coordenadas GPS' }}
      </button>
      <button class="btn-primary" @click="submit" :disabled="!isComplete">Guardar</button>
    </div>
  </div>
</template>
