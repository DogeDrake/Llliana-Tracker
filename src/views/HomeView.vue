<template>
    <div class="app-container fade-in">
        <header class="home-header">
            <span class="badge">Lilliana Tracker v3.0</span>
            <h1 class="main-title">Lilliana Tracker</h1>
            <p class="subtitle">Bienvenido de nuevo, {{ profile?.display_name || profile?.username || 'Duelista' }}</p>
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
                            <h2>Win Rate</h2>
                            <p class="subtitle">Win Rate General</p>
                        </div>
                    </div>
                    <div class="formats-container">
                        <div class="format-card commander-style">
                            <div class="format-header">
                                <span class="format-label">ESTADÍSTICAS GLOBALES</span>
                            </div>
                            <h3 style="font-size: 2rem; font-weight: 900; margin: 10px 0;">{{ winRate }}%</h3>
                            <button class="btn-action" @click="$router.push('/partida/nueva')">Nueva Partida</button>
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
                            <p class="subtitle">Últimas 3 partidas</p>
                        </div>
                    </div>

                    <div class="formats-container">
                        <div v-if="recentMatches.length === 0" class="format-card" style="text-align: center;">
                            <p class="subtitle">No hay partidas registradas</p>
                        </div>

                        <div v-for="match in recentMatches" :key="match.id" class="format-card"
                            :class="match.formato === 'commander' ? 'commander-style' : 'pauper-style'">
                            <div class="format-header">
                                <span class="format-label">{{ match.formato }}</span>
                                <span class="deck-count">{{ formatDate(match.fecha_partida) }}</span>
                            </div>
                            <div class="mazos-list">
                                <span class="tag" :class="{ 'pauper': match.formato === 'pauper' }">
                                    {{ match.user_won ? '🏆 VICTORIA' : '💀 DERROTA' }}
                                </span>
                                <span class="tag" style="background: rgba(255,255,255,0.05); color: #fff;">
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

    // Perfil
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile.value = p

    // Cargar participaciones (Misma lógica de datos que antes)
    const { data: participations } = await supabase
        .from('match_participants')
        .select(`
            is_winner,
            deck_name_manual,
            matches (id, fecha_partida, formato)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (participations) {
        totalMatches.value = participations.length
        const wins = participations.filter(p => p.is_winner).length
        winRate.value = totalMatches.value > 0 ? Math.round((wins / totalMatches.value) * 100) : 0

        recentMatches.value = participations.slice(0, 3).map(p => ({
            id: p.matches.id,
            formato: p.matches.formato,
            fecha_partida: p.matches.fecha_partida,
            deck_name_manual: p.deck_name_manual,
            user_won: p.is_winner
        }))
    }
})

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
</script>

<style scoped>
/* Pegamos aquí tu CSS v2.0 exactamente como lo pasaste */
.app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    padding-bottom: 100px;
    /* Espacio para el nav */
}

.home-header {
    text-align: center;
    padding: 60px 20px 40px;
}

.main-title {
    font-size: 2.5rem;
    font-weight: 900;
    background: linear-gradient(to bottom, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 10px 0;
}

.subtitle {
    color: #64748b;
    font-weight: 500;
}

.badge {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    padding: 6px 16px;
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 800;
    border: 1px solid rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}

.grid-jugadores {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 30px;
    padding-bottom: 50px;
}

.player-card {
    opacity: 0;
    animation: cardEntrance 0.6s ease-out forwards;
}

.card-inner {
    background: rgba(30, 41, 59, 0.4);
    backdrop-filter: blur(12px);
    border-radius: 28px;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card-inner:hover {
    transform: translateY(-10px);
    border-color: rgba(59, 130, 246, 0.4);
    background: rgba(30, 41, 59, 0.6);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.card-top {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 25px;
}

.avatar {
    font-size: 2rem;
    background: #0f172a;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
}

.status-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 14px;
    height: 14px;
    background: #10b981;
    border: 3px solid #1e293b;
    border-radius: 50%;
}

.formats-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.format-card {
    background: rgba(15, 23, 42, 0.4);
    padding: 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.03);
}

.format-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.format-label {
    font-size: 0.7rem;
    font-weight: 900;
    letter-spacing: 1.5px;
}

.commander-style .format-label {
    color: #3b82f6;
}

.pauper-style .format-label {
    color: #10b981;
}

.mazos-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.tag {
    font-size: 0.7rem;
    padding: 4px 10px;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.1);
    color: #93c5fd;
    font-weight: 700;
}

.tag.pauper {
    background: rgba(16, 185, 129, 0.1);
    color: #6ee7b7;
}

.btn-action {
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    border: none;
    background: #3b82f6;
    color: white;
    font-weight: 800;
    text-transform: uppercase;
    cursor: pointer;
}

@keyframes cardEntrance {
    from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.fade-in {
    animation: fadeIn 0.8s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}
</style>