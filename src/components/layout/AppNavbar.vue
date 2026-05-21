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
          <RouterLink to="/rastrear" class="navbar__link" @click="closeMobile">Consultar</RouterLink>
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
  background: color-mix(in srgb, var(--nav-bg) 82%, transparent);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 0 rgba(0,0,0,0.08), 0 4px 20px -4px rgba(0, 0, 0, 0.2);
  transition: background-color var(--transition-slow);
}

.navbar__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
}

/* ─── Brand ─── */
.navbar__brand {
  display: flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  color: var(--nav-text);
  flex-shrink: 0;
  transition: opacity var(--transition);
}
.navbar__brand:hover {
  opacity: 0.9;
}

.navbar__logo {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--gradient-accent);
  color: white;
  box-shadow: 0 2px 12px rgba(12, 154, 141, 0.35);
  transition: transform 0.3s var(--ease-spring);
}
.navbar__brand:hover .navbar__logo {
  transform: scale(1.06) rotate(-2deg);
}

.navbar__brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.navbar__brand-name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.06em;
}
.navbar__brand-sub {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 10.5px;
  opacity: 0.5;
  letter-spacing: 0.12em;
}

/* ─── Nav ─── */
.navbar__nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navbar__links {
  display: flex;
  align-items: center;
  gap: 2px;
}

.navbar__link {
  position: relative;
  padding: 7px 15px;
  color: var(--nav-text);
  opacity: 0.6;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-full);
  transition: all var(--transition);
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.navbar__link:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.07);
}
.navbar__link.router-link-exact-active {
  opacity: 1;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent-light);
}
.navbar__link.router-link-exact-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 18px;
  right: 18px;
  height: 2px;
  background: var(--accent-light);
  border-radius: 2px 2px 0 0;
}

.navbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 14px;
  padding-left: 14px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

/* ─── User ─── */
.navbar__user {
  font-size: 13px;
  color: var(--nav-text);
  opacity: 0.45;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Buttons ─── */
.navbar__btn {
  padding: 7px 18px;
  border-radius: var(--radius-xs);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition);
  border: none;
  font-family: var(--font-body);
  white-space: nowrap;
  letter-spacing: 0.01em;
}
.navbar__btn--solid {
  background: var(--gradient-accent);
  color: white;
  box-shadow: 0 2px 10px rgba(12, 154, 141, 0.3);
}
.navbar__btn--solid:hover {
  box-shadow: 0 4px 16px rgba(12, 154, 141, 0.4);
  transform: translateY(-1px);
}
.navbar__btn--outline {
  background: transparent;
  color: var(--nav-text);
  opacity: 0.65;
  border: 1px solid rgba(255, 255, 255, 0.12);
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
  background: rgba(255, 255, 255, 0.04);
  color: var(--nav-text);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--transition);
  flex-shrink: 0;
  opacity: 0.55;
}
.navbar__theme:hover {
  background: rgba(255, 255, 255, 0.1);
  opacity: 1;
  transform: rotate(15deg);
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
  background: rgba(255, 255, 255, 0.06);
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
    top: 64px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 98;
    animation: overlayIn 0.25s ease;
  }

  .navbar__nav {
    position: fixed;
    top: 64px;
    right: 0;
    bottom: 0;
    width: min(280px, 80vw);
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 16px;
    background: color-mix(in srgb, var(--nav-bg) 94%, transparent);
    backdrop-filter: blur(24px) saturate(1.8);
    -webkit-backdrop-filter: blur(24px) saturate(1.8);
    transform: translateX(100%);
    transition: transform 0.35s var(--ease-out-expo);
    overflow-y: auto;
    z-index: 99;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.25);
  }
  .navbar__nav.is-open { transform: translateX(0); }

  .navbar__links {
    flex-direction: column;
    gap: 2px;
  }

  .navbar__link {
    padding: 12px 14px;
    font-size: 14px;
    border-radius: var(--radius-sm);
  }
  .navbar__link.router-link-exact-active::after { display: none; }
  .navbar__link.router-link-exact-active {
    background: rgba(255, 255, 255, 0.08);
  }

  .navbar__actions {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    flex-direction: column;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    margin-top: 8px;
    padding-top: 12px;
    gap: 8px;
  }

  .navbar__user {
    padding: 4px 0;
    max-width: none;
  }

  .navbar__btn {
    padding: 12px 14px;
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
