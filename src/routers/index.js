import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../supabaseClient";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/LoginView.vue"),
    meta: { requiresAuth: false, showNav: false },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("../views/RegisterView.vue"),
    meta: { requiresAuth: false, showNav: false },
  },
  // --- NUEVAS RUTAS DE AUTENTICACIÓN Y RECUPERACIÓN ---
  {
    path: "/confirmado",
    name: "AccountConfirmed",
    component: () => import("../views/AccountConfirmedView.vue"),
    meta: { requiresAuth: false, showNav: false },
  },
  {
    path: "/resetear-password",
    name: "UpdatePassword",
    component: () => import("../views/UpdatePasswordView.vue"),
    meta: { requiresAuth: false, showNav: false },
  },
  // ---------------------------------------------------
  {
    path: "/",
    name: "Home",
    component: () => import("../views/HomeView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/partida/nueva",
    name: "NuevaPartida",
    component: () => import("../views/NewMatchView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/historial",
    name: "Historial",
    component: () => import("../views/HistoryView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/ranking",
    name: "Ranking",
    component: () => import("../views/RankingView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/partida/:id",
    name: "PartidaDetalles",
    component: () => import("../views/PartidaDetalles.vue"),
    props: true,
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/jugadores",
    name: "Jugadores",
    component: () => import("../views/PlayersView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/profile/:username",
    name: "Profile",
    component: () => import("../views/UserProfileView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  {
    path: "/mi-perfil",
    name: "MiPerfil",
    component: () => import("../views/MyProfileView.vue"),
    meta: { requiresAuth: true, showNav: true },
  },
  // --- RUTA: CONTADOR DE VIDAS ---
  {
    path: "/contador",
    name: "LifeCounter",
    component: () => import("../views/LifeCounterView.vue"),
    meta: { requiresAuth: true, showNav: false }, // Ocultamos nav para maximizar espacio en mesa
  },
  // -------------------------------------
  {
    path: "/:pathMatch(.*)*",
    redirect: { name: "Home" },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * GUARDIA DE SEGURIDAD
 */
router.beforeEach(async (to, from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (requiresAuth && !session) {
    next("/login");
  } else if (session && (to.name === "Login" || to.name === "Register")) {
    next("/");
  } else {
    // Permite que las vistas de confirmación y reseteo procesen la sesión temporal
    next();
  }
});

export default router;
