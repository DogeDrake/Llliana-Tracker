<template>
    <div class="auth-container">
        <h1>Lilliana Tracker</h1>
        <p>Identifícate, Duelista</p>

        <form @submit.prevent="handleLogin">
            <input v-model="email" type="email" placeholder="Email" required />
            <input v-model="password" type="password" placeholder="Contraseña" required />

            <button type="submit" :disabled="loading">
                {{ loading ? 'Iniciando sesión...' : 'Entrar' }}
            </button>
        </form>

        <p class="switch">¿Eres nuevo? <router-link to="/register">Crea una cuenta</router-link></p>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
    loading.value = true
    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.value,
            password: password.value
        })
        if (error) throw error
        router.push('/') // Vamos al Dashboard
    } catch (error) {
        alert('Error: ' + error.message)
    } finally {
        loading.value = false
    }
}
</script>