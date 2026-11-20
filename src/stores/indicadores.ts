import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useReportsStore } from './reports'
import type { FiltrosDashboard, KpiConfig } from '@/types/indicadores'

const CATEGORY_LABELS: Record<string, string> = {
  todos: 'Todas las categorías',
  fuga_agua: 'Fugas de agua',
  fuga_alcantarillado: 'Alcantarillado',
  tuberia_rota: 'Tubería rota',
  dano_pavimento: 'Daño vial / pavimento',
  dano_infraestructura: 'Infraestructura',
  otro: 'Otros reportes'
}

export const useIndicadoresStore = defineStore('indicadores', () => {
  const reportsStore = useReportsStore()

  const filtros = ref<FiltrosDashboard>({
    periodo: '30dias',
    categoria: 'todos',
    zona: 'todas',
    nivelRiesgo: 'todos'
  })

  const kpis = ref<KpiConfig[]>([
    {
      id: 'activos',
      pregunta: '¿Cuántos reportes tenemos activos?',
      contexto: 'Reportes pendientes de resolución por las cuadrillas',
      icono: 'Activity',
      unidad: 'reportes',
      color: 'blue',
      componenteChart: 'Ninguno',
      afectadoPorCategoria: true,
      accionSugerida: {
        bueno: 'Carga de trabajo bajo control',
        malo: 'Asignar más cuadrillas o redistribuir carga'
      }
    },
    {
      id: 'urgencia',
      pregunta: '¿Cuántos reportes urgentes tenemos activos?',
      contexto: 'Reportes activos clasificados por nivel de criticidad',
      icono: 'AlertTriangle',
      unidad: 'reportes',
      color: 'orange',
      componenteChart: 'ReportsByUrgencyChart',
      afectadoPorCategoria: true,
      accionSugerida: {
        bueno: 'Distribución equilibrada, sin cuellos de botella',
        malo: 'Concentrar cuadrillas en reportes críticos y altos'
      }
    },
    {
      id: 'sla',
      pregunta: '¿Se atendieron los reportes a tiempo?',
      contexto: 'Porcentaje resuelto dentro del tiempo máximo según su riesgo',
      icono: 'Clock',
      unidad: '%',
      color: 'emerald',
      componenteChart: 'SlaComplianceChart',
      afectadoPorCategoria: true,
      accionSugerida: {
        bueno: 'Cumplimiento óptimo, mantener ritmo',
        malo: 'Revisar asignación de cuadrillas y tiempos de traslado'
      }
    },
    {
      id: 'trend',
      pregunta: '¿Estamos recibiendo más o menos reportes?',
      contexto: 'Volumen diario de nuevos incidentes',
      icono: 'TrendingUp',
      unidad: 'reportes/día',
      color: 'purple',
      componenteChart: 'WeeklyTrendChart',
      afectadoPorCategoria: true,
      accionSugerida: {
        bueno: 'Estabilidad en la red, mantener rutina',
        malo: 'Preparar cuadrillas de contingencia'
      }
    },
    {
      id: 'channels',
      pregunta: '¿Por dónde nos están reportando?',
      contexto: 'Distribución por canal de atención ciudadano',
      icono: 'MessageSquare',
      unidad: 'reportes',
      color: 'sky',
      componenteChart: 'ChannelsChart',
      afectadoPorCategoria: true,
      accionSugerida: {
        bueno: 'Uso correcto de canales oficiales',
        malo: 'Mejorar adopción de la App Móvil o web'
      }
    }
  ])

  const contextoActual = computed(() => CATEGORY_LABELS[filtros.value.categoria] || 'Todas las categorías')

  const reportesFiltrados = computed(() => {
    let list = reportsStore.reports

    // Filtro Período
    const now = new Date()
    let startDate: Date | null = null
    if (filtros.value.periodo === 'hoy') {
      startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
    } else if (filtros.value.periodo === '7dias') {
      startDate = new Date()
      startDate.setDate(now.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
    } else if (filtros.value.periodo === '30dias') {
      startDate = new Date()
      startDate.setDate(now.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
    }

    if (startDate) {
      list = list.filter((r) => new Date(r.created_at) >= startDate!)
    }

    // Filtro Categoría (valores reales de BD)
    if (filtros.value.categoria !== 'todos') {
      list = list.filter((r) => r.category === filtros.value.categoria)
    }

    // Filtro Zona (ID real de zona)
    if (filtros.value.zona !== 'todas') {
      list = list.filter((r) => Number(r.zone_id) === Number(filtros.value.zona))
    }

    // Filtro Nivel de Riesgo
    if (filtros.value.nivelRiesgo !== 'todos') {
      list = list.filter((r) => r.priority === filtros.value.nivelRiesgo)
    }

    return list
  })

  function actualizarFiltros(nuevos: Partial<FiltrosDashboard>) {
    filtros.value = { ...filtros.value, ...nuevos }
  }

  return {
    filtros,
    kpis,
    contextoActual,
    reportesFiltrados,
    actualizarFiltros
  }
})
