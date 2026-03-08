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

// --- FUNCIONES AUXILIARES ---

const closeAllModals = () => {
    showAddDeck.value = false
    showEditAvatar.value = false
    showDeckStats.value = false
    showExportModal.value = false
}

const findUserIdByUsername = async (username) => {
    if (!username || ['anónimo', 'invitado', 'oponente'].includes(username.toLowerCase())) return null;
    const cleanName = username.split('(')[0].trim();
    const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanName)
        .maybeSingle();
    return data ? data.id : null;
}

// --- LÓGICA DE EXPORTACIÓN/IMPORTACIÓN ---

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
            alert("No se encontraron partidas válidas.");
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

                const { data: matchData, error: mErr } = await supabase
                    .from('matches')
                    .insert([{
                        fecha_partida: fechaISO,
                        formato: selectedFormat,
                        creator_id: profile.value.id
                    }])
                    .select().single();

                if (mErr) throw mErr;

                const participants = [];
                const nombreJugadorPrincipalCSV = row[2]?.trim();
                const mazoJugadorPrincipalCSV = row[3]?.trim();
                const mazoGanadorCSV = row[10]?.trim();
                const jugadorGanadorCSV = row[11]?.trim();

                participants.push({
                    match_id: matchData.id,
                    player_name_manual: profile.value.username,
                    deck_name_manual: mazoJugadorPrincipalCSV,
                    is_winner: nombreJugadorPrincipalCSV === jugadorGanadorCSV || mazoJugadorPrincipalCSV === mazoGanadorCSV,
                    user_id: profile.value.id
                });

                const rivalIndices = [[4, 5], [6, 7], [8, 9]];
                for (const [nameIdx, deckIdx] of rivalIndices) {
                    const rName = row[nameIdx]?.trim();
                    const rDeck = row[deckIdx]?.trim();

                    if (rName && rName !== "") {
                        if (rName.toLowerCase() === profile.value.username.toLowerCase()) continue;
                        const linkedId = await findUserIdByUsername(rName);
                        participants.push({
                            match_id: matchData.id,
                            player_name_manual: rName,
                            deck_name_manual: rDeck || 'Desconocido',
                            is_winner: rName === jugadorGanadorCSV || (rDeck === mazoGanadorCSV && rDeck !== ""),
                            user_id: linkedId
                        });
                    }
                }

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

// --- CICLO DE VIDA Y CARGA ---

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

// --- ACCIONES DE USUARIO ---

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
            const name = opp.player_name_manual || 'Otro';
            if (dm.is_winner) victimMap[name] = (victimMap[name] || 0) + 1;
            else if (opp.is_winner) nemesisMap[name] = (nemesisMap[name] || 0) + 1;
        });
    });

    const getTop = (obj) => {
        const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
        return entries.length > 0 ? { name: entries[0][0], count: entries[0][1] } : null;
    };

    selectedDeckStats.value = {
        ...deck,
        totalMatches: deckMatches.length,
        winRate: ((wins / deckMatches.length) * 100).toFixed(1),
        nemesis: getTop(nemesisMap),
        victim: getTop(victimMap)
    };
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

const updateAvatar = async () => {
    if (!newAvatarUrl.value) return
    isSubmitting.value = true
    try {
        await supabase.from('profiles').update({ avatar_url: newAvatarUrl.value }).eq('id', profile.value.id)
        profile.value.avatar_url = newAvatarUrl.value
        showEditAvatar.value = false
    } catch (err) { alert(err.message) } finally { isSubmitting.value = false }
}

const resetForm = () => {
    Object.assign(newDeck, { nombre_personalizado: '', decklist_url: '', image_url: '', formato: 'commander', comandante_nombre: '', arquetipo_pauper: '', color_identity: [] })
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
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
                    <div class="q-stat">
                        <span class="q-num">{{ decks.length }}</span>
                        <span class="q-label">Mazos</span>
                    </div>
                    <div class="q-stat">
                        <span class="q-num">{{ stats.totalMatches }}</span>
                        <span class="q-label">Partidas</span>
                    </div>
                    <div class="q-stat">
                        <span class="q-num">{{ stats.winRate }}%</span>
                        <span class="q-label">Win Rate</span>
                    </div>
                </div>

                <div class="mobile-nav-pills">
                    <a href="#biblioteca" class="pill-link">📚 Biblioteca</a>
                    <a href="#historial" class="pill-link">📜 Historial</a>
                </div>
            </header>

            <section id="biblioteca" class="content-section">
                <div class="section-header-bar">
                    <h2 class="section-title">Biblioteca de Mazos</h2>
                    <button @click="showAddDeck = true" class="add-deck-btn">+ NUEVO MAZO</button>
                </div>
                <div class="decks-layout-grid horizontal-scroll-mobile">
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck" @click="openDecklist(deck.decklist_url)"
                        @show-stats="openStats(deck)" />
                    <div v-if="decks.length === 0" class="empty-state-card-mini">No has registrado mazos todavía.</div>
                </div>
            </section>

            <section id="historial" class="content-section history-section-spacer">
                <h2 class="section-title">Últimas Partidas</h2>
                <div class="history-list">
                    <button v-for="entry in history" :key="entry.match_id" class="history-item-btn"
                        @click="goToMatch(entry.match_id)">
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

        <div v-if="showAddDeck || showEditAvatar || showDeckStats || showExportModal" class="modal-overlay"
            @click.self="closeAllModals">

            <div v-if="showAddDeck" class="modal-content glass-modal add-deck-modal fade-in-up">
                <div class="modal-header">
                    <h3>FORJAR NUEVO MAZO</h3>
                    <button @click="showAddDeck = false" class="close-btn-styled">✕</button>
                </div>
                <div class="magic-form">
                    <div class="input-group">
                        <label>Nombre Personalizado</label>
                        <input v-model="newDeck.nombre_personalizado" class="magic-input" placeholder="Ej: Mi Mazo Pro"
                            required />
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
                            <input v-if="newDeck.formato === 'commander'" v-model="newDeck.comandante_nombre"
                                class="magic-input" placeholder="Nombre..." />
                            <input v-else v-model="newDeck.arquetipo_pauper" class="magic-input"
                                placeholder="Ej: Burn..." />
                        </div>
                    </div>
                    <div class="input-group">
                        <label>URL Decklist</label>
                        <input v-model="newDeck.decklist_url" class="magic-input" placeholder="https://..." />
                    </div>
                    <div class="input-group">
                        <label>URL Imagen Arte</label>
                        <input v-model="newDeck.image_url" class="magic-input" placeholder="https://..." />
                    </div>
                    <div class="input-group">
                        <label>Colores / Identidad</label>
                        <div class="color-picker-mini">
                            <button v-for="c in colorOptions" :key="c.code" @click="toggleColor(c.code)"
                                :class="['color-btn', { active: newDeck.color_identity.includes(c.code) }]">
                                {{ c.symbol }}
                            </button>
                        </div>
                    </div>
                    <button @click="createDeck" class="btn-submit-magic" :disabled="isSubmitting">
                        {{ isSubmitting ? 'FORJANDO...' : 'REGISTRAR MAZO' }}
                    </button>
                </div>
            </div>

            <div v-if="showEditAvatar" class="modal-content glass-modal fade-in-up">
                <div class="modal-header">
                    <h3>EDITAR PERFIL</h3>
                    <button @click="showEditAvatar = false" class="close-btn-styled">✕</button>
                </div>
                <div class="input-group">
                    <label>URL de Imagen de Avatar</label>
                    <input v-model="newAvatarUrl" placeholder="https://..." class="magic-input" />
                </div>
                <button @click="updateAvatar" class="btn-submit-magic" :disabled="isSubmitting">GUARDAR CAMBIOS</button>
            </div>

            <div v-if="showDeckStats && selectedDeckStats"
                class="modal-content glass-modal stats-modal-large fade-in-up">
                <div class="modal-header">
                    <div class="header-titles">
                        <span class="deck-format-tag">{{ selectedDeckStats.formato }}</span>
                        <h3>{{ selectedDeckStats.nombre_personalizado }}</h3>
                    </div>
                    <button @click="showDeckStats = false" class="close-btn-styled">✕</button>
                </div>
                <div v-if="selectedDeckStats.empty" class="p-4 text-center">No hay partidas registradas.</div>
                <div v-else class="stats-grid-container">
                    <div class="main-metrics">
                        <div class="metric-card">
                            <span class="m-val">{{ selectedDeckStats.winRate }}%</span>
                            <span class="m-lab">Win Rate</span>
                        </div>
                        <div class="metric-card">
                            <span class="m-val">{{ selectedDeckStats.totalMatches }}</span>
                            <span class="m-lab">Partidas</span>
                        </div>
                    </div>
                    <div class="rival-tracking" v-if="selectedDeckStats.nemesis || selectedDeckStats.victim">
                        <div v-if="selectedDeckStats.nemesis" class="rival-row nemesis">
                            <span class="r-tag">NÉMESIS</span>
                            <span class="r-name">{{ selectedDeckStats.nemesis.name }}</span>
                            <span class="r-count">{{ selectedDeckStats.nemesis.count }} derrotas</span>
                        </div>
                        <div v-if="selectedDeckStats.victim" class="rival-row victim">
                            <span class="r-tag">VÍCTIMA</span>
                            <span class="r-name">{{ selectedDeckStats.victim.name }}</span>
                            <span class="r-count">{{ selectedDeckStats.victim.count }} victorias</span>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showExportModal" class="modal-content glass-modal export-selection-modal fade-in-up">
                <div class="modal-header">
                    <h3>GESTIONAR DATOS (CSV)</h3>
                    <button @click="showExportModal = false" class="close-btn-styled">✕</button>
                </div>
                <p class="modal-intro-text">Gestiona tus registros de partidas.</p>
                <div class="export-options-stack">
                    <div class="format-action-card" v-for="fmt in ['commander', 'pauper']" :key="fmt">
                        <div class="card-info-side">
                            <span class="opt-icon">{{ fmt === 'commander' ? '👑' : '🛡️' }}</span>
                            <span class="opt-title">{{ fmt.toUpperCase() }}</span>
                        </div>
                        <div class="action-buttons-row">
                            <button @click="downloadCSV(fmt)" class="btn-mini-action export">Exportar</button>
                            <button @click="triggerImport(fmt)" class="btn-mini-action import">Importar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* --- BASE & LAYOUT --- */
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

/* --- HEADER & HERO --- */
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

/* --- CORRECCIÓN AVATAR: ASPECT-RATIO & FLEX --- */
.avatar-wrapper {
    position: relative;
    width: 100px;
    height: 100px;
    flex-shrink: 0;
    /* Impide que el flexbox lo deforme */
    aspect-ratio: 1 / 1;
    /* Garantiza cuadratura */
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
    /* Evita que la foto se estire */
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

/* --- QUICK STATS --- */
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

/* --- BIBLIOTECA & HISTORIAL --- */
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
}

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.history-section-spacer {
    margin-top: 60px;
}

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

/* --- MODALES --- */
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
    max-height: 90vh;
    overflow-y: auto;
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
}

/* --- CORRECCIÓN MODAL CSV: RESPONSIVIDAD TOTAL --- */
.export-selection-modal {
    max-width: 500px !important;
}

.export-options-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.format-action-card {
    background: rgba(30, 41, 59, 0.5);
    padding: 16px 20px;
    border-radius: 18px;
    border: 1px solid rgba(59, 130, 246, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
}

.card-info-side {
    display: flex;
    align-items: center;
    gap: 12px;
}

.opt-title {
    font-weight: 900;
    font-size: 0.85rem;
    letter-spacing: 0.5px;
}

.action-buttons-row {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    /* Evita que los botones se encojan */
}

.btn-mini-action {
    padding: 8px 16px;
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
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid #10b981;
}

/* --- OTROS ELEMENTOS --- */
.mobile-nav-pills {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.pill-link {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 800;
    text-decoration: none;
    text-transform: uppercase;
}

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
    filter: grayscale(1);
    opacity: 0.6;
}

.color-btn.active {
    filter: grayscale(0);
    opacity: 1;
    border-color: #3b82f6;
    transform: scale(1.1);
}

/* --- MEDIA QUERIES --- */
@media (max-width: 768px) {
    .hero-section {
        gap: 15px;
    }

    /* Asegurar círculo perfecto en móvil */
    .avatar-wrapper {
        width: 75px;
        height: 75px;
    }

    .username-title {
        font-size: 1.7rem;
    }

    /* Ajuste Modal CSV en móvil */
    .format-action-card {
        flex-direction: column;
        align-items: stretch;
        padding: 15px;
        text-align: center;
    }

    .card-info-side {
        justify-content: center;
    }

    .action-buttons-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
    }

    .btn-mini-action {
        width: 100%;
        padding: 12px 5px;
    }

    .horizontal-scroll-mobile {
        display: flex !important;
        overflow-x: auto;
        gap: 15px;
        padding-bottom: 15px;
        scroll-snap-type: x mandatory;
    }

    .horizontal-scroll-mobile>* {
        flex: 0 0 280px;
        scroll-snap-align: start;
    }

    .glass-modal {
        padding: 25px 20px;
    }
}

/* --- ANIMACIONES --- */
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

.fade-in {
    animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.fade-in-up {
    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

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

html {
    scroll-behavior: smooth;
}

/* ===========================================
   MODAL: ESTADÍSTICAS DEL MAZO (Recuperado)
   =========================================== */
.stats-modal-large {
    max-width: 600px !important;
    background: linear-gradient(160deg, #0f172a 0%, #1e293b 100%);
    border: 1px solid rgba(59, 130, 246, 0.4);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.header-titles .deck-format-tag {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    font-size: 0.6rem;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 900;
    text-transform: uppercase;
    display: inline-block;
    margin-bottom: 4px;
}

.stats-grid-container {
    display: flex;
    flex-direction: column;
    gap: 25px;
}

.main-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.metric-card {
    background: rgba(2, 6, 23, 0.4);
    padding: 20px;
    border-radius: 20px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
}

.m-val {
    font-size: 2rem;
    font-weight: 900;
    color: #3b82f6;
    line-height: 1;
}

.m-lab {
    font-size: 0.7rem;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: 700;
    margin-top: 8px;
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
    border-radius: 12px;
    font-size: 0.85rem;
}

.rival-row.nemesis {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.rival-row.victim {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
}

.r-tag {
    font-size: 0.6rem;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    margin-right: 12px;
}

.nemesis .r-tag {
    background: #ef4444;
    color: white;
}

.victim .r-tag {
    background: #10b981;
    color: white;
}

.r-name {
    font-weight: 700;
    flex: 1;
}

.r-count {
    font-size: 0.75rem;
    opacity: 0.8;
}

/* ===========================================
   OPTIMIZACIÓN PARA MÓVIL (NUEVO MAZO)
   =========================================== */

@media (max-width: 480px) {

    /* 1. Ajuste general del contenedor del modal */
    .glass-modal.add-deck-modal {
        padding: 15px !important;
        /* Reducimos padding lateral y vertical */
        border-radius: 20px !important;
        max-height: 95vh;
        /* Permitimos que use casi toda la pantalla */
    }

    /* 2. Cabecera más pequeña */
    .modal-header {
        margin-bottom: 12px !important;
    }

    .modal-header h3 {
        font-size: 0.9rem !important;
        letter-spacing: 1px;
    }

    /* 3. Compactar el formulario y grupos de input */
    .magic-form {
        gap: 10px !important;
        /* Espacio mínimo entre filas */
    }

    .input-group {
        gap: 2px !important;
        /* Espacio mínimo entre label e input */
    }

    .input-group label {
        font-size: 0.6rem !important;
        margin-left: 2px !important;
    }

    /* 4. Forzar disposición horizontal en Formato/Comandante */
    .grid-2-col {
        grid-template-columns: 100px 1fr !important;
        /* Ancho fijo para formato */
        gap: 8px !important;
    }

    /* 5. Inputs y Selects ultra-compactos */
    .magic-input {
        padding: 8px 12px !important;
        font-size: 0.8rem !important;
        border-radius: 10px !important;
        height: 38px !important;
        /* Altura fija para consistencia */
    }

    /* 6. Selector de colores: Minimalista */
    .color-picker-mini {
        padding: 6px !important;
        gap: 4px !important;
        background: rgba(15, 23, 42, 0.8) !important;
        border-radius: 12px !important;
        justify-content: center !important;
    }

    .color-btn {
        width: 30px !important;
        height: 30px !important;
        font-size: 0.8rem !important;
        border-radius: 6px !important;
        border-width: 1px !important;
    }

    .color-btn.active {
        transform: scale(1.05) !important;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.4) !important;
    }

    /* 7. Botón de registro */
    .btn-submit-magic {
        padding: 10px !important;
        font-size: 0.75rem !important;
        margin-top: 5px !important;
        border-radius: 10px !important;
    }
}

/* Ajuste adicional para móviles muy cortos (como iPhone SE o similares) */
@media (max-height: 700px) and (max-width: 480px) {
    .glass-modal.add-deck-modal {
        padding: 12px !important;
    }

    .magic-form {
        gap: 6px !important;
    }

    .magic-input {
        height: 34px !important;
        padding: 6px 10px !important;
    }
}

</style>