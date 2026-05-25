export type PasoWizard = 1 | 2 | 3

export type CategoriaForm = 'fuga_agua' | 'fuga_alcantarillado' | 'tuberia_rota' | 'dano_pavimento' | 'dano_infraestructura' | 'otro' | null
export type UrgenciaForm = 'BAJA' | 'ALTA' | 'CRITICA' | null
export type CanalReporte = 'app_movil' | 'web' | 'whatsapp' | 'telefono' | 'correo' | 'presencial' | 'emergencia'

export interface DatosPaso1 {
  tipo: CategoriaForm
  descripcion: string
  urgenciaUsuario: UrgenciaForm
  fotoFile: File | null
  fotoPreviewUrl: string | null
}

export interface DatosPaso2 {
  direccion: string
  zona: string
  sector: string
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
