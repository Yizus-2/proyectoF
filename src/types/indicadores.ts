export type PeriodoFiltro = 'hoy' | '7dias' | '30dias' | 'personalizado'
export type TipoReporte = 'todos' | 'fuga' | 'presion' | 'hidrante' | 'infraestructura'
export type ZonaFiltro = 'todas' | 'norte' | 'centro' | 'sur' | 'oriente' | 'occidente'
export type NivelRiesgo = 'todos' | 'critico' | 'alto' | 'medio' | 'bajo'

export interface FiltrosDashboard {
  periodo: PeriodoFiltro
  fechaInicio?: string
  fechaFin?: string
  tipoReporte: TipoReporte
  zona: ZonaFiltro
  nivelRiesgo: NivelRiesgo
}

export interface KpiConfig {
  id: string
  titulo: string                    // Pregunta operativa clara
  subtitulo: string                 // Descripción breve
  icono: string                     // Icono de Heroicons o similar
  unidad: string                    // reportes, horas, %, etc.
  color: string                     // Color de acento
  componenteChart: string           // Nombre del componente de gráfica
  requiereFiltroTipo: boolean       // Si reacciona al filtro de tipo
}

export interface DatosUrgencia {
  nivel: 'critico' | 'alto' | 'medio' | 'bajo'
  cantidad: number
  color: string
  tiempoSla: string                 // Ej: "< 30 minutos"
}

export interface DatosSla {
  estado: 'a_tiempo' | 'riesgo' | 'vencido'
  cantidad: number
  porcentaje: number
  descripcion: string               // Ej: "Resueltos dentro del SLA"
}

export interface ReporteIndicador {
  id: string
  estado: string
  prioridad: string
  categoria: string
  zona_id: number
  creado_el: string
  resuelto_el?: string
  canal: string
}
