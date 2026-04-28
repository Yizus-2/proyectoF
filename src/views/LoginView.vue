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
const successMsg = ref('')
const isSignUp = ref(false)

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw error
    
    // Redirect to originally requested page or home
    const redirectPath = (route.query.redirect as string) || '/'
    router.push(redirectPath)
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}

async function handleSignUp() {
  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  
  try {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value
    })

    if (error) throw error
    
    successMsg.value = 'Cuenta creada exitosamente. Ya puede iniciar sesión.'
    isSignUp.value = false
    password.value = ''
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al crear la cuenta'
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  isSignUp.value = !isSignUp.value
  errorMsg.value = ''
  successMsg.value = ''
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
        <p class="login-panel__subtitle">Sistema Interno de Gestión de Vías e Infraestructura</p>
        <div class="login-panel__features">
          <div class="login-panel__feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Registro georreferenciado de fugas</span>
          </div>
          <div class="login-panel__feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Control de presiones por hidrante</span>
          </div>
          <div class="login-panel__feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Visualización GIS en tiempo real</span>
          </div>
          <div class="login-panel__feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Funciona sin conexión a internet</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right: Form -->
    <section class="login-form-area">
      <div class="login-card card">
        <h3>{{ isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión' }}</h3>
        <p class="small" style="margin-bottom: 20px;">
          {{ isSignUp 
            ? 'Registre su cuenta para acceder al sistema.' 
            : 'Ingrese sus credenciales para continuar.' 
          }}
        </p>

        <form @submit.prevent="isSignUp ? handleSignUp() : handleLogin()">
          <div class="field">
            <label>Correo electrónico</label>
            <input 
              v-model="email" 
              type="email" 
              placeholder="usuario@correo.com" 
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
              :minlength="isSignUp ? 6 : undefined"
            />
            <p v-if="isSignUp" class="small" style="opacity: 0.6;">Mínimo 6 caracteres</p>
          </div>

          <div v-if="errorMsg" class="notice notice--error" style="margin-top: 8px;">
            {{ errorMsg }}
          </div>

          <div v-if="successMsg" class="notice notice--success" style="margin-top: 8px;">
            {{ successMsg }}
          </div>

          <button 
            type="submit" 
            class="btn-primary" 
            style="width: 100%; margin-top: 20px; padding: 11px 20px;" 
            :disabled="loading"
          >
            {{ loading 
              ? (isSignUp ? 'Creando cuenta...' : 'Verificando...') 
              : (isSignUp ? 'Crear cuenta' : 'Acceder') 
            }}
          </button>
        </form>

        <div style="margin-top: 14px;">
          <button 
            class="btn"
            style="width: 100%; background: transparent; border-color: transparent; color: var(--accent); font-size: 13px;"
            @click="toggleMode"
            :disabled="loading"
          >
            {{ isSignUp ? '¿Ya tiene cuenta? Iniciar sesión' : '¿No tiene cuenta? Registrarse' }}
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  min-height: calc(100vh - 54px);
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
