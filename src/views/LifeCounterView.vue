<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- ESTADO GLOBAL ---
const gameStarted = ref(false)
const gameOver = ref(false)
const winner = ref(null)
const format = ref('commander')
const numPlayers = ref(4)
const startingLife = ref(40)
const currentPlayerIndex = ref(0)
const isShuffling = ref(false)
const activeCommanderPanel = ref(null)
const loading = ref(false)
const currentUser = ref(null)

// --- CONFIGURACIÓN DE JUGADORES (Setup) ---
// Estructura alineada con tu DB
const setupPlayers = ref([
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] }
])

const players = ref([])

// --- CARGA INICIAL (Usuario actual) ---
onMounted(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        const { data: profile } = await supabase.from('profiles').select('username, id').eq('id', session.user.id).single()
        if (profile) {
            currentUser.value = profile
            setupPlayers.value[0].name = profile.username
            setupPlayers.value[0].user_id = profile.id
            // Cargar mazos del usuario principal
            loadPlayerDecks(0, profile.id)
        }
    }
})

// --- LÓGICA DE BÚSQUEDA Y MAZOS ---
async function handleSearch(index) {
    const term = setupPlayers.value[index].name
    if (term.length < 3) {
        setupPlayers.value[index].suggestions = []
        return
    }
    const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${term}%`)
        .limit(5)

    setupPlayers.value[index].suggestions = data || []
}

async function selectPlayer(index, profile) {
    setupPlayers.value[index].name = profile.username
    setupPlayers.value[index].user_id = profile.id
    setupPlayers.value[index].suggestions = []
    loadPlayerDecks(index, profile.id)
}

async function loadPlayerDecks(index, userId) {
    const { data } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', userId)
        .eq('formato', format.value)
        .eq('is_active', true)

    setupPlayers.value[index].decks = data || []
}

function onDeckSelect(index) {
    const p = setupPlayers.value[index]
    const selected = p.decks.find(d => d.id === p.deck_id)
    if (selected) {
        p.deck_name = selected.comandante_nombre || selected.nombre_personalizado || selected.arquetipo_pauper
    }
}

// --- GESTIÓN DE LA PARTIDA ---
const getPlayerColor = (i) => ['#b91c1c', '#1d4ed8', '#047857', '#b45309'][i]

const startGame = () => {
    players.value = setupPlayers.value.slice(0, numPlayers.value).map((p, i) => ({
        id: i + 1,
        user_id: p.user_id,
        deck_id: p.deck_id,
        name: p.name || `Jugador ${i + 1}`,
        deck_name: p.deck_name || (format.value === 'commander' ? 'Comandante Desconocido' : 'Mazo Desconocido'),
        life: startingLife.value,
        poison: 0,
        tax: 0,
        isMonarch: false,
        commanderDamage: {},
        color: getPlayerColor(i),
        dead: false,
        puesto: null
    }))

    gameStarted.value = true
    gameOver.value = false
    winner.value = null
    runShuffleAnimation()
}

// (Lógica de turnos y daño se mantiene igual para agilidad del counter)
const runShuffleAnimation = () => {
    isShuffling.value = true
    let count = 0
    const interval = setInterval(() => {
        currentPlayerIndex.value = Math.floor(Math.random() * numPlayers.value)
        count++
        if (count > 15) { clearInterval(interval); isShuffling.value = false }
    }, 100)
}

const updateLife = (index, amount) => {
    players.value[index].life += amount
    checkDeath(index)
}

const checkDeath = (index) => {
    const p = players.value[index]
    if (p.dead) return
    const cmdrLoss = Object.values(p.commanderDamage).some(d => d >= 21)
    if (p.life <= 0 || p.poison >= 10 || (format.value === 'commander' && cmdrLoss)) {
        p.dead = true
        const aliveCount = players.value.filter(pl => !pl.dead).length
        p.puesto = aliveCount + 1
        checkWinner()
    }
}

const checkWinner = () => {
    const survivors = players.value.filter(p => !p.dead)
    if (survivors.length === 1 && gameStarted.value) {
        winner.value = survivors[0]
        winner.value.puesto = 1
        gameOver.value = true
        saveMatch() // Guardado automático al detectar ganador
    }
}

// --- PERSISTENCIA REAL ---
const saveMatch = async () => {
    if (loading.value) return
    loading.value = true
    try {
        // 1. Crear la partida
        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert([{
                creator_id: currentUser.value?.id,
                formato: format.value,
                is_public: true
            }])
            .select().single()

        if (matchError) throw matchError

        // 2. Preparar participantes con los datos finales del counter
        const participantsToSave = players.value.map(p => ({
            match_id: matchData.id,
            user_id: p.user_id,
            player_name_manual: p.name,
            deck_id: p.deck_id,
            deck_name_manual: p.deck_name,
            is_winner: p.puesto === 1,
            puesto: p.puesto || 1
        }))

        const { error: partError } = await supabase.from('match_participants').insert(participantsToSave)
        if (partError) throw partError

        console.log("Partida guardada con éxito")
    } catch (error) {
        alert("Error guardando partida: " + error.message)
    } finally {
        loading.value = false
    }
}

const resetGame = () => {
    if (confirm("¿Finalizar partida actual y volver al menú?")) {
        gameStarted.value = false
        gameOver.value = false
    }
}
</script>

<template>
    <div class="life-counter-root">
        <div v-if="!gameStarted" class="setup-screen scrollable">
            <div class="setup-container">
                <h1 class="setup-title">LILLIANA TRACKER</h1>
                <div class="setup-box">
                    <p class="section-label">Formato y Vida</p>
                    <div class="selector-row">
                        <button @click="format = 'commander'; startingLife = 40"
                            :class="{ active: format === 'commander' }">Commander</button>
                        <button @click="format = 'pauper'; startingLife = 20"
                            :class="{ active: format === 'pauper' }">Pauper</button>
                    </div>

                    <p class="section-label">Jugadores</p>
                    <div class="selector-row">
                        <button v-for="n in [2, 3, 4]" :key="n" @click="numPlayers = n"
                            :class="{ active: numPlayers === n }">{{ n }}</button>
                    </div>

                    <hr class="setup-divider" />

                    <div class="players-setup-list">
                        <div v-for="i in numPlayers" :key="i" class="player-setup-row">
                            <span class="p-num">P{{ i }}</span>
                            <div class="input-group">
                                <div class="autocomplete-wrapper">
                                    <input type="text" v-model="setupPlayers[i - 1].name" @input="handleSearch(i - 1)"
                                        placeholder="Buscar jugador..." :disabled="i === 1 && currentUser" />

                                    <ul v-if="setupPlayers[i - 1].suggestions.length > 0" class="suggestions-list">
                                        <li v-for="sug in setupPlayers[i - 1].suggestions" :key="sug.id"
                                            @click="selectPlayer(i - 1, sug)">
                                            @{{ sug.username }}
                                        </li>
                                    </ul>
                                </div>

                                <select v-if="setupPlayers[i - 1].decks.length > 0"
                                    v-model="setupPlayers[i - 1].deck_id" @change="onDeckSelect(i - 1)"
                                    class="setup-select">
                                    <option :value="null">Seleccionar mazo...</option>
                                    <option v-for="deck in setupPlayers[i - 1].decks" :key="deck.id" :value="deck.id">
                                        {{ deck.nombre_personalizado || deck.comandante_nombre }}
                                    </option>
                                    <option value="manual">Otro mazo...</option>
                                </select>
                                <input v-else type="text" v-model="setupPlayers[i - 1].deck_name"
                                    placeholder="Nombre del mazo..." />
                            </div>
                        </div>
                    </div>

                    <button class="start-btn" @click="startGame">EMPEZAR PARTIDA</button>
                </div>
            </div>
        </div>

        <div v-else class="game-board" :class="`players-${numPlayers}`">
            <div v-for="(player, index) in players" :key="player.id" class="player-zone"
                :style="{ '--player-color': !player.dead ? player.color : '#111' }"
                :class="{ 'is-dead': player.dead, 'is-current-turn': currentPlayerIndex === index && !gameOver }">

                <div class="inner-content-rotator">
                    <div class="interaction-layer">
                        <div class="hitbox minus" @click="updateLife(index, -1)"><span>−</span></div>
                        <div class="hitbox plus" @click="updateLife(index, 1)"><span>+</span></div>
                    </div>

                    <div class="interface-layer">
                        <div class="life-center">
                            <div class="p-info-group">
                                <span class="p-tag">{{ player.name }}</span>
                                <span class="p-extra">{{ player.deck_name }}</span>
                            </div>
                            <span v-if="!player.dead" class="p-life">{{ player.life }}</span>
                            <span v-else class="p-death-msg">ELIMINADO</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="center-hub" v-if="!gameOver">
                <button class="hub-btn pass-btn"
                    @click="currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers">⏭️</button>
                <button class="hub-btn menu-btn" @click="resetGame">⚙️</button>
            </div>

            <div v-if="gameOver" class="victory-overlay">
                <div class="victory-box">
                    <h2>👑 ¡VICTORIA! 👑</h2>
                    <h1 :style="{ color: winner.color }">{{ winner.name }}</h1>
                    <p class="db-msg" v-if="!loading">✓ Partida sincronizada</p>
                    <p v-else>Guardando en la nube...</p>
                    <button class="start-btn" @click="gameStarted = false">VOLVER AL MENÚ</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.life-counter-root {
    width: 100dvw;
    height: 100dvh;
    background: #000;
    color: #fff;
    overflow: hidden;
    position: fixed;
    inset: 0;
    font-family: system-ui, -apple-system, sans-serif;
}

/* --- ESTILOS DEL SETUP --- */
.setup-screen {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
}

.setup-screen.scrollable {
    overflow-y: auto;
    padding: 20px 0;
}

.setup-box {
    background: rgba(255, 255, 255, 0.05);
    padding: 24px;
    border-radius: 24px;
    width: 320px;
    text-align: center;
    max-width: 90vw;
}

.section-label {
    margin: 16px 0 8px 0;
    font-size: 0.8rem;
    font-weight: bold;
    color: #94a3b8;
    text-transform: uppercase;
}

.selector-row {
    display: flex;
    gap: 8px;
}

.selector-row button {
    flex: 1;
    padding: 12px;
    border-radius: 10px;
    border: none;
    background: #1e293b;
    color: white;
    font-weight: 800;
    transition: background 0.2s;
}

.selector-row button.active {
    background: #3b82f6;
}

.setup-divider {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 24px 0;
}

.players-setup-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.player-setup-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.p-num {
    font-weight: 900;
    color: #475569;
    width: 24px;
}

.input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.input-group input {
    width: 100%;
    background: #1e293b;
    border: 1px solid #334155;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    box-sizing: border-box;
}

.input-group input:focus {
    outline: none;
    border-color: #3b82f6;
}

.autocomplete-wrapper {
    position: relative;
    width: 100%;
}

.suggestions-list {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: #1e293b;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    margin: 4px 0 0 0;
    padding: 0;
    list-style: none;
    z-index: 1000;
    max-height: 120px;
    overflow-y: auto;
}

.suggestions-list li {
    padding: 8px 12px;
    text-align: left;
    cursor: pointer;
    font-size: 0.9rem;
}

.suggestions-list li:hover {
    background: #3b82f6;
}

.start-btn {
    width: 100%;
    margin-top: 24px;
    padding: 16px;
    border-radius: 12px;
    background: #3b82f6;
    border: none;
    color: white;
    font-weight: 900;
}

/* --- TABLERO Y PANTALLA DE VICTORIA --- */
.game-board {
    display: grid;
    width: 100%;
    height: 100%;
    position: relative;
}

.players-2 {
    grid-template-rows: 1fr 1fr;
}

.players-3,
.players-4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
}

.players-3 .player-zone:first-child {
    grid-column: span 2;
}

.player-zone {
    position: relative;
    background: var(--player-color);
    overflow: hidden;
    border: 0.5px solid rgba(0, 0, 0, 0.2);
    transition: filter 0.2s ease;
}

.inner-content-rotator {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
}

@media (orientation: portrait) {

    .players-4 .player-zone:nth-child(1) .inner-content-rotator,
    .players-4 .player-zone:nth-child(3) .inner-content-rotator,
    .players-3 .player-zone:nth-child(2) .inner-content-rotator {
        width: 50dvh;
        height: 50dvw;
        transform: translate(-50%, -50%) rotate(90deg);
    }

    .players-4 .player-zone:nth-child(2) .inner-content-rotator,
    .players-4 .player-zone:nth-child(4) .inner-content-rotator,
    .players-3 .player-zone:nth-child(3) .inner-content-rotator {
        width: 50dvh;
        height: 50dvw;
        transform: translate(-50%, -50%) rotate(-90deg);
    }

    .players-2 .player-zone:first-child .inner-content-rotator,
    .players-3 .player-zone:first-child .inner-content-rotator {
        transform: translate(-50%, -50%) rotate(180deg);
    }
}

@media (orientation: landscape) {

    .players-4 .player-zone:nth-child(1) .inner-content-rotator,
    .players-4 .player-zone:nth-child(2) .inner-content-rotator,
    .players-2 .player-zone:first-child .inner-content-rotator,
    .players-3 .player-zone:first-child .inner-content-rotator {
        transform: translate(-50%, -50%) rotate(180deg);
    }
}

.interface-layer {
    position: relative;
    z-index: 10;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 12px;
    pointer-events: none;
    box-sizing: border-box;
}

.top-nav {
    display: flex;
    justify-content: space-between;
    pointer-events: auto;
    margin: 0 20px;
}

.status-pills {
    display: flex;
    gap: 4px;
}

.pill {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: 8px;
    padding: 6px 8px;
    font-weight: 800;
    font-size: 0.75rem;
    backdrop-filter: blur(8px);
}

.monarch-pill.active {
    background: #eab308;
    color: #000;
    border-color: #fff;
}

.life-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
}

.p-info-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: -10px;
}

.p-tag {
    font-size: 0.7rem;
    font-weight: 900;
    opacity: 0.4;
    letter-spacing: 2px;
}

.p-extra {
    font-size: 0.6rem;
    opacity: 0.6;
    font-style: italic;
}

.p-life {
    font-size: clamp(2.5rem, 15vh, 9rem);
    font-weight: 900;
    line-height: 1;
}

.public-commander-damage {
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.mini-damage-pill {
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    border-left: 3px solid transparent;
    backdrop-filter: blur(4px);
}

.interaction-layer {
    position: absolute;
    inset: 0;
    display: flex;
    z-index: 5;
}

.hitbox {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
}

.is-dead {
    filter: grayscale(1) brightness(0.2);
}

.danger {
    color: #ff4444;
    text-shadow: 0 0 10px rgba(255, 68, 68, 0.4);
}

.cmd-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.96);
    z-index: 50;
    display: flex;
    flex-direction: column;
    padding: 6px;
    box-sizing: border-box;
}

.cmd-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 6px;
    height: 24px;
    pointer-events: auto;
}

.cmd-header span {
    font-weight: 900;
    font-size: 0.6rem;
    text-transform: uppercase;
    opacity: 0.6;
}

.close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #fff;
    width: 26px;
    height: 26px;
    border-radius: 50%;
}

.cmd-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
    pointer-events: auto;
}

.cmd-row {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    padding: 0 10px;
    border-radius: 8px;
}

.cmd-divider {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 2px 0;
}

.cmd-actions {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.cmd-actions button {
    width: clamp(30px, 7vh, 45px);
    height: clamp(30px, 7vh, 45px);
    border-radius: 8px;
    border: none;
    font-weight: 900;
    background: #fff;
    color: #000;
}

.cmd-value {
    font-weight: 900;
    font-size: 1.1rem;
    min-width: 40px;
    text-align: center;
}

.opp-indicator {
    width: 6px;
    height: 60%;
    border-radius: 3px;
}

.center-hub {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 8px;
    background: rgba(0, 0, 0, 0.7);
    padding: 6px;
    border-radius: 30px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 100;
    backdrop-filter: blur(10px);
}

.hub-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    cursor: pointer;
    transition: transform 0.1s ease;
}

.hub-btn:active {
    transform: scale(0.9);
}

.pass-btn {
    background: #fff;
    color: #000;
    font-weight: bold;
    font-size: 1.5rem;
}

.menu-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
}

.is-current-turn {
    z-index: 20;
    box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.8);
    animation: pulse-turn 2s infinite ease-in-out;
}

@keyframes pulse-turn {

    0%,
    100% {
        box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.3);
    }

    50% {
        box-shadow: inset 0 0 0 8px rgba(255, 255, 255, 0.8);
    }
}

.is-shuffling {
    filter: brightness(1.5) saturate(1.5);
    box-shadow: inset 0 0 0 6px #fff;
}

.turn-indicator-label {
    position: absolute;
    top: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    color: #000;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.65rem;
    font-weight: 900;
    letter-spacing: 1px;
    z-index: 30;
    pointer-events: none;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.p-death-msg button {
    margin-top: 10px;
    padding: 8px 16px;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 8px;
    font-weight: 900;
    cursor: pointer;
    display: block;
}

/* OVERLAY DE VICTORIA */
.victory-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
}

.victory-box {
    background: #1e293b;
    padding: 30px;
    border-radius: 20px;
    text-align: center;
    border: 2px solid #3b82f6;
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.victory-box h1 {
    font-size: 3rem;
    margin: 10px 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.db-msg {
    color: #4ade80;
    font-size: 0.8rem;
    margin-bottom: 20px;
}

@keyframes popIn {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.user-input {
    border-left: 3px solid #3b82f6 !important;
    font-weight: bold;
}

.deck-input {
    font-size: 0.8rem;
    opacity: 0.8;
}

.suggestions {
    position: absolute;
    width: 100%;
    background: #1e293b;
    border: 1px solid #3b82f6;
    z-index: 100;
    list-style: none;
    padding: 0;
    margin: 0;
    border-radius: 0 0 8px 8px;
}

.suggestions li {
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid #334155;
}

.suggestions li:hover {
    background: #3b82f6;
}

.victory-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.autocomplete-wrapper {
    position: relative;
    width: 100%;
}

.suggestions-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #222;
    border: 1px solid #444;
    z-index: 100;
    list-style: none;
    padding: 0;
    margin: 0;
    border-radius: 0 0 8px 8px;
}

.suggestions-list li {
    padding: 10px;
    border-bottom: 1px solid #333;
    color: white;
    cursor: pointer;
}

.setup-select {
    width: 100%;
    padding: 8px;
    background: #111;
    color: white;
    border: 1px solid #444;
    border-radius: 4px;
    margin-top: 5px;
}
</style>