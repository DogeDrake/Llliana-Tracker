<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

const route = useRoute()
const router = useRouter()

// --- ESTADOS ---
const profile = ref(null)
const decks = ref([])
const history = ref([]) // Añadido historial
const loading = ref(true)
const showDeckStats = ref(false)
const selectedDeckStats = ref(null)

const stats = reactive({
    totalMatches: 0,
    winRate: 0
})

onMounted(async () => {
    try {
        loading.value = true
        const usernameParam = route.params.username

        // 1. Buscamos el perfil por username
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', usernameParam)
            .single()

        if (profileError || !profileData) throw new Error("Planeswalker no encontrado")
        profile.value = profileData

        // 2. Cargamos mazos e historial en paralelo
        const [decksRes, historyRes] = await Promise.all([
            supabase.from('decks')
                .select('*')
                .eq('user_id', profile.value.id)
                .order('created_at', { ascending: false }),
            supabase.from('match_participants')
                .select(`
                    is_winner, deck_name_manual, player_name_manual, match_id,
                    matches (id, fecha_partida, formato)
                `)
                .or(`user_id.eq.${profile.value.id},player_name_manual.ilike.${profile.value.username}`)
                .order('created_at', { ascending: false })
        ])

        decks.value = decksRes.data || []
        history.value = historyRes.data?.filter(p => p.matches) || []

        // 3. Calcular Stats Globales
        if (history.value.length > 0) {
            const total = history.value.length
            const wins = history.value.filter(p => p.is_winner === true).length
            stats.totalMatches = total
            stats.winRate = ((wins / total) * 100).toFixed(1)
        }

    } catch (err) {
        console.error("Error cargando perfil ajeno:", err.message)
    } finally {
        loading.value = false
    }
})

// Lógica de análisis de mazo (Copiada de tu perfil para consistencia)
const openStats = async (deck) => {
    const deckNameLower = deck.nombre_personalizado.toLowerCase();
    const deckMatches = history.value.filter(h =>
        h.deck_name_manual && h.deck_name_manual.toLowerCase() === deckNameLower
    );

    if (deckMatches.length === 0) {
        selectedDeckStats.value = { name: deck.nombre_personalizado, empty: true };
        showDeckStats.value = true;
        return;
    }

    const wins = deckMatches.filter(m => m.is_winner).length;
    const matchIds = deckMatches.map(m => m.match_id);

    // Buscamos oponentes en esas partidas
    const { data: opponents } = await supabase
        .from('match_participants')
        .select('player_name_manual, is_winner, match_id')
        .in('match_id', matchIds)
        .neq('player_name_manual', profile.value.username);

    const nemesisMap = {}, victimMap = {};

    deckMatches.forEach(dm => {
        const gameOpponents = opponents?.filter(o => o.match_id === dm.match_id) || [];
        gameOpponents.forEach(opp => {
            const name = opp.player_name_manual || 'Anónimo';
            if (dm.is_winner) {
                victimMap[name] = (victimMap[name] || 0) + 1;
            } else if (opp.is_winner) {
                nemesisMap[name] = (nemesisMap[name] || 0) + 1;
            }
        });
    });

    const getTop = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0] || [null, 0];

    selectedDeckStats.value = {
        name: deck.nombre_personalizado,
        total: deckMatches.length,
        winRate: ((wins / deckMatches.length) * 100).toFixed(1),
        nemesis: getTop(nemesisMap),
        victim: getTop(victimMap)
    };
    showDeckStats.value = true;
}

const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '---'
const openDecklist = (url) => { if (url) window.open(url, '_blank') }
const goBack = () => router.back()
</script>

<template>
    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Localizando Planeswalker...</p>
    </div>

    <div v-else-if="profile" class="profile-view-root">
        <div class="relative-content fade-in">
            <header class="profile-main-header">
                <nav class="top-bar">
                    <button @click="goBack" class="back-btn">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                            stroke-width="3">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        VOLVER
                    </button>
                    <span class="brand">LILLIANA TRACKER</span>
                </nav>

                <div class="hero-section">
                    <div class="avatar-wrapper readonly">
                        <div v-if="profile.avatar_url" class="avatar-image-container">
                            <img :src="profile.avatar_url" class="avatar-image" />
                        </div>
                        <div v-else class="avatar-circle">{{ profile.username?.charAt(0).toUpperCase() }}</div>
                        <div class="avatar-glow"></div>
                    </div>
                    <div class="hero-text">
                        <h1 class="username-title">{{ profile.username }}</h1>
                        <p class="rank-subtitle">Planeswalker de Élite</p>
                    </div>
                </div>

                <div class="quick-stats-row">
                    <div class="q-stat"><span class="q-num">{{ decks.length }}</span><span class="q-label">Mazos</span>
                    </div>
                    <div class="q-stat"><span class="q-num">{{ stats.totalMatches }}</span><span
                            class="q-label">Partidas</span></div>
                    <div class="q-stat"><span class="q-num">{{ stats.winRate }}%</span><span class="q-label">Win
                            Rate</span></div>
                </div>
            </header>

            <section class="content-section">
                <h2 class="section-title">Arsenal de {{ profile.username }}</h2>
                <div class="decks-layout-grid">
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck" @click="openDecklist(deck.decklist_url)"
                        @show-stats="openStats(deck)" />
                    <div v-if="decks.length === 0" class="empty-decks">Este Planeswalker aún no tiene mazos.</div>
                </div>
            </section>

            <section class="content-section">
                <h2 class="section-title">Historial Reciente</h2>
                <div class="history-list">
                    <div v-for="entry in history" :key="entry.match_id" class="history-item">
                        <div class="h-date">{{ formatDate(entry.matches.fecha_partida) }}</div>
                        <div class="h-main">
                            <span class="h-deck">{{ entry.deck_name_manual || 'Mazo sin nombre' }}</span>
                            <span class="h-format">{{ entry.matches.formato }}</span>
                        </div>
                        <div class="h-result" :class="entry.is_winner ? 'win' : 'loss'">
                            {{ entry.is_winner ? 'VICTORIA' : 'DERROTA' }}
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div v-if="showDeckStats" class="modal-overlay" @click.self="showDeckStats = false">
            <div class="modal-content glass-modal stats-modal fade-in-up">
                <div class="modal-header">
                    <div class="header-indicator stats"></div>
                    <h3>ANÁLISIS: {{ selectedDeckStats.name }}</h3>
                    <button class="close-btn-styled" @click="showDeckStats = false">✕</button>
                </div>

                <div v-if="selectedDeckStats.empty" class="empty-state-stats">
                    <p>Sin registros de **partida** para este mazo.</p>
                </div>

                <div v-else class="deck-stats-detail">
                    <div class="stat-main-grid">
                        <div class="stat-box"><span class="s-val">{{ selectedDeckStats.winRate }}%</span><span
                                class="s-lab">Win Rate</span></div>
                        <div class="stat-box"><span class="s-val">{{ selectedDeckStats.total }}</span><span
                                class="s-lab">Partidas</span></div>
                    </div>
                    <div class="rivals-section">
                        <div class="rival-card nemesis">
                            <div class="r-icon">💀</div>
                            <div class="r-info"><span class="r-title">NÉMESIS</span><span class="r-name">{{
        selectedDeckStats.nemesis[0] || '---' }}</span></div>
                            <span class="r-count">{{ selectedDeckStats.nemesis[1] }}</span>
                        </div>
                        <div class="rival-card victim">
                            <div class="r-icon">⚔️</div>
                            <div class="r-info"><span class="r-title">VÍCTIMA</span><span class="r-name">{{
        selectedDeckStats.victim[0] || '---' }}</span></div>
                            <span class="r-count">{{ selectedDeckStats.victim[1] }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-else class="error-state">
        <p>No se ha podido encontrar el rastro de este usuario.</p>
        <button @click="goBack" class="btn-submit-magic">Volver</button>
    </div>
</template>

<style scoped>
/* Estilos heredados y consistentes */
.profile-view-root {
    min-height: 100vh;
    color: white;
    padding-bottom: 60px;
}

.relative-content {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
}

.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
}

.back-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #60a5fa;
    padding: 10px 18px;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: 800;
    transition: 0.3s;
}

.brand {
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
    font-size: 0.8rem;
}

.avatar-wrapper.readonly {
    width: 120px;
    height: 120px;
    position: relative;
}

.avatar-image-container {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid #3b82f6;
    position: relative;
    z-index: 2;
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-circle {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: 900;
}

.avatar-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 130%;
    height: 130%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
    filter: blur(15px);
    z-index: 1;
}

.hero-section {
    display: flex;
    align-items: center;
    gap: 30px;
    margin-bottom: 40px;
}

.username-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 900;
    margin: 0;
    background: linear-gradient(to right, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.quick-stats-row {
    display: flex;
    gap: 15px;
    padding: 25px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.q-stat {
    flex: 1;
    text-align: center;
}

.q-num {
    display: block;
    font-size: 1.8rem;
    font-weight: 900;
    color: #3b82f6;
}

.q-label {
    font-size: 0.6rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 800;
}

.section-title {
    font-size: 1.1rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 40px 0 20px;
}

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.history-list {
    background: rgba(30, 41, 59, 0.4);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.history-item {
    display: grid;
    grid-template-columns: 85px 1fr auto;
    align-items: center;
    padding: 18px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.h-date {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 700;
}

.h-deck {
    font-weight: 700;
    color: #f1f5f9;
    display: block;
}

.h-result {
    font-size: 0.65rem;
    font-weight: 900;
    padding: 6px 12px;
    border-radius: 8px;
    min-width: 90px;
    text-align: center;
}

.win {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.loss {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
}

/* Reutilizando estilos de Modales del perfil anterior */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.glass-modal {
    background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
    padding: 30px;
    border-radius: 28px;
    width: 90%;
    max-width: 420px;
    border: 1px solid rgba(59, 130, 246, 0.3);
    position: relative;
}

.stat-main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
}

.stat-box {
    background: rgba(15, 23, 42, 0.5);
    padding: 20px;
    border-radius: 18px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.rival-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.4);
    border-left: 4px solid #334155;
    margin-bottom: 10px;
}

.rival-card.nemesis {
    border-left-color: #ef4444;
}

.rival-card.victim {
    border-left-color: #10b981;
}

.s-val {
    display: block;
    font-size: 1.5rem;
    font-weight: 900;
    color: #3b82f6;
}

.s-lab {
    font-size: 0.6rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 800;
}
</style>