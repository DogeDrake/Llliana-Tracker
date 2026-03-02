import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../supabaseClient";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/LoginView.vue"),
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("../views/RegisterView.vue"),
  },

  // Rutas Protegidas
  {
    path: "/",
    name: "Home",
    component: () => import("../views/HomeView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/partida/nueva",
    name: "NuevaPartida",
    component: () => import("../views/NewMatchView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/historial",
    name: "Historial",
    component: () => import("../views/HistoryView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/ranking",
    name: "Ranking",
    component: () => import("../views/RankingView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/jugadores",
    name: "Jugadores",
    component: () => import("../views/PlayersView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/perfil/:id",
    name: "Perfil",
    component: () => import("../views/UserProfileView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/mi-perfil",
    name: "MiPerfil",
    component: () => import("../views/MyProfileView.vue"),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  // Importante: El BASE_URL debe coincidir con /Lilliana-Tracker/ en vite.config.js
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * GUARDIA DE SEGURIDAD
 * Controla que los usuarios no entren a zonas privadas sin estar logueados.
 */
router.beforeEach(async (to, from, next) => {
  // Obtenemos la sesión actual de Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Caso 1: La ruta requiere autenticación y el usuario NO tiene sesión
  if (to.meta.requiresAuth && !session) {
    // Redirigimos al Login por nombre de ruta
    next({ name: "Login" });
  }
  // Caso 2: El usuario ya está logueado e intenta ir a Login o Register
  else if (session && (to.name === "Login" || to.name === "Register")) {
    // Lo mandamos al Home directamente
    next({ name: "Home" });
  }
  // Caso 3: Todo correcto, permitimos la navegación
  else {
    next();
  }
});

export default router;
