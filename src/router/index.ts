import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { 
      path: '/', 
      name: 'home',
      component: () => import('@/views/HomeView.vue') 
    },
    { 
      path: '/login', 
      name: 'login', 
      component: () => import('@/views/LoginView.vue') 
    },
    { 
      path: '/reportar', 
      name: 'report', 
      component: () => import('@/views/ReportView.vue') 
    },
    { 
      path: '/rastrear', 
      name: 'track', 
      component: () => import('@/views/TrackView.vue') 
    },
    { 
      path: '/indicadores', 
      name: 'dashboard', 
      component: () => import('@/views/indicadores/Dashboard.vue'),
      meta: { requiresAuth: true, role: 'admin' }
    },
    { 
      path: '/gestion', 
      name: 'gestion', 
      component: () => import('@/views/indicadores/GestionView.vue'),
      meta: { requiresAuth: true, role: 'operator' }
    },
    {
      path: '/encuesta/:code',
      name: 'survey',
      component: () => import('@/views/SurveyView.vue')
    },
    {
      path: '/operarios',
      name: 'operarios',
      component: () => import('@/views/ManagementOperariosView.vue'),
      meta: { requiresAuth: true, role: 'admin' }
    }
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
    // Si la ruta pide admin (ej. indicadores) pero es operator, mandarlo a gestion
    if (auth.isOperator) next({ name: 'gestion' })
    else next({ name: 'home' })
  } else if (requiresAuth && requiredRole === 'operator' && !auth.isOperator && !auth.isAdmin) {
    next({ name: 'report' })
  } else if (to.name === 'track' && auth.isAdmin) {
    // Admin no debe consultar rastreo ciudadano
    next({ name: 'dashboard' })
  } else if (isLoginPage && auth.isAuthenticated) {
    if (auth.isAdmin) {
      next({ name: 'dashboard' })
    } else if (auth.isOperator) {
      next({ name: 'gestion' })
    } else {
      next({ name: 'home' })
    }
  } else {
    next()
  }
})

export default router
