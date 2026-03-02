<script setup>
import { ref, onMounted, reactive } from 'vue'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

const profile = ref(null)
const decks = ref([])
const loading = ref(true)
const isSubmitting = ref(false)
const showAddDeck = ref(false)

const stats = reactive({
    totalMatches: 0,
    winRate: 0
})

const newDeck = reactive({
    nombre_personalizado: '',
    formato: 'commander',
    comandante_nombre: '',
    arquetipo_pauper: '',
    image_url: '',
    decklist_url: '',
    colors: []
})

onMounted(async () => {
    try {
        loading.value = true
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            window.location.href = '/login'
            return
        }

        const userId = user.id

        const [profileRes, decksRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('decks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        ])

        if (profileRes.error) throw profileRes.error

        profile.value = profileRes.data
        decks.value = decksRes.data || []
        await fetchStats(userId)

    } catch (err) {
        console.error("Error crítico:", err.message)
    } finally {
        loading.value = false
    }
})

const fetchStats = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('match_participants')
            .select('is_winner')
            .eq('user_id', userId)

        if (error) throw error
        if (data && data.length > 0) {
            const wins = data.filter(p => p.is_winner === true).length
            stats.totalMatches = data.length
            stats.winRate = ((wins / data.length) * 100).toFixed(1)
        }
    } catch (e) {
        console.warn("Error stats:", e.message)
    }
}

const addNewDeck = async () => {
    isSubmitting.value = true
    try {
        const { data: { user } } = await supabase.auth.getUser()
        const colorString = newDeck.colors.sort().join('')

        const { error } = await supabase.from('decks').insert([
            {
                user_id: user.id,
                nombre_personalizado: newDeck.nombre_personalizado,
                formato: newDeck.formato,
                comandante_nombre: newDeck.formato === 'commander' ? newDeck.comandante_nombre : null,
                arquetipo_pauper: newDeck.formato === 'pauper' ? newDeck.arquetipo_pauper : null,
                color_identity: colorString,
                image_url: newDeck.image_url || null,
                decklist_url: newDeck.decklist_url || null,
                is_active: true
            }
        ])

        if (error) throw error

        // Reset y recarga
        Object.assign(newDeck, { nombre_personalizado: '', comandante_nombre: '', arquetipo_pauper: '', image_url: '', decklist_url: '', colors: [] })
        showAddDeck.value = false
        const { data: d } = await supabase.from('decks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        decks.value = d || []

    } catch (err) {
        alert('Error: ' + err.message)
    } finally {
        isSubmitting.value = false
    }
}

const openDecklist = (url) => { if (url) window.open(url, '_blank') }
async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
}
</script>

<template>
    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Invocando tu chispa de Planeswalker...</p>
    </div>

    <div v-else-if="profile" class="profile-view-root">
        <div class="vignette-overlay"></div>

        <div class="relative-content fade-in">
            <header class="profile-main-header">
                <nav class="top-bar">
                    <span class="brand">LILLIANA TRACKER</span>
                    <button @click="handleLogout" class="logout-btn">Cerrar Sesión</button>
                </nav>

                <div class="hero-section">
                    <div class="avatar-wrapper">
                        <div class="avatar-circle">{{ profile.username?.charAt(0).toUpperCase() }}</div>
                        <div class="avatar-glow"></div>
                    </div>
                    <div class="hero-text">
                        <h1 class="username-title">{{ profile.username }}</h1>
                        <p class="rank-subtitle">Planeswalker de Élite</p>
                    </div>
                </div>

                <div class="quick-stats-row">
                    <div class="q-stat">
                        <span class="q-num">{{ decks.length }}</span>
                        <span class="q-label">Grimorios</span>
                    </div>
                    <div class="q-stat">
                        <span class="q-num">{{ stats.totalMatches }}</span>
                        <span class="q-label">Partidas</span>
                    </div>
                    <div class="q-stat">
                        <span class="q-num">{{ stats.winRate }}%</span>
                        <span class="q-label">Win Rate</span>
                    </div>
                </div>
            </header>

            <main class="decks-section">
                <div class="decks-header-bar">
                    <h2 class="section-title">Tus Mazos</h2>
                    <button @click="showAddDeck = true" class="add-deck-btn">+ NUEVO MAZO</button>
                </div>

                <div class="decks-layout-grid">
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck" @click="openDecklist(deck.decklist_url)"
                        class="clickable-deck" />

                    <div v-if="decks.length === 0" class="empty-state-card" @click="showAddDeck = true">
                        <p>Tu grimorio está vacío. Pulsa para forjar un mazo.</p>
                    </div>
                </div>
            </main>
        </div>

        <div v-if="showAddDeck" class="modal-overlay" @click.self="showAddDeck = false">
            <div class="modal-content glass-modal fade-in-up">
                <div class="modal-header">
                    <h3>Nueva Invocación</h3>
                    <button class="close-btn" @click="showAddDeck = false">×</button>
                </div>

                <form @submit.prevent="addNewDeck" class="magic-form">
                    <div class="form-group">
                        <label>Nombre del Mazo</label>
                        <input v-model="newDeck.nombre_personalizado" type="text" placeholder="Ej: Dragones de Liliana"
                            required />
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Formato</label>
                            <select v-model="newDeck.formato">
                                <option value="commander">Commander</option>
                                <option value="pauper">Pauper</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Colores</label>
                            <div class="color-picker">
                                <label v-for="c in ['W', 'U', 'B', 'R', 'G']" :key="c"
                                    :class="['color-dot', c, { active: newDeck.colors.includes(c) }]">
                                    <input type="checkbox" :value="c" v-model="newDeck.colors" hidden /> {{ c }}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group" v-if="newDeck.formato === 'commander'">
                        <label>Comandante</label>
                        <input v-model="newDeck.comandante_nombre" type="text" placeholder="Nombre de la carta"
                            required />
                    </div>

                    <div class="form-group" v-if="newDeck.formato === 'pauper'">
                        <label>Arquetipo Pauper</label>
                        <input v-model="newDeck.arquetipo_pauper" type="text" placeholder="Ej: Burn, Affinity..."
                            required />
                    </div>

                    <div class="form-group">
                        <label>URL Imagen Portada</label>
                        <input v-model="newDeck.image_url" type="url" placeholder="Link directo" />
                    </div>

                    <button type="submit" class="btn-submit-magic" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Sellando Contrato...' : 'Añadir al Grimorio' }}
                    </button>
                </form>
            </div>
        </div>
    </div>

    <div v-else class="error-state">
        <div class="error-icon">⚠️</div>
        <p>No se pudo establecer conexión con el multiverso.</p>
        <button @click="handleLogout" class="logout-btn">Reintentar</button>
    </div>
</template>

<style scoped>
.profile-view-root {
    background: transparent;
    min-height: 100vh;
    color: white;
}

/* Capa para mejorar legibilidad sobre el fondo */
.vignette-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, transparent 20%, rgba(0, 0, 0, 0.5) 100%);
    z-index: 0;
    pointer-events: none;
}

.relative-content {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header y Stats */
.profile-main-header {
    padding: 40px 0;
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
}

.hero-section {
    display: flex;
    align-items: center;
    gap: 30px;
    margin-bottom: 40px;
    flex-wrap: wrap;
}

.avatar-circle {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 900;
    box-shadow: 0 10px 30px rgba(30, 64, 175, 0.4);
}

.username-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    margin: 0;
    letter-spacing: -2px;
}

.rank-subtitle {
    color: #60a5fa;
    font-weight: bold;
}

.quick-stats-row {
    display: flex;
    gap: 20px;
    padding: 25px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
    font-size: 0.7rem;
    color: #64748b;
    text-transform: uppercase;
}

/* Grid de Mazos */
.decks-section {
    padding-bottom: 100px;
}

.decks-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 40px 0 20px;
}

.add-deck-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 900;
    cursor: pointer;
}

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.empty-state-card {
    grid-column: 1 / -1;
    padding: 60px;
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    text-align: center;
    color: #64748b;
    cursor: pointer;
}

/* Modal Glassmorphism */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

.glass-modal {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 30px;
    border-radius: 24px;
    width: 100%;
    max-width: 500px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
}

.close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
}

.magic-form .form-group {
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.magic-form label {
    font-size: 0.7rem;
    color: #60a5fa;
    font-weight: bold;
    text-transform: uppercase;
}

.magic-form input,
.magic-form select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 10px;
    color: white;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

/* Color Picker */
.color-picker {
    display: flex;
    gap: 5px;
}

.color-dot {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    cursor: pointer;
    background: #475569;
    opacity: 0.4;
    transition: 0.3s;
    color: black;
    font-weight: bold;
}

.color-dot.active {
    opacity: 1;
    transform: scale(1.1);
    box-shadow: 0 0 10px white;
}

.color-dot.W {
    background: #fff;
}

.color-dot.U {
    background: #3b82f6;
    color: white;
}

.color-dot.B {
    background: #111827;
    color: white;
}

.color-dot.R {
    background: #ef4444;
    color: white;
}

.color-dot.G {
    background: #22c55e;
    color: white;
}

.btn-submit-magic {
    width: 100%;
    padding: 15px;
    background: #3b82f6;
    border: none;
    border-radius: 12px;
    color: white;
    font-weight: 800;
    cursor: pointer;
    margin-top: 10px;
}

/* Loading Spinner */
.loading-overlay {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>