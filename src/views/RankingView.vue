<template>
    <div class="page">
        <h2>🏆 Hall of Fame</h2>
        <div class="ranking-list">
            <div v-for="(player, index) in leaders" :key="player.id" class="rank-item">
                <span class="pos">#{{ index + 1 }}</span>
                <span class="name">{{ player.username }}</span>
                <span class="wr">{{ player.win_rate }}% WR</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'

const leaders = ref([])

onMounted(async () => {
    // Aquí haríamos una llamada a una "View" de RPC en Supabase que calcule el WR
    // Por ahora simulamos datos
    leaders.value = [
        { username: 'Presi77', win_rate: 68 },
        { username: 'Caramanzana', win_rate: 54 },
        { username: 'DuelistaAnonimo', win_rate: 42 }
    ]
})
</script>