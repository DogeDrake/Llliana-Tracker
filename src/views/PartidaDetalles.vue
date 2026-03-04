<template>
    <div class="app-container fade-in" v-if="match">
        <header class="detail-header">
            <button @click="$router.back()" class="btn-back">← Volver</button>
            <div class="match-meta-header">
                <span :class="['format-badge', match.formato?.toLowerCase()]">{{ match.formato }}</span>
                <span class="date-text">{{ formatDate(match.fecha_partida) }}</span>
            </div>
        </header>

        <section class="match-summary">
            <h1 class="match-title">Crónica del Encuentro</h1>
            <p v-if="match.notas_globales" class="global-notes">"{{ match.notas_globales }}"</p>
        </section>

        <div class="combatants-list">
            <h2 class="section-label">Planeswalkers participantes</h2>

            <div v-for="p in match.match_participants" :key="p.id" class="participant-card"
                :class="{ 'is-winner': p.is_winner, 'has-account': p.profiles }">

                <div class="status-side">
                    <div v-if="p.is_winner" class="crown-icon">🏆</div>
                    <div v-else class="rank-badge">{{ p.puesto ? p.puesto + 'º' : '•' }}</div>
                </div>

                <div class="card-body">
                    <div class="player-main-info">
                        <h3 class="username">
                            <router-link v-if="p.profiles" :to="`/profile/${p.profiles.username}`" class="profile-link">
                                {{ p.profiles.username }}
                            </router-link>

                            <span v-else-if="p.player_name_manual && p.player_name_manual.toLowerCase() !== 'anónimo'">
                                {{ p.player_name_manual }}
                            </span>

                            <span v-else class="guest-name">Invitado</span>

                            <span v-if="!p.profiles" class="anon-tag">Invitado</span>
                        </h3>

                        <div class="deck-info">
                            <div class="deck-header-row">
                                <span class="deck-name">
                                    {{ p.decks?.nombre_personalizado || p.deck_name_manual || 'Mazo sin nombre' }}
                                </span>
                                <div class="mini-colors" v-if="p.decks?.color_identity">
                                    <span v-for="color in sortColors(p.decks.color_identity)" :key="color"
                                        :class="['mana-icon', color.toLowerCase()]" :title="color">
                                        {{ getColorSymbol(color) }}
                                    </span>
                                </div>
                            </div>

                            <span v-if="match.formato?.toLowerCase() === 'commander' && p.decks?.comandante_nombre"
                                class="commander-tag">
                                👤 {{ p.decks.comandante_nombre }}
                            </span>
                        </div>
                    </div>

                    <div class="player-stats-sidebar">
                        <div class="stat-box">
                            <span class="stat-value">{{ p.calculated_win_rate !== null ? p.calculated_win_rate + '%' :
        '--' }}</span>
                            <span class="stat-label">Win Rate</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer class="match-footer">
            <div class="share-card">
                <p>¿Quieres compartir esta <strong>partida</strong>?</p>
                <button class="btn-share" @click="copyLink">Copiar Enlace del Encuentro</button>
            </div>
        </footer>
    </div>

    <div v-else-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Consultando el Archivo de Alcalá...</p>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/supabaseClient'

const route = useRoute()
const match = ref(null)
const loading = ref(true)

// Lógica de colores WUBRGC
const colorOrder = { 'W': 1, 'U': 2, 'B': 3, 'R': 4, 'G': 5, 'C': 6 }
const colorSymbols = {
    'W': '☀️', 'U': '💧', 'B': '💀', 'R': '🔥', 'G': '🌳', 'C': '💎'
}

const sortColors = (colorString) => {
    if (!colorString) return []
    // Limpiamos espacios y separamos por comas si vienen de la BD como "W,U,B"
    return colorString.split(',')
        .map(c => c.trim().toUpperCase())
        .sort((a, b) => (colorOrder[a] || 99) - (colorOrder[b] || 99))
}

const getColorSymbol = (code) => colorSymbols[code] || '?'

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}

const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('¡Enlace de la partida copiado!')
}

onMounted(async () => {
    try {
        loading.value = true
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                match_participants (
                    *,
                    profiles (id, username, avatar_url),
                    decks (id, nombre_personalizado, color_identity, comandante_nombre)
                )
            `)
            .eq('id', route.params.id)
            .single()

        if (error) throw error

        const processedParticipants = await Promise.all(data.match_participants.map(async (p) => {
            let winRate = null
            let query = supabase.from('match_participants').select('is_winner', { count: 'exact' })

            if (p.deck_id) {
                query = query.eq('deck_id', p.deck_id)
            } else if (p.player_name_manual) {
                query = query.eq('player_name_manual', p.player_name_manual)
            }

            const { count, data: history } = await query
            if (count > 0) {
                const wins = history.filter(h => h.is_winner).length
                winRate = Math.round((wins / count) * 100)
            }

            return { ...p, calculated_win_rate: winRate }
        }))

        data.match_participants = processedParticipants;
        match.value = data
    } catch (err) {
        console.error('Error al cargar la partida:', err)
    } finally {
        loading.value = false
    }
})
</script>

<style scoped>
.app-container {
    padding: 20px;
    max-width: 700px;
    margin: 0 auto;
    color: white;
}

/* HEADER */
.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.btn-back {
    background: none;
    border: none;
    color: #3b82f6;
    font-weight: 700;
    cursor: pointer;
    font-size: 1rem;
}

.match-meta-header {
    text-align: right;
}

.format-badge {
    display: block;
    font-size: 0.7rem;
    font-weight: 900;
    text-transform: uppercase;
    color: #60a5fa;
    letter-spacing: 1px;
}

.date-text {
    font-size: 0.75rem;
    color: #64748b;
}

/* SUMMARY */
.match-summary {
    margin-bottom: 40px;
    text-align: center;
}

.match-title {
    font-size: 2.2rem;
    font-weight: 900;
    margin-bottom: 10px;
}

.global-notes {
    font-style: italic;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.03);
    padding: 15px;
    border-radius: 15px;
    border-left: 4px solid #3b82f6;
}

/* PARTICIPANTS */
.combatants-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.section-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    color: #475569;
    letter-spacing: 2px;
    margin-bottom: 10px;
}

.participant-card {
    display: flex;
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    overflow: hidden;
    transition: 0.3s ease;
}

.participant-card.is-winner {
    border-color: rgba(234, 179, 8, 0.4);
    background: linear-gradient(90deg, rgba(234, 179, 8, 0.02) 0%, rgba(30, 41, 59, 0.4) 100%);
}

.participant-card.has-account {
    border-left: 4px solid #3b82f6;
}

.status-side {
    width: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.1);
}

.crown-icon {
    font-size: 1.5rem;
    filter: drop-shadow(0 0 8px #eab308);
}

.rank-badge {
    font-weight: 900;
    color: #475569;
    font-size: 1.2rem;
}

.card-body {
    flex: 1;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* DECK INFO & COLORS */
.deck-header-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
}

.mini-colors {
    display: flex;
    gap: 4px;
}

.mana-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Colores de fondo de los iconos de mana */
.mana-icon.w {
    background: #fef3c7;
    color: #92400e;
}

.mana-icon.u {
    background: #3b82f6;
    color: white;
}

.mana-icon.b {
    background: #7c3aed;
    color: white;
}

.mana-icon.r {
    background: #ef4444;
    color: white;
}

.mana-icon.g {
    background: #22c55e;
    color: white;
}

.mana-icon.c {
    background: #94a3b8;
    color: white;
}

.username {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 10px;
}

.profile-link {
    color: #60a5fa;
    text-decoration: none;
}

.guest-name {
    color: #94a3b8;
    font-style: italic;
}

.anon-tag {
    font-size: 0.6rem;
    background: #1e293b;
    padding: 2px 8px;
    border-radius: 4px;
    color: #64748b;
}

.deck-name {
    font-size: 0.85rem;
    color: #3b82f6;
    font-weight: 700;
}

.commander-tag {
    display: block;
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 4px;
    font-style: italic;
}

/* STATS */
.stat-box {
    text-align: center;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    padding-left: 15px;
}

.stat-value {
    display: block;
    font-weight: 900;
    color: #f1f5f9;
    font-size: 1.1rem;
}

.stat-label {
    font-size: 0.6rem;
    color: #475569;
    text-transform: uppercase;
}

/* FOOTER */
.match-footer {
    margin-top: 50px;
    text-align: center;
}

.share-card {
    background: rgba(59, 130, 246, 0.05);
    border: 1px dashed rgba(59, 130, 246, 0.2);
    padding: 25px;
    border-radius: 24px;
}

.btn-share {
    background: #3b82f6;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    color: white;
    font-weight: 700;
    cursor: pointer;
    margin-top: 10px;
}

.loading-state {
    text-align: center;
    padding: 100px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(59, 130, 246, 0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.fade-in {
    animation: fadeIn 0.5s ease-out;
}
</style>