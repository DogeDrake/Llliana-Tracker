<template>
    <div class="auth-viewport">
        <div class="mana-particles"></div>

        <div class="auth-card card-inner fade-in wide-card">
            <header class="auth-header">
                <div class="logo-orb emerald">✨</div>
                <h1 class="main-title">Nueva <span>Cuenta</span></h1>
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
                        <input type="checkbox" v-model="acceptTerms" class="hidden-checkbox" required />
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
    if (!acceptTerms.value) {
        alert("Debes aceptar los términos.");
        return;
    }

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

        alert('¡Invocación exitosa! Revisa tu email para confirmar la cuenta.')
        router.push('/login')
    } catch (error) {
        alert('Error en la forja: ' + error.message)
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.auth-viewport {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #020617;
    background: radial-gradient(circle at center, #064e3b 0%, #020617 100%);
    z-index: 1000;
    overflow-y: auto;
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

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
}

.field-label {
    display: block;
    font-size: 0.65rem;
    font-weight: 800;
    color: #10b981;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    text-align: left;
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
    z-index: 2;
}

.glass-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px;
    padding: 12px 12px 12px 42px;
    color: #fff;
    transition: 0.3s;
}

.glass-input:focus {
    outline: none;
    border-color: #10b981 !important;
    background: rgba(0, 0, 0, 0.5) !important;
}

/* ESTILOS DEL CHECKBOX - AQUÍ ESTABA EL ERROR */
.hidden-checkbox {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
}

.custom-checkbox {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    position: relative;
}

.checkmark {
    width: 20px;
    height: 20px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    display: inline-block;
    transition: 0.3s;
    flex-shrink: 0;
}

.hidden-checkbox:checked+.checkmark {
    background-color: #10b981;
    border-color: #10b981;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
    background-size: 14px;
    background-repeat: no-repeat;
    background-position: center;
}

.legal-text {
    font-size: 0.75rem;
    color: #94a3b8;
    text-align: left;
}

@media (max-width: 580px) {
    .form-grid {
        grid-template-columns: 1fr;
    }
}
</style>