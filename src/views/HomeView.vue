<template>
    <div class="page">
        <header>
            <h1>Lilliana Tracker</h1>
            <p>Bienvenido, {{ profile?.username || 'Duelista' }}</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <span>Win Rate</span>
                <h3>{{ winRate }}%</h3>
            </div>
            <div class="stat-card">
                <span>Partidas</span>
                <h3>{{ totalMatches }}</h3>
            </div>
        </div>

        <section class="recent">
            <h4>Últimos Duelos</h4>
            <div v-for="match in recentMatches" :key="match.id" class="match-item">
                <span>{{ match.formato }}</span>
                <span>{{ new Date(match.fecha_partida).toLocaleDateString() }}</span>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'

const profile = ref(null)
const totalMatches = ref(0)
const winRate = ref(0)
const recentMatches = ref([])

onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    // Cargar perfil
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile.value = p

    // Cargar últimas 3 partidas
    const { data: m } = await supabase.from('matches').select('*').limit(3).order('fecha_partida', { ascending: false })
    recentMatches.value = m
})
</script>

<style scoped>
.page {
    padding: 20px;
    padding-bottom: 80px;
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin: 20px 0;
}

.stat-card {
    background: #1e293b;
    padding: 15px;
    border-radius: 12px;
    text-align: center;
    border: 1px solid #334155;
}

.stat-card span {
    font-size: 0.8rem;
    color: #94a3b8;
}

.match-item {
    background: #1e293b;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
}
</style>