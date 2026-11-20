import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useIndicadoresStore } from '@/stores/indicadores'
import type { CategoriaReporte, NivelRiesgo, PeriodoFiltro, ZonaFiltro } from '@/types/indicadores'

export function useDashboardFilters() {
  const router = useRouter()
  const route = useRoute()
  const store = useIndicadoresStore()

  watch(
    () => store.filtros,
    (nuevosFiltros) => {
      router
        .replace({
          query: {
            ...route.query,
            periodo: nuevosFiltros.periodo,
            categoria: nuevosFiltros.categoria,
            zona: String(nuevosFiltros.zona),
            riesgo: nuevosFiltros.nivelRiesgo
          }
        })
        .catch(() => {})
    },
    { deep: true }
  )

  const initFiltersFromUrl = () => {
    const q = route.query
    if (q.periodo || q.categoria || q.zona || q.riesgo) {
      const zonaVal: ZonaFiltro =
        q.zona && q.zona !== 'todas' && !Number.isNaN(Number(q.zona)) ? Number(q.zona) : 'todas'
      store.actualizarFiltros({
        periodo: (q.periodo as PeriodoFiltro) || '30dias',
        categoria: (q.categoria as CategoriaReporte) || 'todos',
        zona: zonaVal,
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
