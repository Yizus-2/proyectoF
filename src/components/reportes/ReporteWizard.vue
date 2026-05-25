<script setup lang="ts">
import { useReporteForm } from '@/composables/useReporteForm'
import StepperIndicator from './ui/StepperIndicator.vue'
import StepCategoriaDescripcion from './steps/StepCategoriaDescripcion.vue'
import StepUbicacion from './steps/StepUbicacion.vue'
import StepContactoConfirmacion from './steps/StepContactoConfirmacion.vue'

const { state } = useReporteForm()
</script>

<template>
  <div class="wizard-container glass-card">
    <StepperIndicator />
    
    <div class="wizard-content">
      <KeepAlive>
        <StepCategoriaDescripcion v-if="state.pasoActual === 1" />
        <StepUbicacion v-else-if="state.pasoActual === 2" />
        <StepContactoConfirmacion v-else-if="state.pasoActual === 3" />
      </KeepAlive>
    </div>
  </div>
</template>

<style scoped>
.wizard-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
}

.wizard-content {
  margin-top: 24px;
  min-height: 400px;
}

.glass-card {
  background: color-mix(in srgb, var(--card) 85%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
</style>
