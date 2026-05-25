export type CategoriaReporte = 'todos' | 'fuga' | 'presion' | 'hidrante' | 'infraestructura'
export type PeriodoFiltro = 'hoy' | '7dias' | '30dias' | 'personalizado'
export type ZonaFiltro = 'todas' | 'norte' | 'centro' | 'sur' | 'oriente' | 'occidente'
export type NivelRiesgo = 'todos' | 'critico' | 'alto' | 'medio' | 'bajo'

export interface FiltrosDashboard {
  periodo: PeriodoFiltro
  fechaInicio?: string
  fechaFin?: string
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

export interface DatosUrgencia {
  nivel: NivelRiesgo
  cantidad: number
  color: string
  tiempoMaximo: string
  accionRequerida: string
}

export interface DatosSla {
  estado: 'a_tiempo' | 'en_riesgo' | 'vencido' | 'finalizado'
  cantidad: number
  porcentaje: number
  contexto: string
  slaReferencia: {
    critico: string
    alto: string
    medio: string
    bajo: string
  }
}
