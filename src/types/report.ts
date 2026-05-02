export type ReportCategory = 'fuga_agua' | 'fuga_alcantarillado' | 'tuberia_rota' | 'dano_pavimento' | 'dano_infraestructura' | 'otro'
export type ReportPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
export type ReportStatus = 'REPORTADO' | 'CLASIFICADO' | 'ASIGNADO' | 'EN_PROGRESO' | 'RESUELTO' | 'CERRADO' | 'EVALUADO' | 'RECHAZADO'
export type ReportSource = 'WEB' | 'OFFLINE' | 'WHATSAPP'

export interface Zone {
  id: number
  name: string
  code: string
  description?: string | null
  sla_hours: number
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
  sector: string | null
  lat: number | null
  lng: number | null
  photo_path: string | null
  evidence_path: string | null
  assigned_operator_id: string | null
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

export interface ReportCreatePayload {
  reporter_name: string
  reporter_phone?: string | null
  reporter_email?: string | null
  category: ReportCategory
  description?: string | null
  address: string
  lat?: number | null
  lng?: number | null
  source: ReportSource
}

export interface ReportHistory {
  id: number
  report_id: number
  previous_status: ReportStatus | null
  new_status: ReportStatus
  changed_by: string | null
  notes: string | null
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
