<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = withDefaults(defineProps<{
  center?: [number, number]
  zoom?: number
}>(), {
  center: () => [11.24, -74.20],
  zoom: 12
})

const emit = defineEmits<{
  (e: 'ready', map: L.Map): void
}>()

const mapContainer = shallowRef<HTMLElement | null>(null)
const map = shallowRef<L.Map | null>(null)

// Arreglar íconos de leaflet en Vite/Vue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

onMounted(() => {
  if (!mapContainer.value) return
  
  map.value = L.map(mapContainer.value).setView(props.center, props.zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map.value)

  emit('ready', map.value)
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})

watch(() => props.center, (newCenter) => {
  if (map.value && newCenter) {
    map.value.setView(newCenter)
  }
})
</script>

<template>
  <div ref="mapContainer" class="map"></div>
</template>
