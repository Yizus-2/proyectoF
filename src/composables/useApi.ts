import { ref } from 'vue'

export function useApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Set the base URL for the FastAPI backend
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  async function get<T>(path: string): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE}${path}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function post<T>(path: string, payload: any): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function patch<T>(path: string, payload: any): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function upload<T>(path: string, file: File, field = 'photo'): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append(field, file)

      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        body: formData // No Content-Type header with FormData, browser sets it automatically with boundary
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    get,
    post,
    patch,
    upload,
    API_BASE
  }
}
