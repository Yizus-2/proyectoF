export interface Pressure {
  id: number
  hydrant_id: number
  value: number
  user_name: string
  measured_at: string
  source: 'WEB' | 'OFFLINE'
  lat?: number | null
  lng?: number | null
}

export interface PressureCreatePayload {
  hydrant_id: number
  value: number
  user_name: string
  measured_at: string
  source: 'WEB' | 'OFFLINE'
}
