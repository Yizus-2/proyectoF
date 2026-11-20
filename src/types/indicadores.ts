import type { ReportCategory } from './report'

export type CategoriaReporte = 'todos' | ReportCategory
export type PeriodoFiltro = 'hoy' | '7dias' | '30dias' | 'todos'
export type ZonaFiltro = 'todas' | number
export type NivelRiesgo = 'todos' | 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'

export interface FiltrosDashboard {
  periodo: PeriodoFiltro
  categoria: CategoriaReporte
  zona: ZonaFiltro
  nivelRiesgo: NivelRiesgo
}

export interface KpiConfig {
  id: string
  pregunta: string
  contexto: string
  icono: string
  unidad: string
  color: string
  componenteChart: string
  afectadoPorCategoria: boolean
  accionSugerida: {
    bueno: string
    malo: string
  }
}
