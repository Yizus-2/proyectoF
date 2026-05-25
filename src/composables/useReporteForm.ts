import { ref, computed } from 'vue'
import type { ReporteFormState, PasoWizard } from '@/types/reporteForm'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const estadoInicial: ReporteFormState = {
  pasoActual: 1,
  paso1: {
    tipo: null,
    descripcion: '',
    urgenciaUsuario: null
  },
  paso2: {
    direccion: '',
    zona: '',
    latitud: null,
    longitud: null,
    ubicacionConfirmada: false
  },
  paso3: {
    canal: 'web', // Valor por defecto
    nombre: '',
    telefono: '',
    email: ''
  }
}

// Singleton state
const state = ref<ReporteFormState>(JSON.parse(JSON.stringify(estadoInicial)))

export function useReporteForm() {
  const paso1Valido = computed(() => {
    return state.value.paso1.tipo !== null &&
           state.value.paso1.descripcion.trim().length >= 20 &&
           state.value.paso1.urgenciaUsuario !== null
  })

  const paso2Valido = computed(() => {
    return state.value.paso2.direccion.trim().length > 5 &&
           state.value.paso2.zona !== ''
    // Latitud y longitud son opcionales
  })

  const paso3Valido = computed(() => {
    return state.value.paso3.nombre.trim().length > 2 &&
           /^\+57[0-9]{10}$/.test(state.value.paso3.telefono)
  })

  function irAPaso(paso: PasoWizard) {
    if (paso > state.value.pasoActual + 1) return
    if (paso === 2 && !paso1Valido.value) return
    if (paso === 3 && !paso2Valido.value) return
    state.value.pasoActual = paso
  }

  function siguientePaso() {
    if (state.value.pasoActual === 1 && paso1Valido.value) {
      state.value.pasoActual = 2
    } else if (state.value.pasoActual === 2 && paso2Valido.value) {
      state.value.pasoActual = 3
    }
  }

  function pasoAnterior() {
    if (state.value.pasoActual > 1) {
      state.value.pasoActual = (state.value.pasoActual - 1) as PasoWizard
    }
  }

  function obtenerUbicacionGPS(): Promise<{ lat: number, lng: number }> {
    if (!navigator.geolocation) {
      return Promise.reject(new Error('Geolocalización no soportada en este dispositivo'))
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.value.paso2.latitud = pos.coords.latitude
          state.value.paso2.longitud = pos.coords.longitude
          state.value.paso2.ubicacionConfirmada = true
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          reject(new Error('No se pudo obtener ubicación. Intente manualmente en el mapa o escriba la dirección.'))
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  function actualizarPinMapa(lat: number, lng: number) {
    state.value.paso2.latitud = lat
    state.value.paso2.longitud = lng
    state.value.paso2.ubicacionConfirmada = true
  }

  function resetearFormulario() {
    state.value = JSON.parse(JSON.stringify(estadoInicial))
  }

  async function enviarReporte() {
    if (!paso1Valido.value || !paso2Valido.value || !paso3Valido.value) {
      throw new Error('Formulario incompleto')
    }

    // Buscar el zone_id basado en el nombre de la zona seleccionada
    let zoneId = null
    if (state.value.paso2.zona) {
      const { data: zData } = await supabase.from('zones').select('id').eq('name', state.value.paso2.zona).single()
      if (zData) zoneId = zData.id
    }

    const auth = useAuthStore()

    // Mapear al esquema de la base de datos reports
    const payload = {
      reporter_id: auth.user?.id || null,
      reporter_name: state.value.paso3.nombre || 'Ciudadano Anónimo',
      reporter_phone: state.value.paso3.telefono || null,
      reporter_email: state.value.paso3.email || null,
      category: state.value.paso1.tipo, // 'fuga', 'presion', etc
      priority: state.value.paso1.urgenciaUsuario?.toUpperCase(), // 'CRITICA', 'ALTA', etc
      description: state.value.paso1.descripcion,
      address: state.value.paso2.direccion || 'Ubicación seleccionada en mapa',
      zone_id: zoneId,
      lat: state.value.paso2.latitud,
      lng: state.value.paso2.longitud,
      source: 'WEB'
    }

    const { data, error } = await supabase.from('reports').insert(payload).select('id, tracking_code').single()
    if (error) throw error

    // Disparar asignación automática (como en la versión antigua)
    try {
      if (data && data.id) {
        await supabase.rpc('assign_crew_automatically', { p_report_id: data.id })
      }
    } catch (assignErr) {
      console.warn('Asignación automática falló:', assignErr)
    }

    return data?.tracking_code
  }

  function getPayloadFormateado() {
    return {
      tipo: state.value.paso1.tipo,
      descripcion: state.value.paso1.descripcion,
      riesgo: state.value.paso1.urgenciaUsuario,
      direccion: state.value.paso2.direccion,
      zona: state.value.paso2.zona,
      coordenadas: (state.value.paso2.latitud && state.value.paso2.longitud)
        ? { lat: state.value.paso2.latitud, lng: state.value.paso2.longitud }
        : null,
      canal_reporte: state.value.paso3.canal,
      nombre_ciudadano: state.value.paso3.nombre,
      telefono_ciudadano: state.value.paso3.telefono,
      email_ciudadano: state.value.paso3.email
    }
  }

  return {
    state,
    paso1Valido,
    paso2Valido,
    paso3Valido,
    irAPaso,
    siguientePaso,
    pasoAnterior,
    obtenerUbicacionGPS,
    actualizarPinMapa,
    resetearFormulario,
    getPayloadFormateado,
    enviarReporte
  }
}
