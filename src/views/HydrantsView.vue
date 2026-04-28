<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Hydrant, HydrantCreatePayload } from '@/types/hydrant'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import HydrantForm from '@/components/hydrants/HydrantForm.vue'
import HydrantSearch from '@/components/hydrants/HydrantSearch.vue'
import HydrantList from '@/components/hydrants/HydrantList.vue'

const q = ref('')
const hydrants = ref<Hydrant[]>([])
const noticeMsg = ref('')
const noticeVisible = ref(false)

function showNotice(msg: string) {
  noticeMsg.value = msg
  noticeVisible.value = true
  setTimeout(() => { noticeVisible.value = false }, 4000)
}

async function loadHydrants() {
  let query = supabase.from('hydrants').select('*').order('created_at', { ascending: false })

  if (q.value.trim()) {
    query = query.or(`internal_code.ilike.%${q.value}%,common_name.ilike.%${q.value}%,address.ilike.%${q.value}%`)
  }

  const { data, error } = await query
  if (!error && data) {
    hydrants.value = data
  }
}

async function handleSubmit(payload: HydrantCreatePayload) {
  const { data, error } = await supabase
    .from('hydrants')
    .insert(payload)
    .select()
    .single()

  if (!error && data) {
    showNotice('Hidrante guardado exitosamente.')
    loadHydrants()
  } else {
    showNotice('Error guardando hidrante.')
  }
}

onMounted(() => loadHydrants())
</script>

<template>
  <main class="hydrants-view">
    <section class="hydrants-hero">
      <div class="hydrants-hero__overlay"></div>

      <div class="hydrants-hero__content">
        <div class="hydrants-hero__badge">Gestión de red hidráulica</div>

        <h1 class="hydrants-hero__title">Registro y consulta de hidrantes</h1>

        <p class="hydrants-hero__subtitle">
          Administra el inventario de hidrantes, consulta información registrada y
          mantén actualizada la red operativa desde una interfaz clara y centralizada.
        </p>
      </div>
    </section>

    <section class="hydrants-layout">
      <div class="hydrants-panel hydrants-panel--form">
        <div class="panel-head">
          <span class="panel-head__eyebrow">Formulario</span>
          <h2 class="panel-head__title">Nuevo hidrante</h2>
        </div>

        <HydrantForm @submit="handleSubmit" />
        <NoticeAlert :message="noticeMsg" :visible="noticeVisible" />
      </div>

      <div class="hydrants-panel hydrants-panel--list">
        <div class="panel-head panel-head--row">
          <div>
            <span class="panel-head__eyebrow">Inventario</span>
            <h2 class="panel-head__title">Listado de hidrantes</h2>
          </div>

          <div class="panel-chip">
            {{ hydrants.length }} registro<span v-if="hydrants.length !== 1">s</span>
          </div>
        </div>

        <div class="search-wrap">
          <HydrantSearch v-model="q" @search="loadHydrants" />
        </div>

        <div class="panel-actions">
          <button class="btn btn--primary" @click="loadHydrants">
            Cargar listado
          </button>
        </div>

        <div class="list-wrap">
          <HydrantList :hydrants="hydrants" />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.hydrants-view {
  --hv-bg: var(--app-bg, #f6f9fc);
  --hv-bg-soft: var(--surface-0, #eef4f8);
  --hv-surface: var(--card-bg, rgba(255, 255, 255, 0.88));
  --hv-surface-strong: var(--card-bg, rgba(255, 255, 255, 0.96));
  --hv-border: var(--card-border, rgba(15, 61, 99, 0.10));
  --hv-text: var(--text-color, #0f3d63);
  --hv-text-soft: var(--muted, #5f7486);
  --hv-primary: var(--primary, #0f5c8a);
  --hv-primary-2: var(--primary-2, #1282a8);
  --hv-accent: var(--accent, #18a0c6);
  --hv-shadow: 0 14px 32px rgba(15, 61, 99, 0.08);
  --hv-shadow-lg: 0 20px 46px rgba(15, 61, 99, 0.12);

  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px;
  min-height: 100%;
  background: linear-gradient(180deg, var(--hv-bg) 0%, var(--hv-bg-soft) 100%);
  color: var(--hv-text);
}

.hydrants-hero {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid var(--hv-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--hv-bg) 92%, white 8%) 0%, var(--hv-bg) 100%);
  box-shadow: var(--hv-shadow);
}

.hydrants-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--hv-accent) 10%, transparent), transparent 28%),
    radial-gradient(circle at left center, color-mix(in srgb, var(--hv-primary) 10%, transparent), transparent 35%);
  pointer-events: none;
}

.hydrants-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04));
  pointer-events: none;
}

.hydrants-hero__content {
  position: relative;
  z-index: 1;
  padding: 28px 24px;
}

.hydrants-hero__badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--hv-accent) 10%, white 90%);
  border: 1px solid color-mix(in srgb, var(--hv-accent) 16%, transparent);
  color: var(--hv-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.hydrants-hero__title {
  margin: 0 0 10px;
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  font-weight: 800;
  line-height: 1.1;
  color: var(--hv-text);
}

.hydrants-hero__subtitle {
  margin: 0;
  max-width: 780px;
  color: var(--hv-text-soft);
  line-height: 1.75;
  font-size: 1rem;
}

.hydrants-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 22px;
  align-items: start;
}

.hydrants-panel {
  border-radius: 24px;
  border: 1px solid var(--hv-border);
  background: var(--hv-surface);
  backdrop-filter: blur(10px);
  box-shadow: var(--hv-shadow);
  padding: 22px;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.hydrants-panel:hover {
  box-shadow: var(--hv-shadow-lg);
}

.hydrants-panel--form {
  position: sticky;
  top: 20px;
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
  color: var(--hv-accent);
}

.panel-head__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--hv-text);
}

.panel-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--hv-primary) 8%, white 92%);
  border: 1px solid color-mix(in srgb, var(--hv-primary) 14%, transparent);
  color: var(--hv-primary);
  font-size: 0.86rem;
  font-weight: 700;
  white-space: nowrap;
}

.search-wrap {
  margin-bottom: 14px;
}

.panel-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
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
}

.btn--primary {
  background: linear-gradient(135deg, var(--hv-primary) 0%, var(--hv-primary-2) 100%);
  color: #fff;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--hv-primary) 24%, transparent);
}

.btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--hv-primary) 30%, transparent);
}

.list-wrap {
  border-radius: 18px;
  padding: 8px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--hv-bg-soft) 72%, white 28%) 0%, transparent 100%);
}

/* Dark mode */
.dark .hydrants-view {
  --hv-bg: var(--app-bg, #0b1220);
  --hv-bg-soft: var(--surface-0, #111827);
  --hv-surface: rgba(17, 24, 39, 0.78);
  --hv-surface-strong: rgba(17, 24, 39, 0.92);
  --hv-border: rgba(255,255,255,0.08);
  --hv-text: var(--text-color, #e8f0f8);
  --hv-text-soft: var(--muted, #9eb0c3);
  --hv-primary: var(--primary, #3b82f6);
  --hv-primary-2: var(--primary-2, #2563eb);
  --hv-accent: var(--accent, #22c1dc);
  --hv-shadow: 0 16px 32px rgba(0, 0, 0, 0.24);
  --hv-shadow-lg: 0 20px 42px rgba(0, 0, 0, 0.32);
}

.dark .hydrants-hero,
.dark .hydrants-panel {
  box-shadow: var(--hv-shadow);
}

.dark .hydrants-hero__overlay {
  background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
}

@media (max-width: 1024px) {
  .hydrants-layout {
    grid-template-columns: 1fr;
  }

  .hydrants-panel--form {
    position: static;
  }
}

@media (max-width: 768px) {
  .hydrants-view {
    padding: 16px;
    gap: 18px;
  }

  .hydrants-hero__content,
  .hydrants-panel {
    padding: 18px;
  }

  .panel-actions {
    flex-direction: column;
  }

  .btn--primary {
    width: 100%;
  }
}
</style>