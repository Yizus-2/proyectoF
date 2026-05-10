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
      path: '/gestion', 
      name: 'management', 
      component: () => import('@/views/ManagementView.vue'),
      meta: { requiresAuth: true, role: 'operator' } 
    },
    { 
      path: '/indicadores', 
      name: 'dashboard', 
      component: () => import('@/views/DashboardKpiView.vue'),
      meta: { requiresAuth: true, role: 'operator' }
    },
    {
      path: '/encuesta/:code',
      name: 'survey',
      component: () => import('@/views/SurveyView.vue')
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
  } else if (requiresAuth && requiredRole === 'operator' && !auth.isOperator) {
    next({ name: 'report' })
  } else if (isLoginPage && auth.isAuthenticated) {
    if (auth.isOperator || auth.isAdmin) {
      next({ name: 'management' })
    } else {
      next({ name: 'home' })
    }
  } else {
    next()
  }
})

export default router
