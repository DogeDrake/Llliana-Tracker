<template>
    <div class="auth-page">
        <div class="portal-glow"></div>

        <div class="auth-card card-inner fade-in">
            <header class="auth-header">
                <div class="logo-orb">💀</div>
                <h1 class="main-title">Lilliana<span>Tracker</span></h1>
                <p class="subtitle">Identifícate, Duelista</p>
            </header>

            <form @submit.prevent="handleLogin" class="auth-form">
                <div class="input-wrapper">
                    <span class="input-icon">📧</span>
                    <input v-model="email" type="email" placeholder="Email" required class="glass-input" />
                </div>

                <div class="input-wrapper">
                    <span class="input-icon">🔑</span>
                    <input v-model="password" type="password" placeholder="Contraseña" required class="glass-input" />
                </div>

                <button type="submit" class="btn-action main-save-btn" :disabled="loading">
                    <span v-if="!loading">INVOCAR SESIÓN</span>
                    <div v-else class="spinner-small"></div>
                </button>
            </form>

            <footer class="auth-footer">
                <p class="switch">
                    ¿Eres nuevo en el plano?
                    <router-link to="/register">Crea una cuenta</router-link>
                </p>
            </footer>
        </div>
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
        router.push('/')
    } catch (error) {
        alert('Error: ' + error.message)
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
/* 1. FONDO DE PÁGINA COMPLETA */
.auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
    padding: 20px;
    position: relative;
    overflow: hidden;
}

.portal-glow {
    position: absolute;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 0;
}

/* 2. TARJETA DE LOGIN */
.auth-card {
    width: 100%;
    max-width: 400px;
    padding: 40px 30px;
    z-index: 1;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.auth-header {
    margin-bottom: 30px;
}

.logo-orb {
    width: 60px;
    height: 60px;
    background: rgba(15, 23, 42, 0.6);
    border: 2px solid rgba(59, 130, 246, 0.4);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 15px;
    font-size: 1.8rem;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
}

.main-title span {
    color: #3b82f6;
    font-weight: 300;
}

/* 3. INPUTS CON ICONOS */
.auth-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: 15px;
    font-size: 1.1rem;
    opacity: 0.6;
}

.glass-input {
    width: 100%;
    padding: 14px 14px 14px 45px;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    color: white;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.glass-input:focus {
    outline: none;
    background: rgba(15, 23, 42, 0.8);
    border-color: #3b82f6;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
}

/* 4. BOTÓN Y FOOTER */
.main-save-btn {
    margin-top: 10px;
    height: 55px;
    border-radius: 16px;
    font-size: 0.9rem;
    letter-spacing: 2px;
}

.auth-footer {
    margin-top: 25px;
}

.switch {
    font-size: 0.85rem;
    color: #64748b;
}

.switch a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 800;
}

.switch a:hover {
    text-decoration: underline;
}

/* ANIMACIÓN */
.spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>