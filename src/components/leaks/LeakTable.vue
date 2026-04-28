<script setup lang="ts">
import type { Leak, LeakStatus } from '@/types/leak'

defineProps<{
  leaks: Leak[]
}>()

const emit = defineEmits<{
  (e: 'status-change', id: number, status: LeakStatus): void
}>()
</script>

<template>
  <div class="card">
    <h3>Listado</h3>
    <div style="overflow: auto;">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>OT</th>
            <th>Sector</th>
            <th>Estado</th>
            <th>Dirección</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in leaks" :key="l.id">
            <td>{{ l.id }}</td>
            <td>{{ l.work_order || '—' }}</td>
            <td>{{ l.sector || '—' }}</td>
            <td><span class="badge">{{ l.status }}</span></td>
            <td>{{ l.address }}</td>
            <td class="table-actions">
              <div class="flex gap-2">
                <select 
                  :value="l.status" 
                  @change="e => emit('status-change', l.id, (e.target as HTMLSelectElement).value as LeakStatus)"
                  style="min-width: 130px;"
                >
                  <option value="REPORTADA">Reportada</option>
                  <option value="EN_PROCESO">En proceso</option>
                  <option value="ATENDIDA">Atendida</option>
                  <option value="CERRADA">Cerrada</option>
                </select>
                <a 
                  :href="`https://wa.me/?text=${encodeURIComponent(`📢 *REPORTE DE FUGA ESSMAR*\n\n*ID:* ${l.id}\n*OT:* ${l.work_order || 'N/A'}\n*Dirección:* ${l.address}\n*Sector:* ${l.sector || 'N/A'}\n*Estado:* ${l.status}\n\n_Generado desde SIGVI_`)}`"
                  target="_blank"
                  class="btn-wa"
                  title="Compartir por WhatsApp"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </a>
              </div>
            </td>
          </tr>
          <tr v-if="!leaks.length">
            <td colspan="6" class="empty-state">No hay fugas para mostrar.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
