<template>
    <div class="player-card">
        <div class="card-inner deck-style">
            <div class="card-top">
                <div class="avatar deck-icon" :class="deck.formato">
                    {{ deck.formato === 'commander' ? '👑' : '🃏' }}
                </div>
                <div>
                    <span class="badge">{{ deck.formato }}</span>
                    <h2>{{ deck.nombre_personalizado || deck.comandante_nombre || 'Mazo sin nombre' }}</h2>
                </div>
            </div>

            <div class="deck-stats">
                <div class="mazos-list">
                    <span class="tag" v-if="deck.arquetipo_pauper">{{ deck.arquetipo_pauper }}</span>
                    <span class="tag" v-if="deck.colores">{{ deck.colores }}</span>
                </div>
            </div>

            <button class="btn-action" :class="deck.formato">
                Ver Estadísticas
            </button>
        </div>
    </div>
</template>

<script setup>
defineProps(['deck'])
</script>

<style scoped>
.deck-style {
    margin-bottom: 20px;
}

.deck-icon.commander {
    border-color: #8b5cf6;
}

.deck-icon.pauper {
    border-color: #10b981;
}

.deck-stats {
    margin: 15px 0;
}

/* Usamos las variables globales que definimos en main.css */
</style>