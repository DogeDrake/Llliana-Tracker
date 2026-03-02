<template>
    <div class="page">
        <header class="section-header">
            <h1>Comunidad</h1>
            <div class="search-box">
                <input v-model="searchQuery" placeholder="Buscar por username (ej: Caramanzana)"
                    @input="searchPlayers" />
            </div>
        </header>

        <div v-if="loading" class="status">Buscando duelistas...</div>

        <div class="players-grid">
            <router-link :to="'/perfil/' + player.id" v-for="player in filteredPlayers" :key="player.id"
                class="player-card">
                <div class="avatar-circle">
                    {{ player.username?.charAt(0).toUpperCase() }}
                </div>
                <div class="player-info">
                    <h3>{{ player.username }}</h3>
                    <p>{{ player.display_name || 'Duelista estándar' }}</p>
                </div>
                <span class="chevron">→</span>
            </router-link>
        </div>

        <div v-if="!loading && filteredPlayers.length === 0" class="empty">
            No se han encontrado jugadores con ese nombre.
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'

const searchQuery = ref('')
const allPlayers = ref([])
const filteredPlayers = ref([])
const loading = ref(true)

const searchPlayers = () => {
    filteredPlayers.value = allPlayers.value.filter(p =>
        p.username.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
}

onMounted(async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .limit(50)

    if (!error) {
        allPlayers.value = data
        filteredPlayers.value = data
    }
    loading.value = false
})
</script>

<style scoped>
.search-box {
    margin: 15px 0;
}

.players-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.player-card {
    background: var(--card-bg);
    padding: 15px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    text-decoration: none;
    color: white;
    border: 1px solid #334155;
}

.avatar-circle {
    width: 45px;
    height: 45px;
    background: #3b82f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 15px;
}

.player-info h3 {
    margin: 0;
    font-size: 1rem;
}

.player-info p {
    margin: 0;
    font-size: 0.8rem;
    color: #94a3b8;
}

.chevron {
    margin-left: auto;
    color: #475569;
}
</style>