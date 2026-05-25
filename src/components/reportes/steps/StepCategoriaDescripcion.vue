<script setup lang="ts">
import { useReporteForm } from '@/composables/useReporteForm'

const { state, paso1Valido, siguientePaso } = useReporteForm()

const categorias = [
  { id: 'fuga', label: 'Fuga de agua', icon: '💧' },
  { id: 'presion', label: 'Presión baja', icon: '🚰' },
  { id: 'hidrante', label: 'Hidrante dañado', icon: '🧯' },
  { id: 'infraestructura', label: 'Infraestructura', icon: '🏗️' }
]

const urgencias = [
  { id: 'critica', label: 'Crítico', icon: '🔴', desc: 'Peligro inminente / Daño masivo' },
  { id: 'alta', label: 'Alto', icon: '🟠', desc: 'Afectación significativa' },
  { id: 'media', label: 'Medio', icon: '🟡', desc: 'Problema moderado' },
  { id: 'baja', label: 'Bajo', icon: '🟢', desc: 'Daño menor / Estético' }
]
</script>

<template>
  <div class="step-container">
    <div class="step-header">
      <h2 class="step-title">Paso 1 de 3: ¿Qué está reportando?</h2>
      <p class="step-subtitle">Ayúdenos a clasificar el problema correctamente.</p>
    </div>

    <!-- Categoría -->
    <div class="form-group">
      <label class="form-label">Tipo de reporte <span class="required">*</span></label>
      <div class="grid-options">
        <button 
          v-for="cat in categorias" 
          :key="cat.id"
          class="option-btn"
          :class="{ active: state.paso1.tipo === cat.id }"
          @click="state.paso1.tipo = cat.id as any"
        >
          <span class="option-icon">{{ cat.icon }}</span>
          <span class="option-label">{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- Descripción -->
    <div class="form-group">
      <label class="form-label">
        Descripción del problema <span class="required">*</span>
      </label>
      <textarea 
        v-model="state.paso1.descripcion"
        class="form-textarea"
        placeholder="Ej: Hay agua brotando desde la calle con mucha presión..."
        rows="4"
        maxlength="500"
      ></textarea>
      <div class="char-counter" :class="{ 'text-error': state.paso1.descripcion.length > 0 && state.paso1.descripcion.length < 20 }">
        {{ state.paso1.descripcion.length }} / 500
        <span v-if="state.paso1.descripcion.length > 0 && state.paso1.descripcion.length < 20">
          (Mínimo 20 caracteres)
        </span>
      </div>
    </div>

    <!-- Urgencia -->
    <div class="form-group">
      <label class="form-label">
        Nivel de urgencia que USTED percibe <span class="required">*</span>
      </label>
      <p class="help-text">
        <span class="info-icon">ℹ️</span> Esto nos ayuda a priorizar. El supervisor validará el nivel final.
      </p>
      
      <div class="urgency-options">
        <button 
          v-for="u in urgencias" 
          :key="u.id"
          class="urgency-btn"
          :class="{ active: state.paso1.urgenciaUsuario === u.id }"
          @click="state.paso1.urgenciaUsuario = u.id as any"
        >
          <div class="urgency-icon">{{ u.icon }}</div>
          <div class="urgency-text">
            <strong>{{ u.label }}</strong>
            <span>{{ u.desc }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Acciones -->
    <div class="step-actions">
      <div class="spacer"></div>
      <button 
        class="btn-next" 
        :disabled="!paso1Valido"
        @click="siguientePaso"
      >
        Siguiente →
      </button>
    </div>
  </div>
</template>

<style scoped>
.step-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
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
  gap: 12px;
}

.form-label {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text);
}

.required {
  color: #ef4444;
}

.help-text {
  font-size: 0.85rem;
  color: var(--muted);
  margin: -6px 0 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.grid-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.option-btn {
  background: var(--bg-subtle);
  border: 2px solid var(--stroke);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.option-btn:hover {
  border-color: color-mix(in srgb, var(--primary) 50%, transparent);
}

.option-btn.active {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border-color: var(--primary);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 20%, transparent);
}

.option-icon {
  font-size: 1.5rem;
}

.option-label {
  font-weight: 700;
  color: var(--text);
}

.form-textarea {
  width: 100%;
  background: var(--bg-subtle);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  padding: 16px;
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}

.char-counter {
  font-size: 0.8rem;
  color: var(--muted);
  text-align: right;
}

.text-error {
  color: #ef4444;
  font-weight: 600;
}

.urgency-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.urgency-btn {
  background: var(--bg-subtle);
  border: 2px solid var(--stroke);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.urgency-btn:hover {
  background: var(--card);
}

.urgency-btn.active {
  border-color: var(--text);
  background: var(--card);
}

.urgency-icon {
  font-size: 1.5rem;
}

.urgency-text {
  display: flex;
  flex-direction: column;
}

.urgency-text strong {
  color: var(--text);
  font-size: 1rem;
}

.urgency-text span {
  font-size: 0.8rem;
  color: var(--muted);
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid var(--stroke);
}

.btn-next {
  background: var(--primary);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-next:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 40%, transparent);
}

.btn-next:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}
</style>
