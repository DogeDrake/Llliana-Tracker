<template>
    <div class="page">
        <header class="section-header">
            <h1>Historial de Duelos</h1>
            <p>Todos los encuentros registrados en el plano.</p>
        </header>

        <div v-if="loading" class="loading">Buscando en el archivo...</div>

        <div v-else-if="matches.length === 0" class="empty">
            <p>Aún no hay registros. ¡Ve a jugar!</p>
            <router-link to="/partida/nueva" class="btn-primary">Registrar mi primer duelo</router-link>
        </div>

        <div v-else class="matches-list">
            <div v-for="match in matches" :key="match.id" class="match-card">
                <div class="match-header">
                    <span :class="['badge', match.formato]">{{ match.formato }}</span>
                    <span class="date">{{ formatDate(match.fecha_partida) }}</span>
                </div>

                <div class="participants">
                    <div v-for="p in match.match_participants" :key="p.id"
                        :class="['participant', { winner: p.is_winner }]">
                        <span class="player-name">{{ p.profiles?.username || p.player_name_manual }}</span>
                        <span class="deck-name">{{ p.decks?.nombre_personalizado || p.deck_name_manual }}</span>
                        <span v-if="p.is_winner" class="crown">🏆</span>
                    </div>
                </div>

                <p v-if="match.notas_globales" class="notes">"{{ match.notas_globales }}"</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'

const matches = ref([])
const loading = ref(true)

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
}

onMounted(async () => {
    try {
        // Consulta "mágica": Traemos la partida + participantes + el perfil del usuario + el mazo
        const { data, error } = await supabase
            .from('matches')
            .select(`
        *,
        match_participants (
          *,
          profiles (username),
          decks (nombre_personalizado)
        )
      `)
            .order('fecha_partida', { ascending: false })

        if (error) throw error
        matches.value = data
    } catch (err) {
        console.error('Error cargando historial:', err.message)
    } finally {
        loading.value = false
    }
})
</script>

<style scoped>
.matches-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.match-card {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 15px;
    border-left: 5px solid #334155;
}

.match-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 0.8rem;
}

.badge {
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: bold;
}

.badge.commander {
    background: #8b5cf6;
    color: white;
}

.badge.pauper {
    background: #f59e0b;
    color: white;
}

.participants {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.participant {
    font-size: 0.9rem;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
}

.participant.winner {
    border: 1px solid #eab308;
    background: rgba(234, 179, 8, 0.1);
}

.player-name {
    font-weight: bold;
}

.deck-name {
    font-size: 0.75rem;
    color: #94a3b8;
}

.notes {
    margin-top: 10px;
    font-style: italic;
    font-size: 0.85rem;
    color: #64748b;
    border-top: 1px solid #334155;
    padding-top: 8px;
}
</style>