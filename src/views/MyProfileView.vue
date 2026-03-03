<script setup>
import { ref, onMounted, reactive } from 'vue'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

// --- ESTADOS ---
const profile = ref(null)
const decks = ref([])
const history = ref([])
const loading = ref(true)
const isSubmitting = ref(false)

// Modales
const showAddDeck = ref(false)
const showEditAvatar = ref(false)
const showDeckStats = ref(false)

const newAvatarUrl = ref('')
const selectedDeckStats = ref(null)

// Objeto actualizado con image_url
const newDeck = reactive({
    nombre_personalizado: '',
    formato: 'commander',
    decklist_url: '',
    image_url: '' // <--- Nuevo campo
})

const stats = reactive({
    totalMatches: 0,
    winRate: 0
})

// --- LÓGICA DE CARGA ---
onMounted(async () => {
    try {
        loading.value = true
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            window.location.href = '/login'
            return
        }

        const [profileRes, decksRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('decks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ])

        if (profileRes.error) throw profileRes.error

        profile.value = profileRes.data
        decks.value = decksRes.data || []
        newAvatarUrl.value = profile.value.avatar_url || ''

        await fetchStatsAndHistory(user.id, profile.value.username)

    } catch (err) {
        console.error("Error crítico:", err.message)
    } finally {
        loading.value = false
    }
})

const fetchStatsAndHistory = async (userId, username) => {
    try {
        const { data, error } = await supabase
            .from('match_participants')
            .select(`
                is_winner, deck_name_manual, player_name_manual, match_id,
                matches (id, fecha_partida, formato)
            `)
            .or(`user_id.eq.${userId},player_name_manual.ilike.${username}`)
            .order('created_at', { ascending: false })

        if (error) throw error
        if (data) {
            history.value = data.filter(p => p.matches)
            const total = history.value.length
            const wins = history.value.filter(p => p.is_winner === true).length
            stats.totalMatches = total
            stats.winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0
        }
    } catch (e) {
        console.warn("Error historial/stats:", e.message)
    }
}

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

const createDeck = async () => {
    if (!newDeck.nombre_personalizado) return
    isSubmitting.value = true
    try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('decks')
            .insert([{
                nombre_personalizado: newDeck.nombre_personalizado,
                formato: newDeck.formato,
                decklist_url: newDeck.decklist_url,
                image_url: newDeck.image_url, // <--- Enviado a la DB
                user_id: user.id
            }])
            .select()

        if (error) throw error

        decks.value.unshift(data[0])
        showAddDeck.value = false

        // Limpiar campos
        newDeck.nombre_personalizado = ''
        newDeck.decklist_url = ''
        newDeck.image_url = ''
        newDeck.formato = 'commander'
    } catch (err) {
        alert("Error al crear: " + err.message)
    } finally {
        isSubmitting.value = false
    }
}

const updateAvatar = async () => {
    if (!newAvatarUrl.value) return
    isSubmitting.value = true
    try {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('profiles').update({ avatar_url: newAvatarUrl.value }).eq('id', user.id)
        profile.value.avatar_url = newAvatarUrl.value
        showEditAvatar.value = false
    } catch (err) {
        alert(err.message)
    } finally {
        isSubmitting.value = false
    }
}

const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '---'
const openDecklist = (url) => { if (url) window.open(url, '_blank') }
async function handleLogout() { await supabase.auth.signOut(); window.location.href = '/Lilliana-Tracker/' }
</script>

<template>
    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Invocando perfil...</p>
    </div>

    <div v-else-if="profile" class="profile-view-root">
        <div class="relative-content fade-in">
            <header class="profile-main-header">
                <nav class="top-bar">
                    <span class="brand">LILLIANA TRACKER</span>
                    <button @click="handleLogout" class="logout-btn">Cerrar Sesión</button>
                </nav>

                <div class="hero-section">
                    <div class="avatar-wrapper" @click="showEditAvatar = true">
                        <div v-if="profile.avatar_url" class="avatar-image-container">
                            <img :src="profile.avatar_url" class="avatar-image" />
                        </div>
                        <div v-else class="avatar-circle">{{ profile.username?.charAt(0).toUpperCase() }}</div>
                        <div class="avatar-glow"></div>
                        <div class="edit-overlay"><span>CAMBIAR</span></div>
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
                <div class="section-header-bar">
                    <h2 class="section-title">Tus Mazos</h2>
                    <button @click="showAddDeck = true" class="add-deck-btn">+ NUEVO MAZO</button>
                </div>
                <div class="decks-layout-grid">
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck" @click="openDecklist(deck.decklist_url)"
                        @show-stats="openStats(deck)" />
                    <div v-if="decks.length === 0" class="empty-state-text">No has registrado mazos todavía.</div>
                </div>
            </section>

            <section class="content-section">
                <h2 class="section-title">Historial de Partidas</h2>
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

        <div v-if="showAddDeck || showEditAvatar || showDeckStats" class="modal-overlay"
            @click.self="showAddDeck = false; showEditAvatar = false; showDeckStats = false">

            <div v-if="showDeckStats" class="modal-content glass-modal stats-modal fade-in-up">
                <div class="modal-header">
                    <div class="header-indicator stats"></div>
                    <h3>ANÁLISIS: {{ selectedDeckStats.name }}</h3>
                    <button class="close-btn-styled" @click="showDeckStats = false">✕</button>
                </div>
                <div v-if="selectedDeckStats.empty" class="empty-state-stats">
                    <p>Este mazo aún no tiene registros de **partida**.</p>
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

            <div v-if="showAddDeck" class="modal-content glass-modal fade-in-up">
                <div class="modal-header">
                    <div class="header-indicator"></div>
                    <h3>FORJAR NUEVO MAZO</h3>
                    <button class="close-btn-styled" @click="showAddDeck = false">✕</button>
                </div>
                <div class="magic-form">
                    <div class="input-group">
                        <label>NOMBRE DEL MAZO</label>
                        <input v-model="newDeck.nombre_personalizado" class="magic-input"
                            placeholder="Ej: Atraxa Proliferate" />
                    </div>
                    <div class="input-group">
                        <label>FORMATO</label>
                        <select v-model="newDeck.formato" class="magic-input">
                            <option value="commander">Commander</option>
                            <option value="pauper">Pauper</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>URL DE LA IMAGEN (ARTE)</label>
                        <input v-model="newDeck.image_url" class="magic-input"
                            placeholder="https://art-url.com/image.jpg" />
                    </div>
                    <div class="input-group">
                        <label>URL DE LISTA (Opcional)</label>
                        <input v-model="newDeck.decklist_url" class="magic-input"
                            placeholder="https://moxfield.com/..." />
                    </div>
                    <button @click="createDeck" class="btn-submit-magic" :disabled="isSubmitting">
                        {{ isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR MAZO' }}
                    </button>
                </div>
            </div>

            <div v-if="showEditAvatar" class="modal-content glass-modal fade-in-up">
                <div class="modal-header">
                    <div class="header-indicator"></div>
                    <h3>EDITAR AVATAR</h3>
                    <button class="close-btn-styled" @click="showEditAvatar = false">✕</button>
                </div>
                <div class="avatar-form">
                    <div class="input-group">
                        <label>URL DE LA IMAGEN</label>
                        <input v-model="newAvatarUrl" class="magic-input" placeholder="https://..." />
                    </div>
                    <button @click="updateAvatar" class="btn-submit-magic" :disabled="isSubmitting">GUARDAR
                        CAMBIOS</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Los estilos se mantienen igual que en el código anterior */
.profile-view-root {
    min-height: 100vh;
    color: white;
    padding-bottom: 120px;
    font-family: 'Inter', sans-serif;
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

.brand {
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
    font-size: 0.8rem;
}

.logout-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 700;
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

.rank-subtitle {
    color: #60a5fa;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 0.8rem;
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

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.section-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 50px 0 25px;
}

.section-title {
    font-size: 1.1rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 15px;
    margin-bottom: 15px;
}

.add-deck-btn {
    background: #3b82f6;
    color: white;
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 900;
    font-size: 0.75rem;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
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
    display: block;
    font-weight: 700;
    color: #f1f5f9;
}

.h-format {
    font-size: 0.6rem;
    color: #3b82f6;
    text-transform: uppercase;
    font-weight: 900;
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

.header-indicator {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: #3b82f6;
    box-shadow: 0 0 10px #3b82f6;
}

.header-indicator.stats {
    background: #a855f7;
    box-shadow: 0 0 10px #a855f7;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
}

.modal-header h3 {
    font-size: 0.9rem;
    font-weight: 900;
    letter-spacing: 1px;
    margin: 0;
}

.magic-input {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 14px;
    border-radius: 12px;
    color: white;
    width: 100%;
    margin-bottom: 20px;
    font-family: inherit;
    transition: 0.3s;
}

.magic-input:focus {
    border-color: #3b82f6;
    background: rgba(15, 23, 42, 0.9);
    outline: none;
}

.btn-submit-magic {
    width: 100%;
    padding: 16px;
    background: #3b82f6;
    border-radius: 14px;
    color: white;
    font-weight: 900;
    border: none;
    cursor: pointer;
    letter-spacing: 1px;
}

.close-btn-styled {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 1.2rem;
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

.r-info {
    flex: 1;
}

.r-name {
    display: block;
    font-weight: 800;
}

.r-title {
    font-size: 0.6rem;
    color: #64748b;
    font-weight: 800;
}

.r-count {
    font-weight: 900;
    background: rgba(255, 255, 255, 0.05);
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 0.8rem;
}

.avatar-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    cursor: pointer;
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
    width: 140%;
    height: 140%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
}

.edit-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: 0.3s;
    z-index: 5;
    font-size: 0.65rem;
    font-weight: 900;
}

.avatar-wrapper:hover .edit-overlay {
    opacity: 1;
}

.fade-in-up {
    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.loading-overlay {
    position: fixed;
    inset: 0;
    background: #0f172a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(59, 130, 246, 0.1);
    border-left-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>