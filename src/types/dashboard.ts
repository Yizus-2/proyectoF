
export interface KpiSummary {
  total_reports: number
  digital_reports: number
  digital_adoption_pct: number
  active_reports: number
  avg_attention_hours: number | null
  total_closed: number
  sla_compliance_pct: number | null
  recurrent_reports: number
  recurrence_rate_pct: number | null
  avg_csat_score: number | null
  total_ratings: number
  last_refreshed: string
}

export interface ReportsByZone {
  zone_id: number
  zone_name: string
  zone_code: string
  sla_hours: number
  total_reports: number
  active_reports: number
  recurrent_reports: number
  avg_hours: number | null
}

export interface MapData {
  reports: Array<{ 
    id: number; 
    lat: number; 
    lng: number; 
    address: string; 
    status: string;
    priority: string;
    category: string;
  }>
}
