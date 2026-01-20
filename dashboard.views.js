/**
 * dashboard.views.js (V67.0 - OPTIMIZED MONOLITH)
 * Motor del Panel de Usuario (Feed Global).
 * Arquitectura: Single File Component (View + Logic)
 * * MEJORAS V67:
 * - Refactorización interna: Separación lógica de funciones UI y Data.
 * - Votación atómica: Mejor manejo de estados de carga y UI optimista.
 * - Limpieza de memoria: Gestión estricta de listeners de Firestore.
 */

window.App = window.App || {};
window.App.dashboard = window.App.dashboard || {};
// Estado interno del módulo
window.App.dashboard.state = {
    timers: {},
    listeners: {}
};

// ============================================================================
// 1. CONTROLADOR PRINCIPAL (CORE)
// ============================================================================

window.App.renderDashboard = async () => {
    console.log("🚀 Iniciando Dashboard V67...");
    
    // 1. Limpieza de recursos previos (Prevención de Memory Leaks)
    _cleanupDashboardResources();

    try {
        // 2. Verificación de Sesión
        if (!window.App.state) window.App.state = {};
        const user = window.App.state.currentUser;
        
        if (!user) { 
            console.warn("⚠️ Usuario no autenticado en Dashboard. Redirigiendo...");
            window.location.hash = '#discovery'; 
            return; 
        }

        // 3. Inicialización de Caché
        _initCache();

        // 4. Precarga de Datos (Paralela para velocidad)
        await _preloadCommunityData(user);

        // 5. Renderizado de la Estructura Base (Skeleton)
        const progressData = _calculateUserProgress(user);
        await App.render(_getLayoutTemplate(user, progressData));

        // 6. Carga de Contenido Dinámico (Feed)
        // Ejecutamos esto después de pintar el layout para percepción de velocidad
        _loadDashboardContent(user);

        // 7. Renderizado de Sidebar (si existe función externa)
        if (typeof window.App.renderSidebar === 'function') {
            window.App.renderSidebar('feed').catch(() => {});
        }

    } catch (criticalError) {
        console.error("🔥 ERROR CRÍTICO DASHBOARD:", criticalError);
        App.ui.toast("Error cargando el panel principal", "error");
        document.querySelector('main').innerHTML = _getErrorTemplate();
    }
};

// ============================================================================
// 2. GESTIÓN DE DATOS (DATA LAYER)
// ============================================================================

function _cleanupDashboardResources() {
    try {
        const { timers, listeners } = window.App.dashboard.state;
        
        // Limpiar Intervalos
        Object.values(timers).forEach(clearInterval);
        window.App.dashboard.state.timers = {};

        // Limpiar Suscripciones de Firestore
        Object.values(listeners).forEach(unsub => {
            if (typeof unsub === 'function') unsub();
        });
        window.App.dashboard.state.listeners = {};
    } catch (e) { console.warn("Error en limpieza:", e); }
}

function _initCache() {
    if (!App.state.cache) App.state.cache = {};
    if (!App.state.cache.communities) App.state.cache.communities = {};
}

async function _preloadCommunityData(user) {
    if (!user.joinedCommunities || user.joinedCommunities.length === 0) return;
    
    // Identificar comunidades que no están en caché
    const missingIds = user.joinedCommunities.filter(cid => !App.state.cache.communities[cid]);
    
    if (missingIds.length > 0) {
        try {
            await Promise.all(missingIds.map(cid => App.api.getCommunityById(cid)));
        } catch (e) { console.warn("Precarga parcial fallida:", e); }
    }
}

async function _loadDashboardContent(user) {
    const feedWrapper = document.getElementById('global-feed-wrapper');
    if (!feedWrapper) return;

    const joined = user.joinedCommunities || [];
    const isAdmin = user.role === 'admin';

    // 1. UI Admin (Barra de herramientas)
    let html = isAdmin ? _getAdminToolbarTemplate(user) : '';

    // 2. Estado Vacío
    if (joined.length === 0 && !isAdmin) {
        feedWrapper.innerHTML = _renderEmptyState();
        return;
    }

    // 3. Skeleton Loading
    feedWrapper.innerHTML = html + `<div id="feed-list" class="space-y-6">${_getSkeletonTemplate()}</div>`;

    try {
        let feedItems = [];

        // 4. Fetch de Datos (Posts + Challenges)
        for (const cid of joined) {
            if (!cid || !App.state.cache.communities[cid]) continue;
            const comm = App.state.cache.communities[cid];
            
            // A. Posts
            try {
                const posts = await App.api.getPosts(cid, 'all');
                if (Array.isArray(posts)) {
                    feedItems.push(...posts.slice(0, 5).map(p => ({
                        ...p, type: 'post', communityId: cid, communityName: comm.name
                    })));
                }
            } catch(e) { console.warn(`Skip posts ${cid}`, e); }

            // B. Desafío Activo
            if (_isChallengeActive(comm.activeChallenge)) {
                feedItems.push({
                    ...comm.activeChallenge,
                    type: 'challenge',
                    communityId: cid,
                    communityName: comm.name,
                    createdAt: comm.activeChallenge.createdAt || new Date().toISOString() 
                });
            }
        }

        // 5. Ordenamiento y Renderizado
        feedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const list = document.getElementById('feed-list');
        if (list) {
            if (feedItems.length > 0) {
                list.innerHTML = feedItems.map(item => {
                    return item.type === 'challenge' 
                        ? _renderGlobalChallengeCard(item, user, isAdmin, item.communityId)
                        : _renderFeedCard(item, user);
                }).join('');
                
                // 6. Hidratación (Listeners y Timers)
                feedItems.forEach(item => {
                    if (item.type === 'challenge') {
                        _initChallengeTimer(item.expiresAt, item.id);
                        _monitorChallenge(item.communityId, item.id, user, isAdmin);
                    }
                });
            } else {
                list.innerHTML = _getEmptyFeedMessage();
            }
        }
    } catch (e) { 
        console.error("Error cargando feed:", e);
        const list = document.getElementById('feed-list');
        if(list) list.innerHTML = `<div class="p-4 text-center text-red-400 text-xs">Error cargando contenido.</div>`;
    }
}

// ============================================================================
// 3. LÓGICA DE NEGOCIO (ACTIONS)
// ============================================================================

App.dashboard.voteChallenge = async (cid, chId, optionIndex) => {
    const user = App.state.currentUser;
    if (!user) return App.ui.toast("Inicia sesión para votar", "error");

    try {
        // A. UI OPTIMISTA (Feedback Instantáneo)
        _applyOptimisticVote(cid, chId, optionIndex, user);

        // B. PERSISTENCIA EN FIRESTORE
        const docRef = window.F.doc(window.F.db, "communities", cid);
        const snap = await window.F.getDoc(docRef);
        
        if (!snap.exists()) throw new Error("Comunidad no encontrada");
        
        const data = snap.data();
        const challenge = data.activeChallenge;

        if (!challenge || challenge.id !== chId) {
            App.renderDashboard(); // Recargar si cambió el desafío
            return App.ui.toast("El desafío ha expirado", "info");
        }

        // Verificar si ya votó en el servidor (Double Check)
        if (challenge.votes && challenge.votes[user.uid] !== undefined) {
             _syncLocalCache(cid, challenge); // Asegurar caché
             return App.ui.toast("Ya habías votado", "info");
        }

        // C. PREPARAR DATOS
        const currentStats = challenge.stats || new Array(challenge.options?.length || 3).fill(0);
        const newStats = [...currentStats];
        newStats[optionIndex] = (newStats[optionIndex] || 0) + 1;
        const newTotal = (challenge.totalVotes || 0) + 1;

        // D. ESTRATEGIA DE ESCRITURA (WRITE STRATEGY)
        try {
            // Intento Principal: Actualizar Voto + Estadísticas
            await window.F.updateDoc(docRef, {
                [`activeChallenge.votes.${user.uid}`]: optionIndex,
                [`activeChallenge.stats`]: newStats,
                [`activeChallenge.totalVotes`]: newTotal
            });
            App.ui.toast("¡Voto registrado!", "success");

        } catch (error) {
            // Fallback: Si falla (ej: permisos de estudiante estrictos), intentamos solo guardar el voto
            if (error.code === 'permission-denied') {
                console.warn("Permiso denegado para stats, aplicando fallback...");
                await window.F.updateDoc(docRef, {
                    [`activeChallenge.votes.${user.uid}`]: optionIndex
                });
                App.ui.toast("Voto guardado correctamente", "success");
            } else {
                throw error;
            }
        }

        // E. ACTUALIZAR CACHÉ LOCAL FINAL
        _updateLocalCacheData(cid, optionIndex, newStats, newTotal, user.uid);

    } catch (e) {
        console.error("Error al votar:", e);
        App.ui.toast("No se pudo registrar el voto", "error");
        // Rollback visual si es necesario (recargando dashboard)
        // setTimeout(App.renderDashboard, 1000); 
    }
};

App.dashboard.saveGlobalChallenge = async () => {
    try {
        // Recolección de datos del formulario
        const cid = document.getElementById('ch-cid-global').value;
        const question = document.getElementById('ch-question-global').value;
        const topic = document.getElementById('ch-topic-global').value;
        const customTime = document.getElementById('ch-custom-time-global').value;

        if(!cid) return App.ui.toast("Selecciona una comunidad", "warning");
        if(!question) return App.ui.toast("Pregunta requerida", "warning");

        // Cálculo de Expiración
        let expiresAt;
        if (customTime) {
            expiresAt = new Date(customTime).toISOString();
            if (new Date(expiresAt) <= new Date()) return App.ui.toast("La fecha debe ser futura", "warning");
        } else {
            const activeTimeBtn = document.querySelector('.ch-time-btn.active');
            const durationHours = activeTimeBtn ? parseInt(activeTimeBtn.dataset.hours) : 24;
            expiresAt = new Date(Date.now() + durationHours * 36e5).toISOString();
        }

        const opts = [
            document.getElementById('ch-opt1-global').value,
            document.getElementById('ch-opt2-global').value,
            document.getElementById('ch-opt3-global').value
        ].filter(Boolean);

        if (opts.length < 2) return App.ui.toast("Mínimo 2 opciones", "warning");

        const isEdit = document.getElementById('ch-is-edit-global').value === 'true';
        const challengeId = isEdit ? document.getElementById('ch-id-global').value : 'ch_' + Date.now();

        // Preservar datos anteriores si es edición
        const prevData = (isEdit && App.state.cache.communities[cid]) 
            ? App.state.cache.communities[cid].activeChallenge 
            : null;

        const newChallenge = {
            id: challengeId,
            question, topic, options: opts,
            correctIndex: parseInt(document.getElementById('ch-correct-global').value),
            explanation: document.getElementById('ch-explanation-global').value,
            expiresAt,
            votes: prevData ? prevData.votes : {},
            stats: prevData ? prevData.stats : new Array(opts.length).fill(0),
            totalVotes: prevData ? prevData.totalVotes : 0,
            archived: false,
            createdAt: isEdit ? prevData.createdAt : new Date().toISOString()
        };

        // Guardado
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), { activeChallenge: newChallenge });
        
        // Actualizar caché
        if (!App.state.cache.communities[cid]) App.state.cache.communities[cid] = {};
        App.state.cache.communities[cid].activeChallenge = newChallenge; 
        
        App.ui.toast(isEdit ? "Desafío actualizado" : "Desafío lanzado", "success");
        App.dashboard.closeCreateChallengeModal();
        App.renderDashboard(); 

    } catch (e) { 
        console.error(e); 
        App.ui.toast("Error al guardar desafío", "error"); 
    }
};

App.dashboard.archiveChallenge = async (cid) => {
    if(!confirm("¿Archivar este desafío?")) return;
    try {
        const docRef = window.F.doc(window.F.db, "communities", cid);
        const snap = await window.F.getDoc(docRef);
        if (snap.exists() && snap.data().activeChallenge) {
            const ch = snap.data().activeChallenge;
            ch.archived = true;
            await window.F.updateDoc(docRef, { activeChallenge: ch });
            
            if (App.state.cache.communities[cid]) App.state.cache.communities[cid].activeChallenge = ch;
            App.ui.toast("Desafío archivado", "success");
            App.renderDashboard();
        }
    } catch (e) { App.ui.toast("Error al archivar", "error"); }
};

// ============================================================================
// 4. HELPERS DE LÓGICA
// ============================================================================

function _isChallengeActive(ch) {
    if (!ch || ch.archived) return false;
    const expiry = new Date(ch.expiresAt);
    const now = new Date();
    if (isNaN(expiry.getTime())) return false;
    
    // Activo si no ha expirado O si expiró hace menos de 24 horas (para ver resultados)
    const diffHours = (now - expiry) / 36e5;
    return expiry > now || diffHours < 24;
}

function _monitorChallenge(cid, challengeId, user, isAdmin) {
    if (window.App.dashboard.state.listeners[challengeId]) return;

    try {
        const docRef = window.F.doc(window.F.db, "communities", cid);
        const unsubscribe = window.F.onSnapshot(docRef, (doc) => {
            if (!doc.exists()) return;
            const data = doc.data();
            const activeCh = data.activeChallenge;

            if (activeCh && activeCh.id === challengeId) {
                // Preservar estado local "Votado" para evitar parpadeos
                const cachedCh = App.state.cache.communities[cid]?.activeChallenge;
                if (cachedCh?._localVoted) {
                    activeCh._localVoted = true;
                    activeCh._localVoteIndex = cachedCh._localVoteIndex;
                }

                if (!App.state.cache.communities[cid]) App.state.cache.communities[cid] = {};
                App.state.cache.communities[cid].activeChallenge = activeCh;

                // Re-renderizar tarjeta específica
                const el = document.getElementById(`challenge-${challengeId}`);
                if (el) {
                    const temp = document.createElement('div');
                    temp.innerHTML = _renderGlobalChallengeCard(activeCh, user, isAdmin, cid);
                    el.replaceWith(temp.firstElementChild);
                    
                    if (new Date(activeCh.expiresAt) > new Date()) {
                        _initChallengeTimer(activeCh.expiresAt, challengeId);
                    }
                }
            } else {
                // Si el desafío cambió o se archivó, desconectar
                if (window.App.dashboard.state.listeners[challengeId]) {
                    window.App.dashboard.state.listeners[challengeId]();
                    delete window.App.dashboard.state.listeners[challengeId];
                }
            }
        });

        window.App.dashboard.state.listeners[challengeId] = unsubscribe;
    } catch (e) { console.warn("Error monitor challenge:", e); }
}

function _initChallengeTimer(expiresAt, chId) {
    const elId = `timer-${chId}`;
    if (!expiresAt) return;
    
    if (window.App.dashboard.state.timers[chId]) clearInterval(window.App.dashboard.state.timers[chId]);

    const update = () => {
        const timerEl = document.getElementById(elId);
        if (!timerEl) {
            clearInterval(window.App.dashboard.state.timers[chId]);
            return;
        }

        const expiry = new Date(expiresAt).getTime();
        const diff = expiry - Date.now();
        
        if (diff <= 0) {
            timerEl.innerText = "FIN";
            clearInterval(window.App.dashboard.state.timers[chId]);
            return;
        }
        
        const h = Math.floor(diff / 36e5);
        const m = Math.floor((diff % 36e5) / 6e4);
        const s = Math.floor((diff % 6e4) / 1e3);
        timerEl.innerText = `${h}h ${m}m ${s}s`;
    };
    
    update();
    window.App.dashboard.state.timers[chId] = setInterval(update, 1000);
}

// Helpers de Estado Local
function _applyOptimisticVote(cid, chId, idx, user) {
    const comm = App.state.cache.communities[cid];
    if (comm && comm.activeChallenge && comm.activeChallenge.id === chId) {
        const ch = comm.activeChallenge;
        
        // Clonar y modificar para UI
        const tempStats = [...(ch.stats || new Array(ch.options.length).fill(0))];
        tempStats[idx] = (tempStats[idx] || 0) + 1;
        
        const optimisticCh = {
            ...ch,
            stats: tempStats,
            totalVotes: (ch.totalVotes || 0) + 1,
            _localVoted: true,
            _localVoteIndex: idx
        };
        
        // Renderizar tarjeta optimista
        const el = document.getElementById(`challenge-${chId}`);
        if (el) {
            const temp = document.createElement('div');
            temp.innerHTML = _renderGlobalChallengeCard(optimisticCh, user, user.role === 'admin', cid);
            el.replaceWith(temp.firstElementChild);
            if (new Date(optimisticCh.expiresAt) > new Date()) _initChallengeTimer(optimisticCh.expiresAt, chId);
        }
    }
}

function _updateLocalCacheData(cid, idx, stats, total, uid) {
    if (!App.state.cache.communities[cid]) return;
    const ch = App.state.cache.communities[cid].activeChallenge;
    if (ch) {
        if (!ch.votes) ch.votes = {};
        ch.votes[uid] = idx;
        ch.stats = stats;
        ch.totalVotes = total;
        ch._localVoted = true;
        ch._localVoteIndex = idx;
    }
}

function _syncLocalCache(cid, data) {
    if (!App.state.cache.communities[cid]) return;
    App.state.cache.communities[cid].activeChallenge = data;
}

function _calculateUserProgress(user) {
    if (!user || !user.joinedCommunities || user.joinedCommunities.length === 0) return null;
    if (!App.state.cache.communities) return null;

    const completed = user.completedModules || [];

    for (const cid of user.joinedCommunities) {
        const community = App.state.cache.communities[cid];
        if (!community || !community.courses) continue;
        
        for (const course of community.courses) {
            if (!course.classes) continue;
            const nextClass = course.classes.find(c => !completed.includes(`${cid}_${c.id}`));
            if (nextClass) {
                const total = course.classes.length;
                const done = course.classes.filter(c => completed.includes(`${cid}_${c.id}`)).length;
                return {
                    communityId: cid, 
                    classTitle: nextClass.title,
                    courseTitle: course.title,
                    image: course.image || 'https://via.placeholder.com/300',
                    percentage: Math.round((done/total)*100),
                    link: `#comunidades/${cid}/clases/${course.id}`
                };
            }
        }
    }
    return null;
}

// ============================================================================
// 5. RENDERIZADORES DE UI (VIEWS)
// ============================================================================

function _getLayoutTemplate(user, progressData) {
    return `
    <main class="app-layout min-h-full transition-colors duration-300 flex flex-col relative w-full bg-[#F8FAFC] dark:bg-[#020617]">
        <div class="flex-1 w-full relative z-0 p-4 md:p-8 pt-4" id="dashboard-scroller">
            <div class="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                <!-- FEED PRINCIPAL -->
                <div class="lg:col-span-8 space-y-6 min-w-0" id="dashboard-content">
                    <div id="global-feed-wrapper" class="space-y-6"></div>
                </div>

                <!-- SIDEBAR DERECHO -->
                <div class="hidden lg:block lg:col-span-4 space-y-6 sticky top-8">
                    ${_renderRightSidebar(user, progressData)}
                </div>
            </div>
        </div>
    </main>
    ${_renderProfileModal(user)}
    ${_renderPostModal()}
    ${_renderCreateChallengeModalGlobal()}`;
}

function _getAdminToolbarTemplate(user) {
    return `
    <div class="bg-white dark:bg-[#0f172a] rounded-2xl p-2 border border-gray-100 dark:border-slate-800 shadow-sm flex gap-2 animate-fade-in mb-6">
        <button onclick="App.dashboard.openPostModal()" class="flex-1 flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left group">
            <img src="${user.avatar || 'https://ui-avatars.com/api/?name=U'}" class="w-10 h-10 rounded-full bg-gray-200 object-cover">
            <span class="block text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">Compartir conocimiento...</span>
        </button>
        <div class="w-px bg-gray-100 dark:bg-slate-800 my-2"></div>
        <button onclick="App.dashboard.openCreateChallengeModal()" class="w-1/3 md:w-auto md:px-6 flex flex-col md:flex-row items-center justify-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors font-bold text-xs group">
            <i class="fas fa-trophy text-lg group-hover:rotate-12 transition-transform"></i>
            <span class="leading-tight">Crear<br class="md:hidden"> Desafío</span>
        </button>
    </div>`;
}

function _renderGlobalChallengeCard(challenge, user, isAdmin, cid) {
    // Definición de Tema
    const t = (challenge.topic || '').toLowerCase();
    let theme = { gradient: 'from-[#1890ff] via-blue-600 to-indigo-600', icon: 'fa-code', text: 'text-white' };
    
    if (t.includes('sql')) theme = { gradient: 'from-red-500 via-red-600 to-rose-600', icon: 'fa-database', text: 'text-white' };
    else if (t.includes('python')) theme = { gradient: 'from-amber-400 via-amber-500 to-yellow-500', icon: 'fa-brands fa-python', text: 'text-slate-900' };
    else if (t.includes('excel')) theme = { gradient: 'from-emerald-500 via-green-600 to-teal-600', icon: 'fa-file-excel', text: 'text-white' };
    else if (t.includes('bi')) theme = { gradient: 'from-yellow-500 via-orange-500 to-orange-600', icon: 'fa-chart-bar', text: 'text-white' };
    else if (t.includes('ai') || t.includes('gpt')) theme = { gradient: 'from-violet-500 via-purple-600 to-indigo-600', icon: 'fa-brain', text: 'text-white' };

    // Estado del Voto
    let hasVoted = false;
    let userVoteIdx = -1;

    if (challenge.votes && challenge.votes[user.uid] !== undefined) {
        hasVoted = true;
        userVoteIdx = challenge.votes[user.uid];
    } else if (challenge._localVoted === true) {
        hasVoted = true;
        userVoteIdx = challenge._localVoteIndex;
    }

    const isExpired = new Date() > new Date(challenge.expiresAt);
    const totalVotes = challenge.totalVotes || 0;
    const textColor = theme.text;
    
    return `
    <div class="relative bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden group animate-slide-up mb-6 challenge-card" id="challenge-${challenge.id}">
        <!-- Header -->
        <div class="bg-gradient-to-r ${theme.gradient} p-5 relative overflow-hidden">
            <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div class="flex justify-between items-start relative z-10">
                <div class="flex gap-4 items-center">
                    <div class="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/20 ${textColor}">
                        <i class="fas ${theme.icon}"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-0.5">
                            <span class="bg-black/20 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-white/10 ${textColor}">
                                ${challenge.topic || 'Desafío'}
                            </span>
                            <span class="text-[10px] ${textColor} opacity-80 font-medium flex items-center gap-1">
                                <i class="fas fa-users text-[8px]"></i> ${challenge.communityName || 'Comunidad'}
                            </span>
                        </div>
                        <h2 class="font-heading font-bold text-lg leading-tight ${textColor} text-shadow-sm">
                            ${isExpired ? 'Resultados Finales' : 'Desafío en Curso'}
                        </h2>
                    </div>
                </div>
                
                <div class="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex flex-col items-center min-w-[70px]">
                    <span class="text-[8px] uppercase tracking-widest ${textColor} opacity-80 mb-0.5 font-bold">Tiempo</span>
                    <span id="timer-${challenge.id}" class="font-mono font-bold text-sm leading-none tracking-tight ${textColor}">${isExpired ? 'FIN' : '...'}</span>
                </div>
            </div>
        </div>

        <!-- Body -->
        <div class="p-6">
            <h3 class="text-xl font-heading font-bold text-slate-900 dark:text-white mb-6 leading-snug">
                ${challenge.question}
            </h3>

            <div class="space-y-3">
                ${(challenge.options || []).map((opt, idx) => {
                    const showResult = hasVoted || isExpired;
                    
                    if (!showResult) {
                        return `
                        <button onclick="App.dashboard.voteChallenge('${cid}', '${challenge.id}', ${idx})" 
                            class="w-full text-left p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1890ff] dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group/opt relative overflow-hidden shadow-sm active:scale-[0.99]">
                            <span class="relative z-10 font-bold text-slate-700 dark:text-slate-200 text-sm pl-2 border-l-4 border-transparent group-hover/opt:border-[#1890ff] block transition-colors">${opt}</span>
                        </button>`;
                    } else {
                        const votes = (challenge.stats && challenge.stats[idx]) || 0;
                        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const isCorrect = idx === challenge.correctIndex;
                        const isSelected = idx === userVoteIdx;

                        let barColor = 'bg-slate-200 dark:bg-slate-700';
                        let borderColor = 'border-transparent bg-slate-50 dark:bg-slate-800/30';
                        let textClass = 'text-slate-700 dark:text-slate-300';
                        let icon = '';

                        if (isExpired && isCorrect) {
                            barColor = 'bg-green-100 dark:bg-green-900/40';
                            borderColor = 'border-green-500 ring-1 ring-green-500/30';
                            textClass = 'text-green-700 dark:text-green-400 font-bold';
                            icon = '<i class="fas fa-check-circle text-green-500 mr-2"></i>';
                        } else if (isSelected) {
                            barColor = 'bg-blue-100 dark:bg-blue-900/30';
                            borderColor = 'border-blue-400';
                            icon = '<i class="fas fa-user-circle text-blue-500 mr-2"></i>';
                        }
                        
                        return `
                        <div class="relative w-full p-3 rounded-xl border ${borderColor} overflow-hidden">
                            <div class="absolute top-0 left-0 bottom-0 ${barColor} transition-all duration-700 ease-out" style="width: ${percentage}%"></div>
                            <div class="relative z-10 flex justify-between items-center px-2">
                                <span class="text-sm font-medium ${textClass} flex items-center">
                                    ${icon} ${opt}
                                </span>
                                <span class="text-xs font-bold text-slate-500 dark:text-slate-400">${percentage}%</span>
                            </div>
                        </div>`;
                    }
                }).join('')}
            </div>

            ${isExpired ? `
            <div class="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 animate-fade-in">
                <div class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <i class="fas fa-lightbulb text-yellow-500"></i> Explicación
                    </h4>
                    <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        ${challenge.explanation || 'Respuesta correcta revelada.'}
                    </p>
                </div>
            </div>` : 
            `<div class="mt-4 flex justify-between items-center text-xs text-slate-400 font-medium">
                <span><i class="fas fa-users mr-1"></i> ${totalVotes} participantes</span>
                ${hasVoted ? '<span class="text-[#1890ff]"><i class="fas fa-check mr-1"></i> Votado</span>' : '<span>¡Tu voto cuenta!</span>'}
            </div>`}
            
            ${isAdmin ? `
            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
                 <button onclick="App.dashboard.archiveChallenge('${cid}')" class="text-[10px] text-slate-400 hover:text-red-500 font-medium flex items-center gap-1">
                    <i class="fas fa-archive"></i> Archivar
                </button>
                <div class="w-px bg-gray-200 dark:bg-slate-700 h-3 my-auto"></div>
                <button onclick="App.dashboard.openEditChallengeModal('${cid}')" class="text-[10px] text-slate-400 hover:text-[#1890ff] font-medium flex items-center gap-1">
                    <i class="fas fa-pen"></i> Editar
                </button>
            </div>` : ''}
        </div>
    </div>`;
}

function _renderRightSidebar(user, progressData) {
    return `
    <div class="space-y-6">
        <div class="card-zen p-5">
            <h3 class="font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-wider flex items-center gap-2"><i class="fas fa-bolt text-yellow-500"></i> Continuar</h3>
            ${progressData ? `
            <div class="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700/50">
                <div class="relative aspect-video rounded-lg overflow-hidden mb-3 group cursor-pointer" onclick="window.location.hash='${progressData.link}'">
                    <img src="${progressData.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                        <div class="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-[#1890ff] shadow-lg scale-90 group-hover:scale-100 transition-transform"><i class="fas fa-play text-xs"></i></div>
                    </div>
                    <div class="absolute bottom-0 left-0 h-1 bg-[#1890ff]" style="width: ${progressData.percentage}%"></div>
                </div>
                <h4 class="font-bold text-slate-900 dark:text-white text-xs line-clamp-1 mb-1">${progressData.classTitle}</h4>
                <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">${progressData.courseTitle}</p>
                <a href="${progressData.link}" class="btn-primary block w-full py-2 text-center text-[10px]">Continuar Clase</a>
            </div>` : `<div class="text-center py-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30"><div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2"><i class="fas fa-check"></i></div><p class="text-xs font-bold text-emerald-700 dark:text-emerald-400">¡Todo al día!</p></div>`}
        </div>
        <div class="card-zen p-5">
            <h3 class="font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-wider">Tus Espacios</h3>
            <div class="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                ${(user.joinedCommunities||[]).map(id => { const c = App.state.cache.communities[id]; if(!c) return ''; return `<a href="#comunidades/${c.id}" class="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg group transition-colors"><div class="w-6 h-6 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-[10px] shrink-0"><i class="fas ${c.icon}"></i></div><span class="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white truncate flex-1">${c.name}</span></a>`; }).join('')}
            </div>
            <button onclick="window.location.hash='#discovery'" class="btn-ghost w-full mt-4 py-2 text-[10px]"><i class="fas fa-compass mr-1"></i> Explorar más</button>
        </div>
    </div>`;
}

function _renderEmptyState() {
    return `<div class="flex flex-col items-center justify-center py-24 card-zen border-dashed text-center px-6 animate-fade-in"><div class="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><i class="fas fa-rocket text-2xl text-[#1890ff]"></i></div><h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">¡Tu feed está vacío!</h2><p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">Únete a comunidades para llenar este espacio.</p><button onclick="window.location.hash='#discovery'" class="btn-primary px-6 py-2 text-sm shadow-lg">Explorar Comunidades</button></div>`;
}

function _renderFeedCard(post, user) {
    const isLike = (post.likedBy || []).includes(user.uid);
    const commentsCount = post.comments ? post.comments.length : 0;
    const isAuthor = post.authorId === user.uid;
    const isAdmin = user.role === 'admin';

    return `
    <div class="card-zen p-6 group animate-fade-in" id="feed-post-${post.id}">
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
                <img src="${post.author?.avatar || 'https://ui-avatars.com/api/?name=U'}" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 object-cover">
                <div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">${post.author?.name || 'Usuario'} ${post.author?.role === 'admin' ? '<i class="fas fa-check-circle text-[#1890ff] text-xs"></i>' : ''}</h4>
                    <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium"><span>${App.ui.formatDate(post.createdAt)}</span><span class="opacity-50">•</span><a href="#comunidades/${post.communityId}" class="hover:text-[#1890ff] transition-colors flex items-center gap-1">${post.communityName}</a></div>
                </div>
            </div>
            ${(isAuthor || isAdmin) ? `<button onclick="App.api.deletePost('${post.id}').then(() => document.getElementById('feed-post-${post.id}').remove())" class="text-slate-300 hover:text-red-500 p-2 transition-colors rounded-lg opacity-0 group-hover:opacity-100"><i class="fas fa-trash-alt text-xs"></i></button>` : ''}
        </div>
        <div class="pl-0 md:pl-[52px]">
            ${post.title ? `<h3 class="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 leading-snug hover:text-[#1890ff] transition-colors">${post.title}</h3>` : ''}
            <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line mb-4">${post.content}</p>
            ${post.image ? `<div class="mb-4 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800"><img src="${post.image}" class="w-full max-h-[500px] object-cover hover:scale-[1.01] transition-transform duration-700 cursor-zoom-in" onclick="window.open(this.src)"></div>` : ''}
            <div class="flex items-center gap-6 pt-2"><button onclick="App.dashboard.handleLike('${post.id}')" class="flex items-center gap-2 text-xs font-bold ${isLike ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-500'} transition-colors group/like btn-ghost px-2 py-1 -ml-2"><i class="${isLike ? 'fas' : 'far'} fa-heart text-sm group-active/like:scale-125 transition-transform"></i> <span id="feed-likes-count-${post.id}">${post.likes || 0}</span></button><button onclick="App.dashboard.toggleComments('${post.id}')" class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#1890ff] transition-colors group/comment btn-ghost px-2 py-1"><i class="far fa-comment-alt text-sm"></i> <span>${commentsCount > 0 ? `${commentsCount}` : 'Responder'}</span></button></div>
            <div id="feed-comments-${post.id}" class="hidden pt-4 mt-2 border-t border-gray-50 dark:border-slate-800 animate-fade-in"><div class="flex gap-3 mb-4"><img src="${user.avatar || 'https://ui-avatars.com/api/?name=U'}" class="w-8 h-8 rounded-full bg-gray-100"><div class="flex-1 relative"><input type="text" id="feed-comment-input-${post.id}" placeholder="Escribe una respuesta..." class="w-full input-zen px-4 py-2 text-xs pr-10" onkeydown="if(event.key==='Enter') App.dashboard.addComment('${post.id}')"><button onclick="App.dashboard.addComment('${post.id}')" class="absolute right-2 top-1.5 text-[#1890ff] p-1 transition-colors hover:bg-blue-50 rounded"><i class="fas fa-paper-plane text-xs"></i></button></div></div><div id="feed-comments-list-${post.id}" class="space-y-3 pl-11">${(post.comments || []).map(c => `<div class="flex gap-2 group/comm"><img src="${c.authorAvatar}" class="w-6 h-6 rounded-full mt-1 bg-gray-100"><div class="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-2xl rounded-tl-none flex-1"><div class="flex justify-between items-baseline mb-0.5"><span class="text-xs font-bold text-slate-900 dark:text-white">${c.authorName}</span><span class="text-[9px] text-slate-400">${App.ui.formatDate(c.createdAt)}</span></div><p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${c.content}</p></div></div>`).join('')}</div></div>
        </div>
    </div>`;
}

function _renderCreateChallengeModalGlobal() {
    return `
    <div id="create-challenge-modal-global" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="App.dashboard.closeCreateChallengeModal()"></div>
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden max-h-[90vh]">
            <div class="bg-slate-900 dark:bg-slate-800 p-6 text-white flex justify-between items-center border-b border-gray-700">
                <h3 class="font-heading font-bold text-lg flex items-center gap-2" id="modal-challenge-title"><i class="fas fa-trophy text-yellow-400"></i> Crear Desafío</h3>
                <button onclick="App.dashboard.closeCreateChallengeModal()" class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"><i class="fas fa-times text-sm"></i></button>
            </div>
            <div class="p-6 space-y-5 bg-gray-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar">
                
                <input type="hidden" id="ch-is-edit-global" value="false">
                <input type="hidden" id="ch-id-global" value="">

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Comunidad</label>
                        <select id="ch-cid-global" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none">
                            ${(App.state.currentUser.joinedCommunities || []).map(cid => {
                                const c = App.state.cache.communities[cid];
                                return c ? `<option value="${cid}">${c.name}</option>` : '';
                            }).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Tema (Color)</label>
                        <select id="ch-topic-global" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none">
                            <option value="General">General (Azul)</option>
                            <option value="Python">Python (Amarillo)</option>
                            <option value="SQL">SQL Server (Rojo)</option>
                            <option value="Power BI">Power BI (Naranja)</option>
                            <option value="Excel">Excel (Verde)</option>
                            <option value="Machine Learning">IA / ML (Violeta)</option>
                            <option value="Big Data">Big Data (Cyan)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Pregunta</label>
                    <input type="text" id="ch-question-global" class="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 font-bold text-sm bg-white dark:bg-slate-900 dark:text-white" placeholder="Ej: ¿Qué comando filtra filas en SQL?">
                </div>
                
                <div class="space-y-2">
                    <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Opciones</label>
                    <div class="flex gap-2"><span class="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold dark:text-slate-400">A</span><input type="text" id="ch-opt1-global" class="flex-1 p-2 rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm"></div>
                    <div class="flex gap-2"><span class="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold dark:text-slate-400">B</span><input type="text" id="ch-opt2-global" class="flex-1 p-2 rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm"></div>
                    <div class="flex gap-2"><span class="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold dark:text-slate-400">C</span><input type="text" id="ch-opt3-global" class="flex-1 p-2 rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm" placeholder="(Opcional)"></div>
                </div>

                <div>
                    <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Duración / Cronómetro</label>
                    <div class="grid grid-cols-2 gap-2 mb-2">
                        <div class="flex gap-1">
                            <button type="button" class="ch-time-btn active flex-1 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700" data-hours="4" onclick="App.dashboard.selectTime(this)">4h</button>
                            <button type="button" class="ch-time-btn flex-1 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50" data-hours="24" onclick="App.dashboard.selectTime(this)">24h</button>
                        </div>
                        <input type="datetime-local" id="ch-custom-time-global" class="w-full p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-xs outline-none" onchange="document.querySelectorAll('.ch-time-btn').forEach(b => b.classList.remove('active', 'bg-slate-200', 'dark:bg-slate-800'));">
                    </div>
                    <p class="text-[9px] text-slate-400 italic ml-1">Selecciona una duración rápida o una fecha exacta.</p>
                </div>

                <div class="grid grid-cols-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Respuesta Correcta</label>
                    <select id="ch-correct-global" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm font-bold"><option value="0">Opción A</option><option value="1">Opción B</option><option value="2">Opción C</option></select>
                </div>

                <div><label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Explicación (Se muestra al finalizar)</label><textarea id="ch-explanation-global" rows="2" class="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm"></textarea></div>
                
                <button onclick="App.dashboard.saveGlobalChallenge()" id="btn-save-challenge" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform">Lanzar Desafío</button>
            </div>
        </div>
    </div>`;
}

function _renderPostModal() {
    return `
    <div id="post-modal" class="fixed inset-0 z-[70] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="App.dashboard.closePostModal()"></div>
        <div class="card-zen w-full max-w-2xl shadow-float relative z-10 flex flex-col bg-white dark:bg-slate-900 rounded-2xl">
            <div class="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Crear Publicación</h2>
                <button onclick="App.dashboard.closePostModal()"><i class="fas fa-times text-slate-400"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <select id="post-community-select" class="w-full input-zen p-2.5 text-sm cursor-pointer">
                    <option value="">Selecciona una comunidad...</option>
                    ${(App.state.currentUser?.joinedCommunities || []).map(cid => { const c = App.state.cache.communities[cid]; return c ? `<option value="${cid}">${c.name}</option>` : ''; }).join('')}
                </select>
                <input type="text" id="post-title" placeholder="Título (Opcional)" class="w-full p-2.5 bg-transparent border-b border-gray-100 dark:border-slate-800 text-lg font-bold outline-none focus:border-[#1890ff] dark:text-white">
                <textarea id="post-content" rows="5" class="w-full input-zen p-3 resize-none text-sm" placeholder="Comparte tus ideas..."></textarea>
            </div>
            <div class="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                <button onclick="App.dashboard.submitPost()" class="btn-primary px-6 py-2 text-sm shadow-lg">Publicar</button>
            </div>
        </div>
    </div>`;
}

function _renderProfileModal(user) {
    return `
    <div id="profile-modal" class="fixed inset-0 z-[80] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="App.dashboard.closeProfileModal()"></div>
        <div class="card-zen w-full max-w-md shadow-float relative z-10 overflow-hidden">
            <div class="h-24 bg-gradient-to-r from-slate-900 to-slate-800 relative">
                <button onclick="App.dashboard.closeProfileModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"><i class="fas fa-times"></i></button>
            </div>
            <div class="px-8 pb-8 -mt-10 relative">
                <div class="flex justify-center mb-4"><img src="${user.avatar || 'https://via.placeholder.com/150'}" class="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg bg-white"></div>
                <div class="space-y-4">
                    <div class="text-center mb-4"><h2 class="text-lg font-bold text-slate-900 dark:text-white">Editar Perfil</h2><p class="text-xs text-slate-500">${user.email}</p></div>
                    <div class="space-y-1"><label class="text-xs font-bold text-slate-900 dark:text-white uppercase">Nombre</label><input type="text" id="profile-name" value="${user.name || ''}" class="w-full input-zen py-2 px-4 text-sm"></div>
                    <button onclick="App.dashboard.saveProfile()" id="btn-save-profile" class="btn-primary w-full py-2.5 mt-2 text-sm">Guardar Cambios</button>
                </div>
            </div>
        </div>
    </div>`;
}

// Helpers Visuales
function _getSkeletonTemplate() {
    return (App.ui && App.ui.skeleton) 
        ? [1, 2].map(() => App.ui.skeleton('card')).join('') 
        : '<div class="animate-pulse h-32 bg-gray-100 rounded-xl mb-4"></div>';
}

function _getErrorTemplate() {
    return `<div class="p-8 text-center text-red-500">Error crítico cargando el panel. Recarga la página.</div>`;
}

function _getEmptyFeedMessage() {
    return `<div class="text-center py-16 opacity-60"><i class="fas fa-wind text-3xl mb-2 text-slate-300"></i><p class="text-sm text-slate-500">Todo tranquilo en tus comunidades.</p></div>`;
}

// ============================================================================
// 6. EVENT HANDLERS (INTERACTIONS)
// ============================================================================

App.dashboard.openCreateChallengeModal = () => {
    document.getElementById('ch-is-edit-global').value = 'false';
    document.getElementById('ch-id-global').value = '';
    document.getElementById('modal-challenge-title').innerHTML = '<i class="fas fa-trophy text-yellow-400"></i> Crear Desafío';
    document.getElementById('btn-save-challenge').innerText = 'Lanzar Desafío';
    ['ch-question-global', 'ch-opt1-global', 'ch-opt2-global', 'ch-opt3-global', 'ch-explanation-global', 'ch-custom-time-global'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('create-challenge-modal-global').classList.remove('hidden');
};

App.dashboard.openEditChallengeModal = (cid) => {
    const c = App.state.cache.communities[cid]?.activeChallenge;
    if (!c) return App.ui.toast("No hay desafío activo", "error");

    document.getElementById('ch-is-edit-global').value = 'true';
    document.getElementById('ch-id-global').value = c.id;
    document.getElementById('ch-cid-global').value = cid;
    document.getElementById('modal-challenge-title').innerHTML = '<i class="fas fa-pen text-white"></i> Editar Desafío';
    document.getElementById('btn-save-challenge').innerText = 'Guardar Cambios';

    document.getElementById('ch-topic-global').value = c.topic || 'General';
    document.getElementById('ch-question-global').value = c.question;
    c.options.forEach((opt, i) => { if(i<3) document.getElementById(`ch-opt${i+1}-global`).value = opt || ''; });
    document.getElementById('ch-correct-global').value = c.correctIndex;
    document.getElementById('ch-explanation-global').value = c.explanation || '';
    
    if (c.expiresAt) {
        const iso = new Date(c.expiresAt);
        iso.setMinutes(iso.getMinutes() - iso.getTimezoneOffset());
        document.getElementById('ch-custom-time-global').value = iso.toISOString().slice(0, 16);
    }
    document.getElementById('create-challenge-modal-global').classList.remove('hidden');
};

App.dashboard.closeCreateChallengeModal = () => document.getElementById('create-challenge-modal-global').classList.add('hidden');
App.dashboard.openPostModal = () => document.getElementById('post-modal').classList.remove('hidden');
App.dashboard.closePostModal = () => document.getElementById('post-modal').classList.add('hidden');
App.dashboard.openProfileModal = () => document.getElementById('profile-modal').classList.remove('hidden');
App.dashboard.closeProfileModal = () => document.getElementById('profile-modal').classList.add('hidden');

App.dashboard.selectTime = (btn) => {
    document.querySelectorAll('.ch-time-btn').forEach(b => {
        b.classList.remove('active', 'bg-slate-200', 'dark:bg-slate-800');
        b.classList.add('bg-white', 'dark:bg-slate-900', 'text-slate-500');
    });
    btn.classList.add('active', 'bg-slate-200', 'dark:bg-slate-800');
    btn.classList.remove('bg-white', 'dark:bg-slate-900', 'text-slate-500');
    document.getElementById('ch-custom-time-global').value = '';
};

App.dashboard.submitPost = async () => {
    const cid = document.getElementById('post-community-select').value;
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    if(!cid) return App.ui.toast("Selecciona una comunidad", "warning");
    if(!content) return App.ui.toast("Escribe algo para publicar", "warning");
    
    try {
        await App.api.createPost({ 
            communityId: cid, 
            channelId: 'general', 
            title, 
            content, 
            authorId: App.state.currentUser.uid, 
            author: App.state.currentUser, 
            isOfficial: false 
        });
        App.ui.toast("¡Publicado!", "success"); 
        App.dashboard.closePostModal(); 
        App.renderDashboard();
    } catch(e) { App.ui.toast("Error al publicar", "error"); }
};

App.dashboard.saveProfile = async () => {
    const newName = document.getElementById('profile-name').value.trim();
    if (!newName) return App.ui.toast("Nombre inválido", "warning");
    try { 
        await App.api.updateProfile(App.state.currentUser.uid, { name: newName }); 
        App.ui.toast("Perfil actualizado", "success"); 
        App.dashboard.closeProfileModal(); 
        App.renderDashboard(); 
    } catch(e) { App.ui.toast("Error al guardar", "error"); }
};

App.dashboard.handleLike = async (postId) => {
    // Optimistic UI
    const btn = document.querySelector(`#feed-likes-count-${postId}`)?.parentElement;
    if (!btn) return;
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');
    let val = parseInt(span.innerText);
    const isLiked = btn.classList.contains('text-red-500');

    // Toggle Visual
    if (isLiked) {
        btn.classList.remove('text-red-500'); btn.classList.add('text-slate-500', 'dark:text-slate-400');
        icon.classList.replace('fas', 'far'); span.innerText = Math.max(0, val - 1);
    } else {
        btn.classList.add('text-red-500'); btn.classList.remove('text-slate-500', 'dark:text-slate-400');
        icon.classList.replace('far', 'fas'); span.innerText = val + 1;
    }
    try { await App.api.toggleLike(postId); } catch(e) { console.error("Error like", e); }
};

App.dashboard.toggleComments = (postId) => {
    const el = document.getElementById(`feed-comments-${postId}`);
    if (el) {
        el.classList.toggle('hidden');
        if (!el.classList.contains('hidden')) {
            setTimeout(() => {
                const input = document.getElementById(`feed-comment-input-${postId}`);
                if(input) input.focus();
            }, 100);
        }
    }
};

App.dashboard.addComment = async (postId) => {
    const input = document.getElementById(`feed-comment-input-${postId}`);
    const txt = input.value.trim();
    if (!txt) return;

    const user = App.state.currentUser;
    const comment = {
        id: 'cm_' + Date.now(),
        authorId: user.uid, 
        authorName: user.name || 'Estudiante', 
        authorAvatar: user.avatar || '',
        content: txt, 
        createdAt: new Date().toISOString()
    };

    // Renderizado Optimista del Comentario
    const html = `<div class="flex gap-2 animate-slide-up"><img src="${comment.authorAvatar}" class="w-6 h-6 rounded-full bg-gray-100 mt-1"><div class="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-2xl rounded-tl-none flex-1"><div class="flex justify-between items-baseline mb-0.5"><span class="text-xs font-bold text-slate-900 dark:text-white">${comment.authorName}</span><span class="text-[9px] text-slate-400">Ahora</span></div><p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${comment.content}</p></div></div>`;
    const list = document.getElementById(`feed-comments-list-${postId}`);
    if(list) list.insertAdjacentHTML('beforeend', html);
    input.value = '';

    try { 
        await window.F.updateDoc(window.F.doc(window.F.db, "posts", postId), { 
            comments: window.F.arrayUnion(comment) 
        }); 
    } catch (e) { App.ui.toast("Error al comentar", "error"); }
};