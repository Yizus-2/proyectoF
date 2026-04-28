<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import { useOfflineSync } from '@/composables/useOfflineSync'

// Inicializar el escuchador de online globalmente
useOfflineSync()
</script>

<template>
  <AppNavbar />
  <RouterView />
</template>
