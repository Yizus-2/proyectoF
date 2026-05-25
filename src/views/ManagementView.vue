<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Report } from '@/types/report'
import LeafletMap from '@/components/common/LeafletMap.vue'
import L from 'leaflet'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  MapPinIcon, 
  CalendarIcon, 
  TagIcon,
  WrenchScrewdriverIcon,
  CheckBadgeIcon
} from '@heroicons/vue/24/outline'

const loading = ref(true)
const errorMsg = ref('')
const reports = ref<Report[]>([])
const filterStatus = ref('ACTIVOS')
const filterZone = ref<number | null>(null)

const mapInstance = ref<any>(null)
const markerLayer = ref<any>(null)
const zones = ref<any[]>([])
const cuadrillas = ref<any[]>([])
let realtimeChannel: any = null
let realtimeCuadrillas: any = null
const auth = useAuthStore()

async function loadZones() {
  const { data } = await supabase.from('zones').select('*')
  if (data) zones.value = data
}

async function loadCuadrillas() {
  const { data } = await supabase.from('crews').select('*').order('name')
  if (data) cuadrillas.value = data
}

// Modal state
const showModal = ref(false)
const selectedReport = ref<Report | null>(null)
const manageForm = ref({
  status: '',
  cuadrilla_id: '',
  evidenceFile: null as File | null,
  evidencePreview: null as string | null,
  isFalseAlarm: false
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

const filteredReports = computed(() => {
  let result = reports.value

  if (filterStatus.value === 'ACTIVOS') {
    result = result.filter(r => !['CERRADO', 'EVALUADO', 'RECHAZADO', 'VERIFICACION_SUPERVISOR'].includes(r.status))
  } else if (filterStatus.value === 'CERRADOS') {
    result = result.filter(r => ['CERRADO', 'EVALUADO', 'VERIFICACION_SUPERVISOR'].includes(r.status))
  }

  if (filterZone.value) {
    result = result.filter(r => r.zone_id === filterZone.value)
  }

  return result
})

function handleMapReady(map: any) {
  mapInstance.value = map
  markerLayer.value = L.layerGroup().addTo(map)
  renderMarkers()
}

function renderMarkers() {
  if (!mapInstance.value || !markerLayer.value) return
  markerLayer.value.clearLayers()
  
  const bounds = L.latLngBounds([])

  filteredReports.value.forEach(report => {
    if (report.lat && report.lng) {
      const latLng = L.latLng(report.lat, report.lng)
      bounds.extend(latLng)

      const isClosed = ['CERRADO', 'EVALUADO', 'RECHAZADO'].includes(report.status)
      const color = isClosed ? '#64748b' : (report.priority === 'CRITICA' ? '#ef4444' : '#f97316')
      
      const marker = L.circleMarker(latLng, {
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

  if (bounds.isValid() && filteredReports.value.length > 0) {
    mapInstance.value.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
  }
}

watch([filterStatus, filterZone], () => {
  renderMarkers()
})

async function loadReports() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('id, tracking_code, status, address, category, created_at, priority, lat, lng, work_order, zone_id')
      .order('created_at', { ascending: false })
      .limit(200)

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
  manageForm.value.cuadrilla_id = ''
  manageForm.value.evidenceFile = null
  manageForm.value.evidencePreview = null
  manageForm.value.isFalseAlarm = false
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
    let evidencePath = undefined

    // Si hay foto de evidencia, subirla a Supabase Storage
    if (manageForm.value.evidenceFile) {
      const compressedFile = await compressImage(manageForm.value.evidenceFile)
      const ext = compressedFile.name.split('.').pop() || 'jpg'
      const filePath = `evidence/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('reports').upload(filePath, compressedFile)
      if (upErr) throw upErr
      evidencePath = filePath
    }

    // Si es admin y está asignando
    if (auth.isAdmin && manageForm.value.status === 'ASIGNADO' && manageForm.value.cuadrilla_id) {
      const crewName = cuadrillas.value.find(c => c.id === manageForm.value.cuadrilla_id)?.name || 'Cuadrilla'
      await supabase.from('reports').update({ 
        status: 'ASIGNADO', 
        work_order: crewName,
        assigned_at: new Date().toISOString()
      }).eq('id', selectedReport.value.id)
      
      // Incrementar carga de la cuadrilla
      await supabase.from('crews').update({
        workload: (cuadrillas.value.find(c => c.id === manageForm.value.cuadrilla_id)?.workload || 0) + 1
      }).eq('id', manageForm.value.cuadrilla_id)
    } 
    // Si es cuadrilla enviando evidencia
    else if (evidencePath) {
      let tipoEvidencia = 'EN_PROGRESO'
      if (manageForm.value.status === 'RESUELTO') tipoEvidencia = 'FINALIZADO'
      if (manageForm.value.isFalseAlarm) tipoEvidencia = 'FALSO_AVISO'

      const { error: evErr } = await supabase.from('evidences').insert({
        report_id: selectedReport.value.id,
        evidence_url: supabase.storage.from('reports').getPublicUrl(evidencePath).data.publicUrl,
        description: tipoEvidencia,
        materials: '',
        hours_spent: 0,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      })
      if (evErr) throw evErr

      // Actualizamos reporte según la lógica
      let nextStatus = manageForm.value.status
      if (tipoEvidencia === 'FALSO_AVISO' || tipoEvidencia === 'FINALIZADO') {
        nextStatus = 'VERIFICACION_SUPERVISOR'
      }

      await supabase.from('reports').update({ status: nextStatus }).eq('id', selectedReport.value.id)
    } 
    // Otros casos generales
    else {
      await supabase.from('reports').update({ status: manageForm.value.status }).eq('id', selectedReport.value.id)
    }
    
    await loadReports()
    await loadCuadrillas()
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
      loadReports() 
    }).subscribe()

  realtimeCuadrillas = supabase.channel('public:crews')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'crews' }, () => {
      loadCuadrillas()
    }).subscribe()
}

onMounted(() => {
  loadZones()
  loadCuadrillas()
  loadReports()
  setupRealtime()
})

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
  if (realtimeCuadrillas) supabase.removeChannel(realtimeCuadrillas)
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
  if (['CERRADO', 'EVALUADO', 'RESUELTO', 'RECHAZADO', 'VERIFICACION_SUPERVISOR'].includes(report.status)) {
    return { label: 'Finalizado', class: 'sla--done' }
  }
  
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
        <h1 class="page-title">Operaciones y Despacho</h1>
        <p class="page-subtitle">Panel para asignación visual, cuadrillas en campo y seguimiento territorial.</p>
      </div>
      
      <div class="filters-container">
        <div class="zone-filter">
          <MapPinIcon class="w-5 h-5 text-muted" />
          <select v-model="filterZone">
            <option :value="null">Todas las Zonas</option>
            <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.name }}</option>
          </select>
        </div>

        <div class="filter-group">
          <button class="filter-btn" :class="{ active: filterStatus === 'ACTIVOS' }" @click="filterStatus = 'ACTIVOS'">Activos</button>
          <button class="filter-btn" :class="{ active: filterStatus === 'CERRADOS' }" @click="filterStatus = 'CERRADOS'">Verificación/Cerrados</button>
          <button class="filter-btn" :class="{ active: filterStatus === 'TODOS' }" @click="filterStatus = 'TODOS'">Todos</button>
        </div>
      </div>
    </header>

    <div class="top-layout">
      <!-- Mapa SIEMPRE ARRIBA Y A LA IZQUIERDA -->
      <div class="map-section">
        <LeafletMap class="leaflet-host" @ready="handleMapReady" />
        <div class="map-overlay">
          <div class="overlay-stat">
            <span class="dot warning"></span>
            <strong>{{ reports.filter(r => !['CERRADO', 'EVALUADO', 'VERIFICACION_SUPERVISOR'].includes(r.status)).length }}</strong> Activos
          </div>
        </div>
      </div>

      <!-- Panel de Cuadrillas a la DERECHA -->
      <div class="crews-panel glass-card">
        <div class="panel-header">
          <WrenchScrewdriverIcon class="w-6 h-6 text-primary" />
          <h3>Disponibilidad de Cuadrillas</h3>
        </div>
        <div class="crews-list">
          <div v-if="cuadrillas.length === 0" class="loading-state-sm">
            Cargando cuadrillas...
          </div>
          
          <div 
            v-for="c in cuadrillas" 
            :key="c.id" 
            class="crew-item"
            :class="{ 'crew-full': c.workload >= 3 }"
          >
            <div class="crew-info">
              <span class="crew-name">{{ c.name }}</span>
              <span class="crew-status" :class="c.workload >= 3 ? 'text-danger' : (c.workload > 0 ? 'text-warning' : 'text-success')">
                {{ c.workload >= 3 ? 'Ocupada' : 'Disponible' }}
              </span>
            </div>
            <div class="crew-load">
              <span class="load-text">{{ c.workload }} / 3 Casos</span>
              <div class="load-bar-track">
                <div class="load-bar-fill" 
                     :class="c.workload >= 3 ? 'bg-danger' : 'bg-primary'"
                     :style="{ width: `${(c.workload / 3) * 100}%` }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lista DEBAJO DEL MAPA -->
    <div class="list-section">
      <div class="section-title">
        <h3>Incidentes Filtrados</h3>
      </div>
      
      <div v-if="loading && reports.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando reportes operacionales...</p>
      </div>

      <div v-else-if="errorMsg && reports.length === 0" class="loading-state text-danger">
        <ExclamationTriangleIcon class="w-12 h-12 mb-4" />
        <p>{{ errorMsg }}</p>
        <button class="filter-btn active mt-3" @click="loadReports">Reintentar</button>
      </div>

      <div v-else-if="filteredReports.length === 0" class="empty-state">
        <div class="empty-icon">
          <CheckCircleIcon class="w-10 h-10" />
        </div>
        <h3>Todo al día en esta vista</h3>
        <p>No hay reportes que coincidan con tu filtro actual.</p>
      </div>

      <div v-else class="reports-grid">
        <article v-for="report in filteredReports" :key="report.id" class="report-card">
          <div class="card-header">
            <span class="tracking-code">{{ report.tracking_code || `#${report.id}` }}</span>
            <div class="badges">
              <span class="badge" :class="getSlaStatus(report).class">{{ getSlaStatus(report).label }}</span>
              <span class="badge" :class="getPriorityColor(report.priority)">{{ report.priority }}</span>
            </div>
          </div>
          
          <div class="card-body">
            <h3 class="report-address">{{ report.address }}</h3>
            <p class="report-desc">{{ report.description || 'Sin descripción adicional.' }}</p>
            
            <div class="meta-info">
              <div class="meta-item" title="Categoría">
                <TagIcon class="w-4 h-4" />
                <span>{{ report.category.replace('_', ' ') }}</span>
              </div>
              <div class="meta-item ml-auto" title="Fecha de reporte">
                <CalendarIcon class="w-4 h-4" />
                <span>{{ formatDate(report.created_at) }}</span>
              </div>
            </div>

            <div v-if="report.work_order" class="work-order-badge">
              <strong>Asignado a:</strong> {{ report.work_order }}
            </div>
          </div>
          
          <div class="card-footer">
            <button 
              v-if="auth.isAdmin || auth.isOperator"
              class="btn-manage" 
              @click="openManageModal(report)"
            >
              Gestionar Caso
              <span class="status-indicator">{{ report.status.replace('_', ' ') }}</span>
            </button>
          </div>
        </article>
      </div>
    </div>

    <!-- Modal de Gestión -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content">
        <h2>Gestionar Incidente</h2>
        <p class="modal-subtitle">{{ selectedReport?.tracking_code }} - {{ selectedReport?.address }}</p>
        
        <form @submit.prevent="saveManagement" class="modal-form">
          
          <div class="field">
            <label>Estado Operativo</label>
            <select v-model="manageForm.status" required>
              <option value="REPORTADO" disabled>REPORTADO (Nuevo)</option>
              <option v-if="auth.isAdmin" value="ASIGNADO">ASIGNADO (Despachar Cuadrilla)</option>
              <option value="EN_PROGRESO">LLEGADA A SITIO / EN PROGRESO</option>
              <option value="RESUELTO">FINALIZAR CASO (Requiere Verificación)</option>
            </select>
          </div>

          <!-- Solo para admins: Asignación a cuadrillas -->
          <div v-if="auth.isAdmin && manageForm.status === 'ASIGNADO'" class="field assign-box">
            <label>Despachar a Cuadrilla Disponible</label>
            <select v-model="manageForm.cuadrilla_id" required>
              <option value="" disabled>Seleccione una cuadrilla...</option>
              <option 
                v-for="c in cuadrillas" 
                :key="c.id" 
                :value="c.id"
                :disabled="c.workload >= 3"
              >
                {{ c.name }} ({{ c.workload }}/3 Casos)
              </option>
            </select>
            <small>Las cuadrillas con 3/3 casos están ocupadas y deshabilitadas.</small>
          </div>

          <!-- Evidencias para Cuadrillas (Admins no suben fotos) -->
          <div class="field" v-if="!auth.isAdmin && ['EN_PROGRESO', 'RESUELTO'].includes(manageForm.status)">
            <label>Evidencia Fotográfica del Sitio</label>
            <label for="evidence" class="upload-area">
              <span v-if="!manageForm.evidencePreview">📷 Tomar Foto / Subir Respaldo</span>
              <img v-else :src="manageForm.evidencePreview" alt="preview" class="preview-img" />
            </label>
            <input id="evidence" type="file" accept="image/*" class="sr-only" @change="onEvidenceSelected" required />
          </div>

          <!-- Marca de Falso Aviso -->
          <div class="field checkbox-field" v-if="manageForm.status === 'RESUELTO'">
            <label class="check-label">
              <input type="checkbox" v-model="manageForm.isFalseAlarm" />
              Marcar como Falso Aviso / No hay daño
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="closeModal" :disabled="isUpdating">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="isUpdating">
              {{ isUpdating ? 'Procesando...' : 'Confirmar Gestión' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.management-view { padding: 24px; max-width: 1440px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; }
.page-title { margin: 0 0 8px 0; font-size: 2rem; font-weight: 800; color: var(--text); }
.page-subtitle { margin: 0; color: var(--muted); }
.filters-container { display: flex; gap: 16px; flex-wrap: wrap; }
.zone-filter { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--stroke); border-radius: 12px; padding: 4px 12px; }
.zone-filter select { background: transparent; border: none; outline: none; color: var(--text); font-weight: 600; cursor: pointer; }
.text-muted { color: var(--muted); }
.text-primary { color: var(--primary); }
.w-6 { width: 1.5rem; } .h-6 { height: 1.5rem; }
.w-5 { width: 1.25rem; } .h-5 { height: 1.25rem; }
.w-4 { width: 1rem; } .h-4 { height: 1rem; }

.filter-group { display: flex; background: var(--card); border: 1px solid var(--stroke); border-radius: 12px; padding: 4px; }
.filter-btn { background: transparent; border: none; padding: 8px 16px; border-radius: 8px; color: var(--muted); font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
.filter-btn.active { background: var(--bg-subtle); color: var(--text); box-shadow: var(--shadow-sm); }

.top-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }

.map-section { position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--stroke); height: 500px; width: 100%; z-index: 10; }
.map-overlay { position: absolute; top: 16px; right: 16px; z-index: 1000; background: var(--card); opacity: 0.95; backdrop-filter: blur(8px); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--stroke); display: flex; gap: 20px; box-shadow: var(--shadow-md); }
.overlay-stat { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); font-weight: 600; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.warning { background: var(--warning); }
.dot.success { background: var(--success); }
.leaflet-host { width: 100%; height: 100%; }

/* Panel de Cuadrillas */
.crews-panel { background: var(--card); border: 1px solid var(--stroke); border-radius: 16px; display: flex; flex-direction: column; height: 500px; overflow: hidden; }
.panel-header { padding: 20px; border-bottom: 1px solid var(--stroke); display: flex; align-items: center; gap: 12px; background: var(--bg-subtle); }
.panel-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text); }
.crews-list { flex-grow: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.crew-item { background: var(--bg-subtle); border-radius: 12px; padding: 16px; border: 1px solid var(--stroke); transition: transform 0.2s; }
.crew-full { opacity: 0.6; filter: grayscale(0.5); }
.crew-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.crew-name { font-weight: 700; font-size: 0.95rem; color: var(--text); }
.crew-status { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
.crew-load { display: flex; flex-direction: column; gap: 6px; }
.load-text { font-size: 0.85rem; color: var(--muted); font-weight: 600; }
.load-bar-track { width: 100%; height: 8px; background: var(--stroke); border-radius: 4px; overflow: hidden; }
.load-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
.bg-primary { background-color: var(--primary); }
.bg-danger { background-color: var(--danger); }
.text-success { color: var(--success); }
.text-warning { color: var(--warning); }
.text-danger { color: var(--danger); }

.list-section { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
.section-title h3 { margin: 0; font-size: 1.4rem; font-weight: 800; }

.reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.report-card { background: var(--card); border: 1px solid var(--stroke); border-radius: 16px; display: flex; flex-direction: column; transition: transform 0.2s ease; }
.report-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.card-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--stroke); }
.badges { display: flex; gap: 8px; flex-wrap: wrap; }
.badge { font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
.badge--critical { background: #ef4444; color: white; }
.badge--danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.badge--warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.badge--neutral { background: var(--bg-subtle); color: var(--muted); }

.sla--done { background: #10b981; color: white; }
.sla--expired { background: #ef4444; color: white; }
.sla--warning { background: #f59e0b; color: white; }
.sla--ok { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981; }

.tracking-code { font-size: 0.85rem; color: var(--muted); font-family: monospace; background: var(--bg-subtle); padding: 4px 8px; border-radius: 6px; }
.card-body { padding: 20px; flex-grow: 1; }
.report-address { margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; }
.report-desc { margin: 0 0 16px 0; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.meta-info { display: flex; gap: 16px; align-items: center; font-size: 0.85rem; color: var(--muted); }
.meta-item { display: flex; align-items: center; gap: 6px; }
.ml-auto { margin-left: auto; }
.work-order-badge { margin-top: 14px; padding: 8px 12px; background: var(--primary-soft); border: 1px solid rgba(167, 139, 250, 0.2); border-radius: 8px; font-size: 0.85rem; color: var(--text); font-weight: 600; }
.card-footer { padding: 16px 20px; background: var(--bg-subtle); border-top: 1px solid var(--stroke); border-radius: 0 0 16px 16px; }
.btn-manage { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--stroke); background: var(--card); color: var(--text); font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
.btn-manage:hover { border-color: var(--primary); }
.status-indicator { font-size: 0.7rem; padding: 4px 8px; background: var(--stroke); border-radius: 12px; font-weight: 700; }

.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; color: var(--muted); background: var(--card); border-radius: 20px; border: 1px solid var(--stroke); }
.empty-icon { color: var(--primary); margin-bottom: 16px; }
.spinner { width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s infinite linear; margin-bottom: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Modal */
.modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-content { background: var(--card); border-radius: 20px; padding: 32px; width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); border: 1px solid var(--stroke); }
.modal-content h2 { margin: 0 0 4px; font-size: 1.4rem; color: var(--text); }
.modal-subtitle { color: var(--muted); margin: 0 0 24px; font-size: 0.9rem; }
.modal-form { display: flex; flex-direction: column; gap: 20px; }
.upload-area { display:flex; align-items:center; justify-content:center; min-height:100px; border:2px dashed var(--stroke); border-radius:12px; cursor:pointer; background:var(--bg-subtle); font-weight:600; color:var(--muted); transition:all .2s; overflow:hidden; }
.upload-area:hover { border-color:var(--primary); color:var(--primary); }
.preview-img { width:100%; height:160px; object-fit:cover; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-weight: 600; font-size: 0.95rem; color: var(--text); }
.field select, .field input { padding: 12px; border-radius: 10px; border: 1px solid var(--stroke); background: var(--bg-subtle); color: var(--text); outline: none; }
.field select:focus { border-color: var(--primary); }
.assign-box { padding: 16px; background: var(--primary-soft); border-radius: 12px; border: 1px solid rgba(167, 139, 250, 0.2); }
.assign-box label { color: var(--primary); }
.checkbox-field { flex-direction: row; align-items: center; }
.check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); font-weight: 500; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }
.btn-ghost { padding: 10px 16px; border: none; background: transparent; font-weight: 600; cursor: pointer; color: var(--muted); }
.btn-ghost:hover { color: var(--text); }
.btn-primary { padding: 10px 20px; border-radius: 10px; border: none; background: var(--primary); color: white; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 1024px) {
  .top-layout { grid-template-columns: 1fr; }
  .map-section { height: 350px; }
  .crews-panel { height: 350px; }
}
@media (max-width: 600px) {
  .management-view { padding: 16px; }
  .page-header { flex-direction: column; align-items: stretch; }
  .filters-container { flex-direction: column; }
}
</style>
