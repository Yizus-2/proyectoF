<script setup lang="ts">
import { useReporteForm } from '@/composables/useReporteForm'
import { Check } from 'lucide-vue-next'

const { state } = useReporteForm()

const steps = [
  { id: 1, title: '¿Qué pasó?' },
  { id: 2, title: '¿Dónde ocurrió?' },
  { id: 3, title: '¿Contacto?' }
]
</script>

<template>
  <div class="stepper-container">
    <div class="stepper-track">
      <div 
        class="stepper-progress" 
        :style="{ width: `${((state.pasoActual - 1) / (steps.length - 1)) * 100}%` }"
      ></div>
    </div>
    
    <div class="stepper-steps">
      <div 
        v-for="step in steps" 
        :key="step.id"
        class="step-item"
        :class="{ 
          'is-active': state.pasoActual === step.id,
          'is-completed': state.pasoActual > step.id
        }"
      >
        <div class="step-circle">
          <Check v-if="state.pasoActual > step.id" size="16" stroke-width="3" />
          <span v-else>{{ step.id }}</span>
        </div>
        <span class="step-label">{{ step.title }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stepper-container {
  position: relative;
  margin-bottom: 32px;
  padding: 0 16px;
}

.stepper-track {
  position: absolute;
  top: 16px;
  left: 32px;
  right: 32px;
  height: 4px;
  background: var(--bg-subtle);
  border-radius: 2px;
  z-index: 1;
}

.stepper-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.stepper-steps {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100px;
}

.step-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--card);
  border: 2px solid var(--stroke);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--muted);
  transition: all 0.3s ease;
}

.step-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  text-align: center;
  transition: color 0.3s ease;
}

/* Active State */
.step-item.is-active .step-circle {
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 15%, transparent);
}

.step-item.is-active .step-label {
  color: var(--text);
}

/* Completed State */
.step-item.is-completed .step-circle {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.step-item.is-completed .step-label {
  color: var(--text);
}
</style>
