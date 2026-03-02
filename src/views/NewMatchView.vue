<template>
    <div class="page">
        <h2>Registrar Duelo</h2>

        <div class="format-selector">
            <button :class="{ active: form.formato === 'commander' }"
                @click="form.formato = 'commander'">Commander</button>
            <button :class="{ active: form.formato === 'pauper' }" @click="form.formato = 'pauper'">Pauper</button>
        </div>

        <form @submit.prevent="saveMatch">
            <div class="players-list">
                <div v-for="(p, index) in participantsCount" :key="index" class="player-slot">
                    <h4>Jugador {{ index + 1 }}</h4>
                    <input v-model="participants[index].name" placeholder="Nombre o @Usuario" />
                    <input v-model="participants[index].deck"
                        :placeholder="form.formato === 'commander' ? 'Comandante' : 'Mazo/Arquetipo'" />
                    <label>
                        <input type="radio" :value="index" v-model="winnerIndex" /> ¿Ganador?
                    </label>
                </div>
            </div>

            <textarea v-model="form.notas" placeholder="Notas de la partida..."></textarea>

            <button type="submit" class="btn-save" :disabled="loading">
                {{ loading ? 'Guardando...' : 'Finalizar Partida' }}
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
const form = ref({ formato: 'commander', notas: '' })

// Participantes dinámicos
const participantsCount = computed(() => form.value.formato === 'commander' ? 4 : 2)
const participants = ref([
    { name: '', deck: '' }, { name: '', deck: '' }, { name: '', deck: '' }, { name: '', deck: '' }
])

async function saveMatch() {
    loading.value = true
    // Lógica de guardado en matches y match_participants aquí...
    // (Usando la lógica que definimos en pasos anteriores)
    alert("Partida registrada")
    router.push('/historial')
}
</script>

<style scoped>
.format-selector {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.format-selector button {
    flex: 1;
    padding: 10px;
    background: #1e293b;
    border: 1px solid #334155;
    color: white;
    border-radius: 8px;
}

.format-selector button.active {
    background: #3b82f6;
    border-color: #3b82f6;
}

.player-slot {
    background: #1e293b;
    padding: 15px;
    border-radius: 12px;
    margin-bottom: 10px;
    border-left: 4px solid #3b82f6;
}

.btn-save {
    width: 100%;
    padding: 15px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    font-size: 1rem;
}
</style>