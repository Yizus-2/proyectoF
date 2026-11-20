<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { api } from '@/lib/api'
import type { Crew, Zone } from '@/types/report'
import {
  UsersIcon,
  MapPinIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

interface Operario {
  id: string
  email: string
  full_name: string | null
  role: string
  zone_id: number | null
  crew_id: number | null
}

const operarios = ref<Operario[]>([])
const cuadrillas = ref<Crew[]>([])
const zones = ref<Zone[]>([])
const loading = ref(true)

const showModal = ref(false)
const selectedOperario = ref<Operario | null>(null)
const editForm = ref({
  zone_id: null as number | null
})
const isUpdating = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [zData, oData, cData] = await Promise.all([
      api.get<Zone[]>('/api/zones'),
      api.get<Operario[]>('/api/operators'),
      api.get<Crew[]>('/api/crews')
    ])
    zones.value = zData
    operarios.value = oData
    cuadrillas.value = cData
  } catch (err) {
    console.error('Error cargando operarios:', err)
  } finally {
    loading.value = false
  }
}

const cuadrillasWithZones = computed(() => {
  return cuadrillas.value.map((c) => {
    const zona = zones.value.find((z) => z.id === c.zone_id)
    return {
      ...c,
      zona_nombre: zona ? zona.name : c.zone_name || 'Sin Zona Asignada'
    }
  })
})

function getZoneName(zoneId: number | null) {
  if (!zoneId) return 'Sin Zona'
  return zones.value.find((z) => z.id === zoneId)?.name || 'Desconocida'
}

function getCuadrillaName(crewId: number | null) {
  if (!crewId) return 'N/A'
  return cuadrillas.value.find((c) => c.id === crewId)?.name || 'Desconocida'
}

function openEditModal(op: Operario) {
  selectedOperario.value = op
  editForm.value.zone_id = op.zone_id
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedOperario.value = null
}

async function saveOperario() {
  if (!selectedOperario.value) return
  isUpdating.value = true
  try {
    const updated = await api.patch<Operario>(`/api/operators/${selectedOperario.value.id}`, {
      zone_id: editForm.value.zone_id
    })

    const index = operarios.value.findIndex((o) => o.id === selectedOperario.value!.id)
    if (index !== -1) {
      operarios.value[index].zone_id = updated.zone_id
    }
    closeModal()
  } catch (err: any) {
    alert('Error al actualizar operario: ' + err.message)
  } finally {
    isUpdating.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <main class="operarios-view">
    <header class="page-header">
      <div>
        <h1 class="page-title">Operarios y Cuadrillas</h1>
        <p class="page-subtitle">Zonas asignadas y capacidad activa por equipo.</p>
      </div>
      <button class="btn-primary" @click="loadData">Actualizar</button>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando personal...</p>
    </div>

    <template v-else>
      <div class="content-grid">
        
        <!-- Panel de Operarios -->
        <section class="panel panel-left">
          <div class="panel-header">
            <UsersIcon class="w-6 h-6 text-primary" />
            <h2>Operarios</h2>
          </div>
          <div class="panel-body">
            <p class="help-text">Asigna la zona de trabajo de cada cuenta operativa.</p>
            
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nombre y correo</th>
                    <th>Cuadrilla</th>
                    <th>Zona</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="op in operarios" :key="op.id">
                    <td>
                      <strong>{{ op.full_name || 'Sin nombre' }}</strong><br>
                      <small class="text-muted">{{ op.email }}</small>
                    </td>
                    <td>
                      <span v-if="op.crew_id" class="role-badge">{{ getCuadrillaName(op.crew_id) }}</span>
                      <span v-else class="text-muted">Sin cuadrilla</span>
                    </td>
                    <td>
                      <span class="zone-badge">
                        <MapPinIcon class="w-4 h-4" /> {{ getZoneName(op.zone_id) }}
                      </span>
                    </td>
                    <td>
                      <button class="btn-ghost" @click="openEditModal(op)">Cambiar zona</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="operarios.length === 0" class="empty-state">
                No hay operarios registrados.
              </div>
            </div>
          </div>
        </section>

        <!-- Panel de Cuadrillas / Carga de Trabajo -->
        <section class="panel panel-right">
          <div class="panel-header">
            <BriefcaseIcon class="w-6 h-6 text-warning" />
            <h2>Capacidad por cuadrilla</h2>
          </div>
          <div class="panel-body">
            <p class="help-text">Tope de 3 casos activos por equipo. Al llegar al límite se pausa el despacho automático.</p>

            <div class="cuadrillas-list">
              <div 
                v-for="c in cuadrillasWithZones" 
                :key="c.id" 
                class="cuadrilla-card"
                :class="{ 'is-full': c.workload >= 3 }"
              >
                <div class="c-header">
                  <h4>{{ c.name }}</h4>
                  <span class="c-zone">{{ c.zona_nombre }}</span>
                </div>
                <div class="c-load">
                  <div class="load-text">
                    <span :class="c.workload >= 3 ? 'text-danger' : 'text-success'">
                      {{ c.workload }} / 3 Asignaciones
                    </span>
                    <CheckBadgeIcon v-if="c.workload < 3" class="w-5 h-5 text-success" />
                    <ExclamationTriangleIcon v-else class="w-5 h-5 text-danger" />
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" 
                         :class="c.workload >= 3 ? 'bg-danger' : 'bg-success'"
                         :style="{ width: `${(c.workload / 3) * 100}%` }">
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </template>

    <!-- Modal de Edición -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content">
        <h2>Asignar Zona a Operario</h2>
        <p class="modal-subtitle">{{ selectedOperario?.email }}</p>
        
        <form @submit.prevent="saveOperario" class="modal-form">
          <div class="field">
            <label for="operario-zone-select">Zona de Operación</label>
            <select id="operario-zone-select" name="zone_id" v-model="editForm.zone_id">
              <option :value="null">Sin Zona (No recibirá asignaciones auto)</option>
              <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.name }}</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="closeModal" :disabled="isUpdating">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="isUpdating">
              {{ isUpdating ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.operarios-view { padding: 24px; max-width: 1440px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; }
.page-title { margin: 0 0 8px 0; font-size: 2rem; font-weight: 800; color: var(--text); }
.page-subtitle { margin: 0; color: var(--muted); }

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.panel {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--stroke);
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-subtle);
}
.panel-header h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text); }
.panel-body { padding: 20px; flex-grow: 1; display: flex; flex-direction: column; gap: 16px; }

.help-text { font-size: 0.95rem; color: var(--text-secondary); margin: 0; }

.table-container {
  overflow-x: auto;
  border: 1px solid var(--stroke);
  border-radius: 12px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.data-table th, .data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--stroke);
}
.data-table th {
  background: var(--bg-subtle);
  font-weight: 600;
  color: var(--muted);
  font-size: 0.85rem;
  text-transform: uppercase;
}
.data-table td { font-size: 0.95rem; }
.data-table tr:last-child td { border-bottom: none; }

.role-badge { background: var(--primary-soft); color: var(--primary); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
.zone-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--bg-subtle); color: var(--text-secondary); padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; border: 1px solid var(--stroke); }

.cuadrillas-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  max-height: 500px;
}
.cuadrilla-card {
  padding: 16px;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: var(--bg-subtle);
}
.cuadrilla-card.is-full {
  opacity: 0.7;
  filter: grayscale(0.5);
}
.c-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.c-header h4 { margin: 0; font-size: 1rem; color: var(--text); }
.c-zone { font-size: 0.8rem; color: var(--muted); background: var(--card); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--stroke); }

.c-load { display: flex; flex-direction: column; gap: 8px; }
.load-text { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.9rem; }
.progress-bar { width: 100%; height: 8px; background: var(--stroke); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }

.w-6 { width: 1.5rem; } .h-6 { height: 1.5rem; }
.w-5 { width: 1.25rem; } .h-5 { height: 1.25rem; }
.w-4 { width: 1rem; } .h-4 { height: 1rem; }
.text-primary { color: var(--primary); }
.text-warning { color: var(--warning); }
.text-success { color: var(--success); }
.text-danger { color: #ef4444; }
.bg-success { background: var(--success); }
.bg-danger { background: #ef4444; }

.btn-primary { background: var(--primary); color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--stroke); padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
.btn-ghost:hover { background: var(--bg-subtle); }

.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: var(--muted); }
.spinner { width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s infinite linear; margin-bottom: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Modal */
.modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-content { background: var(--card); border-radius: 16px; padding: 32px; width: 100%; max-width: 400px; box-shadow: var(--shadow-lg); }
.modal-content h2 { margin: 0 0 4px; font-size: 1.25rem; }
.modal-subtitle { color: var(--muted); margin: 0 0 24px; font-size: 0.9rem; }
.modal-form { display: flex; flex-direction: column; gap: 20px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-weight: 600; font-size: 0.95rem; }
.field select { padding: 12px; border-radius: 8px; border: 1px solid var(--stroke); background: var(--bg-subtle); color: var(--text); outline: none; }
.field select:focus { border-color: var(--primary); }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }

@media (max-width: 1024px) {
  .content-grid { grid-template-columns: 1fr; }
}
</style>
