<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useOfflineSync } from '@/composables/useOfflineSync'
import type { LeakCreatePayload } from '@/types/leak'
import LeakForm from '@/components/leaks/LeakForm.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'

const { addToQueue, syncAll } = useOfflineSync()

const noticeMsg = ref('')
const noticeVisible = ref(false)
const lastCreated = ref<any>(null)

function showNotice(msg: string) {
  noticeMsg.value = msg
  noticeVisible.value = true
  setTimeout(() => { noticeVisible.value = false }, 4000)
}

async function handleSubmit(payload: LeakCreatePayload, photo: File | null) {
  if (!navigator.onLine) {
    const offId = Date.now()
    await addToQueue({ type: 'LEAK', payload })
    lastCreated.value = { ...payload, id: `LOCAL_${offId}`, status: 'PENDIENTE' }
    showNotice('Sin conexión a internet. Los datos se guardaron localmente.')
    return
  }

  // 1. Insert Record
  const { data: created, error } = await supabase
    .from('leaks')
    .insert(payload)
    .select()
    .single()

  if (!error && created) {
    // 2. Upload Photo if exists
    if (photo) {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${created.id}_${Date.now()}.${fileExt}`
      const filePath = `leaks/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('leaks')
        .upload(filePath, photo)

      if (!uploadError) {
        // 3. Update record with photo path
        await supabase
          .from('leaks')
          .update({ photo_path: filePath })
          .eq('id', created.id)
      }
    }
    lastCreated.value = created
    showNotice(`Fuga registrada exitosamente (ID ${created.id}).`)
  } else {
    const offId = Date.now()
    await addToQueue({ type: 'LEAK', payload })
    lastCreated.value = { ...payload, id: `LOCAL_${offId}`, status: 'PENDIENTE' }
    showNotice('Error enviando datos. Guardado de forma local.')
  }
}
</script>

<template>
  <main class="leaks-view">
    <section class="leaks-hero">
      <div class="leaks-hero__overlay"></div>

      <div class="leaks-hero__content">
        <div class="leaks-hero__badge">Gestión de incidencias</div>

        <h1 class="leaks-hero__title">Registro de fugas</h1>

        <p class="leaks-hero__subtitle">
          Reporta fugas con información operativa, conserva continuidad en trabajo de campo
          y sincroniza los datos cuando la conexión esté disponible.
        </p>

        <div class="leaks-hero__chips">
          <span class="leaks-chip leaks-chip--danger">Registro de incidentes</span>
          <span class="leaks-chip leaks-chip--accent">Carga de evidencia</span>
          <span class="leaks-chip leaks-chip--neutral">Sincronización offline</span>
        </div>
      </div>
    </section>

    <section class="leaks-layout">
      <div class="leaks-panel leaks-panel--form">
        <div class="panel-head">
          <span class="panel-head__eyebrow">Formulario</span>
          <h2 class="panel-head__title">Nueva fuga</h2>
        </div>

        <LeakForm v-if="!lastCreated" @submit="handleSubmit" @sync="syncAll" />
        
        <div v-else class="notice notice--success" style="padding: 24px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 16px;">✅</div>
          <h3 style="margin-bottom: 8px;">¡Fuga registrada exitosamente!</h3>
          <p style="margin-bottom: 20px; color: var(--text-secondary);">
            El reporte ha sido guardado con el ID <strong>#{{ lastCreated.id }}</strong>.
          </p>
          
          <div class="flex gap-3 justify-center" style="justify-content: center;">
            <button class="btn" @click="lastCreated = null">Registrar otra</button>
            <a 
              :href="`https://wa.me/?text=${encodeURIComponent(`📢 *REPORTE DE FUGA ESSMAR*\n\n*ID:* ${lastCreated.id}\n*OT:* ${lastCreated.work_order || 'N/A'}\n*Dirección:* ${lastCreated.address}\n*Sector:* ${lastCreated.sector || 'N/A'}\n*Estado:* ${lastCreated.status}\n\n_Generado desde SIGVI_`)}`"
              target="_blank"
              class="btn-accent"
              style="background: #25d366;"
            >
              Compartir WhatsApp
            </a>
          </div>
        </div>

        <NoticeAlert :message="noticeMsg" :visible="noticeVisible" />
      </div>

      <div class="leaks-side">
        <div class="leaks-panel">
          <div class="panel-head">
            <span class="panel-head__eyebrow">Mensajería</span>
            <h2 class="panel-head__title">WhatsApp / Chatbot (demo)</h2>
          </div>

          <p class="panel-note">
            La integración con WhatsApp se migrará próximamente a Supabase Edge Functions.
          </p>

          <div class="demo-info">
            <div class="demo-info__item">
              <span class="demo-info__dot demo-info__dot--danger"></span>
              <div>
                <strong>Registro asistido</strong>
                <p>Permitirá reportar incidencias desde canales conversacionales.</p>
              </div>
            </div>

            <div class="demo-info__item">
              <span class="demo-info__dot demo-info__dot--accent"></span>
              <div>
                <strong>Automatización futura</strong>
                <p>La lógica operativa se moverá a funciones serverless para mejor integración.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="leaks-panel leaks-panel--info">
          <div class="panel-head">
            <span class="panel-head__eyebrow">Modo operativo</span>
            <h2 class="panel-head__title">Continuidad del servicio</h2>
          </div>

          <div class="status-list">
            <div class="status-item">
              <span class="status-item__dot status-item__dot--success"></span>
              <div>
                <strong>Registro inmediato</strong>
                <p>Si hay conexión, la fuga se almacena directamente en la base de datos.</p>
              </div>
            </div>

            <div class="status-item">
              <span class="status-item__dot status-item__dot--warning"></span>
              <div>
                <strong>Guardado local</strong>
                <p>Si falla la conexión, los datos quedan en cola para no perder el reporte.</p>
              </div>
            </div>

            <div class="status-item">
              <span class="status-item__dot status-item__dot--danger"></span>
              <div>
                <strong>Evidencia fotográfica</strong>
                <p>Cuando hay imagen, se sube al almacenamiento y se vincula al registro creado.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.leaks-view {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px;
  min-height: 100%;
  background: transparent;
  color: var(--text);
}

.leaks-hero {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid var(--stroke);
  background: #ffffff;
  box-shadow: var(--shadow-md);
}

.leaks-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--danger) 8%, transparent), transparent 28%),
    radial-gradient(circle at left center, color-mix(in srgb, var(--primary) 10%, transparent), transparent 35%);
  pointer-events: none;
}

.leaks-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04));
  pointer-events: none;
}

.leaks-hero__content {
  position: relative;
  z-index: 1;
  padding: 28px 24px;
}

.leaks-hero__badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  color: var(--danger);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.leaks-hero__title {
  margin: 0 0 10px;
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  font-weight: 800;
  line-height: 1.1;
  color: #000000;
}

.leaks-hero__subtitle {
  margin: 0;
  max-width: 780px;
  color: #475569;
  line-height: 1.75;
  font-size: 1rem;
}

.leaks-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.leaks-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.83rem;
  font-weight: 700;
  border: 1px solid var(--stroke);
  background: var(--bg-subtle);
  color: #1e293b;
}

.leaks-chip--danger {
  background: color-mix(in srgb, var(--danger) 8%, white 92%);
  color: var(--danger);
}

.leaks-chip--accent {
  background: color-mix(in srgb, var(--accent) 10%, white 90%);
  color: var(--accent);
}

.leaks-chip--neutral {
  background: color-mix(in srgb, var(--bg-subtle) 75%, white 25%);
  color: var(--muted);
}

.leaks-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 22px;
  align-items: start;
}

.leaks-side {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.leaks-panel {
  border-radius: 24px;
  border: 1px solid var(--stroke);
  background: var(--card);
  backdrop-filter: blur(10px);
  box-shadow: var(--lv-shadow);
  padding: 22px;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.leaks-panel:hover {
  box-shadow: var(--lv-shadow-lg);
}

.leaks-panel--form {
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
  color: var(--accent);
}

.panel-head__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
}

.panel-note {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
  font-size: 0.94rem;
}

.demo-info {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
}

.demo-info__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-subtle) 70%, white 30%) 0%, transparent 100%);
}

.demo-info__item strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text);
  font-size: 0.95rem;
}

.demo-info__item p {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
  font-size: 0.9rem;
}

.demo-info__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.demo-info__dot--danger {
  background: var(--danger);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--danger) 16%, transparent);
}

.demo-info__dot--accent {
  background: var(--accent);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 16%, transparent);
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
  border: 1px solid var(--stroke);
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-subtle) 70%, white 30%) 0%, transparent 100%);
}

.status-item strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text);
  font-size: 0.95rem;
}

.status-item p {
  margin: 0;
  color: var(--muted);
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
  background: var(--success);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 18%, transparent);
}

.status-item__dot--warning {
  background: var(--warning);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--warning) 18%, transparent);
}

.status-item__dot--danger {
  background: var(--danger);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--danger) 18%, transparent);
}

.dark .leaks-hero {
  background: #182035;
}
.dark .leaks-hero__title {
  color: #ffffff;
}
.dark .leaks-hero__subtitle {
  color: var(--text-secondary);
}
.dark .leaks-chip {
  color: var(--text);
}
:global(.dark) .leaks-hero__overlay,
:global([data-theme="dark"]) .leaks-hero__overlay {
  background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
}

@media (max-width: 1024px) {
  .leaks-layout {
    grid-template-columns: 1fr;
  }

  .leaks-panel--form {
    position: static;
  }
}

@media (max-width: 768px) {
  .leaks-view {
    padding: 16px;
    gap: 18px;
  }

  .leaks-hero__content,
  .leaks-panel {
    padding: 18px;
  }
}
</style>