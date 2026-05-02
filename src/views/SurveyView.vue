<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const trackingCode = route.params.code as string

const loading = ref(true)
const submitting = ref(false)
const errorMsg = ref('')
const success = ref(false)

const reportData = ref<{ id: number, category: string, status: string, address: string } | null>(null)

const form = ref({
  score: 0,
  comment: ''
})

async function fetchReport() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('id, category, status, address')
      .eq('tracking_code', trackingCode)
      .single()

    if (error) throw error
    reportData.value = data

    // Si ya está evaluado, mostramos éxito directamente o bloqueamos
    if (data.status === 'EVALUADO') {
      errorMsg.value = 'Este reporte ya ha sido evaluado previamente. ¡Gracias!'
    } else if (data.status !== 'CERRADO') {
      errorMsg.value = 'Este reporte aún no está cerrado o no requiere evaluación.'
    }
  } catch (e: any) {
    console.error(e)
    errorMsg.value = 'No se encontró el reporte o código inválido.'
  } finally {
    loading.value = false
  }
}

async function submitSurvey() {
  if (form.value.score === 0) {
    alert('Por favor selecciona una calificación de 1 a 5 estrellas.')
    return
  }
  
  submitting.value = true
  try {
    const { error } = await supabase.from('ratings').insert({
      report_id: reportData.value!.id,
      score: form.value.score,
      comment: form.value.comment || null
    })

    if (error) throw error
    success.value = true
  } catch (e: any) {
    console.error(e)
    alert('Error al enviar la encuesta: ' + e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (trackingCode) fetchReport()
  else errorMsg.value = 'No se proporcionó código de seguimiento.'
})
</script>

<template>
  <main class="survey-layout">
    <div class="survey-card card">
      <div class="survey-header">
        <div class="survey-logo">⭐</div>
        <h1>Encuesta de Satisfacción</h1>
        <p class="subtitle">Tu opinión nos ayuda a mejorar el servicio de ESSMAR.</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Buscando reporte...</p>
      </div>

      <div v-else-if="success" class="success-state">
        <div class="success-icon">✓</div>
        <h2>¡Gracias por tu tiempo!</h2>
        <p>Tus respuestas han sido registradas exitosamente. El reporte ha sido marcado como EVALUADO.</p>
        <RouterLink to="/" class="btn-primary" style="margin-top: 20px; display: inline-block;">Volver al inicio</RouterLink>
      </div>

      <div v-else-if="errorMsg" class="error-state">
        <p>⚠️ {{ errorMsg }}</p>
        <RouterLink to="/" class="link-accent">Volver al inicio</RouterLink>
      </div>

      <div v-else-if="reportData" class="survey-content">
        <div class="report-summary">
          <p><strong>Reporte:</strong> {{ trackingCode }}</p>
          <p><strong>Categoría:</strong> <span style="text-transform: capitalize;">{{ reportData.category.replace('_', ' ') }}</span></p>
          <p><strong>Ubicación:</strong> {{ reportData.address }}</p>
        </div>

        <form @submit.prevent="submitSurvey" class="survey-form">
          <div class="rating-group">
            <label>¿Cómo calificas la atención y solución del daño?</label>
            <div class="stars">
              <button 
                v-for="star in 5" 
                :key="star" 
                type="button" 
                class="star-btn"
                :class="{ active: star <= form.score }"
                @click="form.score = star"
              >
                ★
              </button>
            </div>
            <div class="rating-labels">
              <span>Muy mala</span>
              <span>Excelente</span>
            </div>
          </div>

          <div class="field">
            <label for="comment">Comentarios adicionales (opcional)</label>
            <textarea id="comment" v-model="form.comment" rows="4" placeholder="Cuéntanos más sobre tu experiencia..."></textarea>
          </div>

          <button type="submit" class="btn-primary btn-submit" :disabled="submitting || form.score === 0">
            {{ submitting ? 'Enviando...' : 'Enviar Calificación' }}
          </button>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.survey-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 70px);
  padding: 24px 16px;
  background: var(--bg);
}

.survey-card {
  width: 100%;
  max-width: 500px;
  padding: 40px 32px;
  border-radius: 24px;
}

.survey-header {
  text-align: center;
  margin-bottom: 32px;
}

.survey-logo {
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.survey-header h1 {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0 0 8px;
}

.subtitle {
  color: var(--muted);
  font-size: 0.95rem;
  margin: 0;
}

.report-summary {
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  font-size: 0.9rem;
}

.report-summary p {
  margin: 0 0 6px;
  color: var(--text-secondary);
}
.report-summary p:last-child {
  margin: 0;
}
.report-summary strong {
  color: var(--text);
}

.survey-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.rating-group {
  text-align: center;
}

.rating-group label {
  display: block;
  font-weight: 700;
  margin-bottom: 16px;
  font-size: 1.05rem;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-direction: row;
}

.star-btn {
  background: transparent;
  border: none;
  font-size: 2.5rem;
  color: var(--stroke);
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1;
  padding: 0;
}

.star-btn:hover, .star-btn.active {
  color: #f59e0b; /* Amber */
  transform: scale(1.1);
}

.rating-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--muted);
  max-width: 280px;
  margin-left: auto;
  margin-right: auto;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-weight: 600;
  font-size: 0.9rem;
}

.field textarea {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: var(--bg-subtle);
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
  resize: vertical;
}

.field textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-submit {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  font-size: 1.05rem;
}

.loading-state, .success-state, .error-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
  margin: 0 auto 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.success-icon {
  width: 64px;
  height: 64px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 2rem;
  margin: 0 auto 20px;
}
</style>
