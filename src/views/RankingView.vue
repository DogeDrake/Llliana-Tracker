<template>
    <div class="hall-of-fame-root fade-in">
        <header class="honor-header">
            <div class="title-shimmer">
                <span class="season-tag">TEMPORADA 2026</span>
                <h1 class="monumental-title">Hall of Fame</h1>
            </div>
            <p class="honor-subtitle">Inmortalizando a los Planeswalkers más letales del plano.</p>
        </header>

        <div v-if="loading" class="loading-state">
            <div class="magic-loader"></div>
            <p>Invocando registros antiguos...</p>
        </div>

        <div v-else class="honor-scroll">
            <div class="ranking-container">
                <div v-for="(player, index) in leaders" :key="player.username" class="honor-row"
                    :class="getRankClass(index)">
                    <div class="rank-badge-wrapper">
                        <div class="rank-number" v-if="index > 2">#{{ index + 1 }}</div>
                        <div class="medal-display" v-else>{{ getMedal(index) }}</div>
                    </div>

                    <div class="warrior-profile">
                        <h3 class="warrior-name">{{ player.username }}</h3>
                        <div class="warrior-meta">
                            <span class="victory-count">{{ player.total_wins }} Victorias</span>
                            <i class="separator"></i>
                            <span class="match-total">{{ player.total_matches }} Partidas jugadas</span>
                        </div>
                    </div>

                    <div class="lethality-meter">
                        <div class="meter-content">
                            <span class="meter-value">{{ player.win_rate }}%</span>
                            <span class="meter-label">Eficiencia</span>
                        </div>
                        <div class="meter-bar-bg">
                            <div class="meter-bar-fill"
                                :style="{ width: player.win_rate + '%', backgroundColor: getMeterColor(player.win_rate, index) }">
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="leaders.length === 0" class="empty-honor">
                    Nadie ha reclamado su lugar en la historia todavía.
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
        const { data, error } = await supabase
            .from('match_participants')
            .select(`is_winner, player_name_manual, profiles (username)`)

        if (error) throw error

        const stats = {}
        data.forEach(row => {
            const name = row.profiles?.username || row.player_name_manual || 'Anónimo'
            if (!stats[name]) {
                stats[name] = { username: name, total_wins: 0, total_matches: 0 }
            }
            stats[name].total_matches++
            if (row.is_winner) stats[name].total_wins++
        })

        leaders.value = Object.values(stats)
            .map(p => ({
                ...p,
                win_rate: p.total_matches > 0 ? Math.round((p.total_wins / p.total_matches) * 100) : 0
            }))
            .sort((a, b) => b.total_wins !== a.total_wins ? b.total_wins - a.total_wins : b.win_rate - a.win_rate)
            .slice(0, 15)

    } catch (err) {
        console.error("Error en el Hall of Fame:", err)
    } finally {
        loading.value = false
    }
})

const getMedal = (index) => ['🥇', '🥈', '🥉'][index]
const getRankClass = (index) => {
    if (index === 0) return 'tier-gold'
    if (index === 1) return 'tier-silver'
    if (index === 2) return 'tier-bronze'
    return 'tier-common'
}

const getMeterColor = (wr, index) => {
    if (index === 0) return '#fbbf24'
    if (index === 1) return '#cbd5e1'
    if (index === 2) return '#d97706'
    return wr > 50 ? '#3b82f6' : '#475569'
}
</script>

<style scoped>
.hall-of-fame-root {
    padding: 40px 20px;
    max-width: 900px;
    margin: 0 auto;
    color: #f8fafc;
}

/* HEADER MONUMENTAL */
.honor-header {
    text-align: center;
    margin-bottom: 60px;
}

.monumental-title {
    font-size: 3.5rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -2px;
    margin: 10px 0;
    background: linear-gradient(to bottom, #fff 30%, #64748b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.season-tag {
    font-weight: 800;
    color: #3b82f6;
    letter-spacing: 4px;
    font-size: 0.8rem;
}

/* FILAS DE HONOR */
.honor-row {
    display: flex;
    align-items: center;
    padding: 24px;
    margin-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    position: relative;
}

/* EFECTO PODIO (TOP 3) */
.tier-gold {
    background: linear-gradient(90deg, rgba(251, 191, 36, 0.08) 0%, transparent 100%);
    border-bottom: 1px solid rgba(251, 191, 36, 0.2);
}

.tier-gold .warrior-name {
    color: #fbbf24;
    text-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
    font-size: 1.5rem;
}

.tier-silver {
    background: linear-gradient(90deg, rgba(203, 213, 225, 0.08) 0%, transparent 100%);
    border-bottom: 1px solid rgba(203, 213, 225, 0.2);
}

.tier-silver .warrior-name {
    color: #cbd5e1;
    font-size: 1.3rem;
}

.tier-bronze {
    background: linear-gradient(90deg, rgba(217, 119, 6, 0.08) 0%, transparent 100%);
    border-bottom: 1px solid rgba(217, 119, 6, 0.2);
}

.tier-bronze .warrior-name {
    color: #d97706;
    font-size: 1.2rem;
}

/* ELEMENTOS INTERNOS */
.rank-badge-wrapper {
    width: 60px;
    display: flex;
    justify-content: center;
}

.medal-display {
    font-size: 2.2rem;
}

.rank-number {
    font-weight: 900;
    color: #334155;
    font-size: 1.2rem;
}

.warrior-profile {
    flex-grow: 1;
    padding: 0 20px;
}

.warrior-name {
    margin: 0;
    font-weight: 800;
    letter-spacing: -0.5px;
}

.warrior-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
    font-size: 0.85rem;
    color: #64748b;
}

.victory-count strong {
    color: #f8fafc;
}

.separator {
    width: 4px;
    height: 4px;
    background: #334155;
    border-radius: 50%;
}

/* INDICADOR DE LETALIDAD */
.lethality-meter {
    text-align: right;
    min-width: 120px;
}

.meter-value {
    display: block;
    font-size: 1.4rem;
    font-weight: 900;
    line-height: 1;
}

.meter-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    color: #475569;
    letter-spacing: 1px;
}

.meter-bar-bg {
    height: 3px;
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    margin-top: 8px;
    border-radius: 10px;
    overflow: hidden;
}

.meter-bar-fill {
    height: 100%;
    transition: width 1s ease-out;
}

/* HOVER ANIMATION */
.honor-row:hover {
    background: rgba(255, 255, 255, 0.03);
    transform: scale(1.02);
    border-bottom-color: rgba(59, 130, 246, 0.4);
}

.loading-state {
    text-align: center;
    padding: 100px;
    color: #475569;
}

.magic-loader {
    width: 40px;
    height: 40px;
    border: 2px solid #1e293b;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s infinite linear;
    margin: 0 auto 20px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>