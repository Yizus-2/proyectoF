<script setup lang="ts">
import { useReporteForm } from '@/composables/useReporteForm'

const { state, paso1Valido, siguientePaso } = useReporteForm()

const CATEGORIAS = [
  { id: 'fuga_agua', titulo: 'Fuga de Agua', icono: '💧', descripcion: 'Derrame en vía pública o andén' },
  { id: 'fuga_alcantarillado', titulo: 'Alcantarillado', icono: '🚰', descripcion: 'Desbordamiento de aguas negras' },
  { id: 'tuberia_rota', titulo: 'Tubería Rota', icono: '🔧', descripcion: 'Daño visible en tubería matriz' },
  { id: 'dano_pavimento', titulo: 'Daño Vial', icono: '🛣️', descripcion: 'Huecos o hundimientos por agua' },
  { id: 'dano_infraestructura', titulo: 'Infraestructura', icono: '🏗️', descripcion: 'Manjoles, rejillas o tapas' },
  { id: 'otro', titulo: 'Otro', icono: '📋', descripcion: 'Otra anomalía hídrica' }
] as const

const URGENCIA = [
  { id: 'BAJA', titulo: 'Normal', color: '#10b981', descripcion: 'No requiere atención inmediata' },
  { id: 'ALTA', titulo: 'Urgente', color: '#f59e0b', descripcion: 'Afecta una vía principal o viviendas' },
  { id: 'CRITICA', titulo: 'Crítico', color: '#ef4444', descripcion: 'Peligro inminente para la comunidad' }
] as const

function onPhotoSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  state.value.paso1.fotoFile = input.files[0]
  state.value.paso1.fotoPreviewUrl = URL.createObjectURL(input.files[0])
}
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
          v-for="cat in CATEGORIAS" 
          :key="cat.id"
          class="option-btn"
          :class="{ active: state.paso1.tipo === cat.id }"
          @click="state.paso1.tipo = cat.id as any"
        >
          <span class="option-icon">{{ cat.icono }}</span>
          <span class="option-label">{{ cat.titulo }}</span>
        </button>
      </div>
    </div>

    <!-- Foto Obligatoria -->
    <div class="form-section">
      <h3 class="section-subtitle">Evidencia fotográfica <span class="required">*</span></h3>
      <div class="field">
        <label for="photo" class="upload-area">
          <span v-if="!state.paso1.fotoPreviewUrl">📷 Tomar o elegir foto</span>
          <img v-else :src="state.paso1.fotoPreviewUrl" alt="preview" class="preview-img" />
        </label>
        <input 
          id="photo" 
          type="file" 
          accept="image/*" 
          capture="environment" 
          class="sr-only" 
          @change="onPhotoSelected" 
        />
      </div>
    </div>

    <!-- Descripción -->
    <div class="form-section">
      <h3 class="section-subtitle">Detalles adicionales <span class="required">*</span></h3>
      <textarea 
        v-model="state.paso1.descripcion"
        class="form-textarea"
        placeholder="Ej: El tubo se rompió frente a la panadería y el agua está inundando la calle..."
        rows="4"
      ></textarea>
      <div class="char-count" :class="{ 'text-error': state.paso1.descripcion.length < 10 }">
        {{ state.paso1.descripcion.length }} / 10 min.
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
          v-for="u in URGENCIA" 
          :key="u.id"
          class="urgency-btn"
          :class="{ active: state.paso1.urgenciaUsuario === u.id }"
          @click="state.paso1.urgenciaUsuario = u.id as any"
        >
          <div class="urgency-icon" :style="{ color: u.color }">●</div>
          <div class="urgency-text">
            <strong>{{ u.titulo }}</strong>
            <span>{{ u.descripcion }}</span>
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

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 700;
}

.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 2px dashed var(--stroke);
  border-radius: var(--radius-md);
  cursor: pointer;
  background: var(--bg-subtle);
  font-weight: 600;
  color: var(--muted);
  transition: all 0.2s;
  overflow: hidden;
  width: 100%;
}

.upload-area:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.preview-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
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

.char-count {
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
