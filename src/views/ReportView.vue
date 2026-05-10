<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useOfflineSync } from '@/composables/useOfflineSync'
import LeafletMap from '@/components/common/LeafletMap.vue'
import L from 'leaflet'
import type { Zone } from '@/types/report'

const auth = useAuthStore()
const { addToQueue } = useOfflineSync()
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
  zone_id: null as number | null,
  lat: null as number | null,
  lng: null as number | null,
  photoFile: null as File | null
})

const photoPreviewUrl = ref<string | null>(null)
const mapInstance = ref<any>(null)
const marker = ref<any>(null)
const locationObtained = ref(false)

function onPhotoSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  form.value.photoFile = input.files[0]
  photoPreviewUrl.value = URL.createObjectURL(input.files[0])
}

function handleMapReady(m: any) {
  mapInstance.value = m
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocation(pos.coords.latitude, pos.coords.longitude)
        m.setView([pos.coords.latitude, pos.coords.longitude], 15)
        locationObtained.value = true
      },
      () => console.warn('No se pudo obtener ubicación')
    )
  }
  m.on('click', (e: any) => {
    updateLocation(e.latlng.lat, e.latlng.lng)
    locationObtained.value = true
  })
}

function useMyLocation() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition((pos) => {
    updateLocation(pos.coords.latitude, pos.coords.longitude)
    mapInstance.value?.setView([pos.coords.latitude, pos.coords.longitude], 16)
    locationObtained.value = true
  })
}

function updateLocation(lat: number, lng: number) {
  form.value.lat = lat
  form.value.lng = lng
  if (!mapInstance.value) return
  if (marker.value) marker.value.setLatLng([lat, lng])
  else marker.value = L.marker([lat, lng]).addTo(mapInstance.value)
}

const canProceedStep1 = computed(() => (locationObtained.value || form.value.address.length > 5) && !!form.value.zone_id)
const canProceedStep2 = computed(() => !!form.value.category && form.value.description.length > 3)

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
    if (form.value.photoFile && navigator.onLine) {
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
      zone_id: form.value.zone_id,
      lat: form.value.lat,
      lng: form.value.lng,
      photo_path: photoPath,
      source: navigator.onLine ? 'WEB' as const : 'OFFLINE' as const
    }
    if (!navigator.onLine) {
      await addToQueue({ type: 'REPORT', payload })
      successData.value = { tracking_code: 'Se asignará al sincronizar' }
    } else {
      const { data, error } = await supabase.from('reports').insert(payload).select('tracking_code').single()
      if (error) throw error
      successData.value = { tracking_code: data?.tracking_code || '—' }
    }
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
  form.value = { reporter_name: '', reporter_phone: '', reporter_email: '', category: 'fuga_agua', priority: 'BAJA', description: '', address: '', zone_id: null, lat: null, lng: null, photoFile: null }
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
        <h1>Reportar un Daño</h1>
        <p>Ayúdanos a mejorar la infraestructura de Santa Marta</p>
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
          <div class="field">
            <label for="addr">Dirección o referencia</label>
            <input id="addr" v-model="form.address" type="text" placeholder="Ej: Calle 12 #3-45, frente a la panadería" />
          </div>
          <div class="field">
            <label for="zone">Zona / Sector</label>
            <select id="zone" v-model="form.zone_id">
              <option :value="null">— Seleccionar zona —</option>
              <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.name }}</option>
            </select>
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
            <div class="field"><label for="name">Nombre</label><input id="name" v-model="form.reporter_name" placeholder="Tu nombre" /></div>
            <div class="field"><label for="phone">Teléfono</label><input id="phone" v-model="form.reporter_phone" type="tel" placeholder="300 123 4567" /></div>
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
.rv { display:flex; justify-content:center; padding:24px 16px; min-height:calc(100vh - 70px); color:var(--text); }
.rv__container { width:100%; max-width:680px; }
.rv__header { text-align:center; margin-bottom:24px; }
.rv__header h1 { font-size:clamp(1.6rem,4vw,2.2rem); font-weight:800; margin:0 0 6px; color:var(--primary); }
.rv__header p { color:var(--muted); margin:0; font-size:1rem; }

/* Progress */
.progress-bar { height:6px; background:var(--bg-subtle); border-radius:99px; margin-bottom:8px; overflow:hidden; }
.progress-bar__fill { height:100%; background:linear-gradient(90deg,var(--primary),var(--accent)); border-radius:99px; transition:width .4s ease; }
.step-labels { display:flex; justify-content:space-between; font-size:.8rem; color:var(--muted); margin-bottom:20px; }
.step-labels .active { color:var(--primary); font-weight:700; }

/* Form */
.rv__form { background:var(--card); border-radius:20px; padding:28px; border:1px solid var(--stroke); box-shadow:0 8px 24px rgba(0,0,0,.04); }
.form-step { display:flex; flex-direction:column; gap:20px; }
.step-title { font-size:1.2rem; font-weight:700; margin:0; }
.step-title small { font-weight:400; color:var(--muted); font-size:.85rem; }
.sub-title { font-size:1rem; font-weight:600; margin:0; }
.step-desc { color:var(--muted); font-size:.9rem; margin:-8px 0 0; }

/* Map */
.map-wrap { position:relative; border-radius:14px; overflow:hidden; border:1px solid var(--stroke); }
.map-host { height:320px; width:100%; }
.locate-btn { position:absolute; top:12px; right:12px; z-index:1000; width:40px; height:40px; border-radius:10px; border:none; background:var(--card); box-shadow:0 2px 8px rgba(0,0,0,.15); cursor:pointer; display:grid; place-items:center; color:var(--primary); transition:transform .2s; }
.locate-btn:hover { transform:scale(1.1); }
.map-hint { position:absolute; bottom:12px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.7); color:#fff; padding:6px 14px; border-radius:20px; font-size:.8rem; font-weight:600; z-index:1000; pointer-events:none; white-space:nowrap; }

/* Categories */
.cat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.cat-card { display:flex; flex-direction:column; align-items:center; gap:6px; padding:16px 8px; border-radius:14px; border:2px solid var(--stroke); background:var(--bg-subtle); cursor:pointer; transition:all .2s; }
.cat-card:hover { border-color:var(--primary); }
.cat-card.selected { border-color:var(--primary); background:color-mix(in srgb,var(--primary) 8%,var(--card)); box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 15%,transparent); }
.cat-icon { font-size:1.8rem; }
.cat-label { font-size:.78rem; font-weight:600; text-align:center; }

/* Urgency */
.urgency-row { display:flex; gap:10px; }
.urgency-btn { flex:1; display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; border:2px solid var(--stroke); background:var(--bg-subtle); cursor:pointer; text-align:left; transition:all .2s; }
.urgency-btn.selected { font-weight:700; }
.urgency-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
.urgency-btn strong { display:block; font-size:.85rem; }
.urgency-btn small { display:block; font-size:.72rem; color:var(--muted); }

/* Fields */
.field { display:flex; flex-direction:column; gap:6px; }
.field label { font-weight:600; font-size:.9rem; color:var(--text-secondary); }
.field input, .field textarea, .field select { padding:12px 14px; border-radius:10px; border:1px solid var(--stroke); background:var(--bg-subtle); color:var(--text); font-size:.95rem; font-family:inherit; transition:border .2s; }
.field input:focus, .field textarea:focus, .field select:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 15%,transparent); }
.fields-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

/* Photo */
.upload-area { display:flex; align-items:center; justify-content:center; min-height:100px; border:2px dashed var(--stroke); border-radius:12px; cursor:pointer; background:var(--bg-subtle); font-weight:600; color:var(--muted); transition:all .2s; overflow:hidden; }
.upload-area:hover { border-color:var(--primary); color:var(--primary); }
.preview-img { width:100%; height:160px; object-fit:cover; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }

/* Buttons */
.step-nav { display:flex; justify-content:space-between; align-items:center; padding-top:8px; }
.btn-main { padding:12px 24px; border-radius:12px; border:none; background:linear-gradient(135deg,var(--primary),var(--primary-light)); color:#fff; font-weight:700; font-size:.95rem; cursor:pointer; transition:all .2s; }
.btn-main:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.1); }
.btn-main:disabled { opacity:.5; cursor:not-allowed; }
.btn-ghost { padding:12px 20px; border-radius:12px; border:1px solid var(--stroke); background:transparent; color:var(--text); font-weight:600; cursor:pointer; transition:all .2s; }
.btn-ghost:hover { background:var(--bg-subtle); }
.btn-submit { padding:14px 32px; border-radius:14px; border:none; background:linear-gradient(135deg,var(--accent),var(--accent-light)); color:#fff; font-weight:700; font-size:1.05rem; cursor:pointer; width:100%; max-width:280px; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; }
.btn-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,0.15); }
.btn-submit:disabled { opacity:.6; cursor:not-allowed; }

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
  .map-host { height:400px; }
}
</style>
