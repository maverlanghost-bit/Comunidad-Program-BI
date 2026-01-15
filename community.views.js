/**
 * community.views.js (V51.0 - CHAT REMOVAL & CLEANUP)
 * Motor de Vistas de Comunidad Interna.
 * * CAMBIOS V51.0:
 * - REMOVE: Eliminada la pestaña 'Chat' del header de comunidad.
 * - REMOVE: Eliminada la lógica de renderizado de chat interno (case 'chat').
 * - REMOVE: Borrada la función obsoleta '_renderChatTab' y sus helpers.
 * - CLEANUP: Código purgado y optimizado para Feed, Aula y Live.
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
window.trialInterval = null;
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

    // ------------------------------------------------------------------------
    // LIMPIEZA DE ESTADO GLOBAL (SAFETY NET)
    // ------------------------------------------------------------------------
    const scOverlay = document.getElementById('superclass-overlay');
    if (scOverlay) {
        scOverlay.remove();
        document.body.style.overflow = '';
        if (window.App.lms && window.App.lms._editorInstance) {
            window.App.lms._editorInstance.dispose();
            window.App.lms._editorInstance = null;
        }
    }

    if (window.liveInterval) { clearInterval(window.liveInterval); window.liveInterval = null; }
    if (window.trialInterval) { clearInterval(window.trialInterval); window.trialInterval = null; }
    // ------------------------------------------------------------------------

    // 1. Cargar Datos
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

    // ------------------------------------------------------------------------
    // ACCESS GUARD
    // ------------------------------------------------------------------------
    const isMember = (user.joinedCommunities || []).includes(cid);
    const isAdmin = user.role === 'admin';

    if (!isMember && !isAdmin) {
        window.location.hash = `#comunidades/${cid}/info`; 
        return;
    }

    // 2. Renderizar Estructura Base
    const contentHTML = `
        <div id="community-root" data-cid="${cid}" class="flex flex-col min-h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300 relative">
            
            <!-- Header Sticky (Contextual de la Comunidad) -->
            <div id="comm-header-wrapper" class="sticky top-0 z-40 w-full bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-800 transition-colors shadow-sm">
                ${_renderCommunityHeader(community, activeTab, user)}
            </div>
            
            <!-- Contenido Dinámico -->
            <div id="community-content" class="flex-1 w-full animate-fade-in relative z-0 flex flex-col">
                <div class="p-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-[#1890ff]"></i></div>
            </div>

            <!-- Contenedor de Modales -->
            <div id="comm-modals-container"></div>
        </div>
    `;

    await App.render(contentHTML);
    _injectModals(community, user);

    // 3. Cargar Contenido Específico (Routing Interno)
    const container = document.getElementById('community-content');
    if(container) container.scrollTop = 0;

    switch (activeTab) {
        case 'inicio':
        case 'comunidad':
            // Feed
            container.className = "flex-1 w-full max-w-[1600px] mx-auto animate-fade-in relative z-0 p-4 md:p-8 pb-32 block";
            await _renderFeedTab(container, community, user);
            break;
            
        case 'clases':
            // Aula (LMS)
            container.className = "flex-1 w-full flex flex-col animate-fade-in relative z-0 bg-white dark:bg-[#0f172a] min-h-[calc(100vh-140px)]";
            container.innerHTML = ''; 
            
            if (App.lms) {
                if (extraParam) {
                    App.lms.renderPlayer(container, community, extraParam, user, user.role === 'admin');
                } else {
                    const catalogWrapper = document.createElement('div');
                    catalogWrapper.className = "w-full h-full"; 
                    container.appendChild(catalogWrapper);
                    App.lms.renderCatalog(catalogWrapper, community, user, user.role === 'admin');
                }
            } else {
                container.innerHTML = `<div class="p-20 text-center"><div class="text-6xl mb-4">🎓</div><h3 class="text-xl font-bold text-slate-700 dark:text-slate-200">Módulo de Aula no cargado</h3></div>`;
            }
            break;
            
        case 'live':
            container.className = "flex-1 w-full max-w-[1600px] mx-auto animate-fade-in relative z-0 p-4 md:p-8 block";
            await _renderLiveTab(container, community, user);
            break;
            
        // [UPDATE V51] Caso 'chat' eliminado. Si alguien llega aquí por URL antigua, fallback a default.
            
        default:
            // Fallback al feed si la pestaña no existe
            container.className = "flex-1 w-full max-w-[1600px] mx-auto animate-fade-in relative z-0 p-4 md:p-8 pb-32 block";
            await _renderFeedTab(container, community, user);
    }
};

// ============================================================================
// 2. COMPONENTES VISUALES: HEADER & SETTINGS
// ============================================================================

function _renderCommunityHeader(c, activeTab, user) {
    const isMember = (user.joinedCommunities || []).includes(c.id);
    const isAdmin = user.role === 'admin';

    const tabInactive = "text-slate-500 dark:text-slate-400 hover:text-[#1890ff] hover:bg-gray-50 dark:hover:bg-slate-800/50 font-bold border-b-2 border-transparent transition-all";
    const tabActive = "text-[#1890ff] font-bold border-b-2 border-[#1890ff] bg-blue-50/50 dark:bg-blue-900/10";

    const getTabClass = (tabName) => {
        if (activeTab === 'comunidad' && tabName === 'inicio') return tabActive;
        return activeTab === tabName ? tabActive : tabInactive;
    };

    // BANNER TRIAL
    const isTrial = user.trialActive && user.trialCommunities?.includes(c.id);
    let trialBanner = '';
    if (isTrial && user.trialStart && user.trialEnd) {
        const end = new Date(user.trialEnd).getTime();
        if (Date.now() < end) {
            trialBanner = `
                <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient text-white px-4 py-2 text-xs font-bold flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 shadow-inner relative z-50">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-stopwatch animate-pulse"></i>
                        <span class="tracking-wide">TRIAL ACTIVO: <span id="trial-timer" class="bg-white/20 px-1.5 py-0.5 rounded text-white">Calculando...</span></span>
                    </div>
                    <button onclick="window.location.hash='#comunidades/${c.id}/planes'" class="bg-white text-indigo-700 px-3 py-0.5 rounded-full text-[10px] font-black hover:scale-105 transition-transform">ACTUALIZAR</button>
                </div>`;
            setTimeout(() => _initTrialCountdown(user.trialEnd), 0);
        }
    }

    // [UPDATE V51] Pestaña 'Chat' eliminada del menú
    return `
        <div class="w-full bg-white dark:bg-[#0f172a] shadow-sm relative z-50 flex flex-col">
            ${trialBanner}
            <div class="max-w-[1600px] w-full mx-auto px-4 lg:px-8">
                <div class="h-20 flex items-center justify-between">
                    <div class="flex items-center gap-4 flex-wrap md:flex-nowrap overflow-hidden">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1890ff] to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                            <i class="fas ${c.icon || 'fa-users'} text-xl"></i>
                        </div>
                        <div class="min-w-0">
                            <h1 class="font-heading font-black text-xl text-slate-900 dark:text-white leading-tight truncate flex items-center gap-2">
                                ${c.name}
                                ${c.isPrivate ? '<i class="fas fa-lock text-xs text-slate-400"></i>' : ''}
                            </h1>
                        </div>
                        
                        <!-- Tabs Desktop -->
                        <div class="flex items-center gap-1 overflow-x-auto custom-scrollbar ml-4 hidden md:flex">
                            <a href="#comunidades/${c.id}/inicio" class="px-4 py-2 text-xs flex items-center gap-1 rounded-full whitespace-nowrap ${getTabClass('inicio')}"><i class="fas fa-stream text-xs"></i> Muro</a>
                            <a href="#comunidades/${c.id}/clases" class="px-4 py-2 text-xs flex items-center gap-1 rounded-full whitespace-nowrap ${getTabClass('clases')}"><i class="fas fa-graduation-cap text-xs"></i> Aula</a>
                            <a href="#comunidades/${c.id}/live" class="px-4 py-2 text-xs flex items-center gap-1 rounded-full whitespace-nowrap ${getTabClass('live')}"><i class="fas fa-video text-xs ${activeTab === 'live' ? 'text-red-500 animate-pulse' : ''}"></i> Live</a>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-3 shrink-0">
                        ${!isMember ? 
                            `<button onclick="App.api.joinCommunity('${c.id}').then(()=>App.renderCommunity('${c.id}'))" class="bg-[#1890ff] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30">Unirse</button>` : 
                            `<div class="relative" id="community-settings-wrapper">
                                <button onclick="App.community.toggleSettings()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#1890ff] transition-colors"><i class="fas fa-cog"></i></button>
                                <div id="community-settings-menu" class="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 hidden animate-slide-up overflow-hidden z-50">
                                    ${isAdmin ? `<button onclick="App.community.openEditCommunityModal()" class="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-gray-50 dark:border-slate-800"><i class="fas fa-edit w-4"></i> Editar Comunidad</button>` : ''}
                                    <button onclick="App.community.leave('${c.id}')" class="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"><i class="fas fa-sign-out-alt w-4"></i> Abandonar</button>
                                </div>
                            </div>`
                        }
                    </div>
                </div>

                <!-- Tabs Mobile -->
                <div class="flex md:hidden items-center gap-1 overflow-x-auto custom-scrollbar -mb-px px-1 pb-2">
                    <a href="#comunidades/${c.id}/inicio" class="px-4 py-2 text-xs flex items-center gap-1 rounded-t-xl whitespace-nowrap ${getTabClass('inicio')}"><i class="fas fa-stream text-xs"></i> Muro</a>
                    <a href="#comunidades/${c.id}/clases" class="px-4 py-2 text-xs flex items-center gap-1 rounded-t-xl whitespace-nowrap ${getTabClass('clases')}"><i class="fas fa-graduation-cap text-xs"></i> Aula</a>
                    <a href="#comunidades/${c.id}/live" class="px-4 py-2 text-xs flex items-center gap-1 rounded-t-xl whitespace-nowrap ${getTabClass('live')}"><i class="fas fa-video text-xs ${activeTab === 'live' ? 'text-red-500 animate-pulse' : ''}"></i> Live</a>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// 3. LOGICA DE ACCIONES Y MODALES
// ============================================================================

App.community.toggleSettings = () => {
    const menu = document.getElementById('community-settings-menu');
    if (menu) menu.classList.toggle('hidden');
    const closeFn = (e) => {
        if (!e.target.closest('#community-settings-wrapper')) {
            menu?.classList.add('hidden');
            document.removeEventListener('click', closeFn);
        }
    };
    setTimeout(() => document.addEventListener('click', closeFn), 0);
};

App.community.leave = async (cid) => {
    if (!confirm("¿Estás seguro de que quieres abandonar esta comunidad?")) return;
    try {
        await App.api.leaveCommunity(cid);
        App.ui.toast("Has abandonado la comunidad.", "success");
        window.location.hash = '#feed';
    } catch (e) { App.ui.toast("Error al intentar salir.", "error"); }
};

// ============================================================================
// 4. TABS: FEED, LIVE
// ============================================================================

async function _renderFeedTab(container, community, user) {
    const isAdmin = user.role === 'admin';
    container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        <div class="lg:col-span-8 space-y-6">
            ${isAdmin ? `
            <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-300 transition-all group" onclick="App.community.openCreatePostModal()">
                <img src="${user.avatar}" class="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-slate-700">
                <div class="flex-1 bg-gray-50 dark:bg-slate-800 rounded-2xl px-5 py-3.5 flex items-center justify-between group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                    <span class="text-slate-400 text-sm font-medium">Comparte tus ideas...</span>
                    <i class="fas fa-plus text-slate-400"></i>
                </div>
            </div>` : ''}

            <div id="feed-posts-container" class="space-y-6 min-h-[300px]">
                ${[1, 2].map(() => App.ui.skeleton()).join('')}
            </div>
        </div>

        <div class="hidden lg:block lg:col-span-4 space-y-6 sticky top-24">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
                <h3 class="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wide flex items-center gap-2"><i class="fas fa-info-circle text-[#1890ff]"></i> Info</h3>
                <p class="text-sm text-slate-500 mb-6 font-medium">${community.description || 'Sin descripción.'}</p>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                        <div class="text-xl font-black text-slate-900 dark:text-white">${App.ui.formatNumber(community.membersCount || 0)}</div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold mt-1">Miembros</div>
                    </div>
                    <div class="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                        <div class="text-xl font-black text-slate-900 dark:text-white">${(community.courses || []).length}</div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold mt-1">Cursos</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    try {
        const allPosts = await App.api.getPosts(community.id);
        const feedPosts = allPosts.filter(p => !p.channelId || p.channelId === 'general');
        window.App.currentFeed = feedPosts;
        const postEl = document.getElementById('feed-posts-container');
        if (postEl) {
            postEl.innerHTML = feedPosts.length === 0 
                ? `<div class="text-center py-10 opacity-60"><i class="fas fa-feather text-4xl mb-2 text-slate-300"></i><p class="text-sm text-slate-500">No hay posts aún.</p></div>`
                : feedPosts.map(p => _renderThreadCard(p, user, community)).join('');
        }
    } catch (e) {
        const postEl = document.getElementById('feed-posts-container');
        if(postEl) postEl.innerHTML = `<div class="text-red-500 text-center text-sm">Error cargando feed.</div>`;
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
// 5. INYECCION MODALES Y HANDLERS
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

        // [REMOVE] Modal Channel eliminado ya que el chat es global

        // D. Modal Editar Comunidad
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
    } catch(e) { console.error(e); App.ui.toast("Error al procesar", "error"); } finally { btn.disabled = false; btn.innerHTML = window.App.communityState.isEditing ? 'Guardar Cambios' : 'Publicar Ahora'; }
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
    const btn = countEl?.parentElement; if(btn) { btn.classList.toggle('text-red-500', !isLiked); btn.classList.toggle('text-slate-500', isLiked); }
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
// [REMOVE] App.community.openChannelModal ya no es necesario
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

// [REMOVE] App.community.saveChannel eliminado (chat es global)

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

function _initLiveCountdown(dateIso) {
    const el = document.getElementById('live-timer'); if(!el || !dateIso) return;
    const target = new Date(dateIso).getTime(); if(window.liveInterval) clearInterval(window.liveInterval);
    const update = () => {
        const now = new Date().getTime(); const diff = target - now;
        if(diff <= 0) { el.innerHTML = '<div class="col-span-4 text-center text-3xl font-bold animate-pulse text-red-500 bg-white/10 p-4 rounded-xl">¡EN VIVO AHORA!</div>'; clearInterval(window.liveInterval); return; }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24)); const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)); const s = Math.floor((diff % (1000 * 60)) / 1000);
        const box = (val, label) => `<div class="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center"><div class="text-3xl md:text-4xl font-mono font-bold text-white">${val < 10 ? '0'+val : val}</div><div class="text-[10px] uppercase tracking-widest text-slate-300 mt-1">${label}</div></div>`;
        el.innerHTML = box(d, 'Días') + box(h, 'Horas') + box(m, 'Min') + box(s, 'Seg');
    };
    update(); window.liveInterval = setInterval(update, 1000);
}

function _initTrialCountdown(endIso) {
    const target = new Date(endIso).getTime();
    if (window.trialInterval) clearInterval(window.trialInterval);
    const update = () => {
        const now = Date.now();
        const diff = target - now;
        if (diff <= 0) {
            const banner = document.querySelector('.animate-gradient'); if (banner) banner.remove();
            clearInterval(window.trialInterval);
            return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        const timerSpan = document.getElementById('trial-timer');
        if (timerSpan) timerSpan.innerText = `${d}d ${h}h ${m}m ${s}s`;
    };
    update();
    window.trialInterval = setInterval(update, 1000);
}