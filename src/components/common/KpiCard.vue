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
  <div class="kpi-card">
    <div class="kpi-card__content">
      <div class="kpi-info">
        <span class="kpi-label">{{ title }}</span>
        <h2 class="kpi-number">{{ value || '—' }}</h2>
        <div v-if="trend" class="kpi-trend" :class="{ 'trend--up': trendUp, 'trend--down': !trendUp }">
          <span class="trend-icon">{{ trendUp ? '↑' : '↓' }}</span>
          {{ trend }}
        </div>
      </div>
      <div v-if="icon" class="kpi-icon" v-html="icon"></div>
    </div>
    <div class="kpi-bar">
      <div class="kpi-bar__fill" :style="{ width: trendUp ? '72%' : '38%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.kpi-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.35s var(--ease-out-expo);
  box-shadow: var(--shadow-sm);
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-brand);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--stroke));
}

.kpi-card:hover::before {
  opacity: 1;
}

.kpi-card__content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
}

.kpi-label {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 8px;
}

.kpi-number {
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  font-size: 2.1rem;
  font-weight: 800;
  margin: 0;
  color: var(--text);
  line-height: 1;
  letter-spacing: -0.03em;
}

.kpi-trend {
  margin-top: 10px;
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  width: fit-content;
}

.trend--up { background: var(--accent-soft); color: var(--accent); }
.trend--down { background: var(--danger-soft); color: var(--danger); }

.kpi-icon {
  width: 46px;
  height: 46px;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
  transition: transform 0.3s var(--ease-spring);
}

.kpi-card:hover .kpi-icon {
  transform: scale(1.08);
}

.kpi-bar {
  height: 3px;
  background: var(--bg-subtle);
  border-radius: 2px;
  overflow: hidden;
}

.kpi-bar__fill {
  height: 100%;
  background: var(--gradient-accent);
  border-radius: 2px;
  transition: width 1.2s var(--ease-out-expo);
}
</style>
