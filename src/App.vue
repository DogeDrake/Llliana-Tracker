<template>
  <div id="app-container">
    <router-view />

    <nav class="bottom-nav">
      <router-link to="/">🏠</router-link>
      <router-link to="/partida/nueva" class="plus-btn">➕</router-link>
      <router-link to="/historial">🃏</router-link>
      <router-link to="/ranking">🏆</router-link>
      <router-link to="/mi-perfil">👤</router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Usamos un computed en lugar de un watcher, es más limpio y seguro
const isNavVisible = computed(() => {
  // Si la ruta no existe o no tiene nombre aún, no mostramos nada
  if (!route || !route.name) return false

  // Lista de páginas donde ocultamos la barra
  const hiddenRoutes = ['Login', 'Register']
  return !hiddenRoutes.includes(route.name)
})
</script>