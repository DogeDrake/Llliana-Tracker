<template>
    <div class="auth-viewport">
        <div class="auth-card fade-in">
            <header class="auth-header">
                <div class="logo-orb">💀</div>
                <h1 class="main-title">Lilliana<span>Tracker</span></h1>
                <p class="subtitle">Identifícate, Planeswalker</p>
            </header>

            <form @submit.prevent="handleLogin" class="auth-form">
                <div class="form-section">
                    <label class="section-tag">CREDENCIALES</label>
                    <div class="input-wrapper">
                        <span class="input-icon">📧</span>
                        <input v-model="email" type="email" placeholder="Email" required class="minimal-input" />
                    </div>

                    <div class="input-wrapper">
                        <span class="input-icon">🔑</span>
                        <input v-model="password" type="password" placeholder="Contraseña" required class="minimal-input" />
                    </div>
                </div>

                <button type="submit" class="btn-action main-save-btn aura-blue" :disabled="loading">
                    <span v-if="!loading">INVOCAR SESIÓN</span>
                    <div v-else class="spinner-small"></div>
                </button>
            </form>

            <footer class="auth-footer">
                <p class="switch">
                    ¿Eres nuevo en el plano?
                    <router-link to="/register" class="blue-link">Crea una cuenta</router-link>
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
/* UNIFICACIÓN CON REGISTRO */
.auth-viewport {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    padding: 20px;
}

.auth-card {
    width: 100%;
    max-width: 480px; /* Igual que registro */
    padding: 40px;
    background: rgba(30, 41, 59, 0.4);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
    backdrop-filter: blur(10px);
}

.auth-header {
    margin-bottom: 35px;
}

.logo-orb {
    font-size: 2rem;
    margin-bottom: 15px;
    display: inline-block;
    filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.5));
}

.main-title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    white-space: nowrap; /* Evita que se rompa el nombre */
}

.main-title span {
    color: #3b82f6; /* Azul Lilliana */
    font-weight: 300;
}

.subtitle {
    font-size: 0.9rem;
    color: #94a3b8;
    margin-top: 5px;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 25px;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
}

.section-tag {
    font-size: 0.7rem;
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
    padding-left: 5px;
    opacity: 0.8;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: 15px;
    font-size: 1rem;
    opacity: 0.6;
}

.minimal-input {
    width: 100%;
    padding: 14px 14px 14px 45px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    color: white;
    font-size: 0.95rem;
    transition: all 0.3s ease;
}

.minimal-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(15, 23, 42, 0.9);
}

/* BOTÓN ESTILO REGISTRO (Azul) */
.aura-blue {
    background: #3b82f6;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.aura-blue:hover {
    background: #2563eb;
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.main-save-btn {
    height: 55px;
    border-radius: 12px;
    font-weight: 800;
    letter-spacing: 1px;
    border: none;
    color: white;
    cursor: pointer;
    transition: 0.3s;
    margin-top: 10px;
}

.auth-footer {
    margin-top: 30px;
}

.switch {
    font-size: 0.9rem;
    color: #64748b;
}

.blue-link {
    color: #3b82f6 !important;
    text-decoration: none;
    font-weight: 700;
}

.blue-link:hover {
    text-decoration: underline;
}

/* RESPONSIVE */
@media (max-width: 480px) {
    .auth-card {
        padding: 30px 20px;
        background: transparent;
        border: none;
        backdrop-filter: none;
    }
    .main-title {
        font-size: 1.7rem; /* Reducimos un poco para que quepa en una línea */
    }
    .switch {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
}

.fade-in {
    animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
