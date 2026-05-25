<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <main class="home-layout">
    <div class="home-ambient"></div>

    <div class="hero-section">
      <div class="hero-content">
        <div class="hero-badge animate-slide-up">
          <span class="badge-dot"></span>
          Plataforma activa 24/7
        </div>

        <h1 class="hero-title animate-slide-up stagger-1">
          Gestión y Valoración<br/>de Incidentes
        </h1>

        <p class="hero-subtitle animate-slide-up stagger-2">
          Reporta fugas, alcantarillado rebosado y otros incidentes en la infraestructura de acueducto de tu ciudad. Rápido, fácil y transparente.
        </p>

        <div class="action-cards">
          <!-- Tarjeta Reportar -->
          <RouterLink to="/reportar" class="action-card primary animate-slide-up stagger-3">
            <div class="card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="card-text">
              <h3>Reportar Incidente</h3>
              <p>Inicia un nuevo reporte geolocalizado en 3 sencillos pasos.</p>
            </div>
            <div class="card-arrow">→</div>
          </RouterLink>

          <!-- Tarjeta Consultar -->
          <RouterLink to="/rastrear" class="action-card secondary animate-slide-up stagger-4">
            <div class="card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div class="card-text">
              <h3>Consultar Estado</h3>
              <p>Revisa el progreso de tu reporte usando tu código de seguimiento.</p>
            </div>
            <div class="card-arrow">→</div>
          </RouterLink>

          <!-- Tarjeta Portal Operadores -->
          <RouterLink :to="auth.isAuthenticated ? '/indicadores' : '/login'" class="action-card outline animate-slide-up stagger-5">
            <div class="card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div class="card-text">
              <h3>Portal Operativo</h3>
              <p>Acceso exclusivo para el personal de gestión y administración.</p>
            </div>
            <div class="card-arrow">→</div>
          </RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.home-layout {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

/* Ambient decorations */
.home-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(ellipse 50% 40% at 15% 20%, rgba(45, 27, 105, 0.07) 0%, transparent 60%),
    radial-gradient(ellipse 40% 50% at 85% 80%, rgba(6, 182, 160, 0.09) 0%, transparent 60%);
}
.home-ambient::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 50% 50%, var(--stroke) 1px, transparent 1px);
  background-size: 48px 48px;
  opacity: 0.4;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent);
}

.hero-section {
  max-width: 900px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.hero-content {
  text-align: center;
}

/* Status badge */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px 6px 12px;
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 24px;
  letter-spacing: -0.01em;
}
.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse-glow 2s ease-in-out infinite;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.08;
  margin-bottom: 20px;
  color: var(--text);
  letter-spacing: -0.04em;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--muted);
  max-width: 580px;
  margin: 0 auto 48px;
  line-height: 1.65;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 20px;
  text-align: left;
}

.action-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all 0.35s var(--ease-out-expo);
  position: relative;
  overflow: hidden;
}

.action-card h3 {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--text);
  border: none;
  padding: 0;
}

.action-card p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.5;
}

.card-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: transform 0.35s var(--ease-spring);
}

.card-arrow {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%) translateX(-8px);
  opacity: 0;
  font-size: 1.4rem;
  font-weight: bold;
  transition: all 0.35s var(--ease-out-expo);
}

/* Primary Card */
.action-card.primary {
  background: var(--gradient-brand);
  color: white;
  box-shadow: 0 8px 28px color-mix(in srgb, var(--primary) 25%, transparent);
}
.action-card.primary h3,
.action-card.primary p,
.action-card.primary .card-arrow {
  color: rgba(255,255,255,0.95);
}
.action-card.primary p { opacity: 0.75; }
.action-card.primary .card-icon {
  background: rgba(255, 255, 255, 0.18);
  color: white;
}

/* Secondary Card */
.action-card.secondary {
  background: var(--card);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-sm);
}
.action-card.secondary .card-icon {
  background: var(--accent-soft);
  color: var(--accent);
}

/* Outline Card */
.action-card.outline {
  background: transparent;
  border: 1.5px dashed var(--stroke);
}
.action-card.outline .card-icon {
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

/* Hover Effects */
.action-card:hover {
  transform: translateY(-4px);
}
.action-card.primary:hover {
  box-shadow: 0 12px 36px color-mix(in srgb, var(--primary) 35%, transparent);
}
.action-card.secondary:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
}
.action-card.outline:hover {
  border-color: var(--text-secondary);
  border-style: solid;
  background: var(--card);
}
.action-card:hover .card-icon {
  transform: scale(1.08);
}
.action-card:hover .card-arrow {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.2rem;
  }
  .hero-subtitle {
    font-size: 1.05rem;
    margin-bottom: 32px;
  }
  .action-cards {
    grid-template-columns: 1fr;
  }
}
</style>
