import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const role = ref<string | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email)
  
  const isAdmin = computed(() => role.value === 'admin')

  async function initialize() {
    if (loading.value === false) return // Already initialized
    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null
      if (user.value) await fetchProfile()
      
      supabase.auth.onAuthStateChange(async (_event, _session) => {
        session.value = _session
        user.value = _session?.user ?? null
        if (user.value) await fetchProfile()
        else role.value = null
      })
    } catch (err) {
      console.error('Failed to initialize Supabase Auth:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    if (!user.value) return
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single()
    
    if (!error && data) {
      role.value = data.role
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    session.value = null
    role.value = null
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    userEmail,
    isAdmin,
    role,
    initialize,
    signOut
  }
})
