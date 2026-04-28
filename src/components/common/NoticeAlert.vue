<script setup lang="ts">
defineProps<{
  message: string
  visible: boolean
}>()
</script>

<template>
  <div v-if="visible" class="notice" style="margin-top:12px">
    {{ message }}
  </div>
</template>
