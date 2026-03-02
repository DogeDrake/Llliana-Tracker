<template>
    <div class="app-container fade-in">
        <header class="home-header">
            <span class="badge">TEMPORADA 2026</span>
            <h1 class="main-title">Hall of Fame</h1>
            <p class="subtitle">Los duelistas más letales del plano actual.</p>
        </header>

        <div v-if="loading" class="loading-container">
            <div class="spinner"></div>
        </div>

        <div v-else class="ranking-wrapper">
            <div class="ranking-list">
                <div v-for="(player, index) in leaders" :key="player.username" class="player-card rank-item"
                    :class="getRankClass(index)" :style="{ animationDelay: (index * 0.1) + 's' }">

                    <div class="card-inner rank-inner">
                        <div class="rank-pos">
                            <span v-if="index > 2">#{{ index + 1 }}</span>
                            <span v-else class="medal-icon">{{ getMedal(index) }}</span>
                        </div>

                        <div class="rank-info">
                            <h3 class="player-name">{{ player.username }}</h3>
                            <p class="match-count">{{ player.total_wins }} partidas ganadas</p>
                        </div>

                        <div class="rank-stats">
                            <div class="wr-circle" :style="getCircleStyle(player.win_rate)">
                                <span class="wr-value">{{ player.win_rate }}%</span>
                                <span class="wr-label">WR</span>
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

const leaders = ref([])
const loading = ref(true)

onMounted(async () => {
    try {
        // Consultamos los participantes para contar victorias y totales
        const { data, error } = await supabase
            .from('match_participants')
            .select('is_winner, profiles(username)')

        if (error) throw error

        // Lógica para agrupar estadísticas por usuario
        const stats = {}
        data.forEach(row => {
            const name = row.profiles?.username || 'Anónimo'
            if (!stats[name]) {
                stats[name] = { username: name, total_wins: 0, total_matches: 0 }
            }
            stats[name].total_matches++
            if (row.is_winner) stats[name].total_wins++
        })

        // Convertir a array, calcular WR y ordenar
        leaders.value = Object.values(stats)
            .map(p => ({
                ...p,
                win_rate: Math.round((p.total_wins / p.total_matches) * 100)
            }))
            .sort((a, b) => b.total_wins - a.total_wins) // Ordenar por victorias
            .slice(0, 10) // Top 10

    } catch (err) {
        console.error("Error en ranking:", err)
    } finally {
        loading.value = false
    }
})

const getMedal = (index) => ['🥇', '🥈', '🥉'][index]
const getRankClass = (index) => {
    if (index === 0) return 'gold-rank'
    if (index === 1) return 'silver-rank'
    if (index === 2) return 'bronze-rank'
    return ''
}

const getCircleStyle = (wr) => {
    const color = wr > 50 ? '#3b82f6' : '#64748b'
    return { borderColor: color, color: color }
}
</script>

<style scoped>
.ranking-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding-bottom: 50px;
}

.rank-inner {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    gap: 20px;
}

/* POSICIONES Y MEDALLAS */
.rank-pos {
    width: 50px;
    font-size: 1.2rem;
    font-weight: 900;
    color: #475569;
    display: flex;
    justify-content: center;
}

.medal-icon {
    font-size: 2rem;
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));
}

/* INFO JUGADOR */
.rank-info {
    flex-grow: 1;
}

.player-name {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0;
}

.match-count {
    font-size: 0.75rem;
    color: #64748b;
    margin: 2px 0 0;
}

/* CÍRCULO DE WIN RATE */
.wr-circle {
    width: 55px;
    height: 55px;
    border: 2px solid;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
}

.wr-value {
    font-size: 0.8rem;
    font-weight: 900;
}

.wr-label {
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
}

/* RESALTADOS DEL TOP 3 (v2.0 Style) */
.gold-rank .rank-inner {
    border: 1px solid rgba(251, 191, 36, 0.3);
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(30, 41, 59, 0.4));
    box-shadow: 0 10px 30px rgba(251, 191, 36, 0.1);
}

.gold-rank .player-name {
    color: #fbbf24;
}

.silver-rank .rank-inner {
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(30, 41, 59, 0.4));
}

.silver-rank .player-name {
    color: #cbd5e1;
}

.bronze-rank .rank-inner {
    border: 1px solid rgba(180, 83, 9, 0.3);
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.1), rgba(30, 41, 59, 0.4));
}

.bronze-rank .player-name {
    color: #d97706;
}

/* Animación de carga */
.loading-container {
    text-align: center;
    padding: 100px 0;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>