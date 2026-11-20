import { ref } from 'vue'
import { api } from '@/lib/api'

export function useCuadrillaAssignment() {
  const isAssigning = ref(false)
  const assignmentError = ref<string | null>(null)

  async function assignCrewAutomatically(reportId: number): Promise<number | null> {
    isAssigning.value = true
    assignmentError.value = null
    try {
      const res = await api.post<{ crew_id: number | null }>(`/api/reports/${reportId}/assign-auto`)
      return res.crew_id
    } catch (err: any) {
      console.error('Error assigning crew automatically:', err)
      assignmentError.value = err.message || 'Error al asignar cuadrilla automáticamente.'
      return null
    } finally {
      isAssigning.value = false
    }
  }

  return {
    assignCrewAutomatically,
    isAssigning,
    assignmentError
  }
}
