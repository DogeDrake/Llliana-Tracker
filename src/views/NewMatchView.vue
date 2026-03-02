<template>
    <div class="app-container fade-in">
        <header class="home-header">
            <span class="badge">SISTEMA DE ARBITRAJE</span>
            <h2 class="main-title">Nueva Partida</h2>
            <p class="subtitle">Registra los detalles del encuentro en el plano.</p>
        </header>

        <div class="format-glass-selector">
            <button :class="{ active: form.formato === 'commander' }" @click="changeFormat('commander')"
                class="format-btn commander-btn">
                <span class="icon">👑</span> Commander
            </button>
            <button :class="{ active: form.formato === 'pauper' }" @click="changeFormat('pauper')"
                class="format-btn pauper-btn">
                <span class="icon">🃏</span> Pauper
            </button>
        </div>

        <form @submit.prevent="saveMatch" class="form-grid">

            <div class="players-list">
                <transition-group name="list">
                    <div v-for="(p, index) in participantsCount" :key="index" class="player-slot card-inner"
                        :class="{ 'winner-selected': winnerIndex === index }">

                        <div class="slot-header">
                            <h4>Jugador {{ index + 1 }}</h4>
                            <div class="winner-radio-wrapper">
                                <input type="radio" :id="'win' + index" :value="index" v-model="winnerIndex" />
                                <label :for="'win' + index">¿Ganador?</label>
                            </div>
                        </div>

                        <div class="input-group">
                            <input v-model="participants[index].name" placeholder="Nombre o @Usuario"
                                class="glass-input" />
                            <input v-model="participants[index].deck"
                                :placeholder="form.formato === 'commander' ? 'Nombre del Comandante' : 'Mazo / Arquetipo'"
                                class="glass-input" />
                        </div>
                    </div>
                </transition-group>
            </div>

            <div class="notes-container card-inner">
                <label class="format-label">CRÓNICA DE LA PARTIDA</label>
                <textarea v-model="form.notas"
                    placeholder="Ej: 'Ganó por combo de Kiki-Jiki' o 'Partida épica de 3 horas'..."
                    class="glass-textarea"></textarea>
            </div>

            <div class="action-footer">
                <button type="submit" class="btn-action main-save-btn" :disabled="loading" :class="form.formato">
                    <span v-if="!loading">✨ FINALIZAR Y GUARDAR</span>
                    <span v-else class="spinner-small"></span>
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
// ... (Toda tu lógica de script se mantiene igual, es perfecta)
import { ref, computed } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const winnerIndex = ref(0)
const form = ref({
    formato: 'commander',
    notas: ''
})

const participants = ref([
    { name: '', deck: '' },
    { name: '', deck: '' },
    { name: '', deck: '' },
    { name: '', deck: '' }
])

const participantsCount = computed(() => form.value.formato === 'commander' ? 4 : 2)

function changeFormat(newFormat) {
    form.value.formato = newFormat
    winnerIndex.value = 0
}

async function saveMatch() {
    if (!participants.value[winnerIndex.value].deck) {
        alert("¡El ganador debe tener un Comandante o Arquetipo!")
        return
    }

    loading.value = true
    try {
        const { data: { session } } = await supabase.auth.getSession()
        const creatorId = session?.user?.id
        if (!creatorId) throw new Error("No se encontró sesión de usuario")

        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert([{
                creator_id: creatorId,
                formato: form.value.formato,
                notas_globales: form.value.notas,
                fecha_partida: new Date().toISOString(),
                is_public: true
            }])
            .select().single()

        if (matchError) throw matchError

        const participantsToSave = participants.value
            .slice(0, participantsCount.value)
            .filter(p => p.deck.trim() !== '' || p.name.trim() !== '')
            .map((p, index) => ({
                match_id: matchData.id,
                player_name_manual: p.name || 'Anónimo',
                deck_name_manual: p.deck || 'Mazo desconocido',
                is_winner: index === winnerIndex.value,
                puesto: index === winnerIndex.value ? 1 : null
            }))

        const { error: partError } = await supabase
            .from('match_participants')
            .insert(participantsToSave)

        if (partError) throw partError
        router.push('/historial')
    } catch (error) {
        alert("Error: " + error.message)
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
/* REUTILIZANDO TU ESTILO v2.0 */

.format-glass-selector {
    display: flex;
    gap: 10px;
    background: rgba(15, 23, 42, 0.4);
    padding: 8px;
    border-radius: 20px;
    margin-bottom: 30px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.format-btn {
    flex: 1;
    padding: 12px;
    border-radius: 14px;
    border: none;
    background: transparent;
    color: #64748b;
    font-weight: 800;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.commander-btn.active {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
}

.pauper-btn.active {
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}

/* SLOTS DE JUGADORES */
.players-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.player-slot {
    padding: 20px;
    border-left: 4px solid rgba(255, 255, 255, 0.1);
    transition: 0.4s;
}

.player-slot.winner-selected {
    border-left-color: #fbbf24;
    background: rgba(251, 191, 36, 0.05);
}

.slot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.winner-radio-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: 800;
    color: #64748b;
}

.winner-radio-wrapper input {
    accent-color: #fbbf24;
    width: 18px;
    height: 18px;
}

/* INPUTS ESTILO GLASS */
.input-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.glass-input,
.glass-textarea {
    background: rgba(15, 23, 42, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    color: white;
    font-size: 0.85rem;
    transition: 0.3s;
}

.glass-input:focus,
.glass-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(15, 23, 42, 0.8);
}

.notes-container {
    margin-top: 30px;
    padding: 20px;
}

.glass-textarea {
    width: 100%;
    height: 100px;
    resize: none;
    margin-top: 10px;
}

.main-save-btn {
    margin-top: 30px;
    padding: 18px;
    font-size: 0.9rem;
    letter-spacing: 1px;
}

/* Animación de entrada de lista */
.list-enter-active,
.list-leave-active {
    transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(-30px);
}

@media (max-width: 480px) {
    .input-group {
        grid-template-columns: 1fr;
    }
}
</style>