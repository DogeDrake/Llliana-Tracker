<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

const router = useRouter()

// --- ESTADOS ---
const profile = ref(null)
const decks = ref([])
const history = ref([])
const loading = ref(true)
const errorMsg = ref(null)
const isSubmitting = ref(false)

// Modales
const showAddDeck = ref(false)
const showEditAvatar = ref(false)
const showDeckStats = ref(false)
const showExportModal = ref(false)

const newAvatarUrl = ref('')
const selectedDeckStats = ref(null)

// Basado exactamente en tu estructura de tabla 'decks'
const newDeck = reactive({
    nombre_personalizado: '',
    formato: 'commander',
    decklist_url: '',
    image_url: '',
    comandante_nombre: '',
    arquetipo_pauper: '',
    color_identity: []
})

const colorOptions = [
    { code: 'W', symbol: '☀️', name: 'White' },
    { code: 'U', symbol: '💧', name: 'Blue' },
    { code: 'B', symbol: '💀', name: 'Black' },
    { code: 'R', symbol: '🔥', name: 'Red' },
    { code: 'G', symbol: '🌳', name: 'Green' },
    { code: 'C', symbol: '💎', name: 'Colorless' }
]

const stats = reactive({
    totalMatches: 0,
    winRate: 0
})

// --- LÓGICA DE EXPORTACIÓN CSV ---
const downloadCSV = async (selectedFormat) => {
    try {
        showExportModal.value = false;
        const filteredDecks = decks.value.filter(d => d.formato === selectedFormat);
        const filteredHistory = history.value.filter(h => h.matches?.formato === selectedFormat);

        if (filteredHistory.length === 0 && filteredDecks.length === 0) {
            alert(`No hay datos registrados para el formato ${selectedFormat.toUpperCase()}`);
            return;
        }

        const matchIds = filteredHistory.map(h => h.match_id);
        const { data: allParticipants } = await supabase
            .from('match_participants')
            .select(`match_id, player_name_manual, deck_name_manual, is_winner, user_id, profiles(username, display_name)`)
            .in('match_id', matchIds);

        const SEP = ",";
        let csvContent = "\uFEFF"; 

        csvContent += `--- SECCION: MIS MAZOS (${selectedFormat.toUpperCase()}) ---\n`;
        csvContent += `Nombre${SEP}Comandante/Arquetipo${SEP}Colores\n`;

        filteredDecks.forEach(d => {
            const extra = d.formato === 'commander' ? d.comandante_nombre : d.arquetipo_pauper;
            const row = [d.nombre_personalizado, extra || '', d.color_identity || ''];
            csvContent += row.map(text => `"${String(text).replace(/"/g, '""')}"`).join(SEP) + "\n";
        });

        csvContent += "\n\n";
        const maxOpponents = 3;
        let headerPartidas = `Fecha${SEP}Mazo Usado${SEP}Resultado`;
        for (let i = 1; i <= maxOpponents; i++) { headerPartidas += `${SEP}Rival ${i}${SEP}Mazo Rival ${i}`; }
        headerPartidas += `${SEP}Winrate Mazo (Momento)${SEP}Winrate Global (Momento)\n`;

        csvContent += `--- SECCION: HISTORIAL DE PARTIDAS (${selectedFormat.toUpperCase()}) ---\n`;
        csvContent += headerPartidas;

        const chronologicalHistory = [...filteredHistory].sort((a, b) => new Date(a.matches.fecha_partida) - new Date(b.matches.fecha_partida));
        let globalWins = 0;
        const deckWinsCounter = {};
        const deckTotalCounter = {};

        chronologicalHistory.forEach((match, index) => {
            const myDeck = match.deck_name_manual || 'Desconocido';
            const isWin = match.is_winner;
            if (isWin) globalWins++;
            const currentGlobalWinrate = ((globalWins / (index + 1)) * 100).toFixed(2);
            deckTotalCounter[myDeck] = (deckTotalCounter[myDeck] || 0) + 1;
            if (isWin) deckWinsCounter[myDeck] = (deckWinsCounter[myDeck] || 0) + 1;
            const currentDeckWinrate = ((deckWinsCounter[myDeck] / deckTotalCounter[myDeck]) * 100).toFixed(2);

            const opponentsData = allParticipants?.filter(p => p.match_id === match.match_id && p.player_name_manual !== profile.value.username).map(p => {
                let displayName = p.player_name_manual;
                if (p.profiles) {
                    const nick = p.profiles.username;
                    const real = p.profiles.display_name;
                    displayName = real ? `${nick} (${real})` : nick;
                }
                return { name: displayName, deck: p.deck_name_manual || '?' };
            }) || [];

            const soloFecha = new Date(match.matches.fecha_partida).toLocaleDateString('es-ES');
            let rowArray = [soloFecha, myDeck, isWin ? "VICTORIA" : "DERROTA"];
            for (let i = 0; i < maxOpponents; i++) {
                if (opponentsData[i]) { rowArray.push(opponentsData[i].name, opponentsData[i].deck); } 
                else { rowArray.push("", ""); }
            }
            rowArray.push(`${currentDeckWinrate}%`, `${currentGlobalWinrate}%`);
            csvContent += rowArray.map(text => `"${String(text).replace(/"/g, '""')}"`).join(SEP) + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Reporte_${selectedFormat.toUpperCase()}_${profile.value.username}.csv`;
        link.click();
    } catch (err) { alert("No se pudo generar el CSV"); }
}

// --- LÓGICA DE IMPORTACIÓN CSV ---
const triggerImport = (format) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => processImport(e, format);
    input.click();
};

const processImport = async (event, selectedFormat) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        
        const rows = lines.map(line => {
                const columns = [];
                let current = '';
                let inQuotes = false;
                for (let char of line) {
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) {
                        columns.push(current.trim());
                        current = '';
                    } else current += char;
                }
                columns.push(current.trim());
                return columns.map(col => col.replace(/^"|"$/g, '').replace(/""/g, '"'));
            })
            .filter(row => row.length > 5 && row[0].toLowerCase() !== 'fecha');

        if (rows.length === 0) {
            alert("No se encontraron partidas válidas en el CSV.");
            return;
        }

        isSubmitting.value = true;
        let importedCount = 0;

        try {
            for (const row of rows) {
                const fechaStr = row[0];
                if (!fechaStr) continue;

                const [d, m, y] = fechaStr.split('/');
                const fechaISO = `${y}-${m}-${d}`;

                // 1. Crear la Partida (Asegurando creator_id según tu schema)
                const { data: matchData, error: mErr } = await supabase
                    .from('matches')
                    .insert([{ 
                        fecha_partida: fechaISO, 
                        formato: selectedFormat,
                        creator_id: profile.value.id 
                    }])
                    .select().single();

                if (mErr) throw mErr;

                // 2. Participantes
                const participants = [];
                const ganadorTexto = row[9];

                participants.push({
                    match_id: matchData.id,
                    player_name_manual: profile.value.username,
                    deck_name_manual: row[2],
                    is_winner: row[11]?.toUpperCase() === 'VICTORIA',
                    user_id: profile.value.id
                });

                [[3, 4], [5, 6], [7, 8]].forEach(([nameIdx, deckIdx]) => {
                    const rName = row[nameIdx];
                    const rDeck = row[deckIdx];
                    if (rName || rDeck) {
                        participants.push({
                            match_id: matchData.id,
                            player_name_manual: rName || 'Oponente',
                            deck_name_manual: rDeck || 'Desconocido',
                            is_winner: (ganadorTexto === rName || ganadorTexto === rDeck) && ganadorTexto !== ""
                        });
                    }
                });

                const { error: pErr } = await supabase.from('match_participants').insert(participants);
                if (pErr) throw pErr;
                importedCount++;
            }
            alert(`¡Éxito! Se han importado ${importedCount} partidas.`);
            showExportModal.value = false;
            await fetchStatsAndHistory(profile.value.id, profile.value.username);
        } catch (err) {
            alert("Error al importar: " + err.message);
        } finally {
            isSubmitting.value = false;
        }
    };
    reader.readAsText(file);
};

// --- CICLO DE VIDA ---
onMounted(async () => {
    try {
        loading.value = true
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            router.push('/login')
            return
        }

        const [profileRes, decksRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('decks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ])

        if (profileRes.error) throw profileRes.error

        profile.value = profileRes.data
        decks.value = decksRes.data || []
        newAvatarUrl.value = profile.value.avatar_url || ''

        await fetchStatsAndHistory(user.id, profile.value.username)

    } catch (err) {
        console.error("Error crítico:", err.message)
        errorMsg.value = "No se pudo cargar tu perfil."
    } finally {
        loading.value = false
    }
})

const fetchStatsAndHistory = async (userId, username) => {
    try {
        const { data, error } = await supabase
            .from('match_participants')
            .select(`is_winner, deck_name_manual, player_name_manual, match_id, matches(id, fecha_partida, formato)`)
            .or(`user_id.eq.${userId},player_name_manual.ilike.${username}`)
            .order('created_at', { ascending: false })

        if (error) throw error
        if (data) {
            history.value = data.filter(p => p.matches)
            const total = history.value.length
            const wins = history.value.filter(p => p.is_winner === true).length
            stats.totalMatches = total
            stats.winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0
        }
    } catch (e) { console.warn("Error historial:", e.message) }
}

const goToMatch = (id) => router.push(`/partida/${id}`)
const toggleColor = (c) => {
    const i = newDeck.color_identity.indexOf(c);
    if (i > -1) newDeck.color_identity.splice(i, 1);
    else newDeck.color_identity.push(c);
}

const openStats = async (deck) => {
    const possibleNames = [deck.nombre_personalizado?.toLowerCase(), deck.comandante_nombre?.toLowerCase(), deck.arquetipo_pauper?.toLowerCase()].filter(Boolean);
    const deckMatches = history.value.filter(h => h.deck_name_manual && possibleNames.includes(h.deck_name_manual.toLowerCase()));

    if (deckMatches.length === 0) {
        selectedDeckStats.value = { ...deck, empty: true };
        showDeckStats.value = true;
        return;
    }

    const wins = deckMatches.filter(m => m.is_winner).length;
    const matchIds = deckMatches.map(m => m.match_id);
    const { data: opponents } = await supabase.from('match_participants').select('player_name_manual, is_winner, match_id').in('match_id', matchIds).neq('player_name_manual', profile.value.username);

    const nemesisMap = {}, victimMap = {};
    deckMatches.forEach(dm => {
        opponents?.filter(o => o.match_id === dm.match_id).forEach(opp => {
            const name = opp.player_name_manual || 'Anónimo';
            if (dm.is_winner) victimMap[name] = (victimMap[name] || 0) + 1;
            else if (opp.is_winner) nemesisMap[name] = (nemesisMap[name] || 0) + 1;
        });
    });

    const getTop = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0] || [null, 0];
    selectedDeckStats.value = { ...deck, total: deckMatches.length, winRate: ((wins / deckMatches.length) * 100).toFixed(1), nemesis: getTop(nemesisMap), victim: getTop(victimMap) };
    showDeckStats.value = true;
}

const createDeck = async () => {
    if (!newDeck.nombre_personalizado) return
    isSubmitting.value = true
    try {
        const payload = {
            nombre_personalizado: newDeck.nombre_personalizado,
            formato: newDeck.formato,
            decklist_url: newDeck.decklist_url,
            image_url: newDeck.image_url,
            user_id: profile.value.id,
            color_identity: newDeck.color_identity.join(','),
            comandante_nombre: newDeck.formato === 'commander' ? newDeck.comandante_nombre : null,
            arquetipo_pauper: newDeck.formato === 'pauper' ? newDeck.arquetipo_pauper : null,
            is_active: true
        }
        const { data, error } = await supabase.from('decks').insert([payload]).select()
        if (error) throw error
        decks.value.unshift(data[0])
        showAddDeck.value = false
        resetForm()
    } catch (err) { alert(err.message) } finally { isSubmitting.value = false }
}

const resetForm = () => {
    Object.assign(newDeck, { nombre_personalizado: '', decklist_url: '', image_url: '', formato: 'commander', comandante_nombre: '', arquetipo_pauper: '', color_identity: [] })
}

const updateAvatar = async () => {
    if (!newAvatarUrl.value) return
    isSubmitting.value = true
    try {
        await supabase.from('profiles').update({ avatar_url: newAvatarUrl.value }).eq('id', profile.value.id)
        profile.value.avatar_url = newAvatarUrl.value
        showEditAvatar.value = false
    } catch (err) { alert(err.message) } finally { isSubmitting.value = false }
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '---'
const openDecklist = (url) => url && window.open(url, '_blank')
const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }
</script>

<template>
    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p class="invoking-text">Invocando perfil...</p>
    </div>

    <div v-else-if="errorMsg" class="error-container">
        <p>{{ errorMsg }}</p>
        <button @click="handleLogout" class="logout-btn">Reintentar / Salir</button>
    </div>

    <div v-else-if="profile" class="profile-view-root">
        <div class="relative-content fade-in">
            <header class="profile-main-header">
                <nav class="top-bar">
                    <span class="brand">LILLIANA TRACKER</span>
                    <div class="header-actions">
                        <button @click="showExportModal = true" class="export-btn" title="Gestionar Datos CSV">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Datos
                        </button>
                        <button @click="handleLogout" class="logout-btn">Cerrar Sesión</button>
                    </div>
                </nav>

                <div class="hero-section">
                    <div class="avatar-wrapper" @click="showEditAvatar = true">
                        <div v-if="profile.avatar_url" class="avatar-image-container">
                            <img :src="profile.avatar_url" class="avatar-image" />
                        </div>
                        <div v-else class="avatar-circle">{{ profile.username?.charAt(0).toUpperCase() }}</div>
                        <div class="avatar-glow"></div>
                        <div class="edit-overlay"><span>EDITAR</span></div>
                    </div>
                    <div class="hero-text">
                        <h1 class="username-title">{{ profile.username }}</h1>
                        <p class="rank-subtitle">{{ profile.bio || 'Planeswalker' }}</p>
                    </div>
                </div>

                <div class="quick-stats-row">
                    <div class="q-stat"><span class="q-num">{{ decks.length }}</span><span class="q-label">Mazos</span></div>
                    <div class="q-stat"><span class="q-num">{{ stats.totalMatches }}</span><span class="q-label">Partidas</span></div>
                    <div class="q-stat"><span class="q-num">{{ stats.winRate }}%</span><span class="q-label">Win Rate</span></div>
                </div>
            </header>

            <section class="content-section">
                <div class="section-header-bar">
                    <h2 class="section-title">Biblioteca de Mazos</h2>
                    <button @click="showAddDeck = true" class="add-deck-btn">+ NUEVO MAZO</button>
                </div>
                <div class="decks-layout-grid">
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck" @click="openDecklist(deck.decklist_url)" @show-stats="openStats(deck)" />
                    <div v-if="decks.length === 0" class="empty-state-card-mini">No has registrado mazos todavía.</div>
                </div>
            </section>

            <section class="content-section history-section-spacer">
                <h2 class="section-title">Últimas Partidas</h2>
                <div class="history-list">
                    <button v-for="entry in history" :key="entry.match_id" class="history-item-btn" @click="goToMatch(entry.match_id)">
                        <div class="h-date">{{ formatDate(entry.matches.fecha_partida) }}</div>
                        <div class="h-main">
                            <span class="h-deck">{{ entry.deck_name_manual || 'Mazo sin nombre' }}</span>
                            <span class="h-format">{{ entry.matches.formato }}</span>
                        </div>
                        <div class="h-result" :class="entry.is_winner ? 'win' : 'loss'">
                            {{ entry.is_winner ? 'VICTORIA' : 'DERROTA' }}
                            <span class="h-arrow">→</span>
                        </div>
                    </button>
                    <div v-if="history.length === 0" class="empty-history">Sin registros de partidas recientes.</div>
                </div>
            </section>
        </div>

        <div v-if="showAddDeck || showEditAvatar || showDeckStats || showExportModal" class="modal-overlay" @click.self="showAddDeck = false; showEditAvatar = false; showDeckStats = false; showExportModal = false">
            
            <div v-if="showExportModal" class="modal-content glass-modal export-selection-modal fade-in-up">
                <div class="modal-header">
                    <h3>GESTIONAR DATOS (CSV)</h3>
                    <button @click="showExportModal = false" class="close-btn-styled">✕</button>
                </div>
                <p class="modal-intro-text">Gestiona tus registros de partidas.</p>
                <div class="export-options-grid">
                    <div class="format-action-card" v-for="fmt in ['commander', 'pauper']" :key="fmt">
                        <span class="opt-icon">{{ fmt === 'commander' ? '👑' : '🛡️' }}</span>
                        <span class="opt-title">{{ fmt.toUpperCase() }}</span>
                        <div class="action-buttons-row">
                            <button @click="downloadCSV(fmt)" class="btn-mini-action export">Exportar</button>
                            <button @click="triggerImport(fmt)" class="btn-mini-action import">Importar</button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showDeckStats && selectedDeckStats" class="modal-content glass-modal stats-modal-large fade-in-up">
                <div class="modal-header">
                    <h3>ESTADÍSTICAS: {{ selectedDeckStats.nombre_personalizado }}</h3>
                    <button @click="showDeckStats = false" class="close-btn-styled">✕</button>
                </div>
                <div v-if="selectedDeckStats.empty" class="empty-state-stats">No hay partidas registradas con este mazo.</div>
                <div v-else class="stats-grid-container">
                    <div class="main-metrics">
                        <div class="metric-card"><span class="m-val">{{ selectedDeckStats.winRate }}%</span><span class="m-lab">Win Rate</span></div>
                        <div class="metric-card"><span class="m-val">{{ selectedDeckStats.total }}</span><span class="m-lab">Partidas</span></div>
                    </div>
                </div>
            </div>

            <div v-if="showAddDeck" class="modal-content glass-modal add-deck-modal fade-in-up">
                <div class="modal-header">
                    <h3>FORJAR NUEVO MAZO</h3>
                    <button @click="showAddDeck = false" class="close-btn-styled">✕</button>
                </div>
                <div class="magic-form">
                    <div class="input-group">
                        <label>Nombre Personalizado</label>
                        <input v-model="newDeck.nombre_personalizado" class="magic-input" placeholder="Ej: Mi Mazo Pro" />
                    </div>
                    
                    <div class="grid-2-col">
                        <div class="input-group">
                            <label>Formato</label>
                            <select v-model="newDeck.formato" class="magic-input">
                                <option value="commander">Commander</option>
                                <option value="pauper">Pauper</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label v-if="newDeck.formato === 'commander'">Comandante</label>
                            <label v-else>Arquetipo</label>
                            <input v-if="newDeck.formato === 'commander'" v-model="newDeck.comandante_nombre" class="magic-input" placeholder="Nombre de la carta..." />
                            <input v-else v-model="newDeck.arquetipo_pauper" class="magic-input" placeholder="Ej: Burn, Elves..." />
                        </div>
                    </div>

                    <div class="input-group">
                        <label>URL Decklist (Moxfield, Archidekt...)</label>
                        <input v-model="newDeck.decklist_url" class="magic-input" placeholder="https://..." />
                    </div>

                    <div class="input-group">
                        <label>URL Imagen Arte (Para la portada)</label>
                        <input v-model="newDeck.image_url" class="magic-input" placeholder="https://.../art.jpg" />
                    </div>

                    <div class="input-group">
                        <label>Colores / Identidad</label>
                        <div class="color-picker-mini">
                            <button v-for="c in colorOptions" :key="c.code" @click="toggleColor(c.code)" :class="['color-btn', { active: newDeck.color_identity.includes(c.code) }]">{{ c.symbol }}</button>
                        </div>
                    </div>
                    
                    <button @click="createDeck" class="btn-submit-magic" :disabled="isSubmitting">
                        {{ isSubmitting ? 'FORJANDO...' : 'REGISTRAR MAZO' }}
                    </button>
                </div>
            </div>

            <div v-if="showEditAvatar" class="modal-content glass-modal edit-avatar-modal fade-in-up">
                <div class="modal-header">
                    <h3>SINTONIZAR AVATAR</h3>
                    <button @click="showEditAvatar = false" class="close-btn-styled">✕</button>
                </div>
                <div class="magic-form">
                    <div class="input-group">
                        <label>URL de Imagen</label>
                        <input v-model="newAvatarUrl" class="magic-input" placeholder="https://..." />
                    </div>
                    <button @click="updateAvatar" class="btn-submit-magic" :disabled="isSubmitting">ACTUALIZAR APARIENCIA</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.profile-view-root {
    min-height: 100vh;
    color: white;
    padding-bottom: 120px;
    font-family: 'Inter', sans-serif;
}

.relative-content {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
}

/* HEADER */
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.header-actions {
    display: flex;
    gap: 10px;
}

.brand {
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
    font-size: 0.75rem;
}

.export-btn {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.7rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: 0.2s;
}

.export-btn:hover {
    background: #3b82f6;
    color: white;
}

.logout-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.7rem;
}

.hero-section {
    display: flex;
    align-items: center;
    gap: 25px;
    margin-bottom: 35px;
}

.avatar-wrapper {
    position: relative;
    width: 100px;
    height: 100px;
    cursor: pointer;
}

.avatar-image-container,
.avatar-circle {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid #3b82f6;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e293b;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-circle {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    font-size: 2rem;
    font-weight: 900;
}

.edit-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: 0.3s;
    font-size: 0.65rem;
    font-weight: 900;
}

.avatar-wrapper:hover .edit-overlay {
    opacity: 1;
}

.username-title {
    font-size: 2.2rem;
    font-weight: 900;
    margin: 0;
    letter-spacing: -1px;
}

.rank-subtitle {
    color: #60a5fa;
    text-transform: uppercase;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 1px;
}

/* STATS RÁPIDAS */
.quick-stats-row {
    display: flex;
    gap: 12px;
    padding: 20px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.q-stat {
    flex: 1;
    background: rgba(30, 41, 59, 0.3);
    padding: 15px;
    border-radius: 16px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.03);
}

.q-num {
    display: block;
    font-size: 1.4rem;
    font-weight: 900;
    color: #f1f5f9;
}

.q-label {
    font-size: 0.6rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 800;
}

/* SECCIONES */
.section-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 40px 0 20px;
}

.section-title {
    font-size: 0.85rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #94a3b8;
    margin-bottom: 0;
}

.history-section-spacer {
    margin-top: 60px;
}

.add-deck-btn {
    background: #3b82f6;
    color: white;
    padding: 8px 16px;
    border-radius: 10px;
    font-weight: 900;
    font-size: 0.65rem;
    border: none;
    cursor: pointer;
    transition: 0.2s;
}

.add-deck-btn:hover {
    background: #2563eb;
    transform: translateY(-2px);
}

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

/* HISTORIAL */
.history-list {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.history-item-btn {
    display: grid;
    grid-template-columns: 80px 1fr auto;
    align-items: center;
    padding: 16px 20px;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    background: transparent;
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: 0.2s;
    color: inherit;
}

.history-item-btn:hover {
    background: rgba(59, 130, 246, 0.1);
    transform: translateX(5px);
}

.h-date {
    font-size: 0.7rem;
    color: #64748b;
}

.h-deck {
    display: block;
    font-weight: 700;
    color: #f1f5f9;
    font-size: 0.85rem;
}

.h-format {
    font-size: 0.6rem;
    color: #3b82f6;
    text-transform: uppercase;
    font-weight: 800;
}

.h-result {
    font-size: 0.6rem;
    font-weight: 900;
    padding: 4px 10px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.win {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.loss {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
}

.h-arrow {
    opacity: 0;
    transition: 0.2s;
}

.history-item-btn:hover .h-arrow {
    opacity: 1;
}

/* MODALES */
/* MODAL STATS (ESTILOS RECUPERADOS) */
.stats-modal-large {
    max-width: 450px !important;
}

.deck-format-tag {
    font-size: 0.6rem;
    font-weight: 900;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.stats-grid-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 10px;
}

.main-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.metric-card {
    background: rgba(255, 255, 255, 0.03);
    padding: 20px;
    border-radius: 18px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.m-val {
    display: block;
    font-size: 1.8rem;
    font-weight: 900;
    color: #3b82f6;
}

.m-lab {
    font-size: 0.65rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 800;
}

.rival-tracking {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.rival-row {
    display: flex;
    align-items: center;
    padding: 12px 18px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.2);
}

.r-tag {
    font-size: 0.55rem;
    font-weight: 900;
    padding: 3px 8px;
    border-radius: 4px;
    margin-right: 12px;
}

.nemesis .r-tag {
    background: #f87171;
    color: #450a0a;
}

.victim .r-tag {
    background: #34d399;
    color: #064e3b;
}

.r-name {
    flex: 1;
    font-weight: 700;
    font-size: 0.9rem;
}

.r-count {
    font-size: 0.7rem;
    color: #64748b;
    font-weight: 800;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.9);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
}

.glass-modal {
    background: #0f172a;
    padding: 35px;
    border-radius: 28px;
    width: 100%;
    border: 1px solid rgba(59, 130, 246, 0.2);
    max-width: 500px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 25px;
}

.close-btn-styled {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.magic-input {
    background: #1e293b;
    border: 1px solid #334155;
    padding: 14px;
    border-radius: 12px;
    color: white;
    width: 100%;
    margin-bottom: 15px;
}

.btn-submit-magic {
    width: 100%;
    padding: 16px;
    background: #3b82f6;
    border-radius: 12px;
    color: white;
    font-weight: 900;
    border: none;
    cursor: pointer;
}

/* CARGA */
.loading-overlay {
    position: fixed;
    inset: 0;
    background: #020617;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(59, 130, 246, 0.1);
    border-left-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.fade-in {
    animation: fadeIn 0.5s ease-out;
}

.magic-input {
    background: #1e293b;
    border: 1px solid #334155;
    padding: 14px;
    border-radius: 12px;
    color: white;
    width: 100%;
    margin-bottom: 15px;
    font-size: 0.9rem;
}

.btn-submit-magic {
    width: 100%;
    padding: 16px;
    background: #3b82f6;
    border-radius: 12px;
    color: white;
    font-weight: 900;
    border: none;
    cursor: pointer;
    margin-top: 10px;
}

/* ANIMACIONES */
.fade-in {
    animation: fadeIn 0.5s ease-out;
}

.fade-in-up {
    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }

        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
}

/* --- ESTILOS CORREGIDOS PARA LA CABECERA DEL MODAL --- */

.modal-header {
    display: flex;
    /* Alinea hijos en fila */
    justify-content: space-between;
    /* Empuja el título a la izquierda y la X a la derecha */
    align-items: flex-start;
    /* Alinea al tope superior */
    width: 100%;
    margin-bottom: 25px;
    /* Espacio con el contenido de abajo */
}

.header-titles {
    display: flex;
    flex-direction: column;
    /* Mantiene el tag arriba y el nombre abajo */
    gap: 4px;
}

.close-btn-styled {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    /* Centra la X dentro del círculo */
    align-items: center;
    justify-content: center;
    transition: 0.2s;
    flex-shrink: 0;
    /* Evita que el botón se deforme si el título es largo */
}

.close-btn-styled:hover {
    background: rgba(239, 68, 68, 0.2);
    /* Rojo suave al pasar el ratón */
    color: #f87171;
}

/* --- CORRECCIÓN COLOR PICKER MINI --- */

.color-picker-mini {
    display: flex;
    gap: 8px;
    padding: 10px 0;
    flex-wrap: wrap;
}

.color-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid #334155;
    background: #1e293b;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    filter: grayscale(1);
    /* Desactivados por defecto */
    opacity: 0.6;
}

.color-btn:hover {
    transform: scale(1.1);
    border-color: #475569;
    opacity: 1;
}

/* Estado Activo (Seleccionado) */
.color-btn.active {
    filter: grayscale(0);
    opacity: 1;
    border-color: #3b82f6;
    background: #1e293b;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
    transform: scale(1.1);
}

/* Colores específicos para el borde cuando están activos */
.color-btn.active:nth-child(1) {
    border-color: #fef3c7;
    box-shadow: 0 0 10px #fef3c7;
}

/* Blanco/W */
.color-btn.active:nth-child(2) {
    border-color: #3b82f6;
    box-shadow: 0 0 10px #3b82f6;
}

/* Azul/U */
.color-btn.active:nth-child(3) {
    border-color: #a855f7;
    box-shadow: 0 0 10px #a855f7;
}

/* Negro/B */
.color-btn.active:nth-child(4) {
    border-color: #ef4444;
    box-shadow: 0 0 10px #ef4444;
}

/* Rojo/R */
.color-btn.active:nth-child(5) {
    border-color: #22c55e;
    box-shadow: 0 0 10px #22c55e;
}

/* Verde/G */
.color-btn.active:nth-child(6) {
    border-color: #94a3b8;
    box-shadow: 0 0 10px #94a3b8;
}


.input-group label {
    display: block;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
}

.grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.modal-intro-text {
    color: #94a3b8;
    font-size: 0.85rem;
    margin-bottom: 25px;
    text-align: center;
}

.export-options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.export-option-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 16px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: all 0.3s ease;
    color: white;
}

.export-option-card:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    transform: translateY(-3px);
}

.opt-icon {
    font-size: 2rem;
    margin-bottom: 10px;
}

.opt-title {
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    margin-bottom: 5px;
}

.commander-opt .opt-title { color: #facc15; } /* Dorado */
.pauper-opt .opt-title { color: #60a5fa; }    /* Azul */

.opt-desc {
    font-size: 0.65rem;
    color: #64748b;
    line-height: 1.4;
}

/* Ajuste para que el modal no sea demasiado ancho */
.export-selection-modal {
    max-width: 550px !important;
}
    .format-action-card {
    background: rgba(30, 41, 59, 0.5);
    padding: 20px;
    border-radius: 18px;
    border: 1px solid rgba(59, 130, 246, 0.2);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.action-buttons-row {
    display: flex;
    gap: 8px;
    width: 100%;
}

.btn-mini-action {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    font-size: 0.65rem;
    font-weight: 900;
    text-transform: uppercase;
    cursor: pointer;
    border: none;
    transition: 0.2s;
}

.btn-mini-action.export {
    background: #3b82f6;
    color: white;
}

.btn-mini-action.import {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid #10b981;
}

.btn-mini-action:hover {
    transform: translateY(-2px);
    filter: brightness(1.2);
}
</style>
