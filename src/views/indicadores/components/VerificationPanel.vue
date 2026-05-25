<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { CheckBadgeIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const verificationCases = ref<any[]>([])
const loading = ref(true)
let realtimeSub: any = null

async function loadCases() {
  loading.value = true
  try {
    // 1. Cargar reportes en verificación
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, tracking_code, address, category, created_at, status, is_recurrent, work_order')
      .eq('status', 'VERIFICACION_SUPERVISOR')
      .order('updated_at', { ascending: false })
      
    if (error) throw error
    if (!reports || reports.length === 0) {
      verificationCases.value = []
      return
    }

    const reportIds = reports.map(r => r.id)
    
    // 2. Cargar sus evidencias (la última asociada)
    const { data: evidencias, error: evError } = await supabase
      .from('evidencias')
      .select('reporte_id, tipo, url_archivo, creado_en')
      .in('reporte_id', reportIds)
      .order('creado_en', { ascending: false })

    if (evError) throw evError

    // 3. Unir datos
    verificationCases.value = reports.map(r => {
      const reportEvidencias = evidencias?.filter(e => e.reporte_id === r.id) || []
      const ultimaEvidencia = reportEvidencias.length > 0 ? reportEvidencias[0] : null
      
      return {
        ...r,
        evidencia: ultimaEvidencia ? {
          url: ultimaEvidencia.url_archivo ? supabase.storage.from('reports').getPublicUrl(ultimaEvidencia.url_archivo).data.publicUrl : null,
          tipo: ultimaEvidencia.tipo,
          fecha: ultimaEvidencia.creado_en
        } : null
      }
    })
  } catch (e) {
    console.error("Error cargando verificación:", e)
  } finally {
    loading.value = false
  }
}

async function approveCase(id: number) {
  try {
    // Si se aprueba, se pasa a CERRADO (o EVALUADO)
    await supabase.from('reports').update({ status: 'CERRADO' }).eq('id', id)
    verificationCases.value = verificationCases.value.filter(c => c.id !== id)
  } catch (e) {
    console.error("Error al aprobar:", e)
  }
}

async function rejectCase(id: number, returnToProgress = true) {
  try {
    // Si se rechaza, la cuadrilla debe volver al sitio (EN_PROGRESO)
    const newStatus = returnToProgress ? 'EN_PROGRESO' : 'RECHAZADO'
    await supabase.from('reports').update({ status: newStatus }).eq('id', id)
    verificationCases.value = verificationCases.value.filter(c => c.id !== id)
  } catch (e) {
    console.error("Error al rechazar:", e)
  }
}

onMounted(() => {
  loadCases()
  realtimeSub = supabase.channel('verificaciones')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
      loadCases()
    }).subscribe()
})

onUnmounted(() => {
  if (realtimeSub) supabase.removeChannel(realtimeSub)
})
</script>

<template>
  <div class="verification-panel">
    <div class="panel-header">
      <CheckBadgeIcon class="w-6 h-6 text-primary" />
      <h2>Auditoría de Casos Completados</h2>
      <span class="badge" v-if="verificationCases.length > 0">{{ verificationCases.length }} Pendientes</span>
    </div>

    <div v-if="loading" class="loading-state">
      <span class="spinner"></span>
      <p>Cargando casos por verificar...</p>
    </div>

    <div v-else-if="verificationCases.length === 0" class="empty-state">
      <CheckBadgeIcon class="w-12 h-12 text-success" />
      <p>No hay casos pendientes de auditoría.</p>
    </div>

    <div v-else class="cases-grid">
      <article v-for="c in verificationCases" :key="c.id" class="case-card">
        <div class="case-info">
          <span class="tracking-code">{{ c.tracking_code || `#${c.id}` }}</span>
          <h4>{{ c.address }}</h4>
          <p class="category">{{ c.category.replace('_', ' ') }}</p>
          <div class="meta-row">
            <span class="worker-badge">🧑‍🔧 {{ c.work_order || 'Cuadrilla' }}</span>
            <span v-if="c.evidencia?.tipo === 'FALSO_AVISO'" class="warning-badge">
              <ExclamationTriangleIcon class="w-4 h-4" /> Posible Falso Aviso
            </span>
          </div>
        </div>

        <div class="evidence-box">
          <img v-if="c.evidencia?.url" :src="c.evidencia.url" alt="Evidencia" class="evidence-img" />
          <div v-else class="no-evidence">
            Sin evidencia fotográfica
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-approve" @click="approveCase(c.id)">
            Aprobar y Cerrar
          </button>
          <button class="btn btn-reject" @click="rejectCase(c.id, true)">
            Devolver a Cuadrilla
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.verification-panel {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--stroke);
  padding-bottom: 16px;
}
.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}
.w-6 { width: 1.5rem; } .h-6 { height: 1.5rem; }
.w-4 { width: 1rem; } .h-4 { height: 1rem; }
.text-primary { color: var(--primary); }
.text-success { color: var(--success); }
.badge {
  background: var(--warning);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.case-card {
  border: 1px solid var(--stroke);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-subtle);
}
.case-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tracking-code {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--muted);
}
.case-info h4 { margin: 0; font-size: 1rem; }
.category { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
.meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.worker-badge { background: var(--card); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; border: 1px solid var(--stroke); }
.warning-badge { background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; font-weight: 600; }

.evidence-box {
  width: 100%;
  height: 200px;
  background: #000;
}
.evidence-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.no-evidence {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.85rem;
  background: var(--card);
  border-top: 1px solid var(--stroke);
  border-bottom: 1px solid var(--stroke);
}

.actions {
  display: flex;
  padding: 16px;
  gap: 12px;
}
.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-approve {
  background: var(--success);
  color: white;
}
.btn-approve:hover { filter: brightness(1.1); }
.btn-reject {
  background: transparent;
  border: 1px solid var(--stroke);
  color: var(--text);
}
.btn-reject:hover { background: var(--danger-soft); color: var(--danger); border-color: var(--danger); }

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--muted);
}
.spinner { width: 32px; height: 32px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s infinite linear; margin-bottom: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
