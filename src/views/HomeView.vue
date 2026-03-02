<template>
    <div class="app-container fade-in">
        <header class="home-header">
            <span class="badge">Lilliana Tracker v3.0</span>
            <h1 class="main-title">Lilliana Tracker</h1>
            <p class="subtitle">Bienvenido, <span class="highlight">{{ profile?.username || 'Planeswalker' }}</span></p>
        </header>

        <div class="grid-jugadores">
            <div class="player-card">
                <div class="card-inner">
                    <div class="card-top">
                        <div class="avatar-wrapper">
                            <div class="avatar">📊</div>
                            <span class="status-dot"></span>
                        </div>
                        <div>
                            <h2>Tu Win Rate</h2>
                            <p class="subtitle">Rendimiento personal</p>
                        </div>
                    </div>
                    <div class="formats-container">
                        <div class="format-card stats-highlight">
                            <div class="format-header">
                                <span class="format-label">TOTAL PARTIDAS: {{ totalMatches }}</span>
                            </div>
                            <div class="winrate-display">
                                <span class="wr-number">{{ winRate }}%</span>
                                <span class="wr-label">Victorias</span>
                            </div>
                            <button class="btn-action" @click="$router.push('/partida/nueva')">
                                Nueva Partida
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="player-card" style="animation-delay: 0.1s;">
                <div class="card-inner">
                    <div class="card-top">
                        <div class="avatar-wrapper">
                            <div class="avatar">📜</div>
                        </div>
                        <div>
                            <h2>Actividad</h2>
                            <p class="subtitle">Últimas incursiones</p>
                        </div>
                    </div>

                    <div class="formats-container">
                        <div v-if="recentMatches.length === 0" class="format-card empty-state">
                            <p>Aún no has librado ninguna batalla.</p>
                        </div>

                        <div v-for="match in recentMatches" :key="match.id" class="format-card match-item"
                            :class="match.formato === 'commander' ? 'commander-style' : 'pauper-style'">
                            <div class="format-header">
                                <span class="format-label">{{ match.formato }}</span>
                                <span class="match-date">{{ formatDate(match.fecha_partida) }}</span>
                            </div>
                            <div class="mazos-list">
                                <span class="result-tag" :class="match.user_won ? 'win' : 'loss'">
                                    {{ match.user_won ? '🏆 VICTORIA' : '💀 DERROTA' }}
                                </span>
                                <span class="deck-tag">
                                    {{ match.deck_name_manual || 'Mazo estándar' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'

const profile = ref(null)
const totalMatches = ref(0)
const winRate = ref(0)
const recentMatches = ref([])

onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Obtener perfil del usuario logueado
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile.value = p

    // 2. Cargar participaciones filtradas por el usuario actual
    const { data: participations, error } = await supabase
        .from('match_participants')
        .select(`
            is_winner,
            deck_name_manual,
            matches (id, fecha_partida, formato)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (participations) {
        // Filtrar solo las que tienen datos de match válidos
        const validParticipations = participations.filter(p => p.matches);

        totalMatches.value = validParticipations.length
        const wins = validParticipations.filter(p => p.is_winner).length
        winRate.value = totalMatches.value > 0 ? Math.round((wins / totalMatches.value) * 100) : 0

        recentMatches.value = validParticipations.slice(0, 3).map(p => ({
            id: p.matches.id,
            formato: p.matches.formato,
            fecha_partida: p.matches.fecha_partida,
            deck_name_manual: p.deck_name_manual,
            user_won: p.is_winner
        }))
    }
})

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
</script>

<style scoped>
.app-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 15px;
    padding-bottom: 80px;
    /* Espacio justo para no chocar con el nav */
}

.home-header {
    text-align: center;
    padding: 30px 10px 25px;
}

.main-title {
    font-size: clamp(1.8rem, 8vw, 2.5rem);
    font-weight: 900;
    background: linear-gradient(to bottom, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 10px 0;
}

.highlight {
    color: #3b82f6;
    font-weight: 800;
}

.badge {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    padding: 4px 12px;
    border-radius: 50px;
    font-size: 0.7rem;
    font-weight: 800;
    border: 1px solid rgba(59, 130, 246, 0.2);
}

/* Grid responsivo: 1 columna en móvil, 2 en escritorio */
.grid-jugadores {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

@media (min-width: 768px) {
    .grid-jugadores {
        grid-template-columns: 1fr 1fr;
    }
}

.player-card {
    opacity: 0;
    animation: cardEntrance 0.6s ease-out forwards;
}

.card-inner {
    background: rgba(30, 41, 59, 0.4);
    backdrop-filter: blur(12px);
    border-radius: 24px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    height: 100%;
}

.card-top {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
}

.avatar {
    font-size: 1.5rem;
    background: #0f172a;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
}

.avatar-wrapper {
    position: relative;
}

.status-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    background: #10b981;
    border: 2px solid #1e293b;
    border-radius: 50%;
}

.formats-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.format-card {
    background: rgba(15, 23, 42, 0.4);
    padding: 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.03);
}

.winrate-display {
    text-align: center;
    margin: 10px 0 20px;
}

.wr-number {
    display: block;
    font-size: 3rem;
    font-weight: 900;
    color: #fff;
    line-height: 1;
}

.wr-label {
    font-size: 0.8rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.match-item {
    transition: transform 0.2s;
}

.match-date {
    font-size: 0.7rem;
    color: #64748b;
}

.mazos-list {
    display: flex;
    flex-direction: column;
    /* Lista en vertical para móvil */
    gap: 8px;
}

.result-tag {
    font-size: 0.7rem;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 800;
    text-align: center;
}

.result-tag.win {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
}

.result-tag.loss {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.deck-tag {
    font-size: 0.75rem;
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.05);
    padding: 4px 10px;
    border-radius: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.btn-action {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    border: none;
    background: #3b82f6;
    color: white;
    font-weight: 800;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.empty-state {
    text-align: center;
    color: #64748b;
    padding: 30px;
    font-style: italic;
}

@keyframes cardEntrance {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.fade-in {
    animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

/* Ajustes para pantallas muy pequeñas */
@media (max-width: 360px) {
    .main-title {
        font-size: 1.5rem;
    }

    .wr-number {
        font-size: 2.2rem;
    }
}
</style>