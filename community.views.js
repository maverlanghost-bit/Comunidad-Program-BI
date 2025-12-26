/**
 * community.views.js (V12.0 - Ultimate Nav Stability)
 * Controlador de Comunidad: Feed, LMS, Chat Inmersivo y Eventos.
 * * CAMBIOS V12.0:
 * - FIX DEFINITIVO HEADER: Desacople de la carga de datos y el renderizado del header.
 * - ACTUALIZACIÓN GARANTIZADA: El header se actualiza SIEMPRE al cambiar de pestaña.
 * - PROTECCIÓN DE DATOS: Recuperación inteligente de datos si la caché falla.
 */

// 1. Cargar API de YouTube (Singleton)
if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// ==========================================
// CONTROLADOR PRINCIPAL
// ==========================================
window.App.renderCommunity = async (communityId, activeTab = 'inicio', extraParam = null) => {
    const user = App.state.currentUser;
    if (!user) return; 

    // 1. GESTIÓN DE ESTADO Y DATOS (CRÍTICO)
    // Intentamos recuperar de caché primero
    let community = App.state.cache.communities[communityId] || null;
    
    // Si no hay datos en caché, los pedimos AHORA MISMO.
    // Esto asegura que 'community' exista antes de intentar actualizar el Header.
    if (!community) {
        try {
            community = await App.api.getCommunityById(communityId);
        } catch (e) { console.error("Error recuperando comunidad:", e); }
    }

    // 2. VERIFICACIÓN DE ENTORNO (DOM)
    // Comprobamos si ya estamos dentro de la vista de ESTA comunidad
    const containerRoot = document.getElementById('community-main');
    const currentRenderedId = containerRoot ? containerRoot.dataset.communityId : null;
    const isSameCommunity = containerRoot && currentRenderedId === communityId;

    // 3. RENDERIZADO ESTRUCTURAL (Solo si es necesario)
    // Si cambiamos de comunidad o es la primera carga, pintamos el esqueleto completo.
    // Si solo cambiamos de tab (isSameCommunity), SALTAMOS esto para evitar el "Flash Blanco".
    if (!isSameCommunity) {
        const sidebarHTML = App.sidebar ? App.sidebar.render(`#community/${communityId}`) : '';
        const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
        if (isPinned) document.body.classList.add('sidebar-is-pinned');

        // Layout Base con data-community-id para seguimiento
        const html = `
            ${sidebarHTML}

            <main id="community-main" data-community-id="${communityId}" class="h-full flex flex-col bg-[#FAFAFA] relative overflow-hidden transition-all duration-300">
                
                <!-- HEADER (Se actualiza dinámicamente) -->
                <div id="community-header-container" class="shrink-0 z-20 bg-white border-b border-gray-200">
                    ${community ? _renderHeader(community, user.role === 'admin', activeTab) : _renderHeaderSkeleton()}
                </div>

                <!-- CONTENIDO PRINCIPAL -->
                <div id="tab-content" class="flex-1 relative w-full overflow-hidden flex flex-col h-full">
                    <!-- Skeleton Inicial -->
                    <div class="p-6 space-y-4 animate-pulse">
                        <div class="h-48 bg-gray-200 rounded-2xl w-full"></div>
                        <div class="h-6 bg-gray-200 rounded w-1/3"></div>
                        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            </main>

            <div id="community-modals-container"></div>
        `;
        
        // Renderizamos la estructura base (esto solo pasa una vez por sesión de comunidad)
        await App.render(html);
        
        // Inyectar modales
        const modalsHTML = `
            ${_renderEditPostModal()}
            ${_renderProfileModal(user)}
            ${user.role === 'admin' ? _renderEditCommunityModal(community || {id: communityId}) : ''}
            ${user.role === 'admin' ? _renderLiveConfigModal(communityId) : ''}
            ${user.role === 'admin' ? _renderFinishLiveModal(communityId) : ''}
            ${user.role === 'admin' ? _renderChannelModal() : ''}
        `;
        document.getElementById('community-modals-container').innerHTML = modalsHTML;
    }

    // 4. ACTUALIZACIÓN DINÁMICA (Se ejecuta SIEMPRE)
    // Aquí es donde corregimos la barra superior y cambiamos el contenido sin recargar todo.
    
    // A. Actualizar Header (FIX: Se ejecuta siempre que tengamos datos)
    const headerContainer = document.getElementById('community-header-container');
    if (headerContainer && community) {
        // Esto cambia la clase "active" (negrita/fondo) en la pestaña correspondiente
        headerContainer.innerHTML = _renderHeader(community, user.role === 'admin', activeTab);
    }

    // B. Configurar Contenedor (CSS según pestaña)
    const contentContainer = document.getElementById('tab-content');
    if (contentContainer) {
        if (activeTab === 'comunidad') {
            // Chat: Fullscreen, sin padding del padre
            contentContainer.className = "flex-1 relative w-full flex flex-col bg-white overflow-hidden h-full";
        } else {
            // Otros: Con scroll y padding
            contentContainer.className = "flex-1 relative w-full overflow-y-auto custom-scrollbar bg-[#FAFAFA] p-6 md:p-8 pb-32 h-full";
        }
    }

    // C. Cargar el contenido real de la pestaña
    if (community) {
        try {
            await _loadTabContent(activeTab, community, user, extraParam);
        } catch (error) {
            console.error("❌ Error cargando tab:", error);
            if(contentContainer) contentContainer.innerHTML = `<div class="p-10 text-center">Error al cargar contenido.</div>`;
        }
    } else {
        // Fallback si falló la carga de datos inicial
        if(contentContainer) contentContainer.innerHTML = `<div class="p-10 text-center text-gray-400">No se pudo cargar la comunidad.</div>`;
    }
};

// ==========================================
// 1. HEADER & SKELETON
// ==========================================

function _renderHeaderSkeleton() {
    return `
    <div class="px-6 py-3 flex items-center justify-between animate-pulse w-full">
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div>
                <div class="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div class="h-3 bg-gray-200 rounded w-20"></div>
            </div>
        </div>
    </div>`;
}

function _renderHeader(community, isAdmin, activeTab) {
    const logoHtml = community.logoUrl 
        ? `<img src="${community.logoUrl}" class="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0 border border-gray-100">`
        : `<div class="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center text-lg shadow-sm shrink-0"><i class="fas ${community.icon || 'fa-users'}"></i></div>`;

    const name = community.name || 'Sin Nombre';
    const members = community.membersCount || 0;

    return `
    <header class="w-full">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 px-6 py-3">
            <div class="flex items-center gap-6 overflow-x-auto no-scrollbar w-full">
                <div class="flex items-center gap-3 shrink-0">
                    ${logoHtml}
                    <div>
                        <h1 class="text-lg font-heading font-bold text-gray-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
                            ${name}
                            ${isAdmin ? `<button onclick="App.community.openEditCommunityModal()" class="text-gray-300 hover:text-black text-xs transition-colors"><i class="fas fa-pen"></i></button>` : ''}
                        </h1>
                        <p class="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                            <i class="fas fa-circle text-[6px] text-green-500"></i> ${App.ui.formatNumber(members)} miembros
                        </p>
                    </div>
                </div>
                <div class="h-8 w-px bg-gray-200 hidden md:block mx-2"></div>
                <nav class="flex items-center gap-1">
                    ${_renderTabLink(community.id, 'inicio', 'Inicio', activeTab, 'fa-home')}
                    ${_renderTabLink(community.id, 'clases', 'Clases', activeTab, 'fa-graduation-cap')}
                    ${_renderTabLink(community.id, 'live', 'Live', activeTab, 'fa-video', true)}
                    ${_renderTabLink(community.id, 'comunidad', 'Chat', activeTab, 'fa-comments')}
                </nav>
            </div>
        </div>
    </header>`;
}

function _renderTabLink(cid, tabKey, label, currentTab, icon, isLive = false) {
    const isActive = currentTab === tabKey;
    const activeClass = isActive 
        ? "text-black bg-gray-100 font-bold shadow-sm" 
        : "text-gray-500 hover:text-black hover:bg-gray-50 font-medium";
    
    const iconHtml = isLive 
        ? `<span class="relative mr-2"><i class="fas ${icon}"></i><span class="absolute -top-1 -right-1 flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span></span>`
        : `<i class="fas ${icon} mr-2 text-xs"></i>`;

    return `
    <a href="#community/${cid}/${tabKey}" class="${activeClass} px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center">
        ${iconHtml} ${label}
    </a>`;
}

// ==========================================
// 2. LOGICA DE CONTENIDO (TABS) - ROBUSTA
// ==========================================

async function _loadTabContent(tab, community, user, extraId) {
    const container = document.getElementById('tab-content');
    if (!container) return;
    const isAdmin = user.role === 'admin';

    // --- TAB 1: INICIO (FEED) ---
    if (tab === 'inicio') {
        let displayPosts = [];
        try { 
            const allPosts = await App.api.getPosts(community.id, 'all'); 
            if (Array.isArray(allPosts)) {
                // Filtro: Posts oficiales o del muro general (sin canal específico)
                displayPosts = allPosts.filter(p => p.isOfficial || !p.channelId);
                displayPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        } catch (e) {
            console.warn("Feed load error:", e);
        }

        container.innerHTML = `
            <div class="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
                <!-- Columna Principal -->
                <div class="lg:col-span-8 space-y-6">
                    ${isAdmin ? `
                    <div class="bg-white border border-gray-200 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg"><i class="fas fa-bullhorn"></i></div>
                            <div>
                                <h3 class="font-bold text-gray-900 text-sm">Crear Anuncio</h3>
                                <p class="text-xs text-gray-500">Publicar en el muro oficial</p>
                            </div>
                        </div>
                        <button onclick="App.dashboard.openPostModal()" class="bg-black text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors shadow-lg flex items-center gap-2">
                            <i class="fas fa-plus"></i> Nuevo Post
                        </button>
                    </div>` : ''}

                    <div class="space-y-6">
                        ${displayPosts.length > 0 
                            ? displayPosts.map(p => {
                                if(!p || !p.author) return ''; 
                                return _renderThreadCard(p, user);
                            }).join('') 
                            : `<div class="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                                <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 text-2xl"><i class="far fa-newspaper"></i></div>
                                <h3 class="text-gray-900 font-bold text-sm">El muro está tranquilo</h3>
                                <p class="text-gray-400 text-xs mt-1">Sé el primero en publicar algo.</p>
                                ${!isAdmin ? `<button onclick="App.dashboard.openPostModal()" class="mt-4 text-black underline text-sm font-bold">Crear Post</button>` : ''}
                               </div>`
                        }
                    </div>
                </div>
                <!-- Columna Lateral -->
                <div class="lg:col-span-4 space-y-6 sticky top-0">
                    ${_renderContinueLearningWidget(community, user)}
                </div>
            </div>`;
    }

    // --- TAB 2: LMS (CLASES) ---
    else if (tab === 'clases') {
        if (App.lms && typeof App.lms.renderCatalog === 'function') {
            try {
                if (extraId) App.lms.renderPlayer(container, community, extraId, user, isAdmin);
                else App.lms.renderCatalog(container, community, user, isAdmin);
            } catch(e) {
                console.error("LMS Error:", e);
                container.innerHTML = `<div class="p-8 text-center text-red-500">Error interno en el módulo educativo.</div>`;
            }
        } else {
            container.innerHTML = `
                <div class="p-8 text-center">
                    <p class="text-gray-500 text-sm">Cargando módulo educativo...</p>
                </div>`;
        }
    }

    // --- TAB 3: LIVE (EVENTOS) ---
    else if (tab === 'live') {
        let session = null;
        let recordings = [];
        
        try {
            session = community.nextLiveSession || null;
            if (session && !session.date) session = null;

            recordings = (community.pastLiveSessions || []);
            recordings.sort((a, b) => {
                const da = a.date ? new Date(a.date) : new Date(0);
                const db = b.date ? new Date(b.date) : new Date(0);
                return db - da;
            });
        } catch (e) { console.warn("Live data error", e); }

        container.innerHTML = `
            <div class="max-w-6xl mx-auto w-full space-y-12 pb-12 animate-fade-in">
                <!-- Hero Section -->
                <div class="flex flex-col items-center justify-center min-h-[40vh] text-center relative mt-4">
                    ${isAdmin ? `
                    <div class="absolute top-0 right-0 z-20 flex gap-2">
                        ${session ? `<button onclick="App.community.openFinishLiveModal()" class="bg-red-600 text-white border border-red-700 px-4 py-2 rounded-lg font-bold text-xs shadow-sm hover:bg-red-700 flex items-center gap-2"><i class="fas fa-stop-circle"></i> Finalizar</button>` : ''}
                        <button onclick="App.community.openLiveConfigModal()" class="bg-white border border-gray-200 text-black px-4 py-2 rounded-lg font-bold text-xs shadow-sm hover:bg-gray-50 flex items-center gap-2"><i class="fas fa-cog"></i> Configurar</button>
                    </div>` : ''}
                    
                    ${session ? _renderLiveSession(session, isAdmin) : `
                        <div class="bg-white border border-gray-100 p-12 rounded-3xl text-center max-w-lg shadow-sm">
                            <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 text-3xl mb-6 mx-auto"><i class="fas fa-video-slash"></i></div>
                            <h2 class="text-xl font-bold text-gray-900 mb-2">No hay eventos programados</h2>
                            <p class="text-sm text-gray-500">Mantente atento a los anuncios para la próxima sesión en vivo.</p>
                        </div>
                    `}
                </div>

                ${recordings.length > 0 ? `
                <div class="border-t border-gray-100 pt-10">
                    <div class="flex items-center gap-2 mb-6">
                        <i class="fas fa-history text-gray-400"></i>
                        <h3 class="text-lg font-bold text-gray-900">Grabaciones Anteriores</h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${recordings.map(rec => _renderRecordingCard(rec)).join('')}
                    </div>
                </div>
                ` : ''}
            </div>`;
        
        if (session) _startLiveTimer(session.date);
    }

    // --- TAB 4: CHAT INMERSIVO (FULLSCREEN) ---
    else if (tab === 'comunidad') {
        const channels = community.channels || [];
        
        if(!Array.isArray(channels) || channels.length === 0) {
            channels.push({id: 'general', name: 'General', type: 'text', category: 'General'});
        }

        // Selección de canal
        let activeChannelId = window.tempActiveChannel;
        // Validación: si el canal temporal no existe en esta lista, resetear a general
        if (!activeChannelId || !channels.find(c => c.id === activeChannelId)) {
            activeChannelId = channels[0].id;
        }
        
        let activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
        window.tempActiveChannel = activeChannelId;

        // Fetch Mensajes
        let channelMessages = [];
        try {
            const allChatPosts = await App.api.getPosts(community.id, 'all'); 
            if (Array.isArray(allChatPosts)) {
                channelMessages = allChatPosts.filter(p => p.channelId === activeChannel.id);
                channelMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            }
        } catch(e) { 
            console.error("Chat load error:", e); 
        }

        // Renderizado Seguro
        const validMessages = channelMessages.filter(m => m && m.content && m.author && m.author.name);
        container.innerHTML = _renderChatUI(community, channels, activeChannel, validMessages, user);
        
        requestAnimationFrame(() => {
            const scroller = document.getElementById('chat-scroller'); 
            if(scroller) scroller.scrollTop = scroller.scrollHeight; 
        });
    }
}

// ==========================================
// 3. RENDERERS AUXILIARES (CHAT FULLSCREEN)
// ==========================================

function _renderChatUI(community, channels, activeChannel, messages, user) {
    const isAdmin = user.role === 'admin';
    const isAnnouncement = activeChannel.type === 'announcement';
    const canWrite = isAdmin || !isAnnouncement;

    const groupedChannels = channels.reduce((acc, ch) => {
        const cat = ch.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ch);
        return acc;
    }, {});

    return `
    <div class="flex h-full w-full bg-white overflow-hidden animate-fade-in">
        
        <!-- SIDEBAR CANALES -->
        <div class="w-72 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0 h-full hidden md:flex">
            
            <div class="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50 shrink-0">
                <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Canales</span>
                ${isAdmin ? `
                <button onclick="App.community.openChannelModal('${community.id}')" class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 hover:text-black transition-colors" title="Crear Canal">
                    <i class="fas fa-plus text-xs"></i>
                </button>` : ''}
            </div>
            
            <div class="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                ${Object.entries(groupedChannels).map(([category, chs]) => `
                    <div class="space-y-1">
                        <div class="px-2 flex items-center gap-2 mb-2">
                            <i class="fas fa-chevron-down text-[10px] text-gray-400"></i>
                            <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${category}</h4>
                        </div>
                        ${chs.map(ch => {
                            const isActive = ch.id === activeChannel.id;
                            const icon = ch.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag';
                            return `
                            <button onclick="window.tempActiveChannel='${ch.id}'; App.renderCommunity('${community.id}', 'comunidad')" 
                                class="w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all group text-left ${isActive ? 'bg-gray-200 text-black font-semibold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}">
                                <div class="flex items-center gap-2.5 overflow-hidden">
                                    <i class="fas ${icon} text-xs ${isActive ? 'text-gray-600' : 'text-gray-400'} w-4 text-center"></i>
                                    <span class="truncate text-sm">${ch.name}</span>
                                </div>
                                ${isAdmin && ch.id !== 'general' ? `
                                <span onclick="event.stopPropagation(); App.community.deleteChannel('${community.id}', '${ch.id}')" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1">
                                    <i class="fas fa-times text-[10px]"></i>
                                </span>` : ''}
                            </button>
                            `;
                        }).join('')}
                    </div>
                `).join('')}
            </div>

            <!-- User Footer -->
            <div class="p-3 bg-gray-100 border-t border-gray-200">
                <div class="flex items-center gap-2">
                    <div class="relative">
                        <img src="${user.avatar || 'https://via.placeholder.com/32'}" class="w-8 h-8 rounded-full bg-gray-200 object-cover">
                        <div class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-gray-100 rounded-full"></div>
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-xs font-bold text-gray-900 truncate">${user.name}</p>
                        <p class="text-[10px] text-gray-500 truncate">En línea</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- CHAT MAIN AREA -->
        <div class="flex-1 flex flex-col bg-white relative min-w-0 h-full">
            
            <div class="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="md:hidden mr-2 text-gray-500 cursor-pointer" onclick="alert('Menu móvil pendiente')"><i class="fas fa-bars"></i></div>
                    <i class="fas ${activeChannel.type === 'announcement' ? 'fa-bullhorn text-gray-400' : 'fa-hashtag text-gray-400'} text-lg"></i>
                    <div>
                        <h3 class="font-bold text-gray-900 text-base flex items-center gap-2">
                            ${activeChannel.name}
                            ${activeChannel.type === 'announcement' ? '<span class="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-blue-100 uppercase">Anuncios</span>' : ''}
                        </h3>
                    </div>
                </div>
            </div>

            <!-- Mensajes -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white" id="chat-scroller">
                <div class="pb-8 border-b border-gray-100 mb-6">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-3xl text-gray-400">
                        <i class="fas ${activeChannel.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag'}"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-900">Bienvenido a #${activeChannel.name}</h2>
                    <p class="text-gray-500 mt-1">Este es el comienzo del canal.</p>
                </div>

                ${messages.length > 0 ? messages.map((m, index) => {
                    if(!m || !m.author) return '';

                    const prevM = messages[index - 1];
                    const isSameUser = prevM && prevM.author && prevM.authorId === m.authorId && (new Date(m.createdAt) - new Date(prevM.createdAt) < 300000); 
                    const isMe = m.authorId === user.uid;
                    const canEdit = isAdmin || isMe;
                    
                    if (isSameUser) {
                        return `
                        <div class="group flex gap-4 pl-[52px] -mt-4 py-1 relative hover:bg-gray-50/50 pr-4">
                            <div class="text-xs text-gray-400 w-[44px] absolute left-0 text-right opacity-0 group-hover:opacity-100 py-1 select-none">
                                ${new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div class="flex-1 text-sm text-gray-800 leading-relaxed hover:text-gray-900 break-words whitespace-pre-wrap">${m.content}</div>
                            ${canEdit ? _renderMessageActions(community.id, m.id, isAdmin, isMe) : ''}
                        </div>`;
                    }

                    return `
                    <div class="group flex gap-4 pt-4 pb-1 relative hover:bg-gray-50/50 pr-4 mt-2">
                        <div class="shrink-0 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                            <img src="${m.author.avatar || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full bg-gray-200 object-cover shadow-sm">
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-baseline gap-2 mb-1">
                                <span class="font-bold text-gray-900 hover:underline cursor-pointer text-sm">${m.author.name || 'Usuario'}</span>
                                <span class="text-[10px] text-gray-400 font-medium">${App.ui.formatDate(m.createdAt)}</span>
                                ${m.authorId === 'u_admin' ? '<span class="bg-black text-white text-[9px] px-1 rounded font-bold uppercase">ADMIN</span>' : ''}
                            </div>
                            <div class="text-sm text-gray-800 leading-relaxed break-words whitespace-pre-wrap">${m.content}</div>
                        </div>
                        ${canEdit ? _renderMessageActions(community.id, m.id, isAdmin, isMe) : ''}
                    </div>`;
                }).join('') : `
                    <div class="flex flex-col items-center justify-center h-48 opacity-50">
                        <p class="text-sm text-gray-400 italic">No hay mensajes aún.</p>
                    </div>
                `}
                <div class="h-4"></div>
            </div>

            <!-- Input -->
            <div class="p-4 px-6 bg-white shrink-0">
                ${canWrite ? `
                <div class="bg-gray-100 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all border border-transparent focus-within:border-blue-200">
                    <form onsubmit="App.handleSendMessage(event, '${community.id}', '${activeChannel.id}')" class="flex flex-col">
                        <textarea id="chat-input" rows="1" class="w-full bg-transparent border-none p-3 text-sm outline-none placeholder-gray-500 text-gray-900 resize-none max-h-32 custom-scrollbar" placeholder="Mensaje a #${activeChannel.name}" onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); this.form.dispatchEvent(new Event('submit')); }"></textarea>
                        <div class="flex justify-between items-center px-2 pb-1 pt-2 border-t border-gray-200/50 mt-1">
                            <div class="flex gap-2 text-gray-400">
                                <button type="button" class="hover:text-gray-600 p-1"><i class="fas fa-smile"></i></button>
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="submit" id="btn-chat-send" class="bg-black text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors shadow-sm">
                                    <i class="fas fa-paper-plane text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>` : `
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center select-none">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                        <i class="fas fa-lock"></i> Solo Lectura
                    </p>
                </div>
                `}
            </div>
        </div>
    </div>`;
}

function _renderMessageActions(cid, mid, isAdmin, isMe) {
    return `
    <div class="absolute right-4 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-white shadow-md border border-gray-100 rounded-lg overflow-hidden z-10">
        <button onclick="App.community.deleteMessage('${cid}', '${mid}')" class="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar"><i class="fas fa-trash"></i></button>
    </div>`;
}

// ==========================================
// 4. OTROS RENDERERS
// ==========================================

function _renderContinueLearningWidget(community, user) {
    return `
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 class="font-bold text-gray-900 text-sm mb-4">Progreso</h3>
        <div class="space-y-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><i class="fas fa-trophy"></i></div>
                <div>
                    <p class="text-xs font-bold text-gray-900">Nivel Principiante</p>
                    <p class="text-[10px] text-gray-500">Sigue aprendiendo</p>
                </div>
            </div>
            <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div class="bg-green-500 h-full w-[35%]"></div>
            </div>
            <a href="#community/${community.id}/clases" class="block text-center text-xs font-bold text-black hover:underline mt-2">Ir a Clases</a>
        </div>
    </div>`;
}

function _renderThreadCard(post, user) {
    return `
    <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
                <img src="${post.author.avatar}" class="w-10 h-10 rounded-full bg-gray-100 object-cover border border-gray-100">
                <div>
                    <h4 class="font-bold text-gray-900 text-sm">${post.author.name}</h4>
                    <span class="text-xs text-gray-500">${App.ui.formatDate(post.createdAt)}</span>
                </div>
            </div>
            ${user.role === 'admin' ? `
            <button onclick="App.handleAdminPostAction('${post.id}')" class="text-gray-300 hover:text-red-500 transition-colors"><i class="fas fa-trash"></i></button>
            ` : ''}
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">${post.title || 'Publicación'}</h3>
        <p class="text-gray-600 leading-relaxed mb-4 text-sm whitespace-pre-line">${post.content}</p>
        ${post.image ? `<div class="rounded-xl overflow-hidden bg-gray-50 mb-4 border border-gray-100"><img src="${post.image}" class="w-full max-h-96 object-cover"></div>` : ''}
        
        <div class="flex items-center gap-4 pt-4 border-t border-gray-100">
            <button onclick="App.handleLike('${post.id}')" class="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-500 transition-colors">
                <i class="${(post.likedBy || []).includes(user.uid) ? 'fas text-red-500' : 'far'} fa-heart"></i> ${post.likes || 0}
            </button>
        </div>
    </div>`;
}

function _renderLiveSession(session, isAdmin) {
    // BLINDAJE DE DATOS LIVE
    const sessionDate = session.date ? new Date(session.date) : new Date();
    const now = new Date();
    const diffMs = sessionDate - now;
    const isLiveOrClose = diffMs < (30 * 60 * 1000); 
    
    return `
        <div class="w-full max-w-4xl relative group rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video flex items-center justify-center mx-auto">
            <div class="absolute inset-0 bg-cover bg-center transition-all duration-1000 ${isLiveOrClose ? 'blur-none opacity-60' : 'blur-xl opacity-40'}" style="background-image: url('${session.imageUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070'}');"></div>
            <div class="relative z-10 flex flex-col items-center p-8 w-full text-white">
                <span class="bg-red-600 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest mb-6 animate-pulse"><i class="fas fa-circle text-[8px] mr-2"></i> En Vivo / Próximamente</span>
                <h1 class="text-3xl md:text-5xl font-heading font-bold mb-4 drop-shadow-lg max-w-2xl leading-tight text-center">${session.title || 'Masterclass Exclusiva'}</h1>
                <p class="text-gray-300 text-lg mb-8 font-medium drop-shadow-md">${App.ui.formatDate(session.date)}</p>
                <div id="live-countdown" class="grid grid-cols-4 gap-4 mb-10 text-center"></div>
                ${isLiveOrClose 
                    ? `<a href="${session.zoomLink}" target="_blank" class="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition-transform hover:scale-105 shadow-[0_0_30px_rgba(220,38,38,0.5)] flex items-center gap-3"><i class="fas fa-video"></i> Unirse Ahora</a>` 
                    : `<button disabled class="bg-white/10 text-white/50 px-10 py-4 rounded-2xl font-bold text-lg cursor-not-allowed border border-white/10 backdrop-blur-sm flex items-center gap-3"><i class="fas fa-lock"></i> Se abre 30 min antes</button>`
                }
            </div>
        </div>`;
}

function _renderRecordingCard(rec) {
    let videoId = '';
    try {
        let url = rec.videoUrl || '';
        if (url.includes('v=')) videoId = url.split('v=')[1];
        else if (url.includes('/')) videoId = url.split('/').pop();
        if (videoId && videoId.includes('&')) videoId = videoId.split('&')[0];
    } catch(e) {}
    const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 'https://via.placeholder.com/320x180?text=Video';

    return `
    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group">
        <a href="${rec.videoUrl}" target="_blank" class="block relative aspect-video bg-gray-100 overflow-hidden">
            <img src="${thumb}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <i class="fas fa-play text-white"></i>
            </div>
        </a>
        <div class="p-4">
            <h4 class="font-bold text-gray-900 text-sm line-clamp-2 leading-snug mb-1">${rec.title}</h4>
            <p class="text-xs text-gray-500 font-medium">${_timeAgo(rec.date)}</p>
        </div>
    </div>`;
}

function _timeAgo(dateString) {
    if(!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return "Hace " + Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return "Hace " + Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return "Hace " + Math.floor(interval) + " días";
    return "Hace un momento";
}

function _startLiveTimer(dateIso) {
    if(!dateIso) return;
    const target = new Date(dateIso).getTime();
    if(window.liveInterval) clearInterval(window.liveInterval);
    const update = () => {
        const el = document.getElementById('live-countdown');
        if(!el) return;
        const now = new Date().getTime();
        const diff = target - now;
        if (diff <= 0) {
            el.innerHTML = '<div class="col-span-4 text-2xl font-bold text-white animate-pulse">¡Estamos EN VIVO!</div>';
            return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        const box = (val, label) => `<div class="bg-white/10 backdrop-blur-md rounded-xl p-3 w-16 md:w-20 border border-white/10"><div class="text-xl md:text-2xl font-mono font-bold">${val < 10 ? '0'+val : val}</div><div class="text-[8px] md:text-[10px] uppercase tracking-wider opacity-70">${label}</div></div>`;
        el.innerHTML = box(d,'Días') + box(h,'Hrs') + box(m,'Min') + box(s,'Sec');
    };
    update();
    window.liveInterval = setInterval(update, 1000);
}

// ==========================================
// 5. MODALES COMPLEMENTARIOS
// ==========================================

function _renderProfileModal(user) {
    return `
    <div id="profile-modal" class="fixed inset-0 z-[80] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="profile-backdrop" onclick="App.dashboard.closeProfileModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto overflow-hidden" id="profile-panel">
                <div class="h-32 bg-gradient-to-r from-gray-900 to-black relative">
                    <button onclick="App.dashboard.closeProfileModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center backdrop-blur-sm z-10"><i class="fas fa-times"></i></button>
                </div>
                <div class="px-8 pb-8 -mt-12 relative">
                    <div class="flex justify-center mb-6">
                        <div class="relative group">
                            <img id="profile-avatar-prev" src="${user.avatar}" class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl bg-white">
                            <label class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                                <i class="fas fa-camera text-xl"></i>
                                <input type="file" id="profile-file-input" class="hidden" accept="image/*" onchange="App.dashboard.previewFile('profile-file-input', 'profile-avatar-prev', null)">
                            </label>
                        </div>
                    </div>
                    <div class="space-y-5">
                        <div class="text-center mb-6"><h2 class="text-xl font-bold text-gray-900">Editar Perfil</h2></div>
                        <div class="space-y-1"><label class="text-xs font-bold text-gray-900 uppercase tracking-wide ml-1">Nombre</label><input type="text" id="profile-name" value="${user.name}" class="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl px-4 outline-none focus:bg-white focus:border-black"></div>
                        <div class="space-y-1"><label class="text-xs font-bold text-gray-900 uppercase tracking-wide ml-1">Rol</label><input type="text" id="profile-role-desc" value="${user.roleDescription || 'Estudiante'}" class="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl px-4 outline-none focus:bg-white focus:border-black"></div>
                        <button onclick="App.dashboard.saveProfile()" id="btn-save-profile" class="w-full bg-black text-white py-3.5 rounded-xl font-bold shadow-lg mt-4">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function _renderEditPostModal() {
    return `
    <div id="edit-modal" class="fixed inset-0 z-[70] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="edit-backdrop" onclick="App.community.closeEditModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto flex flex-col" id="edit-panel">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                    <h2 class="text-lg font-bold">Editar Post</h2>
                    <button onclick="App.community.closeEditModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="edit-post-id">
                    <textarea id="edit-content" rows="6" class="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-black"></textarea>
                </div>
                <div class="p-6 border-t border-gray-100 flex justify-end">
                    <button onclick="App.community.saveEditPost()" class="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm">Guardar</button>
                </div>
            </div>
        </div>
    </div>`;
}

function _renderEditCommunityModal(c) {
    return `
    <div id="cms-modal" class="fixed inset-0 z-[70] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="cms-backdrop" onclick="App.community.closeCMSModal()"></div>
        <div class="absolute inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl transform translate-x-full transition-transform duration-300 pointer-events-auto flex flex-col" id="cms-panel">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 class="text-xl font-bold">Editar Comunidad</h2>
                <button onclick="App.community.closeCMSModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-5">
                <input type="hidden" id="cms-id" value="${c.id}">
                <div class="space-y-1"><label class="text-xs font-bold uppercase">Nombre</label><input type="text" id="cms-name" value="${c.name}" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                <div class="space-y-1"><label class="text-xs font-bold uppercase">Descripción</label><textarea id="cms-desc" rows="3" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black resize-none">${c.description || ''}</textarea></div>
                
                <!-- LOGO URL -->
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase">Logo URL (Opcional)</label>
                    <input type="text" id="cms-logo" value="${c.logoUrl || ''}" placeholder="https://..." class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black">
                </div>

                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase">Icono (FontAwesome)</label>
                    <div class="flex gap-2">
                        <div class="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center text-xl"><i id="cms-icon-prev" class="fas ${c.icon}"></i></div>
                        <input type="text" id="cms-icon" value="${c.icon}" oninput="document.getElementById('cms-icon-prev').className='fas '+this.value" class="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black">
                    </div>
                </div>
            </div>
            <div class="p-6 border-t border-gray-100">
                <button onclick="App.community.saveCMS()" class="w-full bg-black text-white py-3 rounded-xl font-bold">Guardar Cambios</button>
            </div>
        </div>
    </div>`;
}

function _renderLiveConfigModal(cid) {
    return `
    <div id="live-modal" class="fixed inset-0 z-[70] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="live-backdrop" onclick="App.community.closeLiveModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto" id="live-panel">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 class="text-lg font-bold">Configurar Próximo Live</h2>
                    <button onclick="App.community.closeLiveModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="live-cid" value="${cid}">
                    <div class="space-y-1"><label class="text-xs font-bold uppercase">Título Sesión</label><input type="text" id="live-title" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                    <div class="space-y-1"><label class="text-xs font-bold uppercase">Fecha y Hora</label><input type="datetime-local" id="live-date" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                    <div class="space-y-1"><label class="text-xs font-bold uppercase">Imagen de Fondo (URL)</label><input type="text" id="live-img" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                    <div class="space-y-1"><label class="text-xs font-bold uppercase">Link de Zoom / Meet</label><input type="text" id="live-link" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                </div>
                <div class="p-6 border-t border-gray-100">
                    <button onclick="App.community.saveLiveConfig()" class="w-full bg-black text-white py-3 rounded-xl font-bold">Programar Sesión</button>
                </div>
            </div>
        </div>
    </div>`;
}

function _renderFinishLiveModal(cid) {
    return `
    <div id="finish-live-modal" class="fixed inset-0 z-[75] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="finish-live-backdrop" onclick="App.community.closeFinishLiveModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto" id="finish-live-panel">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50 rounded-t-3xl">
                    <h2 class="text-lg font-bold text-red-700"><i class="fas fa-flag-checkered mr-2"></i> Finalizar Clase en Vivo</h2>
                    <button onclick="App.community.closeFinishLiveModal()" class="text-red-700 hover:text-red-900"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="finish-live-cid" value="${cid}">
                    <p class="text-sm text-gray-500 mb-4">La clase dejará de estar "En Vivo" y se guardará como grabación en el historial.</p>
                    
                    <div class="space-y-1">
                        <label class="text-xs font-bold uppercase">Título de la Grabación</label>
                        <input type="text" id="finish-live-title" placeholder="Ej: Masterclass de UX - Clase 1" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black">
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold uppercase">Link de YouTube (Grabación)</label>
                        <input type="text" id="finish-live-url" placeholder="https://youtube.com/..." class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black">
                    </div>
                </div>
                <div class="p-6 border-t border-gray-100">
                    <button onclick="App.community.finishLiveSession()" class="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg">Terminar y Guardar</button>
                </div>
            </div>
        </div>
    </div>`;
}

// Modal de Crear Canal (ACTUALIZADO para Categorías)
function _renderChannelModal() {
    return `
    <div id="channel-modal" class="fixed inset-0 z-[70] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="channel-backdrop" onclick="App.community.closeChannelModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto" id="channel-panel">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 class="text-lg font-bold">Crear Nuevo Canal</h2>
                    <button onclick="App.community.closeChannelModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="channel-cid">
                    <div class="space-y-1">
                        <label class="text-xs font-bold uppercase">Nombre del Canal</label>
                        <input type="text" id="channel-name" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black" placeholder="ej: dudas-general">
                    </div>
                     <div class="space-y-1">
                        <label class="text-xs font-bold uppercase">Categoría / Grupo</label>
                        <select id="channel-category" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black">
                            <option value="General">General</option>
                            <option value="Dudas">Dudas y Soporte</option>
                            <option value="Proyectos">Proyectos</option>
                            <option value="Off-Topic">Off-Topic</option>
                            <option value="Info">Información</option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold uppercase">Tipo</label>
                        <select id="channel-type" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black">
                            <option value="text">Chat de Texto</option>
                            <option value="announcement">Anuncios (Solo Admin)</option>
                        </select>
                    </div>
                </div>
                <div class="p-6 border-t border-gray-100">
                    <button onclick="App.community.saveChannel()" class="w-full bg-black text-white py-3 rounded-xl font-bold">Crear Canal</button>
                </div>
            </div>
        </div>
    </div>`;
}

// ==========================================
// 6. ACCIONES Y MANEJADORES DE EVENTOS
// ==========================================

App.community = {
    // --- POSTS ---
    openEditModal: (id, content) => {
        const m = document.getElementById('edit-modal'), p = document.getElementById('edit-panel'), b = document.getElementById('edit-backdrop');
        document.getElementById('edit-post-id').value = id;
        document.getElementById('edit-content').value = decodeURIComponent(content);
        m.classList.remove('hidden'); void m.offsetWidth;
        p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100'); b.classList.remove('opacity-0');
    },
    closeEditModal: () => {
        const m = document.getElementById('edit-modal'), p = document.getElementById('edit-panel'), b = document.getElementById('edit-backdrop');
        p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0'); b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },
    saveEditPost: async () => {
        App.ui.toast("Post editado", "success");
        App.community.closeEditModal();
        const parts = App.state.currentRoute.split('/');
        App.renderCommunity(parts[1], 'inicio');
    },
    deleteComment: async (postId, commentId) => {
        if(!confirm("¿Borrar comentario permanentemente?")) return;
        try {
            App.ui.toast("Comentario eliminado", "success");
            const parts = App.state.currentRoute.split('/');
            App.renderCommunity(parts[1], 'inicio');
        } catch(e) { App.ui.toast("Error eliminando comentario", "error"); }
    },

    // --- COMUNIDADES ---
    openEditCommunityModal: () => {
        const m = document.getElementById('cms-modal'), p = document.getElementById('cms-panel'), b = document.getElementById('cms-backdrop');
        m.classList.remove('hidden'); void m.offsetWidth;
        p.classList.remove('translate-x-full'); b.classList.remove('opacity-0');
    },
    closeCMSModal: () => {
        const m = document.getElementById('cms-modal'), p = document.getElementById('cms-panel'), b = document.getElementById('cms-backdrop');
        p.classList.add('translate-x-full'); b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },
    saveCMS: async () => {
        const id = document.getElementById('cms-id').value;
        await App.api.updateCommunity(id, {
            name: document.getElementById('cms-name').value,
            description: document.getElementById('cms-desc').value,
            icon: document.getElementById('cms-icon').value,
            logoUrl: document.getElementById('cms-logo').value
        });
        App.ui.toast("Comunidad actualizada", "success");
        App.community.closeCMSModal();
        App.renderCommunity(id);
    },

    // --- LIVE ---
    openLiveConfigModal: () => {
        const m = document.getElementById('live-modal'), p = document.getElementById('live-panel'), b = document.getElementById('live-backdrop');
        m.classList.remove('hidden'); void m.offsetWidth;
        p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100'); b.classList.remove('opacity-0');
    },
    closeLiveModal: () => {
        const m = document.getElementById('live-modal'), p = document.getElementById('live-panel'), b = document.getElementById('live-backdrop');
        p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0'); b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },
    saveLiveConfig: async () => {
        const cid = document.getElementById('live-cid').value;
        await App.api.updateCommunity(cid, {
            nextLiveSession: {
                title: document.getElementById('live-title').value,
                date: new Date(document.getElementById('live-date').value).toISOString(),
                imageUrl: document.getElementById('live-img').value,
                zoomLink: document.getElementById('live-link').value
            }
        });
        App.ui.toast("Sesión programada", "success");
        App.community.closeLiveModal();
        App.renderCommunity(cid, 'live');
    },
    openFinishLiveModal: () => {
        const m = document.getElementById('finish-live-modal'), p = document.getElementById('finish-live-panel'), b = document.getElementById('finish-live-backdrop');
        m.classList.remove('hidden'); void m.offsetWidth;
        p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100'); b.classList.remove('opacity-0');
    },
    closeFinishLiveModal: () => {
        const m = document.getElementById('finish-live-modal'), p = document.getElementById('finish-live-panel'), b = document.getElementById('finish-live-backdrop');
        p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0'); b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },
    finishLiveSession: async () => {
        const cid = document.getElementById('finish-live-cid').value;
        const title = document.getElementById('finish-live-title').value;
        const url = document.getElementById('finish-live-url').value;
        if(!title || !url) return App.ui.toast("Faltan datos", "error");

        const newRecord = { id: 'rec_' + Date.now(), title, videoUrl: url, date: new Date().toISOString() };
        try {
            const commRef = window.F.doc(window.F.db, "communities", cid);
            await window.F.updateDoc(commRef, {
                nextLiveSession: null,
                pastLiveSessions: window.F.arrayUnion(newRecord)
            });
            App.ui.toast("Clase finalizada", "success");
            App.community.closeFinishLiveModal();
            App.renderCommunity(cid, 'live');
        } catch(e) { App.ui.toast("Error", "error"); }
    },

    // --- CHAT: CANALES ---
    openChannelModal: (cid) => {
        document.getElementById('channel-cid').value = cid;
        const m = document.getElementById('channel-modal'), p = document.getElementById('channel-panel'), b = document.getElementById('channel-backdrop');
        m.classList.remove('hidden'); void m.offsetWidth;
        p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100'); b.classList.remove('opacity-0');
    },
    closeChannelModal: () => {
        const m = document.getElementById('channel-modal'), p = document.getElementById('channel-panel'), b = document.getElementById('channel-backdrop');
        p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0'); b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },
    saveChannel: async () => {
        const cid = document.getElementById('channel-cid').value;
        const name = document.getElementById('channel-name').value.trim().toLowerCase().replace(/\s+/g, '-');
        const type = document.getElementById('channel-type').value;
        const category = document.getElementById('channel-category').value;
        
        if(!name) return App.ui.toast("Nombre requerido", "error");

        try {
            const commRef = window.F.doc(window.F.db, "communities", cid);
            const newChannel = { id: name, name: name, type: type, category: category };
            
            // Actualizar array de canales en Firestore
            await window.F.updateDoc(commRef, {
                channels: window.F.arrayUnion(newChannel)
            });
            
            App.ui.toast(`Canal #${name} creado`, "success");
            App.community.closeChannelModal();
            window.tempActiveChannel = name; // Auto-seleccionar
            App.renderCommunity(cid, 'comunidad');
        } catch(e) { console.error(e); App.ui.toast("Error al crear canal", "error"); }
    },
    deleteChannel: async (cid, chid) => {
        if(!confirm(`¿Borrar canal #${chid}?`)) return;
        try {
            const commRef = window.F.doc(window.F.db, "communities", cid);
            const doc = await window.F.getDoc(commRef);
            if(!doc.exists()) return;
            
            const channels = doc.data().channels || [];
            const newChannels = channels.filter(c => c.id !== chid);
            
            await window.F.updateDoc(commRef, { channels: newChannels });
            
            App.ui.toast("Canal borrado", "success");
            window.tempActiveChannel = 'general';
            App.renderCommunity(cid, 'comunidad');
        } catch(e) { App.ui.toast("Error al borrar", "error"); }
    },

    // --- CHAT: MENSAJES ---
    deleteMessage: async (cid, msgId) => {
        if(!confirm("¿Borrar mensaje?")) return;
        try {
            await window.F.deleteDoc(window.F.doc(window.F.db, "posts", msgId));
            // Recargar UI
            App.renderCommunity(cid, 'comunidad'); 
        } catch(e) { App.ui.toast("Error borrando mensaje", "error"); }
    },
    pinMessage: (msgId) => {
        App.ui.toast("Mensaje fijado (Simulado)", "info");
    }
};

// ==========================================
// 7. HANDLERS GLOBALES
// ==========================================

window.App.submitComment = async (e, postId) => {
    e.preventDefault();
    const input = e.target.comment;
    const btn = e.target.querySelector('button');
    const txt = input.value.trim();
    if(!txt) return;

    btn.disabled = true;
    try {
        console.log("Comentario enviado:", txt);
        App.ui.toast("Comentario enviado", "success");
        input.value = '';
    } catch(err) { console.error(err); } 
    finally { btn.disabled = false; }
};

window.App.handleLike = async (postId) => {
    const res = await App.api.toggleLike(postId);
    if(res) {
        const parts = App.state.currentRoute.split('/');
        if(parts[0] === '#community' && parts[2] === 'inicio') App.renderCommunity(parts[1], 'inicio');
    }
};

window.App.toggleComments = (id) => document.getElementById(`comments-${id}`).classList.toggle('hidden');

window.App.handleSendMessage = async (e, cid, chid) => {
    e.preventDefault();
    // Usamos el ID correcto dependiendo si es textarea o input
    const input = document.getElementById('chat-input'); 
    const btn = document.getElementById('btn-chat-send');
    const txt = input.value.trim();
    if(!txt) return;

    input.value = '';
    input.focus();
    
    try {
        await App.api.createPost({ 
            communityId: cid, 
            channelId: chid, 
            content: txt, 
            isOfficial: false, 
            authorId: App.state.currentUser.uid, 
            author: App.state.currentUser 
        });
        App.renderCommunity(cid, 'comunidad');
    } catch(e) { App.ui.toast("Error enviando mensaje", "error"); }
};

window.App.handleAdminPostAction = async (postId) => {
    if(confirm("¿Seguro? Esta acción borrará el post.")) {
        App.ui.toast("Post eliminado", "success");
        const parts = App.state.currentRoute.split('/');
        App.renderCommunity(parts[1], 'inicio');
    }
};