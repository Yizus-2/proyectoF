import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { FiltrosDashboard, KpiConfig } from '@/types/indicadores'

export const useIndicadoresStore = defineStore('indicadores', () => {
  // Estado
  const filtros = ref<FiltrosDashboard>({
    periodo: '7dias',
    tipoReporte: 'todos',
    zona: 'todas',
    nivelRiesgo: 'todos'
  })

  const kpis = ref<KpiConfig[]>([
    {
      id: 'urgencia',
      titulo: '¿Cuántos reportes hay por nivel de urgencia?',
      subtitulo: 'Distribución actual de reportes según criticidad',
      icono: 'ExclamationTriangleIcon',
      unidad: 'reportes',
      color: 'orange',
      componenteChart: 'ReportsByUrgencyChart',
      requiereFiltroTipo: true
    },
    {
      id: 'sla',
      titulo: '¿Se atendieron los reportes a tiempo?',
      subtitulo: 'Porcentaje de reportes resueltos dentro del tiempo establecido',
      icono: 'ClockIcon',
      unidad: '%',
      color: 'green',
      componenteChart: 'SlaComplianceChart',
      requiereFiltroTipo: true
    },
    {
      id: 'tendencia',
      titulo: '¿Cómo ha variado el volumen de reportes?',
      subtitulo: 'Evolución diaria de reportes ingresados',
      icono: 'ChartBarIcon',
      unidad: 'reportes/día',
      color: 'blue',
      componenteChart: 'WeeklyTrendChart',
      requiereFiltroTipo: true
    },
    {
      id: 'canales',
      titulo: '¿Por dónde nos están reportando?',
      subtitulo: 'Distribución de reportes por canal de recepción',
      icono: 'DevicePhoneMobileIcon',
      unidad: 'reportes',
      color: 'purple',
      componenteChart: 'ChannelsChart',
      requiereFiltroTipo: false
    },
    {
      id: 'zonas',
      titulo: '¿Qué zonas tienen más carga de trabajo?',
      subtitulo: 'Distribución geográfica de reportes activos',
      icono: 'MapPinIcon',
      unidad: 'reportes',
      color: 'indigo',
      componenteChart: 'ZoneEfficiencyChart',
      requiereFiltroTipo: true
    }
  ])

  const cargando = ref(false)
  const error = ref<string | null>(null)
  
  // Datos locales
  const kpiData = ref<any>({})

  // Getters
  const kpisFiltrados = computed(() => {
    return kpis.value.filter(kpi => {
      if (!kpi.requiereFiltroTipo) return true
      return true
    })
  })

  const queryParams = computed(() => ({
    periodo: filtros.value.periodo,
    tipo: filtros.value.tipoReporte,
    zona: filtros.value.zona,
    riesgo: filtros.value.nivelRiesgo,
    desde: filtros.value.fechaInicio,
    hasta: filtros.value.fechaFin
  }))

  // Acciones
  function actualizarFiltros(nuevosFiltros: Partial<FiltrosDashboard>) {
    filtros.value = { ...filtros.value, ...nuevosFiltros }
  }

  function resetearFiltros() {
    filtros.value = {
      periodo: '7dias',
      tipoReporte: 'todos',
      zona: 'todas',
      nivelRiesgo: 'todos'
    }
  }

  async function cargarDatosDashboard() {
    cargando.value = true
    error.value = null
    try {
      // Usaremos datos en memoria desde la tabla 'reports' si no hay RPC.
      // Por compatibilidad temporal hacemos un fetch basico simulado.
      const { data, error: supaError } = await supabase.from('reports').select('*')
      if (supaError) throw supaError
      
      // Aquí se debería delegar a la RPC, pero mientras lo dejamos listo:
      kpiData.value = data || []
    } catch (e) {
      console.error(e)
      error.value = 'Error al cargar los indicadores. Intente nuevamente.'
    } finally {
      cargando.value = false
    }
  }

  return {
    filtros,
    kpis,
    cargando,
    error,
    kpiData,
    kpisFiltrados,
    queryParams,
    actualizarFiltros,
    resetearFiltros,
    cargarDatosDashboard
  }
})
