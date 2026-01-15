/**
 * dashboard.views.js (V55.0 - ARCHITECTURE CLEANUP & SINGLE SIDEBAR SOURCE)
 * Motor del Panel de Usuario.
 * * CAMBIOS V55.0 (FIX DEFINITIVO):
 * - CLEANUP: Eliminado renderizado redundante del Sidebar (ahora centralizado en core.js).
 * - LAYOUT: Adaptación al Shell Layout (Flexbox) sin márgenes manuales.
 * - CONSISTENCIA: Elimina el conflicto de doble menú en la ruta '#feed'.
 */

window.App = window.App || {};
window.App.dashboard = window.App.dashboard || {};

// ============================================================================
// 1. RENDERIZADOR PRINCIPAL (FRAMEWORK)
// ============================================================================

window.App.renderDashboard = async () => {
    const user = App.state.currentUser;
    
    // 1. Guardia de Seguridad
    if (!user) { 
        window.location.hash = '#discovery'; 
        return; 
    }

    // Inicialización de Caché Defensiva
    if (!App.state.cache) App.state.cache = {};
    if (!App.state.cache.communities) App.state.cache.communities = {};

    // 2. Precarga de Datos (Comunidades)
    if (user.joinedCommunities && user.joinedCommunities.length > 0) {
        try {
            const missingIds = user.joinedCommunities.filter(cid => !App.state.cache.communities[cid]);
            if (missingIds.length > 0) {
                await Promise.all(missingIds.map(cid => App.api.getCommunityById(cid)));
            }
        } catch (e) {
            console.warn("Precarga parcial fallida:", e);
        }
    }

    // 3. Cálculo de Progreso (Widget Derecho)
    const progressData = _calculateUserProgress(user);

    // NOTA V55.0: Eliminado renderizado manual del sidebar. 
    // El sidebar ahora es gestionado globalmente por core.js (Shell Layout).

    // 4. Renderizado del Marco
    // Usamos App.render para inyectar el contenido en el #main-scroll-wrapper del Shell
    await App.render(`
        
        <main class="app-layout min-h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300 pb-20 md:pb-0 flex flex-col relative w-full">
            
            <!-- HEADER COMPACTO UNIFICADO -->
            <header class="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 transition-colors shadow-sm">
                <div class="max-w-[1600px] w-full mx-auto px-4 lg:px-6 h-[72px] flex items-center justify-between gap-4">
                    
                    <!-- IZQUIERDA: Saludo + Navegación Global -->
                    <div class="flex items-center gap-6 min-w-0 flex-1">
                        <div class="flex items-center gap-3 shrink-0">
                            <!-- Avatar Pequeño (Estilo Logo) -->
                            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                                <i class="fas fa-home text-lg"></i>
                            </div>
                            <div class="hidden md:block min-w-0">
                                <h1 class="font-heading font-black text-lg text-slate-900 dark:text-white leading-tight truncate">
                                    Inicio
                                </h1>
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide truncate">
                                    Panel General
                                </p>
                            </div>
                        </div>

                        <!-- Separador Vertical -->
                        <div class="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden md:block"></div>

                        <!-- Navegación Funcional -->
                        <nav class="hidden md:flex items-center gap-1 overflow-x-auto custom-scrollbar">
                            <a href="#feed" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 text-[#1890ff] bg-blue-50 dark:bg-blue-900/20">
                                <i class="fas fa-stream text-xs"></i> <span>Mi Feed</span>
                            </a>
                            <a href="#discovery" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800">
                                <i class="fas fa-compass text-xs"></i> <span>Explorar</span>
                            </a>
                        </nav>
                    </div>

                    <!-- DERECHA: Búsqueda + Acciones -->
                    <div class="flex items-center gap-4 flex-1 justify-end pl-4">
                        
                        <!-- Buscador -->
                        <div class="relative z-50 w-full max-w-[280px] hidden lg:block group">
                            <input type="text" placeholder="Buscar..." 
                                   class="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-9 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1890ff] transition-all font-medium"
                                   oninput="App.search.handleInput(event)">
                            <i class="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs group-focus-within:text-[#1890ff] transition-colors"></i>
                            <div id="global-search-results" class="hidden absolute top-full right-0 w-full mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-[100] max-h-[400px] overflow-y-auto custom-scrollbar animate-slide-up"></div>
                        </div>

                        <!-- Botón Crear Post (SOLO ADMIN) -->
                        ${user.role === 'admin' ? `
                        <button onclick="App.dashboard.openPostModal()" class="w-9 h-9 rounded-xl bg-[#1890ff] text-white flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 active:scale-95 flex-shrink-0" title="Crear Publicación">
                            <i class="fas fa-plus text-xs"></i>
                        </button>` : ''}
                        
                        <!-- Avatar Perfil -->
                        <button onclick="App.dashboard.openProfileModal()" class="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1890ff] transition-all relative group flex-shrink-0 shadow-sm">
                            <img src="${user.avatar || 'https://ui-avatars.com/api/?name='+(user.name||'User')}" class="w-full h-full object-cover">
                        </button>
                    </div>
                </div>
            </header>

            <!-- CONTENIDO PRINCIPAL SCROLLABLE -->
            <div class="flex-1 w-full relative z-0 p-6 md:p-8" id="dashboard-scroller">
                <div class="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    <!-- COLUMNA PRINCIPAL (FEED) -->
                    <div class="lg:col-span-8 xl:col-span-9 space-y-8 min-w-0" id="dashboard-content">
                        <!-- AQUÍ SE INYECTA EL FEED -->
                    </div>

                    <!-- COLUMNA DERECHA (WIDGETS) -->
                    <div class="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6 sticky top-6">
                        ${_renderRightSidebar(user, progressData)}
                    </div>
                </div>
            </div>
        </main>

        <!-- Modales Globales -->
        ${_renderProfileModal(user)}
        ${_renderPostModal()}
    `);

    // 5. Cargar Contenido del Feed
    _loadDashboardContent(user);
};

// ============================================================================
// 2. LÓGICA DE CARGA DE CONTENIDO (SOLO FEED)
// ============================================================================

async function _loadDashboardContent(user) {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const joined = user.joinedCommunities || [];
    const isAdmin = user.role === 'admin';
    
    // Estado Vacío (Sin comunidades)
    if (joined.length === 0) {
        container.innerHTML = _renderEmptyState();
        return;
    }

    // Renderizar Skeleton mientras carga
    container.innerHTML = `
        <div class="space-y-6">
            <!-- Caja Crear Post (SOLO ADMIN) -->
            ${isAdmin ? `
            <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-900 transition-colors group" onclick="App.dashboard.openPostModal()">
                <img src="${user.avatar || 'https://ui-avatars.com/api/?name=U'}" class="w-11 h-11 rounded-full bg-gray-100 dark:bg-slate-800 object-cover border border-gray-100 dark:border-slate-700">
                <div class="flex-1 bg-gray-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 text-slate-400 dark:text-slate-500 text-sm font-medium group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors border border-transparent group-hover:border-gray-100 dark:group-hover:border-slate-700">
                    Comparte tu progreso o anuncios...
                </div>
                <button class="w-11 h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-md hover:scale-105 transition-transform"><i class="fas fa-plus"></i></button>
            </div>` : ''}
            
            <!-- Lista de Posts -->
            <div id="feed-list" class="space-y-6">
                ${[1, 2].map(() => App.ui.skeleton('card')).join('')}
            </div>
        </div>`;

    // Carga Real de Posts (Algoritmo de Agregación)
    try {
        let allPosts = [];
        
        for (const cid of joined) {
            // Protección contra IDs de comunidad inválidos
            if (!cid || !App.state.cache.communities[cid]) continue;

            const posts = await App.api.getPosts(cid, 'all');
            const commName = App.state.cache.communities[cid]?.name || 'Comunidad';
            const commIcon = App.state.cache.communities[cid]?.icon || 'fa-users';
            
            if (Array.isArray(posts)) {
                const enriched = posts.slice(0, 5).map(p => ({
                    ...p, 
                    communityId: cid, 
                    communityName: commName,
                    communityIcon: commIcon
                }));
                allPosts = allPosts.concat(enriched);
            }
        }
        
        // Ordenar por fecha descendente
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const list = document.getElementById('feed-list');
        if (list) {
            list.innerHTML = allPosts.length > 0 
                ? allPosts.map(p => _renderFeedCard(p, user)).join('') 
                : `<div class="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 animate-fade-in">
                     <div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-[#1890ff] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i class="fas fa-wind"></i></div>
                     <h3 class="font-bold text-slate-900 dark:text-white">Todo está tranquilo</h3>
                     <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Tus comunidades aún no tienen actividad reciente.</p>
                   </div>`;
        }
    } catch (e) { console.error(e); }
}

// ============================================================================
// 3. TARJETAS Y COMPONENTES
// ============================================================================

function _renderFeedCard(post, user) {
    const isLike = (post.likedBy || []).includes(user.uid);
    const commentsCount = post.comments ? post.comments.length : 0;
    const isAuthor = post.authorId === user.uid;
    const isAdmin = user.role === 'admin';

    return `
    <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group animate-fade-in relative" id="feed-post-${post.id}">
        
        <!-- Header Post -->
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
                <img src="${post.author?.avatar || 'https://ui-avatars.com/api/?name='+(post.author?.name || 'User')}" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 object-cover border border-gray-100 dark:border-slate-800">
                <div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                        ${post.author?.name || 'Usuario'} 
                        ${post.author?.role === 'admin' ? '<i class="fas fa-check-circle text-[#1890ff] text-xs" title="Admin"></i>' : ''}
                    </h4>
                    <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>${App.ui.formatDate(post.createdAt)}</span>
                        <span>•</span>
                        <a href="#comunidades/${post.communityId}" class="hover:text-[#1890ff] transition-colors font-medium flex items-center gap-1">
                            <i class="fas ${post.communityIcon || 'fa-users'} text-[10px]"></i> ${post.communityName}
                        </a>
                    </div>
                </div>
            </div>
            
            ${(isAuthor || isAdmin) ? `
            <button onclick="App.api.deletePost('${post.id}').then(() => document.getElementById('feed-post-${post.id}').remove())" class="text-slate-300 hover:text-red-500 dark:hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 opacity-0 group-hover:opacity-100" title="Eliminar">
                <i class="fas fa-trash-alt"></i>
            </button>` : ''}
        </div>

        <!-- Contenido -->
        <div class="pl-0 md:pl-[52px]">
            ${post.title ? `<h3 class="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 leading-snug cursor-pointer hover:text-[#1890ff] transition-colors">${post.title}</h3>` : ''}
            
            <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line mb-4 font-medium">${post.content}</p>
            
            ${post.image ? `
            <div class="mb-4 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shadow-sm">
                <img src="${post.image}" class="w-full max-h-[500px] object-cover hover:scale-[1.01] transition-transform duration-500 cursor-zoom-in" onclick="window.open(this.src)">
            </div>` : ''}

            <!-- Footer / Acciones -->
            <div class="flex items-center gap-6 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button onclick="App.dashboard.handleLike('${post.id}')" class="flex items-center gap-2 text-xs font-bold ${isLike ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-500'} transition-colors group/like">
                    <i class="${isLike ? 'fas' : 'far'} fa-heart text-sm group-active/like:scale-125 transition-transform"></i> 
                    <span id="feed-likes-count-${post.id}">${post.likes || 0}</span>
                </button>
                
                <button onclick="App.dashboard.toggleComments('${post.id}')" class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#1890ff] transition-colors group/comment">
                    <i class="far fa-comment-alt text-sm"></i> 
                    <span>${commentsCount > 0 ? `${commentsCount} comentarios` : 'Responder'}</span>
                </button>

                <button class="ml-auto text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-2 transition-colors py-2 px-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg">
                    <i class="fas fa-share"></i> Compartir
                </button>
            </div>

            <!-- Sección Comentarios -->
            <div id="feed-comments-${post.id}" class="hidden pt-4 mt-2 border-t border-dashed border-gray-100 dark:border-slate-800 animate-fade-in">
                <div class="flex gap-3 mb-4">
                    <img src="${user.avatar || 'https://ui-avatars.com/api/?name=U'}" class="w-8 h-8 rounded-full border border-gray-100 dark:border-slate-800">
                    <div class="flex-1 relative">
                        <input type="text" id="feed-comment-input-${post.id}" 
                               placeholder="Escribe una respuesta..." 
                               class="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] pr-10 transition-all font-medium" 
                               onkeydown="if(event.key==='Enter') App.dashboard.addComment('${post.id}')">
                        <button onclick="App.dashboard.addComment('${post.id}')" class="absolute right-2 top-1.5 text-[#1890ff] hover:bg-blue-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
                            <i class="fas fa-paper-plane text-xs"></i>
                        </button>
                    </div>
                </div>

                <div id="feed-comments-list-${post.id}" class="space-y-3">
                    ${(post.comments || []).map(c => `
                        <div class="flex gap-2 group/comm">
                            <img src="${c.authorAvatar}" class="w-6 h-6 rounded-full border border-gray-100 dark:border-slate-800 mt-1">
                            <div class="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-2xl rounded-tl-none flex-1 border border-transparent dark:border-slate-800">
                                <div class="flex justify-between items-baseline mb-0.5">
                                    <span class="text-xs font-bold text-slate-900 dark:text-white">${c.authorName}</span>
                                    <span class="text-[9px] text-slate-400 font-medium">${App.ui.formatDate(c.createdAt)}</span>
                                </div>
                                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">${c.content}</p>
                            </div>
                        </div>`).join('')}
                </div>
            </div>
        </div>
    </div>`;
}

function _renderRightSidebar(user, progressData) {
    return `
    <div class="space-y-6">
        
        <!-- WIDGET 1: PROGRESO -->
        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 class="font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-wider flex items-center gap-2">
                <i class="fas fa-bolt text-yellow-500"></i> Continuar Aprendiendo267268269270271272273274275276277278279280281282283284285286287288289290291292293294$0
            </h3>
            
            ${progressData ? `
            <div class="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700/50">
                <div class="relative aspect-video rounded-lg overflow-hidden mb-3 group cursor-pointer border border-gray-200 dark:border-slate-700" onclick="window.location.hash='${progressData.link}'">
                    <img src="${progressData.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                        <div class="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-[#1890ff] shadow-lg scale-90 group-hover:scale-100 transition-transform"><i class="fas fa-play text-xs"></i></div>
                    </div>
                    <div class="absolute bottom-0 left-0 h-1 bg-[#1890ff]" style="width: ${progressData.percentage}%"></div>
                </div>
                <h4 class="font-bold text-slate-900 dark:text-white text-xs line-clamp-1 mb-1">${progressData.classTitle}</h4>
                <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">${progressData.courseTitle}</p>
                <a href="${progressData.link}" class="block w-full bg-[#1890ff] hover:bg-blue-600 text-white font-bold py-2 rounded-lg text-center text-[10px] transition-colors">Continuar Clase</a>
            </div>` 
            : 
            `<div class="text-center py-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2"><i class="fas fa-check"></i></div>
                <p class="text-xs font-bold text-emerald-700 dark:text-emerald-400">¡Todo al día!</p>
            </div>`}
        </div>

        <!-- WIDGET 2: LISTA COMUNIDADES -->
        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 class="font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-wider">Tus Espacios</h3>
            <div class="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                ${(user.joinedCommunities||[]).map(id => {
                    const c = App.state.cache.communities[id];
                    if(!c) return '';
                    return `<a href="#comunidades/${c.id}" class="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg group transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs shrink-0"><i class="fas ${c.icon}"></i></div>
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#1890ff] truncate flex-1">${c.name}</span>
                        <i class="fas fa-chevron-right text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </a>`;
                }).join('')}
            </div>
            <button onclick="window.location.hash='#discovery'" class="w-full mt-4 py-2 text-[10px] font-bold text-slate-500 hover:text-[#1890ff] hover:bg-gray-50 dark:hover:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg transition-all">
                <i class="fas fa-compass mr-1"></i> Explorar más
            </button>
        </div>
    </div>`;
}

function _renderEmptyState() {
    return `
    <div class="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0f172a] rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-center px-6 animate-fade-in">
        <div class="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <i class="fas fa-rocket text-3xl text-[#1890ff]"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">¡Tu feed está vacío!</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            Únete a comunidades para llenar este espacio de contenido interesante.
        </p>
        <button onclick="window.location.hash='#discovery'" class="bg-[#1890ff] hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:-translate-y-1 transition-all">
            Explorar Comunidades
        </button>
    </div>`;
}

// ============================================================================
// 4. LÓGICA DE INTERACCIÓN (LIKES, COMENTARIOS, POSTS)
// ============================================================================

function _calculateUserProgress(user) {
    if (!user.joinedCommunities || user.joinedCommunities.length === 0) return null;
    let target = null;
    const completed = user.completedModules || [];

    for (const cid of user.joinedCommunities) {
        if (!App.state.cache.communities || !App.state.cache.communities[cid]) continue;
        
        const community = App.state.cache.communities[cid];
        if (!community || !community.courses) continue;
        
        for (const course of community.courses) {
            if (!course.classes) continue;
            const nextClass = course.classes.find(c => !completed.includes(`${cid}_${c.id}`));
            if (nextClass) {
                const total = course.classes.length;
                const done = course.classes.filter(c => completed.includes(`${cid}_${c.id}`)).length;
                target = {
                    communityId: cid, communityName: community.name,
                    courseId: course.id, courseTitle: course.title,
                    classTitle: nextClass.title,
                    image: course.image || 'https://via.placeholder.com/300',
                    percentage: Math.round((done/total)*100),
                    link: `#comunidades/${cid}/clases/${course.id}`
                };
                break;
            }
        }
        if (target) break;
    }
    return target;
}

App.dashboard.handleLike = async (postId) => {
    const btn = document.querySelector(`#feed-likes-count-${postId}`)?.parentElement;
    if (!btn) return;
    
    // Toggle Visual Inmediato
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');
    let val = parseInt(span.innerText);
    const isLiked = btn.classList.contains('text-red-500');

    if (isLiked) {
        btn.classList.remove('text-red-500'); btn.classList.add('text-slate-500', 'dark:text-slate-400');
        icon.classList.replace('fas', 'far');
        span.innerText = Math.max(0, val - 1);
    } else {
        btn.classList.add('text-red-500'); btn.classList.remove('text-slate-500', 'dark:text-slate-400');
        icon.classList.replace('far', 'fas');
        span.innerText = val + 1;
    }

    try { await App.api.toggleLike(postId); } catch(e) { console.error(e); }
};

App.dashboard.toggleComments = (postId) => {
    const el = document.getElementById(`feed-comments-${postId}`);
    if (el) {
        el.classList.toggle('hidden');
        if (!el.classList.contains('hidden')) {
            setTimeout(() => document.getElementById(`feed-comment-input-${postId}`).focus(), 100);
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

    // Insertar en DOM
    const html = `
    <div class="flex gap-2 animate-slide-up">
        <img src="${comment.authorAvatar || 'https://ui-avatars.com/api/?name=U'}" class="w-6 h-6 rounded-full border border-gray-100 dark:border-slate-800 mt-1">
        <div class="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-2xl rounded-tl-none flex-1 border border-transparent dark:border-slate-800">
            <div class="flex justify-between items-baseline mb-0.5">
                <span class="text-xs font-bold text-slate-900 dark:text-white">${comment.authorName}</span>
                <span class="text-[9px] text-slate-400">Ahora</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">${comment.content}</p>
        </div>
    </div>`;
    
    const list = document.getElementById(`feed-comments-list-${postId}`);
    if(list) list.insertAdjacentHTML('beforeend', html);
    input.value = '';

    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "posts", postId), {
            comments: window.F.arrayUnion(comment)
        });
    } catch (e) { App.ui.toast("Error al comentar", "error"); }
};

// ============================================================================
// 5. MODALES (CREAR POST & PERFIL)
// ============================================================================

function _renderPostModal() {
    return `
    <div id="post-modal" class="fixed inset-0 z-[70] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" id="post-backdrop" onclick="App.dashboard.closePostModal()"></div>
        <div class="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto flex flex-col relative z-10" id="post-panel">
            
            <div class="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 rounded-t-3xl">
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Crear Publicación</h2>
                <button onclick="App.dashboard.closePostModal()"><i class="fas fa-times text-slate-400 hover:text-slate-900 dark:hover:text-white"></i></button>
            </div>
            
            <div class="p-6 space-y-4">
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">¿Dónde publicar?</label>
                    <select id="post-community-select" class="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white transition-colors cursor-pointer text-sm">
                        <option value="">Selecciona una comunidad...</option>
                        ${(App.state.currentUser?.joinedCommunities || []).map(cid => {
                            // Protección contra cache nulo
                            if (!App.state.cache.communities) return '';
                            const c = App.state.cache.communities[cid];
                            return c ? `<option value="${cid}">${c.name}</option>` : '';
                        }).join('')}
                    </select>
                </div>
                
                <input type="text" id="post-title" placeholder="Título (Opcional)" class="w-full p-2.5 bg-transparent border-b border-gray-200 dark:border-slate-800 text-lg font-bold text-slate-900 dark:text-white outline-none focus:border-[#1890ff]">
                
                <textarea id="post-content" rows="5" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] resize-none dark:text-white text-sm" placeholder="Comparte tus ideas..."></textarea>
            </div>
            
            <div class="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end bg-gray-50/50 dark:bg-slate-800/50 rounded-b-3xl">
                <button onclick="App.dashboard.submitPost()" class="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform text-sm">Publicar</button>
            </div>
        </div>
    </div>`;
}

function _renderProfileModal(user) {
    return `
    <div id="profile-modal" class="fixed inset-0 z-[80] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" id="profile-backdrop" onclick="App.dashboard.closeProfileModal()"></div>
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto overflow-hidden relative z-10" id="profile-panel">
            
            <div class="h-28 bg-gradient-to-r from-slate-900 to-slate-800 relative">
                <button onclick="App.dashboard.closeProfileModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center backdrop-blur-sm z-10"><i class="fas fa-times"></i></button>
            </div>
            
            <div class="px-8 pb-8 -mt-10 relative">
                <div class="flex justify-center mb-4">
                    <div class="relative group">
                        <img id="profile-avatar-prev" src="${user.avatar || 'https://via.placeholder.com/150'}" class="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-xl bg-white dark:bg-slate-800">
                        <div class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]" onclick="App.ui.toast('Cambio de avatar: Próximamente', 'info')">
                            <i class="fas fa-camera"></i>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="text-center mb-4"><h2 class="text-lg font-bold text-slate-900 dark:text-white">Editar Perfil</h2><p class="text-xs text-slate-500">${user.email}</p></div>
                    
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide ml-1">Nombre</label>
                        <input type="text" id="profile-name" value="${user.name || ''}" class="w-full py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#1890ff] transition-colors dark:text-white text-sm" placeholder="Tu nombre">
                    </div>
                    
                    <button onclick="App.dashboard.saveProfile()" id="btn-save-profile" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold shadow-lg mt-2 text-sm hover:scale-[1.02] transition-transform">
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

// Handlers Modales
App.dashboard.openPostModal = () => { document.getElementById('post-modal').classList.remove('hidden'); const p = document.getElementById('post-panel'); setTimeout(() => { p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100'); }, 10); document.getElementById('post-backdrop').classList.remove('opacity-0'); };
App.dashboard.closePostModal = () => { const m = document.getElementById('post-modal'); const p = document.getElementById('post-panel'); const b = document.getElementById('post-backdrop'); p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0'); b.classList.add('opacity-0'); setTimeout(() => m.classList.add('hidden'), 300); };
App.dashboard.openProfileModal = () => { document.getElementById('profile-modal').classList.remove('hidden'); const p = document.getElementById('profile-panel'); setTimeout(() => { p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100'); }, 10); document.getElementById('profile-backdrop').classList.remove('opacity-0'); };
App.dashboard.closeProfileModal = () => { const m = document.getElementById('profile-modal'); const p = document.getElementById('profile-panel'); const b = document.getElementById('profile-backdrop'); p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0'); b.classList.add('opacity-0'); setTimeout(() => m.classList.add('hidden'), 300); };

// Handlers Submit
App.dashboard.submitPost = async () => {
    const cid = document.getElementById('post-community-select').value;
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    if(!cid) return App.ui.toast("Selecciona una comunidad", "warning");
    if(!content) return App.ui.toast("Escribe algo para publicar", "warning");
    
    try {
        await App.api.createPost({ 
            communityId: cid, channelId: 'general', title: title, content: content, 
            authorId: App.state.currentUser.uid, author: App.state.currentUser, isOfficial: false 
        });
        App.ui.toast("¡Publicado!", "success");
        App.dashboard.closePostModal();
        document.getElementById('post-content').value = '';
        document.getElementById('post-title').value = '';
        App.renderDashboard();
    } catch(e) { console.error(e); App.ui.toast("Error al publicar", "error"); }
};

App.dashboard.saveProfile = async () => {
    const newName = document.getElementById('profile-name').value.trim();
    if (!newName) return App.ui.toast("Nombre inválido", "warning");
    
    const btn = document.getElementById('btn-save-profile');
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
    
    try {
        await App.api.updateProfile(App.state.currentUser.uid, { name: newName });
        App.ui.toast("Perfil actualizado", "success");
        App.dashboard.closeProfileModal();
        App.renderDashboard();
    } catch(e) { 
        App.ui.toast("Error al guardar", "error"); 
        btn.innerHTML = 'Guardar Cambios';
    }
};