<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const trackingCode = ref('')
const loading = ref(false)
const errorMsg = ref('')
const reportData = ref<any>(null)
const reportHistory = ref<any[]>([])

const resolvedDate = computed(() => {
  if (!reportData.value || !['RESUELTO', 'CERRADO', 'EVALUADO'].includes(reportData.value.status)) return null
  const ev = reportHistory.value.find(e => ['RESUELTO', 'CERRADO', 'EVALUADO'].includes(e.new_status))
  return ev ? ev.created_at : null
})

const photoUrl = computed(() => {
  if (!reportData.value?.photo_path) return null
  return supabase.storage.from('reports').getPublicUrl(reportData.value.photo_path).data.publicUrl
})

const evidenceUrl = computed(() => {
  if (!reportData.value?.evidence_path) return null
  return supabase.storage.from('reports').getPublicUrl(reportData.value.evidence_path).data.publicUrl
})

const manageForm = ref({
  status: '',
  evidenceFile: null as File | null,
  evidencePreview: null as string | null
})
const isUpdating = ref(false)

function onEvidenceSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  manageForm.value.evidenceFile = input.files[0]
  manageForm.value.evidencePreview = URL.createObjectURL(input.files[0])
}

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
      img.onerror = (e) => reject(e)
    }
    reader.onerror = (e) => reject(e)
  })
}

async function saveManagement() {
  if (!reportData.value) return
  isUpdating.value = true
  try {
    let evidencePath = undefined

    if (manageForm.value.evidenceFile) {
      const compressedFile = await compressImage(manageForm.value.evidenceFile)
      const ext = compressedFile.name.split('.').pop() || 'jpg'
      const filePath = `evidence/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('reports').upload(filePath, compressedFile)
      if (upErr) throw upErr
      evidencePath = filePath
    }

    const payload: any = { status: manageForm.value.status }
    if (evidencePath) payload.evidence_path = evidencePath

    const { error } = await supabase
      .from('reports')
      .update(payload)
      .eq('id', reportData.value.id)
      
    if (error) throw error
    
    alert('Reporte actualizado exitosamente')
    searchReport()
  } catch (e: any) {
    console.error('Error updating status:', e)
    alert('Error al guardar: ' + e.message)
  } finally {
    isUpdating.value = false
  }
}

async function searchReport() {
  if (!trackingCode.value) return
  
  loading.value = true
  errorMsg.value = ''
  reportData.value = null
  reportHistory.value = []

  try {
    const { data: report, error: reportErr } = await supabase
      .from('reports')
      .select('id, tracking_code, status, address, category, created_at, priority, photo_path, evidence_path, work_order')
      .eq('tracking_code', trackingCode.value.trim().toUpperCase())
      .single()

    if (reportErr || !report) {
      throw new Error('No se encontró ningún reporte con este código. Verifica que esté bien escrito (ej: REP-YYYYMMDD-0001).')
    }
    
    reportData.value = report
    manageForm.value.status = report.status
    manageForm.value.evidenceFile = null
    manageForm.value.evidencePreview = null

    const { data: history, error: historyErr } = await supabase
      .from('report_history')
      .select('new_status, created_at, notes')
      .eq('report_id', report.id)
      .order('created_at', { ascending: false })

    if (!historyErr && history) {
      reportHistory.value = history
    }

  } catch (e: any) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateStr))
}

function getStatusColor(status: string) {
  if (['CERRADO', 'EVALUADO', 'RESUELTO'].includes(status)) return 'var(--success)'
  if (['RECHAZADO'].includes(status)) return 'var(--danger)'
  if (['EN_PROGRESO', 'ASIGNADO'].includes(status)) return 'var(--warning)'
  return 'var(--primary)'
}
</script>

<template>
  <main class="track-layout">
    <div class="track-container">
      <header class="track-header">
        <h1>Consultar Reporte</h1>
        <p>Ingresa tu código de seguimiento para ver el estado actual de tu reporte.</p>
      </header>

      <form @submit.prevent="searchReport" class="search-box">
        <input 
          v-model="trackingCode" 
          type="text" 
          placeholder="Ej: REP-20260510-0002" 
          required 
          class="search-input"
        />
        <button type="submit" class="btn-main" :disabled="loading">
          <span v-if="loading" class="spinner-sm"></span>
          <span v-else>Buscar</span>
        </button>
      </form>

      <div v-if="errorMsg" class="alert-error">
        ⚠️ {{ errorMsg }}
      </div>

      <div v-if="reportData && !loading" class="result-card">
        <div class="result-header">
          <div class="result-title">
            <span class="category-badge">{{ reportData.category.replace('_', ' ') }}</span>
            <h2>{{ reportData.tracking_code }}</h2>
          </div>
          <div class="status-badge" :style="{ backgroundColor: getStatusColor(reportData.status) + '15', color: getStatusColor(reportData.status), borderColor: getStatusColor(reportData.status) }">
            {{ reportData.status }}
          </div>
        </div>

        <div class="result-body">
          <!-- Guía Ciudadana -->
          <div class="user-guide-box">
            <h4>📖 Guía Ciudadana PQR</h4>
            <p>Este código (<strong>{{ reportData.tracking_code }}</strong>) es tu <strong>PQR permanente</strong>. No caduca y sirve como comprobante legal de tu solicitud. Úsalo para dar seguimiento continuo hasta la resolución de tu caso.</p>
          </div>

          <p class="address"><strong>Ubicación:</strong> {{ reportData.address }}</p>
          <p class="date"><strong>Reportado el:</strong> {{ formatDate(reportData.created_at) }}</p>
          
          <div v-if="reportData.work_order" class="crew-box">
            <strong>👷 Cuadrilla Asignada:</strong> {{ reportData.work_order }}
          </div>

          <!-- Notificación Legal -->
          <div v-if="resolvedDate" class="legal-resolution-box">
            <h4>⚖️ Notificación de Resolución</h4>
            <p>De acuerdo con el marco legal vigente, este reporte se certifica como <strong>RESUELTO</strong> con fecha exacta: <strong>{{ formatDate(resolvedDate) }}</strong>.</p>
          </div>
          
          <div v-if="photoUrl" class="photo-container">
            <p><strong>Evidencia fotográfica:</strong></p>
            <img :src="photoUrl" alt="Foto del reporte" class="report-photo" />
          </div>

          <div v-if="evidenceUrl" class="photo-container evidence-container">
            <p><strong>Evidencia de resolución (Operador):</strong></p>
            <img :src="evidenceUrl" alt="Evidencia del operador" class="report-photo evidence-photo" />
          </div>

          <div class="actions" v-if="['CERRADO', 'EVALUADO'].includes(reportData.status)">
            <RouterLink :to="`/encuesta/${reportData.tracking_code}`" class="btn-ghost">
              ⭐ Evaluar servicio
            </RouterLink>
          </div>

          <div v-if="auth.isAdmin || (auth.isOperator && !['RESUELTO', 'RECHAZADO', 'CERRADO', 'EVALUADO'].includes(reportData.status))" class="quick-manage-box">
            <h3>🛠️ Gestión Rápida (Operador)</h3>
            <form @submit.prevent="saveManagement" class="manage-form">
              <div class="field">
                <label>Cambiar Estado</label>
                <select v-model="manageForm.status" required>
                  <option value="REPORTADO" disabled>REPORTADO (Nuevo)</option>
                  <option value="ASIGNADO">ASIGNADO (Enviado a cuadrilla)</option>
                  <option value="EN_PROGRESO">EN PROGRESO (Trabajando)</option>
                  <option value="RESUELTO">RESUELTO (Finalizado)</option>
                  <option v-if="auth.isAdmin" value="CERRADO">CERRADO (Archivado/Auditoria)</option>
                  <option value="RECHAZADO">RECHAZADO (Falso/Duplicado)</option>
                </select>
              </div>

              <div class="field" v-if="['EN_PROGRESO', 'RESUELTO', 'RECHAZADO'].includes(manageForm.status) && auth.isOperator">
                <label>Evidencia fotográfica</label>
                <label for="evidence-track" class="upload-area">
                  <span v-if="!manageForm.evidencePreview">📷 Subir foto de respaldo</span>
                  <img v-else :src="manageForm.evidencePreview" alt="preview" class="preview-img" />
                </label>
                <input id="evidence-track" type="file" accept="image/*" class="sr-only" @change="onEvidenceSelected" />
              </div>

              <button type="submit" class="btn-primary" :disabled="isUpdating">
                {{ isUpdating ? 'Guardando...' : 'Actualizar Estado' }}
              </button>
            </form>
          </div>
        </div>

        <div class="timeline" v-if="reportHistory.length > 0">
          <h3>Historial de actividad</h3>
          <div class="timeline-list">
            <div class="timeline-item" v-for="(event, i) in reportHistory" :key="i">
              <div class="timeline-dot" :style="{ backgroundColor: getStatusColor(event.new_status) }"></div>
              <div class="timeline-content">
                <div class="timeline-meta">
                  <strong>{{ event.new_status }}</strong>
                  <span class="timeline-date">{{ formatDate(event.created_at) }}</span>
                </div>
                <p v-if="event.notes" class="timeline-notes">{{ event.notes }}</p>
              </div>
            </div>
            <!-- El evento inicial -->
            <div class="timeline-item">
              <div class="timeline-dot" style="background-color: var(--stroke)"></div>
              <div class="timeline-content">
                <div class="timeline-meta">
                  <strong>REPORTADO</strong>
                  <span class="timeline-date">{{ formatDate(reportData.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.track-layout {
  display: flex;
  justify-content: center;
  padding: 40px 16px;
  min-height: calc(100vh - 70px);
  background: var(--bg);
}

.track-container {
  width: 100%;
  max-width: 600px;
}

.track-header {
  text-align: center;
  margin-bottom: 32px;
}

.track-header h1 {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 8px;
  color: var(--text);
}

.track-header p {
  color: var(--muted);
  font-size: 1.05rem;
  margin: 0;
}

.search-box {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input {
  flex-grow: 1;
  padding: 14px 20px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: var(--card);
  font-size: 1.1rem;
  color: var(--text);
  font-family: monospace;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}

.btn-main {
  padding: 0 28px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: white;
  font-weight: 700;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.btn-main:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.2);
}

.alert-error {
  padding: 16px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin-bottom: 24px;
  font-weight: 600;
}

.result-card {
  background: var(--card);
  border-radius: 20px;
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.result-header {
  padding: 24px;
  border-bottom: 1px solid var(--bg-subtle);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.result-title h2 {
  margin: 8px 0 0;
  font-size: 1.5rem;
  font-family: monospace;
}

.category-badge {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--muted);
}

.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 800;
  font-size: 0.85rem;
  border: 1px solid;
}

.result-body {
  padding: 24px;
}

.result-body p {
  margin: 0 0 12px;
  color: var(--text-secondary);
}

.result-body strong {
  color: var(--text);
}

.photo-container {
  margin-top: 16px;
  margin-bottom: 8px;
}

.report-photo {
  max-width: 100%;
  max-height: 300px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  object-fit: cover;
  margin-top: 8px;
  box-shadow: var(--shadow-sm);
}

.evidence-container {
  background: var(--bg-subtle);
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed var(--success);
}

.evidence-photo {
  border-color: var(--success);
}

.actions {
  margin-top: 20px;
}

.btn-ghost {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  color: var(--text);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  background: var(--bg-subtle);
}

.btn-ghost:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

.timeline {
  padding: 24px;
  background: var(--bg-subtle);
  border-top: 1px solid var(--stroke);
}

.timeline h3 {
  margin: 0 0 20px;
  font-size: 1.1rem;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.timeline-list::before {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 7px;
  width: 2px;
  background: var(--stroke);
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 1;
  margin-top: 4px;
  border: 3px solid var(--bg-subtle);
}

.timeline-content {
  flex-grow: 1;
}

.timeline-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.timeline-date {
  font-size: 0.8rem;
  color: var(--muted);
}

.timeline-notes {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: var(--card);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--stroke);
  margin-top: 6px;
}

.spinner-sm {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Quick manage box */
.quick-manage-box {
  margin-top: 24px;
  padding: 20px;
  background: color-mix(in srgb, var(--primary) 5%, transparent);
  border: 1px dashed var(--primary);
  border-radius: 12px;
}
.quick-manage-box h3 {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  color: var(--primary);
}
.manage-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-weight: 600; font-size: 0.9rem; }
.field select { padding: 10px; border-radius: 8px; border: 1px solid var(--stroke); background: var(--card); color: var(--text); }
.upload-area { display:flex; align-items:center; justify-content:center; min-height:80px; border:2px dashed var(--stroke); border-radius:12px; cursor:pointer; background:var(--bg-subtle); color:var(--muted); font-size: 0.9rem; font-weight: 600; overflow:hidden; transition: all 0.2s;}
.upload-area:hover { border-color:var(--primary); color:var(--primary); }
.preview-img { width:100%; height:120px; object-fit:cover; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
.btn-primary { padding: 12px; border-radius: 8px; border: none; background: var(--primary); color: white; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover:not(:disabled) { box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3); transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 600px) {
  .search-box { flex-direction: column; }
  .btn-main { padding: 14px; }
  .result-header { flex-direction: column; }
}

.user-guide-box {
  background: color-mix(in srgb, var(--primary) 5%, transparent);
  border-left: 4px solid var(--primary);
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
  margin-bottom: 24px;
}
.user-guide-box h4 {
  margin: 0 0 4px;
  color: var(--primary);
  font-size: 0.95rem;
}
.user-guide-box p {
  margin: 0 !important;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text);
}

.crew-box {
  background: var(--bg-subtle);
  padding: 10px 14px;
  border-radius: 8px;
  margin: 12px 0;
  display: inline-block;
  font-size: 0.9rem;
  border: 1px solid var(--stroke);
}

.legal-resolution-box {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  padding: 16px;
  border-radius: 12px;
  margin-top: 24px;
}
.legal-resolution-box h4 {
  color: #10b981;
  margin: 0 0 8px;
  font-size: 1rem;
}
.legal-resolution-box p {
  margin: 0 !important;
  font-size: 0.9rem;
  color: var(--text);
}
</style>
