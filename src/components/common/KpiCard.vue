<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
}>()
</script>

<template>
  <div class="card">
    <div class="kpi-title">{{ title }}</div>
    <div class="kpi-value">{{ value || '—' }}</div>
  </div>
</template>
