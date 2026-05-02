<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'

const { isDark, toggle } = useTheme()
const auth = useAuthStore()
const router = useRouter()
const mobileOpen = ref(false)

async function handleLogout() {
  await auth.signOut()
  router.push('/login')
}

function closeMobile() {
  mobileOpen.value = false
}
</script>

<template>
  <header class="navbar">
    <div class="navbar__inner">
      <!-- Brand -->
      <RouterLink to="/" class="navbar__brand" @click="closeMobile">
        <div class="navbar__logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
        </div>
        <div class="navbar__brand-text">
          <span class="navbar__brand-name">ESSMAR</span>
          <span class="navbar__brand-sub">SIGVI</span>
        </div>
      </RouterLink>

      <!-- Hamburger -->
      <button
        class="navbar__hamburger"
        :class="{ 'is-active': mobileOpen }"
        @click="mobileOpen = !mobileOpen"
        aria-label="Menú"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <!-- Navigation -->
      <nav class="navbar__nav" :class="{ 'is-open': mobileOpen }">
        <div class="navbar__links">
          <RouterLink to="/reportar" class="navbar__link" @click="closeMobile">Reportar</RouterLink>
          <RouterLink v-if="auth.isOperator || auth.isAdmin" to="/gestion" class="navbar__link" @click="closeMobile">Gestión</RouterLink>
          <RouterLink v-if="auth.isOperator || auth.isAdmin" to="/indicadores" class="navbar__link" @click="closeMobile">Indicadores</RouterLink>
        </div>

        <div class="navbar__actions">
          <button class="navbar__theme" @click="toggle" :title="isDark ? 'Modo claro' : 'Modo oscuro'">
            <svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>

          <template v-if="auth.isAuthenticated">
            <span class="navbar__user">{{ auth.userEmail }}</span>
            <button class="navbar__btn navbar__btn--outline" @click="handleLogout">Salir</button>
          </template>
          <template v-else>
            <RouterLink to="/login" class="navbar__btn navbar__btn--solid" @click="closeMobile">Acceder</RouterLink>
          </template>
        </div>
      </nav>
    </div>

    <!-- Mobile overlay -->
    <div v-if="mobileOpen" class="navbar__overlay" @click="closeMobile"></div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--nav-bg) 75%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 24px -6px rgba(0, 0, 0, 0.25);
  transition: background-color var(--transition-slow);
}

.navbar__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 70px;
}

/* ─── Brand ─── */
.navbar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--nav-text);
  flex-shrink: 0;
}

.navbar__logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: white;
}

.navbar__brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.navbar__brand-name {
  font-weight: 800;
  font-size: 17px;
  letter-spacing: 0.06em;
}
.navbar__brand-sub {
  font-weight: 500;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.1em;
}

/* ─── Nav ─── */
.navbar__nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.navbar__links {
  display: flex;
  align-items: center;
  gap: 1px;
}

.navbar__link {
  position: relative;
  padding: 8px 16px;
  color: var(--nav-text);
  opacity: 0.65;
  text-decoration: none;
  font-size: 14.5px;
  font-weight: 500;
  border-radius: 999px;
  transition: all var(--transition);
  white-space: nowrap;
}
.navbar__link:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}
.navbar__link.router-link-exact-active {
  opacity: 1;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent-light);
}
.navbar__link.router-link-exact-active::after {
  content: '';
  position: absolute;
  bottom: 0px;
  left: 20px;
  right: 20px;
  height: 2px;
  background: var(--accent-light);
  border-radius: 2px 2px 0 0;
}

.navbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

/* ─── User ─── */
.navbar__user {
  font-size: 13.5px;
  color: var(--nav-text);
  opacity: 0.5;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Buttons ─── */
.navbar__btn {
  padding: 8px 18px;
  border-radius: var(--radius-xs);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition);
  border: none;
  font-family: inherit;
  white-space: nowrap;
  letter-spacing: 0.02em;
}
.navbar__btn--solid {
  background: var(--accent);
  color: white;
}
.navbar__btn--solid:hover {
  background: var(--accent-light);
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
}
.navbar__btn--outline {
  background: transparent;
  color: var(--nav-text);
  opacity: 0.7;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.navbar__btn--outline:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.06);
}

/* ─── Theme Toggle ─── */
.navbar__theme {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-xs);
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--nav-text);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--transition);
  flex-shrink: 0;
  opacity: 0.6;
}
.navbar__theme:hover {
  background: rgba(255, 255, 255, 0.12);
  opacity: 1;
}

/* ─── Hamburger ─── */
.navbar__hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 34px;
  height: 34px;
  padding: 7px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background var(--transition);
}
.navbar__hamburger:hover {
  background: rgba(255, 255, 255, 0.07);
}
.navbar__hamburger span {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--nav-text);
  border-radius: 2px;
  transition: all 0.3s ease;
  transform-origin: center;
}
.navbar__hamburger.is-active span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.navbar__hamburger.is-active span:nth-child(2) {
  opacity: 0;
}
.navbar__hamburger.is-active span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.navbar__overlay { display: none; }

/* ═══ Mobile ═══ */
@media (max-width: 860px) {
  .navbar__hamburger { display: flex; }

  .navbar__overlay {
    display: block;
    position: fixed;
    inset: 0;
    top: 70px;
    background: rgba(0, 0, 0, 0.5);
    z-index: 98;
    animation: overlayIn 0.2s ease;
  }

  .navbar__nav {
    position: fixed;
    top: 70px;
    right: 0;
    bottom: 0;
    width: min(280px, 80vw);
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 14px;
    background: color-mix(in srgb, var(--nav-bg) 90%, transparent);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow-y: auto;
    z-index: 99;
    border-left: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
  }
  .navbar__nav.is-open { transform: translateX(0); }

  .navbar__links {
    flex-direction: column;
    gap: 2px;
  }

  .navbar__link {
    padding: 11px 14px;
    font-size: 14px;
    border-radius: var(--radius-sm);
  }
  .navbar__link.router-link-exact-active::after { display: none; }
  .navbar__link.router-link-exact-active {
    background: rgba(255, 255, 255, 0.1);
  }

  .navbar__actions {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    flex-direction: column;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin-top: 8px;
    padding-top: 12px;
    gap: 8px;
  }

  .navbar__user {
    padding: 4px 0;
    max-width: none;
  }

  .navbar__btn {
    padding: 11px 14px;
    text-align: center;
    width: 100%;
    font-size: 13.5px;
  }

  .navbar__theme {
    width: 100%;
    height: 42px;
    border-radius: var(--radius-sm);
    opacity: 1;
  }
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
