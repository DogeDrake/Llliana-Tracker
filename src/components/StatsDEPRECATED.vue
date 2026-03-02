<script setup>
import { ref, onMounted, computed } from "vue";
import { leerSheet, escribirPartida } from "../services/sheets";

const props = defineProps(['config']);
const emit = defineEmits(['back']);

const partidas = ref([]);
const cargando = ref(true);
const enviando = ref(false);
const mazoYo = ref("");
const mazoGanador = ref("");

async function cargarDatos() {
    cargando.value = true;
    try {
        const data = await leerSheet(props.config.jugadorId);
        partidas.value = Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Fallo en la conexión mágica");
    } finally {
        cargando.value = false;
    }
}

async function handleSumit() {
    if (!mazoYo.value || !mazoGanador.value) return;
    enviando.value = true;
    try {
        const res = await escribirPartida(props.config.jugadorId, {
            yo: mazoYo.value,
            ganador: mazoGanador.value
        });
        if (res.success) {
            mazoYo.value = ""; mazoGanador.value = "";
            setTimeout(cargarDatos, 1000);
        }
    } finally {
        enviando.value = false;
    }
}

const partidasFiltradas = computed(() => [...partidas.value].reverse().filter(p => p.deck || p.Deck));
const formatPct = (val) => (parseFloat(val || 0) * 100).toFixed(1) + "%";

onMounted(cargarDatos);
</script>

<template>
    <div class="app-container fade-in">
        <nav class="stats-nav">
            <button @click="$emit('back')" class="btn-volver">
                <span class="arrow">←</span> VOLVER AL HUB
            </button>
            <div class="breadcrumb">
                <span class="b-name">{{ config.nombre }}</span>
                <span class="b-sep">/</span>
                <span class="b-format">{{ config.formato }}</span>
            </div>
        </nav>

        <header class="glass-header">
            <div class="header-info">
                <h1>Registro de Duelos</h1>
                <p class="count-badge" :class="{ 'pulse': cargando }">
                    {{ cargando ? 'Sincronizando...' : partidasFiltradas.length + ' partidas' }}
                </p>
            </div>
            <button @click="cargarDatos" class="btn-refresh" :disabled="cargando">
                <span :class="{ 'spinning': cargando }">🔄</span>
            </button>
        </header>

        <section class="card-form">
            <div class="form-group">
                <div class="input-wrapper">
                    <label>Tu Mazo</label>
                    <input v-model="mazoYo" placeholder="Ejem: Emmara..." :disabled="enviando" />
                </div>
                <div class="input-wrapper">
                    <label>Ganador</label>
                    <input v-model="mazoGanador" placeholder="Ejem: Sauron..." :disabled="enviando" />
                </div>
                <button @click="handleSumit" :disabled="enviando" class="btn-send">
                    {{ enviando ? 'SELLANDO...' : 'REGISTRAR DUELO' }}
                </button>
            </div>
        </section>

        <div class="table-wrapper">
            <div v-if="cargando" class="skeleton-container">
                <div v-for="i in 5" :key="i" class="skeleton-row">
                    <div class="sk-cell sk-id"></div>
                    <div class="sk-cell sk-main"></div>
                    <div class="sk-cell sk-res"></div>
                    <div class="sk-cell sk-pct"></div>
                </div>
            </div>

            <table v-else>
                <thead>
                    <tr>
                        <th class="col-id">Nº</th>
                        <th class="col-main">MAZO UTILIZADO</th>
                        <th class="col-res">RESULTADO</th>
                        <th class="col-pct">WR</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(p, index) in partidasFiltradas" :key="index" class="row-appear">
                        <td class="col-id mono">#{{ p.game || (partidasFiltradas.length - index) }}</td>
                        <td class="col-main bold truncate deck-name">{{ p.deck || p.Deck }}</td>
                        <td class="col-res">
                            <div class="status-cell">
                                <span :class="['res-indicator', p.win == 1 ? 'win-style' : 'loss-style']">
                                    {{ p.win == 1 ? 'V' : 'D' }}
                                </span>
                            </div>
                        </td>
                        <td class="col-pct mono accent">{{ formatPct(p.acc_wr || p.Acc_wr) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
/* 1. NAVEGACIÓN Y ESTRUCTURA */
.app-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 10px;
}

.stats-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 10px;
}

.btn-volver {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 8px 16px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 0.7rem;
    cursor: pointer;
    transition: 0.3s;
}

.btn-volver:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.breadcrumb {
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: 0.5px;
}

.b-name {
    color: #3b82f6;
}

.b-sep {
    margin: 0 8px;
    color: #475569;
}

.b-format {
    color: #10b981;
    text-transform: uppercase;
}

/* 2. HEADER */
.glass-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: rgba(30, 41, 59, 0.3);
    border-radius: 20px 20px 0 0;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.header-info h1 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 900;
}

.count-badge {
    color: #64748b;
    font-size: 0.8rem;
    margin: 4px 0 0 0;
    font-weight: 600;
}

.btn-refresh {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 50%;
    width: 45px;
    height: 45px;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.3s;
}

/* 3. FORMULARIO PROFESIONAL */
.card-form {
    background: rgba(30, 41, 59, 0.5);
    padding: 20px;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 20px;
}

.input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.input-wrapper label {
    font-size: 0.65rem;
    font-weight: 900;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 1px;
}

input {
    background: #0f172a;
    border: 1px solid #1e293b;
    padding: 12px 15px;
    border-radius: 10px;
    color: white;
    font-weight: 600;
    transition: 0.3s;
}

input:focus {
    border-color: #3b82f6;
    outline: none;
    background: #1e293b;
}

.btn-send {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    padding: 15px;
    border-radius: 10px;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
}

/* 4. TABLA Y SKELETON */
.table-wrapper {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 0 0 20px 20px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

table {
    width: 100%;
    border-collapse: collapse;
}

th {
    padding: 15px 10px;
    background: rgba(0, 0, 0, 0.2);
    color: #64748b;
    font-size: 0.65rem;
    font-weight: 900;
    text-transform: uppercase;
    text-align: left;
    border-bottom: 2px solid #3b82f6;
}

td {
    padding: 14px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    font-size: 0.9rem;
}

.col-id {
    width: 50px;
    color: #475569;
}

.col-main {
    font-weight: 700;
}

.col-res {
    width: 100px;
    text-align: center;
}

.col-pct {
    width: 80px;
    text-align: right;
}

/* 5. RESULTADOS (PUNTOS DE LUZ) */
.res-indicator {
    font-weight: 900;
    position: relative;
    display: inline-flex;
    align-items: center;
}

.res-indicator::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 8px;
}

.win-style {
    color: #34d399;
}

.win-style::before {
    background: #34d399;
    box-shadow: 0 0 10px #34d399;
}

.loss-style {
    color: #f87171;
}

.loss-style::before {
    background: #f87171;
    box-shadow: 0 0 10px #f87171;
}

/* 6. ANIMACIONES Y SKELETON */
.skeleton-row {
    display: flex;
    padding: 15px;
    gap: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.sk-cell {
    background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 4px;
    height: 15px;
}

.sk-id {
    width: 30px;
}

.sk-main {
    flex: 1;
}

.sk-res {
    width: 60px;
}

.sk-pct {
    width: 40px;
}

@keyframes loading {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

.spinning {
    animation: spin 1s linear infinite;
    display: inline-block;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
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

/* RESPONSIVE PC */
@media (min-width: 768px) {
    .form-group {
        display: grid;
        grid-template-columns: 1fr 1fr 200px;
        align-items: end;
        gap: 20px;
    }

    .win-style::after {
        content: 'ICTORIA';
    }

    .loss-style::after {
        content: 'ERROTA';
    }

    .header-info h1 {
        font-size: 2rem;
    }
}
</style>