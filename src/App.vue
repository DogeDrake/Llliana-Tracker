<template>
  <div id="app-container">
    <router-view />

    <nav v-if="isNavVisible" class="bottom-nav">
      <router-link to="/" title="Inicio">🏠</router-link>
      <router-link to="/historial" title="Historial">📜</router-link>

      <router-link to="/partida/nueva" class="plus-btn" title="Nueva Partida">
        ➕
      </router-link>

      <router-link to="/ranking" title="Ranking">🏆</router-link>
      <router-link to="/mi-perfil" title="Mi Perfil">👤</router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/**
 * Control de visibilidad de la navegación
 * Se oculta en Login y Registro para una experiencia más limpia.
 */
const isNavVisible = computed(() => {
  // Verificamos tanto por el nombre de la ruta como por la propiedad meta
  if (!route.name) return false

  const hiddenRoutes = ['Login', 'Register']
  const isHidden = hiddenRoutes.includes(route.name)

  // También podemos usar el meta.showNav que configuramos antes como respaldo
  return !isHidden || route.meta.showNav
})
</script>

<style>
/* Estilos adicionales para que los iconos se vean bien */
.bottom-nav a {
  font-size: 1.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 20%;
  /* Distribución equitativa para 5 iconos */
  height: 100%;
}

.plus-btn {
  background: var(--primary-blue, #3b82f6);
  color: white !important;
  border-radius: 50%;
  width: 55px !important;
  height: 55px !important;
  margin-top: -35px;
  /* Efecto flotante */
  border: 4px solid var(--bg-dark, #0f172a);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
  font-size: 1.6rem !important;
}

.bottom-nav a.router-link-active:not(.plus-btn) {
  color: var(--primary-blue, #3b82f6);
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
}
</style>