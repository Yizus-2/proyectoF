<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search'): void
}>()
</script>

<template>
  <div class="field">
    <label>Buscar</label>
    <input 
      :value="modelValue" 
      @input="e => emit('update:modelValue', (e.target as HTMLInputElement).value)"
      @keyup.enter="$emit('search')"
      placeholder="código, nombre o dirección"
    />
  </div>
</template>
