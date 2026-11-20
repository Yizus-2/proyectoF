<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

function getIcon(type: string) {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '!'
    case 'warning': return '!'
    default: return 'i'
  }
}
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toastStore.toasts" 
        :key="toast.id" 
        class="toast"
        :class="`toast--${toast.type}`"
      >
        <div class="toast-icon">{{ getIcon(toast.type) }}</div>
        <div class="toast-content">
          <h4>{{ toast.title }}</h4>
          <p>{{ toast.message }}</p>
        </div>
        <button class="toast-close" @click="toastStore.removeToast(toast.id)">✕</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 9999;
  pointer-events: none; /* Allows clicking through the container */
}

.toast {
  pointer-events: auto; /* Re-enable clicking on the toast itself */
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 320px;
  padding: 16px;
  border-radius: 12px;
  background: var(--card);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--stroke);
  position: relative;
  overflow: hidden;
}

.toast::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.toast--info::before { background: #3b82f6; }
.toast--success::before { background: #10b981; }
.toast--warning::before { background: #f59e0b; }
.toast--error::before { background: #ef4444; }

.toast--error {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.toast-icon {
  font-size: 1.5rem;
}

.toast-content {
  flex-grow: 1;
}

.toast-content h4 {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  color: var(--text);
  font-weight: 700;
}

.toast-content p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.4;
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.toast-close:hover {
  color: var(--text);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.9);
  margin-bottom: -80px; /* Collapse the space smoothly */
}
</style>
