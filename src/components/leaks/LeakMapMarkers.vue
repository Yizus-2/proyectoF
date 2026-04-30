<script setup lang="ts">
import { watch, shallowRef, onUnmounted } from 'vue'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import type { Leak } from '@/types/leak'

const props = defineProps<{
  map: L.Map | null
  leaks: Leak[]
}>()

const layer = shallowRef<L.LayerGroup | null>(null)

const STATUS_CONFIG: Record<string, { color: string, fill: string, label: string }> = {
  'PENDIENTE': { color: '#f59e0b', fill: '#fbbf24', label: '⚠️ PENDIENTE (Local)' },
  'REPORTADA': { color: '#ef4444', fill: '#f87171', label: '📍 REPORTADA' },
  'EN_PROCESO': { color: '#3b82f6', fill: '#60a5fa', label: '🚧 EN PROCESO' },
  'ATENDIDA': { color: '#10b981', fill: '#34d399', label: '✅ ATENDIDA' },
  'CERRADA': { color: '#64748b', fill: '#94a3b8', label: '📁 CERRADA' }
}

watch(() => [props.map, props.leaks] as const, ([m, list]) => {
  if (!m) return
  
  if (!layer.value) {
    layer.value = L.layerGroup().addTo(m)
  }
  
  layer.value.clearLayers()
  
  list.forEach(l => {
    if (l.lat != null && l.lng != null) {
      const config = STATUS_CONFIG[l.status] || STATUS_CONFIG['REPORTADA']
      const isPending = l.status === 'PENDIENTE'
      
      const marker = L.circleMarker([l.lat, l.lng], { 
        radius: isPending ? 9 : 8, 
        color: config.color,
        fillColor: config.fill,
        fillOpacity: 0.8,
        weight: isPending ? 3 : 2
      })
      
      let popupContent = `
        <div style="font-family: 'Inter', sans-serif; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${config.color}; background: ${config.fill}20; padding: 2px 6px; border-radius: 4px;">
              ${config.label}
            </span>
            <span style="font-size: 11px; color: #64748b; font-weight: 500;">
              ${isPending ? '' : `#${l.id}`}
            </span>
          </div>
          
          <div style="font-weight: 600; color: #1e293b; font-size: 14px; line-height: 1.4; margin-bottom: 4px;">
            ${l.address}
          </div>
          
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            ${l.sector || 'Sector no especificado'}
          </div>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 8px;">
            <div style="font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
              <span>Reportado por:</span>
              <span style="color: #475569; font-weight: 500;">${l.reporter_name}</span>
            </div>
          </div>
      `
      
      if (l.photo_path) {
        const { data } = supabase.storage.from('leaks').getPublicUrl(l.photo_path)
        popupContent += `
          <div style="margin-top: 12px; position: relative;">
            <img src="${data.publicUrl}" 
                 style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" 
                 alt="Foto de la fuga" />
          </div>`
      }
      
      popupContent += `</div>`
      
      marker.bindPopup(popupContent, {
        maxWidth: 240,
        className: 'custom-leak-popup'
      })
      
      marker.addTo(layer.value!)
    }
  })
}, { immediate: true })

onUnmounted(() => {
  if (layer.value) layer.value.clearLayers()
})
</script>

<template>
  <div></div>
</template>
