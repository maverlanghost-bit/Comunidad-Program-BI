/**
 * community.chat.js (V1.0 - DEDICATED MODULE)
 * Módulo Independiente de Chat para Comunidades.
 *
 * RESPONSABILIDADES:
 * - Renderizado completo de la UI de Chat (Sidebar + Main Area).
 * - Gestión de Canales (Crear, Borrar, Seleccionar).
 * - Gestión de Mensajes (Cargar, Enviar, Borrar, Tiempo Real).
 *
 * * NOTA ARQUITECTÓNICA:
 * - Este módulo es invocado por community.views.js cuando se activa la tab 'chat'.
 * - Usa el namespace global App.chat para evitar colisiones.
 */

window.App = window.App || {};
window.App.chat = window.App.chat || {};

// Estado Local del Chat
window.App.chat.state = {
    activeChannelId: 'general', // Default
    cachedMessages: {} // Cache simple para evitar parpadeos
};

// ============================================================================
// 1. RENDERIZADOR PRINCIPAL (UI SHELL)
// ============================================================================

/**
 * Renderiza la interfaz completa del chat dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se inyectará el chat.
 * @param {string} communityId - ID de la comunidad actual.
 * @param {object} user - Objeto del usuario actual (currentUser).
 */
window.App.chat.render = async (container, communityId, user) => {
    // 1. Obtener datos frescos de la comunidad para asegurar canales actualizados
    let community = App.state.cache.communities[communityId];
    if (!community) {
        try {
            community = await App.api.getCommunityById(communityId);
            App.state.cache.communities[communityId] = community;
        } catch (e) {
            container.innerHTML = `<div class="p-10 text-red-500">Error cargando datos de chat.</div>`;
            return;
        }
    }

    const channels = community.channels || [{ id: 'general', name: 'General', type: 'text', category: 'Comunidad' }];
    const isAdmin = user.role === 'admin';

    // Determinar canal activo (memoria o default)
    let activeChId = window.App.chat.state.activeChannelId;
    let activeCh = channels.find(c => c.id === activeChId);
    
    // Fallback si el canal activo ya no existe
    if (!activeCh) {
        activeCh = channels[0];
        activeChId = activeCh.id;
        window.App.chat.state.activeChannelId = activeChId;
    }

    // Agrupar canales por categoría
    const groupedChannels = channels.reduce((acc, ch) => {
        const cat = ch.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ch);
        return acc;
    }, {});

    // Renderizar HTML Estructural
    container.innerHTML = `
    <div class="flex h-full w-full overflow-hidden bg-white dark:bg-[#0f172a] rounded-xl shadow-inner border border-gray-200 dark:border-slate-800">
        
        <!-- SIDEBAR DE CANALES (Desktop) -->
        <div class="w-72 bg-gray-50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 hidden md:flex">
            <!-- Header Sidebar -->
            <div class="h-14 flex items-center justify-between px-5 border-b border-gray-200 dark:border-slate-800 shrink-0">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Canales</span>
                ${isAdmin ? `
                <button onclick="App.community.openChannelModal()" class="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1890ff] transition-all" title="Crear Canal">
                    <i class="fas fa-plus text-xs"></i>
                </button>` : ''}
            </div>
            
            <!-- Lista Canales -->
            <div class="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                ${Object.entries(groupedChannels).map(([cat, chs]) => `
                    <div class="space-y-1">
                        <div class="px-3 mb-2 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80">
                            <i class="fas fa-chevron-down text-[8px]"></i> ${cat}
                        </div>
                        ${chs.map(ch => {
                            const isActive = ch.id === activeCh.id;
                            const activeClass = isActive 
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                                : "text-slate-500 dark:text-slate-400 hover:bg-gray-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white";
                            const icon = ch.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag';
                            
                            return `
                            <button onclick="App.chat.switchChannel('${communityId}', '${ch.id}')" 
                                    class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group ${activeClass}">
                                <div class="flex items-center gap-2.5 truncate">
                                    <i class="fas ${icon} text-xs opacity-60 w-4 text-center"></i> 
                                    <span class="truncate font-bold text-xs">${ch.name}</span>
                                </div>
                                ${isAdmin && ch.id !== 'general' ? `
                                <div onclick="event.stopPropagation(); App.chat.deleteChannel('${communityId}', '${ch.id}')" 
                                     class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <i class="fas fa-times text-[10px]"></i>
                                </div>` : ''}
                            </button>`;
                        }).join('')}
                    </div>`).join('')}
            </div>
        </div>
        
        <!-- ÁREA PRINCIPAL (CHAT) -->
        <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative">
            
            <!-- Header Chat (Mobile + Desktop) -->
            <div class="h-14 border-b border-gray-200 dark:border-slate-800 flex items-center px-6 shrink-0 justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 sticky top-0">
                <div class="flex items-center gap-3">
                    <button class="md:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white mr-1" onclick="alert('TODO: Mobile Menu')">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <i class="fas ${activeCh.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag'}"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-sm leading-tight"># ${activeCh.name}</h3>
                        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block">
                            ${activeCh.type === 'announcement' ? 'Canal de anuncios oficial' : 'Chat general de la comunidad'}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Área de Mensajes (Scroller) -->
            <div class="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar flex flex-col relative" id="chat-scroller">
                <!-- Welcome Message -->
                <div class="mt-auto text-center py-10 opacity-50 select-none">
                    <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
                        <i class="fas fa-hashtag"></i>
                    </div>
                    <h4 class="font-bold text-slate-900 dark:text-white">Bienvenido a #${activeCh.name}</h4>
                    <p class="text-xs text-slate-500">Este es el comienzo del canal.</p>
                </div>
                
                <!-- Contenedor Dinámico -->
                <div id="chat-messages-container" class="space-y-1 pb-4 w-full">
                    <div class="flex justify-center py-4"><i class="fas fa-circle-notch fa-spin text-slate-300"></i></div>
                </div>
            </div>

            <!-- Input Area -->
            <div class="p-4 bg-white dark:bg-slate-900 shrink-0 border-t border-gray-200 dark:border-slate-800 relative z-20">
                ${(isAdmin || activeCh.type !== 'announcement') ? `
                <form onsubmit="App.chat.handleSendMessage(event, '${communityId}', '${activeCh.id}')" 
                      class="bg-gray-100 dark:bg-slate-800 rounded-2xl p-2 flex gap-2 items-end border border-transparent focus-within:border-[#1890ff] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    
                    <button type="button" class="p-3 text-slate-400 hover:text-[#1890ff] transition-colors rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700" title="Adjuntar (Próximamente)">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                    
                    <textarea id="chat-input" rows="1" 
                              class="flex-1 bg-transparent border-none outline-none text-sm p-3 text-slate-900 dark:text-white placeholder:text-slate-500 resize-none max-h-32 custom-scrollbar font-medium" 
                              placeholder="Enviar mensaje a #${activeCh.name}" 
                              onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); this.form.dispatchEvent(new Event('submit')); }"></textarea>
                    
                    <button type="submit" class="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-105 transition-transform shadow-md flex items-center justify-center">
                        <i class="fas fa-paper-plane text-xs"></i>
                    </button>
                </form>
                <div class="text-[10px] text-slate-400 mt-2 text-center font-medium select-none">
                    <strong>Enter</strong> para enviar, <strong>Shift+Enter</strong> para nueva línea.
                </div>` 
                : 
                `<div class="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl text-center text-xs font-bold text-slate-400 uppercase border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center gap-2 select-none">
                    <i class="fas fa-lock"></i> Canal de Solo Lectura
                </div>`}
            </div>
        </div>
    </div>`;

    // Cargar mensajes iniciales
    App.chat.loadMessages(communityId, activeChId, user);
};

// ============================================================================
// 2. LÓGICA DE MENSAJES
// ============================================================================

/**
 * Carga los mensajes de un canal específico.
 */
window.App.chat.loadMessages = async (cid, chid, user) => {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    try {
        // NOTA: Idealmente esto debería ser una query específica por channelId
        // Por compatibilidad con el sistema actual, filtramos en cliente si la API no lo soporta nativamente.
        const allPosts = await App.api.getPosts(cid);
        
        const messages = allPosts
            .filter(p => p.channelId === chid)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Orden cronológico ascendente para chat

        if (messages.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = messages.map((m, index) => {
            const isMe = m.authorId === user.uid;
            const prevMsg = messages[index - 1];
            
            // Agrupación visual de mensajes del mismo autor (Compact Mode)
            const isSameAuthor = prevMsg && prevMsg.authorId === m.authorId;
            const timeDiff = prevMsg ? (new Date(m.createdAt) - new Date(prevMsg.createdAt)) : 9999999;
            const isGrouped = isSameAuthor && timeDiff < 60000 * 5; // 5 minutos

            // Renderizado Condicional
            if (isGrouped) {
                return `
                <div class="group flex gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 -mx-4 px-4 py-1 rounded transition-colors relative pl-[68px]">
                    <!-- Hora en hover (flotante izquierda) -->
                    <span class="absolute left-6 top-1.5 text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 font-mono w-8 text-right">
                        ${new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    
                    <div class="flex-1 min-w-0">
                        <div class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words font-medium">${m.content}</div>
                    </div>
                    ${(user.role === 'admin' || isMe) ? _renderMsgActions(cid, m.id) : ''}
                </div>`;
            } else {
                return `
                <div class="group flex gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 -mx-4 px-4 py-2 mt-2 rounded-xl transition-colors relative">
                    <img src="${m.author.avatar || 'https://ui-avatars.com/api/?name=' + m.author.name}" 
                         class="w-10 h-10 rounded-full bg-gray-200 object-cover mt-0.5 border border-gray-200 dark:border-slate-700 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                    
                    <div class="flex-1 min-w-0">
                        <div class="flex items-baseline gap-2 mb-0.5">
                            <span class="font-bold text-sm text-slate-900 dark:text-white hover:underline cursor-pointer">${m.author.name}</span>
                            <span class="text-[10px] text-slate-400 font-medium">${App.ui.formatDate(m.createdAt)}</span>
                            ${m.author.role === 'admin' ? '<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1"><i class="fas fa-shield-alt"></i> Admin</span>' : ''}
                        </div>
                        <div class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words font-medium">${m.content}</div>
                    </div>
                    ${(user.role === 'admin' || isMe) ? _renderMsgActions(cid, m.id) : ''}
                </div>`;
            }
        }).join('');

        // Auto-scroll al fondo
        const scroller = document.getElementById('chat-scroller');
        if(scroller) scroller.scrollTop = scroller.scrollHeight;

    } catch (e) {
        console.error("Chat Load Error:", e);
        container.innerHTML = `<div class="text-red-500 text-center text-xs p-4">Error cargando mensajes.</div>`;
    }
};

/**
 * Helper para botones de acción en mensajes
 */
function _renderMsgActions(cid, pid) {
    return `
    <div class="absolute right-4 top-2 opacity-0 group-hover:opacity-100 flex gap-1 bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 rounded-lg p-1 transition-all z-10">
        <button onclick="App.chat.deleteMessage('${cid}', '${pid}')" 
                class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Borrar">
            <i class="fas fa-trash text-xs"></i>
        </button>
    </div>`;
}

// ============================================================================
// 3. ACCIONES DE USUARIO
// ============================================================================

window.App.chat.switchChannel = (cid, chId) => {
    // Actualizar estado
    window.App.chat.state.activeChannelId = chId;
    
    // Re-renderizar todo el módulo
    // NOTA: Es más eficiente que solo cambiar el contenido para asegurar consistencia en la UI
    const container = document.getElementById('community-content'); // Contenedor padre conocido
    if (container) {
        App.chat.render(container, cid, App.state.currentUser);
    }
};

window.App.chat.handleSendMessage = async (e, cid, chid) => {
    e.preventDefault(); 
    const input = document.getElementById('chat-input'); 
    const txt = input.value.trim(); 
    
    if(!txt) return; 
    
    // Optimistic UI: Limpiar input inmediatamente
    input.value = '';
    
    // Resetear altura del textarea
    input.style.height = 'auto';

    try { 
        await App.api.createPost({ 
            communityId: cid, 
            channelId: chid, 
            content: txt, 
            authorId: App.state.currentUser.uid, 
            author: App.state.currentUser 
        }); 
        // Recargar mensajes
        App.chat.loadMessages(cid, chid, App.state.currentUser); 
    } catch(e) { 
        App.ui.toast("Error enviando mensaje", "error"); 
        input.value = txt; // Restaurar texto si falla
    }
};

window.App.chat.deleteMessage = async (cid, pid) => {
    if(!confirm("¿Borrar mensaje permanentemente?")) return;
    try { 
        await window.F.deleteDoc(window.F.doc(window.F.db, "posts", pid)); 
        const chid = window.App.chat.state.activeChannelId;
        App.chat.loadMessages(cid, chid, App.state.currentUser); 
        App.ui.toast("Mensaje eliminado", "success");
    } catch(e) { 
        App.ui.toast("Error al borrar", "error"); 
    }
};

// ============================================================================
// 4. GESTIÓN DE CANALES (ADMIN)
// ============================================================================

window.App.chat.deleteChannel = async (cid, chId) => {
    if(!confirm(`¿Estás seguro de eliminar el canal y todo su contenido?`)) return;
    
    try {
        const ref = window.F.doc(window.F.db, "communities", cid);
        
        await window.F.runTransaction(window.F.db, async (transaction) => {
            const doc = await transaction.get(ref); 
            if (!doc.exists()) throw "La comunidad no existe";
            
            const channels = doc.data().channels || []; 
            const newChannels = channels.filter(c => c.id !== chId);
            
            transaction.update(ref, { channels: newChannels });
        });
        
        App.ui.toast("Canal eliminado", "success");
        
        // Si borramos el canal activo, volver a general
        if (window.App.chat.state.activeChannelId === chId) {
            window.App.chat.state.activeChannelId = 'general';
        }
        
        // Re-render
        const container = document.getElementById('community-content');
        if (container) App.chat.render(container, cid, App.state.currentUser);

    } catch(e) { 
        console.error(e); 
        App.ui.toast("Error al eliminar canal", "error"); 
    }
};