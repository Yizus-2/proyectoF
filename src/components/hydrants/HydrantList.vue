<script setup lang="ts">
import type { Hydrant } from '@/types/hydrant'

defineProps<{
  hydrants: Hydrant[]
}>()
</script>

<template>
  <div style="overflow: auto; margin-top: 10px;">
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Código</th>
          <th>Nombre</th>
          <th>Sector</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in hydrants" :key="h.id">
          <td>{{ h.id }}</td>
          <td>{{ h.internal_code }}</td>
          <td>{{ h.common_name }}</td>
          <td>{{ h.sector || '—' }}</td>
        </tr>
        <tr v-if="!hydrants.length">
          <td colspan="4" class="empty-state">No hay hidrantes para mostrar.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
