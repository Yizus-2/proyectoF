import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useCuadrillaAssignment() {
  const isAssigning = ref(false)
  const assignmentError = ref<string | null>(null)

  async function assignCrewAutomatically(reportId: number): Promise<number | null> {
    isAssigning.value = true
    assignmentError.value = null
    try {
      const { data, error } = await supabase.rpc('assign_crew_automatically', {
        p_report_id: reportId
      })

      if (error) {
        throw new Error(error.message)
      }

      return data as number | null
    } catch (err: any) {
      console.error('Error assigning crew automatically:', err)
      assignmentError.value = err.message || 'Error al asignar cuadrilla.'
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
