import { ref } from 'vue'

export function useGeolocation() {
  const lat = ref<number | null>(null)
  const lng = ref<number | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  function capture() {
    if (!navigator.geolocation) {
      error.value = "Geolocalización no soportada."
      return
    }
    
    loading.value = true
    error.value = null
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lat.value = Number(pos.coords.latitude.toFixed(6))
        lng.value = Number(pos.coords.longitude.toFixed(6))
        loading.value = false
      },
      (err) => {
        error.value = err.message || "No se pudo obtener GPS."
        loading.value = false
      }
    )
  }

  return { lat, lng, error, loading, capture }
}
