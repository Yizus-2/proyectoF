<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import LeafletMap from '@/components/common/LeafletMap.vue'
import L from 'leaflet'
import type { Zone } from '@/types/report'

const auth = useAuthStore()
const zones = ref<Zone[]>([])

async function loadZones() {
  const { data } = await supabase.from('zones').select('*').order('name')
  if (data) zones.value = data
}
loadZones()

const step = ref(1)
const totalSteps = 3
const loading = ref(false)
const successData = ref<{ tracking_code: string } | null>(null)
const errorMessage = ref('')

const categories = [
  { value: 'fuga_agua', label: 'Fuga de Agua', icon: '💧' },
  { value: 'fuga_alcantarillado', label: 'Alcantarillado', icon: '🚰' },
  { value: 'tuberia_rota', label: 'Tubería Rota', icon: '🔧' },
  { value: 'dano_pavimento', label: 'Daño Vial', icon: '🛣️' },
  { value: 'dano_infraestructura', label: 'Infraestructura', icon: '🏗️' },
  { value: 'otro', label: 'Otro', icon: '📋' }
]

const urgencyLevels = [
  { value: 'BAJA', label: 'Normal', color: '#10b981', desc: 'No es urgente' },
  { value: 'ALTA', label: 'Urgente', color: '#f59e0b', desc: 'Requiere pronta atención' },
  { value: 'CRITICA', label: 'Crítico', color: '#ef4444', desc: 'Peligro inmediato' }
]

const form = ref({
  reporter_name: '',
  reporter_phone: '',
  reporter_email: '',
  category: 'fuga_agua',
  priority: 'BAJA',
  description: '',
  address: '',
  sector: '',
  zone_id: null as number | null,
  lat: null as number | null,
  lng: null as number | null,
  photoFile: null as File | null
})

const photoPreviewUrl = ref<string | null>(null)
const mapInstance = ref<any>(null)
const marker = ref<any>(null)
const locationObtained = ref(false)

const isSearchingMap = ref(false)

function onPhotoSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  form.value.photoFile = input.files[0]
  photoPreviewUrl.value = URL.createObjectURL(input.files[0])
}

const SANTA_MARTA_CENTER = [11.2404, -74.1954]

function handleMapReady(m: any) {
  mapInstance.value = m
  
  // Por defecto, centrar en Santa Marta y no forzar el GPS (ya que en escritorio suele fallar catastróficamente)
  m.setView(SANTA_MARTA_CENTER, 13)

  m.on('click', (e: any) => {
    updateLocation(e.latlng.lat, e.latlng.lng)
    locationObtained.value = true
  })
}

function useMyLocation() {
  if (!navigator.geolocation) {
    alert('Geolocalización no soportada.')
    return
  }
  
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Si la precisión es muy mala (> 5000 metros), advertir
      if (pos.coords.accuracy > 5000) {
        alert('Tu señal GPS actual es muy débil o inexacta (común en PC de escritorio). Usa el buscador de dirección o mueve el pin manualmente.')
      }
      updateLocation(pos.coords.latitude, pos.coords.longitude)
      mapInstance.value?.setView([pos.coords.latitude, pos.coords.longitude], 17)
      locationObtained.value = true
    },
    (err) => {
      console.warn('No se pudo obtener ubicación con alta precisión', err)
      alert('Error al obtener GPS. Intenta usar el buscador manual.')
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

async function searchOnMap() {
  if (!form.value.address) return
  
  isSearchingMap.value = true
  try {
    const query = encodeURIComponent(`${form.value.address}, Santa Marta, Colombia`)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
    const data = await res.json()
    
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      updateLocation(lat, lng)
      mapInstance.value?.setView([lat, lng], 17)
      locationObtained.value = true
    } else {
      alert('No se encontró el lugar. Intenta ser más general (ej. solo el nombre del barrio).')
    }
  } catch (error) {
    console.error('Error searching:', error)
  } finally {
    isSearchingMap.value = false
  }
}

const ZONE_CENTERS = [
  { name: 'Centro Histórico', lat: 11.2444, lng: -74.2127 },
  { name: 'Rodadero', lat: 11.2031, lng: -74.2275 },
  { name: 'Mamatoco', lat: 11.2263, lng: -74.1798 },
  { name: 'Bastidas', lat: 11.2421, lng: -74.1843 },
  { name: 'Gaira', lat: 11.1965, lng: -74.2210 },
  { name: 'Taganga', lat: 11.2675, lng: -74.1912 },
  { name: 'Bonda', lat: 11.2285, lng: -74.1231 },
  { name: 'Zona Industrial', lat: 11.2181, lng: -74.1805 },
  { name: 'Pescaíto', lat: 11.2501, lng: -74.2122 },
  { name: 'Otros', lat: 11.2404, lng: -74.2110 }
]

const suggestedZoneName = ref<string>('')

function updateLocation(lat: number, lng: number) {
  form.value.lat = lat
  form.value.lng = lng
  if (!mapInstance.value) return
  if (marker.value) marker.value.setLatLng([lat, lng])
  else marker.value = L.marker([lat, lng]).addTo(mapInstance.value)
  
  // 1. Calcular zona más cercana por distancia geodésica simplificada
  let minDistance = Infinity
  let closestZoneName = 'Otros'
  
  ZONE_CENTERS.forEach(zc => {
    const dist = Math.sqrt(Math.pow(lat - zc.lat, 2) + Math.pow(lng - zc.lng, 2))
    if (dist < minDistance) {
      minDistance = dist
      closestZoneName = zc.name
    }
  })

  // Pre-seleccionar la zona más cercana
  const matchedZone = zones.value.find(z => z.name.toLowerCase().trim() === closestZoneName.toLowerCase().trim())
  if (matchedZone) {
    form.value.zone_id = matchedZone.id
    suggestedZoneName.value = matchedZone.name
  }

  // 2. Reverse Geocoding automático para complementar dirección y barrio
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.address) {
        if (!form.value.address) {
          form.value.address = data.display_name.split(',').slice(0, 2).join(',')
        }
        
        const suburb = (data.address.suburb || data.address.neighbourhood || data.address.city_district || '').toLowerCase().trim()
        if (suburb) {
          if (!form.value.sector) {
            form.value.sector = data.address.suburb || data.address.neighbourhood || data.address.city_district || ''
          }
          
          // Intentar match directo de texto para afinar la zona si OpenStreetMap da un barrio conocido
          const matchedByText = zones.value.find(z => 
            suburb.includes(z.name.toLowerCase().trim()) || 
            z.name.toLowerCase().trim().includes(suburb)
          )
          if (matchedByText) {
            form.value.zone_id = matchedByText.id
            suggestedZoneName.value = matchedByText.name
          }
        }
      }
    })
    .catch(err => console.warn('Reverse geocoding falló', err))
}

const canProceedStep1 = computed(() => (locationObtained.value || form.value.address.length > 5) && !!form.value.zone_id)
const canProceedStep2 = computed(() => !!form.value.category && form.value.description.length > 3 && !!form.value.photoFile)

function nextStep() { if (step.value < totalSteps) step.value++ }
function prevStep() { if (step.value > 1) step.value-- }

// Función nativa para comprimir imágenes antes de subir
function compressImage(file: File, maxWidth = 1280, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Redimensionar manteniendo la proporción si excede el ancho máximo
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(file)

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (!blob) return resolve(file)
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(newFile)
        }, 'image/jpeg', quality)
      }
      img.onerror = (e) => reject(e)
    }
    reader.onerror = (e) => reject(e)
  })
}

async function submitReport() {
  if (!form.value.category || (!locationObtained.value && !form.value.address) || !form.value.zone_id) {
    errorMessage.value = 'Por favor completa todos los campos obligatorios.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    let photoPath = null
    if (form.value.photoFile) {
      // Comprimimos la imagen antes de subirla
      const compressedFile = await compressImage(form.value.photoFile)
      
      const ext = compressedFile.name.split('.').pop() || 'jpg'
      const name = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const filePath = `${name}`
      const { error: upErr } = await supabase.storage.from('reports').upload(filePath, compressedFile)
      if (upErr) console.warn('Photo upload error:', upErr.message)
      else photoPath = filePath
    }
    const payload = {
      reporter_id: auth.user?.id || null,
      reporter_name: form.value.reporter_name || 'Ciudadano Anónimo',
      reporter_phone: form.value.reporter_phone || null,
      reporter_email: form.value.reporter_email || null,
      category: form.value.category,
      priority: form.value.priority,
      description: form.value.description || null,
      address: form.value.address || 'Ubicación seleccionada en mapa',
      sector: form.value.sector || null,
      zone_id: form.value.zone_id,
      lat: form.value.lat,
      lng: form.value.lng,
      photo_path: photoPath,
      source: 'WEB' as const
    }
    const { data, error } = await supabase.from('reports').insert(payload).select('id, tracking_code').single()
    if (error) throw error
    
    // Trigger automatic crew assignment
    try {
      await supabase.rpc('assign_crew_automatically', { p_report_id: data.id })
    } catch (assignErr) {
      console.warn('Automatic crew assignment failed on creation:', assignErr)
    }

    successData.value = { tracking_code: data?.tracking_code || '—' }
  } catch (error: any) {
    errorMessage.value = error.message || 'Error al enviar. Intenta de nuevo.'
    console.error('Submit error:', error)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  step.value = 1
  successData.value = null
  errorMessage.value = ''
  form.value = { reporter_name: '', reporter_phone: '', reporter_email: '', category: 'fuga_agua', priority: 'BAJA', description: '', address: '', sector: '', zone_id: null, lat: null, lng: null, photoFile: null }
  photoPreviewUrl.value = null
  locationObtained.value = false
  if (marker.value && mapInstance.value) { mapInstance.value.removeLayer(marker.value); marker.value = null }
}
</script>

<template>
  <main class="rv">
    <!-- Success screen -->
    <div v-if="successData" class="rv__success">
      <div class="success-card">
        <div class="success-icon">✓</div>
        <h2>¡Reporte Enviado!</h2>
        <p>Tu reporte fue recibido exitosamente.</p>
        <div class="tracking-box">
          <span class="tracking-label">Código de seguimiento</span>
          <span class="tracking-code">{{ successData.tracking_code }}</span>
        </div>
        <p class="tracking-hint">Guarda este código para consultar el estado de tu reporte.</p>
        <button class="btn-main" @click="resetForm">Enviar otro reporte</button>
      </div>
    </div>

    <!-- Form -->
    <div v-else class="rv__container">
      <header class="rv__header">
        <div class="header-icon">📢</div>
        <h1>Centro de Reportes Ciudadanos</h1>
        <p>Tu participación es vital para mantener la infraestructura de Santa Marta en óptimas condiciones.</p>
      </header>

      <!-- Progress -->
      <div class="progress-bar">
        <div class="progress-bar__fill" :style="{ width: `${(step / totalSteps) * 100}%` }"></div>
      </div>
      <div class="step-labels">
        <span :class="{ active: step >= 1 }">Ubicación</span>
        <span :class="{ active: step >= 2 }">Detalles</span>
        <span :class="{ active: step >= 3 }">Contacto</span>
      </div>

      <div v-if="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <form @submit.prevent="submitReport" @keydown.enter.prevent class="rv__form">
        <!-- STEP 1: Location -->
        <section v-show="step === 1" class="form-step">
          <h2 class="step-title">¿Dónde está el problema?</h2>
          <div class="map-wrap">
            <LeafletMap class="map-host" @ready="handleMapReady" />
            <button type="button" class="locate-btn" @click="useMyLocation" title="Usar mi ubicación">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
            </button>
            <div v-if="!locationObtained" class="map-hint">Toca el mapa o usa el botón de ubicación</div>
          </div>
          <div class="field search-field">
            <label for="addr">Buscar Dirección o Barrio</label>
            <div class="search-input-group">
              <input id="addr" v-model="form.address" type="text" placeholder="Ej: Calle 12 #3-45, Centro" @keyup.enter="searchOnMap" />
              <button type="button" class="btn-search" @click="searchOnMap" :disabled="isSearchingMap || !form.address">
                <span v-if="isSearchingMap">⏳</span>
                <span v-else>🔍 Buscar</span>
              </button>
            </div>
            <small class="hint">Escribe aquí y presiona Buscar para mover el mapa</small>
          </div>
          <div class="field" v-if="locationObtained">
            <label for="sector">Sector / Barrio</label>
            <input id="sector" v-model="form.sector" type="text" placeholder="Ej: Pescaito, El Rodadero, etc." />
          </div>
          <div class="field" v-if="form.lat && form.lng">
            <label>Coordenadas GPS (Alta Precisión)</label>
            <input type="text" :value="`${form.lat.toFixed(6)}, ${form.lng.toFixed(6)}`" readonly class="readonly-input" />
          </div>
          <div class="field">
            <label for="zone">Zona / Sector</label>
            <select id="zone" v-model="form.zone_id">
              <option :value="null">— Seleccionar zona —</option>
              <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.name }}</option>
            </select>
            <div v-if="suggestedZoneName" class="suggested-zone-badge">
              ✨ Zona sugerida por ubicación: <strong>{{ suggestedZoneName }}</strong>
            </div>
          </div>
          <div class="step-nav">
            <span></span>
            <button type="button" class="btn-main" :disabled="!canProceedStep1" @click="nextStep">Siguiente →</button>
          </div>
        </section>

        <!-- STEP 2: Details -->
        <section v-show="step === 2" class="form-step">
          <h2 class="step-title">¿Qué tipo de daño es?</h2>
          <div class="cat-grid">
            <button v-for="cat in categories" :key="cat.value" type="button" class="cat-card" :class="{ selected: form.category === cat.value }" @click="form.category = cat.value">
              <span class="cat-icon">{{ cat.icon }}</span>
              <span class="cat-label">{{ cat.label }}</span>
            </button>
          </div>

          <h3 class="sub-title">¿Qué tan urgente es?</h3>
          <div class="urgency-row">
            <button v-for="u in urgencyLevels" :key="u.value" type="button" class="urgency-btn" :class="{ selected: form.priority === u.value }" :style="form.priority === u.value ? { borderColor: u.color, background: u.color + '18' } : {}" @click="form.priority = u.value">
              <span class="urgency-dot" :style="{ background: u.color }"></span>
              <div>
                <strong>{{ u.label }}</strong>
                <small>{{ u.desc }}</small>
              </div>
            </button>
          </div>

          <div class="field">
            <label>Foto de evidencia</label>
            <label for="photo" class="upload-area">
              <span v-if="!photoPreviewUrl">📷 Tomar o elegir foto</span>
              <img v-else :src="photoPreviewUrl" alt="preview" class="preview-img" />
            </label>
            <input id="photo" type="file" accept="image/*" capture="environment" class="sr-only" @change="onPhotoSelected" />
          </div>

          <div class="field">
            <label for="desc">Descripción adicional</label>
            <textarea id="desc" v-model="form.description" placeholder="Detalles que ayuden al técnico..." rows="3"></textarea>
          </div>

          <div class="step-nav">
            <button type="button" class="btn-ghost" @click="prevStep">← Atrás</button>
            <button type="button" class="btn-main" :disabled="!canProceedStep2" @click="nextStep">Siguiente →</button>
          </div>
        </section>

        <!-- STEP 3: Contact -->
        <section v-show="step === 3" class="form-step">
          <h2 class="step-title">¿Cómo te contactamos? <small>(opcional)</small></h2>
          <p class="step-desc">Si deseas recibir actualizaciones sobre tu reporte, déjanos tus datos.</p>
          <div class="fields-row">
            <div class="field"><label for="name">Nombre (Solo texto)</label><input id="name" v-model="form.reporter_name" type="text" pattern="[A-Za-zñÑáéíóúÁÉÍÓÚ ]+" title="Solo se permiten letras" placeholder="Tu nombre" /></div>
            <div class="field"><label for="phone">Teléfono (Solo números)</label><input id="phone" v-model="form.reporter_phone" type="tel" pattern="[0-9]+" title="Solo se permiten números" placeholder="3001234567" /></div>
          </div>
          <div class="field" style="margin-top: 14px;">
            <label for="email">Correo electrónico</label>
            <input id="email" v-model="form.reporter_email" type="email" placeholder="Para recibir la encuesta de satisfacción" />
          </div>
          <div class="step-nav" style="margin-top: 20px;">
            <button type="button" class="btn-ghost" @click="prevStep">← Atrás</button>
            <button type="submit" class="btn-submit" :disabled="loading">
              <span v-if="loading" class="spinner"></span>
              <span v-else>Enviar Reporte</span>
            </button>
          </div>
        </section>
      </form>
    </div>
  </main>
</template>

<style scoped>
.rv { 
  display: flex; 
  justify-content: center; 
  padding: 40px 20px; 
  min-height: calc(100vh - 70px); 
  background: var(--page-bg);
  color: var(--text); 
}

.rv__container { 
  width: 100%; 
  max-width: 720px; 
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.rv__header { 
  text-align: center; 
  margin-bottom: 12px; 
}

.header-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.rv__header h1 { 
  font-size: clamp(1.8rem, 5vw, 2.5rem); 
  font-weight: 900; 
  margin: 0 0 8px; 
  color: var(--text); 
  letter-spacing: -0.03em;
}

.rv__header p { 
  color: var(--muted); 
  margin: 0; 
  font-size: 1.1rem; 
  max-width: 500px;
  margin: 0 auto;
}

/* Progress */
.progress-bar { 
  height: 8px; 
  background: color-mix(in srgb, var(--stroke) 50%, transparent); 
  border-radius: 99px; 
  margin-bottom: 12px; 
  overflow: hidden; 
}
.progress-bar__fill { 
  height: 100%; 
  background: linear-gradient(90deg, var(--primary), var(--accent)); 
  border-radius: 99px; 
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); 
}
.step-labels { 
  display: flex; 
  justify-content: space-between; 
  font-size: 0.85rem; 
  color: var(--muted); 
  margin-bottom: 24px; 
  font-weight: 600;
  padding: 0 10px;
}
.step-labels span {
  transition: color 0.3s;
}
.step-labels .active { 
  color: var(--primary); 
  font-weight: 800; 
}

/* Form */
.rv__form { 
  background: var(--card); 
  border-radius: 24px; 
  padding: 32px; 
  border: 1px solid var(--stroke); 
  box-shadow: 0 20px 40px rgba(0,0,0,0.08); 
  backdrop-filter: blur(20px);
}
.form-step { 
  display: flex; 
  flex-direction: column; 
  gap: 24px; 
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-title { 
  font-size: 1.4rem; 
  font-weight: 800; 
  margin: 0; 
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.step-title small { font-weight: 500; color: var(--muted); font-size: 0.9rem; }
.sub-title { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text); }
.step-desc { color: var(--muted); font-size: 0.95rem; margin: -12px 0 0; }

/* Map */
.map-wrap { position: relative; border-radius: 16px; overflow: hidden; border: 2px solid var(--stroke); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.map-host { height: 350px; width: 100%; z-index: 1; }
.locate-btn { position: absolute; top: 16px; right: 16px; z-index: 1000; width: 44px; height: 44px; border-radius: 12px; border: none; background: var(--card); box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer; display: grid; place-items: center; color: var(--primary); transition: all 0.2s; }
.locate-btn:hover { transform: scale(1.05); color: var(--accent); }
.map-hint { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); color: #fff; padding: 8px 16px; border-radius: 24px; font-size: 0.85rem; font-weight: 600; z-index: 1000; pointer-events: none; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }

/* Categories */
.cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.cat-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 10px; border-radius: 16px; border: 2px solid var(--stroke); background: var(--bg-subtle); cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: var(--text); }
.cat-card:hover { border-color: color-mix(in srgb, var(--primary) 50%, transparent); transform: translateY(-2px); background: var(--card); }
.cat-card.selected { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 20%, transparent); transform: scale(1.02); }
.cat-icon { font-size: 2.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
.cat-label { font-size: 0.85rem; font-weight: 700; text-align: center; line-height: 1.2; }

/* Urgency */
.urgency-row { display: flex; gap: 12px; }
.urgency-btn { flex: 1; display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 16px; border: 2px solid var(--stroke); background: var(--bg-subtle); cursor: pointer; text-align: left; transition: all 0.2s; color: var(--text); }
.urgency-btn:hover { border-color: var(--muted); }
.urgency-btn.selected { font-weight: 700; transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.urgency-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.urgency-btn strong { display: block; font-size: 0.9rem; margin-bottom: 2px; }
.urgency-btn small { display: block; font-size: 0.75rem; color: var(--muted); line-height: 1.3; }

/* Fields */
.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-weight: 700; font-size: 0.95rem; color: var(--text); }
.field input, .field textarea, .field select { padding: 14px 16px; border-radius: 12px; border: 1px solid var(--stroke); background: var(--bg-subtle); color: var(--text); font-size: 1rem; font-family: inherit; transition: all 0.2s; }
.field input:focus, .field textarea:focus, .field select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 15%, transparent); background: var(--card); }
.fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.readonly-input { background: color-mix(in srgb, var(--stroke) 20%, transparent) !important; color: var(--text) !important; font-family: monospace; font-weight: 700; cursor: default; border-style: dashed; }

.search-input-group { display: flex; gap: 8px; }
.search-input-group input { flex: 1; }
.btn-search { background: var(--bg-subtle); border: 2px solid var(--stroke); border-radius: 12px; padding: 0 16px; color: var(--text); font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
.btn-search:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn-search:disabled { opacity: 0.6; cursor: wait; }
.hint { font-size: 0.8rem; color: var(--muted); margin-top: -4px; }

/* Photo */
.upload-area { display: flex; align-items: center; justify-content: center; min-height: 120px; border: 2px dashed var(--stroke); border-radius: 16px; cursor: pointer; background: var(--bg-subtle); font-weight: 700; color: var(--text); transition: all 0.2s; overflow: hidden; position: relative; }
.upload-area:hover { border-color: var(--primary); color: var(--primary); background: color-mix(in srgb, var(--primary) 5%, transparent); }
.preview-img { width: 100%; height: 200px; object-fit: cover; border-radius: 12px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

/* Buttons */
.step-nav { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; margin-top: 8px; border-top: 1px solid var(--stroke); }
.btn-main { padding: 14px 28px; border-radius: 14px; border: none; background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff; font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent); }
.btn-main:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 40%, transparent); }
.btn-main:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); box-shadow: none; }
.btn-ghost { padding: 14px 24px; border-radius: 14px; border: 2px solid var(--stroke); background: transparent; color: var(--text); font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-ghost:hover { background: var(--bg-subtle); border-color: var(--muted); }
.btn-submit { padding: 16px 36px; border-radius: 16px; border: none; background: linear-gradient(135deg, var(--emerald), #059669); color: #fff; font-weight: 800; font-size: 1.1rem; cursor: pointer; width: 100%; max-width: 320px; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3); margin: 0 auto; }
.btn-submit:hover:not(:disabled) { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4); }
.btn-submit:disabled { opacity: 0.6; cursor: wait; transform: none; }

/* Success */
.rv__success { display:flex; align-items:center; justify-content:center; width:100%; }
.success-card { text-align:center; background:var(--card); border-radius:24px; padding:48px 36px; border:1px solid var(--stroke); box-shadow:0 12px 32px rgba(0,0,0,.06); max-width:440px; width:100%; }
.success-icon { width:72px; height:72px; border-radius:50%; background:rgba(16,185,129,.12); color:#10b981; font-size:2rem; display:grid; place-items:center; margin:0 auto 20px; }
.success-card h2 { font-size:1.6rem; margin:0 0 8px; }
.success-card p { color:var(--muted); margin:0 0 20px; }
.tracking-box { background:var(--bg-subtle); border:1px solid var(--stroke); border-radius:14px; padding:16px; margin-bottom:12px; }
.tracking-label { display:block; font-size:.75rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); font-weight:700; margin-bottom:6px; }
.tracking-code { font-size:1.4rem; font-weight:800; font-family:monospace; color:var(--primary); letter-spacing:.04em; }
.tracking-hint { font-size:.85rem; color:var(--muted); margin:0 0 24px; }

/* Alert */
.alert-error { padding:12px 16px; border-radius:10px; background:rgba(239,68,68,.1); color:#ef4444; border:1px solid rgba(239,68,68,.2); font-weight:600; font-size:.9rem; margin-bottom:12px; }

/* Spinner */
.spinner { width:20px; height:20px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* Responsive */
@media (max-width:600px) {
  .rv__form { padding:20px 16px; }
  .cat-grid { grid-template-columns:repeat(2,1fr); }
  .urgency-row { flex-direction:column; }
  .fields-row { grid-template-columns:1fr; }
  .map-host { height:260px; }
}
@media (min-width:900px) {
  .map-host { height: 400px; }
}

.suggested-zone-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  border: 1px dashed color-mix(in srgb, var(--primary) 30%, transparent);
  padding: 6px 12px;
  border-radius: 8px;
  margin-top: 6px;
  font-weight: 500;
  width: fit-content;
}
</style>
