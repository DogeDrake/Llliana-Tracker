<template>
    <div class="app-container fade-in">
        <header class="home-header">
            <span class="badge">ARCHIVO DE PLANESWALKER</span>
            <h1 class="main-title">Historial de Partidas</h1>
            <p class="subtitle">Registros de todos los encuentros en el plano.</p>
        </header>

        <div v-if="loading" class="loading-container">
            <div class="spinner"></div>
            <p class="subtitle">Buscando en los anales...</p>
        </div>

        <div v-else-if="matches.length === 0" class="empty-state-card card-inner">
            <div class="avatar" style="margin: 0 auto 20px;">📜</div>
            <h2>No hay registros</h2>
            <p class="subtitle" style="margin-bottom: 20px;">Aún no hay historias que contar en este plano.</p>
            <router-link to="/partida/nueva" class="btn-action" style="max-width: 250px; margin: 0 auto;">
                Registrar mi primera partida
            </router-link>
        </div>

        <div v-else class="grid-historial">
            <div v-for="(match, index) in matches" :key="match.id" class="player-card"
                :style="{ animationDelay: (index * 0.1) + 's' }">

                <div class="card-inner match-card-glass">
                    <div class="match-card-top">
                        <span :class="['format-tag', match.formato]">{{ match.formato }}</span>
                        <span class="date-label">{{ formatDate(match.fecha_partida) }}</span>
                    </div>

                    <div class="participants-grid">
                        <div v-for="p in match.match_participants" :key="p.id" class="participant-item"
                            :class="{ 'winner-item': p.is_winner }">

                            <div class="p-info">
                                <span class="p-name">{{ p.profiles?.username || p.player_name_manual }}</span>
                                <span class="p-deck">{{ p.decks?.nombre_personalizado || p.deck_name_manual }}</span>
                            </div>

                            <div v-if="p.is_winner" class="winner-icon">🏆</div>
                        </div>
                    </div>

                    <div v-if="match.notas_globales" class="match-notes">
                        <span class="notes-icon">💬</span>
                        <p>"{{ match.notas_globales }}"</p>
                    </div>
                </div>
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
/* Reutilizamos las bases del estilo v2.0 que te gusta */

.grid-historial {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 40px;
}

.match-card-glass {
    border-radius: 24px;
    padding: 20px;
}

.match-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 12px;
}

/* FORMAT TAGS */
.format-tag {
    font-size: 0.65rem;
    font-weight: 900;
    padding: 4px 12px;
    border-radius: 50px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.format-tag.commander {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.format-tag.pauper {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.date-label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 600;
}

/* PARTICIPANTES */
.participants-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
}

.participant-item {
    background: rgba(15, 23, 42, 0.3);
    padding: 12px;
    border-radius: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.02);
    transition: 0.3s;
}

.participant-item.winner-item {
    background: rgba(234, 179, 8, 0.05);
    border: 1px solid rgba(234, 179, 8, 0.2);
}

.p-info {
    display: flex;
    flex-direction: column;
}

.p-name {
    font-size: 0.85rem;
    font-weight: 800;
    color: #f1f5f9;
}

.p-deck {
    font-size: 0.7rem;
    color: #64748b;
    font-weight: 500;
}

.winner-icon {
    font-size: 1rem;
    filter: drop-shadow(0 0 5px rgba(234, 179, 8, 0.5));
}

/* NOTAS */
.match-notes {
    margin-top: 18px;
    background: rgba(255, 255, 255, 0.02);
    padding: 12px;
    border-radius: 12px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
}

.notes-icon {
    font-size: 0.9rem;
    opacity: 0.5;
}

.match-notes p {
    font-size: 0.8rem;
    color: #94a3b8;
    font-style: italic;
    line-height: 1.4;
}

/* LOADING STATE */
.loading-container {
    text-align: center;
    padding: 50px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Adaptación para móviles estrechos */
@media (max-width: 480px) {
    .participants-grid {
        grid-template-columns: 1fr;
    }
}
</style>