<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { api, getAssetUrl } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useReportsStore } from '@/stores/reports'
import type { Evidence, Report } from '@/types/report'

interface ReportWithEvidences extends Report {
  evidences: Evidence[]
}

const auth = useAuthStore()
const reportsStore = useReportsStore()

const loading = ref(false)
const errorMessage = ref('')
const pendingReports = ref<ReportWithEvidences[]>([])
const verificationComments = ref<Record<number, string>>({})
const isSubmitting = ref<Record<number, boolean>>({})

watch(
  () => reportsStore.reports,
  async (newReports) => {
    if (!newReports || newReports.length === 0) {
      pendingReports.value = []
      return
    }
    const supervisorReports = newReports.filter((r) => r.status === 'RESUELTO')

    loading.value = true
    try {
      const reportsWithEvidence = await Promise.all(
        supervisorReports.map(async (report) => {
          const existing = pendingReports.value.find((p) => p.id === report.id)
          if (existing && existing.status === report.status && existing.evidences.length > 0) {
            return existing
          }

          try {
            const evidenceData = await api.get<Evidence[]>(`/api/reports/${report.id}/evidences`)
            return {
              ...report,
              evidences: evidenceData.map((ev) => ({
                ...ev,
                evidence_url: getAssetUrl(ev.evidence_url) || ev.evidence_url
              }))
            }
          } catch (evErr) {
            console.warn('Error reading evidence for report', report.id, evErr)
            return { ...report, evidences: [] }
          }
        })
      )
      pendingReports.value = reportsWithEvidence
    } catch (err: any) {
      console.error('Error matching evidence:', err)
      errorMessage.value = err.message || 'Error al procesar evidencias.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true, deep: true }
)

async function verify(reportId: number, decision: 'APROBADO' | 'RECHAZADO' | 'REGLAMENTO_PENDIENTE') {
  const comment = (verificationComments.value[reportId] || '').trim()
  if (!comment) {
    alert('El comentario de verificación es obligatorio.')
    return
  }

  isSubmitting.value[reportId] = true
  try {
    await api.post(`/api/reports/${reportId}/verifications`, {
      decision,
      comments: comment
    })

    delete verificationComments.value[reportId]
    await reportsStore.fetchReports()
  } catch (err: any) {
    console.error('Error submitting verification:', err)
    alert('Error: ' + (err.message || 'No se pudo guardar la decisión.'))
  } finally {
    isSubmitting.value[reportId] = false
  }
}

onMounted(() => {
  if (auth.isSupervisor || auth.isAdmin) {
    reportsStore.fetchReports()
    reportsStore.subscribeToReports()
  }
})
</script>

<template>
  <div class="verificacion-panel">
    <header class="panel-header">
      <div class="panel-header-content">
        <h2 class="panel-title">Verificación de evidencias</h2>
        <p class="panel-subtitle">Revisa las fotos de campo antes de cerrar cada reporte.</p>
      </div>
      <button class="btn-reload" @click="reportsStore.fetchReports()" :disabled="loading">
        Actualizar
      </button>
    </header>

    <div v-if="!auth.isSupervisor && !auth.isAdmin" class="alert alert--danger">
      Acceso restringido a supervisores y administradores.
    </div>

    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando casos pendientes...</p>
    </div>

    <div v-else-if="errorMessage" class="alert alert--danger">
      {{ errorMessage }}
    </div>

    <div v-else-if="pendingReports.length === 0" class="empty-state">
      <h3>Sin pendientes</h3>
      <p>No hay evidencias esperando revisión.</p>
    </div>

    <div v-else class="verifications-grid">
      <article v-for="report in pendingReports" :key="report.id" class="verification-card">
        <!-- Tarjeta: Info de Reporte -->
        <div class="card-section report-meta">
          <div class="meta-row">
            <span class="tracking-code">{{ report.tracking_code || `#${report.id}` }}</span>
            <span class="badge" :class="report.priority.toLowerCase()">{{ report.priority }}</span>
          </div>
          <h4 class="report-address">{{ report.address }}</h4>
          <div class="details-row">
            <span><strong>Categoría:</strong> {{ report.category.replace('_', ' ') }}</span>
            <span><strong>Cuadrilla:</strong> {{ report.work_order || 'No asignada' }}</span>
          </div>
        </div>

        <!-- Tarjeta: Evidencia del Operario -->
        <div class="card-section evidence-meta" v-if="report.evidences && report.evidences.length > 0">
          <h5 class="section-title">Evidencias ({{ report.evidences.length }})</h5>
          <div class="evidence-gallery">
            <div v-for="(ev, index) in report.evidences" :key="ev.id" class="evidence-card">
              <div class="evidence-header">
                <span class="evidence-tag">{{ index === 0 ? 'Llegada' : (index === report.evidences.length - 1 ? 'Cierre' : 'Avance') }}</span>
                <span class="evidence-time">{{ ev.hours_spent }} h</span>
              </div>
              <div class="image-wrapper">
                <img :src="ev.evidence_url" alt="Foto de evidencia" class="evidence-img" />
              </div>
              <div class="evidence-details">
                <p class="desc">{{ ev.description }}</p>
                <p v-if="ev.materials" class="materials">
                  <strong>Materiales:</strong> {{ ev.materials }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="card-section evidence-meta no-evidence" v-else>
          <p>No hay evidencias registradas para este caso.</p>
        </div>

        <!-- Acciones del Supervisor -->
        <div class="card-section action-area">
          <div class="comment-group">
            <label :for="'comment-' + report.id" class="comment-label">Observación *</label>
            <textarea
              :id="'comment-' + report.id"
              v-model="verificationComments[report.id]"
              rows="2"
              placeholder="Nota de revisión..."
              required
            ></textarea>
          </div>

          <div class="action-buttons">
            <button
              class="btn-action reject"
              :disabled="isSubmitting[report.id]"
              @click="verify(report.id, 'RECHAZADO')"
            >
              Rechazar
            </button>
            <button
              class="btn-action resubmit"
              :disabled="isSubmitting[report.id]"
              @click="verify(report.id, 'REGLAMENTO_PENDIENTE')"
            >
              Pedir reenvío
            </button>
            <button
              class="btn-action approve"
              :disabled="isSubmitting[report.id]"
              @click="verify(report.id, 'APROBADO')"
            >
              Aprobar y cerrar
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.verificacion-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
}

.panel-subtitle {
  margin: 4px 0 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.btn-reload {
  background: var(--card);
  border: 1px solid var(--stroke);
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
  transition: background 0.2s;
}

.btn-reload:hover {
  background: var(--bg-subtle);
}

.verifications-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.verification-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.card-section {
  padding: 20px;
  border-bottom: 1px solid var(--stroke);
}

.card-section:last-child {
  border-bottom: none;
}

/* Report Meta */
.report-meta {
  background: var(--bg-subtle);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tracking-code {
  font-family: monospace;
  font-size: 0.9rem;
  background: var(--card);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--stroke);
  font-weight: 700;
}

.badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  text-transform: uppercase;
}

.badge.critica { background: #991b1b; color: white; }
.badge.alta { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.badge.media { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.badge.baja { background: rgba(16, 185, 129, 0.15); color: #10b981; }

.report-address {
  margin: 0 0 8px 0;
  font-size: 1.15rem;
  font-weight: 700;
}

.details-row {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: var(--muted);
}

/* Evidence Section */
.section-title {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.evidence-gallery {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.evidence-card {
  flex: 0 0 260px;
  background: var(--bg-body);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--stroke);
}

.evidence-tag {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
}

.evidence-time {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
}

.image-wrapper {
  width: 100%;
  height: 180px;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.evidence-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: zoom-in;
}

.evidence-details {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evidence-details p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

.evidence-details .materials {
  font-size: 0.8rem;
  color: var(--text);
  background: var(--bg-subtle);
  padding: 6px;
  border-radius: 6px;
}

.no-evidence {
  color: var(--warning);
  text-align: center;
  font-weight: 500;
}

/* Actions Section */
.comment-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.comment-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.comment-group textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--stroke);
  background: var(--bg-subtle);
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
  resize: vertical;
}

.comment-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-action {
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s, transform 0.1s;
}

.btn-action:hover {
  opacity: 0.9;
}

.btn-action:active {
  transform: scale(0.98);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action.approve {
  background: #10b981;
  color: white;
}

.btn-action.resubmit {
  background: #f59e0b;
  color: white;
}

.btn-action.reject {
  background: #ef4444;
  color: white;
}

/* Statuses */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--muted);
  background: var(--card);
  border-radius: 20px;
  border: 1px solid var(--stroke);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
  margin-bottom: 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
}

.alert--danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
</style>
