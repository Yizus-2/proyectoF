<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useReporteForm } from '@/composables/useReporteForm'
import MapaSelector from '../ui/MapaSelector.vue'
import { MapPin, Navigation, Loader2 } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'

const { state, paso2Valido, siguientePaso, pasoAnterior, obtenerUbicacionGPS, actualizarPinMapa } = useReporteForm()

const isLoadingGPS = ref(false)
const isLoadingSearch = ref(false)
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
          z.name.toLowerCase().includes(barrioLower) || 
          barrioLower.includes(z.name.toLowerCase())
        )
        if (match) {
          state.value.paso2.zona = match.name
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

async function searchAddress() {
  if (!state.value.paso2.direccion) return
  
  isLoadingSearch.value = true
  gpsError.value = ''
  
  try {
    const direccionOriginal = state.value.paso2.direccion
    let query = encodeURIComponent(`${direccionOriginal}, Santa Marta, Colombia`)
    let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
    let data = await res.json()
    
    // Fallback 1: Quitar todo lo numérico (dirección exacta) y dejar el barrio/texto
    if (!data || data.length === 0) {
      const direccionLaxa = direccionOriginal.replace(/[0-9#a-zA-Z-]+\s?/g, (match) => match.includes('#') || /\d/.test(match) ? '' : match).trim()
      if (direccionLaxa && direccionLaxa.length > 3) {
        query = encodeURIComponent(`${direccionLaxa}, Santa Marta, Colombia`)
        res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
        data = await res.json()
      }
    }

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      actualizarPinMapa(lat, lng)
      await reverseGeocode(lat, lng)
    } else {
      gpsError.value = 'Dirección no encontrada. Intenta acercarte manualmente en el mapa.'
    }
  } catch (error) {
    console.error('Error buscando dirección:', error)
    gpsError.value = 'Error al buscar la dirección.'
  } finally {
    isLoadingSearch.value = false
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
        <div class="search-input-wrapper">
          <input 
            v-model="state.paso2.direccion"
            type="text"
            class="form-input"
            placeholder="Ej: Calle 123 # 45-67, Barrio Centro"
            @keyup.enter="searchAddress"
          />
          <button 
            class="btn-search-address" 
            @click="searchAddress"
            :disabled="isLoadingSearch || !state.paso2.direccion"
            title="Buscar en el mapa"
          >
            <Loader2 v-if="isLoadingSearch" class="spin" size="18" />
            <MapPin v-else size="18" />
          </button>
        </div>
      </div>

      <!-- Zona -->
      <div class="form-group flex-1">
        <label class="form-label">Zona <span class="required">*</span></label>
        <div class="select-wrapper">
          <select v-model="state.paso2.zona" class="form-select">
            <option disabled value="">[Seleccione zona ▼]</option>
            <option v-for="z in zonasDb" :key="z.id" :value="z.name">{{ z.name }}</option>
            <option v-if="zonasDb.length === 0" value="Centro">Centro</option>
            <option v-if="zonasDb.length === 0" value="Norte">Norte</option>
            <option v-if="zonasDb.length === 0" value="Sur">Sur</option>
            <option v-if="zonasDb.length === 0" value="Oriente">Oriente</option>
          </select>
        </div>
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

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 16px top 50%;
  background-size: 12px auto;
  padding-right: 40px;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}

.select-wrapper {
  position: relative;
}

.search-input-wrapper {
  display: flex;
  gap: 8px;
}

.btn-search-address {
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  padding: 0 16px;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-search-address:hover:not(:disabled) {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
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
