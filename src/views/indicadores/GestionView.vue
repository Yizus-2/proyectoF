<script setup lang="ts">
import { ref, onMounted, computed, watch, defineAsyncComponent } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useReportsStore } from '@/stores/reports'
import type { Report } from '@/types/report'
import LeafletMap from '@/components/common/LeafletMap.vue'
import L from 'leaflet'
import { useCuadrillaAssignment } from '@/composables/useCuadrillaAssignment'

const EvidenciaForm = defineAsyncComponent(() => import('@/views/operario/EvidenciaForm.vue'))

const reportsStore = useReportsStore()
const auth = useAuthStore()

const loading = computed(() => reportsStore.loading)
const errorMsg = computed(() => reportsStore.error || '')
const reports = computed(() => reportsStore.reports)

const filterStatus = ref('ACTIVOS')

const mapInstance = ref<any>(null)
const markerLayer = ref<any>(null)
const zones = ref<any[]>([])
const cuadrillas = ref<any[]>([])

const { assignCrewAutomatically, isAssigning } = useCuadrillaAssignment()

// Evidencia form control
const showEvidenceForm = ref(false)

async function loadZones() {
  const { data } = await supabase.from('zones').select('*')
  if (data) zones.value = data
}

async function loadCuadrillas() {
  const { data } = await supabase.from('crews').select('*')
  if (data) cuadrillas.value = data
}

// Modal state
const showModal = ref(false)
const selectedReport = ref<Report | null>(null)
const manageForm = ref({
  status: '',
  work_order: '',
  assigned_operator_id: ''
})
const isUpdating = ref(false)

const filteredReports = computed(() => {
  if (filterStatus.value === 'ACTIVOS') {
    return reports.value.filter(r => !['CERRADO', 'EVALUADO', 'RECHAZADO', 'RESUELTO'].includes(r.status))
  }
  if (filterStatus.value === 'CERRADOS') {
    return reports.value.filter(r => ['CERRADO', 'EVALUADO', 'RESUELTO'].includes(r.status))
  }
  return reports.value
})

function handleMapReady(map: any) {
  mapInstance.value = map
  markerLayer.value = L.layerGroup().addTo(map)
  renderMarkers()
}

function renderMarkers() {
  if (!mapInstance.value || !markerLayer.value) return
  markerLayer.value.clearLayers()
  
  filteredReports.value.forEach(report => {
    if (report.lat && report.lng) {
      const isClosed = ['CERRADO', 'EVALUADO', 'RECHAZADO', 'RESUELTO'].includes(report.status)
      const color = isClosed ? '#64748b' : (report.priority === 'CRITICA' ? '#991b1b' : '#ef5350')
      
      const marker = L.circleMarker([report.lat, report.lng], {
        radius: 8,
        color: color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2
      })
      marker.bindPopup(`
        <div style="font-family: inherit;">
          <div style="font-weight: 700; margin-bottom: 4px;">${report.tracking_code || `#${report.id}`}</div>
          <div style="font-size: 12px; margin-bottom: 2px;">${report.category.replace('_', ' ')}</div>
          <div style="font-size: 11px; color: #666;">${report.status}</div>
        </div>
      `)
      marker.addTo(markerLayer.value)
    }
  })
}

// Watch filteredReports to update markers reactively
watch(filteredReports, () => {
  renderMarkers()
}, { deep: true })

async function loadReports() {
  await reportsStore.fetchReports()
}

function openManageModal(report: Report) {
  selectedReport.value = report
  manageForm.value.status = report.status
  manageForm.value.work_order = report.work_order || ''
  manageForm.value.assigned_operator_id = report.assigned_operator_id || ''
  showEvidenceForm.value = false
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedReport.value = null
  showEvidenceForm.value = false
}

async function triggerAutoAssignment() {
  if (!selectedReport.value) return
  const crewId = await assignCrewAutomatically(selectedReport.value.id)
  if (crewId) {
    alert('Asignación automática exitosa.')
    await reportsStore.fetchReports()
    closeModal()
  } else {
    alert('No se encontraron cuadrillas disponibles en la zona geográfica de este reporte.')
  }
}

async function saveManagement() {
  if (!selectedReport.value) return
  isUpdating.value = true
  try {
    const payload: any = { 
      status: manageForm.value.status,
      work_order: manageForm.value.work_order,
      assigned_operator_id: manageForm.value.assigned_operator_id || null
    }

    // Set assigned_at if transitioning to ASIGNADO
    if (manageForm.value.status === 'ASIGNADO' && selectedReport.value.status !== 'ASIGNADO') {
      payload.assigned_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('reports')
      .update(payload)
      .eq('id', selectedReport.value.id)
      
    if (error) throw error
    
    await reportsStore.fetchReports()
    closeModal()
  } catch (e: any) {
    console.error('Error updating status:', e)
    alert('Error al guardar: ' + e.message)
  } finally {
    isUpdating.value = false
  }
}

function onEvidenceSuccess() {
  alert('Evidencia subida correctamente. El reporte ha sido enviado a verificación por el supervisor.')
  reportsStore.fetchReports()
  closeModal()
}

onMounted(() => {
  loadZones()
  loadCuadrillas()
  reportsStore.subscribeToReports()
})

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateStr))
}

function getPriorityColor(priority: string) {
  switch(priority) {
    case 'CRITICA': return 'badge--critical'
    case 'ALTA': return 'badge--danger'
    case 'MEDIA': return 'badge--warning'
    default: return 'badge--neutral'
  }
}

function getSlaStatus(report: Report) {
  if (['CERRADO', 'EVALUADO', 'RESUELTO', 'RECHAZADO'].includes(report.status)) return { label: 'Finalizado', class: 'sla--done' }
  
  const zone = zones.value.find(z => z.id === report.zone_id)
  if (!zone) return { label: 'Sin SLA', class: 'sla--none' }
  
  const hoursElapsed = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60)
  if (hoursElapsed > zone.sla_hours) return { label: 'Vencido', class: 'sla--expired' }
  if (hoursElapsed > zone.sla_hours * 0.75) return { label: 'Riesgo', class: 'sla--warning' }
  return { label: 'A tiempo', class: 'sla--ok' }
}
</script>

<template>
  <div class="management-section">
    <header class="section-header">
      <div>
        <h2 class="section-title">🔄 Gestión de Operaciones</h2>
        <p class="section-subtitle">Panel operativo para la administración, asignación y resolución de reportes de daños.</p>
      </div>
      
      <div class="filter-group">
        <button class="filter-btn" :class="{ active: filterStatus === 'ACTIVOS' }" @click="filterStatus = 'ACTIVOS'">Activos</button>
        <button class="filter-btn" :class="{ active: filterStatus === 'CERRADOS' }" @click="filterStatus = 'CERRADOS'">Cerrados</button>
        <button class="filter-btn" :class="{ active: filterStatus === 'TODOS' }" @click="filterStatus = 'TODOS'">Todos</button>
      </div>
    </header>

    <div class="content-split">
      <!-- Mapa -->
      <div class="map-container">
        <LeafletMap class="leaflet-host" @ready="handleMapReady" />
        <div class="map-overlay">
          <div class="overlay-stat">
            <span class="dot warning"></span>
            <strong>{{ reports.filter(r => !['CERRADO', 'EVALUADO', 'RESUELTO', 'RECHAZADO'].includes(r.status)).length }}</strong> Activos
          </div>
          <div class="overlay-stat">
            <span class="dot success"></span>
            <strong>{{ reports.filter(r => ['CERRADO', 'EVALUADO', 'RESUELTO'].includes(r.status)).length }}</strong> Resueltos
          </div>
        </div>
      </div>

      <!-- Lista de Reportes -->
      <div class="list-container">
        <div v-if="loading && reports.length === 0" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando bandeja de operaciones...</p>
        </div>

        <div v-else-if="errorMsg && reports.length === 0" class="loading-state" style="color: #ef4444;">
          <p>⚠️ {{ errorMsg }}</p>
          <button class="filter-btn active" style="margin-top: 12px;" @click="loadReports">Reintentar</button>
        </div>

        <div v-else-if="filteredReports.length === 0" class="empty-state">
          <div class="empty-icon">✓</div>
          <h3>Todo al día</h3>
          <p>No hay reportes que coincidan con tu filtro.</p>
        </div>

        <div v-else class="reports-grid">
          <article v-for="report in filteredReports" :key="report.id" class="report-card">
            <div class="card-header">
              <span class="tracking-code">{{ report.tracking_code || `#${report.id}` }}</span>
              <div class="badges">
                <span class="badge" :class="getSlaStatus(report).class">{{ getSlaStatus(report).label }}</span>
                <span class="badge" :class="getPriorityColor(report.priority)">{{ report.priority }}</span>
                <span class="badge badge--outline" v-if="report.is_recurrent">REINCIDENTE</span>
              </div>
            </div>
            
            <div class="card-body">
              <h3 class="report-address">{{ report.address }}</h3>
              <p class="report-desc">{{ report.description || 'Sin descripción adicional.' }}</p>
              
              <div class="meta-info">
                <div class="meta-item" title="Categoría">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  <span>{{ report.category.replace('_', ' ') }}</span>
                </div>
                <div class="meta-item ml-auto" title="Fecha de reporte">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>{{ formatDate(report.created_at) }}</span>
                </div>
              </div>

              <div v-if="report.work_order" class="work-order-badge">
                <strong>Cuadrilla:</strong> {{ report.work_order }}
              </div>
            </div>
            
            <div class="card-footer">
              <button 
                v-if="auth.isAdmin || auth.isSupervisor || !['RESUELTO', 'CERRADO', 'RECHAZADO', 'EVALUADO'].includes(report.status)"
                class="btn-manage" 
                @click="openManageModal(report)"
              >
                Gestionar Reporte
                <span class="status-indicator" :class="report.status.toLowerCase()">{{ report.status }}</span>
              </button>
              <div v-else class="btn-manage" style="cursor: not-allowed; opacity: 0.7; background: var(--bg-subtle);">
                Reporte Finalizado
                <span class="status-indicator" style="background: transparent; color: var(--text);">{{ report.status }}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- Modal de Gestión -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content">
        <!-- Formulario regular o Formulario de Evidencia -->
        <div v-if="!showEvidenceForm">
          <h2>Gestionar Reporte</h2>
          <p class="modal-subtitle">{{ selectedReport?.tracking_code }} - {{ selectedReport?.address }}</p>
          
          <form @submit.prevent="saveManagement" class="modal-form">
            <!-- Selección de Estado (Solo Admin/Supervisor) -->
            <div class="field" v-if="auth.isAdmin || auth.isSupervisor">
              <label>Estado actual</label>
              <select v-model="manageForm.status" required>
                <option value="REPORTADO" disabled>REPORTADO (Nuevo)</option>
                <option v-if="auth.isAdmin" value="CLASIFICADO">CLASIFICADO</option>
                <option v-if="auth.isAdmin" value="ASIGNADO">ASIGNADO (Despachar cuadrilla)</option>
                
                <option value="EN_PROGRESO" disabled>EN PROGRESO (Requiere foto operario)</option>
                <option value="EVIDENCIA_PENDIENTE" disabled>EVIDENCIA PENDIENTE</option>
                <option value="VERIFICACION_SUPERVISOR" disabled>VERIFICACIÓN SUPERVISOR</option>
                <option value="RESUELTO" disabled>RESUELTO (Requiere foto operario)</option>
                
                <option v-if="auth.isSupervisor" value="CERRADO">CERRADO (Archivado)</option>
                <option v-if="auth.isAdmin" value="RECHAZADO">RECHAZADO (Inválido/Duplicado)</option>
                <option value="CALIFICADO" disabled>CALIFICADO (Solo ciudadano)</option>
              </select>
            </div>

            <!-- Asignación de Cuadrilla (Admin) -->
            <div class="field" v-if="auth.isAdmin">
              <label>Cuadrilla Asignada</label>
              <div class="input-action-row">
                <select v-model="manageForm.work_order">
                  <option value="">— Auto-asignar según zona —</option>
                  <option v-for="c in cuadrillas" :key="c.id" :value="c.name">
                    {{ c.name }} (Carga: {{ c.workload }}/3)
                  </option>
                </select>
                <button
                  type="button"
                  class="btn-auto-assign"
                  :disabled="isAssigning"
                  @click="triggerAutoAssignment"
                  title="Asignar automáticamente la cuadrilla más óptima"
                >
                  🤖 Auto
                </button>
              </div>
              <small>Puedes seleccionar manualmente o usar la asignación inteligente.</small>
            </div>
            
            <!-- Vista de solo lectura para el operario -->
            <div class="field" v-else-if="manageForm.work_order">
              <label>Cuadrilla Asignada</label>
              <input type="text" :value="manageForm.work_order" disabled style="background: var(--bg-body);" />
            </div>

            <!-- Subir Evidencia (SOLO Operario) -->
            <div class="field-evidence-trigger" v-if="!auth.isAdmin && ['ASIGNADO', 'EN_PROGRESO'].includes(selectedReport?.status || '')">
              <p class="evidence-info-text" v-if="selectedReport?.status === 'ASIGNADO'">
                Debes registrar tu llegada al sitio con una foto para pasar el estado a "En Progreso".
              </p>
              <p class="evidence-info-text" v-else>
                Registra la evidencia final del trabajo completado para pasar a validación.
              </p>
              <button type="button" class="btn-primary" @click="showEvidenceForm = true">
                <span v-if="selectedReport?.status === 'ASIGNADO'">📍 Registrar Llegada (Iniciar)</span>
                <span v-else>📷 Registrar Evidencia Final</span>
              </button>
            </div>

            <div class="modal-actions" v-if="auth.isAdmin || auth.isSupervisor">
              <button type="button" class="btn-ghost" @click="closeModal" :disabled="isUpdating">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="isUpdating">
                {{ isUpdating ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Evidencia Form (Operario) -->
        <div v-else>
          <EvidenciaForm
            v-if="selectedReport"
            :reportId="selectedReport.id"
            :currentStatus="selectedReport.status"
            @success="onEvidenceSuccess"
            @cancel="showEvidenceForm = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.management-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.section-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
}

.section-subtitle {
  margin: 4px 0 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.filter-group {
  display: flex;
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  padding: 4px;
}

.filter-btn {
  background: transparent;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  color: var(--muted);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.active {
  background: var(--bg-subtle);
  color: var(--text);
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.content-split {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.map-container {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--stroke);
  height: 380px;
  width: 100%;
}

.map-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  background: var(--card);
  opacity: 0.95;
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  display: flex;
  gap: 20px;
  box-shadow: var(--shadow-md);
}

.overlay-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot.warning { background: var(--warning); }
.dot.success { background: #10b981; }

.leaflet-host {
  width: 100%;
  height: 100%;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.report-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}

.card-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--bg-subtle);
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge--critical { background: #991b1b; color: white; }
.badge--danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.badge--warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.badge--neutral { background: var(--bg-subtle); color: var(--muted); }
.badge--outline { background: transparent; border: 1px solid var(--stroke); color: var(--text-secondary); }

/* SLA Badges */
.sla--done { background: #10b981; color: white; }
.sla--expired { background: #ef4444; color: white; animation: pulse 2s infinite; }
.sla--warning { background: #f59e0b; color: white; }
.sla--ok { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981; }
.sla--none { background: #64748b; color: white; }

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.tracking-code {
  font-size: 0.85rem;
  color: var(--muted);
  font-family: monospace;
  background: var(--bg-subtle);
  padding: 4px 8px;
  border-radius: 6px;
}

.card-body {
  padding: 20px;
  flex-grow: 1;
}

.report-address {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.3;
}

.report-desc {
  margin: 0 0 16px 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta-info {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 0.85rem;
  color: var(--muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ml-auto { margin-left: auto; }

.work-order-badge {
  margin-top: 14px;
  padding: 8px 12px;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.card-footer {
  padding: 16px 20px;
  background: var(--bg-subtle);
  border-top: 1px solid var(--stroke);
  border-radius: 0 0 16px 16px;
}

.btn-manage {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--stroke);
  background: var(--card);
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.btn-manage:hover {
  border-color: var(--primary);
  background: var(--bg-subtle);
}

.status-indicator {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: var(--stroke);
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.status-indicator.verificacion_supervisor {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.status-indicator.evidencia_pendiente {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.status-indicator.resuelto {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  background: var(--card);
  border-radius: 20px;
  padding: 32px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.modal-content h2 { margin: 0 0 4px; font-size: 1.4rem; }
.modal-subtitle { color: var(--muted); margin: 0 0 24px; font-size: 0.9rem; }

.modal-form { display: flex; flex-direction: column; gap: 20px; }

.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-weight: 600; font-size: 0.95rem; }
.field select, .field input {
  padding: 12px; border-radius: 10px; border: 1px solid var(--stroke);
  background: var(--bg-subtle); font-family: inherit; font-size: 1rem; color: var(--text);
  width: 100%;
}
.field select:focus, .field input:focus { outline: none; border-color: var(--primary); }
.field small { color: var(--muted); font-size: 0.8rem; }

.input-action-row {
  display: flex;
  gap: 8px;
}

.btn-auto-assign {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.btn-auto-assign:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-evidence-trigger {
  padding: 16px;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  text-align: center;
}

.evidence-info-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.modal-actions {
  display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px;
}

.btn-ghost { padding: 10px 16px; border: none; background: transparent; font-weight: 600; cursor: pointer; color: var(--muted); }
.btn-ghost:hover { color: var(--text); }
.btn-primary { padding: 10px 20px; border-radius: 10px; border: none; background: var(--primary); color: white; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

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

@media (max-width: 600px) {
  .page-header { flex-direction: column; align-items: stretch; }
  .filter-group { width: 100%; }
  .filter-btn { flex: 1; text-align: center; font-size: .85rem; }
  .map-container { height: 280px; }
  .reports-grid { grid-template-columns: 1fr; }
  .input-action-row {
    flex-direction: column;
  }
}
</style>
