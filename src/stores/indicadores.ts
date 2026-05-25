import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useReportsStore } from './reports'
import type { FiltrosDashboard, KpiConfig } from '@/types/indicadores'

export const useIndicadoresStore = defineStore('indicadores', () => {
  const reportsStore = useReportsStore()

  const filtros = ref<FiltrosDashboard>({
    periodo: '7dias',
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
        malo: 'Asignar más cuadrillas o hacer horas extra'
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

  const contextoActual = computed(() => {
    const cat = filtros.value.categoria
    return cat === 'todos' ? 'Todas las categorías' :
           cat === 'fuga' ? 'Fugas de agua' :
           cat === 'presion' ? 'Métricas de presión' :
           cat === 'hidrante' ? 'Inventario de hidrantes' :
           'Infraestructura general'
  })

  // Computamos los reportes filtrados base usando ambos stores
  const reportesFiltrados = computed(() => {
    let list = reportsStore.reports

    // Filtro Periodo
    const now = new Date()
    let startDate = new Date(0) // ALL
    if (filtros.value.periodo === 'hoy') {
      startDate = new Date()
      startDate.setHours(0,0,0,0)
    } else if (filtros.value.periodo === '7dias') {
      startDate = new Date()
      startDate.setDate(now.getDate() - 7)
      startDate.setHours(0,0,0,0)
    } else if (filtros.value.periodo === '30dias') {
      startDate = new Date()
      startDate.setDate(now.getDate() - 30)
      startDate.setHours(0,0,0,0)
    }
    
    list = list.filter(r => new Date(r.created_at) >= startDate)

    // Filtro Categoria
    if (filtros.value.categoria !== 'todos') {
      list = list.filter(r => r.category === filtros.value.categoria || r.tipo === filtros.value.categoria)
    }

    // Filtro Zona
    // Nota: r.zone_id es numérico, si zona es 'todas' pasa.
    // Falta mapeo exacto de nombre a zone_id, lo omitiremos si 'todas'
    // En el futuro: && r.zone_name.toLowerCase().includes(filtros.value.zona)

    // Filtro Nivel Riesgo
    if (filtros.value.nivelRiesgo !== 'todos') {
      list = list.filter(r => r.priority?.toLowerCase() === filtros.value.nivelRiesgo)
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
