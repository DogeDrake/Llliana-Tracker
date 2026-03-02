<template>
    <div class="auth-container">
        <h1>Crear Cuenta</h1>
        <p>Únete a la comunidad de duelistas</p>

        <form @submit.prevent="handleRegister">
            <input v-model="email" type="email" placeholder="Email" required />
            <input v-model="password" type="password" placeholder="Contraseña (mín. 6 carac.)" required />
            <input v-model="username" type="text" placeholder="Username (ej: Presi77)" required />
            <input v-model="displayName" type="text" placeholder="Nombre Real (opcional)" />

            <div class="legal">
                <input type="checkbox" v-model="acceptTerms" id="terms" required />
                <label for="terms">Acepto la política de privacidad y cookies (LSSI-CE/RGPD)</label>
            </div>

            <button type="submit" :disabled="loading">
                {{ loading ? 'Registrando...' : 'Registrarse' }}
            </button>
        </form>

        <p class="switch">¿Ya tienes cuenta? <router-link to="/login">Entra aquí</router-link></p>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const username = ref('')
const displayName = ref('')
const acceptTerms = ref(false)
const loading = ref(false)

const handleRegister = async () => {
    loading.value = true
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.value,
            password: password.value,
            options: {
                data: {
                    username: username.value,
                    display_name: displayName.value
                }
            }
        })
        if (error) throw error
        alert('¡Registro casi completado! Revisa tu email o entra directamente si desactivaste la confirmación.')
        router.push('/login')
    } catch (error) {
        alert(error.message)
    } finally {
        loading.value = false
    }
}
</script>