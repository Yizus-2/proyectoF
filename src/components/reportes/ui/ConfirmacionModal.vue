<script setup lang="ts">
import { AlertTriangle, CheckCircle2, X } from 'lucide-vue-next'

const props = defineProps<{
  show: boolean
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay">
      <div class="modal-dialog">
        <button class="close-btn" @click="!isSubmitting && emit('cancel')" :disabled="isSubmitting">
          <X size="20" />
        </button>

        <div class="modal-icon">
          <AlertTriangle size="32" class="text-warning" />
        </div>

        <h2 class="modal-title">¿Enviar Reporte Ciudadano?</h2>
        <p class="modal-desc">
          Por favor confirme que los datos y la ubicación son correctos. 
          <strong>Una vez enviado, no podrá modificar la información.</strong>
        </p>

        <div class="modal-actions">
          <button 
            class="btn-cancel" 
            @click="emit('cancel')" 
            :disabled="isSubmitting"
          >
            Revisar de nuevo
          </button>
          
          <button 
            class="btn-confirm" 
            @click="emit('confirm')" 
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="spinner-small"></span>
            <CheckCircle2 v-else size="18" />
            {{ isSubmitting ? 'Enviando...' : 'Sí, Enviar Reporte' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-dialog {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  padding: 32px;
  width: 100%;
  max-width: 450px;
  position: relative;
  box-shadow: var(--shadow-lg);
  animation: modal-enter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes modal-enter {
  0% { opacity: 0; transform: scale(0.9) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-subtle);
  color: var(--text);
}

.modal-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.text-warning {
  color: #f59e0b;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 800;
  text-align: center;
  margin: 0 0 12px 0;
  color: var(--text);
}

.modal-desc {
  font-size: 0.95rem;
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  color: var(--text);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--stroke);
}

.btn-confirm {
  background: var(--primary);
  border: none;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary) 85%, black);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
