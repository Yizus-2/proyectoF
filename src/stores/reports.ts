import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import type { Report, Zone, ZoneAnalytics } from '@/types/report'
import { useToastStore } from '@/stores/toast'

export const useReportsStore = defineStore('reports', () => {
  const reports = ref<Report[]>([])
  const zones = ref<Zone[]>([])
  const zonesData = ref<ZoneAnalytics[]>([])
  const filterDate = ref<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL')
  const kpiFilter = ref<'ALL' | 'PENDING' | 'RESOLVED' | 'CRITICAL'>('ALL')
  const loading = ref(false)
  const error = ref<string | null>(null)
  let eventSource: EventSource | null = null

  const filteredReports = computed(() => {
    if (filterDate.value === 'ALL') return reports.value

    const now = new Date()
    const startDate = new Date()

    if (filterDate.value === 'TODAY') {
      startDate.setHours(0, 0, 0, 0)
    } else if (filterDate.value === 'WEEK') {
      startDate.setDate(now.getDate() - now.getDay())
      startDate.setHours(0, 0, 0, 0)
    } else if (filterDate.value === 'MONTH') {
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
    }

    return reports.value.filter((r) => new Date(r.created_at) >= startDate)
  })

  async function fetchZones() {
    try {
      zones.value = await api.get<Zone[]>('/api/zones')
    } catch (err) {
      console.error('Error fetching zones:', err)
    }
  }

  async function fetchReports() {
    loading.value = true
    error.value = null
    try {
      const [reportsRes, zonesRes, zoneAnalyticsRes] = await Promise.all([
        api.get<Report[]>('/api/reports'),
        api.get<Zone[]>('/api/zones'),
        api.get<ZoneAnalytics[]>('/api/analytics/zones').catch(() => [] as ZoneAnalytics[])
      ])
      reports.value = reportsRes
      zones.value = zonesRes
      zonesData.value = zoneAnalyticsRes
    } catch (err: any) {
      console.error('Error fetching reports from API:', err)
      error.value = err.message || 'Error al cargar los reportes'
    } finally {
      loading.value = false
    }
  }

  function subscribeToReports() {
    if (eventSource || typeof EventSource === 'undefined') return
    try {
      eventSource = new EventSource(api.eventsUrl())

      eventSource.addEventListener('report:created', (event) => {
        fetchReports()
        try {
          const newReport = JSON.parse((event as MessageEvent).data) as Partial<Report>
          if (newReport.priority === 'CRITICA') {
            const toastStore = useToastStore()
            toastStore.addToast({
              title: '¡Nuevo Reporte Crítico!',
              message: `PQR: ${newReport.tracking_code || 'Nuevo'} - ${(newReport.category || '').replace('_', ' ')}. Requiere atención inmediata.`,
              type: 'error',
              duration: 10000
            })
          }
        } catch {
          // Ignore malformed SSE payload
        }
      })

      eventSource.addEventListener('report:updated', () => {
        fetchReports()
      })
    } catch (err) {
      console.warn('SSE realtime connection unavailable:', err)
    }
  }

  function unsubscribe() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  // KPIs reales (sin valores falsos hardcodeados)
  const kpis = computed(() => {
    const list = filteredReports.value
    const total = list.length

    const pending = list.filter((r) =>
      [
        'REPORTADO',
        'CLASIFICADO',
        'ASIGNADO',
        'EN_PROGRESO',
        'EVIDENCIA_PENDIENTE',
        'VERIFICACION_SUPERVISOR'
      ].includes(r.status)
    ).length

    const resolved = list.filter((r) => ['RESUELTO', 'CERRADO', 'EVALUADO'].includes(r.status)).length

    const critical = list.filter(
      (r) =>
        ['REPORTADO', 'CLASIFICADO', 'ASIGNADO', 'EN_PROGRESO'].includes(r.status) &&
        r.priority === 'CRITICA'
    ).length

    const resolvedList = list.filter((r) => r.resolved_at && r.created_at)
    let avgTime: number | null = null
    if (resolvedList.length > 0) {
      const totalHours = resolvedList.reduce((acc, r) => {
        const diff = new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()
        return acc + Math.max(0, diff / (1000 * 60 * 60))
      }, 0)
      avgTime = Math.round((totalHours / resolvedList.length) * 10) / 10
    }

    return { total, pending, resolved, critical, avgTime }
  })

  // Tendencia últimos 7 días
  const trendStats = computed(() => {
    const last7Days = [...Array(7)]
      .map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return d.toISOString().split('T')[0]
      })
      .reverse()
    const tCounts = Object.fromEntries(last7Days.map((d) => [d, 0]))
    filteredReports.value.forEach((r) => {
      const date = r.created_at.split('T')[0]
      if (tCounts[date] !== undefined) tCounts[date]++
    })
    return Object.entries(tCounts).map(([date, value]) => {
      const [, m, d] = date.split('-')
      return { label: `${d}/${m}`, value }
    })
  })

  // Estadísticas por prioridad
  const priorityStats = computed(() => {
    const countsPriority: Record<string, number> = { CRITICA: 0, ALTA: 0, MEDIA: 0, BAJA: 0 }
    filteredReports.value.forEach((r) => {
      if (countsPriority[r.priority] !== undefined) countsPriority[r.priority]++
    })
    return Object.entries(countsPriority).map(([label, value]) => ({ label, value }))
  })

  // Estadísticas por canal
  const channelStats = computed(() => {
    const countsChannels: Record<string, number> = {
      APP_MOVIL: 0,
      WEB: 0,
      WHATSAPP: 0,
      TELEFONO: 0,
      CORREO: 0,
      PRESENCIAL: 0,
      BOTON_EMERGENCIA: 0,
      OFFLINE: 0
    }
    filteredReports.value.forEach((r) => {
      const src = r.source || 'WEB'
      if (countsChannels[src] !== undefined) countsChannels[src]++
    })

    const channelMapping: Record<string, string> = {
      APP_MOVIL: 'App Móvil',
      WEB: 'Portal Web',
      WHATSAPP: 'WhatsApp',
      TELEFONO: 'Línea Telefónica',
      CORREO: 'Correo Electrónico',
      PRESENCIAL: 'Oficina Física',
      BOTON_EMERGENCIA: 'Botón Emergencia',
      OFFLINE: 'Modo Offline'
    }

    return Object.entries(countsChannels).map(([key, value]) => ({
      label: channelMapping[key] || key,
      value
    }))
  })

  // Estadísticas SLA reales basadas en sla_hours de la zona
  const slaStats = computed(() => {
    const countsSla: Record<string, number> = {
      'A TIEMPO': 0,
      RIESGO: 0,
      VENCIDO: 0,
      FINALIZADO: 0
    }
    const zoneMap = new Map(zones.value.map((z) => [z.id, z.sla_hours]))

    filteredReports.value.forEach((r) => {
      if (['CERRADO', 'EVALUADO', 'RESUELTO', 'RECHAZADO'].includes(r.status)) {
        countsSla['FINALIZADO']++
        return
      }
      const slaHours = (r.zone_id && zoneMap.get(r.zone_id)) || r.sla_hours || 24
      const elapsedHours = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
      if (elapsedHours > slaHours) {
        countsSla['VENCIDO']++
      } else if (elapsedHours > slaHours * 0.75) {
        countsSla['RIESGO']++
      } else {
        countsSla['A TIEMPO']++
      }
    })
    return Object.entries(countsSla).map(([label, value]) => ({ label, value }))
  })

  const recentEvents = computed(() => {
    return [...filteredReports.value]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  })

  return {
    reports,
    zones,
    filteredReports,
    zonesData,
    loading,
    error,
    fetchZones,
    fetchReports,
    subscribeToReports,
    unsubscribe,
    kpis,
    trendStats,
    priorityStats,
    channelStats,
    slaStats,
    recentEvents,
    filterDate,
    kpiFilter
  }
})
