<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <main class="home-layout">
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">Sistema de Gestión y Valoración de Incidentes</h1>
        <p class="hero-subtitle">
          Reporta fugas, alcantarillado rebosado y otros incidentes en la infraestructura de acueducto de tu ciudad. Rápido, fácil y transparente.
        </p>

        <div class="action-cards">
          <!-- Tarjeta Reportar -->
          <RouterLink to="/reportar" class="action-card primary">
            <div class="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <RouterLink to="/rastrear" class="action-card secondary">
            <div class="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <RouterLink :to="auth.isAuthenticated ? '/gestion' : '/login'" class="action-card outline">
            <div class="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
  min-height: calc(100vh - 70px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: var(--bg);
  background-image: radial-gradient(color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px);
  background-size: 40px 40px;
}

.hero-section {
  max-width: 900px;
  width: 100%;
}

.hero-content {
  text-align: center;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 20px;
  color: var(--text);
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--text) 0%, var(--primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--muted);
  max-width: 600px;
  margin: 0 auto 48px;
  line-height: 1.6;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  text-align: left;
}

.action-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.action-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--text);
}

.action-card p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.5;
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.card-arrow {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%) translateX(-10px);
  opacity: 0;
  font-size: 1.5rem;
  color: var(--text);
  font-weight: bold;
  transition: all 0.3s ease;
}

/* Primary Card */
.action-card.primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: white;
  box-shadow: 0 10px 30px color-mix(in srgb, var(--primary) 30%, transparent);
}
.action-card.primary h3, .action-card.primary p, .action-card.primary .card-arrow {
  color: white;
}
.action-card.primary .card-icon {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Secondary Card */
.action-card.secondary {
  background: var(--card);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-sm);
}
.action-card.secondary .card-icon {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
}

/* Outline Card */
.action-card.outline {
  background: transparent;
  border: 2px dashed var(--stroke);
}
.action-card.outline .card-icon {
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

/* Hover Effects */
.action-card:hover {
  transform: translateY(-5px);
}
.action-card.secondary:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}
.action-card.outline:hover {
  border-color: var(--text);
  border-style: solid;
  background: var(--card);
}
.action-card:hover .card-icon {
  transform: scale(1.05);
}
.action-card:hover .card-arrow {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  .hero-subtitle {
    font-size: 1.1rem;
    margin-bottom: 32px;
  }
  .action-cards {
    grid-template-columns: 1fr;
  }
}
</style>
