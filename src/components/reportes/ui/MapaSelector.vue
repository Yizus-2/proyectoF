<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  lat: number | null
  lng: number | null
}>()

const emit = defineEmits<{
  (e: 'update:coords', lat: number, lng: number): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

// Santa Marta por defecto si no hay coordenadas, pero NO emitimos nada (pasivo)
const defaultCenter: [number, number] = [11.2404, -74.1954]

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView(
    props.lat && props.lng ? [props.lat, props.lng] : defaultCenter,
    props.lat && props.lng ? 16 : 13
  )

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  // Crear icono personalizado
  const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  })

  // Si hay coordenadas iniciales, colocar el pin
  if (props.lat !== null && props.lng !== null) {
    marker = L.marker([props.lat, props.lng], { draggable: true, icon }).addTo(map)
    marker.on('dragend', onMarkerDrag)
  }

  // Permitir colocar pin con clic si no existe
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (!marker && map) {
      marker = L.marker([e.latlng.lat, e.latlng.lng], { draggable: true, icon }).addTo(map)
      marker.on('dragend', onMarkerDrag)
      emit('update:coords', e.latlng.lat, e.latlng.lng)
    }
  })
})

function onMarkerDrag(e: any) {
  const position = e.target.getLatLng()
  emit('update:coords', position.lat, position.lng)
}

// Escuchar cambios desde el padre (ej. click en "Usar mi ubicación")
watch(() => [props.lat, props.lng], ([newLat, newLng]) => {
  if (newLat !== null && newLng !== null && map) {
    if (!marker) {
      marker = L.marker([newLat, newLng], { draggable: true }).addTo(map)
      marker.on('dragend', onMarkerDrag)
    } else {
      marker.setLatLng([newLat, newLng])
    }
    map.setView([newLat, newLng], 17)
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>
    <div class="map-hint" v-if="!lat || !lng">
      Haz clic en el mapa para fijar la ubicación exacta manualmente (opcional).
    </div>
    <div class="map-hint text-primary" v-else>
      Puedes arrastrar el marcador para afinar la ubicación.
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-container {
  height: 300px;
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  z-index: 1; /* Para no superponer modales */
}

.map-hint {
  font-size: 0.8rem;
  color: var(--muted);
  text-align: center;
}

.text-primary {
  color: var(--primary);
  font-weight: 500;
}
</style>
