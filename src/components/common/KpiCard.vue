<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  trend?: string
  trendUp?: boolean
  icon?: string
}>()
</script>

<template>
  <div class="kpi-card-premium">
    <div class="kpi-card-content">
      <div class="kpi-info">
        <span class="kpi-label">{{ title }}</span>
        <h2 class="kpi-number">{{ value || '—' }}</h2>
        <div v-if="trend" class="kpi-trend" :class="{ 'trend--up': trendUp, 'trend--down': !trendUp }">
          <span class="trend-icon">{{ trendUp ? '↑' : '↓' }}</span>
          {{ trend }}
        </div>
      </div>
      <div v-if="icon" class="kpi-icon-wrapper" v-html="icon"></div>
    </div>
    <div class="kpi-progress-bar">
      <div class="progress-fill" :style="{ width: trendUp ? '70%' : '40%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.kpi-card-premium {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
}

.kpi-card-premium:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-light);
}

.kpi-card-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.kpi-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 8px;
}

.kpi-number {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0;
  color: var(--text);
  line-height: 1;
}

.kpi-trend {
  margin-top: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 20px;
  width: fit-content;
}

.trend--up { background: rgba(13, 148, 136, 0.1); color: var(--accent); }
.trend--down { background: rgba(185, 28, 28, 0.1); color: var(--danger); }

.kpi-icon-wrapper {
  width: 48px;
  height: 48px;
  background: var(--primary-soft);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.kpi-progress-bar {
  height: 4px;
  background: var(--bg-subtle);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 2px;
  transition: width 1s ease-out;
}
</style>
