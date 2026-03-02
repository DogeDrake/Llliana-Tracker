<template>
    <div class="page">
        <div class="home-header">
            <span class="badge">Registro de Batalla</span>
            <h2 class="main-title">Registrar Partida</h2>
        </div>

        <div class="format-selector">
            <button :class="{ active: form.formato === 'commander' }" @click="changeFormat('commander')">
                👑 Commander
            </button>
            <button :class="{ active: form.formato === 'pauper' }" @click="changeFormat('pauper')">
                🃏 Pauper
            </button>
        </div>

        <form @submit.prevent="saveMatch" class="fade-in">
            <div class="players-list">
                <div v-for="(p, index) in participantsCount" :key="index" class="player-slot"
                    :style="{ borderColor: form.formato === 'commander' ? '#3b82f6' : '#10b981' }">
                    <div class="card-top" style="margin-bottom: 10px;">
                        <h4>Jugador {{ index + 1 }}</h4>
                    </div>

                    <input v-model="participants[index].name" placeholder="Nombre o @Usuario" class="form-input" />

                    <input v-model="participants[index].deck"
                        :placeholder="form.formato === 'commander' ? 'Comandante' : 'Mazo/Arquetipo'"
                        class="form-input" />

                    <label class="winner-label">
                        <input type="radio" :value="index" v-model="winnerIndex" />
                        <span>¿Ha ganado la partida?</span>
                    </label>
                </div>
            </div>

            <textarea v-model="form.notas"
                placeholder="Notas de la partida (ej: 'Ganó por combo' o 'Partida de 3 horas')..."
                class="form-textarea"></textarea>

            <button type="submit" class="btn-action" :disabled="loading" :class="form.formato">
                {{ loading ? 'Lanzando hechizo de guardado...' : 'Finalizar y Guardar' }}
            </button>
        </form>
    </div>
</template>

<script setup>
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
    // Opcional: limpiar campos para evitar datos cruzados
    participants.value.forEach(p => { p.name = ''; p.deck = '' })
    winnerIndex.value = 0
}

async function saveMatch() {
    // Validación: El ganador debe tener un mazo/comandante
    if (!participants.value[winnerIndex.value].deck) {
        alert("¡No puedes ganar sin un mazo! Indica el comandante o arquetipo del ganador.")
        return
    }

    loading.value = true

    try {
        const { data: { session } } = await supabase.auth.getSession()
        const creatorId = session?.user?.id

        // 1. Crear el registro de la partida
        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert([{
                formato: form.value.formato,
                notas: form.value.notas,
                creado_por: creatorId,
                fecha: new Date().toISOString()
            }])
            .select()
            .single()

        if (matchError) throw matchError

        // 2. Preparar participantes filtrando slots vacíos
        const participantsToSave = participants.value
            .slice(0, participantsCount.value)
            .filter(p => p.deck.trim() !== '')
            .map((p, index) => ({
                match_id: matchData.id,
                player_name: p.name || 'Anónimo',
                deck_name: p.deck,
                is_winner: index === winnerIndex.value
            }))

        // 3. Insertar participantes
        const { error: partError } = await supabase
            .from('match_participants')
            .insert(participantsToSave)

        if (partError) throw partError

        alert("✨ Registro completado.")
        router.push('/historial')

    } catch (error) {
        console.error("Error:", error)
        alert("Fallo en la Matrix: " + error.message)
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
/* Aprovechamos tus clases globales y añadimos los ajustes de los inputs */
.form-input,
.form-textarea {
    width: 100%;
    padding: 12px;
    margin-bottom: 10px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
}

.form-textarea {
    height: 100px;
    resize: none;
    margin-top: 20px;
}

.winner-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    color: #94a3b8;
    cursor: pointer;
}

.winner-label input[type="radio"] {
    accent-color: #10b981;
    width: 18px;
    height: 18px;
}

.btn-action.pauper {
    background: linear-gradient(135deg, #10b981, #059669);
}
</style>