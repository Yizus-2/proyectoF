export type LeakStatus = 'REPORTADA' | 'EN_PROCESO' | 'ATENDIDA' | 'CERRADA'
export type LeakSource = 'WEB' | 'OFFLINE' | 'WHATSAPP'

export interface Leak {
  id: number
  work_order: string | null
  reporter_name: string
  reporter_phone: string | null
  address: string
  sector: string | null
  lat: number | null
  lng: number | null
  status: LeakStatus
  source: LeakSource
  photo_path?: string | null
  created_at?: string
  updated_at?: string
}

export interface LeakCreatePayload {
  work_order?: string | null
  reporter_name: string
  reporter_phone?: string | null
  address: string
  sector?: string | null
  lat?: number | null
  lng?: number | null
  status: LeakStatus
  source: LeakSource
}
