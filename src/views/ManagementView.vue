<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Report } from '@/types/report'
import LeafletMap from '@/components/common/LeafletMap.vue'
import L from 'leaflet'

const loading = ref(true)
const errorMsg = ref('')
const reports = ref<Report[]>([])
const filterStatus = ref('ACTIVOS')

const mapInstance = ref<any>(null)
const markerLayer = ref<any>(null)
const zones = ref<any[]>([])
let realtimeChannel: any = null

async function loadZones() {
  const { data } = await supabase.from('zones').select('*')
  if (data) zones.value = data
}

// Modal state
const showModal = ref(false)
const selectedReport = ref<Report | null>(null)
const manageForm = ref({
  status: '',
  work_order: ''
})
const isUpdating = ref(false)

const filteredReports = computed(() => {
  if (filterStatus.value === 'ACTIVOS') {
    return reports.value.filter(r => !['CERRADO', 'EVALUADO', 'RECHAZADO'].includes(r.status))
  }
  if (filterStatus.value === 'CERRADOS') {
    return reports.value.filter(r => ['CERRADO', 'EVALUADO'].includes(r.status))
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
      const isClosed = ['CERRADO', 'EVALUADO', 'RECHAZADO'].includes(report.status)
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

async function loadReports() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      errorMsg.value = `Error al cargar reportes: ${error.message}`
      throw error
    }
    if (data) {
      reports.value = data as Report[]
      renderMarkers()
    }
  } catch (e: any) {
    console.error('Error fetching reports:', e)
    if (!errorMsg.value) errorMsg.value = e.message || 'Error inesperado.'
  } finally {
    loading.value = false
  }
}

function openManageModal(report: Report) {
  selectedReport.value = report
  manageForm.value.status = report.status
  manageForm.value.work_order = report.work_order || ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedReport.value = null
}

async function saveManagement() {
  if (!selectedReport.value) return
  isUpdating.value = true
  try {
    const { error } = await supabase
      .from('reports')
      .update({ 
        status: manageForm.value.status,
        work_order: manageForm.value.work_order 
      })
      .eq('id', selectedReport.value.id)
      
    if (error) throw error
    
    // Optimistic update
    const index = reports.value.findIndex(r => r.id === selectedReport.value!.id)
    if (index !== -1) {
      reports.value[index].status = manageForm.value.status as Report['status']
      reports.value[index].work_order = manageForm.value.work_order
    }
    closeModal()
  } catch (e: any) {
    console.error('Error updating status:', e)
    alert('Error al guardar: ' + e.message)
  } finally {
    isUpdating.value = false
  }
}

function setupRealtime() {
  realtimeChannel = supabase.channel('public:reports')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, payload => {
      console.log('Cambio detectado:', payload)
      loadReports() 
    })
    .subscribe()
}

onMounted(() => {
  loadZones()
  loadReports()
  setupRealtime()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
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
  <main class="management-view">
    <header class="page-header">
      <div>
        <h1 class="page-title">Bandeja de Gestión</h1>
        <p class="page-subtitle">Panel de operadores para asignación y resolución de reportes.</p>
      </div>
      
      <div class="filter-group">
        <button class="filter-btn" :class="{ active: filterStatus === 'ACTIVOS' }" @click="filterStatus = 'ACTIVOS'">Activos</button>
        <button class="filter-btn" :class="{ active: filterStatus === 'CERRADOS' }" @click="filterStatus = 'CERRADOS'">Cerrados</button>
        <button class="filter-btn" :class="{ active: filterStatus === 'TODOS' }" @click="filterStatus = 'TODOS'">Todos</button>
      </div>
    </header>

    <div class="content-split">
      <!-- Mapa SIEMPRE ARRIBA -->
      <div class="map-section">
        <LeafletMap class="leaflet-host" @ready="handleMapReady" />
        <div class="map-overlay">
          <div class="overlay-stat">
            <span class="dot warning"></span>
            <strong>{{ reports.filter(r => !['CERRADO', 'EVALUADO'].includes(r.status)).length }}</strong> Activos
          </div>
          <div class="overlay-stat">
            <span class="dot success"></span>
            <strong>{{ reports.filter(r => ['CERRADO', 'EVALUADO'].includes(r.status)).length }}</strong> Resueltos
          </div>
        </div>
      </div>

      <!-- Lista DEBAJO DEL MAPA -->
      <div class="list-section">
        <div v-if="loading && reports.length === 0" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando reportes...</p>
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
              <button class="btn-manage" @click="openManageModal(report)">
                Gestionar Reporte
                <span class="status-indicator">{{ report.status }}</span>
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- Modal de Gestión -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content">
        <h2>Gestionar Reporte</h2>
        <p class="modal-subtitle">{{ selectedReport?.tracking_code }} - {{ selectedReport?.address }}</p>
        
        <form @submit.prevent="saveManagement" class="modal-form">
          <div class="field">
            <label>Estado actual</label>
            <select v-model="manageForm.status" required>
              <option value="REPORTADO">REPORTADO (Nuevo)</option>
              <option value="ASIGNADO">ASIGNADO (Enviado a cuadrilla)</option>
              <option value="EN_PROGRESO">EN PROGRESO (Trabajando)</option>
              <option value="RESUELTO">RESUELTO (Finalizado)</option>
              <option value="CERRADO">CERRADO (Archivado/Auditoria)</option>
              <option value="RECHAZADO">RECHAZADO (Falso/Duplicado)</option>
            </select>
          </div>

          <div class="field">
            <label>Cuadrilla o Grupo Asignado</label>
            <input 
              v-model="manageForm.work_order" 
              type="text" 
              placeholder="Ej: Cuadrilla Alfa - Camión 4" 
            />
            <small>Esto nos permite saber quién está a cargo de esta orden.</small>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="closeModal" :disabled="isUpdating">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="isUpdating">
              {{ isUpdating ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.management-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 800;
}

.page-subtitle {
  margin: 0;
  color: var(--muted);
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

.map-section {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--stroke);
  height: 400px;
  width: 100%;
}

.map-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  background: var(--card);
  opacity: 0.9;
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
.dot.success { background: var(--accent); }

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
  width: 60px;
  height: 60px;
  background: var(--bg-subtle);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--primary);
  margin-bottom: 16px;
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
  max-width: 480px;
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
}
.field select:focus, .field input:focus { outline: none; border-color: var(--primary); }
.field small { color: var(--muted); font-size: 0.8rem; }

.modal-actions {
  display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px;
}

.btn-ghost { padding: 10px 16px; border: none; background: transparent; font-weight: 600; cursor: pointer; color: var(--muted); }
.btn-ghost:hover { color: var(--text); }
.btn-primary { padding: 10px 20px; border-radius: 10px; border: none; background: var(--primary); color: white; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 600px) {
  .management-view { padding: 16px; }
  .page-header { flex-direction: column; align-items: stretch; }
  .filter-group { width: 100%; }
  .filter-btn { flex: 1; text-align: center; font-size: .85rem; }
  .map-section { height: 280px; }
  .reports-grid { grid-template-columns: 1fr; }
}
</style>
