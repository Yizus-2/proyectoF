<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
</script>

<template>
  <AppNavbar />
  <RouterView />
  <ToastContainer />
</template>
