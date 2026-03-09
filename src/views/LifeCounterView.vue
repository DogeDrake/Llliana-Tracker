<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- CONFIGURACIÓN ---
const gameStarted = ref(false)
const numPlayers = ref(4)
const startingLife = ref(40)

// --- ESTADO DEL JUEGO ---
const players = ref([])

const startGame = () => {
    players.value = Array.from({ length: numPlayers.value }, (_, i) => ({
        id: i + 1,
        name: `JUGADOR ${i + 1}`,
        life: startingLife.value,
        color: getPlayerColor(i)
    }))
    gameStarted.value = true
}

const getPlayerColor = (i) => {
    const colors = ['#b91c1c', '#1d4ed8', '#047857', '#b45309']
    return colors[i]
}

const updateLife = (index, amount) => {
    players.value[index].life += amount
}

const resetGame = () => {
    if (confirm("¿Reiniciar partida?")) {
        gameStarted.value = false
    }
}

const goBack = () => router.push('/')
</script>

<template>
    <div class="life-counter-root">
        <div v-if="!gameStarted" class="setup-screen fade-in">
            <h2 class="setup-title">LILLIANA TRACKER</h2>
            <div class="setup-group">
                <label>Jugadores</label>
                <div class="selector-row">
                    <button v-for="n in [2, 3, 4]" :key="n" @click="numPlayers = n"
                        :class="{ active: numPlayers === n }">{{ n }}</button>
                </div>
            </div>
            <div class="setup-group">
                <label>Vidas Iniciales</label>
                <div class="selector-row">
                    <button v-for="l in [20, 30, 40]" :key="l" @click="startingLife = l"
                        :class="{ active: startingLife === l }">{{ l }}</button>
                </div>
            </div>
            <button @click="startGame" class="start-btn">COMENZAR PARTIDA</button>
            <button @click="goBack" class="back-btn">VOLVER AL INICIO</button>
        </div>

        <div v-else class="game-board" :class="[`players-${numPlayers}`]">
            <div v-for="(player, index) in players" :key="player.id" class="player-zone"
                :style="{ '--player-color': player.life > 0 ? player.color : '#1a1a1a' }"
                :class="{ 'is-dead': player.life <= 0 }">

                <div class="player-orientation-wrapper">
                    <div class="hitbox-system">
                        <div class="hitbox minus" @click="updateLife(index, -1)">
                            <div class="feedback-overlay"></div>
                        </div>
                        <div class="hitbox plus" @click="updateLife(index, 1)">
                            <div class="feedback-overlay"></div>
                        </div>
                    </div>

                    <div class="player-content-ui">
                        <span class="player-label">{{ player.name }}</span>

                        <div v-if="player.life > 0" class="life-display">
                            <span class="life-number">{{ player.life }}</span>
                            <div class="controls-hint">
                                <span class="hint-symbol">-</span>
                                <span class="hint-symbol">+</span>
                            </div>
                        </div>

                        <div v-else class="dead-state fade-in">
                            <span class="skull-icon">💀</span>
                            <button @click="updateLife(index, 1)" class="revive-btn">DESHACER</button>
                        </div>
                    </div>
                </div>
            </div>

            <button @click="resetGame" class="central-config-btn">
                <span class="icon">⚙️</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.life-counter-root {
    width: 100vw;
    height: 100vh;
    background: #020617;
    color: white;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    /* Elimina el cuadro azul feo de Android */
}

/* --- GRID SYSTEM --- */
.game-board {
    display: grid;
    width: 100%;
    height: 100%;
    position: relative;
    background: #000;
}

.players-2 {
    grid-template-rows: 1fr 1fr;
}

.players-2 .player-zone:nth-child(1) .player-orientation-wrapper {
    transform: rotate(180deg);
}

.players-3 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
}

.players-3 .player-zone:nth-child(1) {
    grid-column: span 2;
}

.players-3 .player-zone:nth-child(1) .player-orientation-wrapper {
    transform: rotate(180deg);
}

.players-4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
}

/* Rotación para Móvil/Tablet */
@media (max-width: 1024px) {

    .players-4 .player-zone:nth-child(odd) .player-orientation-wrapper,
    .players-3 .player-zone:nth-child(2) .player-orientation-wrapper {
        transform: rotate(90deg);
    }

    .players-4 .player-zone:nth-child(even) .player-orientation-wrapper,
    .players-3 .player-zone:nth-child(3) .player-orientation-wrapper {
        transform: rotate(-90deg);
    }
}

@media (min-width: 1025px) {

    .players-4 .player-zone:nth-child(1) .player-orientation-wrapper,
    .players-4 .player-zone:nth-child(2) .player-orientation-wrapper {
        transform: rotate(180deg);
    }
}

/* --- ZONA DE JUGADOR --- */
.player-zone {
    position: relative;
    overflow: hidden;
    background-color: var(--player-color);
    border: 1px solid rgba(0, 0, 0, 0.2);
    transition: background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-orientation-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* --- HITBOXES Y FEEDBACK PULIDO --- */
.hitbox-system {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    z-index: 5;
}

.hitbox {
    flex: 1;
    height: 100%;
    position: relative;
    cursor: pointer;
    overflow: hidden;
}

/* El feedback ahora es un overlay que se ilumina al tocar */
.feedback-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: white;
    opacity: 0;
    transition: opacity 0.3s;
}

.hitbox:active .feedback-overlay {
    opacity: 0.15;
    /* Brillo más fuerte y evidente en móvil */
    transition: opacity 0s;
}

/* --- UI DEL JUGADOR --- */
.player-content-ui {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
    width: 100%;
    height: 100%;
}

.player-label {
    position: absolute;
    top: 10%;
    font-size: 0.75rem;
    font-weight: 800;
    opacity: 0.6;
    letter-spacing: 3px;
    text-transform: uppercase;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.life-number {
    font-size: clamp(5rem, 20vw, 10rem);
    font-weight: 900;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.controls-hint {
    display: flex;
    width: 80%;
    justify-content: space-between;
    position: absolute;
    bottom: 20%;
    opacity: 0.4;
}

.hint-symbol {
    font-size: 2.5rem;
    font-weight: 200;
}

/* --- BOTÓN CENTRAL --- */
.central-config-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 56px;
    height: 56px;
    background: #0f172a;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: white;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 25px rgba(0, 0, 0, 0.6);
    cursor: pointer;
}

/* --- OTROS --- */
.is-dead {
    filter: grayscale(0.9) brightness(0.4);
}

.dead-state {
    text-align: center;
    pointer-events: auto;
}

.skull-icon {
    font-size: 5rem;
    display: block;
    margin-bottom: 1rem;
}

.revive-btn {
    background: rgba(255, 255, 255, 0.15);
    border: 1.5px solid white;
    color: white;
    padding: 12px 24px;
    border-radius: 30px;
    font-size: 0.8rem;
    font-weight: 800;
    cursor: pointer;
    pointer-events: auto;
}

/* SETUP SCREEN */
.setup-screen {
    text-align: center;
    max-width: 420px;
    padding: 20px;
}

.setup-title {
    font-weight: 900;
    color: #3b82f6;
    font-size: 2rem;
    margin-bottom: 2rem;
    letter-spacing: -1px;
}

.setup-group {
    margin-bottom: 2rem;
}

.setup-group label {
    display: block;
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 0.8rem;
    font-weight: 700;
}

.selector-row {
    display: flex;
    gap: 10px;
}

.selector-row button {
    flex: 1;
    padding: 15px;
    border-radius: 12px;
    background: #1e293b;
    color: white;
    border: 1px solid #334155;
    font-weight: 700;
    font-size: 1.1rem;
}

.selector-row button.active {
    background: #3b82f6;
    border-color: #60a5fa;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
}

.start-btn {
    width: 100%;
    padding: 20px;
    border-radius: 15px;
    background: #3b82f6;
    color: white;
    border: none;
    font-weight: 800;
    font-size: 1.2rem;
    margin-top: 1rem;
    cursor: pointer;
}

.back-btn {
    background: none;
    border: none;
    color: #64748b;
    margin-top: 1.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
}

.fade-in {
    animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>