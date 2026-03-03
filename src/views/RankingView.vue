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
                    :class="[getRankClass(index), { 'is-link': player.is_registered }]" @click="goToProfile(player)">

                    <div class="rank-badge-wrapper">
                        <div class="rank-number" v-if="index > 2">#{{ index + 1 }}</div>
                        <div class="medal-display" v-else>{{ getMedal(index) }}</div>
                    </div>

                    <div class="warrior-profile">
                        <div class="name-wrapper">
                            <h3 class="warrior-name">{{ player.username }}</h3>
                            <span v-if="player.is_registered" class="registered-badge">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path
                                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                            </span>
                        </div>
                        <div class="warrior-meta">
                            <span class="victory-count">{{ player.total_wins }} Victorias</span>
                            <i class="separator"></i>
                            <span class="match-total">{{ player.total_matches }} Partidas</span>
                        </div>
                    </div>

                    <div class="lethality-meter">
                        <div class="meter-content">
                            <span class="meter-value">{{ player.win_rate }}%</span>
                            <span class="meter-label">WinRate</span>
                        </div>
                        <div class="meter-bar-bg">
                            <div class="meter-bar-fill"
                                :style="{ width: player.win_rate + '%', backgroundColor: getMeterColor(player.win_rate, index) }">
                            </div>
                        </div>
                    </div>

                    <div v-if="player.is_registered" class="profile-arrow">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                            stroke-width="3">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
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
import { useRouter } from 'vue-router'

const router = useRouter()
const leaders = ref([])
const loading = ref(true)

onMounted(async () => {
    try {
        loading.value = true
        const { data, error } = await supabase
            .from('match_participants')
            .select(`is_winner, player_name_manual`)

        if (error) throw error

        const { data: registeredUsers, error: pError } = await supabase
            .from('profiles')
            .select('username')

        if (pError) throw pError

        const usernamesConCuenta = new Set(registeredUsers.map(u => u.username))
        const stats = {}

        data.forEach(row => {
            const name = row.player_name_manual
            if (name && usernamesConCuenta.has(name)) {
                if (!stats[name]) {
                    stats[name] = {
                        username: name,
                        total_wins: 0,
                        total_matches: 0,
                        is_registered: true
                    }
                }
                stats[name].total_matches++
                if (row.is_winner) stats[name].total_wins++
            }
        })

        leaders.value = Object.values(stats)
            .map(p => ({
                ...p,
                win_rate: p.total_matches > 0 ? Math.round((p.total_wins / p.total_matches) * 100) : 0
            }))
            .sort((a, b) => b.total_wins - a.total_wins)
            .slice(0, 15)

    } catch (err) {
        console.error("Error en el Ranking:", err.message)
    } finally {
        loading.value = false
    }
})

const goToProfile = (player) => {
    router.push(`/profile/${player.username}`)
}

const getMedal = (index) => ['🥇', '🥈', '🥉'][index]
const getRankClass = (index) => {
    if (index === 0) return 'tier-gold'
    if (index === 1) return 'tier-silver'
    if (index === 2) return 'tier-bronze'
    return 'tier-common'
}

const getMeterColor = (wr, index) => {
    if (index === 0) return '#ffd700'
    if (index === 1) return '#e2e8f0'
    if (index === 2) return '#cd7f32'
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

.fade-in {
    animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.honor-header {
    text-align: center;
    margin-bottom: 60px;
}

.monumental-title {
    font-size: clamp(2.5rem, 8vw, 4rem);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -2px;
    margin: 10px 0;
    background: linear-gradient(to bottom, #fff 30%, #64748b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.honor-row {
    display: flex;
    align-items: center;
    padding: 24px;
    margin-bottom: 12px;
    background: rgba(30, 41, 59, 0.4);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

/* --- COLORES TOP 3 REFORZADOS --- */

.tier-gold {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(30, 41, 59, 0.6) 100%);
    border: 1px solid rgba(251, 191, 36, 0.5);
    box-shadow: 0 10px 30px -10px rgba(251, 191, 36, 0.3);
    margin-bottom: 25px;
    transform: scale(1.03);
    animation: float 4s ease-in-out infinite;
}

.tier-silver {
    background: linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(30, 41, 59, 0.6) 100%);
    border: 1px solid rgba(148, 163, 184, 0.4);
    box-shadow: 0 10px 30px -10px rgba(148, 163, 184, 0.2);
    margin-bottom: 25px;
    transform: scale(1.02);
    animation: float 4s ease-in-out infinite;
    animation-delay: 0.5s;
}

.tier-bronze {
    background: linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(30, 41, 59, 0.6) 100%);
    border: 1px solid rgba(205, 127, 50, 0.4);
    box-shadow: 0 10px 30px -10px rgba(205, 127, 50, 0.2);
    margin-bottom: 25px;
    transform: scale(1.02);
    animation: float 4s ease-in-out infinite;
    animation-delay: 1s;
}

@keyframes float {

    0%,
    100% {
        transform: translateY(0) scale(1.03);
    }

    50% {
        transform: translateY(-8px) scale(1.03);
    }
}

/* --- DETALLES DE LAS CARDS --- */

.rank-badge-wrapper {
    width: 80px;
    display: flex;
    justify-content: center;
}

.medal-display {
    font-size: 3rem;
    filter: drop-shadow(0 0 15px rgba(0, 0, 0, 0.3));
}

.warrior-profile {
    flex-grow: 1;
    padding: 0 20px;
}

.warrior-name {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.5px;
}

/* Colores de nombres específicos para el podio */
.tier-gold .warrior-name {
    color: #fbbf24;
}

.tier-silver .warrior-name {
    color: #e2e8f0;
}

.tier-bronze .warrior-name {
    color: #d97706;
}

.warrior-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
    font-size: 0.9rem;
    color: #94a3b8;
}

.separator {
    width: 4px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
}

.lethality-meter {
    text-align: right;
    min-width: 140px;
}

.meter-value {
    display: block;
    font-size: 1.7rem;
    font-weight: 900;
    line-height: 1;
}

.meter-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
}

.meter-bar-bg {
    height: 6px;
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    margin-top: 10px;
    border-radius: 10px;
    overflow: hidden;
}

.meter-bar-fill {
    height: 100%;
    transition: width 2s cubic-bezier(0.19, 1, 0.22, 1);
}

.is-link {
    cursor: pointer;
}

.is-link:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(10px);
}

.profile-arrow {
    opacity: 0;
    transition: 0.3s;
    color: #3b82f6;
    margin-left: 15px;
}

.honor-row.is-link:hover .profile-arrow {
    opacity: 1;
}

@media (max-width: 600px) {
    .honor-row {
        flex-wrap: wrap;
        padding: 16px;
    }

    .lethality-meter {
        width: 100%;
        text-align: left;
        margin-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 15px;
    }
}
</style>