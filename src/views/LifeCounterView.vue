<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- WAKE LOCK ---
const wakeLock = ref(null);

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock.value = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.error(`Error Wake Lock: ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock.value !== null) {
        wakeLock.value.release();
        wakeLock.value = null;
    }
}

const handleVisibilityChange = async () => {
    if (wakeLock.value !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
}

onMounted(() => { document.addEventListener('visibilitychange', handleVisibilityChange); })
onUnmounted(() => { document.removeEventListener('visibilitychange', handleVisibilityChange); releaseWakeLock(); });

// --- ESTADO GLOBAL ---
const gameStarted = ref(false)
const gameOver = ref(false)
const winner = ref(null)
const format = ref('commander')
const numPlayers = ref(4)
const startingLife = ref(40)

const currentPlayerIndex = ref(0)
const isShuffling = ref(false)
const activePlayerMenu = ref(null)
const activeCommanderMenu = ref(null)
const loading = ref(false)
const currentUser = ref(null)

const pressTimer = ref(null)
const isLongPress = ref(false)

const setupPlayers = ref([
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] }
])

const players = ref([])

onMounted(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        const { data: profile } = await supabase.from('profiles').select('username, id').eq('id', session.user.id).single()
        if (profile) {
            currentUser.value = profile
            setupPlayers.value[0].name = profile.username
            setupPlayers.value[0].user_id = profile.id
            loadPlayerDecks(0, profile.id)
        }
    }
})

async function handleSearch(index) {
    const term = setupPlayers.value[index].name
    if (term.length < 3) { setupPlayers.value[index].suggestions = []; return }
    const { data } = await supabase.from('profiles').select('id, username').ilike('username', `%${term}%`).limit(5)
    setupPlayers.value[index].suggestions = data || []
}

async function selectPlayer(index, profile) {
    setupPlayers.value[index].name = profile.username
    setupPlayers.value[index].user_id = profile.id
    setupPlayers.value[index].suggestions = []
    loadPlayerDecks(index, profile.id)
}

async function loadPlayerDecks(index, userId) {
    const { data } = await supabase.from('decks').select('*').eq('user_id', userId).eq('formato', format.value).eq('is_active', true)
    setupPlayers.value[index].decks = data || []
}

function onDeckSelect(index) {
    const p = setupPlayers.value[index]
    if (p.deck_id === 'manual' || !p.deck_id) p.deck_name = ''
    else {
        const selected = p.decks.find(d => d.id === p.deck_id)
        if (selected) p.deck_name = selected.comandante_nombre || selected.nombre_personalizado || selected.arquetipo_pauper
    }
}

function changeFormat(newFormat) {
    format.value = newFormat
    startingLife.value = (newFormat === 'commander') ? 40 : 20
    setupPlayers.value.forEach((p, idx) => {
        if (idx !== 0) { p.name = ''; p.user_id = null; p.suggestions = [] }
        p.deck_id = null; p.deck_name = ''; p.decks = [];
        if (p.user_id) loadPlayerDecks(idx, p.user_id)
    })
}

const getPlayerColor = (i) => ['#b91c1c', '#1d4ed8', '#047857', '#b45309'][i]

const startGame = () => {
    gameStarted.value = true;
    requestWakeLock();

    players.value = setupPlayers.value.slice(0, numPlayers.value).map((p, i) => ({
        id: i + 1, user_id: p.user_id, deck_id: p.deck_id,
        name: p.name || `Jugador ${i + 1}`,
        deck_name: p.deck_name || (format.value === 'commander' ? 'Sin Comandante' : 'Mazo Desconocido'),
        life: startingLife.value, lifeDelta: 0, deltaKey: 0, deltaTimer: null,
        poison: 0, tax: 0, isMonarch: false, commanderDamage: {},
        color: getPlayerColor(i), dead: false, puesto: null,
        animLight: false, animHeavy: false
    }))
    gameOver.value = false; winner.value = null;
    runShuffleAnimation()
}

const runShuffleAnimation = () => {
    isShuffling.value = true
    let step = 0; const totalSteps = 15;
    const nextStep = () => {
        currentPlayerIndex.value = (currentPlayerIndex.value + 1) % numPlayers.value
        step++
        if (step < totalSteps) setTimeout(nextStep, 50 + (step * 5))
        else isShuffling.value = false
    }
    nextStep()
}

const getClockwiseOrder = (num) => {
    if (num === 4) return [0, 1, 3, 2]
    if (num === 3) return [0, 2, 1]
    return [0, 1]
}

const nextTurn = () => {
    if (isShuffling.value || gameOver.value) return
    const order = getClockwiseOrder(numPlayers.value)
    let nextPos = (order.indexOf(currentPlayerIndex.value) + 1) % order.length
    while (players.value[order[nextPos]].dead) nextPos = (nextPos + 1) % order.length
    currentPlayerIndex.value = order[nextPos]
}

const handleTouchStart = (e, i, a) => {
    if (pressTimer.value) clearTimeout(pressTimer.value);
    isLongPress.value = false
    pressTimer.value = setTimeout(() => {
        isLongPress.value = true
        triggerAnimation(i, a * 10)
        updateLife(i, a * 10)
    }, 450)
}

const handleTouchEnd = (e, i, a) => {
    clearTimeout(pressTimer.value); pressTimer.value = null;
    if (!isLongPress.value) {
        triggerAnimation(i, a)
        updateLife(i, a)
    }
    if (e.cancelable) e.preventDefault();
}

const triggerAnimation = (i, amount) => {
    if (amount >= 0) return;
    const p = players.value[i];

    if (amount <= -5) {
        p.animHeavy = true;
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    } else {
        p.animLight = true;
        if (navigator.vibrate) navigator.vibrate(30);
    }

    setTimeout(() => { p.animLight = false; p.animHeavy = false; }, 400);
}

const updateLife = (i, a) => {
    const p = players.value[i]
    p.life += a
    p.lifeDelta += a
    p.deltaKey = Date.now()
    if (p.deltaTimer) clearTimeout(p.deltaTimer)
    p.deltaTimer = setTimeout(() => { p.lifeDelta = 0 }, 1200)
    checkDeath(i)
}

const updatePoison = (i, a) => {
    const p = players.value[i]
    p.poison = Math.max(0, Math.min(10, p.poison + a))
    checkDeath(i)
}

const updateTax = (i, a) => { players.value[i].tax = Math.max(0, players.value[i].tax + a) }

const updateCommanderDamage = (i, oppId, a) => {
    const p = players.value[i]
    const cur = p.commanderDamage[oppId] || 0
    p.commanderDamage[oppId] = Math.max(0, cur + a)
    triggerAnimation(i, -a);
    updateLife(i, -a)
}

const setMonarch = (i) => { players.value.forEach((p, x) => p.isMonarch = x === i) }

const checkDeath = (i) => {
    const p = players.value[i]
    if (p.dead) return
    const cmdrLoss = Object.values(p.commanderDamage).some(d => d >= 21)
    if (p.life <= 0 || p.poison >= 10 || (format.value === 'commander' && cmdrLoss)) {
        p.dead = true
        p.puesto = players.value.filter(pl => !pl.dead).length + 1
        checkWinner()
    }
}

const checkWinner = () => {
    const survivors = players.value.filter(p => !p.dead)
    if (survivors.length === 1 && gameStarted.value) {
        winner.value = survivors[0]; winner.value.puesto = 1; gameOver.value = true; saveMatch()
    }
}

const saveMatch = async () => {
    if (loading.value) return
    loading.value = true
    try {
        const { data: matchData } = await supabase.from('matches').insert([{ creator_id: currentUser.value?.id, formato: format.value, is_public: true }]).select().single()
        const parts = players.value.map((p) => ({
            match_id: matchData.id, user_id: p.user_id, player_name_manual: p.user_id ? null : p.name,
            deck_id: p.deck_id && p.deck_id !== 'manual' ? p.deck_id : null, deck_name_manual: p.deck_name,
            is_winner: p.puesto === 1, puesto: p.puesto || 1
        }))
        await supabase.from('match_participants').insert(parts)
    } catch (error) { console.error(error) } finally { loading.value = false }
}

const resetGame = () => {
    if (confirm("¿Finalizar la partida actual?")) {
        gameStarted.value = false; gameOver.value = false; releaseWakeLock();
    }
}
</script>

<template>
    <div class="life-counter-root">
        <button v-if="!gameStarted" class="back-nav-btn" @click="router.back()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6" />
            </svg>
            Volver
        </button>

        <div v-if="!gameStarted" class="setup-screen scrollable">
            <div class="setup-container">
                <div class="setup-box">
                    <p class="section-label">Formato</p>
                    <div class="selector-row">
                        <button @click="changeFormat('commander')"
                            :class="{ active: format === 'commander' }">Commander</button>
                        <button @click="changeFormat('pauper')" :class="{ active: format === 'pauper' }">Pauper</button>
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
                                        placeholder="Buscar jugador (@username)..."
                                        :disabled="i === 1 && currentUser" />
                                    <ul v-if="setupPlayers[i - 1].suggestions.length > 0" class="suggestions-list">
                                        <li v-for="sug in setupPlayers[i - 1].suggestions" :key="sug.id"
                                            @click="selectPlayer(i - 1, sug)">@{{ sug.username }}</li>
                                    </ul>
                                </div>
                                <select v-if="setupPlayers[i - 1].decks.length > 0"
                                    v-model="setupPlayers[i - 1].deck_id" @change="onDeckSelect(i - 1)"
                                    class="setup-select">
                                    <option :value="null">Seleccionar mazo...</option>
                                    <option v-for="deck in setupPlayers[i - 1].decks" :key="deck.id" :value="deck.id">{{
            deck.nombre_personalizado || deck.comandante_nombre }}</option>
                                    <option value="manual">Otro mazo...</option>
                                </select>
                                <input
                                    v-if="setupPlayers[i - 1].decks.length === 0 || setupPlayers[i - 1].deck_id === 'manual'"
                                    type="text" v-model="setupPlayers[i - 1].deck_name"
                                    placeholder="Nombre/Comandante..." />
                            </div>
                        </div>
                    </div>
                    <button class="start-btn" @click="startGame">EMPEZAR PARTIDA</button>
                </div>
            </div>
        </div>

        <div v-else class="game-board" :class="`players-${numPlayers}`">
            <div v-for="(player, index) in players" :key="player.id" class="player-zone"
                :style="{ '--player-color': !player.dead ? player.color : '#111' }" :class="{
            'is-dead': player.dead,
            'is-current-turn': currentPlayerIndex === index && !isShuffling && !gameOver,
            'is-shuffling': isShuffling && currentPlayerIndex === index,
            'anim-dmg-light': player.animLight,
            'anim-dmg-heavy': player.animHeavy
        }">

                <div class="inner-content-rotator">
                    <div class="interaction-layer">
                        <div class="hitbox minus" @mousedown="handleTouchStart($event, index, -1)"
                            @mouseup="handleTouchEnd($event, index, -1)"
                            @touchstart.passive="handleTouchStart($event, index, -1)"
                            @touchend="handleTouchEnd($event, index, -1)" @contextmenu.prevent>
                            <div class="edge-indicator left">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="3" stroke-linecap="round">
                                    <path d="M5 12h14" />
                                </svg>
                            </div>
                        </div>
                        <div class="hitbox plus" @mousedown="handleTouchStart($event, index, 1)"
                            @mouseup="handleTouchEnd($event, index, 1)"
                            @touchstart.passive="handleTouchStart($event, index, 1)"
                            @touchend="handleTouchEnd($event, index, 1)" @contextmenu.prevent>
                            <div class="edge-indicator right">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="3" stroke-linecap="round">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="interface-layer">
                        <div class="status-pills-container">
                            <div v-if="player.poison > 0" class="status-pill poison">🧪 {{ player.poison }}</div>
                            <div v-if="player.tax > 0" class="status-pill tax">💎 {{ player.tax }}</div>
                            <div v-if="player.isMonarch" class="status-pill monarch">👑</div>
                            <template v-if="format === 'commander'">
                                <div v-for="opp in players.filter(p => p.id !== player.id)" :key="opp.id"
                                    v-show="(player.commanderDamage[opp.id] || 0) > 0" class="status-pill cmd-dmg"
                                    :style="{ borderLeftColor: opp.color }">
                                    ⚔️ {{ player.commanderDamage[opp.id] }}
                                </div>
                            </template>
                        </div>

                        <div class="life-center">
                            <div v-if="player.lifeDelta !== 0" :key="player.deltaKey" class="life-delta-indicator"
                                :class="player.lifeDelta > 0 ? 'delta-positive' : 'delta-negative'">
                                {{ player.lifeDelta > 0 ? '+' : '' }}{{ player.lifeDelta }}
                            </div>

                            <span v-if="!player.dead" class="p-life">{{ player.life }}</span>
                            <div v-else class="p-death-msg">💀<button
                                    @click.stop="player.dead = false; player.life = 1; gameOver = false">REVIVIR</button>
                            </div>
                        </div>

                        <div class="player-footer">
                            <div class="p-info-group">
                                <div v-if="currentPlayerIndex === index && !gameOver" class="turn-indicator-label">
                                    {{ isShuffling ? '🎲' : 'TU TURNO' }}
                                </div>
                                <span class="p-tag">{{ player.name }}</span>
                                <span class="p-extra">{{ player.deck_name }}</span>
                            </div>

                            <div class="action-buttons-group">
                                <button v-if="format === 'commander' && !player.dead" class="tactical-btn combat-btn"
                                    @click.stop="activeCommanderMenu = player.id">
                                    ⚔️
                                </button>
                                <button v-if="!player.dead" class="tactical-btn settings-btn"
                                    @click.stop="activePlayerMenu = player.id">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2.5">
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="5" cy="12" r="1" />
                                        <circle cx="19" cy="12" r="1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div v-if="activeCommanderMenu === player.id" class="combat-hud-overlay"
                        @click.self="activeCommanderMenu = null">
                        <div class="combat-hud-panel">
                            <div class="combat-header">
                                <span>DAÑO</span>
                                <button class="close-hud-btn" @click.stop="activeCommanderMenu = null">✕</button>
                            </div>

                            <div class="combat-targets-grid">
                                <div v-for="opp in players.filter(p => p.id !== player.id)" :key="opp.id"
                                    class="target-column">
                                    <div class="target-header" :style="{ borderBottomColor: opp.color }">
                                        <span class="target-name">{{ opp.name }}</span>
                                    </div>
                                    <div class="target-stepper-vertical">
                                        <button class="step-btn plus"
                                            @click.stop="updateCommanderDamage(index, opp.id, 1)">+</button>
                                        <span class="step-value"
                                            :class="{ 'critical': (player.commanderDamage[opp.id] || 0) >= 18 }">
                                            {{ player.commanderDamage[opp.id] || 0 }}
                                        </span>
                                        <button class="step-btn minus"
                                            @click.stop="updateCommanderDamage(index, opp.id, -1)">-</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="activePlayerMenu === player.id" class="player-menu-overlay"
                        @click.self="activePlayerMenu = null">
                        <div class="menu-glass-panel clean-menu">
                            <div class="menu-top-row">
                                <div class="stat-module">
                                    <span class="module-label">🧪 VENENO</span>
                                    <div class="module-controls">
                                        <button class="ctrl-btn" @click.stop="updatePoison(index, -1)">-</button>
                                        <span class="v-number">{{ player.poison }}</span>
                                        <button class="ctrl-btn" @click.stop="updatePoison(index, 1)">+</button>
                                    </div>
                                </div>
                                <div class="stat-module">
                                    <span class="module-label">💎 TAX</span>
                                    <div class="module-controls">
                                        <button class="ctrl-btn" @click.stop="updateTax(index, -2)">-</button>
                                        <span class="v-number">{{ player.tax }}</span>
                                        <button class="ctrl-btn" @click.stop="updateTax(index, 2)">+</button>
                                    </div>
                                </div>
                            </div>

                            <button class="monarch-action-bar" :class="{ 'is-active': player.isMonarch }"
                                @click.stop="setMonarch(index)">
                                👑 {{ player.isMonarch ? 'MONARCA' : 'RECLAMAR TRONO' }}
                            </button>

                            <button class="menu-done-btn" @click.stop="activePlayerMenu = null">LISTO</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="center-hub" v-if="!gameOver">
                <button class="hub-btn pass-btn" @click="nextTurn" v-show="!isShuffling">⏭️</button>
                <button class="hub-btn menu-btn" @click="resetGame">⚙️</button>
            </div>

            <div v-if="gameOver" class="victory-overlay">
                <div class="victory-box">
                    <h2>👑 ¡VICTORIA! 👑</h2>
                    <h1 :style="{ color: winner.color }">{{ winner.name }}</h1>
                    <p class="db-msg" v-if="!loading">✓ Partida guardada</p>
                    <button class="start-btn" @click="resetGame">VOLVER AL MENÚ</button>
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
    user-select: none;
    -webkit-touch-callout: none;
    touch-action: manipulation;
}

.setup-screen input,
.setup-screen select {
    user-select: text;
}

.setup-screen {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
    overflow-y: auto;
}

.setup-container {
    padding-top: 50px;
}

.setup-box {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 24px;
    width: 320px;
    max-width: 90vw;
}

.section-label {
    margin: 10px 0 8px 0;
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

.input-group input,
.setup-select {
    width: 100%;
    background: #1e293b;
    border: 1px solid #334155;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    box-sizing: border-box;
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
    z-index: 1000;
    max-height: 120px;
    overflow-y: auto;
    list-style: none;
    padding: 0;
    margin: 4px 0 0 0;
}

.suggestions-list li {
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid #334155;
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

.back-nav-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 8px 16px 8px 8px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    backdrop-filter: blur(10px);
}

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
    border: 0.5px solid rgba(0, 0, 0, 0.3);
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

.anim-dmg-light {
    animation: shakeLight 0.3s ease;
}

.anim-dmg-heavy {
    animation: shakeHeavy 0.4s cubic-bezier(.36, .07, .19, .97) both;
    position: relative;
}

.anim-dmg-heavy::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 0, 0, 0.4);
    z-index: 200;
    pointer-events: none;
    animation: flashRed 0.4s ease-out;
}

@keyframes shakeLight {

    0%,
    100% {
        transform: translateX(0);
    }

    25% {
        transform: translateX(-3px);
    }

    75% {
        transform: translateX(3px);
    }
}

@keyframes shakeHeavy {

    0%,
    100% {
        transform: translate(0, 0);
    }

    20%,
    60% {
        transform: translate(-8px, 4px);
    }

    40%,
    80% {
        transform: translate(8px, -4px);
    }
}

@keyframes flashRed {
    from {
        opacity: 1;
    }

    to {
        opacity: 0;
    }
}

.interface-layer {
    position: relative;
    z-index: 10;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none;
    padding: 16px;
    box-sizing: border-box;
}

.status-pills-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    z-index: 15;
    align-items: flex-start;
}

.status-pill {
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.status-pill.monarch {
    background: #eab308;
    color: #000;
}

.status-pill.cmd-dmg {
    border-left: 4px solid transparent;
    border-radius: 6px;
}

.life-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 45%;
    pointer-events: none;
}

.p-life {
    font-size: clamp(4rem, 20vw, 10rem);
    font-weight: 900;
    line-height: 1;
    text-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    text-align: center;
}

.life-delta-indicator {
    position: absolute;
    top: -30%;
    font-size: 3.5rem;
    font-weight: 900;
    opacity: 0;
    pointer-events: none;
    animation: float-fade 2s ease-out forwards;
    text-shadow: 0 4px 10px rgba(0, 0, 0, 0.8);
    z-index: 20;
}

.delta-positive {
    color: #4ade80;
}

.delta-negative {
    color: #f87171;
}

@keyframes float-fade {
    0% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }

    100% {
        transform: translateY(-60px) scale(1.3);
        opacity: 0;
    }
}

.player-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
}

.p-info-group {
    display: flex;
    flex-direction: column;
    pointer-events: auto;
}

.p-tag {
    font-size: 1.1rem;
    font-weight: 900;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.p-extra {
    font-size: 0.75rem;
    opacity: 0.8;
    font-style: italic;
}

.turn-indicator-label {
    background: #fff;
    color: #000;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.6rem;
    font-weight: 900;
    width: fit-content;
    margin-bottom: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.action-buttons-group {
    display: flex;
    gap: 8px;
    pointer-events: auto;
}

.tactical-btn {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: white;
    width: 48px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    transition: transform 0.1s, background 0.2s;
}

.tactical-btn.combat-btn {
    font-size: 1.2rem;
    border-color: rgba(248, 113, 113, 0.3);
    background: rgba(20, 0, 0, 0.6);
}

.tactical-btn:active {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(0.92);
}

.interaction-layer {
    position: absolute;
    inset: 0;
    display: flex;
    z-index: 5;
    justify-content: space-between;
}

.hitbox {
    width: 35%;
    height: 100%;
    display: flex;
    align-items: center;
    background: transparent;
}

.hitbox.minus {
    justify-content: flex-start;
}

.hitbox.plus {
    justify-content: flex-end;
}

.edge-indicator {
    color: rgba(255, 255, 255, 0.2);
    width: 40px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(2px);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.edge-indicator.left {
    border-radius: 0 40px 40px 0;
    border-left: none;
}

.edge-indicator.right {
    border-radius: 40px 0 0 40px;
    border-right: none;
}

.hitbox:active .edge-indicator {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
    transform: scaleX(1.3);
}

.is-dead {
    filter: grayscale(1) brightness(0.5);
}

.p-death-msg {
    z-index: 50;
    pointer-events: auto;
    text-align: center;
    font-size: 3rem;
}

.p-death-msg button {
    margin-top: 10px;
    padding: 10px 20px;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 12px;
    font-weight: 900;
    display: block;
}

/* =========================================================
   HUD DE COMBATE TÁCTICO (REDUCIDO)
   ========================================================= */
.combat-hud-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    z-index: 200;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    animation: zoomIn 0.2s ease-out;
}

@keyframes zoomIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.combat-hud-panel {
    display: flex;
    flex-direction: column;
    width: 95%;
    max-width: 280px;
    height: auto;
    gap: 6px;
    background: rgba(25, 25, 30, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
}

.combat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px 4px 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.combat-header span {
    font-size: 0.55rem;
    font-weight: 900;
    color: #f87171;
    letter-spacing: 1px;
}

.close-hud-btn {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: white;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
}

.combat-targets-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    flex: 1;
    overflow: hidden;
}

.target-column {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 2px;
}

.target-header {
    padding: 2px;
    text-align: center;
    border-bottom: 1px solid transparent;
}

.target-name {
    font-size: 0.55rem;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    opacity: 0.9;
}

.target-stepper-vertical {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    padding: 4px 0;
}

.target-stepper-vertical .step-btn {
    width: 90%;
    height: 32px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 1.1rem;
    flex: none;
}

.target-stepper-vertical .step-btn:active {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(0.92);
}

.target-stepper-vertical .step-value {
    font-size: 1.4rem;
    font-weight: 900;
    line-height: 1;
    padding: 2px 0;
}

.critical {
    color: #f87171;
    text-shadow: 0 0 10px rgba(248, 113, 113, 0.4);
}

/* =========================================================
   PLAYER MENU OVERLAY (REDUCIDO)
   ========================================================= */
.player-menu-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(15px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    pointer-events: auto;
    animation: fadeMenu 0.2s ease-out;
}

@keyframes fadeMenu {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.menu-glass-panel {
    background: rgba(20, 20, 25, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    width: 95%;
    max-width: 260px;
    height: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    box-sizing: border-box;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
}

.clean-menu {
    align-content: center;
}

.menu-top-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.stat-module {
    background: rgba(255, 255, 255, 0.05);
    padding: 8px;
    border-radius: 12px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.module-label {
    font-size: 0.55rem;
    font-weight: 800;
    color: #777;
    display: block;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.module-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2px;
}

.v-number {
    font-size: 1.4rem;
    font-weight: 900;
}

.ctrl-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1.2rem;
    font-weight: bold;
}

.ctrl-btn:active {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0.9);
}

.monarch-action-bar {
    width: 100%;
    padding: 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: #ccc;
    font-weight: 900;
    font-size: 0.8rem;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.monarch-action-bar.is-active {
    background: #eab308;
    color: #000;
    border-color: #eab308;
    box-shadow: 0 0 15px rgba(234, 179, 8, 0.3);
}

.menu-done-btn {
    width: 100%;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 12px;
    padding: 2px;
    font-weight: 900;
    font-size: 0.9rem;
    letter-spacing: 1.5px;
    margin-top: 4px;
}

/* --- HUB Y TURNOS --- */
.center-hub {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 8px;
    background: rgba(0, 0, 0, 0.8);
    padding: 8px;
    border-radius: 40px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 150;
    backdrop-filter: blur(10px);
}

.hub-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
}

.pass-btn {
    background: #fff;
    color: #000;
    font-weight: bold;
}

.menu-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
}

.is-current-turn {
    z-index: 20;
    box-shadow: inset 0 0 0 6px rgba(255, 255, 255, 0.8);
}

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
    from {
        transform: scale(0.8);
        opacity: 0;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}
</style>