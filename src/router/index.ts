import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
    { path: '/fugas', name: 'leaks-list', component: () => import('@/views/LeaksListView.vue') },
    { path: '/fugas/nueva', name: 'leak-create', component: () => import('@/views/LeakCreateView.vue') },
    { path: '/hidrantes', name: 'hydrants', component: () => import('@/views/HydrantsView.vue') },
    { path: '/presiones/nueva', name: 'pressure-create', component: () => import('@/views/PressureCreateView.vue') }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  
  if (auth.loading) {
    await auth.initialize()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiredRole = to.meta.role as string | undefined
  const isLoginPage = to.name === 'login'

  if (requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (requiresAuth && requiredRole === 'admin' && !auth.isAdmin) {
    // If user is logged in but lacks admin role, send to home
    next({ name: 'home' })
  } else if (isLoginPage && auth.isAuthenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
