<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { offlineAll } from '@/services/offline'
import KpiCard from '@/components/common/KpiCard.vue'
import LeafletMap from '@/components/common/LeafletMap.vue'

const kpis = ref({
  leaks_total: 0,
  pressures_total: 0,
  recent_leaks: [] as any[],
  recent_pressures: [] as any[]
})

const mapData = ref({ leaks: [] as any[], pressures: [] as any[] })
const mapInstance = shallowRef<L.Map | null>(null)
const leakLayer = shallowRef<L.LayerGroup | null>(null)
const pressLayer = shallowRef<L.LayerGroup | null>(null)

async function loadData() {
  console.log('Cargando datos del panel con Supabase y local...')

  try {
    const { count: countL, error: errL1 } = await supabase.from('leaks').select('*', { count: 'exact', head: true })
    const { count: countP, error: errP1 } = await supabase.from('pressure_readings').select('*', { count: 'exact', head: true })

    const { data: recL } = await supabase.from('leaks').select('*').order('created_at', { ascending: false }).limit(5)
    const { data: recP } = await supabase.from('pressure_readings').select('*').order('created_at', { ascending: false }).limit(5)

    // Offline data
    const offlineItems = await offlineAll()
    const offLeaks = offlineItems.filter(i => i.type === 'LEAK').map(i => ({ ...i.payload, id: `OFF_${i.id}`, status: 'PENDIENTE', created_at: i.created_at }))
    const offPress = offlineItems.filter(i => i.type === 'PRESSURE').map(i => ({ ...i.payload, id: `OFF_${i.id}`, status: 'PENDIENTE', created_at: i.created_at }))

    kpis.value = {
      leaks_total: (countL || 0) + offLeaks.length,
      pressures_total: (countP || 0) + offPress.length,
      recent_leaks: [...offLeaks, ...(recL || [])].slice(0, 5),
      recent_pressures: [...offPress, ...(recP || [])].slice(0, 5)
    }

    const { data: mapL } = await supabase.from('leaks').select('id, lat, lng, status, address, sector')
    const { data: mapP } = await supabase.from('pressure_readings').select('id, lat, lng, value, hydrant_id')

    const allMapLeaks = [...offLeaks, ...(mapL || [])]
    const allMapPress = [...offPress, ...(mapP || [])]

    mapData.value = {
      leaks: allMapLeaks.filter(l => l.lat != null && l.lng != null),
      pressures: allMapPress.filter(p => p.lat != null && p.lng != null)
    }

    renderMapData()
  } catch (e) {
    console.error('Excepción cargando panel:', e)
  }
}

function renderMapData() {
  if (!mapInstance.value) return

  if (!leakLayer.value) leakLayer.value = L.layerGroup().addTo(mapInstance.value)
  if (!pressLayer.value) pressLayer.value = L.layerGroup().addTo(mapInstance.value)

  leakLayer.value.clearLayers()
  pressLayer.value.clearLayers()

  mapData.value.leaks.forEach(l => {
    const marker = L.circleMarker([l.lat, l.lng], {
      radius: 8,
      color: '#d32f2f',
      fillColor: '#ef5350',
      fillOpacity: 0.85,
      weight: 2
    })
    marker.bindPopup(`
      <div style="font-family: Arial, sans-serif; min-width: 180px;">
        <div style="font-weight: 700; color: #0f3d63; margin-bottom: 6px;">Fuga #${l.id}</div>
        <div><strong>Dirección:</strong> ${l.address || 'No disponible'}</div>
        <div><strong>Estado:</strong> ${l.status || 'No definido'}</div>
        <div><strong>Sector:</strong> ${l.sector || 'No disponible'}</div>
      </div>
    `)
    marker.addTo(leakLayer.value!)
  })

  mapData.value.pressures.forEach(p => {
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 7,
      color: '#0f5c8a',
      fillColor: '#18a0c6',
      fillOpacity: 0.85,
      weight: 2
    })
    marker.bindPopup(`
      <div style="font-family: Arial, sans-serif; min-width: 180px;">
        <div style="font-weight: 700; color: #0f3d63; margin-bottom: 6px;">Presión #${p.id}</div>
        <div><strong>Valor:</strong> ${p.value ?? 'No disponible'}</div>
        <div><strong>Hidrante:</strong> ${p.hydrant_id || 'No disponible'}</div>
      </div>
    `)
    marker.addTo(pressLayer.value!)
  })
}

function handleMapReady(m: L.Map) {
  mapInstance.value = m
  renderMapData()
}

function exportLeaks() {
  alert('Función de exportación se moverá a Supabase Edge Functions próximamente.')
}

function exportPressures() {
  alert('Función de exportación se moverá a Supabase Edge Functions próximamente.')
}

onMounted(() => loadData())
</script>

<template>
  <main class="dashboard-view">
    <!-- Hero institucional -->
    <section class="hero-panel">
      <div class="hero-panel__overlay"></div>

      <div class="hero-panel__content">
        <div class="hero-panel__badge">ESSMAR · Monitoreo operativo</div>

        <div class="hero-panel__header">
          <div class="hero-panel__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>

          <div>
            <h1 class="hero-panel__title">Panel de Control</h1>
            <p class="hero-panel__subtitle">
              Visualización centralizada de fugas y lecturas de presión del sistema de acueducto.
            </p>
          </div>
        </div>

        <div class="hero-panel__meta">
          <div class="hero-chip">
            <span class="hero-chip__dot hero-chip__dot--danger"></span>
            Fugas activas y registradas
          </div>
          <div class="hero-chip">
            <span class="hero-chip__dot hero-chip__dot--primary"></span>
            Monitoreo de presiones
          </div>
          <div class="hero-chip">
            Cobertura GIS operativa
          </div>
        </div>
      </div>
    </section>

    <!-- KPIs -->
    <section class="section-block">
      <div class="section-head">
        <div>
          <span class="section-head__eyebrow">Indicadores</span>
          <h2 class="section-head__title">Resumen general</h2>
        </div>
      </div>

      <div class="kpi-grid enhanced-kpi-grid">
        <div class="kpi-shell kpi-shell--accent">
          <KpiCard title="Fugas registradas" :value="kpis.leaks_total" />
        </div>

        <div class="kpi-shell kpi-shell--info">
          <KpiCard title="Presiones registradas" :value="kpis.pressures_total" />
        </div>

        <div class="kpi-shell">
          <KpiCard
            title="Última fuga"
            :value="kpis.recent_leaks.length ? `#${kpis.recent_leaks[0].id}` : '—'"
          />
        </div>

        <div class="kpi-shell">
          <KpiCard
            title="Última presión"
            :value="kpis.recent_pressures.length ? `#${kpis.recent_pressures[0].id}` : '—'"
          />
        </div>
      </div>
    </section>

    <!-- mapa + panel lateral -->
    <section class="content-grid">
      <div class="institutional-card map-card">
        <div class="card-head">
          <div>
            <span class="card-head__eyebrow">Georreferenciación</span>
            <h3 class="card-head__title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/>
                <line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              Mapa GIS Operativo
            </h3>
          </div>

          <div class="map-legend">
            <span class="map-legend__item map-legend__item--danger">Fugas</span>
            <span class="map-legend__item map-legend__item--primary">Presiones</span>
          </div>
        </div>

        <div class="map-frame">
          <LeafletMap class="leaflet-host" @ready="handleMapReady" />
        </div>

        <div class="action-bar">
          <button class="btn btn--primary" @click="loadData">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Recargar datos
          </button>

          <button class="btn btn--ghost" @click="exportLeaks">Exportar fugas</button>
          <button class="btn btn--ghost" @click="exportPressures">Exportar presiones</button>
        </div>
      </div>

      <aside class="side-panel">
        <div class="institutional-card info-card">
          <span class="card-head__eyebrow">Estado del sistema</span>
          <h3 class="card-head__title">Vista institucional</h3>
          <p class="info-card__text">
            Este módulo permite consolidar la gestión territorial de incidencias hidráulicas
            y el seguimiento de presiones, con una interfaz más cercana a un portal público institucional.
          </p>

          <div class="status-list">
            <div class="status-item">
              <span class="status-item__label">Total fugas</span>
              <strong class="status-item__value">{{ kpis.leaks_total }}</strong>
            </div>
            <div class="status-item">
              <span class="status-item__label">Total presiones</span>
              <strong class="status-item__value">{{ kpis.pressures_total }}</strong>
            </div>
            <div class="status-item">
              <span class="status-item__label">Último registro de fuga</span>
              <strong class="status-item__value">
                {{ kpis.recent_leaks.length ? `#${kpis.recent_leaks[0].id}` : 'Sin datos' }}
              </strong>
            </div>
            <div class="status-item">
              <span class="status-item__label">Último registro de presión</span>
              <strong class="status-item__value">
                {{ kpis.recent_pressures.length ? `#${kpis.recent_pressures[0].id}` : 'Sin datos' }}
              </strong>
            </div>
          </div>
        </div>

        <div class="institutional-card notice-card">
          <span class="card-head__eyebrow">Acciones rápidas</span>
          <h3 class="card-head__title">Gestión operativa</h3>

          <div class="quick-actions">
            <button class="quick-action" @click="loadData">
              Actualizar panel
            </button>
            <button class="quick-action" @click="exportLeaks">
              Generar reporte de fugas
            </button>
            <button class="quick-action" @click="exportPressures">
              Generar reporte de presiones
            </button>
          </div>
        </div>
      </aside>
    </section>
  </main>
</template>
<style scoped>
/* =========================
   Variables locales del view
   ========================= */
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 24px;
  background: transparent;
  min-height: 100%;
  color: var(--text);
}

/* =========================
   Hero
   ========================= */
.hero-panel {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background: #ffffff;
  color: #000000;
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-md);
}

.hero-panel__overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, rgba(13, 148, 136, 0.05), transparent 40%),
    radial-gradient(circle at bottom left, rgba(30, 58, 95, 0.03), transparent 40%);
  pointer-events: none;
}

.hero-panel__content {
  position: relative;
  z-index: 1;
  padding: 28px;
}

.hero-panel__badge {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 18px;
  color: var(--primary);
}

.hero-panel__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.hero-panel__icon {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: #fff;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.hero-panel__title {
  margin: 0;
  font-size: clamp(1.7rem, 3vw, 2.4rem);
  font-weight: 800;
  line-height: 1.1;
}

.hero-panel__subtitle {
  margin: 10px 0 0;
  max-width: 760px;
  font-size: 1rem;
  line-height: 1.6;
  color: #475569;
}

.hero-panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  transition: all 0.2s ease;
}
.hero-chip:hover {
  background: var(--stroke);
  transform: translateY(-1px);
}

.hero-chip__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.hero-chip__dot--danger {
  background: #ff7c7c;
}

.hero-chip__dot--primary {
  background: #7adfff;
}

/* =========================
   Secciones
   ========================= */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-head__eyebrow,
.card-head__eyebrow {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.section-head__title,
.card-head__title {
  margin: 0;
  color: var(--text);
  font-size: 1.25rem;
  font-weight: 800;
}

.enhanced-kpi-grid {
  gap: 18px;
}

.kpi-shell {
  border-radius: 20px;
  background: var(--card);
  border: 1px solid var(--stroke);
  box-shadow: 0 10px 25px rgba(15, 61, 99, 0.08);
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}

.kpi-shell:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 34px rgba(15, 61, 99, 0.12);
}

.kpi-shell--accent {
  background: linear-gradient(
    135deg,
    var(--card) 0%,
    color-mix(in srgb, var(--accent) 10%, var(--card)) 100%
  );
}

.kpi-shell--info {
  background: linear-gradient(
    135deg,
    var(--card) 0%,
    color-mix(in srgb, var(--primary) 8%, var(--card)) 100%
  );
}

/* =========================
   Grid principal
   ========================= */
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 0.95fr);
  gap: 22px;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.institutional-card {
  background: var(--card);
  border-radius: 22px;
  border: 1px solid var(--stroke);
  box-shadow: var(--ess-shadow);
  padding: 22px;
  transition: background 0.25s ease, border-color 0.25s ease;
}

.map-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.card-head__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* =========================
   Leyenda
   ========================= */
.map-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.map-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 7px 10px;
  border-radius: 999px;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
}

.map-legend__item::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.map-legend__item--danger::before {
  background: var(--danger);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--danger) 18%, transparent);
}

.map-legend__item--primary::before {
  background: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent);
}

/* =========================
   Mapa
   ========================= */
.map-frame {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg-subtle) 100%);
  padding: 8px;
}

.leaflet-host {
  display: block;
  width: 100%;
  min-height: 470px;
  border-radius: 14px;
  overflow: hidden;
}

/* =========================
   Botones
   ========================= */
.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.btn {
  appearance: none;
  border: none;
  outline: none;
  cursor: pointer;
  border-radius: 14px;
  padding: 12px 18px;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn--primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
  color: #fff;
  box-shadow: 0 10px 20px color-mix(in srgb, var(--primary) 28%, transparent);
}

.btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 26px color-mix(in srgb, var(--primary) 34%, transparent);
}

.btn--ghost {
  background: var(--bg-subtle);
  color: var(--text);
  border: 1px solid var(--stroke);
}

.btn--ghost:hover {
  background: color-mix(in srgb, var(--bg-subtle) 70%, var(--primary) 8%);
  transform: translateY(-2px);
}

/* =========================
   Panel lateral
   ========================= */
.info-card__text {
  margin: 10px 0 18px;
  color: var(--muted);
  line-height: 1.7;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-subtle) 100%);
  border: 1px solid var(--stroke);
}

.status-item__label {
  color: var(--muted);
  font-size: 0.92rem;
}

.status-item__value {
  color: var(--text);
  font-size: 0.98rem;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.quick-action {
  width: 100%;
  text-align: left;
  border: 1px solid var(--stroke);
  background: var(--bg-subtle);
  color: var(--text);
  padding: 14px 16px;
  border-radius: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
}

.quick-action:hover {
  background: color-mix(in srgb, var(--bg-subtle) 70%, var(--primary) 8%);
  transform: translateX(4px);
}

/* =========================
   Compatibilidad con dark mode
   Ajusta si tu app usa .dark o [data-theme="dark"]
   ========================= */
.dark .dashboard-view {
  color: var(--text);
}

.dark .hero-panel {
  background: #182035;
  color: #ffffff;
  border: 1px solid var(--stroke);
}
.dark .hero-panel__subtitle {
  color: var(--text-secondary);
}
.dark .hero-chip {
  color: var(--text);
}

/* =========================
   Responsive
   ========================= */
@media (max-width: 1100px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-view {
    padding: 16px;
    gap: 18px;
  }

  .hero-panel__content {
    padding: 22px 18px;
  }

  .hero-panel__header {
    flex-direction: column;
  }

  .institutional-card {
    padding: 18px;
  }

  .leaflet-host {
    min-height: 360px;
  }

  .action-bar {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>