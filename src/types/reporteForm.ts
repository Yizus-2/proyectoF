export type PasoWizard = 1 | 2 | 3

export type CategoriaForm = 'fuga' | 'presion' | 'hidrante' | 'infraestructura'
export type UrgenciaForm = 'critica' | 'alta' | 'media' | 'baja'
export type CanalReporte = 'app_movil' | 'web' | 'whatsapp' | 'telefono' | 'correo' | 'presencial' | 'emergencia'

export interface DatosPaso1 {
  tipo: CategoriaForm | null
  descripcion: string
  urgenciaUsuario: UrgenciaForm | null
}

export interface DatosPaso2 {
  direccion: string
  zona: string
  latitud: number | null
  longitud: number | null
  ubicacionConfirmada: boolean
}

export interface DatosPaso3 {
  canal: CanalReporte
  nombre: string
  telefono: string
  email?: string
}

export interface ReporteFormState {
  pasoActual: PasoWizard
  paso1: DatosPaso1
  paso2: DatosPaso2
  paso3: DatosPaso3
}
