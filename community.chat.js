/**
 * community.chat.js (V12.3 - FIX DELETE & ROBUST DATA)
 * * CORRECCIONES:
 * 1. FIX CRÍTICO: Eliminación de chats de alumnos ahora usa 'doc.id' como fallback para asegurar borrado.
 * 2. UX: Área de clic mejorada para el botón de borrar (evita abrir el chat por error).
 * 3. Manteniendo diseño limpio de input flotante y puntos de notificación.
 */

window.App = window.App || {};
window.App.chat = window.App.chat || {};

// ============================================================================
// 1. CONFIGURACIÓN Y UTILIDADES
// ============================================================================

const CHAT_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_MIME_TYPES: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/zip',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/javascript', 'text/html', 'text/css', 'application/json'
    ],
    GROUPING_TIMEOUT_MS: 2 * 60 * 1000,
    SUPPORT_CHANNEL_PREFIX: 'support_',
    PROFESSOR: {
        NAME: "Profesor Manuel Oliva",
        AVATAR: "https://cdn.shopify.com/s/files/1/0564/3812/8712/files/gempages_519842279402243040-8ae05cd1-dc25-44fb-9a7b-f1a78a0f121a.png?v=1720126074"
    },
    AI_LOGO: "https://cdn.shopify.com/s/files/1/0564/3812/8712/files/grok-ai-icon.webp?v=1768942289" // Logo Oficial Grok
};

const Utils = {
    generateId: () => 'temp_' + Date.now().toString(36) + Math.random().toString(36).substr(2),
    formatBytes: (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i];
    },
    parseMarkdown: (text) => {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded-lg my-2 text-xs font-mono overflow-x-auto border border-[#333] shadow-inner">$1</pre>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-gray-200 dark:border-slate-600">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
            .replace(/__([^_]+)__/g, '<u class="underline decoration-indigo-500 decoration-2">$1</u>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline break-all font-medium transition-colors">$1</a>');
    }
};

// ============================================================================
// 2. GESTIÓN DE ESTADO
// ============================================================================

window.App.chat.state = {
    activeChannelId: null,
    pendingAttachments: [],
    communityData: null,
    currentUser: null,
    supportThreads: [],
    readThreadIds: new Set(),
    isLoading: false,
    isSidebarCollapsed: localStorage.getItem('chat_sidebar_collapsed') === 'true',
    collapsedCategories: JSON.parse(localStorage.getItem('chat_collapsed_cats') || '[]'),
    adminSidebarTab: 'global',
    editingMessageId: null,
    listeners: [],
    aiPanelOpen: false,
    aiMode: 'assistant',
    aiHistory: [],
    aiIsGenerating: false
};

// ============================================================================
// 3. RENDERIZADOR PRINCIPAL (SHELL)
// ============================================================================

window.App.chat.render = async (container, communityId, user) => {
    _cleanupListeners();
    window.App.chat.state.currentUser = user;

    if (user.role === 'admin' && !window.App.aiService) {
        _loadAIService();
    }

    let community = App.state.cache.communities[communityId];
    if (!community) {
        try {
            community = await App.api.getCommunityById(communityId);
            App.state.cache.communities[communityId] = community;
        } catch (e) {
            console.error("Error cargando comunidad:", e);
            container.innerHTML = `<div class="h-full flex items-center justify-center text-slate-400">Error al cargar chat.</div>`;
            return;
        }
    }

    window.App.chat.state.communityData = community;
    window.App.chat.state.supportThreads = community.supportThreads || [];

    const channels = community.channels || [{ id: 'general', name: 'General', type: 'text', category: 'General' }];
    let activeChId = window.App.chat.state.activeChannelId;
    if (!activeChId) activeChId = channels[0].id;
    window.App.chat.state.activeChannelId = activeChId;

    const shellExists = document.getElementById('chat-shell');
    if (!shellExists) {
        container.innerHTML = _renderShellHTML(community, channels, user, activeChId);
        App.chat.setupDragAndDrop();
    } else {
        _updateSidebar(community, channels, activeChId);
    }

    _setupHybridListeners(communityId);
    await App.chat.switchChannel(communityId, activeChId, true);
};

function _cleanupListeners() {
    window.App.chat.state.listeners.forEach(unsub => unsub && unsub());
    window.App.chat.state.listeners = [];
}

function _loadAIService() {
    const script = document.createElement('script');
    script.src = 'ai.service.js';
    script.onload = () => console.log("AI Service Loaded for Admin Chat");
    document.body.appendChild(script);
}

function _setupHybridListeners(cid) {
    // 1. Legacy Listener
    const legacyUnsub = window.F.onSnapshot(
        window.F.doc(window.F.db, "communities", cid),
        (doc) => {
            if (doc.exists()) {
                const newData = doc.data();
                window.App.chat.state.communityData = { ...window.App.chat.state.communityData, ...newData };
                if (newData.channels) window.App.chat.state.communityData.channels = newData.channels;
                _mergeThreads(newData.supportThreads || []);
            }
        },
        (err) => console.warn("Error listener legacy:", err)
    );
    window.App.chat.state.listeners.push(legacyUnsub);

    // 2. Active Threads Listener (FIX DATA ROBUSTNESS)
    const subCollectionUnsub = window.F.onSnapshot(
        window.F.collection(window.F.db, "communities", cid, "active_threads"),
        (snapshot) => {
            const newThreads = [];
            snapshot.forEach(doc => {
                if (doc.exists()) {
                    const data = doc.data();
                    // FIX: Asegurar que siempre hay un UID, usando el ID del documento si falta en la data
                    // Esto arregla el bug donde no se puede borrar porque uid es undefined
                    newThreads.push({ ...data, uid: data.uid || doc.id });
                }
            });
            _mergeThreads(newThreads);
        },
        (err) => console.warn("Error listener active_threads:", err)
    );
    window.App.chat.state.listeners.push(subCollectionUnsub);
}

function _mergeThreads(newBatch) {
    const currentMap = new Map();
    window.App.chat.state.supportThreads.forEach(t => { if (t && t.uid) currentMap.set(t.uid, t); });
    newBatch.forEach(t => { if (t && t.uid) currentMap.set(t.uid, { ...currentMap.get(t.uid), ...t }); });
    window.App.chat.state.supportThreads = Array.from(currentMap.values());
    _updateSidebar(window.App.chat.state.communityData, window.App.chat.state.communityData.channels, window.App.chat.state.activeChannelId);
}

// ============================================================================
// 4. ESTRUCTURA HTML (SHELL + AI PANEL)
// ============================================================================

function _renderShellHTML(community, channels, user, activeId) {
    const isAdmin = user.role === 'admin';
    const groupedChannels = _groupChannels(channels);
    const isCollapsed = window.App.chat.state.isSidebarCollapsed;
    const sidebarClasses = isCollapsed ? 'w-[70px] hover:w-72' : 'w-72';

    // Contenedor input sin fondo blanco (bg-transparent)
    const inputAreaClasses = "shrink-0 p-3 sm:p-6 bg-transparent relative z-40";

    return `
    <div id="chat-shell" class="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-[#0b1120] relative font-sans text-sm text-slate-900 dark:text-slate-100">
        <!-- MOBILE OVERLAY -->
        <div id="mobile-sidebar-overlay" onclick="App.chat.closeMobileSidebar()" class="fixed inset-0 bg-black/50 z-50 hidden lg:hidden backdrop-blur-sm transition-opacity opacity-0"></div>

        <div class="flex-1 flex overflow-hidden relative">
            <!-- DRAG OVERLAY -->
            <div id="drag-overlay" class="absolute inset-0 z-[60] bg-indigo-600/90 hidden flex-col items-center justify-center pointer-events-none opacity-0 transition-opacity duration-300 backdrop-blur-sm">
                <div class="text-white text-center animate-bounce">
                    <i class="fas fa-cloud-upload-alt text-5xl mb-4"></i>
                    <h3 class="text-2xl font-bold">Soltar para subir</h3>
                </div>
            </div>

            <!-- SIDEBAR -->
            <aside id="chat-sidebar" class="hidden lg:flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 shrink-0 z-40 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${sidebarClasses} group/sidebar absolute lg:relative h-full shadow-lg lg:shadow-none">
                <!-- Header Sidebar -->
                <div class="h-14 flex items-center justify-between px-4 shrink-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#151e32]">
                    <div class="flex items-center gap-3 overflow-hidden opacity-0 group-hover/sidebar:opacity-100 ${!isCollapsed ? 'opacity-100' : ''} transition-opacity duration-200 flex-1 min-w-0">
                        <button onclick="window.location.hash='#feed'" class="text-slate-400 hover:text-indigo-500 transition-colors shrink-0" title="Volver al Feed"><i class="fas fa-arrow-left"></i></button>
                        <span class="font-bold text-xs uppercase tracking-wider truncate text-slate-700 dark:text-slate-300 select-none">${community.name}</span>
                    </div>
                    <button onclick="App.chat.toggleSidebar()" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
                        <i class="fas fa-thumbtack text-xs ${!isCollapsed ? 'rotate-45 text-indigo-500' : ''}"></i>
                    </button>
                </div>

                <!-- Channels List -->
                <div id="sidebar-channels" class="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-1 px-2">
                    ${_renderChannelsHTML(groupedChannels, activeId, isAdmin, community.id, user, isCollapsed)}
                </div>

                <!-- Footer User -->
                <div class="p-3 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#151e32]">
                    ${_renderUserFooter(user, isCollapsed)}
                </div>
            </aside>

            <!-- MAIN CHAT AREA -->
            <div class="flex-1 flex flex-col min-w-0 bg-[#F1F5F9] dark:bg-[#0b1120] relative z-0 h-full transition-all duration-300" id="main-chat-viewport">
                <!-- Navbar -->
                <div class="h-14 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 sm:px-6 shrink-0 justify-between bg-white dark:bg-[#0b1120] z-30 shadow-sm/30 gap-3">
                     <!-- Mobile Menu Toggle -->
                    <button onclick="App.chat.openMobileSidebar()" class="lg:hidden w-10 h-10 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0">
                        <i class="fas fa-bars"></i>
                    </button>
                    
                    <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div id="header-icon-container" class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center transition-all shrink-0">
                            <i id="header-icon" class="fas fa-hashtag text-slate-400"></i>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <h3 id="header-title" class="font-bold text-slate-800 dark:text-slate-100 text-sm truncate leading-none">...</h3>
                            <p id="header-desc" class="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate leading-none mt-1 sm:mt-1.5 font-medium">...</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 text-slate-400 shrink-0">
                        <!-- BOTÓN AI (SOLO ADMIN) -->
                        ${isAdmin ? `
                        <button onclick="App.chat.toggleAIPanel()" class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-sm relative group" title="Asistente Grok 4.1">
                            <i class="fas fa-robot text-sm"></i>
                            <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#0b1120]"></span>
                        </button>
                        <div class="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                        ` : ''}
                        
                        <button class="hidden sm:flex hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors" title="Buscar"><i class="fas fa-search"></i></button>
                    </div>
                </div>

                <!-- Messages Scroller -->
                <div class="flex-1 relative min-h-0">
                    <div id="chat-scroller" class="absolute inset-0 overflow-y-auto custom-scrollbar scroll-smooth">
                        <div id="chat-messages-container" class="min-h-full flex flex-col justify-end p-3 sm:p-6 pb-2 space-y-3 z-10"></div>
                    </div>
                </div>

                <!-- Input Area -->
                <div id="chat-input-area" class="${inputAreaClasses}"></div>
            </div>

            <!-- PANEL IA DERECHO -->
            ${isAdmin ? _renderAIPanelHTML() : ''}

        </div>
        
        <!-- MODALES -->
        ${_renderSettingsModal()}
        ${_renderChannelManagerModal()}
    </div>`;
}

function _renderAIPanelHTML() {
    return `
    <div id="ai-panel" class="absolute top-0 right-0 h-full w-[400px] bg-white dark:bg-[#0f172a] border-l border-gray-200 dark:border-slate-800 shadow-2xl z-40 transform translate-x-full transition-transform duration-300 flex flex-col">
        <!-- AI Header -->
        <div class="h-14 px-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-[#151e32]">
            <div class="flex items-center gap-3">
                <img src="${CHAT_CONFIG.AI_LOGO}" class="w-8 h-8 rounded-lg shadow-sm">
                <div>
                    <h3 class="font-bold text-slate-900 dark:text-white text-xs">Copiloto Docente</h3>
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Grok 4.1 Fast
                    </div>
                </div>
            </div>
            <button onclick="App.chat.toggleAIPanel()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fas fa-times"></i></button>
        </div>

        <!-- AI Tabs -->
        <div class="p-2 border-b border-gray-100 dark:border-slate-800 flex gap-2 bg-white dark:bg-[#0f172a]">
            <button onclick="App.chat.switchAIMode('assistant')" id="btn-ai-assistant" class="flex-1 py-2 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-colors border border-indigo-100 dark:border-indigo-900/30">Asistente Dudas</button>
            <button onclick="App.chat.switchAIMode('chat')" id="btn-ai-chat" class="flex-1 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent">Chat Libre</button>
        </div>

        <!-- AI Content Scroller -->
        <div id="ai-messages-area" class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-[#F8FAFC] dark:bg-[#0b1120]">
            <!-- Welcome State -->
            <div id="ai-welcome" class="flex flex-col items-center justify-center h-full text-center opacity-60">
                <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-500 mb-3"><i class="fas fa-magic"></i></div>
                <p class="text-xs font-bold text-slate-600 dark:text-slate-300">¿En qué puedo ayudarte hoy?</p>
                <p class="text-[10px] text-slate-400 mt-1 max-w-[200px]">Selecciona "Resolver con IA" en un mensaje o escribe abajo.</p>
            </div>
        </div>

        <!-- AI Input -->
        <div class="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
            <div class="relative">
                <textarea id="ai-input-field" rows="1" class="w-full bg-slate-100 dark:bg-[#1e293b] border border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-xs outline-none resize-none custom-scrollbar dark:text-white pr-10" placeholder="Escribe a Grok..." onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); App.chat.sendToAI(); }"></textarea>
                <button onclick="App.chat.sendToAI()" class="absolute right-2 top-2 w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm">
                    <i class="fas fa-paper-plane text-[10px]"></i>
                </button>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// 5. LÓGICA DE UI Y NAVEGACIÓN (SIDEBAR IZQUIERDO)
// ============================================================================

// Toggle Sidebar Logic Removed (Global Only)
window.App.chat.toggleSidebar = () => {
    const state = window.App.chat.state;
    state.isSidebarCollapsed = !state.isSidebarCollapsed;
    localStorage.setItem('chat_sidebar_collapsed', state.isSidebarCollapsed);
    _updateSidebar(state.communityData, state.communityData.channels, state.activeChannelId);
};

window.App.chat.openMobileSidebar = () => {
    const sidebar = document.getElementById('chat-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');

    if (sidebar) {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex', 'absolute', 'inset-y-0', 'left-0', 'z-50', 'w-[280px]'); // Force mobile styles
    }
    if (overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    }
};

window.App.chat.closeMobileSidebar = () => {
    const sidebar = document.getElementById('chat-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');

    if (sidebar) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex', 'absolute', 'inset-y-0', 'left-0', 'z-50', 'w-[280px]');
    }
    if (overlay) {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
};

window.App.chat.switchSidebarTab = (tabName) => {
    window.App.chat.state.adminSidebarTab = tabName;
    _updateSidebar(window.App.chat.state.communityData, window.App.chat.state.communityData.channels, window.App.chat.state.activeChannelId);
};

window.App.chat.toggleCategory = (catName) => {
    const state = window.App.chat.state;
    const idx = state.collapsedCategories.indexOf(catName);
    if (idx > -1) state.collapsedCategories.splice(idx, 1);
    else state.collapsedCategories.push(catName);
    localStorage.setItem('chat_collapsed_cats', JSON.stringify(state.collapsedCategories));
    _updateSidebar(state.communityData, state.communityData.channels, state.activeChannelId);
};

// _renderChannelsHTML RESTORED
function _updateSidebar(community, channels, activeId) {
    const sidebar = document.getElementById('chat-sidebar');
    if (!sidebar) return; // Should not happen

    const state = window.App.chat.state;
    const isCollapsed = state.isSidebarCollapsed;
    const isAdmin = state.currentUser.role === 'admin';
    const grouped = _groupChannels(channels);

    // Update Sidebar Classes
    if (isCollapsed) {
        sidebar.classList.remove('w-72');
        sidebar.classList.add('w-[70px]', 'hover:w-72');
    } else {
        sidebar.classList.add('w-72');
        sidebar.classList.remove('w-[70px]', 'hover:w-72');
    }

    // Render Content
    const pinIcon = isCollapsed ? '' : 'rotate-45 text-indigo-500';
    const headerTitle = `<div class="flex items-center gap-3 overflow-hidden opacity-0 group-hover/sidebar:opacity-100 ${!isCollapsed ? 'opacity-100' : ''} transition-opacity duration-200 flex-1 min-w-0">
                        <button onclick="window.location.hash='#feed'" class="text-slate-400 hover:text-indigo-500 transition-colors shrink-0" title="Volver al Feed"><i class="fas fa-arrow-left"></i></button>
                        <span class="font-bold text-xs uppercase tracking-wider truncate text-slate-700 dark:text-slate-300 select-none">${community.name}</span>
                    </div>`;

    sidebar.querySelector('.h-14').innerHTML = `
        ${headerTitle}
        <button onclick="App.chat.toggleSidebar()" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
            <i class="fas fa-thumbtack text-xs ${pinIcon}"></i>
        </button>`;

    sidebar.querySelector('#sidebar-channels').innerHTML = _renderChannelsHTML(grouped, activeId, isAdmin, community.id, state.currentUser, isCollapsed);
    sidebar.querySelector('.p-3.border-t').innerHTML = _renderUserFooter(state.currentUser, isCollapsed);
}

function _groupChannels(channels) {
    return channels.reduce((acc, ch) => {
        const cat = ch.category || 'GENERAL';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ch);
        return acc;
    }, {});
}

function _renderChannelsHTML(grouped, activeId, isAdmin, cid, user, isCollapsed) {
    let html = '';
    const activeTab = window.App.chat.state.adminSidebarTab;
    const hideOnCollapse = "opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 " + (!isCollapsed ? "opacity-100" : "");
    const showOnCollapse = isCollapsed ? "block group-hover/sidebar:hidden" : "hidden";

    if (isAdmin) {
        html += `
        <div class="px-1 mb-3">
             <div class="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg ${hideOnCollapse}">
                <button onclick="App.chat.switchSidebarTab('global')" class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'global' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">Global</button>
                <button onclick="App.chat.switchSidebarTab('students')" class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">Alumnos</button>
             </div>
             <div class="${isCollapsed ? 'flex flex-col gap-2 items-center group-hover/sidebar:hidden' : 'hidden'}">
                 <i class="fas fa-globe text-indigo-500 mb-2"></i>
             </div>
        </div>`;
        if (activeTab === 'students') {
            const threads = window.App.chat.state.supportThreads || [];
            if (threads.length === 0) html += `<div class="text-center text-[10px] text-slate-400 italic ${hideOnCollapse}">Sin chats activos</div>`;
            threads.forEach(t => {
                const tId = 'support_' + (t.uid || t.id);
                html += _renderChannelItem(cid, tId, t.name || 'Alumno', 'fa-user', activeId === tId, isCollapsed, true, t.avatar);
            });
            return html;
        }
    } else {
        const profId = 'support_' + user.uid;
        const isActive = activeId === profId;
        html += `
        <div class="px-1 mb-4 relative group/prof">
            <div onclick="App.chat.switchChannel('${cid}', '${profId}')" class="flex items-center gap-3 p-2 rounded-xl border ${isActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-indigo-100 dark:border-slate-700 hover:bg-slate-50'} cursor-pointer transition-all">
                <img src="https://cdn.shopify.com/s/files/1/0564/3812/8712/files/gempages_519842279402243040-8ae05cd1-dc25-44fb-9a7b-f1a78a0f121a.png" class="w-8 h-8 rounded-full object-cover">
                <div class="min-w-0 ${hideOnCollapse}">
                    <div class="text-[9px] font-black uppercase tracking-widest text-indigo-500">Profesor</div>
                    <div class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">Manuel Oliva</div>
                </div>
            </div>
            <div class="${showOnCollapse} absolute left-10 top-2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/prof:opacity-100 pointer-events-none z-50">Profesor</div>
        </div>
        `;
    }

    Object.entries(grouped).forEach(([cat, chs]) => {
        const isCatCollapsed = window.App.chat.state.collapsedCategories.includes(cat);
        const arrowClass = isCatCollapsed ? '-rotate-90' : '';

        html += `
        <div class="group/cat mt-2">
            <div class="px-3 py-1 flex items-center justify-between text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer ${hideOnCollapse}" onclick="App.chat.toggleCategory('${cat}')">
                <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <i class="fas fa-chevron-down text-[8px] transition-transform ${arrowClass}"></i> ${cat}
                </div>
            </div>
            
            ${!isCatCollapsed ? `<div class="space-y-0.5 mt-0.5">
                ${chs.map(ch => {
            const icon = ch.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag';
            return _renderChannelItem(cid, ch.id, ch.name, icon, ch.id === activeId, isCollapsed, isAdmin);
        }).join('')}
            </div>` : ''}
        </div>`;
    });
    return html;
}

function _renderChannelItem(cid, id, name, icon, isActive, isCollapsed, isAdmin, avatar = null) {
    const activeBg = "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border-l-4 border-indigo-500";
    const normalBg = "text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 border-l-4 border-transparent";
    const textClass = !isCollapsed ? 'opacity-100' : 'opacity-0 group-hover/sidebar:opacity-100 absolute left-10';
    const containerBase = !isCollapsed ? "" : "justify-center";

    return `
    <div onclick="App.chat.switchChannel('${cid}', '${id}')" 
         class="group/ch relative cursor-pointer mx-1 rounded-r-lg transition-all ${isActive ? activeBg : normalBg} flex items-center py-2 px-2 ${containerBase}">
        ${avatar ? `<img src="${avatar}" class="w-5 h-5 rounded-full object-cover shrink-0 z-10">` : `<i class="fas ${icon} text-xs w-5 text-center shrink-0 z-10"></i>`}
        <span class="truncate text-xs font-bold ml-3 transition-opacity duration-200 ${textClass}">${name}</span>
        ${isCollapsed ? `<div class="absolute left-full ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/ch:opacity-100 pointer-events-none z-50 whitespace-nowrap">${name}</div>` : ''}
    </div>`;
}

function _renderUserFooter(user, isCollapsed) {
    const hide = !isCollapsed ? '' : 'hidden group-hover/sidebar:block';
    return `
    <div onclick="App.settings.openProfileModal()" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer relative">
        <img src="${user.avatar || 'https://ui-avatars.com/api/?background=random'}" class="w-8 h-8 rounded-full bg-slate-200">
        <div class="flex-1 min-w-0 ${hide}">
            <div class="text-xs font-bold text-slate-800 dark:text-gray-200 truncate">${user.name}</div>
            <div class="text-[10px] text-slate-400 truncate">Online</div>
        </div>
    </div>`;
}

// ============================================================================
// 6. CONTROLADORES DE AI PANEL
// ============================================================================

window.App.chat.toggleAIPanel = () => {
    const panel = document.getElementById('ai-panel');
    if (!panel) return;

    window.App.chat.state.aiPanelOpen = !window.App.chat.state.aiPanelOpen;

    if (window.App.chat.state.aiPanelOpen) {
        panel.classList.remove('translate-x-full');
    } else {
        panel.classList.add('translate-x-full');
    }
};

window.App.chat.switchAIMode = (mode) => {
    window.App.chat.state.aiMode = mode;

    const btnAssistant = document.getElementById('btn-ai-assistant');
    const btnChat = document.getElementById('btn-ai-chat');

    const activeClass = "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30";
    const inactiveClass = "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent";

    if (mode === 'assistant') {
        btnAssistant.className = `flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${activeClass}`;
        btnChat.className = `flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${inactiveClass}`;
        document.getElementById('ai-messages-area').innerHTML = `
            <div id="ai-welcome" class="flex flex-col items-center justify-center h-full text-center opacity-60">
                <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-500 mb-3"><i class="fas fa-magic"></i></div>
                <p class="text-xs font-bold text-slate-600 dark:text-slate-300">Asistente de Dudas</p>
                <p class="text-[10px] text-slate-400 mt-1 max-w-[200px]">Selecciona un mensaje para analizarlo.</p>
            </div>`;
    } else {
        btnChat.className = `flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${activeClass}`;
        btnAssistant.className = `flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${inactiveClass}`;
        document.getElementById('ai-messages-area').innerHTML = `
            <div class="text-center py-4 text-xs text-slate-400">Inicio de Chat Libre con Grok</div>
        `;
    }
};

window.App.chat.solveWithAI = async (msgContent, studentName) => {
    if (!window.App.chat.state.aiPanelOpen) window.App.chat.toggleAIPanel();
    window.App.chat.switchAIMode('assistant');

    const container = document.getElementById('ai-messages-area');
    container.innerHTML = `
        <div class="bg-white dark:bg-[#1e293b] p-3 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm mb-4">
            <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Duda de ${studentName}</div>
            <p class="text-xs text-slate-800 dark:text-slate-200 italic">"${msgContent}"</p>
        </div>
        <div class="flex gap-3 animate-fade-in" id="ai-response-container">
            <img src="${CHAT_CONFIG.AI_LOGO}" class="w-6 h-6 rounded mt-1">
            <div class="flex-1">
                <div class="text-[10px] font-bold text-slate-500 mb-1">Grok AI</div>
                <div class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-[#1e293b] p-3 rounded-r-xl rounded-bl-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <span id="ai-streaming-text"></span><span class="inline-block w-1.5 h-3 bg-indigo-500 ml-1 animate-blink"></span>
                </div>
            </div>
        </div>`;

    const prompt = `Actúa como un Profesor Experto en Programación y Data Analytics. 
    El alumno ${studentName} tiene esta duda: "${msgContent}".
    Responde de forma:
    1. Empática y motivadora.
    2. Breve y directa (máximo 2 párrafos).
    3. Si hay código, usa bloques markdown.
    4. NO des la respuesta final sin explicar el porqué. Guíalo.
    Tu tono es profesional pero cercano.`;

    if (!window.App.aiService) {
        document.getElementById('ai-streaming-text').innerText = "Error: Servicio IA no cargado.";
        return;
    }

    const responseEl = document.getElementById('ai-streaming-text');
    let fullResponse = "";

    try {
        await window.App.aiService.streamMessage(
            [{ role: 'user', content: prompt }],
            (chunk) => {
                fullResponse += chunk;
                responseEl.innerText = fullResponse;
                container.scrollTop = container.scrollHeight;
            },
            (finalText) => {
                if (window.marked) {
                    responseEl.innerHTML = window.marked.parse(finalText);
                } else {
                    responseEl.innerText = finalText;
                }
                const actionBtn = document.createElement('div');
                actionBtn.className = "mt-2 flex justify-end";
                actionBtn.innerHTML = `<button onclick="App.chat.copyToInput()" class="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1"><i class="fas fa-reply"></i> Insertar en Chat</button>`;
                responseEl.parentElement.parentElement.appendChild(actionBtn);
                window.App.chat.state.lastAIResponse = finalText;
            }
        );
    } catch (e) {
        responseEl.innerText = "Error conectando con Grok.";
    }
};

window.App.chat.sendToAI = async () => {
    const input = document.getElementById('ai-input-field');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const container = document.getElementById('ai-messages-area');

    container.insertAdjacentHTML('beforeend', `
        <div class="flex justify-end mb-4 animate-fade-in">
            <div class="bg-indigo-600 text-white px-4 py-2 rounded-l-xl rounded-tr-xl text-xs max-w-[85%] shadow-md">
                ${text}
            </div>
        </div>
    `);

    const aiId = `ai-gen-${Date.now()}`;
    container.insertAdjacentHTML('beforeend', `
        <div class="flex gap-3 mb-4 animate-fade-in">
            <img src="${CHAT_CONFIG.AI_LOGO}" class="w-6 h-6 rounded mt-1">
            <div class="flex-1">
                <div class="text-[10px] font-bold text-slate-500 mb-1">Grok AI</div>
                <div class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-[#1e293b] p-3 rounded-r-xl rounded-bl-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <span id="${aiId}"></span><span class="inline-block w-1.5 h-3 bg-indigo-500 ml-1 animate-blink"></span>
                </div>
            </div>
        </div>
    `);
    container.scrollTop = container.scrollHeight;

    if (window.App.aiService) {
        const responseEl = document.getElementById(aiId);
        let fullRes = "";
        await window.App.aiService.streamMessage(
            [{ role: 'user', content: text }],
            (chunk) => {
                fullRes += chunk;
                responseEl.innerText = fullRes;
                container.scrollTop = container.scrollHeight;
            },
            (final) => {
                if (window.marked) responseEl.innerHTML = window.marked.parse(final);
            }
        );
    }
};

window.App.chat.copyToInput = () => {
    const text = window.App.chat.state.lastAIResponse;
    const mainInput = document.getElementById('chat-input');
    if (mainInput && text) {
        mainInput.value = text;
        mainInput.focus();
        mainInput.style.height = 'auto';
        mainInput.style.height = mainInput.scrollHeight + 'px';
        if (window.innerWidth < 1024) window.App.chat.toggleAIPanel();
    }
};

// ============================================================================
// 7. CONTROLADORES PRINCIPALES (CHAT)
// ============================================================================

window.App.chat.switchChannel = async (cid, chId, force = false) => {
    if (!force && window.App.chat.state.activeChannelId === chId) return;
    window.App.chat.state.activeChannelId = chId;
    window.App.chat.state.editingMessageId = null;

    // (V12.2) Marcar como leído si es un chat de soporte
    if (chId.startsWith(CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX)) {
        const targetUid = chId.replace(CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX, '');
        if (targetUid !== App.chat.state.currentUser.uid) { // No marcar mi propio chat
            window.App.chat.state.readThreadIds.add(targetUid);
        }
    }

    _updateSidebar(window.App.chat.state.communityData, window.App.chat.state.communityData.channels, chId);

    let channelName = "Cargando...", channelDesc = "", channelIcon = "fa-hashtag", headerImage = null, isSupport = false;

    if (chId.startsWith(CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX)) {
        isSupport = true;
        const targetUid = chId.replace(CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX, '');
        const isMe = targetUid === App.chat.state.currentUser.uid;
        if (isMe) {
            channelName = CHAT_CONFIG.PROFESSOR.NAME;
            channelDesc = "Aula Privada 1-a-1";
            headerImage = CHAT_CONFIG.PROFESSOR.AVATAR;
        } else {
            const thread = (window.App.chat.state.supportThreads || []).find(t => t.uid === targetUid);
            channelName = thread ? thread.name : "Alumno";
            channelDesc = "Consulta de Alumno";
            headerImage = thread ? thread.avatar : null;
            channelIcon = "fa-user";
        }
    } else {
        const channel = window.App.chat.state.communityData.channels.find(c => c.id === chId) || window.App.chat.state.communityData.channels[0];
        if (channel) {
            channelName = channel.name;
            channelDesc = channel.category || 'General';
            channelIcon = channel.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag';
        }
    }

    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.innerText = channelName;
    const descEl = document.getElementById('header-desc');
    if (descEl) descEl.innerText = channelDesc;

    const iconContainer = document.getElementById('header-icon-container');
    if (iconContainer) {
        if (headerImage) {
            iconContainer.innerHTML = `<img src="${headerImage}" class="w-full h-full object-cover rounded-full">`;
            iconContainer.className = "w-10 h-10 rounded-full bg-white p-0.5 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0";
        } else {
            iconContainer.innerHTML = `<i id="header-icon" class="fas ${channelIcon} text-lg"></i>`;
            iconContainer.className = "w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 shrink-0";
        }
    }

    _renderInputArea(cid, chId, isSupport, window.App.chat.state.communityData);
    await App.chat.loadMessages(cid, chId, App.chat.state.currentUser);
};

function _renderInputArea(cid, chId, isSupport, community) {
    const inputArea = document.getElementById('chat-input-area');
    const isAdmin = App.chat.state.currentUser.role === 'admin';
    let canWrite = true;
    if (!isSupport && !isAdmin) {
        const channel = (community.channels || []).find(c => c.id === chId);
        if (channel && channel.type === 'announcement') canWrite = false;
        if (community.allowStudentPosts === false) canWrite = false;
    }

    inputArea.innerHTML = canWrite ? `
        <div class="flex flex-col transition-all">
            <div id="attachments-preview" class="hidden px-2 pb-3 gap-2 overflow-x-auto custom-scrollbar"></div>
            <form onsubmit="App.chat.handleSendMessage(event, '${cid}', '${chId}', ${isSupport})" class="flex items-end gap-2 bg-white dark:bg-[#151e32] rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <button type="button" onclick="document.getElementById('file-input').click()" class="w-10 h-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0"><i class="fas fa-paperclip text-lg"></i></button>
                <input type="file" id="file-input" class="hidden" multiple onchange="App.chat.handleFileSelect(event)">
                <textarea id="chat-input" rows="1" class="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-200 placeholder-slate-400 resize-none py-2.5 max-h-40 custom-scrollbar text-sm font-medium leading-relaxed" placeholder="Escribe tu mensaje aquí..." onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); this.form.dispatchEvent(new Event('submit')); }"></textarea>
                <button type="submit" class="w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center justify-center shrink-0 transition-all active:scale-95"><i class="fas fa-paper-plane text-sm"></i></button>
            </form>
        </div>` : `
        <div class="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
            <p class="text-sm font-bold text-slate-500 flex items-center justify-center gap-2"><i class="fas fa-lock"></i> Canal de solo lectura</p>
        </div>`;
}

window.App.chat.loadMessages = async (cid, chid, user) => {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML = `<div class="py-12 text-center text-slate-400 animate-pulse text-sm">Cargando conversación...</div>`;
    try {
        const allPosts = await App.api.getPosts(cid);
        const messages = allPosts.filter(p => p.channelId === chid).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        if (messages.length === 0) {
            const isSupport = chid.startsWith(CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX);
            const emptyIcon = isSupport ? 'fa-hand-sparkles' : 'fa-comments';
            const emptyText = isSupport ? 'Inicia una conversación con el profesor.' : 'Sé el primero en escribir en este canal.';
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 opacity-60 select-none">
                <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 text-2xl"><i class="fas ${emptyIcon}"></i></div>
                <p class="text-slate-500 text-sm font-medium">${emptyText}</p>
            </div>`;
            return;
        }

        let html = '', lastDate = null;
        const isGlobalChannel = !chid.startsWith(CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX);

        messages.forEach((m, idx) => {
            const dateStr = new Date(m.createdAt).toLocaleDateString();
            if (dateStr !== lastDate) {
                html += `<div class="flex items-center my-6 select-none"><div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div><span class="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-widest bg-[#F1F5F9] dark:bg-[#0b1120] rounded-full">${new Date(m.createdAt).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span><div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div></div>`;
                lastDate = dateStr;
            }
            const groupTimeout = isGlobalChannel ? 60000 : CHAT_CONFIG.GROUPING_TIMEOUT_MS;
            const prevMsg = messages[idx - 1];
            const isGrouped = prevMsg && prevMsg.authorId === m.authorId && (new Date(m.createdAt) - new Date(prevMsg.createdAt) < groupTimeout);

            html += _renderMessageBubble(m, user, isGrouped, isGlobalChannel);
        });

        container.innerHTML = html;

        const scroller = document.getElementById('chat-scroller');
        if (scroller) {
            scroller.style.scrollBehavior = 'auto';
            scroller.scrollTop = scroller.scrollHeight;
            setTimeout(() => scroller.style.scrollBehavior = 'smooth', 100);
        }

    } catch (e) { console.error(e); container.innerHTML = `<div class="text-red-500 text-center text-sm p-8">Error de conexión. Intenta recargar.</div>`; }
};

function _renderMessageBubble(m, user, isGrouped, isGlobalChannel) {
    const isMe = m.authorId === user.uid;
    const isAdmin = m.author.role === 'admin';
    const isEditing = window.App.chat.state.editingMessageId === m.id;
    const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let alignRight = isMe;
    if (isGlobalChannel) {
        if (isAdmin) alignRight = false;
        else alignRight = true;
    }

    let bubbleClass = "bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700";
    if (isAdmin && isGlobalChannel) {
        bubbleClass = "bg-indigo-50 dark:bg-indigo-900/20 text-slate-900 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-800 shadow-sm";
    } else if (!isAdmin && isGlobalChannel) {
        bubbleClass = "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700";
    } else if (isMe && !isGlobalChannel) {
        bubbleClass = "bg-indigo-600 text-white shadow-md border-transparent";
    }

    if (isEditing) {
        return `
        <div class="w-full max-w-3xl mx-auto my-2 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border-2 border-yellow-400 border-dashed">
            <p class="text-xs font-bold text-yellow-600 mb-2 uppercase tracking-wider">Editando mensaje</p>
            <textarea id="edit-input-${m.id}" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-yellow-500 font-medium resize-none shadow-inner" rows="3">${m.content}</textarea>
            <div class="flex gap-3 mt-3 justify-end">
                <button onclick="App.chat.cancelEdit()" class="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors">Cancelar (Esc)</button>
                <button onclick="App.chat.saveEdit('${m.communityId}', '${m.id}')" class="text-xs font-bold bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 shadow-lg transition-transform active:scale-95">Guardar Cambios (Enter)</button>
            </div>
        </div>`;
    }

    const content = Utils.parseMarkdown(m.content || '');
    const atts = _renderAttachments(m.attachments);
    const canAction = user.role === 'admin';
    const actions = canAction ? _renderMsgActions(m.communityId, m.id, m.content, m.author.name) : '';

    const avatarHtml = `<img src="${m.author.avatar}" class="w-8 h-8 rounded-full bg-gray-200 object-cover shadow-sm select-none" title="${m.author.name}">`;
    const nameHtml = `<span class="text-[10px] font-bold ${isAdmin ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'} mb-1 block px-1">${m.author.name} ${isAdmin ? '<i class="fas fa-chalkboard-teacher ml-1"></i>' : ''}</span>`;

    if (alignRight) {
        return `
        <div class="flex justify-end gap-3 group relative ${isGrouped ? 'mt-1' : 'mt-4'}">
            <div class="max-w-[75%] relative">
                ${!isGrouped && isGlobalChannel ? nameHtml : ''}
                <div class="${bubbleClass} px-4 py-2.5 rounded-2xl ${isGrouped ? 'rounded-tr-md' : 'rounded-tr-none'} relative shadow-sm text-sm leading-relaxed break-words">
                    ${content}
                    ${atts}
                    <div class="text-[9px] opacity-60 text-right mt-1 font-mono select-none">${time}</div>
                </div>
                ${actions}
            </div>
            ${!isGrouped ? avatarHtml : '<div class="w-8"></div>'}
        </div>`;
    } else {
        return `
        <div class="flex justify-start gap-3 group relative ${isGrouped ? 'mt-1' : 'mt-4'}">
            ${!isGrouped ? avatarHtml : '<div class="w-8"></div>'}
            <div class="max-w-[75%] relative">
                ${!isGrouped ? nameHtml : ''}
                <div class="${bubbleClass} px-4 py-2.5 rounded-2xl ${isGrouped ? 'rounded-tl-md' : 'rounded-tl-none'} relative shadow-sm text-sm leading-relaxed break-words">
                    ${content}
                    ${atts}
                    <div class="text-[9px] opacity-60 text-right mt-1 font-mono select-none">${time}</div>
                </div>
                ${actions}
            </div>
        </div>`;
    }
}

function _renderMsgActions(cid, pid, rawContent, authorName) {
    const safeContent = encodeURIComponent(rawContent);
    const safeName = encodeURIComponent(authorName || 'Alumno');

    const aiBtn = `
        <button onclick="App.chat.solveWithAI('${safeContent}', '${safeName}')" class="w-6 h-6 flex items-center justify-center text-indigo-400 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-full transition-colors" title="Resolver con IA">
            <i class="fas fa-magic text-[10px]"></i>
        </button>
    `;

    return `<div class="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full shadow-md px-1.5 py-0.5 flex gap-1 z-10 transition-all scale-90 group-hover:scale-100">
        ${aiBtn}
        <div class="w-px h-3 bg-slate-200 dark:bg-slate-700 my-auto mx-0.5"></div>
        <button onclick="App.chat.startEdit('${pid}')" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-500 rounded-full transition-colors" title="Editar"><i class="fas fa-pencil-alt text-[10px]"></i></button>
        <button onclick="App.chat.deleteMessage('${cid}', '${pid}')" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-full transition-colors" title="Borrar"><i class="fas fa-trash-alt text-[10px]"></i></button>
    </div>`;
}

function _renderAttachments(atts) {
    if (!atts || !atts.length) return '';
    const images = atts.filter(a => a.type === 'image');
    const files = atts.filter(a => a.type !== 'image');
    let html = '';
    if (images.length > 0) {
        html += `<div class="mt-2 grid grid-cols-2 gap-2 max-w-sm">${images.map(img => `<img src="${img.url}" class="rounded-lg border border-black/5 dark:border-white/10 cursor-zoom-in hover:opacity-90 max-h-40 w-full object-cover shadow-sm" onclick="window.open('${img.url}')">`).join('')}</div>`;
    }
    if (files.length > 0) {
        html += `<div class="mt-2 space-y-1">${files.map(f => `<div class="flex items-center gap-3 p-2 bg-black/5 dark:bg-white/5 rounded-lg group/file cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors" onclick="window.open('${f.url}')"><div class="w-8 h-8 bg-white dark:bg-slate-700 rounded flex items-center justify-center text-indigo-500 shadow-sm"><i class="fas fa-file"></i></div><div class="flex-1 min-w-0"><div class="text-xs font-bold truncate opacity-90">${f.name}</div><div class="text-[9px] opacity-60">${Utils.formatBytes(f.size || 0)}</div></div><i class="fas fa-download opacity-50 group-hover/file:opacity-100"></i></div>`).join('')}</div>`;
    }
    return html;
}

// ============================================================================
// 7. POWER TOOLS ADMIN
// ============================================================================

window.App.chat.startEdit = (pid) => {
    window.App.chat.state.editingMessageId = pid;
    App.chat.loadMessages(App.chat.state.communityData.id, App.chat.state.activeChannelId, App.state.currentUser);
};

window.App.chat.cancelEdit = () => {
    window.App.chat.state.editingMessageId = null;
    App.chat.loadMessages(App.chat.state.communityData.id, App.chat.state.activeChannelId, App.state.currentUser);
};

window.App.chat.saveEdit = async (cid, pid) => {
    const newVal = document.getElementById(`edit-input-${pid}`).value.trim();
    if (!newVal) return App.ui.toast("El mensaje no puede estar vacío", "warning");
    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "posts", pid), { content: newVal, isEdited: true });
        window.App.chat.state.editingMessageId = null;
        App.ui.toast("Mensaje editado", "success");
        App.chat.loadMessages(cid, App.chat.state.activeChannelId, App.state.currentUser);
    } catch (e) { App.ui.toast("Error al editar", "error"); }
};

window.App.chat.deleteMessage = async (cid, pid) => {
    if (confirm("¿Estás seguro de eliminar este mensaje?")) {
        await window.F.deleteDoc(window.F.doc(window.F.db, "posts", pid));
        App.chat.loadMessages(cid, window.App.chat.state.activeChannelId, App.state.currentUser);
    }
};

window.App.chat.createChannelPrompt = async (cid, category = "General") => {
    const name = prompt("Nombre del canal (Ej: dudas-react):");
    if (!name) return;
    const cleanId = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), {
            channels: window.F.arrayUnion({ id: cleanId, name: name.trim(), type: 'text', category: category, createdAt: new Date().toISOString() })
        });
        App.chat.state.communityData.channels.push({ id: cleanId, name: name.trim(), type: 'text', category: category });
        _updateSidebar(App.chat.state.communityData, App.chat.state.communityData.channels, App.chat.state.activeChannelId);
    } catch (e) { App.ui.toast("Error", "error"); }
};

window.App.chat.openChannelManager = (cid, chid, name, currentCat) => {
    const modal = document.getElementById('channel-manager-modal');
    document.getElementById('cm-cid').value = cid;
    document.getElementById('cm-chid').value = chid;
    document.getElementById('cm-name').value = name;
    document.getElementById('cm-cat').value = currentCat;
    modal.classList.remove('hidden');
};

window.App.chat.saveChannelChanges = async () => {
    const cid = document.getElementById('cm-cid').value;
    const chid = document.getElementById('cm-chid').value;
    const newName = document.getElementById('cm-name').value.trim();
    const newCat = document.getElementById('cm-cat').value.trim();
    if (!newName || !newCat) return App.ui.toast("Campos requeridos", "warning");
    const commData = App.chat.state.communityData;
    const newChannels = commData.channels.map(c => { if (c.id === chid) return { ...c, name: newName, category: newCat }; return c; });
    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), { channels: newChannels });
        App.chat.state.communityData.channels = newChannels;
        App.ui.toast("Canal actualizado", "success");
        document.getElementById('channel-manager-modal').classList.add('hidden');
        _updateSidebar(App.chat.state.communityData, newChannels, App.chat.state.activeChannelId);
        if (App.chat.state.activeChannelId === chid) {
            document.getElementById('header-title').innerText = newName;
            document.getElementById('header-desc').innerText = newCat;
        }
    } catch (e) { App.ui.toast("Error al guardar", "error"); }
};

window.App.chat.deleteChannel = async () => {
    if (!confirm("¿Eliminar este canal y todo su historial?")) return;
    const cid = document.getElementById('cm-cid').value;
    const chid = document.getElementById('cm-chid').value;
    const newChannels = App.chat.state.communityData.channels.filter(c => c.id !== chid);
    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), { channels: newChannels });
        App.chat.state.communityData.channels = newChannels;
        App.ui.toast("Canal eliminado", "success");
        document.getElementById('channel-manager-modal').classList.add('hidden');
        if (App.chat.state.activeChannelId === chid) App.chat.switchChannel(cid, newChannels[0]?.id || 'general');
        else _updateSidebar(App.chat.state.communityData, newChannels, App.chat.state.activeChannelId);
    } catch (e) { App.ui.toast("Error al borrar", "error"); }
};

window.App.chat.renameCategory = async (cid, oldName) => {
    const newName = prompt(`Renombrar categoría "${oldName}" a:`, oldName);
    if (!newName || newName === oldName) return;
    const commData = App.chat.state.communityData;
    const newChannels = commData.channels.map(c => { if (c.category === oldName) return { ...c, category: newName }; return c; });
    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), { channels: newChannels });
        App.chat.state.communityData.channels = newChannels;
        App.ui.toast(`Categoría renombrada: ${newName}`, "success");
        _updateSidebar(App.chat.state.communityData, newChannels, App.chat.state.activeChannelId);
    } catch (e) { App.ui.toast("Error al renombrar", "error"); }
};

// (V12.1) NUEVA FUNCIÓN: ELIMINAR HILO DE SOPORTE
window.App.chat.deleteSupportThread = async (cid, uid) => {
    if (!confirm("¿Eliminar este chat con el alumno? Se borrará de tu lista.")) return;
    try {
        await window.F.deleteDoc(window.F.doc(window.F.db, "communities", cid, "active_threads", uid));

        // Si estábamos viendo ese chat, volver al global
        const currentId = `${CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX}${uid}`;
        if (window.App.chat.state.activeChannelId === currentId) {
            App.chat.switchSidebarTab('global');
            const generalCh = window.App.chat.state.communityData.channels[0]?.id || 'general';
            App.chat.switchChannel(cid, generalCh);
        }
        App.ui.toast("Chat eliminado de la lista", "success");
    } catch (e) {
        console.error(e);
        App.ui.toast("Error al eliminar chat", "error");
    }
};

// ============================================================================
// 8. CONTROLADORES BÁSICOS: ENVÍO & DRAG-DROP
// ============================================================================

window.App.chat.handleSendMessage = async (e, cid, chid, isSupport) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    const atts = window.App.chat.state.pendingAttachments;

    if (!txt && atts.length === 0) return;

    input.value = '';
    window.App.chat.state.pendingAttachments = [];
    document.getElementById('attachments-preview').innerHTML = '';
    document.getElementById('attachments-preview').classList.add('hidden');

    const user = App.state.currentUser;

    try {
        const uploaded = atts.map(a => ({ type: a.type, url: a.preview, name: a.file.name, size: a.file.size }));
        const cleanAuthor = {
            uid: user.uid || 'unknown',
            name: user.name || 'Usuario',
            avatar: user.avatar || '',
            role: user.role || 'student'
        };

        await App.api.createPost({
            communityId: cid,
            channelId: chid,
            content: txt,
            attachments: uploaded,
            type: uploaded.length > 0 ? 'media' : 'text',
            authorId: user.uid,
            author: cleanAuthor,
            createdAt: new Date().toISOString()
        });

        App.chat.loadMessages(cid, chid, user);

    } catch (e) {
        console.error("Error crítico enviando mensaje:", e);
        App.ui.toast("Error enviando mensaje", "error");
        return;
    }

    if (isSupport) {
        _syncSupportThreadV11(cid, user);
    }
};

async function _syncSupportThreadV11(cid, user) {
    try {
        const threadData = {
            uid: user.uid || 'unknown',
            name: user.name || 'Alumno',
            avatar: user.avatar || '',
            updatedAt: new Date().toISOString()
        };

        await window.F.setDoc(
            window.F.doc(window.F.db, "communities", cid, "active_threads", user.uid),
            threadData,
            { merge: true }
        );
        console.log("[V11] Hilo sincronizado en active_threads.");

    } catch (err) {
        console.warn("Advertencia: Fallo al sincronizar en V11 active_threads.", err);
    }
}

window.App.chat.handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    window.App.chat.state.pendingAttachments = [];
    const preview = document.getElementById('attachments-preview');
    preview.innerHTML = ''; preview.classList.remove('hidden');

    files.forEach(f => {
        const objUrl = URL.createObjectURL(f);
        window.App.chat.state.pendingAttachments.push({ file: f, preview: objUrl, type: f.type.startsWith('image/') ? 'image' : 'file' });
        const div = document.createElement('div');
        div.className = "w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg shrink-0 overflow-hidden relative border border-gray-200 dark:border-slate-600";
        div.innerHTML = f.type.startsWith('image/') ? `<img src="${objUrl}" class="w-full h-full object-cover">` : `<div class="flex items-center justify-center h-full text-[9px] font-bold text-slate-500 uppercase text-center p-1 break-all">${f.name}</div>`;
        preview.appendChild(div);
    });
};

window.App.chat.setupDragAndDrop = () => {
    const zone = document.body, overlay = document.getElementById('drag-overlay');
    let counter = 0; if (!overlay) return;
    zone.addEventListener('dragenter', e => { e.preventDefault(); counter++; overlay.classList.remove('hidden'); setTimeout(() => overlay.classList.remove('opacity-0'), 10); });
    zone.addEventListener('dragleave', e => { e.preventDefault(); counter--; if (counter === 0) { overlay.classList.add('opacity-0'); setTimeout(() => overlay.classList.add('hidden'), 300); } });
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => { e.preventDefault(); counter = 0; overlay.classList.add('hidden'); if (e.dataTransfer.files.length) window.App.chat.handleFileSelect({ target: { files: e.dataTransfer.files } }); });
};

// ============================================================================
// 9. MODALES Y UI ADMIN
// ============================================================================

window.App.chat.openSettings = (cid) => {
    const comm = App.chat.state.communityData;
    document.getElementById('edit-comm-id').value = comm.id;
    document.getElementById('edit-comm-name').value = comm.name;
    document.getElementById('edit-comm-desc').value = comm.description || '';
    document.getElementById('edit-comm-allow').checked = comm.allowStudentPosts !== false;
    document.getElementById('chat-settings-modal').classList.remove('hidden');
    setTimeout(() => { document.getElementById('chat-settings-content').classList.remove('scale-95', 'opacity-0'); document.getElementById('chat-settings-content').classList.add('scale-100', 'opacity-100'); }, 10);
};

window.App.chat.closeSettings = () => {
    document.getElementById('chat-settings-content').classList.remove('scale-100', 'opacity-100');
    document.getElementById('chat-settings-content').classList.add('scale-95', 'opacity-0');
    setTimeout(() => document.getElementById('chat-settings-modal').classList.add('hidden'), 200);
};

window.App.chat.saveSettings = async () => {
    const id = document.getElementById('edit-comm-id').value;
    const updates = { name: document.getElementById('edit-comm-name').value.trim(), description: document.getElementById('edit-comm-desc').value.trim(), allowStudentPosts: document.getElementById('edit-comm-allow').checked };
    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", id), updates);
        App.state.cache.communities[id] = { ...App.state.cache.communities[id], ...updates };
        App.ui.toast("Comunidad actualizada", "success");
        App.chat.closeSettings();
        const header = document.querySelector('#chat-sidebar span.font-bold');
        if (header) header.innerText = updates.name;
    } catch (e) { App.ui.toast("Error", "error"); }
};

window.App.chat.deleteCommunity = async () => {
    const id = document.getElementById('edit-comm-id').value;
    const name = document.getElementById('edit-comm-name').value;
    if (prompt(`Escribe "${name}" para confirmar borrado:`) !== name) return App.ui.toast("Cancelado", "info");
    try { await window.F.deleteDoc(window.F.doc(window.F.db, "communities", id)); window.location.hash = '#feed'; } catch (e) { App.ui.toast("Error eliminando", "error"); }
};

function _renderSettingsModal() {
    return `
    <div id="chat-settings-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 dark:border-slate-700 scale-95 opacity-0 transition-all duration-300 transform" id="chat-settings-content">
            <div class="p-5 bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <h3 class="font-bold text-lg text-slate-900 dark:text-white"><i class="fas fa-sliders-h text-indigo-500 mr-2"></i> Ajustes Comunidad</h3>
                <button onclick="App.chat.closeSettings()" class="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-400"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <input type="hidden" id="edit-comm-id">
                <div class="space-y-4">
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">Nombre</label><input type="text" id="edit-comm-name" class="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white font-bold"></div>
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">Descripción</label><textarea id="edit-comm-desc" rows="2" class="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white resize-none"></textarea></div>
                </div>
                <hr class="border-gray-100 dark:border-slate-800">
                <div class="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 cursor-pointer" onclick="document.getElementById('edit-comm-allow').click()">
                    <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center shrink-0"><i class="fas fa-comment-dots"></i></div>
                    <div class="flex-1"><div class="text-sm font-bold text-slate-800 dark:text-white">Chat Abierto</div><div class="text-xs text-slate-500">Permitir mensajes de estudiantes.</div></div>
                    <input type="checkbox" id="edit-comm-allow" class="w-5 h-5 text-indigo-600 rounded">
                </div>
                <div class="pt-6 mt-6 border-t border-gray-100 dark:border-slate-800"><button onclick="App.chat.deleteCommunity()" class="w-full py-3 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 text-xs font-bold flex items-center justify-center gap-2"><i class="fas fa-trash-alt"></i> ELIMINAR COMUNIDAD</button></div>
            </div>
            <div class="p-5 bg-gray-50/80 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-700 text-right"><button onclick="App.chat.saveSettings()" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2 ml-auto"><i class="fas fa-save"></i> Guardar Cambios</button></div>
        </div>
    </div>`;
}

function _renderChannelManagerModal() {
    return `
    <div id="channel-manager-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 animate-fade-in">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Editar Canal</h3>
            <input type="hidden" id="cm-cid">
            <input type="hidden" id="cm-chid">
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Nombre</label>
                    <input type="text" id="cm-name" class="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm dark:text-white">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                    <input type="text" id="cm-cat" class="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm dark:text-white" list="cat-list">
                    <datalist id="cat-list"><option value="General"><option value="Backend"><option value="Frontend"></datalist>
                </div>
            </div>

            <div class="mt-6 flex justify-between items-center">
                <button onclick="App.chat.deleteChannel()" class="text-red-500 hover:text-red-600 text-sm font-bold"><i class="fas fa-trash"></i> Eliminar</button>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('channel-manager-modal').classList.add('hidden')" class="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold">Cancelar</button>
                    <button onclick="App.chat.saveChannelChanges()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">Guardar</button>
                </div>
            </div>
        </div>
    </div>`;
}