import { shallowRef, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'

export function useLeafletMap(containerId: string, center: [number, number] = [11.24, -74.20], zoom = 12) {
  const map = shallowRef<L.Map | null>(null)

  onMounted(() => {
    const el = document.getElementById(containerId)
    if (!el) return
    
    map.value = L.map(containerId).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map.value)
  })

  onUnmounted(() => {
    if (map.value) {
      map.value.remove()
      map.value = null
    }
  })

  return { map }
}
