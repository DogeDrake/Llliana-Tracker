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
const history = ref([])
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

// Navegación a la partida específica
const goToMatch = (matchId) => {
    if (matchId) router.push(`/partida/${matchId}`)
}

// Lógica de análisis de mazo mejorada para otros usuarios
const openStats = async (deck) => {
    // Identificadores posibles del mazo en el historial manual
    const searchTerms = [
        deck.nombre_personalizado?.toLowerCase(),
        deck.comandante_nombre?.toLowerCase(),
        deck.arquetipo_pauper?.toLowerCase()
    ].filter(Boolean);

    const deckMatches = history.value.filter(h =>
        h.deck_name_manual && searchTerms.includes(h.deck_name_manual.toLowerCase())
    );

    if (deckMatches.length === 0) {
        selectedDeckStats.value = { ...deck, empty: true };
        showDeckStats.value = true;
        return;
    }

    const wins = deckMatches.filter(m => m.is_winner).length;
    const matchIds = deckMatches.map(m => m.match_id);

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
        ...deck,
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
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
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
                        <p class="rank-subtitle">{{ profile.bio }}</p>
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
                    <div v-if="decks.length === 0" class="empty-state-text">Este Planeswalker aún no tiene mazos.</div>
                </div>
            </section>

            <section class="content-section">
                <h2 class="section-title">Historial Reciente</h2>
                <div class="history-list">
                    <button v-for="entry in history" :key="entry.match_id" class="history-item-clickable"
                        @click="goToMatch(entry.match_id)">
                        <div class="h-date">{{ formatDate(entry.matches.fecha_partida) }}</div>
                        <div class="h-main">
                            <span class="h-deck">{{ entry.deck_name_manual || 'Mazo sin nombre' }}</span>
                            <span class="h-format">{{ entry.matches.formato }}</span>
                        </div>
                        <div class="h-result" :class="entry.is_winner ? 'win' : 'loss'">
                            {{ entry.is_winner ? 'VICTORIA' : 'DERROTA' }}
                        </div>
                        <div class="h-action">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                                stroke-width="3">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                    </button>
                    <div v-if="history.length === 0" class="empty-state-text">Sin registros de partidas.</div>
                </div>
            </section>
        </div>

        <div v-if="showDeckStats" class="modal-overlay" @click.self="showDeckStats = false">
            <div class="modal-content glass-modal stats-modal-large fade-in-up">
                <div class="modal-header">
                    <div class="header-indicator stats"></div>
                    <div class="header-titles">
                        <span class="deck-format-tag">{{ selectedDeckStats.formato }}</span>
                        <h3>{{ selectedDeckStats.nombre_personalizado || selectedDeckStats.name }}</h3>
                    </div>
                    <button class="close-btn-styled" @click="showDeckStats = false">✕</button>
                </div>

                <div v-if="selectedDeckStats.empty" class="empty-state-stats">
                    <div class="no-data-icon">📜</div>
                    <p>No hay registros de partida para este mazo.</p>
                </div>

                <div v-else class="stats-grid-container">
                    <div class="main-metrics">
                        <div class="metric-card">
                            <span class="m-val">{{ selectedDeckStats.winRate }}%</span>
                            <span class="m-lab">Efectividad</span>
                        </div>
                        <div class="metric-card">
                            <span class="m-val">{{ selectedDeckStats.total }}</span>
                            <span class="m-lab">Partidas</span>
                        </div>
                    </div>

                    <div class="rival-tracking">
                        <h4>Historial contra Rivales</h4>
                        <div class="rival-row nemesis">
                            <span class="r-tag">NÉMESIS</span>
                            <span class="r-name">{{ selectedDeckStats.nemesis[0] || '---' }}</span>
                            <span class="r-score">{{ selectedDeckStats.nemesis[1] }} derrotas</span>
                        </div>
                        <div class="rival-row victim">
                            <span class="r-tag">VÍCTIMA</span>
                            <span class="r-name">{{ selectedDeckStats.victim[0] || '---' }}</span>
                            <span class="r-score">{{ selectedDeckStats.victim[1] }} victorias</span>
                        </div>
                    </div>

                    <div class="deck-info-footer"
                        v-if="selectedDeckStats.commander_name || selectedDeckStats.arquetipo_pauper">
                        <div v-if="selectedDeckStats.commander_name" class="footer-item">
                            <span class="label">Comandante:</span> {{ selectedDeckStats.commander_name }}
                        </div>
                        <div v-if="selectedDeckStats.arquetipo_pauper" class="footer-item">
                            <span class="label">Arquetipo:</span> {{ selectedDeckStats.arquetipo_pauper }}
                        </div>
                        <div v-if="selectedDeckStats.color_identity" class="footer-item colors">
                            <span class="label">Identidad:</span> {{ selectedDeckStats.color_identity }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-else class="error-state">
        <div class="error-content">
            <h2>⚠️ 404</h2>
            <p>No se ha podido encontrar el rastro de este usuario en el Multiverso.</p>
            <button @click="goBack" class="btn-submit-magic">VOLVER</button>
        </div>
    </div>
</template>

<style scoped>
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

/* Barra Superior */
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

.back-btn:hover {
    background: rgba(96, 165, 250, 0.1);
    border-color: #60a5fa;
}

.brand {
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
    font-size: 0.8rem;
}

/* Hero Section */
.hero-section {
    display: flex;
    align-items: center;
    gap: 30px;
    margin-bottom: 40px;
}

.avatar-wrapper.readonly {
    width: 110px;
    height: 110px;
    position: relative;
}

.avatar-image-container,
.avatar-circle {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid #3b82f6;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e293b;
    z-index: 2;
    position: relative;
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-circle {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    font-size: 2.5rem;
    font-weight: 900;
}

.avatar-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 130%;
    height: 130%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
}

.username-title {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 900;
    margin: 0;
}

.rank-subtitle {
    color: #60a5fa;
    text-transform: uppercase;
    font-size: 0.75rem;
    font-weight: 800;
    margin-top: 5px;
}

/* Stats Rápidas */
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
    font-size: 1.5rem;
    font-weight: 900;
    color: #3b82f6;
}

.q-label {
    font-size: 0.6rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 800;
}

/* Historial Clicable */
.history-list {
    background: rgba(30, 41, 59, 0.4);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.history-item-clickable {
    display: grid;
    grid-template-columns: 85px 1fr auto auto;
    align-items: center;
    padding: 18px 20px;
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    text-align: left;
    color: white;
    transition: all 0.2s ease;
}

.history-item-clickable:hover {
    background: rgba(59, 130, 246, 0.1);
}

.h-date {
    font-size: 0.7rem;
    color: #64748b;
    font-weight: 700;
}

.h-deck {
    font-weight: 700;
    color: #f1f5f9;
    display: block;
    font-size: 0.9rem;
}

.h-format {
    font-size: 0.6rem;
    color: #3b82f6;
    text-transform: uppercase;
    font-weight: 900;
}

.h-result {
    font-size: 0.6rem;
    font-weight: 900;
    padding: 6px 12px;
    border-radius: 8px;
    text-align: center;
    margin-right: 15px;
}

.h-action {
    color: #64748b;
    display: flex;
    align-items: center;
}

.win {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.loss {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
}

/* Grid de Mazos */
.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.section-title {
    font-size: 1rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 40px 0 20px;
}

/* Modales */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
}

.glass-modal {
    background: #0f172a;
    padding: 30px;
    border-radius: 28px;
    width: 100%;
    border: 1px solid rgba(59, 130, 246, 0.2);
}

.stats-modal-large {
    max-width: 450px;
    position: relative;
}

.header-indicator.stats {
    height: 4px;
    background: #a855f7;
    border-radius: 0 0 4px 4px;
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 25px;
}

.deck-format-tag {
    font-size: 0.55rem;
    background: #3b82f6;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 900;
    text-transform: uppercase;
}

.main-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 25px;
}

.metric-card {
    background: #1e293b;
    padding: 20px;
    border-radius: 20px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.m-val {
    display: block;
    font-size: 1.8rem;
    font-weight: 900;
    color: #a855f7;
}

.m-lab {
    font-size: 0.6rem;
    color: #94a3b8;
    font-weight: 700;
    text-transform: uppercase;
}

.rival-tracking h4 {
    font-size: 0.65rem;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 15px;
}

.rival-row {
    display: flex;
    align-items: center;
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 10px;
    font-size: 0.85rem;
}

.nemesis {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.victim {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
}

.r-tag {
    font-size: 0.55rem;
    font-weight: 900;
    padding: 3px 6px;
    border-radius: 4px;
    margin-right: 10px;
}

.nemesis .r-tag {
    background: #ef4444;
}

.victim .r-tag {
    background: #10b981;
}

.r-name {
    font-weight: 700;
    flex: 1;
}

.r-score {
    font-size: 0.7rem;
    color: #94a3b8;
}

.deck-info-footer {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.8rem;
    color: #94a3b8;
}

.footer-item {
    margin-bottom: 5px;
}

.footer-item .label {
    font-weight: 800;
    color: #3b82f6;
    text-transform: uppercase;
    font-size: 0.65rem;
    margin-right: 5px;
}

/* Botones y Otros */
.close-btn-styled {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: #64748b;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-weight: bold;
}

.btn-submit-magic {
    background: #3b82f6;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    color: white;
    font-weight: 800;
    cursor: pointer;
    margin-top: 20px;
}

.error-state {
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
}

/* Animaciones */
.fade-in-up {
    animation: fadeInUp 0.4s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>