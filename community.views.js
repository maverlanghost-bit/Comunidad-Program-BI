/**
 * community.views.js (V38.3 - GOLD MASTER INTEGRATED)
 * Motor de Vistas de Comunidad Interna.
 * * VERSIÓN DEFINITIVA V38.3:
 * - INTEGRIDAD: Código 100% completo. No falta ninguna función V34.
 * - ADMIN: Incluye Modal de Edición (Precio/Pagos) + Configuración Live + Canales.
 * - SOCIAL: Feed, Comentarios, Likes, Chat en tiempo real y Moderación.
 * - LIVE: Cuenta regresiva y gestión de eventos.
 */

window.App = window.App || {};
window.App.community = window.App.community || {};

// ============================================================================
// 0. CONFIGURACIÓN E INICIALIZACIÓN
// ============================================================================

// Cargar API YouTube (Singleton para Live Center)
if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Estado Local de la Vista
window.App.currentFeed = []; 
window.liveInterval = null; 
window.App.communityState = {
    isEditing: false,
    editingPostId: null
};

// ============================================================================
// 1. RENDERIZADOR PRINCIPAL (ROUTER INTERNO)
// ============================================================================

window.App.renderCommunity = async (communityId, activeTab = 'inicio', extraParam = null) => {
    const user = App.state.currentUser;
    const cid = communityId || (window.location.hash.split('/')[1]);

    // Validación de Sesión
    if (!user) { window.location.hash = '#comunidades'; return; }

    // 1. Cargar Datos (Estrategia: Cache-First + Network Fallback)
    let community = App.state.cache.communities[cid];
    if (!community) {
        try {
            community = await App.api.getCommunityById(cid);
            if (!community) throw new Error("Comunidad no encontrada");
            App.state.cache.communities[cid] = community;
        } catch (e) {
            return App.render(`
                <div class="h-screen flex items-center justify-center flex-col text-center bg-[#F8FAFC] dark:bg-[#020617]">
                    <div class="text-6xl mb-4 text-slate-300">💔</div>
                    <h2 class="text-xl font-bold text-slate-900 dark:text-white">Comunidad no disponible</h2>
                    <button onclick="window.location.hash='#comunidades'" class="mt-4 text-[#1890ff] hover:underline font-bold">Volver al catálogo</button>
                </div>
            `);
        }
    }

    // 2. Renderizar Estructura Base (Solo si cambia el contexto o es render inicial)
    const root = document.getElementById('community-root');
    const currentCid = root ? root.dataset.cid : null;
    const isNewRender = currentCid !== cid;

    // Renderizar Sidebar Global (Pasamos el ID de la comunidad para que se marque activo)
    const sidebarHTML = App.sidebar && App.sidebar.render ? App.sidebar.render(cid) : '';

    if (isNewRender) {
        // LAYOUT PRINCIPAL
        await App.render(`
            ${sidebarHTML}
            
            <main class="app-layout min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300 flex flex-col relative" id="community-root" data-cid="${cid}">
                
                <!-- Header Sticky -->
                <div id="comm-header-wrapper" class="sticky top-0 z-40 w-full bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-800 transition-colors shadow-sm">
                    ${_renderCommunityHeader(community, activeTab, user)}
                </div>
                
                <!-- Contenido Dinámico -->
                <div id="community-content" class="flex-1 w-full animate-fade-in relative z-0">
                    <div class="p-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-[#1890ff]"></i></div>
                </div>

            </main>
            
            <!-- Contenedor de Modales (Inyección Lazy) -->
            <div id="comm-modals-container"></div>
        `);
        
        // Inyectar TODOS los modales (Post, Live, Channels, Edit Community)
        _injectModals(community, user);
    } else {
        // Actualización ligera: Solo tabs del header
        const headerWrapper = document.getElementById('comm-header-wrapper');
        if (headerWrapper) {
            headerWrapper.innerHTML = _renderCommunityHeader(community, activeTab, user);
        }
    }

    // 3. Cargar Contenido Específico (Routing Interno por Tabs)
    const container = document.getElementById('community-content');
    
    // Limpieza de intervalos previos (Live Timer)
    if (window.liveInterval) { clearInterval(window.liveInterval); window.liveInterval = null; }

    // Reset scroll si cambiamos de tab (UX)
    if(container) container.scrollTop = 0;

    switch (activeTab) {
        case 'inicio':
        case 'comunidad': // Alias legacy
            container.className = "flex-1 w-full max-w-[1600px] mx-auto animate-fade-in relative z-0 p-4 md:p-8 pb-32";
            await _renderFeedTab(container, community, user);
            break;
            
        case 'clases':
            // Layout especial para Aula (Full Width o Container según vista)
            container.className = "flex-1 w-full h-full animate-fade-in relative z-0 overflow-hidden";
            if (App.lms) {
                if (extraParam) {
                    // Vista Player (Video)
                    App.lms.renderPlayer(container, community, extraParam, user, user.role === 'admin');
                } else {
                    // Vista Catálogo
                    App.lms.renderCatalog(container, community, user, user.role === 'admin');
                }
            } else {
                container.innerHTML = `<div class="p-20 text-center text-slate-400">Módulo de Aula no cargado.</div>`;
            }
            break;
            
        case 'live':
            container.className = "flex-1 w-full max-w-[1600px] mx-auto animate-fade-in relative z-0 p-4 md:p-8";
            await _renderLiveTab(container, community, user);
            break;
            
        case 'chat':
            // Layout Full Height para Chat (Sin scroll global del body)
            container.className = "flex-1 w-full h-[calc(100vh-140px)] md:h-[calc(100vh-72px-64px)] animate-fade-in relative z-0 flex flex-col bg-white dark:bg-[#0f172a]";
            await _renderChatTab(container, community, user);
            break;
            
        case 'miembros':
            container.className = "flex-1 w-full max-w-[1600px] mx-auto animate-fade-in relative z-0 p-8";
            container.innerHTML = `
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border-2 border-dashed border-gray-200 dark:border-slate-800">
                    <div class="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-[#1890ff]">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Directorio de Miembros</h3>
                    <p class="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Próximamente podrás ver y conectar con los ${community.membersCount} estudiantes de esta comunidad.</p>
                </div>`;
            break;
            
        default:
            await _renderFeedTab(container, community, user);
    }
};

// ============================================================================
// 2. COMPONENTES VISUALES: HEADER & SETTINGS
// ============================================================================

function _renderCommunityHeader(c, activeTab, user) {
    const isMember = (user.joinedCommunities || []).includes(c.id);
    const isAdmin = user.role === 'admin';

    // Clases de utilidad para Tabs
    const tabInactive = "text-slate-500 dark:text-slate-400 hover:text-[#1890ff] hover:bg-gray-50 dark:hover:bg-slate-800/50 font-bold border-b-2 border-transparent transition-all";
    const tabActive = "text-[#1890ff] font-bold border-b-2 border-[#1890ff] bg-blue-50/50 dark:bg-blue-900/10";

    const getTabClass = (tabName) => {
        if (activeTab === 'comunidad' && tabName === 'inicio') return tabActive;
        return activeTab === tabName ? tabActive : tabInactive;
    };

    return `
        <div class="max-w-[1600px] mx-auto px-4 lg:px-8">
            
            <!-- Top Bar: Info + Acciones -->
            <div class="h-20 flex items-center justify-between">
                
                <!-- Info Izquierda -->
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1890ff] to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                        <i class="fas ${c.icon || 'fa-users'} text-xl"></i>
                    </div>
                    <div class="min-w-0">
                        <h1 class="font-heading font-black text-xl text-slate-900 dark:text-white leading-tight truncate flex items-center gap-2">
                            ${c.name}
                            ${c.isPrivate ? '<i class="fas fa-lock text-xs text-slate-400" title="Privada"></i>' : ''}
                        </h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide truncate max-w-[300px]">
                            ${c.description || 'Comunidad de aprendizaje'}
                        </p>
                    </div>
                </div>

                <!-- Acciones Derecha -->
                <div class="flex items-center gap-3">
                    ${!isMember ? 
                        `<button onclick="App.api.joinCommunity('${c.id}').then(()=>App.renderCommunity('${c.id}'))" class="bg-[#1890ff] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 animate-pulse">Unirse</button>` : 
                        `<div class="hidden md:flex items-center gap-2 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900/30">
                            <i class="fas fa-check-circle"></i> Miembro
                         </div>`
                    }
                    
                    <!-- BOTÓN CONFIGURACIÓN (Tuerca) -->
                    <div class="relative" id="community-settings-wrapper">
                        <button onclick="App.community.toggleSettings()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#1890ff] hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                            <i class="fas fa-cog"></i>
                        </button>
                        
                        <!-- Dropdown Menu -->
                        <div id="community-settings-menu" class="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 hidden animate-slide-up overflow-hidden z-50">
                            ${isAdmin ? `
                            <button onclick="App.community.openEditCommunityModal()" class="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-gray-50 dark:border-slate-800">
                                <i class="fas fa-edit w-5 text-center text-slate-400"></i> Editar Comunidad
                            </button>` : ''}
                            
                            <!-- Opción Abandonar -->
                            <button onclick="App.community.leave('${c.id}')" class="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors">
                                <i class="fas fa-sign-out-alt w-5 text-center"></i> Abandonar Comunidad
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navegación Tabs -->
            <div class="flex items-center gap-1 overflow-x-auto custom-scrollbar -mb-px">
                <a href="#comunidades/${c.id}/inicio" class="px-5 py-3 text-sm flex items-center gap-2 rounded-t-xl whitespace-nowrap ${getTabClass('inicio')}">
                    <i class="fas fa-stream"></i> Muro
                </a>
                <a href="#comunidades/${c.id}/clases" class="px-5 py-3 text-sm flex items-center gap-2 rounded-t-xl whitespace-nowrap ${getTabClass('clases')}">
                    <i class="fas fa-graduation-cap"></i> Aula
                </a>
                <a href="#comunidades/${c.id}/chat" class="px-5 py-3 text-sm flex items-center gap-2 rounded-t-xl whitespace-nowrap ${getTabClass('chat')}">
                    <i class="fas fa-comments"></i> Chat
                </a>
                <a href="#comunidades/${c.id}/live" class="px-5 py-3 text-sm flex items-center gap-2 rounded-t-xl whitespace-nowrap ${getTabClass('live')}">
                    <i class="fas fa-video ${activeTab === 'live' ? 'text-red-500 animate-pulse' : ''}"></i> En Vivo
                </a>
                <a href="#comunidades/${c.id}/miembros" class="px-5 py-3 text-sm flex items-center gap-2 rounded-t-xl whitespace-nowrap ${getTabClass('miembros')}">
                    <i class="fas fa-users"></i> Miembros
                </a>
            </div>
        </div>
    `;
}

// ============================================================================
// 3. LÓGICA DE ACTIONS (SETTINGS & LEAVE)
// ============================================================================

App.community.toggleSettings = () => {
    const menu = document.getElementById('community-settings-menu');
    if (menu) menu.classList.toggle('hidden');
    
    // Auto-cierre al hacer click fuera
    const closeFn = (e) => {
        if (!e.target.closest('#community-settings-wrapper')) {
            menu?.classList.add('hidden');
            document.removeEventListener('click', closeFn);
        }
    };
    setTimeout(() => document.addEventListener('click', closeFn), 0);
};

App.community.leave = async (cid) => {
    if (!confirm("¿Estás seguro de que quieres abandonar esta comunidad? Perderás tu acceso a los cursos y el progreso.")) return;

    try {
        await App.api.leaveCommunity(cid);
        App.ui.toast("Has abandonado la comunidad.", "success");
        window.location.hash = '#feed';
    } catch (e) {
        console.error(e);
        App.ui.toast("Error al intentar salir. Inténtalo de nuevo.", "error");
    }
};

// ============================================================================
// 4. TAB: FEED SOCIAL (MURO)
// ============================================================================

async function _renderFeedTab(container, community, user) {
    const isMember = (user.joinedCommunities || []).includes(community.id);

    // 1. Estructura Inicial
    container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        
        <!-- Columna Principal (Feed) -->
        <div class="lg:col-span-8 space-y-6">
            ${isMember ? `
            <!-- Widget Crear Post -->
            <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-900 transition-all group" onclick="App.community.openCreatePostModal()">
                <img src="${user.avatar}" class="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-slate-700 bg-gray-100">
                <div class="flex-1 bg-gray-50 dark:bg-slate-800 rounded-2xl px-5 py-3.5 flex items-center justify-between group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors border border-transparent group-hover:border-gray-100 dark:group-hover:border-slate-600">
                    <span class="text-slate-400 dark:text-slate-500 text-sm font-medium">Comparte tus ideas con la comunidad...</span>
                    <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300">
                        <i class="fas fa-plus"></i>
                    </div>
                </div>
            </div>` : ''}

            <!-- Filtros Rápidos -->
            <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <button class="px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold whitespace-nowrap shadow-lg">Todo</button>
                <button class="px-4 py-2 rounded-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-xs font-bold whitespace-nowrap hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Anuncios</button>
                <button class="px-4 py-2 rounded-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-xs font-bold whitespace-nowrap hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Preguntas</button>
            </div>

            <!-- Contenedor Posts -->
            <div id="feed-posts-container" class="space-y-6 min-h-[300px]">
                ${[1, 2].map(() => App.ui.skeleton()).join('')}
            </div>
        </div>

        <!-- Columna Sidebar (Info & Stats) -->
        <div class="hidden lg:block lg:col-span-4 space-y-6 sticky top-24">
            
            <!-- Widget Info -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
                <h3 class="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wide border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                    <i class="fas fa-info-circle text-[#1890ff]"></i> Sobre nosotros
                </h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                    ${community.description || 'Sin descripción disponible.'}
                </p>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-center border border-gray-100 dark:border-slate-700">
                        <div class="text-xl font-black text-slate-900 dark:text-white">${App.ui.formatNumber(community.membersCount || 0)}</div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Miembros</div>
                    </div>
                    <div class="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-center border border-gray-100 dark:border-slate-700">
                        <div class="text-xl font-black text-slate-900 dark:text-white">${(community.courses || []).length}</div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Cursos</div>
                    </div>
                </div>
            </div>

            <!-- Widget Leaderboard -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
                 <h3 class="font-bold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2 uppercase tracking-wide">
                    <i class="fas fa-trophy text-yellow-500"></i> Top Estudiantes
                 </h3>
                 <div class="space-y-4">
                    ${[1, 2, 3].map(i => `
                    <div class="flex items-center gap-3">
                        <div class="w-6 text-center font-black ${i===1?'text-[#1890ff] text-lg':'text-slate-400'}">#${i}</div>
                        <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-600"></div>
                        <div class="flex-1">
                            <div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div class="h-full bg-blue-500" style="width: ${100 - (i*20)}%"></div>
                            </div>
                        </div>
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400">${1000 - (i*50)} XP</span>
                    </div>`).join('')}
                 </div>
            </div>
        </div>
    </div>`;

    // 2. Fetch Posts
    try {
        const allPosts = await App.api.getPosts(community.id);
        const feedPosts = allPosts.filter(p => !p.channelId || p.channelId === 'general' || p.channelId === 'feed');
        window.App.currentFeed = feedPosts;

        const containerEl = document.getElementById('feed-posts-container');
        if (containerEl) {
            if (feedPosts.length === 0) {
                containerEl.innerHTML = `
                <div class="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800">
                    <div class="w-20 h-20 bg-blue-50 dark:bg-slate-800 text-[#1890ff] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl"><i class="fas fa-feather-alt"></i></div>
                    <h3 class="font-bold text-xl text-slate-900 dark:text-white mb-2">Aún no hay publicaciones</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Sé el primero en iniciar una conversación.</p>
                </div>`;
            } else {
                containerEl.innerHTML = feedPosts.map(p => _renderThreadCard(p, user, community)).join('');
            }
        }
    } catch (e) {
        const containerEl = document.getElementById('feed-posts-container');
        if(containerEl) containerEl.innerHTML = `<div class="text-red-500 text-center p-4">Error al cargar el feed.</div>`;
    }
}

function _renderThreadCard(post, user, community) {
    const isLike = (post.likedBy || []).includes(user.uid);
    const isAuthor = post.authorId === user.uid;
    const isAdmin = user.role === 'admin';
    const commentsCount = post.comments ? post.comments.length : 0;

    return `
    <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group animate-slide-up relative" id="post-${post.id}">
        
        <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
                <img src="${post.author?.avatar || 'https://ui-avatars.com/api/?name=User'}" class="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 object-cover border-2 border-gray-100 dark:border-slate-700">
                <div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                        ${post.author?.name || 'Usuario'} 
                        ${post.author?.role === 'admin' ? '<i class="fas fa-check-circle text-[#1890ff] text-xs" title="Admin"></i>' : ''}
                    </h4>
                    <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">${App.ui.formatDate(post.createdAt)}</span>
                </div>
            </div>
            
            ${(isAuthor || isAdmin) ? `
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="App.community.openCreatePostModal('${post.id}')" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#1890ff] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar"><i class="fas fa-pen text-xs"></i></button>
                <button onclick="App.community.deletePost('${post.id}', '${community.id}')" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Eliminar"><i class="fas fa-trash text-xs"></i></button>
            </div>` : ''}
        </div>

        <div class="pl-0 md:pl-[60px]">
            ${post.title ? `<h3 class="font-bold text-slate-900 dark:text-white mb-2 text-lg leading-snug">${post.title}</h3>` : ''}
            <div class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-4 font-medium">${post.content}</div>
            
            ${post.image ? `
            <div class="mb-4 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shadow-sm">
                <img src="${post.image}" class="w-full max-h-[500px] object-cover hover:scale-[1.01] transition-transform duration-500 cursor-zoom-in" onclick="window.open(this.src)">
            </div>` : ''}

            <div class="flex items-center gap-6 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button onclick="App.community.handleLike('${post.id}')" class="flex items-center gap-2 text-sm font-bold ${isLike ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-500'} transition-colors group/like">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 group-hover/like:bg-red-50 dark:group-hover/like:bg-red-900/20 transition-colors">
                        <i class="${isLike ? 'fas' : 'far'} fa-heart group-active/like:scale-125 transition-transform"></i>
                    </div> 
                    <span id="likes-count-${post.id}">${post.likes || 0}</span>
                </button>
                
                ${post.allowComments !== false ? `
                <button onclick="App.community.toggleComments('${post.id}')" class="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#1890ff] transition-colors group/comment">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 group-hover/comment:bg-blue-50 dark:group-hover/comment:bg-blue-900/20 transition-colors">
                        <i class="far fa-comment-alt"></i>
                    </div> 
                    <span>${commentsCount > 0 ? `${commentsCount}` : 'Comentar'}</span>
                </button>` : `<span class="text-xs text-slate-400 italic ml-auto font-bold"><i class="fas fa-lock mr-1"></i> Comentarios cerrados</span>`}
            </div>

            <div id="comments-${post.id}" class="hidden pt-6 mt-2 animate-fade-in">
                <div class="flex gap-3 mb-6">
                    <img src="${user.avatar}" class="w-9 h-9 rounded-full border border-gray-100 dark:border-slate-800">
                    <div class="flex-1 relative">
                        <input type="text" id="comment-input-${post.id}" 
                               placeholder="Escribe una respuesta..." 
                               class="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1890ff] focus:ring-2 focus:ring-blue-500/10 pr-10 transition-all font-medium" 
                               onkeydown="if(event.key==='Enter') App.community.addComment('${post.id}')">
                        <button onclick="App.community.addComment('${post.id}')" class="absolute right-2 top-2 text-[#1890ff] hover:bg-blue-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
                            <i class="fas fa-paper-plane text-sm"></i>
                        </button>
                    </div>
                </div>

                <div class="space-y-4 max-h-80 overflow-y-auto custom-scrollbar" id="comments-list-${post.id}">
                    ${(post.comments || []).map(c => `
                        <div class="flex gap-3 group/comment">
                            <img src="${c.authorAvatar}" class="w-8 h-8 rounded-full border border-gray-100 dark:border-slate-800 mt-1">
                            <div class="bg-gray-50 dark:bg-slate-800/50 p-3.5 rounded-2xl rounded-tl-none flex-1 border border-transparent dark:border-slate-800">
                                <div class="flex justify-between items-baseline mb-1">
                                    <span class="text-xs font-bold text-slate-900 dark:text-white">${c.authorName}</span>
                                    <span class="text-[10px] text-slate-400 font-medium">${App.ui.formatDate(c.createdAt)}</span>
                                </div>
                                <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">${c.content}</p>
                            </div>
                        </div>`).join('')}
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// 5. TAB: CHAT REALTIME (CANALES)
// ============================================================================

async function _renderChatTab(container, community, user) {
    const channels = community.channels || [{ id: 'general', name: 'General', type: 'text', category: 'Comunidad' }];
    const activeChId = window.tempActiveChannel || channels[0].id;
    const activeCh = channels.find(c => c.id === activeChId) || channels[0];
    window.tempActiveChannel = activeChId;
    const isAdmin = user.role === 'admin';

    const grouped = channels.reduce((acc, ch) => {
        const cat = ch.category || 'General';
        if(!acc[cat]) acc[cat] = [];
        acc[cat].push(ch);
        return acc;
    }, {});

    container.innerHTML = `
    <div class="flex h-full w-full overflow-hidden">
        
        <!-- Sidebar Canales -->
        <div class="w-72 bg-gray-50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 hidden md:flex">
            <div class="h-16 flex items-center justify-between px-5 border-b border-gray-200 dark:border-slate-800 shrink-0">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Canales</span>
                ${isAdmin ? `<button onclick="App.community.openChannelModal()" class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1890ff] transition-all"><i class="fas fa-plus text-xs"></i></button>` : ''}
            </div>
            
            <div class="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                ${Object.entries(grouped).map(([cat, chs]) => `
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
                            <button onclick="window.tempActiveChannel='${ch.id}'; App.renderCommunity('${community.id}', 'chat')" 
                                    class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group ${activeClass}">
                                <div class="flex items-center gap-2.5 truncate">
                                    <i class="fas ${icon} text-xs opacity-60 w-4 text-center"></i> 
                                    <span class="truncate font-bold text-xs">${ch.name}</span>
                                </div>
                                ${isAdmin && ch.id !== 'general' ? `<i onclick="event.stopPropagation(); App.community.deleteChannel('${community.id}', '${ch.id}')" class="fas fa-times text-[10px] opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1"></i>` : ''}
                            </button>`;
                        }).join('')}
                    </div>`).join('')}
            </div>
        </div>
        
        <!-- Área Principal -->
        <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative">
            <div class="h-16 border-b border-gray-200 dark:border-slate-800 flex items-center px-6 shrink-0 justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 sticky top-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <i class="fas ${activeCh.type === 'announcement' ? 'fa-bullhorn' : 'fa-hashtag'}"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-sm leading-tight">${activeCh.name}</h3>
                        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">${activeCh.type === 'announcement' ? 'Canal de anuncios oficial' : 'Chat general de la comunidad'}</span>
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col" id="chat-scroller">
                <div class="mt-auto text-center py-10 opacity-50">
                    <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl"><i class="fas fa-hashtag"></i></div>
                    <h4 class="font-bold text-slate-900 dark:text-white">Bienvenido a #${activeCh.name}</h4>
                    <p class="text-xs text-slate-500">Este es el comienzo del canal.</p>
                </div>
                <div id="chat-messages-container" class="space-y-2 pb-4"></div>
            </div>

            <div class="p-4 bg-white dark:bg-slate-900 shrink-0 border-t border-gray-200 dark:border-slate-800">
                ${(isAdmin || activeCh.type !== 'announcement') ? `
                <form onsubmit="App.community.handleSendMessage(event, '${community.id}', '${activeCh.id}')" class="bg-gray-100 dark:bg-slate-800 rounded-2xl p-2 flex gap-2 items-end border border-transparent focus-within:border-[#1890ff] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    <button type="button" class="p-3 text-slate-400 hover:text-[#1890ff] transition-colors"><i class="fas fa-plus-circle"></i></button>
                    <textarea id="chat-input" rows="1" class="flex-1 bg-transparent border-none outline-none text-sm p-3 text-slate-900 dark:text-white placeholder:text-slate-500 resize-none max-h-32 custom-scrollbar font-medium" placeholder="Enviar mensaje a #${activeCh.name}" onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); this.form.dispatchEvent(new Event('submit')); }"></textarea>
                    <button type="submit" class="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-105 transition-transform shadow-md flex items-center justify-center"><i class="fas fa-paper-plane text-xs"></i></button>
                </form>
                <div class="text-[10px] text-slate-400 mt-2 text-center font-medium"><strong>Enter</strong> para enviar, <strong>Shift+Enter</strong> para nueva línea.</div>` 
                : 
                `<div class="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl text-center text-xs font-bold text-slate-400 uppercase border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center gap-2"><i class="fas fa-lock"></i> Solo lectura</div>`}
            </div>
        </div>
    </div>`;

    _loadChatMessages(community.id, activeCh.id, user);
}

async function _loadChatMessages(cid, chid, user) {
    const container = document.getElementById('chat-messages-container');
    if(!container) return;

    try {
        const allPosts = await App.api.getPosts(cid);
        const messages = allPosts
            .filter(p => p.channelId === chid)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        container.innerHTML = messages.map(m => {
            const isMe = m.authorId === user.uid;
            return `
            <div class="group flex gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 -mx-4 px-4 py-2 rounded-xl transition-colors relative">
                <img src="${m.author.avatar}" class="w-10 h-10 rounded-full bg-gray-200 object-cover mt-1 border border-gray-200 dark:border-slate-700">
                <div class="flex-1 min-w-0">
                    <div class="flex items-baseline gap-2 mb-0.5">
                        <span class="font-bold text-sm text-slate-900 dark:text-white hover:underline cursor-pointer">${m.author.name}</span>
                        <span class="text-[10px] text-slate-400 font-medium">${App.ui.formatDate(m.createdAt)}</span>
                        ${m.author.role === 'admin' ? '<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>' : ''}
                    </div>
                    <div class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words font-medium">${m.content}</div>
                </div>
                ${(user.role === 'admin' || isMe) ? `<button onclick="App.community.deleteMessage('${cid}', '${m.id}')" class="absolute right-4 top-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 transition-all"><i class="fas fa-trash text-xs"></i></button>` : ''}
            </div>`;
        }).join('');

        const scroller = document.getElementById('chat-scroller');
        if(scroller) scroller.scrollTop = scroller.scrollHeight;
    } catch (e) { console.error(e); }
}

// ============================================================================
// 6. TAB: LIVE CENTER
// ============================================================================

async function _renderLiveTab(container, community, user) {
    const liveConfig = community.liveConfig || { active: false };
    const isAdmin = user.role === 'admin';
    const recordings = (community.pastLiveSessions || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-10 animate-fade-in pt-4">
        <div class="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-800">
            ${isAdmin ? `<div class="absolute top-4 right-4 z-20 flex gap-2"><button onclick="App.community.openLiveConfigModal()" class="bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-white dark:hover:bg-slate-700 flex items-center gap-2 transition-all"><i class="fas fa-cog"></i> Configurar Evento</button></div>` : ''}
            ${liveConfig.active ? _renderActiveLiveHero(liveConfig) : _renderEmptyLiveHero(isAdmin)}
        </div>
        ${recordings.length > 0 ? `
        <div class="border-t border-gray-200 dark:border-slate-800 pt-8">
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><i class="fas fa-history text-slate-400"></i> Grabaciones Anteriores</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${recordings.map(r => `
                <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1">
                    <div class="aspect-video bg-black relative">
                        <img src="https://img.youtube.com/vi/${r.videoUrl.split('v=')[1]?.split('&')[0] || r.videoUrl.split('/').pop()}/mqdefault.jpg" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                        <div class="absolute inset-0 flex items-center justify-center"><div class="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white text-xl border border-white/30 group-hover:scale-110 transition-transform"><i class="fas fa-play"></i></div></div>
                    </div>
                    <div class="p-4"><h4 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 mb-2 group-hover:text-[#1890ff] transition-colors">${r.title}</h4><span class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium"><i class="far fa-calendar"></i> ${App.ui.formatDate(r.date)}</span></div>
                </div>`).join('')}
            </div>
        </div>` : ''}
    </div>`;

    if (liveConfig.active && liveConfig.date) _initLiveCountdown(liveConfig.date);
}

function _renderActiveLiveHero(session) {
    return `
    <div class="w-full aspect-video bg-black relative group flex items-center justify-center">
        <div class="absolute inset-0 bg-cover bg-center opacity-30 blur-xl" style="background-image: url('${session.imageUrl || 'https://via.placeholder.com/1280x720'}');"></div>
        <div class="relative z-10 text-center text-white p-8 max-w-3xl w-full">
            <span class="inline-flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 animate-pulse shadow-lg ring-2 ring-red-500/50"><span class="w-2 h-2 bg-white rounded-full"></span> En Vivo</span>
            <h1 class="text-3xl md:text-5xl font-heading font-black mb-4 leading-tight drop-shadow-xl">${session.title}</h1>
            <p class="text-lg text-slate-200 mb-8 font-medium">${session.description || 'La clase comenzará en breve.'}</p>
            <div id="live-timer" class="grid grid-cols-4 gap-4 mb-10 max-w-lg mx-auto"></div>
            ${session.youtubeId ? `<div class="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20"><iframe src="https://www.youtube.com/embed/${session.youtubeId}?autoplay=1&mute=1" class="w-full h-full" frameborder="0" allowfullscreen></iframe></div>` : `<a href="${session.zoomLink}" target="_blank" class="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-slate-100 transition-transform hover:-translate-y-1"><i class="fas fa-video"></i> Unirse a la Sesión</a>`}
        </div>
    </div>`;
}

function _renderEmptyLiveHero(isAdmin) {
    return `
    <div class="bg-white dark:bg-slate-900 p-20 text-center">
        <div class="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600 text-4xl"><i class="fas fa-video-slash"></i></div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">No hay eventos en vivo</h2>
        <p class="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8 font-medium">Estamos preparando las próximas masterclasses. Mantente atento.</p>
        ${isAdmin ? `<button onclick="App.community.openLiveConfigModal()" class="bg-[#1890ff] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-600 transition-colors">Programar Evento</button>` : ''}
    </div>`;
}

// ============================================================================
// 7. MODALES Y DIÁLOGOS (INYECCIÓN COMPLETA)
// ============================================================================

function _injectModals(community, user) {
    const container = document.getElementById('comm-modals-container');
    if(!container) return;

    let modalsHtml = `
    <!-- A. Modal Crear Post -->
    <div id="create-post-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800 shrink-0">
                <h3 id="modal-post-title" class="font-bold text-lg text-slate-900 dark:text-white">Crear Publicación</h3>
                <button onclick="App.community.closeCreatePostModal()" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"><i class="fas fa-times text-slate-500 dark:text-slate-400"></i></button>
            </div>
            <div class="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <input type="hidden" id="cp-cid" value="${community.id}">
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Título</label><input type="text" id="cp-title" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] font-bold dark:text-white transition-colors text-sm" placeholder="Un título breve..."></div>
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Contenido</label><textarea id="cp-content" rows="5" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] resize-none dark:text-white transition-colors text-sm" placeholder="Comparte tus ideas..."></textarea></div>
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Multimedia</label><div class="flex gap-2 items-center"><label class="flex-1 cursor-pointer bg-gray-50 dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-3 text-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"><span class="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 group-hover:text-[#1890ff]"><i class="fas fa-cloud-upload-alt"></i> Subir Imagen</span><input type="file" id="cp-file" class="hidden" accept="image/*" onchange="App.community.handleFileSelect(this)"></label><div class="relative w-1/3"><input type="text" id="cp-url" class="w-full p-3 pl-8 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none text-xs dark:text-white focus:border-[#1890ff]" placeholder="O URL..."><i class="fas fa-link absolute left-3 top-3.5 text-slate-400 text-xs"></i></div></div><div id="cp-preview-container" class="hidden mt-2 relative group w-full h-40 bg-gray-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700"><img id="cp-preview" class="w-full h-full object-cover"><button onclick="App.community.clearPreview()" class="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur"><i class="fas fa-times text-xs"></i></button></div></div>
                <div class="flex items-center gap-3 pt-2"><input type="checkbox" id="cp-allow-comments" class="w-5 h-5 accent-[#1890ff] rounded cursor-pointer" checked> <label for="cp-allow-comments" class="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Permitir Comentarios</label></div>
            </div>
            <div class="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 shrink-0"><button onclick="App.community.submitPost()" id="btn-submit-post" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-all active:scale-95 text-sm">Publicar Ahora</button></div>
        </div>
    </div>`;

    if (user.role === 'admin') {
        // B. Modal Live
        modalsHtml += `
        <div id="live-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                <div class="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800"><h3 class="font-bold text-slate-900 dark:text-white">Configurar Evento</h3><button onclick="App.community.closeLiveModal()"><i class="fas fa-times text-slate-400"></i></button></div>
                <div class="p-6 space-y-4"><input type="hidden" id="live-cid" value="${community.id}"><div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Título</label><input type="text" id="live-title" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"></div><div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">YouTube ID</label><input type="text" id="live-yt-id" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"></div><div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Fecha</label><input type="datetime-local" id="live-date" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"></div><div class="flex items-center gap-2 pt-2"><input type="checkbox" id="live-active" class="w-5 h-5 accent-[#1890ff] cursor-pointer"><label for="live-active" class="text-sm font-bold text-slate-900 dark:text-white cursor-pointer">Activar Ahora</label></div><button onclick="App.community.saveLiveConfig()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-colors text-sm">Guardar Configuración</button></div>
            </div>
        </div>`;

        // C. Modal Channel
        modalsHtml += `
        <div id="channel-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
                <div class="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800"><h3 class="font-bold text-slate-900 dark:text-white">Nuevo Canal</h3><button onclick="App.community.closeChannelModal()"><i class="fas fa-times text-slate-400"></i></button></div>
                <div class="p-6 space-y-4"><input type="hidden" id="channel-cid" value="${community.id}"><div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Nombre</label><input type="text" id="channel-name" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"></div><div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Categoría</label><select id="channel-category" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"><option value="General">General</option><option value="Temas">Temas</option></select></div><div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Tipo</label><select id="channel-type" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"><option value="text">Chat</option><option value="announcement">Anuncios</option></select></div><button onclick="App.community.saveChannel()" class="w-full bg-[#1890ff] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors text-sm">Crear Canal</button></div>
            </div>
        </div>`;

        // D. Modal Editar Comunidad (NUEVO V38)
        modalsHtml += `
        <div id="edit-community-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
                <div class="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                    <h3 class="font-bold text-slate-900 dark:text-white">Editar Comunidad</h3>
                    <button onclick="App.community.closeEditCommunityModal()"><i class="fas fa-times text-slate-400"></i></button>
                </div>
                <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <input type="hidden" id="ec-id" value="${community.id}">
                    <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Nombre</label><input type="text" id="ec-name" value="${community.name}" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"></div>
                    <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Descripción</label><textarea id="ec-desc" rows="3" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm resize-none">${community.description || ''}</textarea></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Precio (USD)</label><input type="number" id="ec-price" value="${community.price || 0}" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm" placeholder="0 = Gratis"></div>
                        <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Privado</label><select id="ec-private" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"><option value="false" ${!community.isPrivate ? 'selected' : ''}>Público</option><option value="true" ${community.isPrivate ? 'selected' : ''}>Privado</option></select></div>
                    </div>
                    <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">URL de Pago Externa</label><input type="text" id="ec-payment" value="${community.paymentUrl || ''}" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm" placeholder="https://stripe.com/..."></div>
                    <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Video URL (Landing)</label><input type="text" id="ec-video" value="${community.videoUrl || ''}" class="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-[#1890ff] text-sm"></div>
                    <button onclick="App.community.saveCommunityConfig()" class="w-full bg-[#1890ff] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors text-sm">Guardar Configuración</button>
                </div>
            </div>
        </div>`;
    }

    container.innerHTML = modalsHtml;
}

// ============================================================================
// 8. HANDLERS DE FORMULARIOS & ACCIONES
// ============================================================================

App.community.openCreatePostModal = (postId = null) => {
    const m = document.getElementById('create-post-modal'); if(!m) return;
    window.App.communityState.isEditing = !!postId; window.App.communityState.editingPostId = postId;
    if (postId) {
        const post = window.App.currentFeed.find(p => p.id === postId);
        if(post) {
            document.getElementById('cp-title').value = post.title || ''; document.getElementById('cp-content').value = post.content || ''; document.getElementById('cp-url').value = post.image || '';
            const prev = document.getElementById('cp-preview');
            if(post.image) { prev.src = post.image; document.getElementById('cp-preview-container').classList.remove('hidden'); } else { document.getElementById('cp-preview-container').classList.add('hidden'); }
            document.getElementById('modal-post-title').innerText = 'Editar Publicación'; document.getElementById('btn-submit-post').innerText = 'Guardar Cambios';
        }
    } else {
        document.getElementById('cp-title').value = ''; document.getElementById('cp-content').value = ''; document.getElementById('cp-url').value = ''; document.getElementById('cp-file').value = '';
        document.getElementById('cp-preview-container').classList.add('hidden'); document.getElementById('modal-post-title').innerText = 'Crear Publicación'; document.getElementById('btn-submit-post').innerText = 'Publicar Ahora';
    }
    m.classList.remove('hidden');
};
App.community.closeCreatePostModal = () => document.getElementById('create-post-modal').classList.add('hidden');

App.community.handleFileSelect = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('cp-preview'); img.src = e.target.result;
            document.getElementById('cp-preview-container').classList.remove('hidden'); document.getElementById('cp-url').value = '';
        };
        reader.readAsDataURL(input.files[0]);
    }
};
App.community.clearPreview = () => { document.getElementById('cp-file').value = ''; document.getElementById('cp-preview').src = ''; document.getElementById('cp-preview-container').classList.add('hidden'); };

App.community.submitPost = async () => {
    const cid = document.getElementById('cp-cid').value;
    const title = document.getElementById('cp-title').value.trim();
    const content = document.getElementById('cp-content').value.trim();
    const url = document.getElementById('cp-url').value.trim();
    const allowComments = document.getElementById('cp-allow-comments').checked;
    const fileInput = document.getElementById('cp-file');
    const btn = document.getElementById('btn-submit-post');

    if (!content && !url && !fileInput.files[0]) return App.ui.toast("El post no puede estar vacío", "warning");
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Procesando...';

    try {
        let finalImage = url;
        if (fileInput.files[0]) {
            finalImage = await new Promise(resolve => {
                const reader = new FileReader(); reader.onload = e => resolve(e.target.result); reader.readAsDataURL(fileInput.files[0]);
            });
        }
        const postData = { title, content, image: finalImage, allowComments };
        if (window.App.communityState.isEditing) {
            await window.F.updateDoc(window.F.doc(window.F.db, "posts", window.App.communityState.editingPostId), postData);
            App.ui.toast("Post actualizado", "success");
        } else {
            await App.api.createPost({ ...postData, communityId: cid, channelId: 'general', authorId: App.state.currentUser.uid, author: App.state.currentUser });
            App.ui.toast("Publicado con éxito", "success");
        }
        App.community.closeCreatePostModal(); App.renderCommunity(cid, 'inicio'); 
    } catch(e) { console.error(e); App.ui.toast("Error al procesar", "error"); } finally { btn.disabled = false; }
};

App.community.deletePost = async (pid, cid) => {
    if(!confirm("¿Estás seguro de eliminar esta publicación?")) return;
    try {
        await window.F.deleteDoc(window.F.doc(window.F.db, "posts", pid));
        const el = document.getElementById(`post-${pid}`); if(el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }
        App.ui.toast("Publicación eliminada", "success");
    } catch(e) { App.ui.toast("Error al eliminar", "error"); }
};

App.community.handleLike = async (postId) => {
    const post = window.App.currentFeed.find(p => p.id === postId); if (!post) return;
    const uid = App.state.currentUser.uid;
    const isLiked = (post.likedBy || []).includes(uid);
    if(isLiked) { post.likes--; post.likedBy = post.likedBy.filter(id => id !== uid); } else { post.likes++; if(!post.likedBy) post.likedBy = []; post.likedBy.push(uid); }
    
    const countEl = document.getElementById(`likes-count-${postId}`); if(countEl) countEl.innerText = post.likes;
    const btn = countEl?.parentElement; if(btn) { btn.classList.toggle('text-red-500'); btn.classList.toggle('text-slate-500'); }
    try { await window.F.updateDoc(window.F.doc(window.F.db, "posts", postId), { likes: post.likes, likedBy: post.likedBy }); } catch(e) { console.error(e); }
};

App.community.toggleComments = (id) => {
    const el = document.getElementById(`comments-${id}`); if(el) { el.classList.toggle('hidden'); if(!el.classList.contains('hidden')) { setTimeout(() => document.getElementById(`comment-input-${id}`).focus(), 100); } }
};

App.community.addComment = async (pid) => {
    const input = document.getElementById(`comment-input-${pid}`); const txt = input.value.trim(); if(!txt) return;
    const comment = { id: 'cm_'+Date.now(), authorId: App.state.currentUser.uid, authorName: App.state.currentUser.name, authorAvatar: App.state.currentUser.avatar, content: txt, createdAt: new Date().toISOString() };
    const html = `<div class="flex gap-3 group/comment animate-fade-in"><img src="${comment.authorAvatar}" class="w-8 h-8 rounded-full border border-gray-100 dark:border-slate-800 mt-1"><div class="bg-gray-50 dark:bg-slate-800/50 p-3.5 rounded-2xl rounded-tl-none flex-1 border border-transparent dark:border-slate-800"><div class="flex justify-between items-baseline mb-1"><span class="text-xs font-bold text-slate-900 dark:text-white">${comment.authorName}</span><span class="text-[10px] text-slate-400 font-medium">Ahora</span></div><p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">${comment.content}</p></div></div>`;
    const list = document.getElementById(`comments-list-${pid}`); list.insertAdjacentHTML('beforeend', html); list.scrollTop = list.scrollHeight; input.value = '';
    try { await window.F.updateDoc(window.F.doc(window.F.db, "posts", pid), { comments: window.F.arrayUnion(comment) }); } catch(e) { console.error(e); }
};

// --- HANDLERS ADMIN (LIVE, CHANNEL, SETTINGS) ---

App.community.openLiveConfigModal = () => document.getElementById('live-modal').classList.remove('hidden');
App.community.closeLiveModal = () => document.getElementById('live-modal').classList.add('hidden');
App.community.openChannelModal = () => document.getElementById('channel-modal').classList.remove('hidden');
App.community.closeChannelModal = () => document.getElementById('channel-modal').classList.add('hidden');
App.community.openEditCommunityModal = () => { document.getElementById('edit-community-modal').classList.remove('hidden'); App.community.toggleSettings(); };
App.community.closeEditCommunityModal = () => document.getElementById('edit-community-modal').classList.add('hidden');

App.community.saveLiveConfig = async () => {
    const cid = document.getElementById('live-cid').value;
    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), {
            liveConfig: {
                active: document.getElementById('live-active').checked,
                title: document.getElementById('live-title').value,
                youtubeId: document.getElementById('live-yt-id').value,
                date: document.getElementById('live-date').value
            }
        });
        App.ui.toast("Configuración guardada", "success"); App.community.closeLiveModal(); App.renderCommunity(cid, 'live');
    } catch(e) { App.ui.toast("Error al guardar", "error"); }
};

App.community.saveChannel = async () => {
    const cid = document.getElementById('channel-cid').value; const name = document.getElementById('channel-name').value.trim();
    if(!name) return App.ui.toast("Nombre requerido", "warning");
    try {
        const newChannel = { id: name.toLowerCase().replace(/\s+/g, '-'), name, type: document.getElementById('channel-type').value, category: document.getElementById('channel-category').value };
        await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), { channels: window.F.arrayUnion(newChannel) });
        App.ui.toast("Canal creado", "success"); App.community.closeChannelModal(); App.renderCommunity(cid, 'chat');
    } catch(e) { App.ui.toast("Error al crear canal", "error"); }
};

App.community.deleteChannel = async (cid, chId) => {
    if(!confirm("¿Eliminar este canal?")) return;
    try {
        const ref = window.F.doc(window.F.db, "communities", cid);
        await window.F.runTransaction(window.F.db, async (transaction) => {
            const doc = await transaction.get(ref); if (!doc.exists()) throw "La comunidad no existe";
            const channels = doc.data().channels || []; const newChannels = channels.filter(c => c.id !== chId);
            transaction.update(ref, { channels: newChannels });
        });
        App.ui.toast("Canal eliminado", "success"); const currentHash = window.location.hash; if(currentHash.includes('/chat')) App.renderCommunity(cid, 'chat');
    } catch(e) { console.error(e); App.ui.toast("Error al eliminar canal", "error"); }
};

App.community.saveCommunityConfig = async () => {
    const cid = document.getElementById('ec-id').value;
    const data = {
        name: document.getElementById('ec-name').value,
        description: document.getElementById('ec-desc').value,
        price: document.getElementById('ec-price').value,
        isPrivate: document.getElementById('ec-private').value === 'true',
        paymentUrl: document.getElementById('ec-payment').value,
        videoUrl: document.getElementById('ec-video').value
    };
    try {
        await App.api.updateCommunity(cid, data);
        App.ui.toast("Comunidad actualizada", "success"); App.community.closeEditCommunityModal(); App.renderCommunity(cid);
    } catch (e) { console.error(e); App.ui.toast("Error al guardar", "error"); }
};

App.community.handleSendMessage = async (e, cid, chid) => {
    e.preventDefault(); const input = document.getElementById('chat-input'); const txt = input.value.trim(); if(!txt) return; input.value = '';
    try { await App.api.createPost({ communityId: cid, channelId: chid, content: txt, authorId: App.state.currentUser.uid, author: App.state.currentUser }); _loadChatMessages(cid, chid, App.state.currentUser); } catch(e) { App.ui.toast("Error enviando mensaje", "error"); }
};

App.community.deleteMessage = async (cid, pid) => {
    if(!confirm("¿Borrar mensaje?")) return;
    try { await window.F.deleteDoc(window.F.doc(window.F.db, "posts", pid)); const chid = window.tempActiveChannel || 'general'; _loadChatMessages(cid, chid, App.state.currentUser); } catch(e) { App.ui.toast("Error al borrar", "error"); }
};

function _initLiveCountdown(dateIso) {
    const el = document.getElementById('live-timer'); if(!el || !dateIso) return;
    const target = new Date(dateIso).getTime(); if(window.liveInterval) clearInterval(window.liveInterval);
    const update = () => {
        const now = new Date().getTime(); const diff = target - now;
        if(diff <= 0) { el.innerHTML = '<div class="col-span-4 text-center text-3xl font-bold animate-pulse text-red-500 bg-white/10 p-4 rounded-xl">¡EN VIVO AHORA!</div>'; return; }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24)); const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)); const s = Math.floor((diff % (1000 * 60)) / 1000);
        const box = (val, label) => `<div class="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center"><div class="text-3xl md:text-4xl font-mono font-bold text-white">${val < 10 ? '0'+val : val}</div><div class="text-[10px] uppercase tracking-widest text-slate-300 mt-1">${label}</div></div>`;
        el.innerHTML = box(d, 'Días') + box(h, 'Horas') + box(m, 'Min') + box(s, 'Seg');
    };
    update(); window.liveInterval = setInterval(update, 1000);
}