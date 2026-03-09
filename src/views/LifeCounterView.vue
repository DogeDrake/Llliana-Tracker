<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const gameStarted = ref(false)
const numPlayers = ref(4)
const startingLife = ref(40)
const players = ref([])
const activeCommanderPanel = ref(null)

const startGame = () => {
    players.value = Array.from({ length: numPlayers.value }, (_, i) => ({
        id: i + 1,
        name: `P${i + 1}`,
        life: startingLife.value,
        poison: 0,
        isMonarch: false,
        commanderDamage: {},
        color: getPlayerColor(i),
        dead: false
    }))
    gameStarted.value = true
}

const getPlayerColor = (i) => {
    const colors = ['#b91c1c', '#1d4ed8', '#047857', '#b45309']
    return colors[i]
}

const checkDeath = (i) => {
    const p = players.value[i]
    const cmdr = Object.values(p.commanderDamage).some(d => d >= 21)
    p.dead = p.life <= 0 || p.poison >= 10 || cmdr
}

const updateLife = (i, a) => {
    players.value[i].life += a
    checkDeath(i)
}

const updatePoison = (i, a) => {
    const p = players.value[i]
    p.poison = Math.max(0, Math.min(10, p.poison + a))
    checkDeath(i)
}

const updateCommanderDamage = (i, opp, a) => {
    const p = players.value[i]
    const cur = p.commanderDamage[opp] || 0
    p.commanderDamage[opp] = Math.max(0, cur + a)
    p.life -= a
    checkDeath(i)
}

const setMonarch = (i) => {
    players.value.forEach((p, x) => p.isMonarch = x === i)
}

const resetGame = () => {
    if (confirm("¿Reiniciar partida?")) gameStarted.value = false
}
</script>

<template>
    <div class="life-counter-root">
        <div v-if="!gameStarted" class="setup-screen">
            <div class="setup-container">
                <h2 class="setup-title">LILLIANA TRACKER</h2>
                <div class="selector-row">
                    <button v-for="n in [2, 3, 4]" :key="n" @click="numPlayers = n"
                        :class="{ active: numPlayers === n }">{{ n }}</button>
                </div>
                <div class="selector-row">
                    <button v-for="l in [20, 30, 40]" :key="l" @click="startingLife = l"
                        :class="{ active: startingLife === l }">{{ l }}</button>
                </div>
                <button class="start-btn" @click="startGame">COMENZAR PARTIDA</button>
            </div>
        </div>

        <div v-else class="game-board" :class="`players-${numPlayers}`">
            <div v-for="(player, index) in players" :key="player.id" class="player-zone"
                :style="{ '--player-color': !player.dead ? player.color : '#111' }"
                :class="{ 'is-dead': player.dead, 'has-monarch': player.isMonarch }">

                <div class="player-container-inner">
                    <div class="content-wrapper">

                        <div class="top-bar-controls">
                            <div class="left-group">
                                <div class="control-pill poison" @click.stop="updatePoison(index, 1)"
                                    @contextmenu.prevent="updatePoison(index, -1)">
                                    <span>🧪</span> <span class="val">{{ player.poison }}</span>
                                </div>
                                <div class="control-pill commander" @click.stop="activeCommanderPanel = player.id">
                                    <span>⚔️</span>
                                </div>
                            </div>
                            <div class="right-group">
                                <button class="control-pill monarch" :class="{ active: player.isMonarch }"
                                    @click.stop="setMonarch(index)">
                                    👑 <span v-if="player.isMonarch" class="monarch-text">MONARCA</span>
                                </button>
                            </div>
                        </div>

                        <div class="life-display-block">
                            <span class="player-name">{{ player.name }}</span>
                            <div v-if="!player.dead" class="life-main">
                                <span class="life-number">{{ player.life }}</span>
                            </div>
                            <div v-else class="dead-ui">
                                <span class="death-icon">💀</span>
                                <button class="undo-btn" @click="player.dead = false; player.life = 1">REVIVIR</button>
                            </div>
                        </div>

                        <div class="bottom-spacer"></div>
                    </div>

                    <div class="hitbox minus-box" @click="updateLife(index, -1)">
                        <span class="hit-symbol">−</span>
                    </div>
                    <div class="hitbox plus-box" @click="updateLife(index, 1)">
                        <span class="hit-symbol">+</span>
                    </div>

                    <div v-if="activeCommanderPanel === player.id" class="commander-overlay">
                        <button class="close-overlay" @click="activeCommanderPanel = null">✕</button>
                        <p class="overlay-title">Daño de Comandante</p>
                        <div class="commander-grid">
                            <div v-for="opp in players.filter(p => p.id !== player.id)" :key="opp.id"
                                class="opp-dmg-row">
                                <div class="opp-color" :style="{ background: opp.color }"></div>
                                <div class="opp-actions">
                                    <button @click.stop="updateCommanderDamage(index, opp.id, -1)">-</button>
                                    <span class="dmg-val"
                                        :class="{ danger: (player.commanderDamage[opp.id] || 0) >= 18 }">
                                        {{ player.commanderDamage[opp.id] || 0 }}/21
                                    </span>
                                    <button @click.stop="updateCommanderDamage(index, opp.id, 1)">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button class="floating-menu-btn" @click="resetGame">⚙️</button>
        </div>
    </div>
</template>

<style scoped>
.life-counter-root {
    width: 100dvw;
    height: 100dvh;
    background: #000;
    color: white;
    overflow: hidden;
    font-family: 'Inter', system-ui;
    user-select: none;
}

.game-board {
    display: grid;
    width: 100%;
    height: 100%;
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
}

/* CONTENEDOR INTERNO: Ajustado para no dejar salir nada */
.player-container-inner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ENVOLTORIO DE CONTENIDO: Controla el flujo vertical */
.content-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    /* Empuja controles arriba y spacer abajo */
    padding: 10px;
    box-sizing: border-box;
}

/* ROTACIONES: Ahora rotamos el envoltorio entero para que los límites se mantengan */
@media (orientation:portrait) {

    .players-4 .player-zone:nth-child(odd) .player-container-inner,
    .players-3 .player-zone:nth-child(2) .player-container-inner {
        transform: rotate(90deg);
    }

    .players-4 .player-zone:nth-child(even) .player-container-inner,
    .players-3 .player-zone:nth-child(3) .player-container-inner {
        transform: rotate(-90deg);
    }
}

@media (orientation:landscape) {

    .players-4 .player-zone:nth-child(1) .player-container-inner,
    .players-4 .player-zone:nth-child(2) .player-container-inner {
        transform: rotate(180deg);
    }
}

/* CONTROLES SUPERIORES */
.top-bar-controls {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    z-index: 10;
}

.left-group,
.right-group {
    display: flex;
    gap: 8px;
}

.control-pill {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: clamp(0.7rem, 2vw, 0.9rem);
    font-weight: 800;
    color: white;
    display: flex;
    align-items: center;
    gap: 4px;
}

.monarch.active {
    background: #eab308;
    color: black;
    border-color: white;
}

.monarch-text {
    font-size: 0.6rem;
}

/* HITBOXES (Capa táctil) */
.hitbox {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 45%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
}

.minus-box {
    left: 0;
}

.plus-box {
    right: 0;
}

.hit-symbol {
    font-size: clamp(2rem, 8vw, 4rem);
    opacity: 0.12;
    pointer-events: none;
}

/* BLOQUE DE VIDA */
.life-display-block {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
}

.life-number {
    font-size: clamp(3.5rem, 20vw, 10rem);
    font-weight: 950;
    line-height: 1;
}

.player-name {
    font-size: 0.6rem;
    opacity: 0.4;
    font-weight: 900;
    letter-spacing: 1px;
}

.bottom-spacer {
    height: 40px;
}

/* Equilibra visualmente los controles superiores */

/* OVERLAY COMANDANTE */
.commander-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.commander-grid {
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.opp-dmg-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px;
    border-radius: 10px;
}

.opp-color {
    width: 8px;
    height: 25px;
    border-radius: 3px;
}

.opp-actions {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.opp-actions button {
    width: 42px;
    height: 42px;
    border-radius: 8px;
    background: white;
    color: black;
    font-weight: 900;
    border: none;
}

.close-overlay {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
}

/* MENÚ Y SETUP */
.floating-menu-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    z-index: 200;
}

.setup-screen {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
}

.setup-container {
    width: 85%;
    max-width: 300px;
    text-align: center;
}

.selector-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.selector-row button {
    flex: 1;
    padding: 14px;
    background: #1e293b;
    border: none;
    color: white;
    border-radius: 10px;
    font-weight: 900;
}

.selector-row button.active {
    background: #3b82f6;
}

.start-btn {
    width: 100%;
    padding: 18px;
    background: #3b82f6;
    border: none;
    border-radius: 12px;
    font-weight: 900;
    color: white;
}

.is-dead {
    filter: grayscale(1) brightness(0.2);
}
</style>