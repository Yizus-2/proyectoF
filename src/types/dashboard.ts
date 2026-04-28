import type { Leak } from './leak'
import type { Pressure } from './pressure'

export interface DashboardKpis {
  leaks_total: number
  pressures_total: number
  recent_leaks: Leak[]
  recent_pressures: Pressure[]
}

export interface MapData {
  leaks: Array<{ id: number; lat: number; lng: number; address: string; status: string }>
  pressures: Array<{ id: number; lat: number; lng: number; value: number; hydrant_id: number }>
}
