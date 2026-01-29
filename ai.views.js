/**
 * ai.views.js (V20.0 - OFFICIAL GROK BRANDING & PERSISTENCE GUARD)
 * Branding Oficial y Blindaje de Datos.
 * * CAMBIOS V20:
 * 1. LOGO OFICIAL: Implementado icono de Grok desde CDN proporcionado.
 * 2. NO PULSE: El logo es estático, eliminando cualquier parpadeo.
 * 3. PERSISTENCE GUARD: Verificación redundante de ID antes de guardar respuesta IA.
 */

window.App = window.App || {};
window.App.ai = window.App.ai || {};
console.log("DEBUG: ai.views.js START execution");

// ============================================================================
// 0. ESTADO & CONFIGURACIÓN
// ============================================================================

window.App.ai.state = {
    currentConversationId: null,
    isGenerating: false,
    userScrolledUp: false,
    modelName: 'Grok 4.1 Fast',
    currentModelId: 'x-ai/grok-4.1-fast',
    currentModelLogo: 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/grok-ai-icon.webp?v=1768942289',
    pendingFiles: [],
    modes: { tutor: false, canvas: false },
    isMenuOpen: false,
    isModelMenuOpen: false,
    chatToDelete: null,
    // Canvas improvements
    codeSnippets: [],          // Array de { id, code, lang, timestamp }
    canvasWidthPercent: 45,    // % del ancho total para el canvas
    isSnippetsMenuOpen: false
};

// BRANDING ASSETS
const GROK_LOGO_URL = 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/grok-ai-icon.webp?v=1768942289';

// Modelos (Visual)
const AI_MODELS = [
    { name: 'Grok 4.1', disabled: false },
    { name: 'Claude 3.5 Sonnet', disabled: true },
    { name: 'Chat GPT 5.2', disabled: true },
    { name: 'Gemini 3 Flash', disabled: true },
    { name: 'Gemini 3 Pro', disabled: true }
];

// GESTOR DE DEPENDENCIAS (Marked.js)
const _dependenciesPromise = new Promise((resolve) => {
    if (window.marked) { resolve(); return; }
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    script.onload = () => {
        const renderer = new marked.Renderer();
        renderer.code = function (code, language) {
            const validCode = (code || '').toString();
            return `
            <div class="my-5 rounded-xl overflow-hidden bg-[#0d1117] border border-white/10 shadow-lg font-mono text-sm relative group/code w-full ring-1 ring-white/5">
                <div class="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5 backdrop-blur-md">
                    <div class="flex items-center gap-2">
                        <div class="flex gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/50"></span>
                            <span class="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></span>
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></span>
                        </div>
                        <span class="ml-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            ${language || 'TEXT'}
                        </span>
                    </div>
                    <button onclick="App.ai.copyCode(this)" class="text-[10px] font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/5 cursor-pointer">
                        <i class="far fa-copy"></i> <span class="hidden sm:inline">Copiar</span>
                    </button>
                    <div class="hidden code-content">${encodeURIComponent(validCode)}</div>
                </div>
                <div class="p-5 overflow-x-auto text-slate-300 leading-relaxed custom-scrollbar bg-[#0d1117] selection:bg-indigo-500/30">
                    <code>${validCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
                </div>
            </div>`;
        };
        marked.use({ renderer });
        resolve();
    };
    script.onerror = () => { console.warn("Marked failed to load."); resolve(); };
    document.head.appendChild(script);
});

// ============================================================================
// 1. RENDERIZADO DEL SHELL
// ============================================================================

// [HELPER CRÍTICO] Espera a que Firebase Y EL SERVICIO estén listos
const _waitForDependencies = async () => {
    let attempts = 0;
    while (attempts < 50) { // 5 segundos máx
        const isReady = window.F && window.F.auth && window.F.auth.currentUser && window.App && window.App.aiService;

        if (isReady) {
            return window.F.auth.currentUser;
        }
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return window.F?.auth?.currentUser || null;
};

window.App.ai.render = async (container, conversationId = null) => {
    // 1. Verificar Sesión y Dependencias
    const user = await _waitForDependencies();

    if (!user) {
        container.innerHTML = `<div class="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-400 font-medium">Iniciando sesión...</div>`;
        return;
    }

    // VERIFICACIÓN DE PERMISOS: ACCESO AL PANEL AI
    // Usar App.state.currentUser que tiene el role de Firestore, no el Firebase Auth user
    const firestoreUser = window.App.state?.currentUser || user;
    const community = window.App.state?.activeCommunity;

    try {
        if (window.App.permissions && typeof window.App.permissions.canAccessAI === 'function') {
            const canAccess = window.App.permissions.canAccessAI(firestoreUser, community);
            if (!canAccess.allowed) {
                container.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-[#0f172a]">
                    <div class="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mb-6 animate-scale-in">
                        <i class="fas fa-lock text-5xl text-amber-500 shadow-sm"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">Acceso Restringido</h2>
                    <p class="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">${canAccess.reason}</p>
                    <div class="flex gap-4">
                        <button onclick="window.history.back()" class="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Volver</button>
                        ${community ? `<button onclick="window.location.hash='#community/${community.id}/pricing'" class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg shadow-amber-500/30 hover:-translate-y-1 transition-transform flex items-center gap-2">
                            <i class="fas fa-crown"></i> Ver Planes
                        </button>` : ''}
                    </div>
                </div>`;
                return;
            }
        }
    } catch (permError) {
        console.warn("Error verificando permisos AI, permitiendo acceso por defecto:", permError);
    }

    // 2. Inicializar Estructura Global
    window.App.state = window.App.state || {};
    window.App.state.cache = window.App.state.cache || {};

    if (typeof window.App.state.cache.aiConversations === 'undefined') {
        window.App.state.cache.aiConversations = null;
    }

    // 3. Loader Visual
    container.innerHTML = `<div class="flex items-center justify-center h-screen bg-white dark:bg-[#0f172a]"><div class="flex flex-col items-center gap-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div></div></div>`;

    await _dependenciesPromise;

    // 4. Estado Local
    window.App.ai.state.currentConversationId = conversationId;
    window.App.ai.state.pendingFiles = [];
    window.App.ai.state.isMenuOpen = false;
    window.App.ai.state.isModelMenuOpen = false;

    // ------------------------------------------------------------------------
    // [FIX] CARGA OBLIGATORIA DE DATOS CON FALLBACK
    // ------------------------------------------------------------------------
    try {
        if (window.App.ai.syncSidebarData) {
            const data = await window.App.ai.syncSidebarData(user.uid);
            window.App.state.cache.aiConversations = Array.isArray(data) ? data : [];
        } else {
            window.App.state.cache.aiConversations = [];
        }
    } catch (err) {
        console.warn("AI: Error cargando historial", err);
        window.App.state.cache.aiConversations = [];
    }

    // 5. Render Sidebar (GLOBAL managed by core.js now)
    // No rendering needed here - avoiding double sidebar

    // 6. Construcción del DOM
    container.innerHTML = `
    <div class="fixed inset-0 z-0 w-full h-full bg-[#f8f9fa] dark:bg-[#050505] overflow-hidden flex text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 relative group/shell">
        
        <!-- SIDEBAR is now Global (Fixed z-60 from Shell) -->

        <!-- MAIN VIEWPORT (Centered) -->
        <main id="ai-viewport" class="w-full h-full flex flex-col relative z-0 transition-all duration-300 ml-0 lg:pl-[80px]">
            
            <!-- MODAL DELETE -->
                <div id="ai-delete-modal" class="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm hidden flex-col items-center justify-center pointer-events-auto transition-opacity opacity-0">
                    <div class="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-700 transform scale-95 transition-transform duration-200" id="ai-delete-modal-content">
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">¿Eliminar conversación?</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta acción no se puede deshacer.</p>
                        <div class="flex justify-end gap-3">
                            <button onclick="App.ai.closeDeleteModal()" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                            <button onclick="App.ai.confirmDelete()" class="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors">Eliminar</button>
                        </div>
                    </div>
                </div>

                <!-- SPLIT VIEW -->
                <!-- [FIX STACKING] z-0 crea contexto de apilamiento para que los hijos z-60 funcionen relativamente -->
                <div id="ai-split-view" class="flex-1 flex flex-row overflow-hidden relative w-full h-full z-0">
                    
                    <!-- LEFT COLUMN (CHAT) -->
                    <div id="ai-left-column" class="flex-1 flex flex-col min-w-0 h-full relative z-10">
                        
                        <!-- TOP BAR (MOVED HERE) -->
                        <header class="absolute top-0 left-0 w-full flex items-center justify-between px-4 sm:px-6 py-3 z-40 pointer-events-none">
                            <!-- LEFT: Model Selector -->
                            <div class="flex items-center gap-3 pointer-events-auto">
                                <!-- Mobile menu button -->
                                <button class="lg:hidden p-2 text-slate-500 hover:text-indigo-500 transition-colors rounded-lg hover:bg-white/50 dark:hover:bg-black/30 backdrop-blur-sm" onclick="document.body.classList.toggle('mobile-menu-open')">
                                    <i class="fas fa-bars text-lg"></i>
                                </button>
                                
                                <!-- MODEL SELECTOR (Floating Pill) -->
                                <div class="relative">
                                    <button onclick="App.ai.toggleModelMenu(event)" id="ai-model-btn" class="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg hover:shadow-xl transition-all text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm select-none">
                                        <img src="${window.App.ai.state.currentModelLogo}" id="ai-model-logo" class="w-5 h-5 object-contain rounded-full shadow-sm bg-white p-0.5" onerror="this.src='https://cdn.shopify.com/s/files/1/0564/3812/8712/files/grok-ai-icon.webp?v=1768942289'">
                                        <span id="ai-model-name" class="hidden sm:inline">${window.App.ai.state.modelName}</span>
                                        <i class="fas fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200" id="ai-model-arrow"></i>
                                    </button>
                                    <!-- MENU DROPDOWN -->
                                    <div id="ai-model-menu" class="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl border border-slate-100 dark:border-white/5 py-1 hidden animate-scale-in origin-top-left z-50">
                                        ${(() => {
            const user = window.App.state.currentUser;
            const community = window.App.state.activeCommunity;
            let availableModels = [];
            if (window.App.permissions && window.App.permissions.getAvailableAIModels) {
                availableModels = window.App.permissions.getAvailableAIModels(user, community);
            } else {
                availableModels = (typeof AI_MODELS !== 'undefined' ? AI_MODELS : [
                    { name: 'Grok 4.1 Fast', modelId: 'x-ai/grok-4.1-fast', tier: 'free', available: true, logo: 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/grok-ai-icon.webp?v=1768942289' },
                    { name: 'Claude 3.5 Sonnet', disabled: true, logo: 'https://anthropic.com/favicon.ico' },
                    { name: 'Chat GPT 5.2', disabled: true, logo: 'https://openai.com/favicon.ico' }
                ]).map(m => ({
                    ...m,
                    modelId: m.modelId || m.name.toLowerCase().replace(/ /g, '-'),
                    available: !m.disabled,
                    logo: m.logo || 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/grok-ai-icon.webp?v=1768942289'
                }));
            }
            return availableModels.map(m => {
                const isSelected = window.App.ai.state.modelName === m.name;
                const action = m.available
                    ? `App.ai.selectModel('${m.name}', '${m.modelId}', '${m.logo}')`
                    : `App.permissions.showUpgradeModal('ai', 'El modelo ${m.name} requiere plan ${m.tier || 'superior'}', '${community?.id || ''}')`;
                return `
                    <div onclick="${action}" 
                         class="px-4 py-3 text-xs font-medium flex items-center justify-between cursor-pointer transition-colors border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 group">
                        <div class="flex items-center gap-3 ${!m.available ? 'opacity-50' : ''}">
                            <div class="w-6 h-6 rounded-md flex items-center justify-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                                <img src="${m.logo}" class="w-4 h-4 object-contain ${!m.available ? 'grayscale' : ''}">
                            </div>
                            <span class="${isSelected ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}">${m.name}</span>
                        </div>
                        ${isSelected ? '<i class="fas fa-check text-indigo-500"></i>' : (m.available ? '' : '<i class="fas fa-lock text-amber-500 text-[10px]"></i>')}
                    </div>`;
            }).join('');
        })()}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- RIGHT: Action Buttons (Floating Pills) -->
                            <div class="flex items-center gap-2 pointer-events-auto">
                                <button onclick="document.getElementById('ai-file-upload').click()" class="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg hover:shadow-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-all" title="Adjuntar Archivos"><i class="fas fa-paperclip text-sm"></i></button>
                                
                                <div class="relative">
                                    <button onclick="App.ai.toggleTopSnippetsMenu(event)" id="ai-top-snippets-btn" class="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-lg hover:shadow-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-all relative" title="Códigos Generados">
                                        <i class="fas fa-code text-sm"></i>
                                        <span id="ai-top-snippets-badge" class="hidden absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">0</span>
                                    </button>
                                    <div id="ai-top-snippets-menu" class="hidden absolute top-full right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] animate-scale-in origin-top-right custom-scrollbar">
                                        <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                            <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Códigos Generados</span>
                                            <span class="text-[10px] text-slate-400" id="ai-top-snippets-count-label">0 snippets</span>
                                        </div>
                                        <div id="ai-top-snippets-list" class="divide-y divide-gray-100 dark:divide-slate-700/50">
                                            <p class="px-4 py-3 text-xs text-slate-400 text-center">No hay código generado aún</p>
                                        </div>
                                    </div>
                                </div>
                                <button onclick="App.ai.newChat()" class="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/30 text-white flex items-center justify-center transition-all" title="Nuevo Chat"><i class="fas fa-plus text-sm"></i></button>
                                
                                <button id="switch-canvas" onclick="App.ai.toggleCanvasPanel(!window.App.ai.state.modes.canvas)" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors">
                                    <span class="text-[10px] font-bold text-slate-500 dark:text-slate-300">CANVAS</span>
                                    <div class="w-8 h-4 bg-black/10 dark:bg-white/10 rounded-full relative transition-all">
                                        <div class="w-4 h-4 bg-white rounded-full shadow-sm absolute top-0 left-0 transition-transform"></div>
                                    </div>
                                </button>
                            </div>
                        </header>

                        <!-- SCROLL AREA -->
                        <div id="ai-scroller" class="flex-1 overflow-y-auto custom-scrollbar scroll-smooth px-3 sm:px-4 pointer-events-auto pb-4 pt-16">
                            <div id="ai-content" class="w-full max-w-3xl mx-auto min-h-full flex flex-col transition-all duration-300 justify-end pb-10"></div>
                        </div>

                        <!-- INPUT DOCK -->
                        <div class="w-full shrink-0 z-30 pb-4 sm:pb-6 pt-2 bg-gradient-to-t from-[#f8f9fa] dark:from-[#050505] via-[#f8f9fa] dark:via-[#050505] to-transparent transition-all duration-300 pointer-events-auto">
                            <div class="w-full max-w-3xl mx-auto px-3 sm:px-4 relative group/dock">
                                <button id="scroll-btn" onclick="App.ai.scrollToBottom(true)" class="absolute -top-16 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hidden animate-bounce hover:scale-110 transition-transform z-10 cursor-pointer"><i class="fas fa-arrow-down text-xs"></i></button>
                                <div class="relative flex items-end gap-2 sm:gap-3">
                                    <div class="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] opacity-0 group-focus-within/dock:opacity-20 transition duration-1000 blur-xl -z-10"></div>
                                    <div class="relative z-50 shrink-0">
                                        <button onclick="App.ai.togglePlusMenu(event)" class="w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.2rem] bg-white dark:bg-[#151b28] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 group/plus cursor-pointer">
                                            <i class="fas fa-plus text-base sm:text-lg transition-transform duration-300 group-hover/plus:rotate-90"></i>
                                        </button>
                                        <div id="ai-plus-menu" class="hidden absolute bottom-full left-0 mb-4 w-64 sm:w-72 bg-white dark:bg-[#151b28] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 transform origin-bottom-left transition-all duration-200 animate-scale-in flex-col gap-1 overflow-hidden ring-1 ring-black/5">
                                            <div onclick="App.ai.toggleMode('tutor', event)" class="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl cursor-pointer select-none group/option transition-colors">
                                                <div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30"><i class="fas fa-graduation-cap"></i></div><div class="flex flex-col"><span class="text-sm font-bold text-slate-700 dark:text-slate-200">Modo Tutor</span><span class="text-[10px] text-slate-400">Explicaciones paso a paso</span></div></div>
                                                <div id="switch-tutor" class="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors duration-300 shadow-inner"><div class="w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform duration-300 shadow-sm"></div></div>
                                            </div>
                                            <div onclick="App.ai.toggleMode('canvas', event)" class="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl cursor-pointer select-none group/option transition-colors">
                                                <div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 flex items-center justify-center border border-pink-100 dark:border-pink-900/30"><i class="fas fa-palette"></i></div><div class="flex flex-col"><span class="text-sm font-bold text-slate-700 dark:text-slate-200">Modo Canvas</span><span class="text-[10px] text-slate-400">Interfaz visual interactiva</span></div></div>
                                                <div id="switch-canvas" class="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors duration-300 shadow-inner"><div class="w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform duration-300 shadow-sm"></div></div>
                                            </div>
                                            <div class="h-px bg-slate-100 dark:bg-white/5 my-1 mx-2"></div>
                                            <button onclick="document.getElementById('ai-file-upload').click(); App.ai.togglePlusMenu()" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl cursor-pointer select-none text-left transition-colors text-slate-700 dark:text-slate-200 group/upload">
                                                <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30 group-hover/upload:scale-110 transition-transform"><i class="fas fa-paperclip"></i></div><span class="text-sm font-bold">Adjuntar Archivos</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="flex-1 relative bg-white dark:bg-[#151b28] rounded-[1.2rem] sm:rounded-[1.5rem] shadow-xl border border-slate-200 dark:border-white/5 flex flex-col overflow-hidden transition-all duration-300 group/area ring-1 ring-black/5 dark:ring-white/5">
                                        <div id="file-preview-area" class="hidden px-3 sm:px-5 pt-3 sm:pt-4 pb-2 flex gap-3 overflow-x-auto custom-scrollbar border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20"></div>
                                        <div class="flex items-end pr-2">
                                            <textarea id="ai-input" rows="1" class="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 px-3 sm:px-5 py-3 sm:py-3.5 resize-none max-h-48 custom-scrollbar text-sm sm:text-[15px] leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium" placeholder="Escribe un mensaje..." onkeydown="App.ai.handleKey(event)" oninput="this.style.height='auto'; this.style.height = Math.min(this.scrollHeight, 192) + 'px'"></textarea>
                                            <div class="flex items-center gap-2 pb-2 sm:pb-2.5 shrink-0">
                                                <input type="file" id="ai-file-upload" class="hidden" multiple onchange="App.ai.handleFileSelect(event)">
                                                <span id="ai-counter" class="text-[10px] text-slate-300 dark:text-slate-600 font-mono hidden sm:block opacity-0 transition-opacity w-10 text-right select-none">0/4k</span>
                                                <button type="submit" id="ai-send-btn" onclick="App.ai.handleSubmit(event)" class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm cursor-pointer ml-1"><i class="fas fa-arrow-up text-xs"></i></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p class="text-center text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-600 mt-2 font-medium opacity-50 select-none">El asistente puede cometer errores. Verifica la información importante.</p>
                            </div>
                        </div>
                    </div>

                    <!-- RESIZABLE DIVIDER -->
                    <div id="ai-canvas-divider" class="hidden w-4 h-full bg-transparent hover:bg-indigo-500/10 cursor-col-resize transition-colors z-[60] flex items-center justify-center group/divider shrink-0 relative -ml-2" onmousedown="App.ai.startCanvasResize(event)">
                        <div class="w-1 h-12 bg-gray-300 dark:bg-slate-600 group-hover/divider:bg-indigo-400 rounded-full transition-colors pointer-events-none"></div>
                    </div>

                    <!-- CANVAS PANEL -->
                    <div id="ai-canvas-panel" class="hidden h-full bg-[#0d1117] flex flex-col transition-all duration-200 z-[60] relative border-l border-slate-800" style="width: 45%;">
                         <div class="h-10 bg-[#161b22] border-b border-slate-700/50 flex items-center justify-between px-2 shrink-0 select-none">
                            <div class="flex items-center gap-1 mt-1">
                                <button onclick="App.ai.switchCanvasTab('code')" id="ai-tab-code" class="px-4 py-2 text-xs font-bold rounded-t-lg transition-all text-white bg-[#0d1117] border-t border-x border-slate-700/50 -mb-px relative z-10"><i class="fas fa-code mr-1.5"></i>Código</button>
                                <button onclick="App.ai.switchCanvasTab('preview')" id="ai-tab-preview" class="px-4 py-2 text-xs font-medium rounded-t-lg transition-all text-slate-400 hover:text-slate-200 border-t border-x border-transparent"><i class="fas fa-eye mr-1.5"></i>Preview</button>
                            </div>
                            <div class="flex items-center gap-2">
                                 <button onclick="App.ai.extractCanvasToNewTab()" class="text-slate-500 hover:text-indigo-400 transition-colors p-1" title="Abrir en nueva pestaña"><i class="fas fa-external-link-alt text-xs"></i></button>
                                 <button onclick="App.ai.runCanvasCode()" class="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 rounded transition-colors font-bold uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-play"></i> Run</button>
                                 <button onclick="App.ai.toggleCanvasPanel(false)" class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-400 rounded-md transition-colors cursor-pointer z-50 relative"><i class="fas fa-times"></i></button>
                            </div>
                         </div>
                         <div id="ai-canvas-code-view" class="flex-1 min-h-0 overflow-hidden relative"><div id="ai-monaco-container" class="absolute inset-0 bg-[#0d1117]"></div></div>
                         <div id="ai-canvas-preview-view" class="hidden flex-1 min-h-0 overflow-hidden bg-white relative"><iframe id="ai-canvas-preview" class="absolute inset-0 w-full h-full border-0" sandbox="allow-scripts allow-forms allow-same-origin allow-popups"></iframe></div>
                    </div>
                </div> <!-- Close Split View -->
            </div>
        </main>
    </div>`;

    // 7. Force Refresh: Actualizar Sidebar Visualmente tras renderizar
    setTimeout(() => {
        const wrapper = document.getElementById('ai-sidebar-wrapper');
        const hasData = window.App.state.cache.aiConversations && Array.isArray(window.App.state.cache.aiConversations);
        if (wrapper && hasData) {
            const freshSidebar = window.App.sidebar.render('ai');
            wrapper.innerHTML = freshSidebar;
        }
    }, 50);

    App.ai.setupDragAndDrop();
    const scroller = document.getElementById('ai-scroller');
    scroller.addEventListener('scroll', () => {
        const isBottom = scroller.scrollHeight - scroller.scrollTop <= scroller.clientHeight + 150;
        window.App.ai.state.userScrolledUp = !isBottom;
        const btn = document.getElementById('scroll-btn');
        if (btn) btn.classList.toggle('hidden', isBottom);
    });

    await App.ai.loadConversation(user.uid, conversationId);
};

// [NUEVO] Acciones de Mensaje (Copiar texto)
window.App.ai.copyMessageText = (btn) => {
    const text = decodeURIComponent(btn.dataset.content || '');
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check text-emerald-500"></i>';
        setTimeout(() => btn.innerHTML = original, 2000);
    });
};

// [NUEVO] Acciones de Mensaje (Editar - Cargar en input)
window.App.ai.editMessageText = (btn) => {
    const text = decodeURIComponent(btn.dataset.content || '');
    if (!text) return;
    const input = document.getElementById('ai-input');
    if (input) {
        input.value = text;
        input.focus();
        // Auto-resize input height
        input.style.height = 'auto';
        input.style.height = (input.scrollHeight) + 'px';
    }
};

window.App.ai.extractCanvasToNewTab = () => {
    if (!_aiCanvasEditorInstance) return;
    const code = _aiCanvasEditorInstance.getValue();
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(code);
        win.document.close();
    }
};

// ============================================================================
// 2. LÓGICA DE MENÚ Y MODOS
// ============================================================================

// [NUEVO] Lógica del Menú de Modelos Persistente
window.App.ai.toggleModelMenu = (e) => {
    if (e) e.stopPropagation();
    const menu = document.getElementById('ai-model-menu');
    const arrow = document.getElementById('ai-model-arrow');
    const isOpen = !menu.classList.contains('hidden');

    if (isOpen) {
        menu.classList.add('hidden');
        if (arrow) arrow.classList.remove('rotate-180');
        window.App.ai.state.isModelMenuOpen = false;
        document.removeEventListener('click', _closeModelMenuOnClickOutside);
    } else {
        menu.classList.remove('hidden');
        if (arrow) arrow.classList.add('rotate-180');
        window.App.ai.state.isModelMenuOpen = true;
        // Delay pequeño para evitar cierre inmediato
        setTimeout(() => document.addEventListener('click', _closeModelMenuOnClickOutside), 10);
    }
};

function _closeModelMenuOnClickOutside(e) {
    const menu = document.getElementById('ai-model-menu');
    const btn = document.getElementById('ai-model-btn');
    // Si el clic NO fue en el menú y NO fue en el botón
    if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
        const arrow = document.getElementById('ai-model-arrow');
        if (arrow) arrow.classList.remove('rotate-180');
        window.App.ai.state.isModelMenuOpen = false;
        document.removeEventListener('click', _closeModelMenuOnClickOutside);
    }
}

window.App.ai.selectModel = (modelName, modelId, logoUrl) => {
    window.App.ai.state.modelName = modelName;
    window.App.ai.state.currentModelId = modelId;
    window.App.ai.state.currentModelLogo = logoUrl;

    // Actualizar UI Botón Selector
    const logoEl = document.getElementById('ai-model-logo');
    const nameEl = document.getElementById('ai-model-name');
    if (logoEl) logoEl.src = logoUrl;
    if (nameEl) nameEl.innerText = modelName;

    // Cerrar menú
    const menu = document.getElementById('ai-model-menu');
    const arrow = document.getElementById('ai-model-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
    window.App.ai.state.isModelMenuOpen = false;
    document.removeEventListener('click', _closeModelMenuOnClickOutside);

    if (window.App.ui && window.App.ui.toast) App.ui.toast(`Modelo cambiado a ${modelName}`, 'success');
};

window.App.ai.togglePlusMenu = (e) => {
    if (e) e.stopPropagation();
    const menu = document.getElementById('ai-plus-menu');
    const isOpen = !menu.classList.contains('hidden');
    if (isOpen) {
        menu.classList.add('hidden');
        window.App.ai.state.isMenuOpen = false;
        document.removeEventListener('click', _closeMenuOnClickOutside);
    } else {
        menu.classList.remove('hidden');
        window.App.ai.state.isMenuOpen = true;
        setTimeout(() => document.addEventListener('click', _closeMenuOnClickOutside), 10);
    }
};

function _closeMenuOnClickOutside(e) {
    const menu = document.getElementById('ai-plus-menu');
    if (menu && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        window.App.ai.state.isMenuOpen = false;
        document.removeEventListener('click', _closeMenuOnClickOutside);
    }
}

window.App.ai.toggleMode = (mode, e) => {
    if (e) e.stopPropagation();
    const currentState = window.App.ai.state.modes[mode];
    window.App.ai.state.modes[mode] = !currentState;

    const switchEl = document.getElementById(`switch-${mode}`);
    const knobEl = switchEl.querySelector('div');

    if (!currentState) {
        switchEl.classList.remove('bg-slate-200', 'dark:bg-slate-700');
        switchEl.classList.add('bg-indigo-500');
        knobEl.classList.add('translate-x-4');
        if (window.App.ui && window.App.ui.toast) App.ui.toast(`Modo ${mode} activado`, 'success');
    } else {
        switchEl.classList.add('bg-slate-200', 'dark:bg-slate-700');
        switchEl.classList.remove('bg-indigo-500');
        knobEl.classList.remove('translate-x-4');
    }

    if (mode === 'canvas') {
        // [FIX] No abrir automáticamente el panel. Solo activar el flag.
        // Se abrirá cuando llegue código o el usuario lo solicite.
        if (!currentState && window.App.ai.state.codeSnippets && window.App.ai.state.codeSnippets.length > 0) {
            // Excepción: Si ya hay snippets, y el usuario lo activa manual, podríamos mostrarlo.
            // Pero el usuario pidió explícitamente "solo cuando genera código".
            // Así que mantenemos cerrado.
        }
    }
};

window.App.ai.requestDelete = (e, chatId) => {
    e.stopPropagation();
    e.preventDefault();
    window.App.ai.state.chatToDelete = chatId;
    const modal = document.getElementById('ai-delete-modal');
    const content = document.getElementById('ai-delete-modal-content');
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex', 'opacity-100');
    setTimeout(() => content.classList.remove('scale-95'), 10);
};

// ... (omitted delete functions) ...

// Redimensionar Canvas - START
window.App.ai.startCanvasResize = (e) => {
    e.preventDefault();
    window.App.ai._isResizing = true;

    const splitView = document.getElementById('ai-split-view');
    if (splitView) splitView.style.userSelect = 'none';

    // [FIX] Prevenir que iframes capturen el mouse
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.style.pointerEvents = 'none');

    document.addEventListener('mousemove', App.ai._handleCanvasResize);
    document.addEventListener('mouseup', App.ai._stopCanvasResize);
};

window.App.ai._handleCanvasResize = (e) => {
    if (!window.App.ai._isResizing) return;
    const splitView = document.getElementById('ai-split-view');
    if (!splitView) return;

    const totalWidth = splitView.clientWidth;
    const leftOffset = splitView.getBoundingClientRect().left;
    const relativeX = e.clientX - leftOffset;

    // Panel derecho: Ancho = Total - MouseX
    let newWidth = totalWidth - relativeX;
    let percentage = (newWidth / totalWidth) * 100;

    // Límites (Min 20%, Max 80%)
    percentage = Math.max(20, Math.min(80, percentage));

    const panel = document.getElementById('ai-canvas-panel');
    if (panel) {
        panel.style.width = `${percentage}%`;
        window.App.ai.state.canvasWidthPercent = percentage;
    }
};

window.App.ai._stopCanvasResize = (e) => {
    window.App.ai._isResizing = false;
    const splitView = document.getElementById('ai-split-view');
    if (splitView) splitView.style.userSelect = '';

    // [FIX] Restaurar pointer-events en iframes para permitir interacción
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.style.pointerEvents = '');

    document.removeEventListener('mousemove', App.ai._handleCanvasResize);
    document.removeEventListener('mouseup', App.ai._stopCanvasResize);

    // Relayout Monaco si existe
    if (typeof _aiCanvasEditorInstance !== 'undefined' && _aiCanvasEditorInstance) {
        _aiCanvasEditorInstance.layout();
    }
};

window.App.ai.closeDeleteModal = () => {
    window.App.ai.state.chatToDelete = null;
    const modal = document.getElementById('ai-delete-modal');
    const content = document.getElementById('ai-delete-modal-content');
    content.classList.add('scale-95');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 200);
};

window.App.ai.confirmDelete = async () => {
    const chatId = window.App.ai.state.chatToDelete;
    if (!chatId) return;
    App.ai.closeDeleteModal();
    const user = App.state.currentUser;

    try {
        if (App.aiService && App.aiService.deleteConversation) {
            // 1. Llamada al Backend (Firestore)
            await App.aiService.deleteConversation(user.uid, chatId);

            // 2. [FIX] Actualización Optimista de la Caché Local
            if (window.App.state.cache.aiConversations) {
                window.App.state.cache.aiConversations = window.App.state.cache.aiConversations.filter(c => c.id !== chatId);
            }

            // 3. Si estabamos en el chat borrado, ir a nuevo chat
            if (window.App.ai.state.currentConversationId === chatId) {
                App.ai.newChat();
            } else {
                window.App.ai.triggerSidebarUpdate();
            }

            if (window.App.ui && window.App.ui.toast) App.ui.toast("Conversación eliminada", "success");
        }
    } catch (e) {
        console.error(e);
        if (window.App.ui && window.App.ui.toast) App.ui.toast("Error al eliminar", "error");
    }
};

// ============================================================================
// 3. LÓGICA DE INTERACCIÓN & CHAT
// ============================================================================

window.App.ai.handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!window.App.ai.state.isGenerating) App.ai.handleSubmit(e);
    }
};

window.App.ai.handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (window.App.ai.state.isGenerating) {
        if (App.aiService && App.aiService.stopGeneration) App.aiService.stopGeneration();
        _setLoadingState(false);
        return;
    }

    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    const files = window.App.ai.state.pendingFiles;

    if (!text && files.length === 0) return;

    const container = document.getElementById('ai-content');
    const userId = App.state.currentUser.uid;
    // Captura segura del ID actual al inicio del proceso
    let conversationId = window.App.ai.state.currentConversationId;

    if (!conversationId || container.querySelector('.welcome-screen')) {
        _setChatLayout(container);
        container.innerHTML = '';
    }

    input.value = '';
    input.style.height = 'auto';
    window.App.ai.state.pendingFiles = [];
    App.ai.renderFilePreviews();
    _setLoadingState(true);

    container.insertAdjacentHTML('beforeend', _renderMessage('user', text, files));
    App.ai.scrollToBottom(true);

    try {
        let historyForStream = [];

        // 1. GARANTIZAR ID DE CONVERSACIÓN ANTES DE STREAMING
        if (!conversationId) {
            const title = await App.aiService.generateTitle(text || "Consulta");
            conversationId = await App.aiService.createConversation(userId, title);
            window.App.ai.state.currentConversationId = conversationId; // Actualizar estado global

            // TRIGGER UPDATE: Actualización reactiva del sidebar
            window.App.ai.triggerSidebarUpdate();

            historyForStream = [{ role: 'user', content: text }];
        } else {
            const dbHistory = await App.aiService.getMessages(userId, conversationId);
            historyForStream = dbHistory.map(m => ({ role: m.role, content: m.content }));
            historyForStream.push({ role: 'user', content: text });
        }

        // Variable local blindada para el callback del stream
        // NOTA: Esta variable captura el ID en este momento exacto.
        const activeConversationId = conversationId;

        const fileData = files.map(f => ({ name: f.file.name, type: f.type, size: f.file.size }));
        await App.aiService.saveMessage(userId, activeConversationId, 'user', text, fileData);

        const aiId = `ai-msg-${Date.now()}`;
        container.insertAdjacentHTML('beforeend', _renderAiSkeleton(aiId));
        App.ai.scrollToBottom(true);

        const responseEl = document.getElementById(aiId);
        const cursorEl = document.getElementById(`${aiId}-cursor`);
        let fullResponse = "";

        await App.aiService.streamMessage(
            historyForStream,
            (chunk) => {
                fullResponse += chunk;
                if (window.marked) {
                    responseEl.innerHTML = window.marked.parse(fullResponse);
                } else {
                    responseEl.innerText = fullResponse;
                }
                App.ai.scrollToBottom();

                // [LIVE CANVAS UPDATE]
                if (window.App.ai.updateCanvasFromStream) {
                    window.App.ai.updateCanvasFromStream(fullResponse);
                }
            },
            async (finalText, error) => {
                if (cursorEl) cursorEl.remove();

                // [CANVAS SYNC FINAL]
                if (finalText && window.App.ai.state.modes.canvas && window.App.ai.setCanvasCode) {
                    const match = finalText.match(/```(\w+)?\n([\s\S]*?)(```|$)/); // Regex mejorada
                    if (match) {
                        window.App.ai.setCanvasCode(match[2], match[1] || 'javascript');
                        if (window.App.ui && window.App.ui.toast) App.ui.toast("Código sincronizado al Canvas", "info");
                    }
                }
                // ... (rest of error handling)
                if (error && error !== 'abort') {
                    // ...
                    responseEl.innerHTML += `<div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold border border-red-200 dark:border-red-800 flex items-center gap-2"><i class="fas fa-exclamation-circle"></i> ${error}</div>`;
                } else if (finalText) {
                    // ... persistence logic
                    const targetId = activeConversationId || window.App.ai.state.currentConversationId;
                    if (targetId) {
                        try {
                            console.log(`[AI VIEW] Guardando respuesta en chat: ${targetId}`);
                            await App.aiService.saveMessage(userId, targetId, 'assistant', finalText);
                        } catch (saveErr) {
                            console.error("[AI VIEW] Error crítico guardando respuesta:", saveErr);
                        }
                    }
                }
            }
        );
    } catch (err) {
        console.error(err);
        _setLoadingState(false);
        if (window.App.ui && window.App.ui.toast) App.ui.toast("Error de conexión", "error");
    }
};

window.App.ai.loadConversation = async (userId, conversationId) => {
    const container = document.getElementById('ai-content');
    if (!container) return;

    if (!conversationId) {
        _setWelcomeLayout(container);
        container.innerHTML = _renderWelcomeScreen(App.state.currentUser.name);
        return;
    }

    try {
        console.log(`[AI VIEW] Cargando historias de ${conversationId}...`);
        const messages = await App.aiService.getMessages(userId, conversationId);

        // [NUEVO] Cargar Snippets
        if (App.aiService.getSnippets) {
            const snippets = await App.aiService.getSnippets(userId, conversationId);
            window.App.ai.state.codeSnippets = snippets || [];

            // Si hay snippets, actualizar UI
            if (window.App.ai.state.codeSnippets.length > 0) {
                const count = window.App.ai.state.codeSnippets.length;
                const countEl = document.getElementById('ai-snippets-count');
                const topBadge = document.getElementById('ai-top-snippets-badge');

                if (countEl) { countEl.textContent = count; countEl.classList.remove('hidden'); }
                if (topBadge) { topBadge.textContent = count; topBadge.classList.remove('hidden'); }
            }
        } else {
            window.App.ai.state.codeSnippets = [];
        }

        if (messages.length === 0) {
            console.warn(`[AI VIEW] Chat vacío o no encontrado: ${conversationId}`);
            _setWelcomeLayout(container);
            container.innerHTML = _renderWelcomeScreen(App.state.currentUser.name);
        } else {
            console.log(`[AI VIEW] Renderizando ${messages.length} mensajes.`);
            _setChatLayout(container);
            container.innerHTML = messages.map(m => _renderMessage(m.role, m.content, m.files)).join('');
            container.insertAdjacentHTML('beforeend', '<div class="h-4 w-full"></div>');
        }
        setTimeout(() => App.ai.scrollToBottom(true), 150);
    } catch (e) {
        console.error(`[AI VIEW] Error cargando historial (${conversationId}):`, e);
        _setWelcomeLayout(container);
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-50">
            <i class="fas fa-bug text-3xl"></i>
            <p>No se pudo cargar el historial.</p>
            <p class="text-xs font-mono">${e.message || 'Error desconocido'}</p>
        </div>`;
    }
};

// ============================================================================
// 4. SYNC DEL SIDEBAR (EVENT BASED)
// ============================================================================

window.App.ai.syncSidebarData = async (userId) => {
    try {
        if (!App.aiService) return;
        const conversations = await App.aiService.getConversations(userId);
        window.App.state = window.App.state || {};
        window.App.state.cache = window.App.state.cache || {};
        window.App.state.cache.aiConversations = conversations || [];
        return conversations;
    } catch (e) {
        console.error("AI: Sync Error", e);
        window.App.state.cache.aiConversations = [];
        return [];
    }
};

// Función para despachar el evento de actualización
window.App.ai.triggerSidebarUpdate = () => {
    const event = new CustomEvent('ai:state:changed');
    window.dispatchEvent(event);

    const wrapper = document.getElementById('ai-sidebar-wrapper');
    if (wrapper && window.App.sidebar && window.App.sidebar.render) {
        wrapper.innerHTML = window.App.sidebar.render('ai');
    }
};

window.App.ai.updateSidebar = async () => {
    window.App.ai.triggerSidebarUpdate();
};

// ============================================================================
// 5. HELPERS VISUALES
// ============================================================================

function _setWelcomeLayout(container) {
    container.classList.remove('justify-end', 'pb-10');
    container.classList.add('justify-center', 'items-center', 'h-full');
}

function _setChatLayout(container) {
    container.classList.remove('justify-center', 'items-center', 'h-full');
    container.classList.add('justify-end', 'pb-10');
}

// ============================================================================
// CANVAS CONTROLLER
// ============================================================================
let _canvasEditor = null;
let _aiCanvasEditorInstance = null; // Instancia Monaco Global al View

// [NOTE] toggleCanvasPanel está definido en la sección 7 al final del archivo

async function _initMonacoCanvas() {
    try {
        const monaco = await App.utils.loadMonaco();
        const container = document.getElementById('ai-monaco-container');
        if (!container) return;
        container.innerHTML = '';

        _aiCanvasEditorInstance = monaco.editor.create(container, {
            value: '// El código generado aparecerá aquí...',
            language: 'javascript',
            theme: App.state.theme === 'dark' ? 'vs-dark' : 'vs',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Fira Code', Consolas, monospace"
        });
    } catch (e) { console.error("Monaco load error", e); }
}

window.App.ai.runCanvasCode = () => {
    if (!_aiCanvasEditorInstance) return;
    const code = _aiCanvasEditorInstance.getValue();

    const preview = document.getElementById('ai-canvas-preview');
    if (!preview) return;

    const iframeDoc = preview.contentDocument || preview.contentWindow.document;
    iframeDoc.open();
    // Auto-detect HTML wrapper
    if (!code.trim().startsWith('<')) {
        iframeDoc.write(`<html><body style="font-family:sans-serif; padding:1rem"><script>${code}<\/script></body></html>`);
    } else {
        iframeDoc.write(code);
    }
    iframeDoc.close();

    // Cambiar a tab Preview después de ejecutar
    App.ai.switchCanvasTab('preview');
};

// [NOTE] setCanvasCode está definido en la sección 7 al final del archivo

// [NOTE] setCanvasCode está definido en la sección 7 al final del archivo

function _renderMessage(role, content, files = [], id = null) {
    const isUser = role === 'user';
    const msgId = id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let htmlContent = window.marked ? window.marked.parse(content || '') : content.replace(/\n/g, '<br>');

    let filesHtml = '';
    if (files.length > 0) {
        filesHtml = `<div class="flex flex-wrap gap-2 mb-3 ${isUser ? 'justify-end' : ''}">
            ${files.map(f => {
            const isImg = f.type && f.type.startsWith('image/');
            const url = f.previewUrl || '#';
            return isImg
                ? `<div class="w-32 h-32 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 shadow-sm relative group cursor-pointer bg-slate-100 dark:bg-white/5">
                        ${url !== '#' ? `<img src="${url}" class="w-full h-full object-cover">` : `<div class="flex items-center justify-center h-full text-slate-400"><i class="fas fa-image"></i></div>`}
                      </div>`
                : `<div class="px-4 py-3 bg-white dark:bg-[#1e293b] rounded-xl flex items-center gap-3 text-xs font-mono border border-black/5 dark:border-white/5 shadow-sm text-slate-600 dark:text-slate-300">
                        <div class="w-8 h-8 rounded bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500"><i class="fas fa-file-code"></i></div>
                        <span>${f.name}</span>
                       </div>`;
        }).join('')}
        </div>`;
    }

    // [CAMBIO V20.0] IMAGEN OFICIAL GROK (SIN SVG)
    const currentLogo = window.App.ai.state.currentModelLogo || GROK_LOGO_URL;
    const grokLogo = `
    <div class="shrink-0 mt-1 shadow-sm rounded-lg overflow-hidden w-8 h-8 select-none bg-white border border-gray-100 dark:border-white/5 p-0.5">
        <img src="${currentLogo}" class="w-full h-full object-contain" alt="AI" draggable="false">
    </div>`;

    if (isUser) {
        // [NUEVO] Botones de Acción para Usuario (Copiar / Editar)
        const encodedContent = encodeURIComponent(content);
        return `
        <div class="flex flex-col items-end group/msg relative w-full mb-6 pl-10" id="${msgId}">
            <div class="bg-[#f4f6f8] dark:bg-[#21262d] text-slate-800 dark:text-slate-200 rounded-[1.3rem] rounded-tr-sm px-5 py-3.5 max-w-full text-[15px] leading-relaxed shadow-sm border border-transparent dark:border-white/5 selection:bg-indigo-500/30 break-words relative z-10 transition-colors">
                ${filesHtml}
                <div class="whitespace-pre-wrap">${htmlContent}</div>
            </div>
            
            <!-- ACIONES FLOTANTES (Visible en Hover) -->
            <div class="absolute -bottom-6 right-2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-all duration-200 z-0">
                <button onclick="App.ai.copyMessageText(this)" data-content="${encodedContent}" class="text-slate-400 hover:text-indigo-500 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" title="Copiar texto">
                    <i class="far fa-copy text-xs"></i>
                </button>
                <button onclick="App.ai.editMessageText(this)" data-content="${encodedContent}" class="text-slate-400 hover:text-indigo-500 p-1.5 rounded-full hover:bg-slate-100 dark:bg-white/5 transition-colors" title="Editar mensaje">
                    <i class="far fa-pen-to-square text-xs"></i>
                </button>
            </div>
        </div>`;
    } else {
        return `
        <div class="flex items-start gap-4 mb-6 group/ai w-full" id="${msgId}">
            ${grokLogo}
            <div class="flex-1 min-w-0 max-w-full space-y-2 pt-1.5">
                <div class="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-code:font-mono prose-code:text-sm prose-pre:bg-[#0d1117] prose-pre:rounded-xl prose-pre:border prose-pre:border-white/10 selection:bg-indigo-500/30 text-[15px] text-slate-700 dark:text-slate-300">
                    ${htmlContent}
                </div>
            </div>
        </div>`;
    }
}

function _renderAiSkeleton(id) {
    // [CAMBIO V20.0] LOGO ESTÁTICO EN SKELETON (SIN PULSE)
    // El contenedor de la respuesta mantiene fade-in, pero la imagen es sólida.
    const currentLogo = window.App.ai.state.currentModelLogo || GROK_LOGO_URL;
    const grokLogo = `
    <div class="shrink-0 mt-1 shadow-sm rounded-lg overflow-hidden w-8 h-8 select-none bg-white border border-gray-100 dark:border-white/5 p-0.5">
        <img src="${currentLogo}" class="w-full h-full object-contain" alt="AI" draggable="false">
    </div>`;

    return `
    <div class="flex gap-4 md:gap-6 mb-12 w-full animate-fade-in pl-1">
        ${grokLogo}
        <div class="flex-1 min-w-0">
            <div class="text-[13px] font-bold text-slate-900 dark:text-white mb-2">${window.App.ai.state.modelName}</div>
            <div class="prose dark:prose-invert max-w-none text-[16px] leading-7 text-slate-700 dark:text-slate-300">
                <span id="${id}"></span><span id="${id}-cursor" class="inline-block w-2 h-5 bg-indigo-500 ml-1 align-middle animate-blink rounded-sm"></span>
            </div>
        </div>
    </div>`;
}

function _renderWelcomeScreen(name) {
    const suggestions = [
        { icon: 'fa-search', title: 'Explorar Código', desc: 'Analizar repositorios complejos' },
        { icon: 'fa-paint-brush', title: 'Diseñar UI', desc: 'Generar componentes Tailwind' },
        { icon: 'fa-bug', title: 'Depurar App', desc: 'Encontrar errores lógicos' },
        { icon: 'fa-bolt', title: 'Optimizar', desc: 'Mejorar rendimiento web' }
    ];

    return `
    <div class="welcome-screen flex flex-col items-center justify-center w-full max-w-2xl mx-auto text-center px-4 animate-scale-in pb-16">
        <h2 class="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Hola, <span class="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">${name}</span>
        </h2>
        <p class="text-slate-500 dark:text-slate-400 mb-12 max-w-lg mx-auto text-lg leading-relaxed">
            ¿Qué desafío técnico vamos a resolver hoy?
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            ${suggestions.map(s => `
                <button onclick="document.getElementById('ai-input').value='${s.title}'; document.getElementById('ai-input').focus();" 
                    class="p-4 bg-white dark:bg-[#151b28] border border-slate-200 dark:border-white/5 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xl transition-all group/btn text-left flex items-center gap-4 relative overflow-hidden">
                    <div class="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover/btn:text-indigo-500 group-hover/btn:bg-white dark:group-hover/btn:bg-white/10 transition-all shadow-sm shrink-0 relative z-10">
                        <i class="fas ${s.icon} text-xl"></i>
                    </div>
                    <div class="relative z-10">
                        <span class="block text-sm font-bold text-slate-800 dark:text-slate-200 group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-300 transition-colors">${s.title}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-500">${s.desc}</span>
                    </div>
                </button>`).join('')}
        </div>
    </div>`;
}

function _setLoadingState(loading) {
    window.App.ai.state.isGenerating = loading;
    const btn = document.getElementById('ai-send-btn');
    if (!btn) return;

    if (loading) {
        btn.innerHTML = '<i class="fas fa-circle-stop text-xs animate-pulse"></i>';
        btn.classList.add('bg-slate-800', 'dark:bg-slate-700');
        btn.classList.remove('hover:opacity-90');
    } else {
        btn.innerHTML = '<i class="fas fa-arrow-up text-xs"></i>';
        btn.classList.remove('bg-slate-800', 'dark:bg-slate-700');
        btn.classList.add('hover:opacity-90');
        setTimeout(() => document.getElementById('ai-input')?.focus(), 100);
    }
}

// ============================================================================
// 6. GESTIÓN DE ARCHIVOS & UTILS COMPLETAS
// ============================================================================

window.App.ai.handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    App.ai.processFiles(files);
    e.target.value = '';
};

window.App.ai.processFiles = (files) => {
    const current = window.App.ai.state.pendingFiles;
    if (current.length + files.length > 5) {
        if (window.App.ui && window.App.ui.toast) App.ui.toast("Máximo 5 archivos", "warning");
        return;
    }
    files.forEach(f => window.App.ai.state.pendingFiles.push({
        file: f,
        id: Date.now() + Math.random(),
        previewUrl: URL.createObjectURL(f),
        type: f.type
    }));
    App.ai.renderFilePreviews();
};

window.App.ai.removeFile = (id) => {
    window.App.ai.state.pendingFiles = window.App.ai.state.pendingFiles.filter(f => f.id !== id);
    App.ai.renderFilePreviews();
};

window.App.ai.renderFilePreviews = () => {
    const container = document.getElementById('file-preview-area');
    const files = window.App.ai.state.pendingFiles;
    if (!container) return;

    if (files.length === 0) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');
    container.innerHTML = files.map(f => {
        const isImg = f.type && f.type.startsWith('image/');
        return `<div class="relative group shrink-0 mb-1 animate-scale-in">
            <div class="h-14 min-w-[3.5rem] max-w-[8rem] rounded-lg overflow-hidden border border-white/10 bg-white/5 relative flex items-center justify-center">
                ${isImg ? `<img src="${f.previewUrl}" class="w-full h-full object-cover">` : `<i class="fas fa-file-code text-indigo-500"></i><span class="ml-2 text-[9px] uppercase">${f.file.name.split('.').pop()}</span>`}
            </div>
            <button onclick="App.ai.removeFile(${f.id})" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-600 text-slate-200 rounded-full flex items-center justify-center text-[8px] hover:bg-red-500 hover:text-white cursor-pointer"><i class="fas fa-times"></i></button>
        </div>`;
    }).join('');
};

window.App.ai.setupDragAndDrop = () => {
    const zone = document.getElementById('ai-drop-zone');
    const overlay = document.getElementById('ai-drag-overlay');
    let counter = 0;
    if (!zone || !overlay) return;

    zone.addEventListener('dragenter', e => { e.preventDefault(); counter++; overlay.classList.remove('hidden'); setTimeout(() => overlay.classList.remove('opacity-0'), 10); });
    zone.addEventListener('dragleave', e => { e.preventDefault(); counter--; if (counter <= 0) { overlay.classList.add('opacity-0'); setTimeout(() => overlay.classList.add('hidden'), 300); counter = 0; } });
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => {
        e.preventDefault(); counter = 0; overlay.classList.add('opacity-0'); setTimeout(() => overlay.classList.add('hidden'), 300);
        if (e.dataTransfer.files.length) App.ai.processFiles(Array.from(e.dataTransfer.files));
    });
};

window.App.ai.newChat = () => {
    window.App.ai.state.currentConversationId = null; // Reiniciar ID para limpiar estado
    window.location.hash = '#ai';
    const root = document.getElementById('ai-root') || document.querySelector('main');
    if (root) App.ai.render(root);
};

window.App.ai.scrollToBottom = (force) => {
    if (window.App.ai.state.userScrolledUp && !force) return;
    const s = document.getElementById('ai-scroller');
    if (s) s.scrollTo({ top: s.scrollHeight, behavior: 'smooth' });
};

window.App.ai.copyCode = (btn) => {
    try {
        const content = decodeURIComponent(btn.parentElement.querySelector('.code-content').innerText);
        navigator.clipboard.writeText(content);
        const span = btn.querySelector('span');
        const icon = btn.querySelector('i');
        if (span) span.innerText = 'Copiado!';
        icon.className = 'fas fa-check text-emerald-500';
        setTimeout(() => {
            icon.className = 'far fa-copy';
            if (span) span.innerText = 'Copiar';
        }, 2000);
    } catch (e) { console.error(e); }
};

window.App.ai.copyText = (btn) => {
    try {
        const text = btn.parentElement.parentElement.querySelector('.prose').innerText;
        navigator.clipboard.writeText(text);
        if (window.App.ui && window.App.ui.toast) App.ui.toast("Texto copiado", "success");
    } catch (e) { console.error(e); }
};

// ============================================================================
// 6. MODEL SELECTOR FUNCTIONS
// ============================================================================

window.App.ai.toggleModelMenu = (event) => {
    if (event) event.stopPropagation();
    const menu = document.getElementById('ai-model-menu');
    const arrow = document.getElementById('ai-model-arrow');

    if (!menu) return;

    const isOpen = !menu.classList.contains('hidden');

    if (isOpen) {
        menu.classList.add('hidden');
        if (arrow) arrow.style.transform = '';
    } else {
        menu.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';

        // Close on outside click
        const closeHandler = (e) => {
            if (!e.target.closest('#ai-model-menu') && !e.target.closest('#ai-model-btn')) {
                menu.classList.add('hidden');
                if (arrow) arrow.style.transform = '';
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }
};

window.App.ai.selectModel = (name, modelId, logo) => {
    // Update state
    window.App.ai.state.modelName = name;
    window.App.ai.state.currentModelId = modelId;
    window.App.ai.state.currentModelLogo = logo;

    // Update UI elements
    const nameEl = document.getElementById('ai-model-name');
    const logoEl = document.getElementById('ai-model-logo');

    if (nameEl) nameEl.textContent = name;
    if (logoEl) logoEl.src = logo;

    // Close dropdown
    const menu = document.getElementById('ai-model-menu');
    const arrow = document.getElementById('ai-model-arrow');
    if (menu) menu.classList.add('hidden');
    if (arrow) arrow.style.transform = '';

    // Notify user
    if (window.App.ui && window.App.ui.toast) {
        App.ui.toast(`Modelo cambiado a ${name}`, "success");
    }

    console.log(`[AI] Model selected: ${name} (${modelId})`);
};

// ============================================================================
// 7. CANVAS IMPROVEMENTS - RESIZE, SNIPPETS, AUTO-OPEN
// ============================================================================

// Toggle Canvas Panel (mejorado)
window.App.ai.toggleCanvasPanel = async (show) => {
    const panel = document.getElementById('ai-canvas-panel');
    const divider = document.getElementById('ai-canvas-divider');
    const leftCol = document.getElementById('ai-left-column');
    const switchEl = document.getElementById('switch-canvas');

    if (!panel) return;

    window.App.ai.state.modes.canvas = show;

    if (show) {
        panel.classList.remove('hidden');
        if (divider) divider.classList.remove('hidden');

        // Check defaults
        if (!window.App.ai.state.canvasWidthPercent) window.App.ai.state.canvasWidthPercent = 45;

        // Ajustar layout
        panel.style.width = `${window.App.ai.state.canvasWidthPercent}%`;
        if (leftCol) leftCol.style.flex = `1 1 ${100 - window.App.ai.state.canvasWidthPercent}%`;

        // Update UI Switch (ON)
        if (switchEl) {
            switchEl.classList.remove('bg-slate-200', 'dark:bg-slate-700');
            switchEl.classList.add('bg-indigo-500');
            const knob = switchEl.querySelector('div');
            if (knob) knob.classList.add('translate-x-4');
        }

        // Inicializar Monaco si no existe
        setTimeout(async () => {
            if (!_aiCanvasEditorInstance) await _initMonacoCanvas();
            if (_aiCanvasEditorInstance) _aiCanvasEditorInstance.layout();
        }, 100);
    } else {
        panel.classList.add('hidden');
        if (divider) divider.classList.add('hidden');
        if (leftCol) leftCol.style.flex = ''; // Reset flex to allow full width

        // Update UI Switch (OFF)
        if (switchEl) {
            switchEl.classList.add('bg-slate-200', 'dark:bg-slate-700');
            switchEl.classList.remove('bg-indigo-500');
            const knob = switchEl.querySelector('div');
            if (knob) knob.classList.remove('translate-x-4');
        }
    }
};

// Redimensionar Canvas - MOVE
window.App.ai._handleCanvasResize = (e) => {
    if (!window.App.ai._isResizing) return;

    const splitView = document.getElementById('ai-split-view');
    const panel = document.getElementById('ai-canvas-panel');
    const leftCol = document.getElementById('ai-left-column');

    if (!splitView || !panel) return;

    const bounds = splitView.getBoundingClientRect();
    // [FIX] Cálculo corregido: width total - posición del mouse desde la izquierda
    // La dirección es derecha -> izquierda porque el panel está a la derecha
    const mouseX = e.clientX - bounds.left;
    const totalWidth = bounds.width;

    // Si el mouse está en X, el ancho del canvas (derecha) es Total - X
    let canvasPercent = ((totalWidth - mouseX) / totalWidth) * 100;

    // Limitar entre 25% y 75%
    canvasPercent = Math.max(25, Math.min(75, canvasPercent));

    window.App.ai.state.canvasWidthPercent = canvasPercent;

    // Aplicar estilos
    panel.style.width = `${canvasPercent}%`;
    if (leftCol) leftCol.style.flex = `1 1 ${100 - canvasPercent}%`; // Usar flex para la columna izquierda

    // Relayout Monaco (Throttled)
    if (_aiCanvasEditorInstance) {
        requestAnimationFrame(() => _aiCanvasEditorInstance.layout());
    }
};

// Redimensionar Canvas - STOP
window.App.ai._stopCanvasResize = () => {
    window.App.ai._isResizing = false;

    const splitView = document.getElementById('ai-split-view');
    if (splitView) splitView.style.userSelect = '';

    // [FIX] Restaurar interacción con iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.style.pointerEvents = '');

    document.removeEventListener('mousemove', App.ai._handleCanvasResize);
    document.removeEventListener('mouseup', App.ai._stopCanvasResize);
};

// Toggle Preview
window.App.ai.togglePreview = () => {
    const wrapper = document.getElementById('ai-preview-wrapper');
    if (wrapper) wrapper.classList.toggle('hidden');
    if (_aiCanvasEditorInstance) _aiCanvasEditorInstance.layout();
};

// Snippets Menu Toggle
window.App.ai.toggleSnippetsMenu = (e) => {
    if (e) e.stopPropagation();
    const menu = document.getElementById('ai-snippets-menu');
    if (!menu) return;

    const isOpen = !menu.classList.contains('hidden');

    if (isOpen) {
        menu.classList.add('hidden');
        window.App.ai.state.isSnippetsMenuOpen = false;
    } else {
        // Renderizar lista antes de mostrar
        App.ai._renderSnippetsList();
        menu.classList.remove('hidden');
        window.App.ai.state.isSnippetsMenuOpen = true;

        // Cerrar al click fuera
        setTimeout(() => {
            const closeHandler = (ev) => {
                if (!ev.target.closest('#ai-snippets-menu') && !ev.target.closest('#ai-snippets-btn')) {
                    menu.classList.add('hidden');
                    window.App.ai.state.isSnippetsMenuOpen = false;
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    }
};

// Renderizar lista de snippets
window.App.ai._renderSnippetsList = () => {
    const list = document.getElementById('ai-snippets-list');
    const snippets = window.App.ai.state.codeSnippets || [];

    if (!list) return;

    if (snippets.length === 0) {
        list.innerHTML = '<p class="px-4 py-3 text-xs text-slate-400 text-center">No hay código generado aún</p>';
        return;
    }

    list.innerHTML = snippets.map((s, idx) => {
        const langIcon = s.lang === 'html' ? 'fa-code' : s.lang === 'python' ? 'fa-python' : s.lang === 'sql' ? 'fa-database' : 'fa-file-code';
        const langColor = s.lang === 'html' ? 'text-orange-500' : s.lang === 'python' ? 'text-blue-500' : s.lang === 'sql' ? 'text-emerald-500' : 'text-indigo-500';
        const preview = s.code.substring(0, 60).replace(/\n/g, ' ') + (s.code.length > 60 ? '...' : '');

        return `
        <div onclick="App.ai.loadSnippet(${idx})" class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
            <div class="flex items-center gap-2 mb-1">
                <i class="fab ${langIcon} ${langColor} text-xs"></i>
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">${s.lang || 'code'}</span>
                <span class="text-[10px] text-slate-400 ml-auto">${new Date(s.timestamp).toLocaleTimeString()}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">${preview}</p>
        </div>`;
    }).join('');
};

// Cargar snippet en el editor
window.App.ai.loadSnippet = (index) => {
    const snippets = window.App.ai.state.codeSnippets || [];
    if (index < 0 || index >= snippets.length) return;

    const snippet = snippets[index];

    // Abrir canvas si no está abierto
    if (!window.App.ai.state.modes.canvas) {
        window.App.ai.state.modes.canvas = true;
        App.ai.toggleCanvasPanel(true);
    }

    // Cargar código
    setTimeout(() => {
        App.ai.setCanvasCode(snippet.code, snippet.lang);
    }, 150);

    // Cerrar menú
    const menu = document.getElementById('ai-snippets-menu');
    if (menu) menu.classList.add('hidden');
    window.App.ai.state.isSnippetsMenuOpen = false;
};

// Agregar snippet al historial
window.App.ai.addCodeSnippet = (code, lang = 'javascript') => {
    // [MEJORA] Intentar extraer nombre de archivo del código (primera línea o comentario)
    // Patrones: // filename.js, <!-- index.html -->, # script.py
    let fileName = null;
    const firstLines = code.split('\n').slice(0, 5).join('\n');
    const nameMatch = firstLines.match(/(?:\/\/|<!--|#)\s*(?:filename:\s*)?([\w./-]+\.(?:js|html|css|py|sql|json|jsx|tsx|vue|ts|txt|md))/i);

    if (nameMatch) {
        fileName = nameMatch[1];
    } else {
        // Fallback: Nombre genérico con hora
        fileName = `snippet_${new Date().toLocaleTimeString([], { hour12: false }).replace(/:/g, '')}.${lang === 'python' ? 'py' : lang === 'javascript' ? 'js' : lang}`;
    }

    const snippet = {
        id: Date.now(),
        code: code,
        lang: lang,
        fileName: fileName,
        conversationId: window.App.ai.state.currentConversationId, // [FIX] Scope
        timestamp: Date.now()
    };

    // Mantener máximo 10 snippets EN MEMORIA (pero guardar en BD)
    window.App.ai.state.codeSnippets.unshift(snippet);
    if (window.App.ai.state.codeSnippets.length > 10) {
        window.App.ai.state.codeSnippets.pop();
    }

    // [PERSISTENCIA] Guardar en Backend
    const userId = window.App.state?.currentUser?.uid;
    if (userId && snippet.conversationId && App.aiService && App.aiService.saveSnippet) {
        App.aiService.saveSnippet(userId, snippet.conversationId, snippet);
    }

    const count = window.App.ai.state.codeSnippets.length;

    // Actualizar contador UI en Canvas header
    const countEl = document.getElementById('ai-snippets-count');
    if (countEl) {
        countEl.textContent = count;
        countEl.classList.remove('hidden');
    }

    // Actualizar badge en Top Bar
    const topBadge = document.getElementById('ai-top-snippets-badge');
    if (topBadge) {
        topBadge.textContent = count;
        topBadge.classList.remove('hidden');
    }

    return snippet;
};

// Actualizar setCanvasCode para apertura automática y manejo robusto
const _originalSetCanvasCode = window.App.ai.setCanvasCode; // Backup por seguridad
window.App.ai.setCanvasCode = async (code, lang = 'javascript') => {
    // 1. Guardar snippet siempre
    App.ai.addCodeSnippet(code, lang);

    // 2. Abrir canvas si no está visible
    const panel = document.getElementById('ai-canvas-panel');
    if (window.App.ai.state.modes.canvas || (panel && panel.classList.contains('hidden'))) {
        window.App.ai.state.modes.canvas = true;
        await App.ai.toggleCanvasPanel(true);
    }

    // 3. Esperar a que Monaco esté listo (Race Condition Fix)
    // Intentar hasta 5 veces (500ms)
    let attempts = 0;
    while (!_aiCanvasEditorInstance && attempts < 10) {
        await new Promise(r => setTimeout(r, 50));
        attempts++;
    }

    // 4. Setear valor
    if (_aiCanvasEditorInstance) {
        const model = _aiCanvasEditorInstance.getModel();
        if (model) {
            model.setValue(code);
            const monacoLang = lang === 'html' ? 'html' : lang === 'python' ? 'python' : lang === 'sql' ? 'sql' : 'javascript';
            if (window.monaco) monaco.editor.setModelLanguage(model, monacoLang);
        }
    }
};

// Renderizar lista de snippets como TARJETAS DE ARCHIVO
window.App.ai._renderTopSnippetsList = () => {
    const list = document.getElementById('ai-top-snippets-list');
    const countLabel = document.getElementById('ai-top-snippets-count-label');
    // [FIX] Filtrar por conversación actual
    const currentId = window.App.ai.state.currentConversationId;
    const snippets = (window.App.ai.state.codeSnippets || []).filter(s => s.conversationId === currentId);

    if (!list) return;

    if (countLabel) countLabel.textContent = `${snippets.length} archivo${snippets.length !== 1 ? 's' : ''}`;

    if (snippets.length === 0) {
        list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-slate-400">
            <i class="far fa-folder-open text-2xl mb-2 opacity-50"></i>
            <p class="text-xs">No hay códigos generados</p>
        </div>`;
        return;
    }

    list.innerHTML = snippets.map((s, idx) => {
        // Iconos y Colores por lenguaje
        let iconClass = 'fa-file-code';
        let colorClass = 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';
        let langName = (s.lang || 'text').toUpperCase();

        if (s.lang === 'html') { iconClass = 'fa-html5'; colorClass = 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'; }
        else if (s.lang === 'css') { iconClass = 'fa-css3-alt'; colorClass = 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'; }
        else if (s.lang === 'javascript' || s.lang === 'js') { iconClass = 'fa-js'; colorClass = 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'; }
        else if (s.lang === 'python') { iconClass = 'fa-python'; colorClass = 'text-blue-400 bg-blue-50 dark:bg-blue-900/20'; }
        else if (s.lang === 'sql') { iconClass = 'fa-database'; colorClass = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'; }

        // Nombre de archivo simulado si no tiene
        const fileName = s.fileName || `snippet_${s.id}.${s.lang === 'python' ? 'py' : s.lang === 'javascript' ? 'js' : s.lang}`;

        return `
        <div onclick="App.ai.loadSnippetFromTop(${idx})" class="group flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all border-b border-transparent hover:border-slate-100 dark:hover:border-slate-700 last:border-0 relative">
            <!-- Icono -->
            <div class="w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <i class="fab ${iconClass} text-lg"></i>
            </div>
            
            <!-- Info -->
            <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${fileName}</h4>
                <div class="flex items-center gap-2 text-[10px] text-slate-400">
                    <span class="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 rounded">${langName}</span>
                    <span>•</span>
                    <span>${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
            
            <!-- Arrow -->
            <i class="fas fa-chevron-right text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-sm"></i>
        </div>`;
    }).join('');
};

// Cargar snippet desde el top menu (abre Canvas automáticamente)
window.App.ai.loadSnippetFromTop = (index) => {
    const snippets = window.App.ai.state.codeSnippets || [];
    if (index < 0 || index >= snippets.length) return;

    const snippet = snippets[index];

    // Activar modo canvas
    window.App.ai.state.modes.canvas = true;

    // Actualizar switch UI
    const switchEl = document.getElementById('switch-canvas');
    if (switchEl) {
        switchEl.classList.remove('bg-slate-200', 'dark:bg-slate-700');
        switchEl.classList.add('bg-indigo-500');
        const knob = switchEl.querySelector('div');
        if (knob) knob.classList.add('translate-x-4');
    }

    // Abrir canvas
    App.ai.toggleCanvasPanel(true);

    // Cargar código después de que el panel esté visible
    setTimeout(() => {
        if (_aiCanvasEditorInstance) {
            const model = _aiCanvasEditorInstance.getModel();
            if (model) {
                model.setValue(snippet.code);
                if (window.monaco) monaco.editor.setModelLanguage(model, snippet.lang === 'html' ? 'html' : snippet.lang === 'python' ? 'python' : 'javascript');
            }
        }
    }, 200);

    // Cerrar menú
    const menu = document.getElementById('ai-top-snippets-menu');
    if (menu) menu.classList.add('hidden');

    if (window.App.ui && window.App.ui.toast) App.ui.toast("Código cargado en Canvas", "success");
};

// [NUEVO] Toggle Top Snippets Menu
window.App.ai.toggleTopSnippetsMenu = (e) => {
    if (e) e.stopPropagation();
    const menu = document.getElementById('ai-top-snippets-menu');
    if (!menu) return;

    const isOpen = !menu.classList.contains('hidden');
    if (isOpen) {
        menu.classList.add('hidden');
    } else {
        // Actualizar lista antes de mostrar
        if (window.App.ai._renderTopSnippetsList) window.App.ai._renderTopSnippetsList();
        menu.classList.remove('hidden');

        // Auto close handler
        const closeHandler = (ev) => {
            if (!ev.target.closest('#ai-top-snippets-menu') && !ev.target.closest('#ai-top-snippets-btn')) {
                menu.classList.add('hidden');
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }
};

// ============================================================================
// 8. CANVAS TABS - CODE/PREVIEW SWITCHING
// ============================================================================

window.App.ai.state.activeCanvasTab = 'code'; // 'code' or 'preview'

window.App.ai.switchCanvasTab = (tab) => {
    window.App.ai.state.activeCanvasTab = tab;

    const codeView = document.getElementById('ai-canvas-code-view');
    const previewView = document.getElementById('ai-canvas-preview-view');
    const tabCode = document.getElementById('ai-tab-code');
    const tabPreview = document.getElementById('ai-tab-preview');

    if (!codeView || !previewView) return;

    if (tab === 'code') {
        codeView.classList.remove('hidden');
        previewView.classList.add('hidden');

        // Tab styles
        if (tabCode) {
            tabCode.className = 'px-4 py-2 text-xs font-bold rounded-t-lg transition-all text-white bg-[#0d1117] border-t border-x border-slate-700/50 -mb-px';
        }
        if (tabPreview) {
            tabPreview.className = 'px-4 py-2 text-xs font-medium rounded-t-lg transition-all text-slate-400 hover:text-slate-200';
        }

        // Relayout Monaco
        setTimeout(() => {
            if (_aiCanvasEditorInstance) _aiCanvasEditorInstance.layout();
        }, 50);
    } else {
        codeView.classList.add('hidden');
        previewView.classList.remove('hidden');

        // Tab styles
        if (tabCode) {
            tabCode.className = 'px-4 py-2 text-xs font-medium rounded-t-lg transition-all text-slate-400 hover:text-slate-200';
        }
        if (tabPreview) {
            tabPreview.className = 'px-4 py-2 text-xs font-bold rounded-t-lg transition-all text-white bg-white border-t border-x border-slate-200 -mb-px';
        }
    }
};

// Actualizar Canvas desde Streaming (Live)
window.App.ai.updateCanvasFromStream = (fullText) => {
    // Buscar bloques de código
    const matches = [...fullText.matchAll(/```(\w+)?\n([\s\S]*?)(```|$)/g)];
    if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const lang = lastMatch[1] || 'javascript';
        const code = lastMatch[2];

        // Validar que haya contenido sustancial antes de abrir
        if (code && code.trim().length > 5) {

            // [AUTO-OPEN] Si el canvas está oculto, abrirlo automáticamente
            const panel = document.getElementById('ai-canvas-panel');
            if (panel && panel.classList.contains('hidden')) {
                window.App.ai.state.modes.canvas = true;

                // Actualizar switch UI visualmente
                const switchEl = document.getElementById('switch-canvas');
                if (switchEl) {
                    switchEl.classList.remove('bg-slate-200', 'dark:bg-slate-700');
                    switchEl.classList.add('bg-indigo-500');
                    const knob = switchEl.querySelector('div');
                    if (knob) knob.classList.add('translate-x-4');
                }

                if (window.App.ai.toggleCanvasPanel) window.App.ai.toggleCanvasPanel(true);
            }

            // Actualizar contenido del editor en tiempo real
            if (_aiCanvasEditorInstance) {
                const model = _aiCanvasEditorInstance.getModel();
                if (model && model.getValue() !== code) {
                    model.setValue(code);
                    // Opcional: Hacer scroll al final si es muy largo
                    // _aiCanvasEditorInstance.revealLine(model.getLineCount());
                }
            }
        }
    }
};
