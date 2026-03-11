<template>
    <div class="auth-viewport">
        <div class="auth-card fade-in">
            <header class="auth-header">
                <div class="logo-orb shield-glow">🛡️</div>
                <h1 class="main-title">Nueva <span>Seguridad</span></h1>
                <p class="subtitle">Forja una nueva contraseña para tu cuenta</p>
            </header>

            <form @submit.prevent="handlePasswordUpdate" class="auth-form">

                <transition name="slide-fade">
                    <div v-if="message" class="status-banner" :class="isError ? 'error-bg' : 'success-bg'">
                        {{ message }}
                    </div>
                </transition>

                <div class="form-section">
                    <div class="input-wrapper">
                        <span class="input-icon">🔑</span>
                        <input v-model="password" :type="showPassword ? 'text' : 'password'"
                            placeholder="Nueva Contraseña" required minlength="6" class="minimal-input password-input"
                            :disabled="loading || success" />
                        <button type="button" class="toggle-eye" @click="showPassword = !showPassword" tabindex="-1">
                            {{ showPassword ? '🙈' : '👁️' }}
                        </button>
                    </div>

                    <div class="input-wrapper mt-2">
                        <span class="input-icon">🔐</span>
                        <input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'"
                            placeholder="Confirmar Contraseña" required class="minimal-input"
                            :disabled="loading || success" :class="{ 'input-error': passwordMismatch }" />
                    </div>
                    <span v-if="passwordMismatch" class="field-error">Las contraseñas no coinciden</span>
                </div>

                <button v-if="!success" type="submit" class="btn-action main-save-btn aura-blue"
                    :disabled="loading || passwordMismatch || !password">
                    <span v-if="!loading">ACTUALIZAR CONTRASEÑA</span>
                    <div v-else class="spinner-small"></div>
                </button>

                <button v-else type="button" @click="router.push('/login')" class="btn-action main-save-btn aura-green">
                    VOLVER AL LOGIN
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const message = ref('')
const isError = ref(false)
const success = ref(false)

const passwordMismatch = computed(() => {
    return confirmPassword.value.length > 0 && password.value !== confirmPassword.value
})

const handlePasswordUpdate = async () => {
    if (passwordMismatch.value || password.value.length < 6) return

    loading.value = true
    message.value = ''
    isError.value = false

    try {
        // En el flujo de recuperación, Supabase ya tiene una sesión activa aquí
        const { error } = await supabase.auth.updateUser({
            password: password.value
        })

        if (error) throw error

        success.value = true
        isError.value = false
        message.value = '¡Contraseña reforjada con éxito! Ya puedes iniciar sesión.'

    } catch (error) {
        isError.value = true
        message.value = 'El hechizo falló: ' + error.message
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.auth-viewport {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #020617;
    padding: 20px;
}

.auth-card {
    width: 100%;
    max-width: 440px;
    padding: 40px;
    background: rgba(30, 41, 59, 0.7);
    border-radius: 28px;
    border: 1px solid rgba(59, 130, 246, 0.2);
    text-align: center;
    backdrop-filter: blur(16px);
}

.auth-header {
    margin-bottom: 30px;
}

.logo-orb {
    font-size: 2.5rem;
    margin-bottom: 15px;
    display: inline-block;
}

.shield-glow {
    filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.6));
}

.main-title {
    font-size: 2rem;
    font-weight: 900;
    margin: 0;
    color: white;
}

.main-title span {
    color: #3b82f6;
}

.subtitle {
    font-size: 0.9rem;
    color: #94a3b8;
    margin-top: 8px;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 15px;
    text-align: left;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.mt-2 {
    margin-top: 5px;
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
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    color: white;
    font-size: 0.95rem;
    transition: 0.3s;
}

.minimal-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(15, 23, 42, 1);
}

.input-error {
    border-color: #ef4444 !important;
}

.field-error {
    color: #f87171;
    font-size: 0.75rem;
    padding-left: 5px;
    margin-top: -10px;
}

.password-input {
    padding-right: 45px;
}

.toggle-eye {
    position: absolute;
    right: 15px;
    background: transparent;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    opacity: 0.6;
}

.toggle-eye:hover {
    opacity: 1;
}

.status-banner {
    padding: 12px 15px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
}

.error-bg {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
}

.success-bg {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #6ee7b7;
}

/* Animaciones */
.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateY(-10px);
    opacity: 0;
}

.fade-in {
    animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(15px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Botones */
.aura-blue {
    background: #3b82f6;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.aura-blue:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-2px);
}

.aura-green {
    background: #10b981;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.aura-green:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-2px);
}

.main-save-btn {
    width: 100%;
    height: 55px;
    border-radius: 12px;
    font-weight: 900;
    letter-spacing: 1px;
    border: none;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 10px;
}

.main-save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
}

.spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>