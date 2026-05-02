<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw error
    
    const redirectPath = (route.query.redirect as string) || '/gestion'
    router.push(redirectPath)
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
      <div class="login-panel__content">
        <div class="login-panel__logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
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
      <div class="login-card card">
        <h3>Panel Operativo</h3>
        <p class="small" style="margin-bottom: 20px;">
          Acceso exclusivo para operadores y administradores de ESSMAR.
        </p>

        <form @submit.prevent="handleLogin">
          <div class="field">
            <label>Correo electrónico</label>
            <input 
              v-model="email" 
              type="email" 
              placeholder="usuario@essmar.gov.co" 
              required 
              :disabled="loading"
            />
          </div>
          
          <div class="field">
            <label>Contraseña</label>
            <input 
              v-model="password" 
              type="password" 
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
            style="width: 100%; margin-top: 20px; padding: 11px 20px;" 
            :disabled="loading"
          >
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
  grid-template-columns: 400px 1fr;
  min-height: calc(100vh - 70px);
}

/* ─── Left panel ─── */
.login-panel {
  background: var(--nav-bg);
  color: var(--nav-text);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 36px;
  position: relative;
  overflow: hidden;
}
.login-panel::before {
  content: '';
  position: absolute;
  top: -60%;
  right: -40%;
  width: 80%;
  height: 120%;
  background: radial-gradient(ellipse, rgba(13, 148, 136, 0.12) 0%, transparent 70%);
  pointer-events: none;
}

.login-panel__content {
  position: relative;
  z-index: 1;
}

.login-panel__logo {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: white;
  margin-bottom: 20px;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

.login-panel h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
  margin-bottom: 6px;
  letter-spacing: 0.04em;
}

.login-panel__subtitle {
  font-size: 13px;
  opacity: 0.5;
  line-height: 1.5;
  margin-bottom: 32px;
  color: var(--nav-text) !important;
}

.login-panel__features {
  display: grid;
  gap: 12px;
}

.login-panel__feature {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  opacity: 0.7;
  color: var(--nav-text);
}
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
  background: var(--bg);
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-card h3 {
  justify-content: flex-start;
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}

.link-accent {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}
.link-accent:hover {
  text-decoration: underline;
}

/* ─── Responsive ─── */
@media (max-width: 860px) {
  .login-layout {
    grid-template-columns: 1fr;
  }

  .login-panel {
    padding: 28px 24px;
  }

  .login-panel__features {
    display: none;
  }

  .login-panel h2 {
    font-size: 1.2rem;
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
