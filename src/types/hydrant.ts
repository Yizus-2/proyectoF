export interface Hydrant {
  id: number
  internal_code: string
  common_name: string
  address: string
  sector: string | null
  lat: number | null
  lng: number | null
}

export interface HydrantCreatePayload {
  internal_code: string
  common_name: string
  address: string
  sector?: string | null
  lat?: number | null
  lng?: number | null
}
