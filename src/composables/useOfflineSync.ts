import { ref, onMounted, onUnmounted } from 'vue'
import { offlineAdd, offlineAll, offlineClear, type OfflineItem } from '@/services/offline'
import { supabase } from '@/lib/supabase'

export function useOfflineSync() {
  const pendingCount = ref(0)
  const syncing = ref(false)
  const message = ref('')

  async function refreshCount() {
    const items = await offlineAll()
    pendingCount.value = items.length
  }

  async function addToQueue(item: Omit<OfflineItem, 'id' | 'created_at'>) {
    await offlineAdd(item)
    await refreshCount()
  }

  async function syncAll() {
    const items = await offlineAll()
    if (!items.length) {
      message.value = "No hay datos pendientes."
      return
    }
    
    syncing.value = true
    try {
      let count = 0
      for (const item of items) {
        let table = ''
        if (item.type === 'LEAK') table = 'leaks'
        if (item.type === 'HYDRANT') table = 'hydrants'
        if (item.type === 'PRESSURE') table = 'pressure_readings'
        
        if (table) {
          const { error } = await supabase.from(table).insert(item.payload)
          if (!error) count++
        }
      }
      
      await offlineClear()
      message.value = `Sincronización exitosa: ${count} operaciones.`
      await refreshCount()
    } catch (err: any) {
      console.error(err)
      message.value = "Error de sincronización."
    } finally {
      syncing.value = false
      setTimeout(() => { if (message.value.includes('exitosa')) message.value = '' }, 3000)
    }
  }

  function handleOnline() {
    syncAll()
  }

  onMounted(() => {
    refreshCount()
    window.addEventListener('online', handleOnline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
  })

  return { pendingCount, syncing, message, addToQueue, syncAll, refreshCount }
}
