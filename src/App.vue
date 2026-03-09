<template>
  <div id="app-container">
    <router-view />

    <nav v-if="isNavVisible" class="modern-nav">
      <div class="nav-content">
        <router-link to="/" class="nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="icon">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span class="nav-label">Inicio</span>
        </router-link>

        <router-link to="/historial" class="nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span class="nav-label">Partidas</span>
        </router-link>

        <div class="plus-center">
          <router-link to="/partida/nueva" class="action-fab" title="Nueva Partida">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="icon-plus">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </router-link>
        </div>

        <router-link to="/ranking" class="nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="icon">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <span class="nav-label">Ranking</span>
        </router-link>

        <router-link to="/mi-perfil" class="nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="icon">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="nav-label">Perfil</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isNavVisible = computed(() => {
  // 1. Si la ruta no tiene nombre aún (carga inicial), ocultamos
  if (!route.name) return false

  // 2. Si en el router.js pusimos meta: { showNav: false }, ocultamos
  // Esto hará que el contador (LifeCounter) oculte el menú automáticamente
  if (route.meta && route.meta.showNav === false) return false

  // 3. Mantenemos tu lógica de seguridad por si acaso
  const hiddenRoutes = ['Login', 'Register']
  const isHidden = hiddenRoutes.includes(route.name)

  return !isHidden
})
</script>

<style>
/* 1. RESET Y CONFIGURACIÓN GLOBAL */
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
}

body {
  /* Degradado Morado muy oscuro hacia Negro para no interferir con la UI */
  background-image:
    linear-gradient(135deg, rgba(18, 10, 31, 0.92), rgba(2, 6, 23, 0.95)),
    url('@/assets/Background.jpg');

  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background-repeat: no-repeat;
  background-color: #020617;
  /* Fallback oscuro */
  color: #f8fafc;
  font-family: 'Inter', sans-serif;
}

/* 3. NAVEGACIÓN MODERNA */
.modern-nav {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 92%;
  max-width: 480px;
  z-index: 10000;
}

.nav-content {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px 15px;
  height: 65px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #94a3b8;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex: 1;
}

.icon {
  width: 22px;
  height: 22px;
  margin-bottom: 4px;
}

.nav-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0;
  transform: translateY(5px);
  transition: all 0.3s ease;
}

/* ESTADO ACTIVO */
.nav-item.router-link-active:not(.action-fab) {
  color: #60a5fa;
}

.nav-item.router-link-active .nav-label {
  opacity: 1;
  transform: translateY(0);
}

.nav-item.router-link-active .icon {
  transform: translateY(-2px);
  filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.5));
}

/* BOTÓN CENTRAL */
.plus-center {
  position: relative;
  width: 70px;
  height: 100%;
}

.action-fab {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  width: 58px;
  height: 58px;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
  border: 4px solid #0f172a;
  color: white;
  transition: all 0.2s ease;
}

.icon-plus {
  width: 28px;
  height: 28px;
}

.action-fab:hover {
  transform: translateX(-50%) scale(1.05) translateY(-2px);
  box-shadow: 0 12px 25px rgba(124, 58, 237, 0.4);
}

/* RESPONSIVE */
@media (max-width: 480px) {
  .nav-content {
    height: 60px;
    padding: 5px 10px;
  }

  .nav-label {
    display: none;
  }
}
</style>