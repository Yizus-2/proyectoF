<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useReporteForm } from '@/composables/useReporteForm'
import MapaSelector from '../ui/MapaSelector.vue'
import { MapPin, Navigation, Loader2 } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'

const { state, paso2Valido, siguientePaso, pasoAnterior, obtenerUbicacionGPS, actualizarPinMapa } = useReporteForm()

const isLoadingGPS = ref(false)
const gpsError = ref('')
const zonasDb = ref<any[]>([])

onMounted(async () => {
  const { data } = await supabase.from('zones').select('*')
  if (data) zonasDb.value = data
})

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
    const data = await res.json()
    if (data && data.address) {
      // Intentar extraer el barrio/zona
      const barrio = data.address.suburb || data.address.neighbourhood || data.address.city_district
      const via = data.address.road || ''
      const num = data.address.house_number || ''
      
      const sugerencia = `${via} ${num}`.trim()
      
      if (sugerencia && !state.value.paso2.direccion) {
        state.value.paso2.direccion = sugerencia
      }
      
      // Auto-seleccionar la zona si hay coincidencia (opcional, para ayudar al usuario "centro vs bastidas")
      if (barrio && zonasDb.value.length > 0 && !state.value.paso2.zona) {
        const barrioLower = barrio.toLowerCase()
        const match = zonasDb.value.find(z => 
          z.zone_name.toLowerCase().includes(barrioLower) || 
          barrioLower.includes(z.zone_name.toLowerCase())
        )
        if (match) {
          state.value.paso2.zona = match.zone_name
        }
      }
    }
  } catch (e) {
    console.error('Error en geocoding reverso', e)
  }
}

async function handleGetLocation() {
  isLoadingGPS.value = true
  gpsError.value = ''
  try {
    const pos = await obtenerUbicacionGPS()
    await reverseGeocode(pos.lat, pos.lng)
  } catch (error: any) {
    gpsError.value = error.message || 'Error al obtener ubicación'
  } finally {
    isLoadingGPS.value = false
  }
}

async function handleMapUpdate(lat: number, lng: number) {
  actualizarPinMapa(lat, lng)
  await reverseGeocode(lat, lng)
}
</script>

<template>
  <div class="step-container">
    <div class="step-header">
      <h2 class="step-title">Paso 2 de 3: ¿Dónde ocurrió?</h2>
      <p class="step-subtitle">Necesitamos saber el lugar exacto para enviar la cuadrilla.</p>
    </div>

    <!-- GPS Activo Opt-In -->
    <div class="gps-section">
      <button 
        class="btn-gps" 
        @click="handleGetLocation"
        :disabled="isLoadingGPS"
      >
        <Loader2 v-if="isLoadingGPS" class="spin" />
        <Navigation v-else />
        {{ isLoadingGPS ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual' }}
      </button>

      <div v-if="gpsError" class="gps-error">
        ⚠️ {{ gpsError }}
      </div>
      
      <div v-if="state.paso2.ubicacionConfirmada" class="gps-success">
        ✓ Ubicación detectada en el mapa. Puedes ajustar el pin si no es exacta.
      </div>
    </div>

    <div class="divider">
      <span>O ingresa los datos manualmente</span>
    </div>

    <div class="form-row">
      <!-- Dirección -->
      <div class="form-group flex-2">
        <label class="form-label">Dirección aproximada o Barrio <span class="required">*</span></label>
        <input 
          v-model="state.paso2.direccion"
          type="text"
          class="form-input"
          placeholder="Ej: Calle 123 # 45-67, Barrio Centro"
        />
      </div>

      <!-- Zona -->
      <div class="form-group flex-1">
        <label class="form-label">Zona <span class="required">*</span></label>
        <select v-model="state.paso2.zona" class="form-select">
          <option disabled value="">[Seleccione zona ▼]</option>
          <option v-for="z in zonasDb" :key="z.id" :value="z.zone_name">{{ z.zone_name }}</option>
          <option v-if="zonasDb.length === 0" value="Centro">Centro</option>
          <option v-if="zonasDb.length === 0" value="Norte">Norte</option>
          <option v-if="zonasDb.length === 0" value="Sur">Sur</option>
          <option v-if="zonasDb.length === 0" value="Oriente">Oriente</option>
        </select>
      </div>
    </div>

    <!-- Coordenadas Manuales (Visibles) -->
    <div class="coords-manual">
      <label class="form-label">Coordenadas GPS (Opcional)</label>
      <div class="coords-inputs">
        <input 
          type="number" 
          v-model="state.paso2.latitud" 
          placeholder="Latitud" 
          class="form-input text-sm" 
          step="any"
        />
        <input 
          type="number" 
          v-model="state.paso2.longitud" 
          placeholder="Longitud" 
          class="form-input text-sm" 
          step="any"
        />
      </div>
    </div>

    <!-- Mapa Selector -->
    <div class="map-card">
      <div class="map-header">
        <MapPin size="18" />
        Ver / Ajustar en mapa
      </div>
      <MapaSelector 
        :lat="state.paso2.latitud"
        :lng="state.paso2.longitud"
        @update:coords="handleMapUpdate"
      />
    </div>

    <!-- Acciones -->
    <div class="step-actions">
      <button class="btn-prev" @click="pasoAnterior">
        ← Anterior
      </button>
      <button 
        class="btn-next" 
        :disabled="!paso2Valido"
        @click="siguientePaso"
      >
        Siguiente →
      </button>
    </div>
  </div>
</template>

<style scoped>
.step-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step-header {
  border-bottom: 1px solid var(--stroke);
  padding-bottom: 16px;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  color: var(--text);
}

.step-subtitle {
  color: var(--muted);
  margin: 0;
}

.gps-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.btn-gps {
  background: var(--text);
  color: var(--card);
  border: none;
  border-radius: var(--radius-full);
  padding: 14px 24px;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  width: 100%;
  max-width: 400px;
  justify-content: center;
  transition: transform 0.2s;
}

.btn-gps:hover:not(:disabled) {
  transform: scale(1.02);
}

.btn-gps:disabled {
  opacity: 0.7;
  cursor: wait;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.gps-error {
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}

.gps-success {
  color: var(--emerald);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  background: color-mix(in srgb, var(--emerald) 10%, transparent);
  padding: 8px 16px;
  border-radius: var(--radius-md);
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--stroke);
}
.divider::before { margin-right: 16px; }
.divider::after { margin-left: 16px; }

.form-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.flex-1 { flex: 1; min-width: 150px; }
.flex-2 { flex: 2; min-width: 250px; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
}

.required {
  color: #ef4444;
}

.form-input, .form-select {
  width: 100%;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}

.coords-manual {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: color-mix(in srgb, var(--stroke) 30%, transparent);
  padding: 16px;
  border-radius: var(--radius-md);
}

.coords-inputs {
  display: flex;
  gap: 12px;
}

.text-sm {
  font-size: 0.9rem;
  padding: 10px;
}

.map-card {
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.map-header {
  background: var(--bg-subtle);
  padding: 12px 16px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--stroke);
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid var(--stroke);
}

.btn-prev {
  background: var(--bg-subtle);
  color: var(--text);
  border: 1px solid var(--stroke);
  padding: 14px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-prev:hover {
  background: var(--stroke);
}

.btn-next {
  background: var(--primary);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-next:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 40%, transparent);
}

.btn-next:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}
</style>
