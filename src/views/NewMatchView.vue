<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const winnerIndex = ref(0)
const currentUser = ref(null)
const userDecks = ref([])

// Estado para búsqueda de contrincantes
const searchResults = ref([[], [], [], []])
const opponentDecks = ref([[], [], [], []])

const form = ref({
    formato: 'commander',
    notas: ''
})

const participants = ref([
    { name: '', deck_name: '', deck_id: null, user_id: null },
    { name: '', deck_name: '', deck_id: null, user_id: null },
    { name: '', deck_name: '', deck_id: null, user_id: null },
    { name: '', deck_name: '', deck_id: null, user_id: null }
])

const visibleParticipantsCount = computed(() => form.value.formato === 'commander' ? 4 : 2)
const filteredDecks = computed(() => userDecks.value.filter(d => d.formato === form.value.formato))

onMounted(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        const { data: profile } = await supabase.from('profiles').select('username, id').eq('id', session.user.id).single()
        if (profile) {
            currentUser.value = profile
            participants.value[0].name = profile.username
            participants.value[0].user_id = profile.id
        }
        const { data: decks } = await supabase.from('decks').select('*').eq('user_id', session.user.id).eq('is_active', true)
        if (decks) userDecks.value = decks
    }
})

async function searchPlayers(index) {
    const term = participants.value[index].name
    if (term.length < 3) {
        searchResults.value[index] = []
        return
    }
    const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${term}%`)
        .neq('id', currentUser.value?.id)
        .limit(5)
    searchResults.value[index] = data || []
}

async function selectPlayer(index, profile) {
    participants.value[index].name = profile.username
    participants.value[index].user_id = profile.id
    searchResults.value[index] = []

    const { data: decks } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', profile.id)
        .eq('formato', form.value.formato)
        .eq('is_active', true)

    opponentDecks.value[index] = decks || []
}

function onDeckSelect(index, isOpponent = false) {
    const deckSource = isOpponent ? opponentDecks.value[index] : userDecks.value
    const selected = deckSource.find(d => d.id === participants.value[index].deck_id)
    if (selected) {
        participants.value[index].deck_name = selected.comandante_nombre || selected.nombre_personalizado || selected.arquetipo_pauper
    } else if (participants.value[index].deck_id !== 'manual') {
        participants.value[index].deck_name = ''
    }
}

function changeFormat(newFormat) {
    form.value.formato = newFormat
    winnerIndex.value = 0
    opponentDecks.value = [[], [], [], []]
    participants.value.forEach((p, idx) => {
        if (idx !== 0) {
            p.name = ''
            p.user_id = null
        }
        p.deck_id = null
        p.deck_name = ''
    })
}

async function saveMatch() {
    if (loading.value) return
    const activeParticipants = participants.value
        .slice(0, visibleParticipantsCount.value)
        .filter(p => p.deck_name.trim() !== '' || p.deck_id !== null)

    if (activeParticipants.length < 2) {
        alert("Una partida debe tener al menos 2 jugadores con mazo.")
        return
    }

    loading.value = true
    try {
        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert([{
                creator_id: currentUser.value.id,
                formato: form.value.formato,
                notas_globales: form.value.notas,
                is_public: true
            }])
            .select().single()

        if (matchError) throw matchError

        const toSave = activeParticipants.map((p, index) => ({
            match_id: matchData.id,
            user_id: p.user_id,
            player_name_manual: p.name || 'Otro',
            deck_id: p.deck_id && p.deck_id !== 'manual' ? p.deck_id : null,
            deck_name_manual: p.deck_name || 'Mazo desconocido',
            is_winner: index === winnerIndex.value,
            puesto: index === winnerIndex.value ? 1 : 2
        }))

        const { error: partError } = await supabase.from('match_participants').insert(toSave)
        if (partError) throw partError
        router.push('/historial')
    } catch (error) {
        alert(error.message)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="app-container fade-in">
        <header class="header-section">
            <div class="title-meta">
                <span class="top-badge">GESTIÓN DE PARTIDAS</span>
                <h2 class="hero-title">Registro de Partida</h2>
            </div>
            <button @click="saveMatch" class="save-trigger" :disabled="loading" :class="form.formato">
                <span v-if="!loading" class="btn-flex">
                    <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>GUARDAR</span>
                </span>
                <div v-else class="loader-dot"></div>
            </button>
        </header>

        <nav class="selector-nav">
            <button :class="{ active: form.formato === 'commander' }" @click="changeFormat('commander')"
                class="nav-item">👑 Commander</button>
            <button :class="{ active: form.formato === 'pauper' }" @click="changeFormat('pauper')" class="nav-item">🃏
                Pauper</button>
        </nav>

        <form @submit.prevent="saveMatch" class="main-form">
            <transition-group name="grid-anim" tag="div" class="dynamic-grid">
                <div v-for="(n, index) in visibleParticipantsCount" :key="index" class="match-card"
                    :class="{ 'winner-border': winnerIndex === index }">

                    <div class="card-top">
                        <span class="label-accent">JUGADOR {{ index + 1 }}</span>
                        <button type="button" @click="winnerIndex = index" class="status-pill"
                            :class="{ 'is-win': winnerIndex === index }">
                            {{ winnerIndex === index ? '🏆 VICTORIA' : 'Marcar Ganador' }}
                        </button>
                    </div>

                    <div class="card-inputs">
                        <div class="field-box relative">
                            <label class="field-label">NOMBRE DEL JUGADOR</label>
                            <input v-model="participants[index].name" @input="index !== 0 && searchPlayers(index)"
                                placeholder="Escribe un nombre..." class="clean-input"
                                :disabled="index === 0 && currentUser" />

                            <div v-if="searchResults[index]?.length > 0" class="autocomplete-dropdown">
                                <div v-for="user in searchResults[index]" :key="user.id"
                                    @click="selectPlayer(index, user)" class="dropdown-item">
                                    @{{ user.username }}
                                </div>
                            </div>
                        </div>

                        <div class="field-box">
                            <label class="field-label">MAZO UTILIZADO</label>

                            <select v-if="index === 0" v-model="participants[index].deck_id"
                                @change="onDeckSelect(index)" class="clean-select">
                                <option :value="null">Selecciona tu mazo...</option>
                                <option v-for="deck in filteredDecks" :key="deck.id" :value="deck.id">
                                    {{ deck.nombre_personalizado || deck.comandante_nombre || deck.arquetipo_pauper }}
                                </option>
                                <option value="manual">Mazo no registrado</option>
                            </select>

                            <select v-else-if="participants[index].user_id && opponentDecks[index].length > 0"
                                v-model="participants[index].deck_id" @change="onDeckSelect(index, true)"
                                class="clean-select">
                                <option :value="null">Selecciona mazo de @{{ participants[index].name }}</option>
                                <option v-for="deck in opponentDecks[index]" :key="deck.id" :value="deck.id">
                                    {{ deck.comandante_nombre || deck.nombre_personalizado || deck.arquetipo_pauper }}
                                </option>
                                <option value="manual">Otro mazo...</option>
                            </select>

                            <input
                                v-if="(index !== 0 && !participants[index].user_id) || participants[index].deck_id === 'manual' || (participants[index].user_id && opponentDecks[index].length === 0)"
                                v-model="participants[index].deck_name"
                                :placeholder="form.formato === 'commander' ? 'Nombre del Comandante...' : 'Arquetipo...'"
                                class="clean-input"
                                :class="{ 'mt-10': index === 0 || (participants[index].user_id && opponentDecks[index].length > 0) }" />
                        </div>
                    </div>
                </div>
            </transition-group>

            <section class="notes-section">
                <label class="field-label">CRÓNICA Y NOTAS ADICIONALES</label>
                <textarea v-model="form.notas" placeholder="¿Cómo terminó la partida?..." class="clean-area"></textarea>
            </section>
        </form>
    </div>
</template>

<style scoped>
.app-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 20px;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 50px;
}

.hero-title {
    color: #ffffff;
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -1px;
    margin-top: 8px;
}

.top-badge {
    font-size: 0.75rem;
    font-weight: 700;
    color: #6366f1;
    letter-spacing: 2px;
    text-transform: uppercase;
}

.save-trigger {
    padding: 14px 28px;
    border-radius: 12px;
    border: none;
    color: white;
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.2, 1, 0.3, 1);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.save-trigger.commander {
    background: #3b82f6;
}

.save-trigger.pauper {
    background: #10b981;
}

.save-trigger:hover {
    transform: translateY(-3px) scale(1.02);
    filter: brightness(1.1);
}

.btn-flex {
    display: flex;
    align-items: center;
    gap: 10px;
}

.svg-icon {
    width: 18px;
    height: 18px;
}

.selector-nav {
    display: flex;
    gap: 15px;
    margin-bottom: 40px;
}

.nav-item {
    padding: 14px 24px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    color: #94a3b8;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
}

.nav-item.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: #6366f1;
    color: white;
}

.dynamic-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
    margin-bottom: 40px;
    position: relative;
}

.match-card {
    background: rgba(140, 162, 197, 0.08);
    border-radius: 20px;
    padding: 24px;
    border: 1px solid transparent;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.winner-border {
    border-color: #fbbf24;
    background: rgba(207, 187, 9, 0.07);
    box-shadow: 0 20px 40px -15px rgba(251, 191, 36, 0.1);
}

.card-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 25px;
}

.label-accent {
    font-size: 0.7rem;
    font-weight: 800;
    color: #475569;
}

.status-pill {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 0.65rem;
    font-weight: 900;
    border: 1px solid #334155;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: 0.2s;
}

.status-pill.is-win {
    background: #fbbf24;
    color: #000;
    border-color: #fbbf24;
}

.field-box {
    margin-bottom: 20px;
}

.relative {
    position: relative;
}

.field-label {
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 1px;
    margin-bottom: 10px;
}

.clean-input,
.clean-select,
.clean-area {
    width: 100%;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 12px 16px;
    color: #f1f5f9;
    font-size: 0.9rem;
    transition: 0.2s;
}

.clean-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

/* AUTOCOMPLETADO */
.autocomplete-dropdown {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    right: 0;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    z-index: 110;
    overflow: hidden;
    box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.6);
}

.dropdown-item {
    padding: 12px 16px;
    font-size: 0.85rem;
    cursor: pointer;
    color: #cbd5e1;
    transition: 0.2s;
}

.dropdown-item:hover {
    background: #334155;
    color: #60a5fa;
}

.mt-10 {
    margin-top: 10px;
}

.notes-section {
    padding: 30px;
    background: rgba(15, 23, 42, 0.5);
    border-radius: 20px;
}

.clean-area {
    height: 120px;
    line-height: 1.6;
    resize: none;
}

/* ANIMACIONES SNAPPY RESTAURADAS */
.grid-anim-move {
    transition: transform 0.4s ease;
}

.grid-anim-enter-active {
    transition: all 0.4s ease-out;
}

.grid-anim-leave-active {
    transition: all 0.3s ease-in;
    position: absolute;
    width: calc(50% - 15px);
    /* Ajuste dinámico para el grid */
    z-index: 0;
}

.grid-anim-enter-from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
}

.grid-anim-leave-to {
    opacity: 0;
    transform: scale(0.8) translateY(-20px);
}

.fade-in {
    animation: fadeIn 0.5s ease-out;
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

@media (max-width: 768px) {
    .header-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
    }

    .dynamic-grid {
        grid-template-columns: 1fr;
    }

    .grid-anim-leave-active {
        width: 100%;
    }
}
</style>