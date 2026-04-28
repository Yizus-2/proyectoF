<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useOfflineSync } from '@/composables/useOfflineSync'
import type { PressureCreatePayload } from '@/types/pressure'
import PressureForm from '@/components/pressures/PressureForm.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'

const { addToQueue, syncAll } = useOfflineSync()

const noticeMsg = ref('')
const noticeVisible = ref(false)

function showNotice(msg: string) {
  noticeMsg.value = msg
  noticeVisible.value = true
  setTimeout(() => { noticeVisible.value = false }, 4000)
}

async function handleSubmit(payload: PressureCreatePayload) {
  if (!navigator.onLine) {
    await addToQueue({ type: 'PRESSURE', payload })
    showNotice('Sin conexión a internet. Los datos se guardaron localmente.')
    return
  }

  const { data, error } = await supabase
    .from('pressure_readings')
    .insert(payload)
    .select()
    .single()

  if (!error && data) {
    showNotice(`Medición registrada exitosamente (ID ${data.id}).`)
  } else {
    await addToQueue({ type: 'PRESSURE', payload })
    showNotice('Error enviando datos. Guardado de forma local.')
  }
}
</script>

<template>
  <main class="pressure-view">
    <section class="pressure-hero">
      <div class="pressure-hero__overlay"></div>

      <div class="pressure-hero__content">
        <div class="pressure-hero__badge">Control operativo</div>

        <h1 class="pressure-hero__title">Registro de mediciones de presión</h1>

        <p class="pressure-hero__subtitle">
          Gestiona lecturas de presión asociadas a hidrantes, mantén continuidad operativa
          en campo y conserva los datos incluso cuando no haya conexión a internet.
        </p>

        <div class="pressure-hero__chips">
          <span class="pressure-chip pressure-chip--primary">Registro en línea</span>
          <span class="pressure-chip pressure-chip--accent">Sincronización offline</span>
          <span class="pressure-chip pressure-chip--neutral">Soporte operativo</span>
        </div>
      </div>
    </section>

    <section class="pressure-layout">
      <div class="pressure-panel pressure-panel--form">
        <div class="panel-head">
          <span class="panel-head__eyebrow">Formulario</span>
          <h2 class="panel-head__title">Nueva medición</h2>
        </div>

        <PressureForm @submit="handleSubmit" @sync="syncAll" />
        <NoticeAlert :message="noticeMsg" :visible="noticeVisible" />
      </div>

      <div class="pressure-side">
        <div class="pressure-panel">
          <div class="panel-head">
            <span class="panel-head__eyebrow">Mensajería</span>
            <h2 class="panel-head__title">WhatsApp / Chatbot (demo)</h2>
          </div>

          <div class="demo-block">
            <div class="demo-block__label">Ejemplo de entrada</div>
            <pre class="demo-code">PRESION; hidrante=H-100; valor=35; usuario=Operario 1; fecha=2026-02-10T10:00:00</pre>
          </div>

          <p class="panel-note">
            La integración de WhatsApp se migrará a Supabase Edge Functions.
          </p>
        </div>

        <div class="pressure-panel pressure-panel--info">
          <div class="panel-head">
            <span class="panel-head__eyebrow">Modo operativo</span>
            <h2 class="panel-head__title">Continuidad del servicio</h2>
          </div>

          <div class="status-list">
            <div class="status-item">
              <span class="status-item__dot status-item__dot--success"></span>
              <div>
                <strong>Registro inmediato</strong>
                <p>Si hay conexión, la lectura se envía directamente a la base de datos.</p>
              </div>
            </div>

            <div class="status-item">
              <span class="status-item__dot status-item__dot--warning"></span>
              <div>
                <strong>Respaldo local</strong>
                <p>Si no hay internet, la información se guarda localmente para no perderse.</p>
              </div>
            </div>

            <div class="status-item">
              <span class="status-item__dot status-item__dot--primary"></span>
              <div>
                <strong>Sincronización posterior</strong>
                <p>Los datos pendientes pueden enviarse después cuando la conexión se restablezca.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.pressure-view {
  --pv-bg: var(--app-bg, #f6f9fc);
  --pv-bg-soft: var(--surface-0, #eef4f8);
  --pv-surface: var(--card-bg, rgba(255, 255, 255, 0.88));
  --pv-surface-strong: var(--card-bg, rgba(255, 255, 255, 0.96));
  --pv-border: var(--card-border, rgba(15, 61, 99, 0.10));
  --pv-text: var(--text-color, #0f3d63);
  --pv-text-soft: var(--muted, #5f7486);
  --pv-primary: var(--primary, #0f5c8a);
  --pv-primary-2: var(--primary-2, #1282a8);
  --pv-accent: var(--accent, #18a0c6);
  --pv-warning: var(--warning, #f59e0b);
  --pv-success: var(--success, #10b981);
  --pv-shadow: 0 14px 32px rgba(15, 61, 99, 0.08);
  --pv-shadow-lg: 0 20px 46px rgba(15, 61, 99, 0.12);

  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px;
  min-height: 100%;
  background: linear-gradient(180deg, var(--pv-bg) 0%, var(--pv-bg-soft) 100%);
  color: var(--pv-text);
}

.pressure-hero {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid var(--pv-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--pv-bg) 92%, white 8%) 0%, var(--pv-bg) 100%);
  box-shadow: var(--pv-shadow);
}

.pressure-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--pv-accent) 10%, transparent), transparent 28%),
    radial-gradient(circle at left center, color-mix(in srgb, var(--pv-primary) 10%, transparent), transparent 35%);
  pointer-events: none;
}

.pressure-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04));
  pointer-events: none;
}

.pressure-hero__content {
  position: relative;
  z-index: 1;
  padding: 28px 24px;
}

.pressure-hero__badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pv-accent) 10%, white 90%);
  border: 1px solid color-mix(in srgb, var(--pv-accent) 16%, transparent);
  color: var(--pv-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.pressure-hero__title {
  margin: 0 0 10px;
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  font-weight: 800;
  line-height: 1.1;
  color: var(--pv-text);
}

.pressure-hero__subtitle {
  margin: 0;
  max-width: 780px;
  color: var(--pv-text-soft);
  line-height: 1.75;
  font-size: 1rem;
}

.pressure-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.pressure-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.83rem;
  font-weight: 700;
  border: 1px solid var(--pv-border);
  background: var(--pv-surface-strong);
  color: var(--pv-text);
}

.pressure-chip--primary {
  background: color-mix(in srgb, var(--pv-primary) 8%, white 92%);
  color: var(--pv-primary);
}

.pressure-chip--accent {
  background: color-mix(in srgb, var(--pv-accent) 10%, white 90%);
  color: var(--pv-accent);
}

.pressure-chip--neutral {
  background: color-mix(in srgb, var(--pv-bg-soft) 75%, white 25%);
  color: var(--pv-text-soft);
}

.pressure-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 22px;
  align-items: start;
}

.pressure-side {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.pressure-panel {
  border-radius: 24px;
  border: 1px solid var(--pv-border);
  background: var(--pv-surface);
  backdrop-filter: blur(10px);
  box-shadow: var(--pv-shadow);
  padding: 22px;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.pressure-panel:hover {
  box-shadow: var(--pv-shadow-lg);
}

.pressure-panel--form {
  position: sticky;
  top: 20px;
}

.panel-head {
  margin-bottom: 18px;
}

.panel-head__eyebrow {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pv-accent);
}

.panel-head__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--pv-text);
}

.demo-block {
  border-radius: 18px;
  border: 1px solid var(--pv-border);
  background: linear-gradient(180deg, color-mix(in srgb, var(--pv-bg-soft) 72%, white 28%) 0%, transparent 100%);
  padding: 16px;
}

.demo-block__label {
  margin-bottom: 10px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pv-text-soft);
}

.demo-code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--pv-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.panel-note {
  margin: 14px 0 0;
  color: var(--pv-text-soft);
  line-height: 1.7;
  font-size: 0.94rem;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.status-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 14px;
  border-radius: 16px;
  border: 1px solid var(--pv-border);
  background: linear-gradient(180deg, color-mix(in srgb, var(--pv-bg-soft) 70%, white 30%) 0%, transparent 100%);
}

.status-item strong {
  display: block;
  margin-bottom: 4px;
  color: var(--pv-text);
  font-size: 0.95rem;
}

.status-item p {
  margin: 0;
  color: var(--pv-text-soft);
  line-height: 1.65;
  font-size: 0.9rem;
}

.status-item__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.status-item__dot--success {
  background: var(--pv-success);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--pv-success) 18%, transparent);
}

.status-item__dot--warning {
  background: var(--pv-warning);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--pv-warning) 18%, transparent);
}

.status-item__dot--primary {
  background: var(--pv-primary);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--pv-primary) 18%, transparent);
}

/* Dark mode */
.dark .pressure-view {
  --pv-bg: var(--app-bg, #0b1220);
  --pv-bg-soft: var(--surface-0, #111827);
  --pv-surface: rgba(17, 24, 39, 0.78);
  --pv-surface-strong: rgba(17, 24, 39, 0.92);
  --pv-border: rgba(255,255,255,0.08);
  --pv-text: var(--text-color, #e8f0f8);
  --pv-text-soft: var(--muted, #9eb0c3);
  --pv-primary: var(--primary, #3b82f6);
  --pv-primary-2: var(--primary-2, #2563eb);
  --pv-accent: var(--accent, #22c1dc);
  --pv-warning: var(--warning, #f5b041);
  --pv-success: var(--success, #34d399);
  --pv-shadow: 0 16px 32px rgba(0, 0, 0, 0.24);
  --pv-shadow-lg: 0 20px 42px rgba(0, 0, 0, 0.32);
}

.dark .pressure-hero__overlay {
  background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
}

@media (max-width: 1024px) {
  .pressure-layout {
    grid-template-columns: 1fr;
  }

  .pressure-panel--form {
    position: static;
  }
}

@media (max-width: 768px) {
  .pressure-view {
    padding: 16px;
    gap: 18px;
  }

  .pressure-hero__content,
  .pressure-panel {
    padding: 18px;
  }
}
</style>