<template>
    <div class="page" v-if="player">
        <div class="profile-header">
            <div class="big-avatar">{{ player.username?.charAt(0).toUpperCase() }}</div>
            <h1>{{ player.username }}</h1>
            <p class="bio">{{ player.bio || 'Sin biografía de duelista' }}</p>
        </div>

        <section class="versus-section">
            <h3>Tu historial contra {{ player.username }}</h3>
            <div class="vs-stats">
                <div class="vs-stat">
                    <span class="label">Victorias</span>
                    <span class="value win">?</span>
                </div>
                <div class="vs-stat">
                    <span class="label">Derrotas</span>
                    <span class="value loss">?</span>
                </div>
            </div>
        </section>

        <section class="decks-section">
            <h3>Grimorio de {{ player.username }}</h3>
            <div v-for="deck in decks" :key="deck.id" class="deck-mini-card">
                <span class="dot" :class="deck.formato"></span>
                <div class="deck-details">
                    <strong>{{ deck.nombre_personalizado || deck.comandante_nombre }}</strong>
                    <span>{{ deck.formato }}</span>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/supabaseClient'

const route = useRoute()
const player = ref(null)
const decks = ref([])

onMounted(async () => {
    const playerId = route.params.id

    // 1. Cargar perfil del otro jugador
    const { data: p } = await supabase.from('profiles').select('*').eq('id', playerId).single()
    player.value = p

    // 2. Cargar sus mazos
    const { data: d } = await supabase.from('decks').select('*').eq('user_id', playerId).eq('is_active', true)
    decks.value = d
})
</script>

<style scoped>
.profile-header {
    text-align: center;
    margin-bottom: 30px;
}

.big-avatar {
    width: 80px;
    height: 80px;
    background: #8b5cf6;
    border-radius: 50%;
    margin: 0 auto 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
}

.versus-section {
    background: #1e1b4b;
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 25px;
    border: 1px solid #4338ca;
}

.vs-stats {
    display: flex;
    justify-content: space-around;
    margin-top: 15px;
}

.vs-stat {
    text-align: center;
}

.vs-stat .value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
}

.win {
    color: #10b981;
}

.loss {
    color: #ef4444;
}

.deck-mini-card {
    background: var(--card-bg);
    padding: 12px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    border: 1px solid #334155;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 12px;
}

.commander {
    background: #8b5cf6;
}

.pauper {
    background: #f59e0b;
}

.deck-details {
    display: flex;
    flex-direction: column;
}

.deck-details span {
    font-size: 0.7rem;
    color: #94a3b8;
}
</style>