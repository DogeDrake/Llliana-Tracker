<template>
  <div id="app-container">
    <router-view />

    <nav v-if="isNavVisible" class="bottom-nav">
      <router-link to="/" title="Inicio">🏠</router-link>
      <router-link to="/historial" title="Historial">📜</router-link>

      <div class="plus-wrapper">
        <router-link to="/partida/nueva" class="plus-btn" title="Nueva Partida">
          ➕
        </router-link>
      </div>

      <router-link to="/ranking" title="Ranking">🏆</router-link>
      <router-link to="/mi-perfil" title="Mi Perfil">👤</router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isNavVisible = computed(() => {
  if (!route.name) return false
  const hiddenRoutes = ['Login', 'Register']
  const isHidden = hiddenRoutes.includes(route.name)
  return !isHidden
})
</script>

<style>
/* 1. CONTENEDOR DE LA BARRA (CORREGIDO) */
.bottom-nav {
  position: fixed;
  bottom: 25px;
  /* Separación del borde inferior */
  left: 0;
  right: 0;
  margin: 0 auto;
  /* Centrado perfecto sin conflictos de transform */

  width: 90%;
  max-width: 450px;
  height: 70px;

  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 10px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  /* Asegura que siempre esté por encima */
}

/* 2. ENLACES E ICONOS */
.bottom-nav a {
  font-size: 1.4rem;
  color: #94a3b8;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  /* Distribuye el espacio equitativamente */
  height: 100%;
  transition: all 0.2s ease;
}

.bottom-nav a.router-link-active:not(.plus-btn) {
  color: #3b82f6;
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
}

/* 3. BOTÓN CENTRAL (AJUSTADO PARA QUE NO SE DESPLACE) */
.plus-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  height: 100%;
  position: relative;
}

.plus-btn {
  position: absolute;
  top: -30px;
  /* Elevación */
  width: 65px !important;
  height: 65px !important;
  background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
  color: white !important;
  border-radius: 20px !important;
  border: 5px solid #0f172a !important;
  /* Separador oscuro */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem !important;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.plus-btn:active {
  transform: scale(0.9) translateY(5px);
}

/* 4. AJUSTE DE PANTALLA */
#app-container {
  padding-bottom: 120px;
  /* Para que el contenido no quede detrás de la barra */
}

/* Quitar el highlight azul al tocar en móviles */
* {
  -webkit-tap-highlight-color: transparent;
}
/* Estilo Global para el fondo */
#app {
  min-height: 100vh;
  /* Ruta a tu imagen en assets */
  background-image:
    linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)),
    /* Capa de contraste */
    url('@/assets/Backgound.jpg');
  /* Cambia el nombre por el de tu archivo */

  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  /* Efecto elegante de profundidad */
  background-repeat: no-repeat;

  /* Asegura que todo el texto sea legible sobre el arte */
  color: #f8fafc;
}

/* Opcional: Un toque de "vibración" mística */
#app::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%);
  pointer-events: none;
  z-index: 0;
}

</style>