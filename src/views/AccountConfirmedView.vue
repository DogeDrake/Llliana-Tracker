<template>
    <div class="auth-viewport">
        <div class="auth-card fade-in">
            <header class="auth-header">
                <div class="logo-orb success-glow">✨</div>
                <h1 class="main-title">Chispa <span>Encendida</span></h1>
                <p class="subtitle">Tu cuenta ha sido verificada en el multiverso.</p>
            </header>

            <div class="welcome-content">
                <p class="lore-text">
                    Bienvenido, Planeswalker. Tu identidad ha sido confirmada y ya estás listo para registrar tus
                    partidas, forjar tus mazos y escalar en el ranking.
                </p>
            </div>

            <button @click="goToLogin" class="btn-action main-save-btn aura-green">
                <span>INICIAR SESIÓN</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToLogin = () => {
    router.push('/login')
}
</script>

<style scoped>
.auth-viewport {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #020617;
    /* Fondo global oscuro */
    padding: 20px;
}

.auth-card {
    width: 100%;
    max-width: 440px;
    padding: 40px;
    background: rgba(30, 41, 59, 0.7);
    border-radius: 28px;
    border: 1px solid rgba(16, 185, 129, 0.2);
    /* Borde verdoso sutil */
    text-align: center;
    backdrop-filter: blur(16px);
}

.auth-header {
    margin-bottom: 25px;
}

.logo-orb {
    font-size: 3rem;
    margin-bottom: 15px;
    display: inline-block;
}

.success-glow {
    filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.6));
}

.main-title {
    font-size: 2rem;
    font-weight: 900;
    margin: 0;
    color: white;
}

.main-title span {
    color: #10b981;
    /* Verde esmeralda para el éxito */
}

.subtitle {
    font-size: 0.9rem;
    color: #94a3b8;
    margin-top: 8px;
}

.welcome-content {
    background: rgba(15, 23, 42, 0.5);
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 30px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.lore-text {
    font-size: 0.95rem;
    color: #cbd5e1;
    line-height: 1.5;
    margin: 0;
}

/* Botón con aura verde */
.aura-green {
    background: #10b981;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.aura-green:hover {
    background: #059669;
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
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
}

.fade-in {
    animation: fadeIn 0.6s ease-out;
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
</style>