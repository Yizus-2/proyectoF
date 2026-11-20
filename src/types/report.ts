export type ReportCategory =
  | 'fuga_agua'
  | 'fuga_alcantarillado'
  | 'tuberia_rota'
  | 'dano_pavimento'
  | 'dano_infraestructura'
  | 'otro'

export type ReportPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export type ReportStatus =
  | 'REPORTADO'
  | 'CLASIFICADO'
  | 'ASIGNADO'
  | 'EN_PROGRESO'
  | 'EVIDENCIA_PENDIENTE'
  | 'VERIFICACION_SUPERVISOR'
  | 'RESUELTO'
  | 'CERRADO'
  | 'EVALUADO'
  | 'RECHAZADO'

export type ReportSource =
  | 'WEB'
  | 'OFFLINE'
  | 'WHATSAPP'
  | 'APP_MOVIL'
  | 'TELEFONO'
  | 'CORREO'
  | 'PRESENCIAL'
  | 'BOTON_EMERGENCIA'

export type UserRole = 'admin' | 'supervisor' | 'operator' | 'citizen'

export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: UserRole
  zone_id: number | null
  crew_id: number | null
}

export interface Zone {
  id: number
  name: string
  code: string
  description?: string | null
  sla_hours: number
  lat?: number | null
  lng?: number | null
}

export interface Crew {
  id: number
  name: string
  zone_id: number | null
  zone_name?: string | null
  specialty?: string[]
  is_available: boolean
  workload: number
  lat?: number | null
  lng?: number | null
}

export interface ZoneAnalytics {
  zone_id: number
  zone_name: string
  zone_code: string
  sla_hours: number
  total_reports: number
  active_reports: number
  recurrent_reports: number
  avg_hours: number | null
}

export interface Report {
  id: number
  tracking_code: string | null
  reporter_id: string | null
  reporter_name: string
  reporter_phone: string | null
  reporter_email: string | null
  category: ReportCategory
  priority: ReportPriority
  status: ReportStatus
  description: string | null
  address: string
  zone_id: number | null
  zone_name?: string | null
  sla_hours?: number | null
  sector: string | null
  lat: number | null
  lng: number | null
  photo_path: string | null
  evidence_path: string | null
  assigned_operator_id: string | null
  assigned_crew_id?: number | null
  assigned_at: string | null
  resolved_at: string | null
  closed_at: string | null
  attention_hours: number | null
  source: ReportSource
  is_recurrent: boolean
  work_order: string | null
  created_at: string
  updated_at: string
}

export interface PublicTrackedReport {
  id: number
  tracking_code: string
  status: ReportStatus
  address: string
  sector: string | null
  category: ReportCategory
  priority: ReportPriority
  created_at: string
  resolved_at: string | null
  closed_at: string | null
  photo_path: string | null
  evidence_path: string | null
  work_order: string | null
  zone_id: number | null
  zone_name?: string | null
}

export interface ReportHistory {
  id?: number
  report_id?: number
  previous_status: ReportStatus | null
  new_status: ReportStatus
  changed_by?: string | null
  notes: string | null
  created_at: string
}

export interface Evidence {
  id: number
  report_id: number
  evidence_url: string
  description: string
  materials: string | null
  hours_spent: number
  lat: number | null
  lng: number | null
  uploaded_by: string | null
  uploader_name?: string | null
  created_at: string
}

export interface Rating {
  id: number
  report_id: number
  citizen_id: string | null
  score: number
  comment: string | null
  created_at: string
}
