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

watch(() => [props.map, props.leaks] as const, ([m, list]) => {
  if (!m) return
  
  if (!layer.value) {
    layer.value = L.layerGroup().addTo(m)
  }
  
  layer.value.clearLayers()
  
  list.forEach(l => {
    if (l.lat != null && l.lng != null) {
      const isPending = l.status === 'PENDIENTE'
      const marker = L.circleMarker([l.lat, l.lng], { 
        radius: isPending ? 9 : 8, 
        color: isPending ? '#f59e0b' : '#ef4444',
        fillColor: isPending ? '#fbbf24' : '#f87171',
        fillOpacity: 0.8,
        weight: isPending ? 3 : 2
      })
      
      let popupContent = `<div style="font-family:sans-serif; min-width:160px">
        <div style="font-weight:bold; color:#1e293b; margin-bottom:4px;">${isPending ? '⚠️ PENDIENTE (Local)' : `Fuga #${l.id}`}</div>
        <div style="font-size:13px; color:#475569;">${l.address}</div>
        <div style="margin-top:4px; font-size:12px;"><b>Estado:</b> ${l.status}</div>
      </div>`
      
      if (l.photo_path) {
        const { data } = supabase.storage.from('leaks').getPublicUrl(l.photo_path)
        popupContent += `<br><img src="${data.publicUrl}" style="width:100%; max-width:200px; margin-top:8px; border-radius:4px" />`
      }
      
      marker.bindPopup(popupContent)
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
