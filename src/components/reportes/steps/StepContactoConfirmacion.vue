<script setup lang="ts">
import { ref } from 'vue'
import { useReporteForm } from '@/composables/useReporteForm'
import ResumenReporte from '../ui/ResumenReporte.vue'
import ConfirmacionModal from '../ui/ConfirmacionModal.vue'

const { state, paso3Valido, pasoAnterior, enviarReporte, resetearFormulario } = useReporteForm()

const canales = [
  { id: 'app_movil', label: 'App', icon: '📱' },
  { id: 'web', label: 'Web', icon: '💻' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'telefono', label: 'Teléfono', icon: '📞' },
  { id: 'correo', label: 'Correo', icon: '📧' },
  { id: 'presencial', label: 'Presencial', icon: '🏢' },
  { id: 'emergencia', label: 'Emergencia', icon: '🚨' }
]

const showModal = ref(false)
const isSubmitting = ref(false)
const isSuccess = ref(false)

function onInputPhone(e: Event) {
  const input = e.target as HTMLInputElement
  let val = input.value
  
  if (!val.startsWith('+57')) {
    val = '+57' + val.replace(/\D/g, '')
  }
  
  state.value.paso3.telefono = val
}

async function handleConfirm() {
  isSubmitting.value = true
  try {
    await enviarReporte()
    isSuccess.value = true
    showModal.value = false
    // Emitir o resetear dependiendo de lo que quiera el sistema
    setTimeout(() => {
      // resetearFormulario()
      // En un flujo real redirigimos a la bandeja o mostramos success state.
      alert('Reporte enviado correctamente.')
      window.location.reload()
    }, 1500)
  } catch (error: any) {
    alert('Error al enviar: ' + error.message)
    isSubmitting.value = false
    showModal.value = false
  }
}
</script>

<template>
  <div class="step-container" v-if="!isSuccess">
    <div class="step-header">
      <h2 class="step-title">Paso 3 de 3: ¿Cómo te contactamos?</h2>
      <p class="step-subtitle">Déjanos tus datos para notificarte cuando el problema esté resuelto.</p>
    </div>

    <!-- Canal -->
    <div class="form-group">
      <label class="form-label">Canal de reporte <span class="required">*</span></label>
      <div class="channels-grid">
        <button 
          v-for="c in canales" 
          :key="c.id"
          class="channel-btn"
          :class="{ active: state.paso3.canal === c.id }"
          @click="state.paso3.canal = c.id as any"
        >
          <span class="channel-icon">{{ c.icon }}</span>
          <span class="channel-label">{{ c.label }}</span>
        </button>
      </div>
      <div class="help-text text-success">
        ✓ Canal autodetectado, pero puedes cambiarlo si reportas a nombre de otra persona.
      </div>
    </div>

    <!-- Contacto -->
    <div class="form-row">
      <div class="form-group flex-2">
        <label class="form-label">Nombre completo <span class="required">*</span></label>
        <input 
          v-model="state.paso3.nombre"
          type="text"
          class="form-input"
          placeholder="Ej: Juan Pérez"
        />
      </div>

      <div class="form-group flex-1">
        <label class="form-label">Teléfono <span class="required">*</span></label>
        <input 
          :value="state.paso3.telefono"
          @input="onInputPhone"
          type="tel"
          class="form-input"
          placeholder="+57 300 123 4567"
          maxlength="13"
        />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Correo electrónico (opcional)</label>
      <input 
        v-model="state.paso3.email"
        type="email"
        class="form-input"
        placeholder="juan@ejemplo.com"
      />
    </div>

    <!-- Resumen -->
    <ResumenReporte />

    <!-- Acciones -->
    <div class="step-actions">
      <button class="btn-prev" @click="pasoAnterior">
        ← Anterior
      </button>
      <button 
        class="btn-submit" 
        :disabled="!paso3Valido"
        @click="showModal = true"
      >
        Enviar Reporte ✓
      </button>
    </div>

    <ConfirmacionModal 
      :show="showModal"
      :is-submitting="isSubmitting"
      @confirm="handleConfirm"
      @cancel="showModal = false"
    />
  </div>

  <div class="success-container" v-else>
    <div class="success-icon">✓</div>
    <h2>¡Reporte Enviado!</h2>
    <p>El reporte ha ingresado a nuestra bandeja operativa y se ha notificado a los supervisores disponibles.</p>
  </div>
</template>

<style scoped>
.step-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step-header {
  border-bottom: 1px solid var(--stroke);
  padding-bottom: 16px;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  color: var(--text);
}

.step-subtitle {
  color: var(--muted);
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.flex-1 { flex: 1; min-width: 150px; }
.flex-2 { flex: 2; min-width: 250px; }

.form-label {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
}

.required {
  color: #ef4444;
}

.help-text {
  font-size: 0.8rem;
  margin-top: 4px;
}

.text-success {
  color: var(--emerald);
}

.form-input {
  width: 100%;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}

.channels-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.channel-btn {
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  padding: 8px 16px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.channel-btn:hover {
  background: var(--card);
  border-color: var(--muted);
}

.channel-btn.active {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}
.dark .channel-btn.active {
  color: var(--primary-light);
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid var(--stroke);
}

.btn-prev {
  background: var(--bg-subtle);
  color: var(--text);
  border: 1px solid var(--stroke);
  padding: 14px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-prev:hover {
  background: var(--stroke);
}

.btn-submit {
  background: var(--emerald);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: var(--radius-full);
  font-weight: 800;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--emerald) 40%, transparent);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}

.success-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  gap: 16px;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: var(--emerald);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
}
</style>
