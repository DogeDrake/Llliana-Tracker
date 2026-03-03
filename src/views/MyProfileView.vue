<script setup>
import { ref, onMounted, reactive } from 'vue'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

// --- ESTADOS ---
const profile = ref(null)
const decks = ref([])
const loading = ref(true)
const isSubmitting = ref(false)
const showAddDeck = ref(false)
const showEditAvatar = ref(false)
const newAvatarUrl = ref('') // Estado para la nueva URL

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

        // Inicializamos el input con la url actual
        newAvatarUrl.value = profile.value.avatar_url || ''

        await fetchStats(user.id, profile.value.username)

    } catch (err) {
        console.error("Error crítico:", err.message)
    } finally {
        loading.value = false
    }
})

const fetchStats = async (userId, username) => {
    try {
        const { data, error } = await supabase
            .from('match_participants')
            .select('is_winner')
            .or(`user_id.eq.${userId},player_name_manual.ilike.${username}`)

        if (error) throw error
        if (data && data.length > 0) {
            const total = data.length
            const wins = data.filter(p => p.is_winner === true).length
            stats.totalMatches = total
            stats.winRate = ((wins / total) * 100).toFixed(1)
        }
    } catch (e) {
        console.warn("Error stats:", e.message)
    }
}

// --- FUNCIÓN DE ACTUALIZACIÓN DINÁMICA ---
const updateAvatar = async () => {
    if (!newAvatarUrl.value) return
    isSubmitting.value = true

    try {
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: newAvatarUrl.value })
            .eq('id', user.id) // Dinámico por ID de sesión

        if (error) throw error

        // Actualización reactiva local
        profile.value.avatar_url = newAvatarUrl.value
        showEditAvatar.value = false

    } catch (err) {
        alert('Error al actualizar: ' + err.message)
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
                        <div v-else class="avatar-circle">
                            {{ profile.username?.charAt(0).toUpperCase() }}
                        </div>
                        <div class="avatar-glow"></div>
                        <div class="edit-overlay"><span>CAMBIAR</span></div>
                    </div>
                    <div class="hero-text">
                        <h1 class="username-title">{{ profile.username }}</h1>
                        <p class="rank-subtitle">Planeswalker de Élite</p>
                    </div>
                </div>

                <div class="quick-stats-row">
                    <div class="q-stat">
                        <span class="q-num">{{ decks.length }}</span>
                        <span class="q-label">Mazos</span>
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
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck"
                        @click="openDecklist(deck.decklist_url)" />
                </div>
            </main>
        </div>

        <div v-if="showEditAvatar" class="modal-overlay" @click.self="showEditAvatar = false">
            <div class="modal-content glass-modal fade-in-up">
                <div class="modal-header">
                    <h3>Editar Avatar</h3>
                    <button class="close-btn-styled" @click="showEditAvatar = false">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2"
                            fill="none">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="avatar-form">
                    <div class="input-group">
                        <label>URL de la imagen</label>
                        <input v-model="newAvatarUrl" type="text" placeholder="Pega aquí el enlace de tu imagen..."
                            class="magic-input" />
                    </div>

                    <div class="preview-mini" v-if="newAvatarUrl">
                        <p>Previsualización:</p>
                        <img :src="newAvatarUrl" class="mini-img" @error="newAvatarUrl = ''" />
                    </div>

                    <button @click="updateAvatar" class="btn-submit-magic" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Guardando...' : 'Actualizar Imagen' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* (Se mantienen tus estilos anteriores y añadimos los nuevos) */
.profile-view-root {
    min-height: 100vh;
    color: white;
    background: transparent;
}

.relative-content {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px;
}

/* Avatar */
.avatar-wrapper {
    position: relative;
    cursor: pointer;
    transition: 0.3s;
    width: 120px;
    height: 120px;
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
    z-index: 2;
    position: relative;
}

.edit-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    z-index: 4;
    transition: 0.3s;
    font-size: 0.7rem;
    font-weight: 900;
}

.avatar-wrapper:hover .edit-overlay {
    opacity: 1;
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

/* Modal & Styled X */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
}

.close-btn-styled {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.2s;
}

.close-btn-styled:hover {
    background: #ef4444;
    transform: rotate(90deg);
}

.avatar-form {
    text-align: left;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
}

.input-group label {
    font-size: 0.8rem;
    color: #60a5fa;
    font-weight: bold;
    text-transform: uppercase;
}

.magic-input {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 12px;
    border-radius: 12px;
    color: white;
    outline: none;
    width: 100%;
}

.magic-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
}

.preview-mini {
    margin-bottom: 20px;
    text-align: center;
}

.preview-mini p {
    font-size: 0.7rem;
    color: #94a3b8;
    margin-bottom: 10px;
}

.mini-img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #3b82f6;
}

/* (Resto de estilos previos...) */
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
}

.username-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    margin: 0;
    font-weight: 900;
}

.rank-subtitle {
    color: #60a5fa;
    font-weight: bold;
}

.quick-stats-row {
    display: flex;
    gap: 20px;
    padding: 30px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.q-stat {
    flex: 1;
    text-align: center;
}

.q-num {
    display: block;
    font-size: 2.2rem;
    font-weight: 900;
    color: #3b82f6;
}

.q-label {
    font-size: 0.7rem;
    color: #64748b;
    text-transform: uppercase;
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
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 900;
    border: none;
    cursor: pointer;
}

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.glass-modal {
    background: #1e293b;
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 40px;
    border-radius: 24px;
    width: 100%;
    max-width: 400px;
    text-align: center;
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
}

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
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.fade-in {
    animation: fadeIn 0.5s ease;
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