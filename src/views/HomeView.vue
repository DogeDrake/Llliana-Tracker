<template>
    <div class="app-container fade-in">
        <header class="welcome-section">
            <div class="user-greeting">
                <div class="greeting-text">
                    <span class="badge">SISTEMA ACTIVO</span>
                    <h1 class="main-title">Hola, {{ profile?.username || 'Planeswalker' }}</h1>
                    <p class="subtitle">Elige que consultaras hoy</p>
                </div>
                <div class="mini-avatar" v-if="profile?.avatar_url">
                    <img :src="profile.avatar_url" alt="Perfil">
                </div>
            </div>
        </header>

        <section class="quick-nav-grid">
            <router-link to="/partida/nueva" class="action-card primary">
                <div class="action-icon">⚔️</div>
                <div class="action-info">
                    <h3>Nueva Partida</h3>
                    <p>Registrar encuentro</p>
                </div>
            </router-link>

            <router-link to="/mi-perfil" class="action-card secondary">
                <div class="action-icon">🃏</div>
                <div class="action-info">
                    <h3>Mis Mazos</h3>
                    <p>{{ totalDecks }} registrados</p>
                </div>
            </router-link>
            <router-link to="/contador" class="action-card life-counter-card">
                <div class="action-icon">❤️</div>
                <div class="action-info">
                    <h3>Contador de Vidas</h3>
                    <p>Modo mesa (2-4 jugadores)</p>
                </div>
                <div class="card-arrow">→</div>
            </router-link>
        </section>

        <div class="section-divider">
            <h2>Actividad Reciente</h2>
            <router-link to="/historial" class="view-all">Ver todo →</router-link>
        </div>

        <div v-if="loading" class="loading-placeholder">
            <div class="shimmer-card" v-for="i in 2" :key="i"></div>
        </div>

        <div v-else-if="matches.length === 0" class="empty-zen-state">
            <div class="zen-icon">✨</div>
            <p>El archivo está en blanco. Es hora de tu primera **partida**.</p>
        </div>

        <div v-else class="recent-list">
            <router-link v-for="match in matches.slice(0, 3)" :key="match.id" :to="`/partida/${match.id}`"
                class="mini-match-card clickable-card">
                <div class="match-status" :class="getMatchResult(match)"></div>
                <div class="match-details">
                    <div class="match-meta">
                        <span class="m-format">{{ match.formato }}</span>
                        <span class="m-date">{{ formatDate(match.fecha_partida) }}</span>
                    </div>
                    <div class="match-players">
                        <span class="winner-name">{{ getWinnerName(match) }}</span>
                        <span class="vs">gano la <strong>partida</strong></span>
                    </div>
                </div>
                <div class="match-arrow">→</div>
            </router-link>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'

const matches = ref([])
const profile = ref(null)
const totalDecks = ref(0)
const loading = ref(true)

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const getWinnerName = (match) => {
    const winner = match.match_participants?.find(p => p.is_winner)
    return winner ? (winner.profiles?.username || winner.player_name_manual) : 'Alguien'
}

const getMatchResult = (match) => {
    const userPart = match.match_participants?.find(p => p.profiles?.username === profile.value?.username)
    if (!userPart) return 'neutral'
    return userPart.is_winner ? 'win' : 'loss'
}

onMounted(async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser()

        const [profileRes, decksRes, matchesRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('decks').select('id', { count: 'exact' }).eq('user_id', user.id),
            supabase.from('matches').select(`
                *,
                match_participants (
                    *,
                    profiles (username),
                    decks (nombre_personalizado)
                )
            `).order('fecha_partida', { ascending: false }).limit(3)
        ])

        profile.value = profileRes.data
        totalDecks.value = decksRes.count || 0
        matches.value = matchesRes.data || []

    } catch (err) {
        console.error('Error Home:', err.message)
    } finally {
        loading.value = false
    }
})
</script>

<style scoped>
.app-container {
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
}

/* --- WELCOME SECTION --- */
.welcome-section {
    margin-bottom: 30px;
    padding-top: 10px;
}

.user-greeting {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.main-title {
    font-size: 1.8rem;
    font-weight: 900;
    margin: 5px 0;
    letter-spacing: -0.5px;
}

.mini-avatar {
    width: 55px;
    height: 55px;
    border-radius: 18px;
    overflow: hidden;
    border: 2px solid rgba(59, 130, 246, 0.5);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.mini-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* --- QUICK NAV --- */
.quick-nav-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 35px;
}

.action-card {
    padding: 20px;
    border-radius: 24px;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.action-card.primary {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1));
}

.action-card.secondary {
    background: rgba(30, 41, 59, 0.4);
}

.action-card:hover {
    transform: translateY(-5px);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(59, 130, 246, 0.3);
}

.action-icon {
    font-size: 1.5rem;
}

.action-info h3 {
    font-size: 0.95rem;
    margin: 0;
    color: #f8fafc;
}

.action-info p {
    font-size: 0.75rem;
    margin: 2px 0 0;
    color: #94a3b8;
}

/* --- RECENT ACTIVITY --- */
.section-divider {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.section-divider h2 {
    font-size: 1rem;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.view-all {
    font-size: 0.8rem;
    color: #3b82f6;
    text-decoration: none;
    font-weight: 600;
}

.recent-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mini-match-card {
    background: rgba(30, 41, 59, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.03);
    padding: 16px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    text-decoration: none;
    /* Quita subrayado del link */
    transition: all 0.3s ease;
}

/* Efecto al pasar el ratón por la tarjeta de actividad */
.clickable-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(59, 130, 246, 0.2);
    transform: translateX(5px);
}

.match-status {
    width: 6px;
    height: 35px;
    border-radius: 10px;
}

.match-status.win {
    background: #34d399;
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
}

.match-status.loss {
    background: #f87171;
}

.match-status.neutral {
    background: #64748b;
}

.match-details {
    flex: 1;
}

.match-meta {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
}

.m-format {
    font-size: 0.6rem;
    font-weight: 900;
    color: #3b82f6;
    text-transform: uppercase;
}

.m-date {
    font-size: 0.65rem;
    color: #475569;
}

.match-players {
    font-size: 0.85rem;
    color: #cbd5e1;
}

.winner-name {
    font-weight: 800;
    color: #f1f5f9;
}

.vs {
    color: #64748b;
    margin-left: 4px;
}

.match-arrow {
    color: #334155;
    font-weight: bold;
    transition: 0.3s;
}

.clickable-card:hover .match-arrow {
    color: #3b82f6;
    transform: translateX(3px);
}

/* --- LOADING & EMPTY --- */
.shimmer-card {
    height: 80px;
    background: linear-gradient(90deg, rgba(30, 41, 59, 0.2) 25%, rgba(30, 41, 59, 0.5) 50%, rgba(30, 41, 59, 0.2) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 20px;
    margin-bottom: 10px;
}

@keyframes shimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

.empty-zen-state {
    text-align: center;
    padding: 40px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 30px;
    border: 1px dashed rgba(255, 255, 255, 0.1);
}

.zen-icon {
    font-size: 2rem;
    margin-bottom: 10px;
    opacity: 0.5;
}

/* --- ESTILO ESPECÍFICO PARA EL CONTADOR --- */
.life-counter-card {
    grid-column: span 2;
    /* Ocupa las dos columnas */
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(153, 27, 27, 0.1));
    border: 1px solid rgba(239, 68, 68, 0.2);
    flex-direction: row !important;
    /* Icono y texto en horizontal */
    align-items: center;
    gap: 20px !important;
    position: relative;
}

.life-counter-card:hover {
    border-color: rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.1);
}

.life-counter-card .action-icon {
    font-size: 1.8rem;
    background: rgba(239, 68, 68, 0.2);
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
}

.card-arrow {
    position: absolute;
    right: 20px;
    color: rgba(239, 68, 68, 0.5);
    font-weight: bold;
}
</style>