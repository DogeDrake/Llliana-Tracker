<template>
    <div class="page">
        <div class="profile-header">
            <div class="avatar">👤</div>
            <h2>{{ profile?.username }}</h2>
            <button @click="handleLogout" class="btn-logout">Cerrar Sesión</button>
        </div>

        <section>
            <div class="section-header">
                <h3>Mis Mazos (Grimorio)</h3>
                <button @click="showAddDeck = true" class="btn-add">Añadir</button>
            </div>

            <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck" />
        </section>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

const profile = ref(null)
const decks = ref([])

onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile.value = p

    const { data: d } = await supabase.from('decks').select('*').eq('user_id', user.id)
    decks.value = d
})

async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/Lilliana-Tracker/login'
}
</script>