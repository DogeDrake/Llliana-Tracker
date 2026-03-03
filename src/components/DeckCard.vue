<script setup>
const props = defineProps({
    deck: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['click', 'show-stats'])
</script>

<template>
    <div class="deck-card" @click="emit('click', deck.decklist_url)">
        <div v-if="deck.image_url" class="card-bg-image" :style="{ backgroundImage: `url(${deck.image_url})` }"></div>
        <div class="card-overlay"></div>

        <div class="deck-accent" :class="deck.formato?.toLowerCase()"></div>

        <div class="deck-content">
            <div class="header-row">
                <span class="format-pill" :class="deck.formato?.toLowerCase()">
                    {{ deck.formato || 'Standard' }}
                </span>
                <div v-if="deck.decklist_url" class="external-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </div>
            </div>

            <h3 class="deck-name">{{ deck.nombre_personalizado || 'Mazo sin nombre' }}</h3>

            <p v-if="deck.comandante_nombre" class="commander-tag">
                <span class="label">Commander:</span> {{ deck.comandante_nombre }}
            </p>
        </div>

        <div class="deck-footer">
            <button class="stats-trigger" @click.stop="emit('show-stats', deck)">
                <div class="stats-icon">
                    <span></span><span></span><span></span>
                </div>
                ESTADÍSTICAS
            </button>
        </div>
    </div>
</template>

<style scoped>
.deck-card {
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    position: relative;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 160px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Imagen de fondo sutil */
.card-bg-image {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 20%;
    opacity: 0.3;
    transition: 0.5s;
    filter: saturate(0.5) blur(1px);
}

.card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.95) 80%);
    z-index: 1;
}

.deck-card:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(59, 130, 246, 0.2);
}

.deck-card:hover .card-bg-image {
    opacity: 0.5;
    transform: scale(1.1);
}

.deck-accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    background: #64748b;
    z-index: 2;
}

.deck-accent.commander {
    background: linear-gradient(to bottom, #3b82f6, #60a5fa);
}

.deck-accent.pauper {
    background: linear-gradient(to bottom, #10b981, #34d399);
}

.deck-content {
    position: relative;
    z-index: 2;
}

.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.format-pill {
    font-size: 0.6rem;
    font-weight: 900;
    padding: 4px 10px;
    border-radius: 20px;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.format-pill.commander {
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.3);
}

.format-pill.pauper {
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.3);
}

.deck-name {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 900;
    color: #f8fafc;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.commander-tag {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-top: 6px;
    font-weight: 500;
}

.commander-tag .label {
    font-weight: 900;
    font-size: 0.65rem;
    color: #475569;
}

.deck-footer {
    position: relative;
    z-index: 2;
    margin-top: 20px;
}

.stats-trigger {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    padding: 10px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    transition: 0.3s;
}

.stats-trigger:hover {
    background: #f1f5f9;
    color: #0f172a;
}

.stats-icon {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 12px;
}

.stats-icon span {
    width: 3px;
    background: currentColor;
    border-radius: 1px;
}

.stats-icon span:nth-child(1) {
    height: 60%;
}

.stats-icon span:nth-child(2) {
    height: 100%;
}

.stats-icon span:nth-child(3) {
    height: 40%;
}

.external-link {
    color: #475569;
}
</style>