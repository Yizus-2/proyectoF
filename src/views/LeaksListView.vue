<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { offlineAll } from '@/services/offline'
import type { Leak, LeakStatus } from '@/types/leak'
import LeakFilters from '@/components/leaks/LeakFilters.vue'
import LeakTable from '@/components/leaks/LeakTable.vue'
import LeafletMap from '@/components/common/LeafletMap.vue'
import LeakMapMarkers from '@/components/leaks/LeakMapMarkers.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'

const leaks = ref<Leak[]>([])
const mapInstance = shallowRef<L.Map | null>(null)
const noticeMsg = ref('')
const noticeVisible = ref(false)

function showNotice(msg: string) {
  noticeMsg.value = msg
  noticeVisible.value = true
  setTimeout(() => { noticeVisible.value = false }, 4000)
}

async function loadLeaks(filters?: { status?: string, sector?: string, q?: string }) {
  let query = supabase.from('leaks').select('*').order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.sector) query = query.ilike('sector', `%${filters.sector}%`)
  if (filters?.q) query = query.or(`reporter_name.ilike.%${filters.q}%,address.ilike.%${filters.q}%`)

  const { data, error } = await query
  let remoteLeaks: Leak[] = []
  if (!error && data) {
    remoteLeaks = data as any[]
  }

  // Fetch offline items
  const offlineItems = await offlineAll()
  const localLeaks = offlineItems
    .filter(i => i.type === 'LEAK')
    .map(i => ({
      ...i.payload,
      id: i.id ? `OFF_${i.id}` : `OFF_${Date.now()}`,
      status: 'PENDIENTE',
      created_at: i.created_at
    })) as any[]

  // Merge (local first or remote first depending on preference, here local first for visibility)
  leaks.value = [...localLeaks, ...remoteLeaks]
}

async function handleStatusChange(id: number, status: LeakStatus) {
  const { data, error } = await supabase
    .from('leaks')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (!error && data) {
    showNotice('Estado actualizado exitosamente.')
    const idx = leaks.value.findIndex(l => l.id === id)
    if (idx !== -1) leaks.value[idx].status = status
  } else {
    showNotice('Error al actualizar el estado.')
  }
}

function handleExport() {
  alert('Función de exportación de Excel se migrará próximamente.')
}

onMounted(() => loadLeaks())
</script>

<template>
  <main class="leaks-monitor-view">
    <section class="leaks-monitor-hero">
      <div class="leaks-monitor-hero__overlay"></div>

      <div class="leaks-monitor-hero__content">
        <div class="leaks-monitor-hero__badge">Seguimiento operativo</div>

        <h1 class="leaks-monitor-hero__title">Monitoreo de fugas</h1>

        <p class="leaks-monitor-hero__subtitle">
          Consulta incidencias registradas, visualiza reportes en mapa, filtra resultados
          por criterios operativos y actualiza estados desde una vista centralizada.
        </p>

        <div class="leaks-monitor-hero__chips">
          <span class="monitor-chip monitor-chip--danger">Incidencias georreferenciadas</span>
          <span class="monitor-chip monitor-chip--accent">Control de estado</span>
          <span class="monitor-chip monitor-chip--neutral">Vista cartográfica</span>
        </div>
      </div>
    </section>

    <section class="filters-shell">
      <LeakFilters @filter-change="loadLeaks" @export="handleExport" />
    </section>

    <section class="monitor-layout">
      <div class="monitor-panel monitor-panel--map">
        <div class="panel-head panel-head--row">
          <div>
            <span class="panel-head__eyebrow">Georreferenciación</span>
            <h2 class="panel-head__title">Mapa de incidencias</h2>
          </div>

          <div class="panel-chip">
            {{ leaks.length }} registro<span v-if="leaks.length !== 1">s</span>
          </div>
        </div>

        <div class="map-shell">
          <LeafletMap class="map-host" @ready="m => mapInstance = m" />
          <LeakMapMarkers :map="mapInstance" :leaks="leaks" />
        </div>
      </div>

      <div class="monitor-side">
        <div class="monitor-panel monitor-panel--table">
          <div class="panel-head">
            <span class="panel-head__eyebrow">Listado</span>
            <h2 class="panel-head__title">Tabla de fugas</h2>
          </div>

          <LeakTable :leaks="leaks" @status-change="handleStatusChange" />
          <NoticeAlert :message="noticeMsg" :visible="noticeVisible" />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.leaks-monitor-view {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px;
  min-height: 100%;
  background: transparent;
  color: var(--text);
}

.leaks-monitor-hero {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, color-mix(in srgb, var(--page-bg) 92%, white 8%) 0%, var(--page-bg) 100%);
  box-shadow: var(--lmv-shadow);
}

.leaks-monitor-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--danger) 8%, transparent), transparent 28%),
    radial-gradient(circle at left center, color-mix(in srgb, var(--primary) 10%, transparent), transparent 35%);
  pointer-events: none;
}

.leaks-monitor-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04));
  pointer-events: none;
}

.leaks-monitor-hero__content {
  position: relative;
  z-index: 1;
  padding: 28px 24px;
}

.leaks-monitor-hero__badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--danger) 8%, white 92%);
  border: 1px solid color-mix(in srgb, var(--danger) 16%, transparent);
  color: var(--danger);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.leaks-monitor-hero__title {
  margin: 0 0 10px;
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  font-weight: 800;
  line-height: 1.1;
  color: var(--text);
}

.leaks-monitor-hero__subtitle {
  margin: 0;
  max-width: 820px;
  color: var(--muted);
  line-height: 1.75;
  font-size: 1rem;
}

.leaks-monitor-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.monitor-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.83rem;
  font-weight: 700;
  border: 1px solid var(--stroke);
  background: color-mix(in srgb, var(--card) 92%, transparent);
  color: var(--text);
}

.monitor-chip--danger {
  background: color-mix(in srgb, var(--danger) 8%, white 92%);
  color: var(--danger);
}

.monitor-chip--accent {
  background: color-mix(in srgb, var(--accent) 10%, white 90%);
  color: var(--accent);
}

.monitor-chip--neutral {
  background: color-mix(in srgb, var(--bg-subtle) 75%, white 25%);
  color: var(--muted);
}

.filters-shell {
  border-radius: 22px;
  border: 1px solid var(--stroke);
  background: var(--card);
  backdrop-filter: blur(10px);
  box-shadow: var(--lmv-shadow);
  padding: 18px;
}

.monitor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.monitor-side {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.monitor-panel {
  border-radius: 24px;
  border: 1px solid var(--stroke);
  background: var(--card);
  backdrop-filter: blur(10px);
  box-shadow: var(--lmv-shadow);
  padding: 22px;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.monitor-panel:hover {
  box-shadow: var(--lmv-shadow-lg);
}

.panel-head {
  margin-bottom: 18px;
}

.panel-head--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-head__eyebrow {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.panel-head__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
}

.panel-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 8%, white 92%);
  border: 1px solid color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--primary);
  font-size: 0.86rem;
  font-weight: 700;
  white-space: nowrap;
}

.map-shell {
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-subtle) 72%, white 28%) 0%, transparent 100%);
  padding: 8px;
}

.map-host {
  display: block;
  width: 100%;
  min-height: 520px;
  border-radius: 16px;
  overflow: hidden;
}

:global(.dark) .leaks-monitor-view {
  color: var(--text);
}

:global(.dark) .leaks-monitor-hero__overlay,
:global([data-theme="dark"]) .leaks-monitor-hero__overlay {
  background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
}

@media (max-width: 1100px) {
  .monitor-layout {
    grid-template-columns: 1fr;
  }

  .map-host {
    min-height: 420px;
  }
}

@media (max-width: 768px) {
  .leaks-monitor-view {
    padding: 16px;
    gap: 18px;
  }

  .leaks-monitor-hero__content,
  .monitor-panel,
  .filters-shell {
    padding: 18px;
  }

  .map-host {
    min-height: 340px;
  }
}
</style>