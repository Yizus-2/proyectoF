<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useGeolocation } from '@/composables/useGeolocation'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  reportId: number
}>()

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'cancel'): void
}>()

const auth = useAuthStore()
const { lat, lng, error: geoError, loading: geoLoading, capture: captureGeo } = useGeolocation()

const description = ref('')
const materials = ref('')
const hoursSpent = ref(1.0)
const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref('')

onMounted(() => {
  captureGeo()
})

function onPhotoSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  photoFile.value = input.files[0]
  photoPreview.value = URL.createObjectURL(input.files[0])
}

function compressImage(file: File, maxWidth = 1000, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
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
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' }))
        }, 'image/jpeg', quality)
      }
    }
  })
}

async function submitEvidence() {
  if (!photoFile.value) {
    errorMessage.value = 'La fotografía de evidencia es obligatoria.'
    return
  }
  if (!description.value.trim()) {
    errorMessage.value = 'La descripción es obligatoria.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // 1. Compress & Upload photo
    const compressed = await compressImage(photoFile.value)
    const ext = compressed.name.split('.').pop() || 'jpg'
    const storagePath = `evidences/${props.reportId}-${Date.now()}.${ext}`
    
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(storagePath, compressed)

    if (uploadError) throw new Error(`Error subiendo imagen: ${uploadError.message}`)

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(storagePath)

    // 3. Insert Evidence Record
    const { error: dbError } = await supabase
      .from('evidences')
      .insert({
        report_id: props.reportId,
        evidence_url: publicUrl,
        description: description.value,
        materials: materials.value,
        hours_spent: hoursSpent.value,
        lat: lat.value || null,
        lng: lng.value || null,
        uploaded_by: auth.user?.id
      })

    if (dbError) throw dbError

    // 4. Update Report Status to VERIFICACION_SUPERVISOR
    const { error: reportError } = await supabase
      .from('reports')
      .update({
        status: 'VERIFICACION_SUPERVISOR',
        evidence_path: storagePath // Save storage path as well
      })
      .eq('id', props.reportId)

    if (reportError) throw reportError

    emit('success')
  } catch (err: any) {
    console.error('Submit evidence failed:', err)
    errorMessage.value = err.message || 'Ocurrió un error al enviar la evidencia.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="evidence-form-card">
    <h3 class="form-title">📸 Registrar Evidencia de Trabajo</h3>
    <p class="form-subtitle">Sube el respaldo del trabajo completado para validación del supervisor.</p>

    <div v-if="errorMessage" class="alert alert--danger">
      {{ errorMessage }}
    </div>

    <form @submit.prevent="submitEvidence" class="form-flow">
      <!-- Foto de evidencia -->
      <div class="form-group">
        <label class="form-label">Fotografía del trabajo realizado *</label>
        <div class="upload-zone" :class="{ 'has-preview': photoPreview }">
          <label v-if="!photoPreview" for="photo-input" class="upload-prompt">
            <span class="upload-icon">📷</span>
            <span class="upload-text">Presiona para tomar foto o seleccionar archivo</span>
          </label>
          <div v-else class="preview-container">
            <img :src="photoPreview" alt="Vista previa de evidencia" class="evidence-preview-image" />
            <label for="photo-input" class="btn-change-photo">Cambiar Foto</label>
          </div>
          <input
            id="photo-input"
            type="file"
            accept="image/*"
            capture="environment"
            class="sr-only"
            @change="onPhotoSelected"
          />
        </div>
      </div>

      <!-- Descripción -->
      <div class="form-group">
        <label for="desc" class="form-label">Detalle de Actividades Realizadas *</label>
        <textarea
          id="desc"
          v-model="description"
          rows="3"
          placeholder="Ej: Se reparó tubería de 2 pulgadas, sellado con soldadura PVC..."
          required
        ></textarea>
      </div>

      <!-- Materiales -->
      <div class="form-group">
        <label for="mats" class="form-label">Materiales e Insumos Utilizados</label>
        <input
          id="mats"
          v-model="materials"
          type="text"
          placeholder="Ej: 1 Unión de 2'', pegamento PVC, pala"
        />
      </div>

      <!-- Tiempo dedicado -->
      <div class="form-group">
        <label for="hours" class="form-label">Tiempo Dedicado (Horas)</label>
        <input
          id="hours"
          v-model.number="hoursSpent"
          type="number"
          min="0.5"
          step="0.5"
          required
        />
      </div>

      <!-- Geolocalización -->
      <div class="geo-status">
        <span class="geo-icon">📍</span>
        <div class="geo-details">
          <span v-if="geoLoading" class="geo-text loading">Obteniendo coordenadas GPS...</span>
          <span v-else-if="lat && lng" class="geo-text success">
            GPS capturado: {{ lat.toFixed(5) }}, {{ lng.toFixed(5) }}
          </span>
          <span v-else class="geo-text warning">
            {{ geoError || 'No se capturó GPS. Asegúrate de dar permisos.' }}
            <button type="button" class="btn-retry-gps" @click="captureGeo">Reintentar</button>
          </span>
        </div>
      </div>

      <!-- Acciones -->
      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="emit('cancel')" :disabled="isSubmitting">
          Cancelar
        </button>
        <button type="submit" class="btn-submit" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner-sm"></span>
          {{ isSubmitting ? 'Enviando Evidencia...' : 'Enviar a Supervisor' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.evidence-form-card {
  background: var(--card);
  border-radius: 16px;
  width: 100%;
}

.form-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: var(--text);
}

.form-subtitle {
  font-size: 0.9rem;
  color: var(--muted);
  margin: 0 0 20px 0;
}

.form-flow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.upload-zone {
  border: 2px dashed var(--stroke);
  border-radius: 12px;
  background: var(--bg-subtle);
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: border-color 0.2s;
  cursor: pointer;
}

.upload-zone:hover {
  border-color: var(--primary);
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  text-align: center;
  width: 100%;
  cursor: pointer;
}

.upload-icon {
  font-size: 2rem;
}

.upload-text {
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 500;
}

.preview-container {
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.evidence-preview-image {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 10px;
}

.btn-change-photo {
  margin-top: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
  background: transparent;
  border: none;
  cursor: pointer;
}

.form-group textarea,
.form-group input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--stroke);
  background: var(--bg-subtle);
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
}

.form-group textarea:focus,
.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.geo-status {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-subtle);
  border-radius: 10px;
  font-size: 0.85rem;
}

.geo-icon {
  font-size: 1.1rem;
}

.geo-details {
  display: flex;
  flex-direction: column;
}

.geo-text.success {
  color: #10b981;
  font-weight: 600;
}

.geo-text.warning {
  color: var(--warning);
}

.btn-retry-gps {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 600;
  text-decoration: underline;
  padding: 0;
  margin-left: 6px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn-cancel {
  background: transparent;
  border: none;
  color: var(--muted);
  font-weight: 600;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 8px;
}

.btn-cancel:hover {
  color: var(--text);
  background: var(--bg-subtle);
}

.btn-submit {
  background: var(--primary);
  color: white;
  border: none;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.alert {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.alert--danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
