/**
 * community.chat.js (V6.5 - ADMIN CONTROL EDITION)
 * SUITE COMPLETA DE CHAT Y GESTIÓN ACADÉMICA.
 * * * CARACTERÍSTICAS TÉCNICAS:
 * 1. GESTIÓN DE GRUPOS (CATEGORÍAS): Renombrar y Eliminar categorías enteras mediante transacciones.
 * 2. GESTIÓN DE CANALES: Editar nombre, Mover de categoría, Eliminar.
 * 3. SOPORTE ACADÉMICO: Canales privados 1-a-1 (Ticket System) con bandeja de entrada para admins.
 * 4. GESTIÓN COMUNIDAD: Modal completo de configuración y permisos globales.
 * 5. CORE: Firestore Real, Drag & Drop, Markdown Parser Seguro, UI Sólida de Alto Contraste.
 */

window.App = window.App || {};
window.App.chat = window.App.chat || {};

// ============================================================================
// 1. CONFIGURACIÓN Y UTILIDADES
// ============================================================================

const CHAT_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_MIME_TYPES: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
        'application/pdf', 'text/plain', 'application/zip', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    GROUPING_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutos
    SUPPORT_CHANNEL_PREFIX: 'support_'  // Prefijo reservado
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
        // Sanitización básica y parseo
        return text
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-3 rounded-lg my-2 text-xs font-mono overflow-x-auto border border-gray-700 shadow-inner">$1</pre>')
            .replace(/`([^`]+)`/g, '<code class="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono border border-indigo-100 dark:border-indigo-800/50">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em class="italic text-slate-600 dark:text-slate-300">$1</em>')
            .replace(/__([^_]+)__/g, '<u class="underline decoration-indigo-500 decoration-2">$1</u>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-800 break-all font-medium transition-colors">$1</a>');
    }
};

// ============================================================================
// 2. GESTIÓN DE ESTADO (LOCAL STORE)
// ============================================================================

window.App.chat.state = {
    activeChannelId: null,
    pendingAttachments: [],
    communityData: null,
    currentUser: null,
    supportThreads: [], // Caché local para hilos de soporte
    isLoading: false
};

// ============================================================================
// 3. RENDERIZADOR PRINCIPAL (SHELL)
// ============================================================================

window.App.chat.render = async (container, communityId, user) => {
    window.App.chat.state.currentUser = user;

    // 1. Cargar Datos de la Comunidad (con manejo de errores)
    let community = App.state.cache.communities[communityId];
    if (!community) {
        try {
            community = await App.api.getCommunityById(communityId);
            App.state.cache.communities[communityId] = community;
        } catch (e) {
            console.error("Error cargando comunidad:", e);
            container.innerHTML = `
                <div class="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-[#0b1120] text-slate-400 gap-4">
                    <div class="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center text-red-500">
                        <i class="fas fa-wifi-slash text-2xl"></i>
                    </div>
                    <p class="font-medium">No se pudo cargar la comunidad.</p>
                    <button onclick="window.location.reload()" class="text-indigo-600 font-bold hover:underline">Reintentar</button>
                </div>`;
            return;
        }
    }
    
    // Inicializar estado local
    window.App.chat.state.communityData = community;
    window.App.chat.state.supportThreads = community.supportThreads || [];

    // 2. Inicializar Canales (Default si está vacío)
    const channels = community.channels || [{ id: 'general', name: 'General', type: 'text', category: 'General' }];
    
    // Determinar canal activo inicial
    let activeChId = window.App.chat.state.activeChannelId;
    if (!activeChId) activeChId = channels[0].id;
    window.App.chat.state.activeChannelId = activeChId;

    // 3. Renderizar Estructura Base (Shell)
    // Solo renderizamos el shell si no existe para evitar parpadeos al navegar
    const shellExists = document.getElementById('chat-shell');
    if (!shellExists) {
        container.innerHTML = _renderShellHTML(community, channels, user, activeChId);
        App.chat.setupDragAndDrop(); // Inicializar listeners globales una sola vez
    } else {
        // Si ya existe, actualizamos solo el sidebar para reflejar cambios
        _updateSidebar(community, channels, activeChId);
    }

    // 4. Cargar Mensajes del canal activo
    await App.chat.switchChannel(communityId, activeChId, true); 
};

/**
 * Genera el HTML Estructural de la aplicación de Chat.
 */
function _renderShellHTML(community, channels, user, activeId) {
    const isAdmin = user.role === 'admin';
    const groupedChannels = _groupChannels(channels);

    return `
    <div id="chat-shell" class="flex h-full w-full overflow-hidden bg-white dark:bg-[#0b1120] relative font-sans text-sm text-slate-900 dark:text-slate-100">
        
        <!-- DRAG & DROP OVERLAY (Oculto) -->
        <div id="drag-overlay" class="absolute inset-0 z-[60] bg-indigo-600/95 hidden flex-col items-center justify-center pointer-events-none transition-all duration-300 opacity-0 backdrop-blur-md">
            <div class="bg-white p-10 rounded-3xl shadow-2xl transform scale-100 text-center max-w-sm mx-4 animate-bounce-slow">
                <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i class="fas fa-cloud-upload-alt text-4xl text-indigo-600"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Suelta tus archivos</h3>
                <p class="text-gray-500">Se subirán automáticamente al chat.</p>
            </div>
        </div>

        <!-- SIDEBAR (Navegación) -->
        <div class="w-72 bg-[#F8FAFC] dark:bg-[#0f172a] border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 hidden md:flex z-20 transition-colors">
            
            <!-- Header Sidebar -->
            <div class="h-16 flex items-center justify-between px-4 shrink-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
                <button onclick="window.location.hash='#feed'" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all" title="Salir al Feed">
                    <i class="fas fa-arrow-left"></i>
                </button>
                
                <span class="font-bold text-slate-700 dark:text-slate-200 truncate px-2 flex-1 text-center select-none" id="sidebar-comm-name">
                    ${community.name}
                </span>
                
                ${isAdmin ? `
                <div class="flex gap-1">
                    <button onclick="App.chat.openSettings('${community.id}')" class="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors" title="Ajustes Comunidad">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button onclick="App.chat.createChannelPrompt('${community.id}')" class="w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors" title="Crear Canal">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>` : '<div class="w-8"></div>'}
            </div>
            
            <!-- Lista de Canales (Scrollable) -->
            <div id="sidebar-channels" class="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                ${_renderChannelsHTML(groupedChannels, activeId, isAdmin, community.id, user)}
            </div>

            <!-- Footer Usuario -->
            <div class="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
                <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-default">
                    <img src="${user.avatar || 'https://ui-avatars.com/api/?name='+user.name}" class="w-9 h-9 rounded-full bg-gray-200 border border-gray-100 dark:border-slate-700 object-cover">
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-sm text-slate-800 dark:text-white truncate">${user.name}</div>
                        <div class="text-xs text-slate-500 truncate flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> ${isAdmin ? 'Administrador' : 'Estudiante'}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MAIN CHAT AREA -->
        <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0b1120] relative z-0">
            
            <!-- Chat Header -->
            <div class="h-16 border-b border-gray-200 dark:border-slate-800 flex items-center px-6 shrink-0 justify-between bg-white dark:bg-[#0b1120] z-30 shadow-sm relative">
                <div class="flex items-center gap-4 min-w-0">
                    <button class="md:hidden text-slate-500 mr-2 p-2" onclick="alert('Vista móvil en desarrollo')"><i class="fas fa-bars"></i></button>
                    
                    <div id="header-icon-container" class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <i id="header-icon" class="fas fa-hashtag"></i>
                    </div>
                    
                    <div class="min-w-0">
                        <h3 id="header-title" class="font-bold text-slate-900 dark:text-white text-base truncate">...</h3>
                        <p id="header-desc" class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">...</p>
                    </div>
                </div>
            </div>

            <!-- Messages Scroller -->
            <div class="flex-1 overflow-y-auto px-4 pt-6 pb-4 custom-scrollbar flex flex-col relative" id="chat-scroller">
                <!-- Grid decorativo muy sutil -->
                <div class="absolute inset-0 bg-grid-slate-100/[0.03] dark:bg-grid-slate-700/[0.03] pointer-events-none"></div>
                
                <div id="chat-messages-container" class="flex flex-col justify-end min-h-0 relative space-y-1 pb-4 z-10">
                    <!-- Los mensajes se inyectan aquí -->
                </div>
            </div>

            <!-- Input Area -->
            <div id="chat-input-area" class="p-5 bg-white dark:bg-[#0b1120] relative z-40">
                <!-- El formulario se inyecta aquí dinámicamente -->
            </div>
        </div>
        
        <!-- MODAL DE AJUSTES (Inyectado) -->
        ${_renderSettingsModal()}
    </div>`;
}

// ============================================================================
// 4. LÓGICA: SIDEBAR & NAVEGACIÓN (V6.5 FEATURES)
// ============================================================================

// Agrupa canales por la propiedad 'category'
function _groupChannels(channels) {
    return channels.reduce((acc, ch) => {
        const cat = ch.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ch);
        return acc;
    }, {});
}

// Renderiza la lista de canales, incluyendo las herramientas de Admin y Soporte
function _renderChannelsHTML(grouped, activeId, isAdmin, cid, user) {
    let html = '';

    // A. SECCIÓN DE SOPORTE (Ticket System)
    // ----------------------------------------------------
    if (isAdmin) {
        // VISTA ADMIN: Bandeja de entrada con hilos abiertos
        const threads = window.App.chat.state.supportThreads || [];
        html += `
        <div class="space-y-1 mb-6 animate-fade-in">
            <div class="px-3 mb-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest select-none flex items-center gap-1 font-heading">
                <i class="fas fa-inbox"></i> Bandeja de Soporte
            </div>
            ${threads.length === 0 ? `<div class="px-3 text-xs text-slate-400 italic">No hay dudas pendientes.</div>` : ''}
            
            ${threads.map(t => {
                const threadId = `${CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX}${t.uid}`;
                const isActive = activeId === threadId;
                const activeClass = isActive 
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800";
                
                return `
                <button onclick="App.chat.switchChannel('${cid}', '${threadId}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeClass}">
                    <div class="relative">
                        <img src="${t.avatar || 'https://ui-avatars.com/api/?name='+t.name}" class="w-6 h-6 rounded-full bg-gray-200 object-cover">
                        <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 border-2 border-white dark:border-[#0f172a] rounded-full"></div>
                    </div>
                    <span class="truncate text-xs font-medium">${t.name}</span>
                </button>`;
            }).join('')}
        </div>`;
    } else {
        // VISTA ESTUDIANTE: Botón único para abrir canal privado
        const myThreadId = `${CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX}${user.uid}`;
        const isActive = activeId === myThreadId;
        const activeClass = isActive 
            ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20" 
            : "bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/20";
        
        html += `
        <div class="space-y-1 mb-6 px-1">
            <button onclick="App.chat.switchChannel('${cid}', '${myThreadId}')" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeClass}">
                <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <i class="fas fa-hand-paper text-sm"></i>
                </div>
                <div class="text-left">
                    <div class="text-xs font-bold">Preguntar al Profe</div>
                    <div class="text-[10px] opacity-80">Canal Privado 1-a-1</div>
                </div>
            </button>
        </div>`;
    }

    // B. SECCIÓN DE CANALES PÚBLICOS (Agrupados)
    // ----------------------------------------------------
    Object.entries(grouped).forEach(([cat, chs]) => {
        html += `
        <div class="space-y-1 mb-6 group/cat">
            <div class="px-3 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest select-none flex items-center justify-between">
                <span class="flex items-center gap-1"><i class="fas fa-layer-group text-[9px]"></i> ${cat}</span>
                
                <!-- ADMIN CONTROLS: CATEGORÍA -->
                ${isAdmin ? `
                <div class="opacity-0 group-hover/cat:opacity-100 flex gap-2 transition-opacity">
                    <i onclick="App.chat.renameCategory('${cid}', '${cat}')" class="fas fa-pencil-alt cursor-pointer text-slate-400 hover:text-indigo-500" title="Renombrar Grupo"></i>
                    <i onclick="App.chat.deleteCategory('${cid}', '${cat}')" class="fas fa-trash-alt cursor-pointer text-slate-400 hover:text-red-500" title="Borrar Grupo Entero"></i>
                </div>` : ''}
            </div>

            ${chs.map(ch => {
                const isActive = ch.id === activeId;
                const icon = ch.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag';
                
                // Clases Condicionales
                const baseClass = "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group/ch relative overflow-hidden";
                const activeClass = isActive 
                    ? "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium";
                
                return `
                <button onclick="App.chat.switchChannel('${cid}', '${ch.id}')" class="${baseClass} ${activeClass}">
                    <div class="flex items-center gap-3 truncate z-10">
                        <i class="fas ${icon} text-sm w-5 text-center ${isActive ? 'text-slate-900 dark:text-white' : 'opacity-70'}"></i> 
                        <span class="truncate text-xs tracking-wide">${ch.name}</span>
                    </div>
                    
                    <!-- Indicador activo -->
                    ${isActive ? '<div class="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-slate-400 rounded-r-full"></div>' : ''}
                    
                    <!-- ADMIN CONTROLS: CANAL INDIVIDUAL -->
                    ${isAdmin && ch.id !== 'general' ? `
                    <div class="opacity-0 group-hover/ch:opacity-100 flex gap-1 z-20">
                        <div onclick="event.stopPropagation(); App.chat.editChannel('${cid}', '${ch.id}', '${ch.name}', '${ch.category||'General'}')" class="text-slate-400 hover:text-indigo-500 px-1 p-1 rounded hover:bg-white dark:hover:bg-slate-700" title="Editar Canal">
                            <i class="fas fa-pencil-alt text-[10px]"></i>
                        </div>
                        <div onclick="event.stopPropagation(); App.chat.deleteChannel('${cid}', '${ch.id}')" class="text-slate-400 hover:text-red-500 px-1 p-1 rounded hover:bg-white dark:hover:bg-slate-700" title="Eliminar Canal">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                        </div>
                    </div>` : ''}
                </button>`;
            }).join('')}
        </div>`;
    });

    return html;
}

// Función auxiliar para refrescar solo el sidebar (sin redibujar todo)
function _updateSidebar(community, channels, activeId) {
    const container = document.getElementById('sidebar-channels');
    if(container) {
        container.innerHTML = _renderChannelsHTML(
            _groupChannels(channels), 
            activeId, 
            App.chat.state.currentUser.role === 'admin', 
            community.id,
            App.chat.state.currentUser
        );
    }
}

// ============================================================================
// 5. LÓGICA: CAMBIO DE CANAL & INPUT RENDER
// ============================================================================

window.App.chat.switchChannel = async (cid, chId, force = false) => {
    // Optimización: No recargar si ya estamos en el canal
    if (!force && window.App.chat.state.activeChannelId === chId) return;

    window.App.chat.state.activeChannelId = chId;

    // Actualizar visualmente el sidebar
    _updateSidebar(window.App.chat.state.communityData, window.App.chat.state.communityData.channels, chId);

    // Lógica para determinar metadatos del canal (Público vs Virtual de Soporte)
    let channelName = "Canal Desconocido";
    let channelDesc = "";
    let channelIcon = "fa-hashtag";
    let isSupport = false;

    if (chId.startsWith(CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX)) {
        // --- MODO SOPORTE ---
        isSupport = true;
        const targetUid = chId.replace(CHAT_CONFIG.SUPPORT_CHANNEL_PREFIX, '');
        const isMe = targetUid === App.chat.state.currentUser.uid;
        
        if (isMe) {
            channelName = "Preguntar al Profesor";
            channelDesc = "Este chat es privado. Solo los administradores pueden leerlo.";
            channelIcon = "fa-user-graduate";
        } else {
            // Admin viendo el canal de un alumno
            const thread = (window.App.chat.state.supportThreads || []).find(t => t.uid === targetUid);
            channelName = thread ? `Dudas de ${thread.name}` : "Chat de Alumno";
            channelDesc = "Soporte Académico Privado.";
            channelIcon = "fa-chalkboard-teacher";
        }
    } else {
        // --- MODO CANAL PÚBLICO ---
        const channel = window.App.chat.state.communityData.channels.find(c => c.id === chId) || window.App.chat.state.communityData.channels[0];
        channelName = channel.name;
        channelDesc = channel.category ? `Grupo: ${channel.category}` : 'Canal General';
        channelIcon = channel.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag';
    }

    // Actualizar Header
    document.getElementById('header-title').innerText = channelName;
    document.getElementById('header-desc').innerText = channelDesc;
    document.getElementById('header-icon').className = `fas ${channelIcon}`;

    // Renderizar Input (según permisos)
    _renderInputArea(cid, chId, isSupport, window.App.chat.state.communityData);

    // Cargar Mensajes
    await App.chat.loadMessages(cid, chId, App.chat.state.currentUser);
};

function _renderInputArea(cid, chId, isSupport, community) {
    const inputArea = document.getElementById('chat-input-area');
    const isAdmin = App.chat.state.currentUser.role === 'admin';
    
    // Reglas de Escritura:
    // 1. Soporte: Siempre se puede escribir.
    // 2. Admin: Siempre puede escribir.
    // 3. Público: Depende de 'allowStudentPosts' y tipo 'announcement'.
    let canWrite = true;
    if (!isSupport && !isAdmin) {
        const channel = (community.channels || []).find(c => c.id === chId);
        if (channel && channel.type === 'announcement') canWrite = false;
        if (community.allowStudentPosts === false) canWrite = false;
    }

    if (canWrite) {
        inputArea.innerHTML = `
        <div class="bg-gray-100 dark:bg-slate-800 rounded-2xl p-2 flex flex-col gap-2 relative border border-gray-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
            <!-- Preview de Adjuntos -->
            <div id="attachments-preview" class="hidden px-2 pt-2 gap-3 overflow-x-auto custom-scrollbar pb-2"></div>
            
            <form onsubmit="App.chat.handleSendMessage(event, '${cid}', '${chId}', ${isSupport})" class="flex items-end gap-2 p-1">
                <button type="button" onclick="document.getElementById('file-input').click()" class="w-9 h-9 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500 transition-colors flex items-center justify-center shrink-0" title="Adjuntar Archivo">
                    <i class="fas fa-plus text-sm"></i>
                </button>
                <input type="file" id="file-input" class="hidden" multiple onchange="App.chat.handleFileSelect(event)">
                
                <textarea id="chat-input" rows="1" class="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none py-2 max-h-32 custom-scrollbar text-sm leading-relaxed" 
                    placeholder="Escribe un mensaje..." 
                    onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); this.form.dispatchEvent(new Event('submit')); }"></textarea>
                
                <button type="submit" class="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md hover:scale-105 active:scale-95 transition-all">
                    <i class="fas fa-paper-plane text-xs"></i>
                </button>
            </form>
        </div>
        ${isSupport ? '<div class="text-[10px] text-center text-indigo-500 mt-2 font-bold flex items-center justify-center gap-1"><i class="fas fa-lock"></i> Chat Privado Profesor-Alumno</div>' : ''}`;
    } else {
        inputArea.innerHTML = `
        <div class="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-dashed border-gray-300 dark:border-slate-700 text-center select-none">
            <p class="text-sm font-bold text-slate-500 flex items-center justify-center gap-2">
                <i class="fas fa-lock"></i> Canal de solo lectura.
            </p>
        </div>`;
    }
}

// ============================================================================
// 6. LÓGICA: MENSAJES & UI SÓLIDA
// ============================================================================

window.App.chat.loadMessages = async (cid, chid, user) => {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    
    // Loader
    container.innerHTML = `<div class="py-12 text-center text-slate-400 animate-pulse"><i class="fas fa-circle-notch fa-spin mr-2"></i> Cargando historial...</div>`;

    try {
        const allPosts = await App.api.getPosts(cid);
        // Filtramos por channelId
        const messages = allPosts
            .filter(p => p.channelId === chid)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        if (messages.length === 0) {
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 opacity-60 select-none">
                <div class="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4 text-3xl text-slate-400">👋</div>
                <p class="text-slate-500 text-sm font-medium">Sé el primero en escribir.</p>
            </div>`;
            return;
        }

        let html = '';
        let lastDate = null;

        messages.forEach((m, idx) => {
            // Separador de Fechas Visual
            const dateStr = new Date(m.createdAt).toLocaleDateString();
            if (dateStr !== lastDate) {
                html += `
                <div class="flex justify-center my-6 relative z-0">
                    <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gray-200 dark:bg-slate-800 -z-10"></div>
                    <span class="text-[10px] font-bold text-slate-500 bg-white dark:bg-[#0b1120] px-3 py-0.5 rounded-full border border-gray-200 dark:border-slate-800 uppercase tracking-wider shadow-sm">
                        ${new Date(m.createdAt).toLocaleDateString([], {weekday: 'long', day: 'numeric', month: 'long'})}
                    </span>
                </div>`;
                lastDate = dateStr;
            }

            // Agrupación visual (Stacking)
            const prevMsg = messages[idx - 1];
            const isGrouped = prevMsg && prevMsg.authorId === m.authorId && (new Date(m.createdAt) - new Date(prevMsg.createdAt) < CHAT_CONFIG.GROUPING_TIMEOUT_MS);
            
            html += _renderMessageCard(m, user, isGrouped);
        });

        container.innerHTML = html;
        const scroller = document.getElementById('chat-scroller');
        if(scroller) scroller.scrollTop = scroller.scrollHeight;

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="text-red-500 text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-xl m-4">Error cargando chat.</div>`;
    }
};

function _renderMessageCard(m, user, isGrouped) {
    const isMe = m.authorId === user.uid;
    const isAdmin = m.author.role === 'admin';
    const time = new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // UI SÓLIDA (High Contrast) - Sin transparencias
    let bubbleClass = '';
    if (isMe) {
        bubbleClass = 'bg-indigo-600 text-white shadow-md border border-indigo-700'; 
    } else if (isAdmin) {
        bubbleClass = 'bg-amber-50 dark:bg-amber-900/20 text-slate-800 dark:text-amber-100 border border-amber-200 dark:border-amber-700/50 shadow-sm relative overflow-hidden'; 
    } else {
        bubbleClass = 'bg-white dark:bg-[#1e293b] text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 shadow-sm'; 
    }

    const content = Utils.parseMarkdown(m.content || '');
    const atts = _renderAttachments(m.attachments);
    const align = isMe ? 'justify-end' : 'justify-start';

    if (isGrouped) {
        // MENSAJE AGRUPADO (Más compacto)
        return `
        <div class="flex ${align} group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] px-2 py-0.5 rounded-lg transition-colors w-full relative">
            <span class="text-[10px] text-slate-300 w-12 text-right absolute left-0 top-1.5 opacity-0 group-hover:opacity-100 font-mono select-none">${time}</span>
            <div class="max-w-[85%] md:max-w-[70%] ml-12">
                <div class="${isMe?'text-right':'text-left'} text-[15px] leading-relaxed break-words dark:text-slate-300">${content}</div>
                ${atts}
            </div>
            ${(user.role === 'admin' || isMe) ? _renderMsgActions(m.communityId, m.id, isMe) : ''}
        </div>`;
    } else {
        // MENSAJE COMPLETO (Con Avatar)
        return `
        <div class="flex ${align} group mt-5 mb-1 px-2 relative items-start gap-3 w-full">
            ${!isMe ? `<img src="${m.author.avatar}" class="w-10 h-10 rounded-2xl bg-gray-200 object-cover border border-gray-100 dark:border-slate-700 shadow-sm select-none">` : ''}
            
            <div class="max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                ${!isMe ? `<div class="flex items-center gap-2 mb-1.5 ml-1">
                    <span class="text-sm font-bold ${isAdmin?'text-amber-600 dark:text-amber-500':'text-slate-700 dark:text-slate-200'}">${m.author.name}</span>
                    <span class="text-[10px] text-slate-400 font-medium">${time}</span>
                    ${isAdmin ? '<span class="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800 flex items-center gap-1"><i class="fas fa-shield-alt"></i> Admin</span>' : ''}
                </div>` : ''}

                <div class="px-5 py-3 rounded-2xl text-[15px] leading-relaxed break-words ${bubbleClass} ${isMe?'rounded-tr-sm':'rounded-tl-sm'}">
                    ${content}
                    ${atts}
                </div>
                ${isMe ? `<span class="text-[10px] text-slate-400 mt-1 mr-1 font-mono">${time}</span>` : ''}
            </div>
            ${(user.role === 'admin' || isMe) ? _renderMsgActions(m.communityId, m.id, isMe) : ''}
        </div>`;
    }
}

function _renderAttachments(atts) {
    if(!atts || !atts.length) return '';
    
    const images = atts.filter(a => a.type === 'image');
    const files = atts.filter(a => a.type !== 'image');
    let html = '';

    // Grid Imágenes
    if (images.length > 0) {
        const gridClass = images.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
        html += `<div class="mt-3 grid ${gridClass} gap-2 rounded-xl overflow-hidden max-w-sm">
            ${images.map(img => `
                <div class="relative group bg-gray-100 dark:bg-slate-800">
                    <img src="${img.url}" class="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity border border-black/5 dark:border-white/5" onclick="window.open('${img.url}', '_blank')">
                </div>
            `).join('')}
        </div>`;
    }

    // Lista Archivos
    if (files.length > 0) {
        html += `<div class="mt-3 space-y-2 w-full max-w-sm">
            ${files.map(f => `
                <div class="flex items-center gap-3 p-3 bg-black/5 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-black/30 transition-colors group/file cursor-pointer" onclick="window.open('${f.url}', '_blank')">
                    <div class="w-10 h-10 bg-indigo-500 text-white flex items-center justify-center rounded-lg shadow-sm text-lg">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs font-bold truncate dark:text-slate-200">${f.name}</div>
                        <div class="text-[10px] text-slate-500 font-mono">${Utils.formatBytes(f.size||0)}</div>
                    </div>
                    <i class="fas fa-download text-slate-400 group-hover/file:text-slate-600 dark:group-hover/file:text-white transition-colors"></i>
                </div>
            `).join('')}
        </div>`;
    }
    return html;
}

function _renderMsgActions(cid, pid, isMe) {
    return `<div class="absolute ${isMe?'left-0 top-1':'right-0 top-1'} opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-10">
        <button onclick="App.chat.deleteMessage('${cid}', '${pid}')" 
                class="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors" title="Borrar Mensaje">
            <i class="fas fa-trash-alt text-xs"></i>
        </button>
    </div>`;
}

// ============================================================================
// 7. CONTROLADORES ADMIN: GESTIÓN AVANZADA (V6.5 FEATURES)
// ============================================================================

// A. CREAR CANAL (Con Categoría)
window.App.chat.createChannelPrompt = async (cid) => {
    const name = prompt("Nombre del nuevo canal:");
    if (!name) return;
    const category = prompt("Nombre del Grupo/Categoría (Ej: Unidad 1):\nDejar vacío para 'General'");
    const finalCategory = category ? category.trim() : "General";
    
    // Slugify seguro
    const cleanId = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    if (!cleanId) return App.ui.toast("Nombre inválido", "warning");

    try {
        const ref = window.F.doc(window.F.db, "communities", cid);
        const newChannel = { id: cleanId, name: name.trim(), type: 'text', category: finalCategory, createdAt: new Date().toISOString() };
        
        await window.F.updateDoc(ref, { channels: window.F.arrayUnion(newChannel) });
        
        App.ui.toast(`Grupo "${finalCategory}" creado`, "success");
        // Update local cache
        App.state.cache.communities[cid].channels.push(newChannel);
        App.chat.render(document.querySelector('#community-content'), cid, App.state.currentUser);
    } catch(e) { App.ui.toast("Error al crear", "error"); }
};

// B. RENOMBRAR CATEGORÍA (Transacción Masiva)
window.App.chat.renameCategory = async (cid, oldName) => {
    const newName = prompt(`Nuevo nombre para el grupo "${oldName}":`, oldName);
    if (!newName || newName === oldName) return;

    try {
        const ref = window.F.doc(window.F.db, "communities", cid);
        await window.F.runTransaction(window.F.db, async (t) => {
            const doc = await t.get(ref);
            if (!doc.exists()) throw "Error";
            const channels = doc.data().channels || [];
            // Actualizar todos los canales de esa categoría
            const updatedChannels = channels.map(c => {
                if (c.category === oldName) return { ...c, category: newName.trim() };
                return c;
            });
            t.update(ref, { channels: updatedChannels });
        });
        
        App.ui.toast("Grupo renombrado", "success");
        const comm = App.state.cache.communities[cid];
        comm.channels = comm.channels.map(c => c.category === oldName ? { ...c, category: newName.trim() } : c);
        App.chat.render(document.querySelector('#community-content'), cid, App.state.currentUser);

    } catch(e) { App.ui.toast("Error renombrando grupo", "error"); }
};

// C. ELIMINAR CATEGORÍA (Borrado en Cascada)
window.App.chat.deleteCategory = async (cid, catName) => {
    if (!confirm(`⚠️ ¿Estás seguro de eliminar el GRUPO COMPLETO "${catName}"?\nSe borrarán todos los canales dentro de él.`)) return;
    
    try {
        const ref = window.F.doc(window.F.db, "communities", cid);
        await window.F.runTransaction(window.F.db, async (t) => {
            const doc = await t.get(ref);
            if (!doc.exists()) throw "Error";
            const channels = doc.data().channels || [];
            const filteredChannels = channels.filter(c => c.category !== catName);
            t.update(ref, { channels: filteredChannels });
        });
        
        App.ui.toast("Grupo eliminado", "success");
        const comm = App.state.cache.communities[cid];
        comm.channels = comm.channels.filter(c => c.category !== catName);
        App.chat.render(document.querySelector('#community-content'), cid, App.state.currentUser);

    } catch(e) { App.ui.toast("Error eliminando grupo", "error"); }
};

// D. EDITAR CANAL (Renombrar/Mover)
window.App.chat.editChannel = async (cid, chId, currentName, currentCat) => {
    const newName = prompt("Nuevo nombre del canal:", currentName);
    if (newName === null) return;
    const newCat = prompt("Mover a categoría (Dejar igual para no mover):", currentCat);
    if (newCat === null) return;

    if (newName === currentName && newCat === currentCat) return;

    try {
        const ref = window.F.doc(window.F.db, "communities", cid);
        await window.F.runTransaction(window.F.db, async (t) => {
            const doc = await t.get(ref);
            if (!doc.exists()) throw "Error";
            const channels = doc.data().channels || [];
            const idx = channels.findIndex(c => c.id === chId);
            if (idx === -1) throw "Channel not found";
            
            channels[idx].name = newName.trim();
            channels[idx].category = newCat.trim();
            t.update(ref, { channels });
        });

        App.ui.toast("Canal actualizado", "success");
        const comm = App.state.cache.communities[cid];
        const ch = comm.channels.find(c => c.id === chId);
        if (ch) { ch.name = newName.trim(); ch.category = newCat.trim(); }
        
        App.chat.render(document.querySelector('#community-content'), cid, App.state.currentUser);

    } catch(e) { App.ui.toast("Error editando canal", "error"); }
};

// E. ELIMINAR CANAL INDIVIDUAL
window.App.chat.deleteChannel = async (cid, chId) => {
    if(!confirm(`¿Eliminar canal permanentemente?`)) return;
    try {
        const ref = window.F.doc(window.F.db, "communities", cid);
        await window.F.runTransaction(window.F.db, async (t) => {
            const doc = await t.get(ref);
            const channels = (doc.data().channels || []).filter(c => c.id !== chId);
            t.update(ref, { channels });
        });
        App.ui.toast("Canal eliminado", "success");
        const comm = App.state.cache.communities[cid];
        comm.channels = comm.channels.filter(c => c.id !== chId);
        App.chat.switchChannel(cid, 'general', true);
    } catch(e) { App.ui.toast("Error", "error"); }
};

// ============================================================================
// 8. CONTROLADORES ESTÁNDAR: ENVÍO & DRAG-DROP
// ============================================================================

window.App.chat.handleSendMessage = async (e, cid, chid, isSupport) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    const atts = window.App.chat.state.pendingAttachments;

    if(!txt && atts.length === 0) return;

    // Reset UI Optimista
    input.value = ''; window.App.chat.state.pendingAttachments = []; document.getElementById('attachments-preview').classList.add('hidden');

    try {
        const uploaded = atts.map(a => ({ type: a.type, url: a.preview, name: a.file.name, size: a.file.size }));
        const user = App.state.currentUser;

        // Crear Post en Firestore
        await App.api.createPost({
            communityId: cid, channelId: chid, content: txt, attachments: uploaded,
            type: uploaded.length > 0 ? 'media' : 'text', authorId: user.uid, author: user, createdAt: new Date().toISOString()
        });

        // Auto-Registro de Hilo de Soporte (si aplica)
        if (isSupport && user.role !== 'admin') {
            const threads = window.App.chat.state.supportThreads || [];
            if (!threads.find(t => t.uid === user.uid)) {
                const newThread = { uid: user.uid, name: user.name, avatar: user.avatar || '', updatedAt: new Date().toISOString() };
                await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), { supportThreads: window.F.arrayUnion(newThread) });
                window.App.chat.state.supportThreads.push(newThread);
            }
        }
        App.chat.loadMessages(cid, chid, user);
    } catch(e) { App.ui.toast("Error enviando", "error"); }
};

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
        div.innerHTML = f.type.startsWith('image/') ? `<img src="${objUrl}" class="w-full h-full object-cover">` : `<div class="flex items-center justify-center h-full text-[8px] font-bold text-slate-500 uppercase">FILE</div>`;
        preview.appendChild(div);
    });
};

window.App.chat.deleteMessage = async (cid, pid) => {
    if(confirm("¿Borrar mensaje?")) {
        await window.F.deleteDoc(window.F.doc(window.F.db, "posts", pid));
        App.chat.loadMessages(cid, window.App.chat.state.activeChannelId, App.state.currentUser);
    }
};

window.App.chat.setupDragAndDrop = () => {
    const zone = document.body, overlay = document.getElementById('drag-overlay');
    let counter = 0; if(!overlay) return;
    zone.addEventListener('dragenter', e => { e.preventDefault(); counter++; overlay.classList.remove('hidden'); setTimeout(()=>overlay.classList.remove('opacity-0'),10); });
    zone.addEventListener('dragleave', e => { e.preventDefault(); counter--; if(counter===0) { overlay.classList.add('opacity-0'); setTimeout(()=>overlay.classList.add('hidden'),300); } });
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => { e.preventDefault(); counter=0; overlay.classList.add('hidden'); if(e.dataTransfer.files.length) window.App.chat.handleFileSelect({target:{files:e.dataTransfer.files}}); });
};

// ============================================================================
// 9. MODAL DE AJUSTES COMUNIDAD
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
    const updates = {
        name: document.getElementById('edit-comm-name').value.trim(),
        description: document.getElementById('edit-comm-desc').value.trim(),
        allowStudentPosts: document.getElementById('edit-comm-allow').checked
    };
    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", id), updates);
        App.state.cache.communities[id] = { ...App.state.cache.communities[id], ...updates };
        App.ui.toast("Comunidad actualizada", "success");
        App.chat.closeSettings();
        document.querySelector('#sidebar-comm-name').innerText = updates.name;
    } catch(e) { App.ui.toast("Error", "error"); }
};

window.App.chat.deleteCommunity = async () => {
    const id = document.getElementById('edit-comm-id').value;
    const name = document.getElementById('edit-comm-name').value;
    if(prompt(`Escribe "${name}" para confirmar borrado:`) !== name) return App.ui.toast("Cancelado", "info");
    try { await window.F.deleteDoc(window.F.doc(window.F.db, "communities", id)); window.location.hash = '#feed'; } catch(e) { App.ui.toast("Error eliminando", "error"); }
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