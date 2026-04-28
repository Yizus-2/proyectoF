<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const features = [
  {
    title: 'Reporte de Fugas',
    desc: 'Registro georreferenciado con GPS, dirección, responsable, evidencia fotográfica y seguimiento de estado.',
    icon: 'leak'
  },
  {
    title: 'Medición de Presiones',
    desc: 'Mediciones vinculadas a hidrantes con histórico, geolocalización automática y exportación.',
    icon: 'pressure'
  },
  {
    title: 'Modo Sin Conexión',
    desc: 'Funciona sin internet. Los datos se almacenan localmente y sincronizan al restablecer la conexión.',
    icon: 'offline'
  }
]
</script>

<template>
  <div class="landing-page">
    <!-- HERO SECTION -->
    <section class="hero">
      <div class="hero__overlay"></div>
      <div class="hero__container container">
        <div class="hero__content">
          <div class="hero__badge">Sistema de Gestión Hídrica</div>
          <h1>Gestión integral de fugas y presiones</h1>
          <p class="hero__lead">
            Plataforma web georreferenciada para centralizar reportes, registrar presiones
            en hidrantes, visualizar mapas GIS y exportar datos operativos en tiempo real.
          </p>
          <div class="hero__actions">
            <template v-if="auth.isAuthenticated">
              <RouterLink class="btn-primary hero-btn" to="/dashboard">Ir al Dashboard</RouterLink>
              <RouterLink class="btn hero-btn hero-btn--ghost" to="/fugas/nueva">Registrar Fuga</RouterLink>
            </template>
            <template v-else>
              <RouterLink class="btn-primary hero-btn" to="/login">Acceder al Sistema</RouterLink>
              <a href="#about" class="btn hero-btn hero-btn--ghost">Saber más</a>
            </template>
          </div>
          <p v-if="!auth.isAuthenticated" class="small hero__note">
            Debe estar autenticado para realizar registros o ver reportes.
          </p>
        </div>
        <div class="hero__visual">
          <div class="hero__image-wrapper">
            <img src="@/assets/mockups/dashboard_mockup.png" alt="Dashboard Preview" class="hero__image" />
            <div class="hero__glow"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- TRUSTED BY -->
    <div class="trusted-by">
      <div class="container">
        <p>Confiado por operadores de agua y equipos de terreno</p>
      </div>
    </div>

    <!-- ABOUT SECTION -->
    <section id="about" class="about-section">
      <div class="container">
        <div class="section-header">
          <h2>Todo lo que necesitas en una sola plataforma</h2>
          <p>Herramientas diseñadas específicamente para el control y mantenimiento de redes hídricas.</p>
        </div>

        <div class="feature-grid">
          <div v-for="f in features" :key="f.icon" class="feature-card card">
            <div class="feature-card__icon" :class="'feature-card__icon--' + f.icon">
              <!-- Leak icon -->
              <svg v-if="f.icon === 'leak'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
              <!-- Pressure icon -->
              <svg v-if="f.icon === 'pressure'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <!-- Offline icon -->
              <svg v-if="f.icon === 'offline'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                <line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
            </div>
            <div class="feature-card__body">
              <h3>{{ f.title }}</h3>
              <p>{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SHOWCASE 1: MOBILE / OFFLINE -->
    <section class="showcase-section showcase-section--alt">
      <div class="container showcase-grid">
        <div class="showcase__content">
          <div class="badge">Trabajo en Terreno</div>
          <h2>Modo Sin Conexión para lugares remotos</h2>
          <p>Sabemos que la cobertura de internet puede ser inestable en el terreno. Por eso, nuestra aplicación está diseñada para funcionar sin conexión (Offline-First).</p>
          <ul class="showcase__list">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              Guarda reportes localmente en tu dispositivo.
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              Sincronización automática al recuperar la señal.
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              No pierdas ninguna medición de presión o evidencia de fuga.
            </li>
          </ul>
        </div>
        <div class="showcase__visual">
          <div class="image-stack">
            <img src="@/assets/mockups/mobile_mockup.png" alt="Mobile Offline View" class="mockup-img mobile-mockup" />
          </div>
        </div>
      </div>
    </section>

    <!-- SHOWCASE 2: PRESSURE -->
    <section class="showcase-section">
      <div class="container showcase-grid showcase-grid--reverse">
        <div class="showcase__content">
          <div class="badge">Análisis e Historial</div>
          <h2>Monitoreo de Presiones en Tiempo Real</h2>
          <p>Mantén un registro histórico de todas las presiones medidas en los hidrantes de tu red. Analiza tendencias y prevén fallas antes de que ocurran.</p>
          <ul class="showcase__list">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              Gráficos de tendencia y promedios.
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              Vinculación exacta al hidrante correspondiente.
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              Exportación de datos para reportes gerenciales.
            </li>
          </ul>
        </div>
        <div class="showcase__visual">
           <img src="@/assets/mockups/pressure_mockup.png" alt="Pressure Charts" class="mockup-img pressure-mockup" />
        </div>
      </div>
    </section>

    <!-- CTA BOTTOM -->
    <section class="cta-section">
      <div class="container cta-container">
        <div class="cta-content">
          <h2>¿Listo para optimizar la gestión de tu red hídrica?</h2>
          <p>Únete a la plataforma y centraliza hoy mismo la información de tu operación.</p>
          <div class="cta-actions">
             <RouterLink v-if="!auth.isAuthenticated" class="btn-primary btn-lg" to="/login">Comenzar Ahora</RouterLink>
             <RouterLink v-else class="btn-primary btn-lg" to="/dashboard">Ir a mi Panel</RouterLink>
          </div>
        </div>
      </div>
    </section>
    
    <!-- FOOTER -->
    <footer class="footer">
      <div class="container">
        <div class="footer-bottom">
          <p>&copy; {{ new Date().getFullYear() }} Sistema de Gestión Hídrica. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* GENERAL LAYOUT */
.landing-page {
  display: flex;
  flex-direction: column;
  gap: 60px;
  padding-bottom: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ANIMATIONS */
@keyframes float {
  0% { transform: translateY(0px) perspective(1000px) rotateY(-5deg) rotateX(5deg); }
  50% { transform: translateY(-15px) perspective(1000px) rotateY(-5deg) rotateX(5deg); }
  100% { transform: translateY(0px) perspective(1000px) rotateY(-5deg) rotateX(5deg); }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* HERO SECTION */
.hero {
  --hero-bg: var(--primary, #1e3a5f);
  --hero-accent: var(--accent, #0d9488);
  --hero-info: var(--info, #1d4ed8);
  
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  margin-top: 20px;
  margin-inline: 20px;
  background: linear-gradient(-45deg, var(--hero-bg), var(--hero-info), var(--hero-accent), var(--hero-bg));
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
  color: #fff;
  isolation: isolate;
  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
  width: auto !important;
  max-width: none !important;
  display: block !important;
  padding: 0 !important;
}

.hero__overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 0%, rgba(255,255,255,0.15) 0%, transparent 40%),
    radial-gradient(circle at 80% 100%, rgba(255,255,255,0.1) 0%, transparent 40%),
    url('@/assets/hero.png') center/cover no-repeat;
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: overlay;
}

.hero__container {
  display: flex;
  flex-direction: column;
  gap: 50px;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
  padding: 80px 32px 120px;
}

.hero__content {
  padding-left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 800px;
  animation: fade-in-up 0.8s ease forwards;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.hero h1 {
  margin: 0 0 20px;
  font-size: clamp(2.5rem, 4.5vw, 4rem);
  font-weight: 900;
  line-height: 1.1;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.hero__lead {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #ffffff;
  margin-bottom: 36px;
  max-width: 700px;
  font-weight: 400;
}

.hero__actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.hero-btn {
  min-width: 160px;
  border-radius: 14px;
  font-weight: 600;
  padding: 14px 28px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
  font-size: 1.05rem;
  text-align: center;
}

.hero-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.hero-btn--ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
}

.hero-btn--ghost:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.hero__note {
  margin-top: 16px;
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
}

.hero__visual {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  animation: fade-in-up 1s ease forwards 0.2s;
  opacity: 0;
  padding: 0 20px;
}

.hero__image-wrapper {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255,255,255,0.1);
  transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(0,0,0,0.2);
  animation: float 6s ease-in-out infinite;
}

.hero__image-wrapper:hover {
  transform: perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1.03) translateY(-10px);
  animation-play-state: paused;
}

.hero__image {
  width: 100%;
  max-width: 750px;
  height: auto;
  display: block;
  object-fit: contain;
}

.hero__glow {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
  border-radius: 20px;
  pointer-events: none;
}

/* TRUSTED BY */
.trusted-by {
  text-align: center;
  padding: 30px 0;
  color: var(--muted, #64748b);
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* SECTION HEADERS */
.section-header {
  text-align: center;
  margin-bottom: 50px;
  max-width: 700px;
  margin-inline: auto;
}

.section-header h2 {
  font-size: clamp(2rem, 3.5vw, 2.8rem);
  color: var(--text, #1b2a4a);
  margin-bottom: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.section-header p {
  color: var(--text-secondary, #475569);
  font-size: 1.15rem;
  line-height: 1.6;
}

/* FEATURE GRID */
.about-section {
  padding: 40px 0 80px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}

.feature-card {
  padding: 40px 32px;
  border-radius: 24px;
  background: var(--card, #ffffff);
  border: 1px solid var(--stroke, #d1d9e6);
  box-shadow: var(--shadow-sm);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s ease, border-color 0.3s;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-card__icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  margin-bottom: 24px;
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-card__icon {
  transform: scale(1.1) rotate(5deg);
}

.feature-card__icon--leak {
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
}

.feature-card__icon--pressure {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.feature-card__icon--offline {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.feature-card__body h3 {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 14px;
  color: var(--text, #1b2a4a);
}

.feature-card__body p {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--text-secondary, #475569);
}

/* SHOWCASE SECTIONS */
.showcase-section {
  padding: 100px 0;
  position: relative;
}

.showcase-section--alt {
  background: var(--bg-subtle);
  border-radius: 48px;
  margin: 0 24px;
  border: 1px solid var(--stroke);
}

.showcase-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.showcase-grid--reverse .showcase__content {
  order: 2;
}

.showcase-grid--reverse .showcase__visual {
  order: 1;
}

.badge {
  display: inline-block;
  padding: 8px 16px;
  background: var(--primary-soft, rgba(30, 58, 95, 0.07));
  color: var(--primary, #1e3a5f);
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}

.showcase__content h2 {
  font-size: clamp(2rem, 3.5vw, 2.6rem);
  font-weight: 800;
  margin-bottom: 24px;
  color: var(--text, #1b2a4a);
  line-height: 1.2;
}

.showcase__content p {
  font-size: 1.15rem;
  line-height: 1.7;
  color: var(--text-secondary, #475569);
  margin-bottom: 32px;
}

.showcase__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.showcase__list li {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  font-size: 1.1rem;
  color: var(--text, #1b2a4a);
  font-weight: 500;
}

.showcase__list svg {
  width: 24px;
  height: 24px;
  color: var(--accent, #0d9488);
  flex-shrink: 0;
  margin-top: 2px;
  background: var(--accent-soft, rgba(13, 148, 136, 0.1));
  border-radius: 50%;
  padding: 4px;
}

.showcase__visual {
  position: relative;
}

.showcase__visual::before {
  content: '';
  position: absolute;
  inset: -10%;
  background: radial-gradient(circle, var(--primary-soft) 0%, transparent 70%);
  z-index: -1;
  border-radius: 50%;
}

.mockup-img {
  width: 100%;
  height: auto;
  border-radius: 24px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--stroke, #d1d9e6);
  transition: transform 0.5s ease;
}

.mockup-img:hover {
  transform: translateY(-5px) scale(1.01);
}

.mobile-mockup {
  max-width: 320px;
  margin: 0 auto;
  display: block;
}

.pressure-mockup {
  max-width: 100%;
}

/* CTA SECTION */
.cta-section {
  padding: 80px 24px;
}

.cta-container {
  background: linear-gradient(135deg, var(--primary, #1e3a5f) 0%, var(--primary-light, #2a5082) 100%);
  border-radius: 40px;
  padding: 80px 40px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px -10px rgba(30, 58, 95, 0.3);
}

.cta-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -20%;
  width: 70%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
  transform: rotate(20deg);
  pointer-events: none;
}

.cta-container::after {
  content: '';
  position: absolute;
  bottom: -50%;
  right: -20%;
  width: 70%;
  height: 200%;
  background: radial-gradient(circle, rgba(13, 148, 136, 0.2) 0%, transparent 60%);
  transform: rotate(-20deg);
  pointer-events: none;
}

.cta-content {
  position: relative;
  z-index: 1;
  max-width: 650px;
  margin: 0 auto;
}

.cta-content h2 {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  margin-bottom: 20px;
  color: #fff;
  line-height: 1.15;
}

.cta-content p {
  font-size: 1.2rem;
  color: #ffffff;
  margin-bottom: 40px;
}

.btn-lg {
  padding: 16px 36px;
  font-size: 1.15rem;
  border-radius: 14px;
  background: #fff;
  color: var(--primary, #1e3a5f);
  font-weight: 700;
  text-decoration: none;
  display: inline-block;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.btn-lg:hover {
  background: #f8fafc;
  transform: translateY(-4px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.15);
}

/* FOOTER */
.footer {
  padding: 40px 0;
  border-top: 1px solid var(--stroke, #d1d9e6);
  text-align: center;
  color: var(--muted, #7c8ba1);
  font-size: 0.95rem;
}

/* DARK MODE */
.dark .trusted-by {
  color: #64748b;
}

.dark .section-header h2,
.dark .feature-card__body h3,
.dark .showcase__content h2,
.dark .showcase__list li {
  color: #f8fafc;
}

.dark .section-header p,
.dark .feature-card__body p,
.dark .showcase__content p {
  color: #94a3b8;
}

.dark .feature-card {
  background: var(--card, #182035);
  border-color: var(--stroke, #1e2d45);
}

.dark .feature-card:hover {
  background: var(--card-hover, #1c2640);
  border-color: transparent;
  box-shadow: var(--shadow-lg);
}

.dark .showcase-section--alt {
  background: var(--card);
  border-color: var(--stroke);
}

.dark .mockup-img {
  border-color: var(--stroke, #1e2d45);
  box-shadow: var(--shadow-lg);
}

.dark .footer {
  border-top-color: var(--stroke, #1e2d45);
}

.dark .hero {
  background: linear-gradient(-45deg, #0f1523, #1e3a5f, #0d9488, #0f1523);
  background-size: 400% 400%;
}

.dark .badge {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
}

/* RESPONSIVE */
@media (max-width: 1024px) {
  .hero__container {
    padding: 60px 24px;
    gap: 40px;
  }
}

@media (max-width: 992px) {
  .hero__container {
    padding: 60px 20px;
  }

  .showcase-grid {
    grid-template-columns: 1fr;
    gap: 50px;
    text-align: center;
  }

  .showcase-grid--reverse .showcase__content {
    order: 1;
  }

  .showcase-grid--reverse .showcase__visual {
    order: 2;
  }
  
  .showcase__list li {
    justify-content: center;
    text-align: left;
  }
}

@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  .showcase-section {
    padding: 70px 0;
  }
  
  .showcase-section--alt {
    border-radius: 32px;
    margin: 0 16px;
  }
  
  .cta-container {
    padding: 50px 24px;
    border-radius: 32px;
  }
}

@media (max-width: 480px) {
  .hero-btn {
    width: 100%;
  }
  .hero {
    margin-inline: 10px;
    border-radius: 24px;
  }
}
</style>