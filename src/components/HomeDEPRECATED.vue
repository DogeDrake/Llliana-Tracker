<script setup>
const emit = defineEmits(['seleccionar']);

const jugadores = [
    {
        id: 'jugador1',
        nombre: 'Presi77',
        icon: '🦶',
        decksC: ['Emmara', 'Kaliaa'],
        decksP: ['Shit Deck']
    },
    {
        id: 'jugador2',
        nombre: 'Caramanzana',
        icon: '🌳',
        decksC: ['Terra', 'Galadriel'],
        decksP: ['Elfos']
    }
];

const seleccionar = (id, nombre, formato) => {
    emit('seleccionar', { jugadorId: id, nombre, formato });
};
</script>

<template>
    <div class="app-container fade-in">
        <header class="home-header">
            <div class="badge-container">
                <span class="badge">Lilliana Tracker v2.0</span>
            </div>
            <h1 class="main-title">Panel de Control</h1>
            <p class="subtitle">Selecciona un duelista para ver su grimorio</p>
        </header>

        <div class="grid-jugadores">
            <div v-for="(j, index) in jugadores" :key="j.id" class="player-card"
                :style="{ animationDelay: (index * 0.15) + 's' }">

                <div class="card-inner">
                    <div class="card-top">
                        <div class="avatar-wrapper">
                            <span class="avatar">{{ j.icon }}</span>
                            <div class="status-dot"></div>
                        </div>
                        <h2>{{ j.nombre }}</h2>
                    </div>

                    <div class="formats-container">
                        <div class="format-card commander-style">
                            <div class="format-header">
                                <span class="format-label">COMMANDER</span>
                                <span class="deck-count">{{ j.decksC.length }} mazos</span>
                            </div>
                            <div class="mazos-list">
                                <span v-for="d in j.decksC" :key="d" class="tag">{{ d }}</span>
                            </div>
                            <button @click="seleccionar(j.id, j.nombre, 'commander')" class="btn-action">
                                Estadísticas 📊
                            </button>
                        </div>

                        <div class="format-card pauper-style">
                            <div class="format-header">
                                <span class="format-label">PAUPER</span>
                                <span class="deck-count">{{ j.decksP.length }} mazos</span>
                            </div>
                            <div class="mazos-list">
                                <span v-for="d in j.decksP" :key="d" class="tag pauper">{{ d }}</span>
                            </div>
                            <button @click="seleccionar(j.id, j.nombre, 'pauper')" class="btn-action pauper">
                                Estadísticas 📉
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 1. LAYOUT BASE */
.app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.home-header {
    text-align: center;
    padding: 60px 20px 40px;
}

.main-title {
    font-size: 2.5rem;
    font-weight: 900;
    background: linear-gradient(to bottom, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 10px 0;
}

.subtitle {
    color: #64748b;
    font-weight: 500;
}

.badge {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    padding: 6px 16px;
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 800;
    border: 1px solid rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}

/* 2. GRID Y CARDS */
.grid-jugadores {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 30px;
    padding-bottom: 50px;
}

.player-card {
    opacity: 0;
    animation: cardEntrance 0.6s ease-out forwards;
}

.card-inner {
    background: rgba(30, 41, 59, 0.4);
    backdrop-filter: blur(12px);
    border-radius: 28px;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card-inner:hover {
    transform: translateY(-10px);
    border-color: rgba(59, 130, 246, 0.4);
    background: rgba(30, 41, 59, 0.6);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* 3. AVATAR Y TOP */
.card-top {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 25px;
}

.avatar-wrapper {
    position: relative;
}

.avatar {
    font-size: 2rem;
    background: #0f172a;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.05);
}

.status-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 14px;
    height: 14px;
    background: #10b981;
    border: 3px solid #1e293b;
    border-radius: 50%;
}

.card-top h2 {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.5px;
}

/* 4. FORMATOS */
.formats-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.format-card {
    background: rgba(15, 23, 42, 0.4);
    padding: 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.03);
}

.format-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.format-label {
    font-size: 0.7rem;
    font-weight: 900;
    letter-spacing: 1.5px;
}

.deck-count {
    font-size: 0.65rem;
    color: #475569;
    font-weight: 700;
}

.commander-style .format-label {
    color: #3b82f6;
}

.pauper-style .format-label {
    color: #10b981;
}

.mazos-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
}

.tag {
    font-size: 0.7rem;
    padding: 4px 10px;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.1);
    color: #93c5fd;
    font-weight: 700;
}

.tag.pauper {
    background: rgba(16, 185, 129, 0.1);
    color: #6ee7b7;
}

/* 5. BOTONES */
.btn-action {
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    border: none;
    background: #3b82f6;
    color: white;
    font-weight: 800;
    font-size: 0.8rem;
    cursor: pointer;
    transition: 0.3s;
    text-transform: uppercase;
}

.btn-action:hover {
    filter: brightness(1.1);
    transform: scale(1.02);
}

.btn-action.pauper {
    background: #10b981;
}

/* 6. ANIMACIONES */
@keyframes cardEntrance {
    from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.fade-in {
    animation: fadeIn 0.8s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

/* RESPONSIVE PC */
@media (min-width: 1024px) {
    .grid-jugadores {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>