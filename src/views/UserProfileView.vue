<template>
    <div class="auth-viewport scrollable" v-if="player">
        <div class="mana-particles purple"></div>

        <div class="profile-container fade-in">
            <button @click="$router.back()" class="btn-back">← Volver</button>

            <header class="profile-header card-inner">
                <div class="avatar-shield">
                    <div class="big-avatar">{{ player.username?.charAt(0).toUpperCase() }}</div>
                    <div class="rank-badge">LVL ?</div>
                </div>
                <h1 class="player-name">{{ player.username }}</h1>
                <p class="player-bio">"{{ player.bio || 'Un misterioso caminante de planos sin biografía...' }}"</p>
            </header>

            <section class="versus-card card-inner">
                <div class="section-title">
                    <span class="icon">⚔️</span>
                    <h3>Historial de Partidas</h3>
                </div>

                <div class="vs-dashboard">
                    <div class="vs-stat-box">
                        <span class="vs-value win">0</span>
                        <span class="vs-label">Tus Victorias</span>
                    </div>

                    <div class="threat-meter">
                        <div class="meter-bar">
                            <div class="meter-fill" style="width: 50%"></div>
                        </div>
                        <span class="meter-text">Nivel de Amenaza: EQUILIBRADO</span>
                    </div>

                    <div class="vs-stat-box">
                        <span class="vs-value loss">0</span>
                        <span class="vs-label">Tus Derrotas</span>
                    </div>
                </div>
            </section>

            <section class="grimorio-section">
                <div class="section-title">
                    <span class="icon">📖</span>
                    <h3>Grimorio de Mazos Activos</h3>
                </div>

                <div class="decks-grid">
                    <div v-for="deck in decks" :key="deck.id" class="deck-crystal-card">
                        <div class="deck-format-tag" :class="deck.formato.toLowerCase()">
                            {{ deck.formato }}
                        </div>
                        <div class="deck-info">
                            <span class="deck-name">{{ deck.nombre_personalizado || deck.comandante_nombre }}</span>
                            <span class="deck-sub">{{ deck.comandante_nombre }}</span>
                        </div>
                        <div class="deck-arrow">→</div>
                    </div>
                </div>

                <div v-if="decks.length === 0" class="empty-state">
                    Este duelista aún no ha revelado sus mazos...
                </div>
            </section>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/supabaseClient'

const route = useRoute()
const player = ref(null)
const decks = ref([])

onMounted(async () => {
    const playerId = route.params.id
    const { data: p } = await supabase.from('profiles').select('*').eq('id', playerId).single()
    player.value = p
    const { data: d } = await supabase.from('decks').select('*').eq('user_id', playerId).eq('is_active', true)
    decks.value = d
})
</script>

<style scoped>
.auth-viewport.scrollable {
    display: block;
    /* Para que el scroll funcione mejor en perfiles largos */
    overflow-y: auto;
    padding: 40px 20px;
    background: radial-gradient(circle at center, #2e1065 0%, #020617 100%);
}

.profile-container {
    max-width: 600px;
    margin: 0 auto;
}

.btn-back {
    background: none;
    border: none;
    color: #a78bfa;
    cursor: pointer;
    margin-bottom: 20px;
    font-weight: bold;
}

/* HEADER STYLE */
.profile-header {
    padding: 40px;
    text-align: center;
    margin-bottom: 25px;
    background: rgba(255, 255, 255, 0.03);
}

.avatar-shield {
    position: relative;
    width: 100px;
    margin: 0 auto 20px;
}

.big-avatar {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 900;
    color: white;
    box-shadow: 0 0 30px rgba(124, 58, 237, 0.4);
    border: 3px solid rgba(255, 255, 255, 0.1);
}

.rank-badge {
    position: absolute;
    bottom: -5px;
    right: -5px;
    background: #f59e0b;
    color: #000;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 4px 8px;
    border-radius: 20px;
    border: 2px solid #2e1065;
}

.player-name {
    font-size: 2rem;
    margin-bottom: 10px;
    letter-spacing: -1px;
}

.player-bio {
    color: #94a3b8;
    font-style: italic;
    font-size: 0.9rem;
}

/* SECCIÓN VERSUS */
.versus-card {
    padding: 25px;
    margin-bottom: 25px;
    border: 1px solid rgba(167, 139, 250, 0.2);
}

.section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    color: #a78bfa;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 2px;
}

.vs-dashboard {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
}

.vs-stat-box {
    text-align: center;
}

.vs-value {
    display: block;
    font-size: 2rem;
    font-weight: 900;
}

.vs-value.win {
    color: #10b981;
}

.vs-value.loss {
    color: #ef4444;
}

.vs-label {
    font-size: 0.6rem;
    color: #64748b;
    text-transform: uppercase;
}

/* THREAT METER */
.threat-meter {
    flex-grow: 1;
    text-align: center;
}

.meter-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 8px;
}

.meter-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
    transition: width 1s ease-in-out;
}

.meter-text {
    font-size: 0.6rem;
    color: #a78bfa;
    font-weight: bold;
}

/* DECK CARDS */
.decks-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.deck-crystal-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 15px 20px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 15px;
    transition: 0.3s;
    cursor: pointer;
}

.deck-crystal-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(5px);
    border-color: rgba(167, 139, 250, 0.4);
}

.deck-format-tag {
    font-size: 0.6rem;
    font-weight: 900;
    padding: 4px 8px;
    border-radius: 6px;
    text-transform: uppercase;
}

.deck-format-tag.commander {
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
}

.deck-format-tag.pauper {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
}

.deck-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.deck-name {
    font-weight: bold;
    font-size: 1rem;
}

.deck-sub {
    font-size: 0.75rem;
    color: #64748b;
}

.deck-arrow {
    color: #334155;
    font-weight: bold;
}
</style>