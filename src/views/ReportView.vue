<script setup lang="ts">
import ReporteWizard from '@/components/reportes/ReporteWizard.vue'
</script>

<template>
  <div class="report-view">
    <header class="view-header">
      <div class="header-content">
        <h1 class="title">Centro de Reportes Ciudadanos</h1>
        <p class="subtitle">
          Sistema de gestión operativa. Ayúdenos a identificar y localizar problemas en la red.
        </p>
      </div>
    </header>

    <main class="view-main">
      <ReporteWizard />
    </main>
  </div>
</template>

<style scoped>
.report-view {
  min-height: 100vh;
  background: var(--page-bg);
  display: flex;
  flex-direction: column;
}

.view-header {
  background: var(--card);
  border-bottom: 1px solid var(--stroke);
  padding: 40px 20px;
  text-align: center;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--muted);
  margin: 0;
}

.view-main {
  flex: 1;
  padding: 40px 20px;
  background: var(--bg-subtle);
}
</style>
