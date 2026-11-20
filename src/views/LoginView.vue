<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''

  try {
    const user = await auth.signIn(email.value, password.value)

    const defaultRoute =
      user.role === 'admin' || user.role === 'supervisor'
        ? '/indicadores'
        : user.role === 'operator'
          ? '/gestion'
          : '/'
    const redirectPath = (route.query.redirect as string) || defaultRoute
    await router.push(redirectPath)
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-layout">
    <!-- Left: Branded panel -->
    <aside class="login-panel">
      <div class="login-panel__bg"></div>
      <div class="login-panel__content">
        <div class="login-panel__logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke-width="2.2" fill="rgba(255,255,255,0.15)"/>
            <path d="M8.5 16.5c0-2.5 3.5-5 3.5-5s3.5 2.5 3.5 5" stroke-width="1.6" opacity="0.7"/>
            <circle cx="12" cy="18.5" r="0" fill="currentColor" opacity="0">
              <animate attributeName="r" values="0;2.2;0" dur="3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <h2>ESSMAR</h2>
        <p class="login-panel__subtitle">Sistema de Gestión de Reportes Ciudadanos</p>
        <div class="login-panel__features">
          <div class="login-panel__feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Recepción y triage de reportes de daños</span>
          </div>
          <div class="login-panel__feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Monitoreo GIS en tiempo real</span>
          </div>
          <div class="login-panel__feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Indicadores de rendimiento (KPIs)</span>
          </div>
          <div class="login-panel__feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Detección automática de reincidencia</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right: Form -->
    <section class="login-form-area">
      <div class="login-card card animate-scale-in">
        <h3>Panel Operativo</h3>
        <p class="small" style="margin-bottom: 20px;">
          Acceso exclusivo para operadores y administradores de ESSMAR.
        </p>

        <form @submit.prevent="handleLogin">
          <div class="field">
            <label for="login-email">Correo electrónico</label>
            <input 
              id="login-email"
              name="email"
              v-model="email" 
              type="email" 
              autocomplete="email"
              placeholder="usuario@essmar.gov.co" 
              required 
              :disabled="loading"
            />
          </div>
          
          <div class="field">
            <label for="login-password">Contraseña</label>
            <input 
              id="login-password"
              name="password"
              v-model="password" 
              type="password" 
              autocomplete="current-password"
              placeholder="••••••••" 
              required 
              :disabled="loading"
            />
          </div>

          <div v-if="errorMsg" class="notice notice--error" style="margin-top: 8px;">
            {{ errorMsg }}
          </div>

          <button 
            type="submit" 
            class="btn-primary" 
            style="width: 100%; margin-top: 20px; padding: 12px 20px;" 
            :disabled="loading"
          >
            <span v-if="loading" class="spinner-sm"></span>
            {{ loading ? 'Verificando...' : 'Acceder' }}
          </button>
        </form>

        <div class="login-footer">
          <p>¿Eres ciudadano? <RouterLink to="/reportar" class="link-accent">Reporta un daño aquí</RouterLink></p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  min-height: calc(100vh - 64px);
}

/* ─── Left panel ─── */
.login-panel {
  background: var(--nav-bg);
  color: var(--nav-text);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  position: relative;
  overflow: hidden;
}

.login-panel__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.login-panel__bg::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -30%;
  width: 80%;
  height: 100%;
  background: radial-gradient(ellipse, rgba(6, 182, 160, 0.12) 0%, transparent 65%);
}
.login-panel__bg::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -20%;
  width: 60%;
  height: 80%;
  background: radial-gradient(ellipse, rgba(167, 139, 250, 0.08) 0%, transparent 65%);
}

.login-panel__content {
  position: relative;
  z-index: 1;
}

.login-panel__logo {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--gradient-accent);
  color: white;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(6, 182, 160, 0.4);
}

.login-panel h2 {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 800;
  color: white;
  margin-bottom: 6px;
  letter-spacing: 0.04em;
}

.login-panel__subtitle {
  font-size: 13px;
  opacity: 0.45;
  line-height: 1.5;
  margin-bottom: 32px;
  color: var(--nav-text) !important;
}

.login-panel__features {
  display: grid;
  gap: 14px;
}

.login-panel__feature {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  opacity: 0.65;
  color: var(--nav-text);
  transition: opacity var(--transition);
}
.login-panel__feature:hover { opacity: 0.9; }
.login-panel__feature svg {
  color: var(--accent-light);
  flex-shrink: 0;
}

/* ─── Right form area ─── */
.login-form-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-card h3 {
  justify-content: flex-start;
  font-family: var(--font-display);
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}

/* ─── Responsive ─── */
@media (max-width: 860px) {
  .login-layout {
    grid-template-columns: 1fr;
  }

  .login-panel {
    padding: 24px 20px;
  }

  .login-panel__features {
    display: none;
  }

  .login-panel h2 {
    font-size: 1.15rem;
  }

  .login-panel__subtitle {
    margin-bottom: 0;
    font-size: 12px;
  }

  .login-panel__content {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .login-panel__logo {
    margin-bottom: 0;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .login-panel__logo svg {
    width: 20px;
    height: 20px;
  }

  .login-form-area {
    padding: 24px 16px;
    align-items: flex-start;
  }
}
</style>
