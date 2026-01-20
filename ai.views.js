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

// ============================================================================
// 0. ESTADO & CONFIGURACIÓN
// ============================================================================

window.App.ai.state = {
    currentConversationId: null,
    isGenerating: false,
    userScrolledUp: false,
    modelName: 'Grok 4.1', 
    pendingFiles: [],
    modes: { tutor: false, canvas: false },
    isMenuOpen: false,
    isModelMenuOpen: false, 
    chatToDelete: null
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
        renderer.code = function(code, language) {
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
                    <div class="hidden code-content">${encodeURIComponent(code)}</div>
                </div>
                <div class="p-5 overflow-x-auto text-slate-300 leading-relaxed custom-scrollbar bg-[#0d1117] selection:bg-indigo-500/30">
                    <code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
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

    // 5. Render Sidebar
    let sidebarHTML = window.App.sidebar && window.App.sidebar.render ? window.App.sidebar.render('ai') : '';

    // 6. Construcción del DOM
    container.innerHTML = `
    <div class="fixed inset-0 z-0 w-full h-full bg-[#f8f9fa] dark:bg-[#050505] overflow-hidden flex text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 relative group/shell">
        
        <!-- SIDEBAR (Absolute Overlay) -->
        <div id="ai-sidebar-wrapper" class="absolute top-0 left-0 h-full z-50 pointer-events-auto">${sidebarHTML}</div>

        <!-- MAIN VIEWPORT (Centered) -->
        <main id="ai-viewport" class="w-full h-full flex flex-col relative transition-all duration-300 ml-0">
            
            <!-- DROP ZONE -->
            <div id="ai-drop-zone" class="absolute inset-0 z-40 flex flex-col h-full pointer-events-none">
                
                <div id="ai-drag-overlay" class="absolute inset-0 z-50 bg-indigo-600/90 hidden flex-col items-center justify-center backdrop-blur-md transition-opacity opacity-0 pointer-events-auto">
                    <div class="bg-white p-10 rounded-[2.5rem] shadow-2xl animate-bounce-short text-center transform scale-110">
                        <i class="fas fa-cloud-upload-alt text-6xl text-indigo-600 mb-6 block mx-auto"></i>
                        <h3 class="text-3xl font-black text-gray-900 tracking-tight">Suelta tus archivos</h3>
                    </div>
                </div>

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

                <!-- TOP BAR -->
                <header class="absolute top-0 left-0 w-full h-16 flex items-center justify-between px-6 z-20 pointer-events-auto pl-24 md:pl-6 transition-[padding]">
                    <div class="flex items-center gap-4">
                        <button class="md:hidden p-2 text-slate-500 hover:text-indigo-500 transition-colors" onclick="document.getElementById('sidebar').classList.toggle('hidden');">
                            <i class="fas fa-bars text-lg"></i>
                        </button>
                        
                        <!-- MODEL SELECTOR (MODIFICADO: ONCLICK) -->
                        <div class="relative">
                            <button onclick="App.ai.toggleModelMenu(event)" id="ai-model-btn" class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200 font-semibold text-sm select-none">
                                <span>${window.App.ai.state.modelName}</span>
                                <i class="fas fa-chevron-down text-xs text-slate-400 transition-transform duration-200" id="ai-model-arrow"></i>
                            </button>
                            <!-- MENU DROPDOWN (SIN HOVER, CLASE HIDDEN CONTROLADA) -->
                            <div id="ai-model-menu" class="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl border border-slate-100 dark:border-white/5 py-1 hidden animate-scale-in origin-top-left z-50">
                                ${AI_MODELS.map(m => `
                                    <div class="px-4 py-2.5 text-xs font-medium flex items-center justify-between ${m.disabled ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default'}">
                                        ${m.name}
                                        ${!m.disabled ? '<i class="fas fa-check"></i>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="App.ai.newChat()" class="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all" title="Nuevo Chat">
                            <i class="fas fa-plus text-xs"></i>
                        </button>
                    </div>
                </header>

                <!-- SCROLL AREA -->
                <div id="ai-scroller" class="flex-1 overflow-y-auto custom-scrollbar scroll-smooth pt-20 pb-4 px-4 pointer-events-auto">
                    <div id="ai-content" class="w-full max-w-3xl mx-auto min-h-full flex flex-col transition-all duration-300 justify-end pb-10">
                        <!-- Content -->
                    </div>
                </div>

                <!-- INPUT DOCK -->
                <div class="w-full shrink-0 z-30 pb-6 pt-2 bg-gradient-to-t from-[#f8f9fa] dark:from-[#050505] via-[#f8f9fa] dark:via-[#050505] to-transparent transition-all duration-300 pointer-events-auto">
                    <div class="w-full max-w-3xl mx-auto px-4 relative group/dock">
                        
                        <button id="scroll-btn" onclick="App.ai.scrollToBottom(true)" class="absolute -top-16 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hidden animate-bounce hover:scale-110 transition-transform z-10 cursor-pointer">
                            <i class="fas fa-arrow-down text-xs"></i>
                        </button>

                        <div class="relative flex items-end gap-3">
                            <!-- GLOW EFFECT -->
                            <div class="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] opacity-0 group-focus-within/dock:opacity-20 transition duration-1000 blur-xl -z-10"></div>

                            <!-- (+) BTN RETRO -->
                            <div class="relative z-50 shrink-0">
                                <button onclick="App.ai.togglePlusMenu(event)" class="w-12 h-12 rounded-[1.2rem] bg-white dark:bg-[#151b28] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 group/plus cursor-pointer">
                                    <i class="fas fa-plus text-lg transition-transform duration-300 group-hover/plus:rotate-90"></i>
                                </button>
                                <!-- MENÚ -->
                                <div id="ai-plus-menu" class="hidden absolute bottom-full left-0 mb-4 w-72 bg-white dark:bg-[#151b28] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 transform origin-bottom-left transition-all duration-200 animate-scale-in flex-col gap-1 overflow-hidden ring-1 ring-black/5">
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
                            <!-- TEXTBOX -->
                            <div class="flex-1 relative bg-white dark:bg-[#151b28] rounded-[1.5rem] shadow-xl border border-slate-200 dark:border-white/5 flex flex-col overflow-hidden transition-all duration-300 group/area ring-1 ring-black/5 dark:ring-white/5">
                                <div id="file-preview-area" class="hidden px-5 pt-4 pb-2 flex gap-3 overflow-x-auto custom-scrollbar border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20"></div>
                                <div class="flex items-end pr-2">
                                    <textarea id="ai-input" rows="1" class="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 px-5 py-3.5 resize-none max-h-48 custom-scrollbar text-[15px] leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium" placeholder="Escribe un mensaje..." onkeydown="App.ai.handleKey(event)" oninput="this.style.height='auto'; this.style.height = Math.min(this.scrollHeight, 192) + 'px'"></textarea>
                                    <div class="flex items-center gap-2 pb-2.5 shrink-0">
                                        <input type="file" id="ai-file-upload" class="hidden" multiple onchange="App.ai.handleFileSelect(event)">
                                        <span id="ai-counter" class="text-[10px] text-slate-300 dark:text-slate-600 font-mono hidden sm:block opacity-0 transition-opacity w-10 text-right select-none">0/4k</span>
                                        <button type="submit" id="ai-send-btn" onclick="App.ai.handleSubmit(event)" class="w-9 h-9 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm cursor-pointer ml-1"><i class="fas fa-arrow-up text-xs"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p class="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-2 font-medium opacity-50 select-none">El asistente puede cometer errores. Verifica la información importante.</p>
                    </div>
                </div>
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
        if(arrow) arrow.classList.remove('rotate-180');
        window.App.ai.state.isModelMenuOpen = false;
        document.removeEventListener('click', _closeModelMenuOnClickOutside);
    } else {
        menu.classList.remove('hidden');
        if(arrow) arrow.classList.add('rotate-180');
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
        if(arrow) arrow.classList.remove('rotate-180');
        window.App.ai.state.isModelMenuOpen = false;
        document.removeEventListener('click', _closeModelMenuOnClickOutside);
    }
}

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
        if(window.App.ui && window.App.ui.toast) App.ui.toast(`Modo ${mode} activado`, 'success');
    } else {
        switchEl.classList.add('bg-slate-200', 'dark:bg-slate-700');
        switchEl.classList.remove('bg-indigo-500');
        knobEl.classList.remove('translate-x-4');
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
        if(App.aiService && App.aiService.deleteConversation) {
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
            
            if(window.App.ui && window.App.ui.toast) App.ui.toast("Conversación eliminada", "success");
        }
    } catch (e) {
        console.error(e);
        if(window.App.ui && window.App.ui.toast) App.ui.toast("Error al eliminar", "error");
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
        if(App.aiService && App.aiService.stopGeneration) App.aiService.stopGeneration();
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
            },
            async (finalText, error) => {
                if (cursorEl) cursorEl.remove();
                if (error && error !== 'abort') {
                    responseEl.innerHTML += `<div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold border border-red-200 dark:border-red-800 flex items-center gap-2"><i class="fas fa-exclamation-circle"></i> ${error}</div>`;
                } else if (finalText) {
                    // 2. FIX DE PERSISTENCIA: Usar ID capturado y validar guardado
                    // REDUNDANCIA: Si por alguna razón activeConversationId es null (improbable), usar el global.
                    const targetId = activeConversationId || window.App.ai.state.currentConversationId;
                    
                    if (targetId) {
                        try {
                            console.log(`[AI VIEW] Guardando respuesta en chat: ${targetId}`);
                            await App.aiService.saveMessage(userId, targetId, 'assistant', finalText);
                        } catch (saveErr) {
                            console.error("[AI VIEW] Error crítico guardando respuesta:", saveErr);
                            // Opcional: Mostrar toast de error si falla la BD
                            if(window.App.ui && window.App.ui.toast) App.ui.toast("Error guardando respuesta", "warning");
                        }
                    } else {
                         console.error("[AI VIEW] Error Fatal: No hay ID de conversación para guardar.");
                    }
                }
                _setLoadingState(false);
            }
        );
    } catch (err) {
        console.error(err);
        _setLoadingState(false);
        if(window.App.ui && window.App.ui.toast) App.ui.toast("Error de conexión", "error");
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
        const messages = await App.aiService.getMessages(userId, conversationId);
        if (messages.length === 0) {
            _setWelcomeLayout(container);
            container.innerHTML = _renderWelcomeScreen(App.state.currentUser.name);
        } else {
            _setChatLayout(container);
            container.innerHTML = messages.map(m => _renderMessage(m.role, m.content, m.files)).join('');
            container.insertAdjacentHTML('beforeend', '<div class="h-4 w-full"></div>');
        }
        setTimeout(() => App.ai.scrollToBottom(true), 150);
    } catch (e) {
        _setWelcomeLayout(container);
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-50"><i class="fas fa-wifi text-3xl"></i><p>No se pudo cargar el historial.</p></div>`;
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

function _renderMessage(role, content, files = []) {
    const isUser = role === 'user';
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
    const grokLogo = `
    <div class="shrink-0 mt-1 shadow-sm rounded-lg overflow-hidden w-8 h-8 select-none">
        <img src="${GROK_LOGO_URL}" class="w-full h-full object-cover" alt="Grok AI" draggable="false">
    </div>`;

    if (isUser) {
        return `
        <div class="flex flex-col items-end mb-10 w-full animate-fade-in-up group/msg">
            ${filesHtml}
            ${htmlContent ? `<div class="bg-white dark:bg-[#212121] text-slate-800 dark:text-slate-200 px-6 py-4 rounded-[1.5rem] rounded-br-sm max-w-[90%] md:max-w-[85%] shadow-sm border border-slate-100 dark:border-white/5 text-[16px] leading-7 rendering-pixelated relative">
                ${htmlContent}
            </div>` : ''}
        </div>`;
    } else {
        return `
        <div class="flex gap-4 md:gap-6 mb-12 w-full group/ai animate-fade-in pl-1">
            ${grokLogo}
            <div class="flex-1 min-w-0 overflow-hidden">
                <div class="text-[13px] font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 select-none">
                    ${window.App.ai.state.modelName}
                    <span class="opacity-0 group-hover/ai:opacity-100 transition-opacity text-slate-400 text-[10px] font-normal cursor-pointer hover:text-indigo-500" onclick="App.ai.copyText(this)">
                        <i class="far fa-copy ml-1"></i> Copiar
                    </span>
                </div>
                <div class="prose dark:prose-invert prose-slate max-w-none text-[16px] leading-7 text-slate-700 dark:text-slate-300 font-normal break-words prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:mb-5 prose-li:mb-1 prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0">
                    ${htmlContent}
                </div>
            </div>
        </div>`;
    }
}

function _renderAiSkeleton(id) {
    // [CAMBIO V20.0] LOGO ESTÁTICO EN SKELETON (SIN PULSE)
    // El contenedor de la respuesta mantiene fade-in, pero la imagen es sólida.
    const grokLogo = `
    <div class="shrink-0 mt-1 shadow-sm rounded-lg overflow-hidden w-8 h-8 select-none">
        <img src="${GROK_LOGO_URL}" class="w-full h-full object-cover" alt="Grok AI" draggable="false">
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
        if(window.App.ui && window.App.ui.toast) App.ui.toast("Máximo 5 archivos", "warning");
        return;
    }
    files.forEach(f => window.App.ai.state.pendingFiles.push({ 
        file: f, 
        id: Date.now()+Math.random(), 
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
    if(!zone || !overlay) return;

    zone.addEventListener('dragenter', e => { e.preventDefault(); counter++; overlay.classList.remove('hidden'); setTimeout(()=>overlay.classList.remove('opacity-0'),10); });
    zone.addEventListener('dragleave', e => { e.preventDefault(); counter--; if(counter<=0) { overlay.classList.add('opacity-0'); setTimeout(()=>overlay.classList.add('hidden'),300); counter=0; } });
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => { 
        e.preventDefault(); counter=0; overlay.classList.add('opacity-0'); setTimeout(()=>overlay.classList.add('hidden'),300);
        if(e.dataTransfer.files.length) App.ai.processFiles(Array.from(e.dataTransfer.files));
    });
};

window.App.ai.newChat = () => { 
    window.App.ai.state.currentConversationId = null; // Reiniciar ID para limpiar estado
    window.location.hash = '#ai'; 
    const root = document.getElementById('ai-root') || document.querySelector('main');
    if(root) App.ai.render(root); 
};

window.App.ai.scrollToBottom = (force) => { 
    if(window.App.ai.state.userScrolledUp && !force) return; 
    const s = document.getElementById('ai-scroller'); 
    if(s) s.scrollTo({top: s.scrollHeight, behavior: 'smooth'}); 
};

window.App.ai.copyCode = (btn) => {
    try {
        const content = decodeURIComponent(btn.parentElement.querySelector('.code-content').innerText);
        navigator.clipboard.writeText(content);
        const span = btn.querySelector('span');
        const icon = btn.querySelector('i');
        if(span) span.innerText = 'Copiado!';
        icon.className = 'fas fa-check text-emerald-500';
        setTimeout(() => {
            icon.className = 'far fa-copy';
            if(span) span.innerText = 'Copiar';
        }, 2000);
    } catch(e) { console.error(e); }
};

window.App.ai.copyText = (btn) => {
    try {
        const text = btn.parentElement.parentElement.querySelector('.prose').innerText;
        navigator.clipboard.writeText(text);
        if(window.App.ui && window.App.ui.toast) App.ui.toast("Texto copiado", "success");
    } catch(e) { console.error(e); }
};