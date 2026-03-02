<template>
    <div class="auth-viewport">
        <div class="mana-particles"></div>

        <div class="auth-card card-inner fade-in wide-card">
            <header class="auth-header">
                <div class="logo-orb emerald">✨</div>
                <h1 class="main-title">Nueva Cuenta </h1>
                <p class="subtitle">Únete a la hermandad de duelistas</p>
            </header>

            <form @submit.prevent="handleRegister" class="auth-form">
                <div class="form-grid">
                    <div class="input-group">
                        <label class="field-label">CREDENCIALES</label>
                        <div class="input-wrapper">
                            <span class="input-icon">📧</span>
                            <input v-model="email" type="email" placeholder="tu@email.com" required
                                class="glass-input" />
                        </div>
                        <div class="input-wrapper">
                            <span class="input-icon">🔑</span>
                            <input v-model="password" type="password" placeholder="Contraseña" required
                                class="glass-input" />
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="field-label">IDENTIDAD</label>
                        <div class="input-wrapper">
                            <span class="input-icon">🆔</span>
                            <input v-model="username" type="text" placeholder="Username" required class="glass-input" />
                        </div>
                        <div class="input-wrapper">
                            <span class="input-icon">👤</span>
                            <input v-model="displayName" type="text" placeholder="Nombre Real" class="glass-input" />
                        </div>
                    </div>
                </div>

                <div class="legal-box">
                    <label class="custom-checkbox">
                        <input type="checkbox" v-model="acceptTerms" required />
                        <span class="checkmark"></span>
                        <span class="legal-text">Acepto la política de privacidad y cookies</span>
                    </label>
                </div>

                <button type="submit" class="btn-action main-save-btn pauper" :disabled="loading">
                    <span v-if="!loading">FORJAR CUENTA</span>
                    <div v-else class="spinner-small"></div>
                </button>
            </form>

            <footer class="auth-footer">
                <p class="switch">
                    ¿Ya tienes cuenta?
                    <router-link to="/login">Entra aquí</router-link>
                </p>
            </footer>
        </div>
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
<style scoped>
/* 1. ELIMINAR BORDES Y ASEGURAR COBERTURA TOTAL */
.auth-viewport {
    position: fixed;
    /* Ocupa toda la pantalla sin importar el scroll del body */
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #020617;
    /* Color base sólido para evitar fugas */
    background: radial-gradient(circle at center, #064e3b 0%, #020617 100%);
    z-index: 1000;
    overflow-y: auto;
    /* Permite scroll si el móvil es muy pequeño */
    padding: 20px;
}

.mana-particles {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(#10b981 1px, transparent 1px);
    background-size: 40px 40px;
    opacity: 0.1;
    pointer-events: none;
}

/* 2. CARD REIMAGINADA */
.wide-card {
    max-width: 550px;
    width: 100%;
    padding: 35px;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* 3. INPUTS CON ESTILO (ADIÓS A LO HORRIBLE) */
.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 25px;
    margin-bottom: 25px;
}

.field-label {
    display: block;
    font-size: 0.65rem;
    font-weight: 800;
    color: #10b981;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    text-align: left;
    opacity: 0.8;
}

.input-wrapper {
    position: relative;
    margin-bottom: 12px;
}

.input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1rem;
    z-index: 2;
    pointer-events: none;
}

.glass-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px;
    padding: 12px 12px 12px 42px;
    color: #fff;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.glass-input:focus {
    outline: none;
    border-color: #10b981 !important;
    background: rgba(0, 0, 0, 0.5) !important;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}

/* Evitar que el autofill de Google Chrome rompa el estilo */
.glass-input:-webkit-autofill {
    -webkit-text-fill-color: white !important;
    -webkit-box-shadow: 0 0 0px 1000px #0f172a inset !important;
    transition: background-color 5000s ease-in-out 0s;
}

/* 4. ELEMENTOS DE CONTROL */
.legal-box {
    background: rgba(255, 255, 255, 0.03);
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 25px;
}

.custom-checkbox {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    text-align: left;
}

.checkmark {
    width: 20px;
    height: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    /* Un poco más redondeado queda mejor */
    background: rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.custom-checkbox input:checked+.checkmark {
    background: #10b981;
    border-color: #10b981;
    /* Usamos solo el SVG como fondo, es más limpio */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
    background-size: 12px;
    background-repeat: no-repeat;
    background-position: center;
}

.custom-checkbox input:checked+.checkmark::after {
    content: none !important;
    /* Esto elimina el check de texto */
}

.legal-text {
    font-size: 0.75rem;
    color: #94a3b8;
    line-height: 1.2;
}

/* RESPONSIVE */
@media (max-width: 580px) {
    .form-grid {
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .auth-card {
        padding: 25px 20px;
    }
}
</style>