import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useIndicadoresStore } from '@/stores/indicadores'
import type { PeriodoFiltro, TipoReporte, ZonaFiltro, NivelRiesgo } from '@/types/indicadores'

export function useDashboardFilters() {
  const router = useRouter()
  const route = useRoute()
  const store = useIndicadoresStore()

  // Sincronizar store -> URL
  watch(() => store.filtros, (nuevosFiltros) => {
    router.replace({
      query: {
        ...route.query,
        periodo: nuevosFiltros.periodo,
        tipo: nuevosFiltros.tipoReporte,
        zona: nuevosFiltros.zona,
        riesgo: nuevosFiltros.nivelRiesgo
      }
    }).catch(() => {})
  }, { deep: true })

  // Inicializar desde URL
  const initFiltersFromUrl = () => {
    const q = route.query
    if (q.periodo || q.tipo || q.zona || q.riesgo) {
      store.actualizarFiltros({
        periodo: (q.periodo as PeriodoFiltro) || '7dias',
        tipoReporte: (q.tipo as TipoReporte) || 'todos',
        zona: (q.zona as ZonaFiltro) || 'todas',
        nivelRiesgo: (q.riesgo as NivelRiesgo) || 'todos'
      })
    }
  }

  return {
    filtros: computed(() => store.filtros),
    actualizarFiltros: store.actualizarFiltros,
    initFiltersFromUrl
  }
}
