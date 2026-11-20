import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, getAuthToken, setAuthToken } from '@/lib/api'
import type { AuthUser, UserRole } from '@/types/report'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const role = ref<UserRole | null>(null)
  const loading = ref(true)
  let initPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email ?? '')

  const isAdmin = computed(() => role.value === 'admin')
  const isSupervisor = computed(() => role.value === 'supervisor' || role.value === 'admin')
  const isOperator = computed(
    () => role.value === 'operator' || role.value === 'supervisor' || role.value === 'admin'
  )
  const isCitizen = computed(() => role.value === 'citizen')

  async function initialize() {
    if (!loading.value) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      loading.value = true
      try {
        const token = getAuthToken()
        if (!token) {
          user.value = null
          role.value = null
          return
        }
        const { user: me } = await api.get<{ user: AuthUser }>('/api/auth/me')
        user.value = me
        role.value = me.role
      } catch {
        setAuthToken(null)
        user.value = null
        role.value = null
      } finally {
        loading.value = false
        initPromise = null
      }
    })()

    return initPromise
  }

  async function signIn(email: string, password: string): Promise<AuthUser> {
    const { token, user: loggedUser } = await api.post<{ token: string; user: AuthUser }>(
      '/api/auth/login',
      { email, password }
    )
    setAuthToken(token)
    user.value = loggedUser
    role.value = loggedUser.role
    loading.value = false
    return loggedUser
  }

  async function signOut() {
    setAuthToken(null)
    user.value = null
    role.value = null
  }

  return {
    user,
    role,
    loading,
    isAuthenticated,
    userEmail,
    isAdmin,
    isSupervisor,
    isOperator,
    isCitizen,
    initialize,
    signIn,
    signOut
  }
})
