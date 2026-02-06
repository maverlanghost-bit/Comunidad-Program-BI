/**
 * community.views.js (V62.2 - DASHBOARD STYLE WIDGET)
 * Motor de Vistas de Comunidad Interna.
 * * CAMBIOS V62.2:
 * - UI: Tarjeta "Continuar/Comenzar" rediseñada para coincidir exactamente con el estilo del Dashboard.
 * - CLEANUP: Eliminada la sección "Sobre la comunidad" de la barra lateral.
 * * CAMBIOS V62.1:
 * - LOGIC: Algoritmo Smart Learning para detectar siguiente lección.
 */

window.App = window.App || {};
window.App.community = window.App.community || {};

// ============================================================================
// 0. CONFIGURACIÓN E INICIALIZACIÓN
// ============================================================================

// Cargar API YouTube (Singleton)
if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Estado Local
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

    if (!user) { window.location.hash = '#comunidades'; return; }

    // Limpieza de Estado Global (Safety Net)
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

    // 1. Cargar Datos
    let community = App.state.cache.communities[cid];
    if (!community) {
        try {
            community = await App.api.getCommunityById(cid);
            if (!community) throw new Error("Comunidad no encontrada");
            App.state.cache.communities[cid] = community;
        } catch (e) {
            return App.render(`
                <div class="h-screen flex items-center justify-center flex-col text-center bg-white dark:bg-[#020617]">
                    <div class="text-6xl mb-4 opacity-50">💔</div>
                    <h2 class="text-xl font-bold text-slate-900 dark:text-white">Comunidad no disponible</h2>
                    <button onclick="window.location.hash='#comunidades'" class="mt-4 text-[#1890ff] hover:underline font-bold">Volver al catálogo</button>
                </div>
            `);
        }
    }

    // Access Guard
    const isMember = (user.joinedCommunities || []).includes(cid);
    const isAdmin = user.role === 'admin';
    if (!isMember && !isAdmin) { window.location.hash = `#comunidades/${cid}/info`; return; }

    // 2. Renderizar Estructura Base
    const contentHTML = `
        <div id="community-root" data-cid="${cid}" class="flex flex-col min-h-full transition-colors duration-300 relative w-full">
            
            <!-- PORTADA COMPACTA (Inline Tabs & Branding) -->
            <div id="comm-header-wrapper" class="w-full bg-white dark:bg-[#0f172a] border-b border-gray-100 dark:border-slate-800">
                ${_renderCommunityHeader(community, activeTab, user)}
            </div>
            
            <!-- CONTENIDO DINÁMICO -->
            <div id="community-content" class="flex-1 w-full animate-fade-in relative z-0 flex flex-col">
                <div class="p-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-[#1890ff]"></i></div>
            </div>

            <!-- Contenedor de Modales -->
            <div id="comm-modals-container"></div>
        </div>
    `;

    await App.render(contentHTML);
    _injectModals(community, user);

    // Trigger Sidebar Context (FIX V61.5)
    if (typeof window.App.renderSidebar === 'function') {
        await window.App.renderSidebar(cid);
    }

    // 3. Cargar Contenido Específico
    const container = document.getElementById('community-content');
    if (container) container.scrollTop = 0;

    switch (activeTab) {
        case 'inicio':
        case 'comunidad':
            container.className = "flex-1 w-full max-w-[1200px] mx-auto animate-fade-in relative z-0 p-6 md:p-8 block";
            await _renderFeedTab(container, community, user);
            break;

        case 'clases':
            container.className = "flex-1 w-full flex flex-col animate-fade-in relative z-0 bg-white dark:bg-[#0f172a] min-h-[600px]";
            container.innerHTML = '';
            // Verificación robusta del módulo LMS
            if (window.App && window.App.lms && window.App.lms.renderCatalog) {
                if (extraParam) {
                    window.App.lms.renderPlayer(container, community, extraParam, user, user.role === 'admin');
                } else {
                    const catalogWrapper = document.createElement('div');
                    catalogWrapper.className = "w-full h-full";
                    container.appendChild(catalogWrapper);
                    window.App.lms.renderCatalog(catalogWrapper, community, user, user.role === 'admin');
                }
            } else {
                console.error('[LMS] Módulo no cargado. Verifique que community.lms.js esté incluido.');
                container.innerHTML = `<div class="p-20 text-center text-slate-400">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4 text-amber-500"></i>
                    <p class="font-bold">Módulo LMS no cargado.</p>
                    <p class="text-sm mt-2">Intenta recargar la página (F5)</p>
                </div>`;
            }
            break;

        case 'live':
            container.className = "flex-1 w-full max-w-[1200px] mx-auto animate-fade-in relative z-0 p-6 md:p-8 block";
            await _renderLiveTab(container, community, user);
            break;

        default:
            container.className = "flex-1 w-full max-w-[1200px] mx-auto animate-fade-in relative z-0 p-6 md:p-8 block";
            await _renderFeedTab(container, community, user);
    }
};

// ============================================================================
// 2. COMPONENTES VISUALES: HEADER (BRANDING UPDATE)
// ============================================================================

function _renderCommunityHeader(c, activeTab, user) {
    const isMember = (user.joinedCommunities || []).includes(c.id);
    const isAdmin = user.role === 'admin';

    // Estilos para Tabs - TODOS uniformes con iconos grises
    const tabInactive = "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium border-b-2 border-transparent px-3 py-5 transition-all text-sm h-full flex items-center gap-2 whitespace-nowrap";
    const tabActive = "text-[#1890ff] font-bold border-b-2 border-[#1890ff] px-3 py-5 text-sm h-full flex items-center gap-2 whitespace-nowrap";

    const getTabClass = (tabName) => {
        if (activeTab === 'comunidad' && tabName === 'inicio') return tabActive;
        return activeTab === tabName ? tabActive : tabInactive;
    };

    // Lógica de Identidad Visual
    const hasLogo = !!c.logoUrl;
    const showTitle = c.showTitle !== false;

    return `
        <div class="max-w-[1400px] w-full mx-auto px-4 sm:px-6">
            <div class="flex items-center h-[60px] lg:h-[65px] gap-4 lg:gap-6">
                <!-- BRANDING -->
                <div class="flex items-center gap-3 shrink-0">
                    ${hasLogo
            ? `<img src="${c.logoUrl}" class="h-8 lg:h-9 w-auto object-contain max-w-[100px] lg:max-w-[120px] select-none" alt="${c.name}">`
            : `<div class="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-slate-400 text-base shrink-0">
                            <i class="fas ${c.icon || 'fa-users'}"></i>
                           </div>`
        }
                    ${showTitle ? `<span class="hidden sm:block font-bold text-sm text-slate-900 dark:text-white">${c.name}</span>` : ''}
                </div>

                <!-- SEPARADOR -->
                <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block shrink-0"></div>

                <!-- TABS (Desktop) - Todos uniformes, sin separador entre Live y Comunidad -->
                <div class="hidden lg:flex items-center h-full overflow-x-auto custom-scrollbar -mb-px">
                    <a href="#comunidades/${c.id}/inicio" class="${getTabClass('inicio')}"><i class="fas fa-stream text-xs opacity-70"></i> Muro</a>
                    <a href="#comunidades/${c.id}/clases" class="${getTabClass('clases')}"><i class="fas fa-graduation-cap text-xs opacity-70"></i> Aula</a>
                    <a href="#comunidades/${c.id}/live" class="${getTabClass('live')}"><i class="fas fa-video text-xs opacity-70"></i> Live</a>
                    <a href="#chat" class="${tabInactive}"><i class="fas fa-comments text-xs opacity-70"></i> Comunidad</a>
                    <a href="#ai" class="${tabInactive}"><i class="fas fa-sparkles text-xs opacity-70"></i> Asistente AI</a>
                </div>

                <!-- SPACER -->
                <div class="flex-1"></div>

                <!-- GRUPO DERECHA: Search + Admin + Settings -->
                <div class="flex items-center gap-2 sm:gap-3 shrink-0">
                    
                    <!-- SEARCH BAR (Desktop) -->
                    <div class="relative hidden md:block group">
                        <input 
                            type="text" 
                            id="header-search-input"
                            placeholder="Buscar cursos, clases..." 
                            class="w-52 lg:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1890ff]/40 focus:border-[#1890ff] group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-all shadow-sm"
                            oninput="App.search.handleInput(event)"
                            onfocus="this.parentElement.classList.add('focused')"
                            onblur="setTimeout(() => this.parentElement.classList.remove('focused'), 200)"
                        >
                        <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-[.focused]:text-[#1890ff] transition-colors"></i>
                        <kbd class="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">⌘K</kbd>
                        <div id="global-search-results" class="hidden absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[400px] overflow-hidden z-50"></div>
                    </div>

                    <!-- MOBILE SEARCH -->
                    <button onclick="App.community.toggleMobileSearch()" class="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all">
                        <i class="fas fa-search text-sm"></i>
                    </button>

                    <!-- ADMIN (Solo admins) -->
                    ${isAdmin ? `<a href="#admin" class="${tabInactive} hidden lg:flex !border-0 !py-2"><i class="fas fa-shield-alt text-xs opacity-70"></i> Admin</a>` : ''}

                    <!-- SETTINGS -->
                    ${isMember ?
            `<div class="relative" id="community-settings-wrapper">
                            <button onclick="App.community.toggleSettings()" class="btn-ghost w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"><i class="fas fa-ellipsis-v"></i></button>
                            <div id="community-settings-menu" class="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-float border border-gray-100 dark:border-slate-800 hidden animate-slide-up overflow-hidden z-50">
                                ${isAdmin ? `<button onclick="App.community.openEditCommunityModal()" class="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"><i class="fas fa-pen w-5 text-slate-400"></i> Editar</button>` : ''}
                                <a href="#chat" class="lg:hidden w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center"><i class="fas fa-comments w-5 text-slate-400"></i> Comunidad</a>
                                <a href="#ai" class="lg:hidden w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center"><i class="fas fa-sparkles w-5 text-slate-400"></i> Asistente AI</a>
                                ${isAdmin ? `<a href="#admin" class="lg:hidden w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center"><i class="fas fa-shield-alt w-5 text-slate-400"></i> Admin</a>` : ''}
                                <button onclick="App.community.leave('${c.id}')" class="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"><i class="fas fa-sign-out-alt w-5"></i> Salir</button>
                            </div>
                        </div>` :
            `<button onclick="App.api.joinCommunity('${c.id}').then(()=>App.renderCommunity('${c.id}'))" class="btn-primary px-3 sm:px-4 py-1.5 text-xs shadow-lg">Unirse</button>`
        }
                </div>
            </div>
            
            <!-- MOBILE TABS BAR -->
            <div class="lg:hidden flex items-center border-t border-gray-100 dark:border-slate-800 -mx-4 sm:-mx-6 px-2 sm:px-4 overflow-x-auto custom-scrollbar">
                <a href="#comunidades/${c.id}/inicio" class="${getTabClass('inicio')} text-xs py-3"><i class="fas fa-stream text-xs opacity-70"></i> Muro</a>
                <a href="#comunidades/${c.id}/clases" class="${getTabClass('clases')} text-xs py-3"><i class="fas fa-graduation-cap text-xs opacity-70"></i> Aula</a>
                <a href="#comunidades/${c.id}/live" class="${getTabClass('live')} text-xs py-3"><i class="fas fa-video text-xs opacity-70"></i> Live</a>
                <a href="#chat" class="${tabInactive} text-xs py-3"><i class="fas fa-comments text-xs opacity-70"></i> Chat</a>
                <a href="#ai" class="${tabInactive} text-xs py-3"><i class="fas fa-sparkles text-xs opacity-70"></i> AI</a>
                ${isAdmin ? `<a href="#admin" class="${tabInactive} text-xs py-3"><i class="fas fa-shield-alt text-xs opacity-70"></i> Admin</a>` : ''}
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

// Toggle Mobile Search (Muestra un campo de búsqueda en móvil)
App.community.toggleMobileSearch = () => {
    // Por ahora, redirigimos al feed donde hay búsqueda global
    // En el futuro se puede implementar un overlay de búsqueda
    const existingSearch = document.getElementById('mobile-search-overlay');
    if (existingSearch) {
        existingSearch.remove();
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'mobile-search-overlay';
    overlay.className = 'fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in';
    overlay.innerHTML = `
        <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800">
                <div class="relative">
                    <input type="text" id="mobile-search-input" placeholder="Buscar comunidades..." 
                           class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1890ff]"
                           oninput="App.search.handleInput(event)" autofocus>
                    <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                </div>
            </div>
            <div id="global-search-results" class="max-h-80 overflow-y-auto"></div>
        </div>
    `;
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('mobile-search-input')?.focus(), 100);
};

App.community.leave = async (cid) => {
    if (!confirm("¿Estás seguro de que quieres abandonar esta comunidad?")) return;
    try {
        await App.api.leaveCommunity(cid);
        App.ui.toast("Has abandonado la comunidad.", "success");
        window.location.hash = '#feed';
    } catch (e) { App.ui.toast("Error al intentar salir.", "error"); }
};

// Helper: Carga de Logo Local en Modal
App.community.handleLogoSelect = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('ec-logo').value = e.target.result;
            App.ui.toast("Logo listo para guardar", "success");
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// ============================================================================
// 4. LÓGICA SMART LEARNING (Continuar/Comenzar)
// ============================================================================

function _findNextLesson(community, user) {
    if (!community.courses || community.courses.length === 0) return null;

    const completed = user.completedModules || [];
    const cid = community.id;

    // Buscar el primer curso que no esté 100% completado
    for (const course of community.courses) {
        const totalClasses = course.classes ? course.classes.length : 0;
        if (totalClasses === 0) continue;

        // Calcular progreso del curso
        const courseCompletedCount = (course.classes || []).filter(cls =>
            completed.includes(`${cid}_${cls.id}`)
        ).length;

        // Si el curso tiene clases pendientes, devolvemos la primera pendiente
        if (courseCompletedCount < totalClasses) {
            const nextClass = course.classes.find(cls => !completed.includes(`${cid}_${cls.id}`));
            if (nextClass) {
                return {
                    type: courseCompletedCount === 0 ? 'start' : 'continue',
                    courseTitle: course.title,
                    courseId: course.id,
                    classId: nextClass.id,
                    classTitle: nextClass.title,
                    image: course.image,
                    videoUrl: nextClass.videoUrl, // Para obtener miniatura de YouTube
                    progress: Math.round((courseCompletedCount / totalClasses) * 100)
                };
            }
        }
    }
    // Si todos están completados, podrías devolver null o un estado de "Todo listo"
    return null;
}

function _renderContinueLearningCard(nextLesson, communityId) {
    if (!nextLesson) return '';

    const isStart = nextLesson.type === 'start';
    const headerTitle = isStart ? 'Comenzar' : 'Continuar';
    const headerIcon = isStart ? '<i class="fas fa-play-circle text-emerald-500"></i>' : '<i class="fas fa-bolt text-yellow-500"></i>';
    const actionText = isStart ? 'Empezar Curso' : 'Continuar Clase';
    const link = `#comunidades/${communityId}/clases/${nextLesson.courseId}`;

    // Onclick handler para reproducir inmediatamente al hacer clic en el botón principal
    const clickHandler = `onclick="setTimeout(() => { if(window.App.lms) App.lms.playClass('${communityId}', '${nextLesson.courseId}', '${nextLesson.classId}'); }, 100)"`;

    // Extraer ID de YouTube y generar thumbnail
    let thumbnailUrl = nextLesson.image || 'https://via.placeholder.com/400x200?text=Curso';
    if (nextLesson.videoUrl) {
        const ytMatch = nextLesson.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch && ytMatch[1]) {
            thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
        }
    }

    // Gradient colors based on state
    const buttonGradient = isStart
        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30'
        : 'bg-gradient-to-r from-[#1890ff] to-indigo-600 hover:from-[#1477d9] hover:to-indigo-700 shadow-blue-500/30';

    return `
    <div class="card-zen p-0 overflow-hidden group/cta">
        <!-- Header con gradiente sutil -->
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <h3 class="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                ${headerIcon} ${headerTitle}
            </h3>
        </div>
        
        <div class="p-5">
            <!-- Thumbnail sin overlay oscuro -->
            <a href="${link}" ${clickHandler} class="relative aspect-video rounded-2xl overflow-hidden mb-4 group block cursor-pointer shadow-lg ring-1 ring-black/5 dark:ring-white/5">
                <img src="${thumbnailUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='${nextLesson.image || 'https://via.placeholder.com/400x200?text=Curso'}'">
                
                <!-- Botón play sutil (solo en hover) -->
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div class="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#1890ff] shadow-2xl scale-90 group-hover:scale-100 transition-all duration-300">
                        <i class="fas fa-play text-2xl ml-1"></i>
                    </div>
                </div>
                
                <!-- Barra de progreso -->
                ${!isStart ? `
                <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                    <div class="h-full bg-gradient-to-r from-[#1890ff] to-indigo-500" style="width: ${nextLesson.progress}%"></div>
                </div>
                ` : ''}
                
                <!-- Badge de progreso (solo si hay progreso) -->
                ${!isStart ? `
                <div class="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                    ${nextLesson.progress}% completado
                </div>
                ` : ''}
            </a>
            
            <!-- Info -->
            <div class="mb-4">
                <h4 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 mb-1">${nextLesson.classTitle}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1.5">
                    <i class="fas fa-book-open text-[10px]"></i> ${nextLesson.courseTitle}
                </p>
            </div>
            
            <!-- Botón Premium -->
            <a href="${link}" ${clickHandler} class="block w-full py-3.5 text-center text-sm font-bold text-white rounded-2xl ${buttonGradient} shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98] group/btn">
                <span class="flex items-center justify-center gap-2">
                    <i class="fas ${isStart ? 'fa-play' : 'fa-forward'} text-xs transition-transform group-hover/btn:translate-x-0.5"></i>
                    ${actionText}
                </span>
            </a>
        </div>
    </div>`;
}

// ============================================================================
// 5. TABS: FEED, LIVE (ZEN STYLE)
// ============================================================================

async function _renderFeedTab(container, community, user) {
    const isAdmin = user.role === 'admin';

    // Calcular tarjeta de aprendizaje
    const nextLesson = _findNextLesson(community, user);
    const learningCardHTML = _renderContinueLearningCard(nextLesson, community.id);

    container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start animate-fade-in">
        <!-- COLUMNA PRINCIPAL: FEED + Tarjeta móvil -->
        <div class="lg:col-span-8 space-y-6">
            
            <!-- Tarjeta de Continuar Curso - Solo visible en móvil -->
            ${learningCardHTML ? `
            <div class="lg:hidden">
                ${learningCardHTML}
            </div>` : ''}
            
            
            ${isAdmin ? `
            <div class="card-zen p-4 flex items-center gap-4">
                <img src="${user.avatar}" class="w-10 h-10 rounded-full object-cover bg-gray-100">
                <div class="flex-1 flex gap-3">
                    <div onclick="App.community.openCreatePostModal()" class="flex-1 bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-slate-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex justify-between items-center cursor-pointer group">
                        <span>Escribe un anuncio o post...</span>
                        <i class="fas fa-pen text-xs"></i>
                    </div>
                    ${user.role === 'admin' ? `
                    <button onclick="App.community.openChallengeModal()" class="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl transition-colors font-bold text-sm flex items-center gap-2 whitespace-nowrap" title="Crear Desafío">
                        <i class="fas fa-trophy"></i>
                        <span class="hidden sm:inline">Desafío</span>
                    </button>` : ''}
                </div>
            </div>` : ''}


            <div id="feed-posts-container" class="space-y-6 min-h-[300px]">
                ${[1, 2].map(() => App.ui.skeleton()).join('')}
            </div>
        </div>

        <!-- COLUMNA DERECHA: WIDGETS -->
        <div class="hidden lg:block lg:col-span-4 space-y-6 sticky top-8">
            
            <!-- WIDGET PRINCIPAL: ACCIÓN DE APRENDIZAJE -->
            ${learningCardHTML}
            
            <!-- SIN WIDGETS ADICIONALES (CLEAN UI) -->
        </div>
    </div>`;

    try {
        const allPosts = await App.api.getPosts(community.id);
        const feedPosts = allPosts.filter(p => !p.channelId || p.channelId === 'general');
        window.App.currentFeed = feedPosts;
        const postEl = document.getElementById('feed-posts-container');
        if (postEl) {
            // Check for active challenge
            let challengeHTML = '';
            const activeChallenge = community.activeChallenge;
            if (activeChallenge && !activeChallenge.archived && _isChallengeActive(activeChallenge)) {
                challengeHTML = _renderChallengeCard(activeChallenge, user, community.id);
            }

            const postsHTML = feedPosts.length === 0
                ? `<div class="text-center py-12 opacity-60"><i class="fas fa-wind text-3xl mb-2 text-slate-300"></i><p class="text-sm text-slate-500">Aún no hay publicaciones.</p></div>`
                : feedPosts.map(p => _renderThreadCard(p, user, community)).join('');

            postEl.innerHTML = challengeHTML + postsHTML;

            // Init timer if challenge exists
            if (activeChallenge && !activeChallenge.archived && _isChallengeActive(activeChallenge)) {
                _initChallengeTimer(activeChallenge.expiresAt, activeChallenge.id);
            }
        }
    } catch (e) {
        console.error(e);
        const postEl = document.getElementById('feed-posts-container');
        if (postEl) postEl.innerHTML = `<div class="text-red-500 text-center text-sm">Error cargando feed.</div>`;
    }
}

function _renderThreadCard(post, user, community) {
    const isLike = (post.likedBy || []).includes(user.uid);
    const isAuthor = post.authorId === user.uid;
    const isAdmin = user.role === 'admin';
    const commentsCount = post.comments ? post.comments.length : 0;

    return `
    <div class="card-zen p-6 group animate-slide-up" id="post-${post.id}">
        
        <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
                <img src="${post.author?.avatar || 'https://ui-avatars.com/api/?name=User'}" class="w-10 h-10 rounded-full bg-gray-100 object-cover">
                <div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                        ${post.author?.name || 'Usuario'} 
                        ${post.author?.role === 'admin' ? '<i class="fas fa-check-circle text-[#1890ff] text-xs" title="Admin"></i>' : ''}
                    </h4>
                    <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">${App.ui.formatDate(post.createdAt)}</span>
                </div>
            </div>
            
            ${(isAuthor || isAdmin) ? `
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="App.community.openCreatePostModal('${post.id}')" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#1890ff] rounded-lg transition-colors"><i class="fas fa-pen text-xs"></i></button>
                <button onclick="App.community.deletePost('${post.id}', '${community.id}')" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg transition-colors"><i class="fas fa-trash text-xs"></i></button>
            </div>` : ''}
        </div>

        <div class="pl-0 md:pl-[52px]">
            ${post.title ? `<h3 class="font-bold text-slate-900 dark:text-white mb-2 text-lg leading-snug flex items-center gap-2">${isQuestion ? '<i class="fas fa-question-circle text-indigo-500"></i>' : ''}${post.title}</h3>` : ''}
            ${isQuestion && post.tags && post.tags.length > 0 ? `<div class="flex gap-2 mb-3">${post.tags.map(tag => `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-medium">${tag}</span>`).join('')}</div>` : ''}
            <div class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-4 font-medium">${post.content}</div>
            
            ${post.image ? `
            <div class="mb-4 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800">
                <img src="${post.image}" class="w-full max-h-[500px] object-cover hover:scale-[1.01] transition-transform duration-500 cursor-zoom-in" onclick="window.open(this.src)">
            </div>` : ''}

            <div class="flex items-center gap-6 pt-2 border-t border-gray-50 dark:border-slate-800">
                <button onclick="App.community.handleLike('${post.id}')" class="flex items-center gap-2 text-sm font-bold ${isLike ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-500'} transition-colors group/like btn-ghost px-2 py-1 -ml-2">
                    <i class="${isLike ? 'fas' : 'far'} fa-heart group-active/like:scale-125 transition-transform"></i>
                    <span id="likes-count-${post.id}">${post.likes || 0}</span>
                </button>
                
                ${post.allowComments !== false ? `
                <button onclick="App.community.toggleComments('${post.id}')" class="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#1890ff] transition-colors group/comment btn-ghost px-2 py-1">
                    <i class="far fa-comment-alt"></i> 
                    <span>${commentsCount > 0 ? `${commentsCount}` : 'Comentar'}</span>
                </button>` : `<span class="text-xs text-slate-400 italic ml-auto font-bold"><i class="fas fa-lock mr-1"></i> Cerrado</span>`}
            </div>

            <div id="comments-${post.id}" class="hidden pt-4 mt-2 animate-fade-in">
                <div class="flex gap-3 mb-4">
                    <img src="${user.avatar}" class="w-8 h-8 rounded-full bg-gray-100">
                    <div class="flex-1 relative">
                        <input type="text" id="comment-input-${post.id}" 
                               placeholder="Escribe una respuesta..." 
                               class="w-full input-zen px-4 py-2 text-sm pr-10" 
                               onkeydown="if(event.key==='Enter') App.community.addComment('${post.id}')">
                        <button onclick="App.community.addComment('${post.id}')" class="absolute right-2 top-1.5 text-[#1890ff] p-1.5 rounded-lg transition-colors">
                            <i class="fas fa-paper-plane text-xs"></i>
                        </button>
                    </div>
                </div>

                <div class="space-y-3 max-h-80 overflow-y-auto custom-scrollbar" id="comments-list-${post.id}">
                    ${(post.comments || []).map(c => `
                        <div class="flex gap-3 group/comment">
                            <img src="${c.authorAvatar}" class="w-7 h-7 rounded-full bg-gray-100 mt-1">
                            <div class="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl rounded-tl-none flex-1">
                                <div class="flex justify-between items-baseline mb-1">
                                    <span class="text-xs font-bold text-slate-900 dark:text-white">${c.authorName}</span>
                                    <span class="text-[10px] text-slate-400 font-medium">Ahora</span>
                                </div>
                                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${c.content}</p>
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
    <div class="max-w-4xl mx-auto space-y-8 animate-fade-in pt-2">
        <div class="card-zen overflow-hidden relative">
            ${isAdmin ? `<div class="absolute top-4 right-4 z-20"><button onclick="App.community.openLiveConfigModal()" class="bg-white/90 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-white"><i class="fas fa-cog"></i> Configurar</button></div>` : ''}
            ${liveConfig.active ? _renderActiveLiveHero(liveConfig) : _renderEmptyLiveHero(isAdmin)}
        </div>
        ${recordings.length > 0 ? `
        <div class="pt-4">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide opacity-50">Grabaciones Anteriores</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${recordings.map(r => `
                <div class="card-zen overflow-hidden group cursor-pointer hover:-translate-y-1">
                    <div class="aspect-video bg-black relative">
                        <img src="https://img.youtube.com/vi/${r.videoUrl.split('v=')[1]?.split('&')[0] || r.videoUrl.split('/').pop()}/mqdefault.jpg" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                        <div class="absolute inset-0 flex items-center justify-center"><i class="fas fa-play text-white text-2xl drop-shadow-lg opacity-80 group-hover:opacity-100"></i></div>
                    </div>
                    <div class="p-3"><h4 class="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 mb-1">${r.title}</h4><span class="text-[10px] text-slate-400">${App.ui.formatDate(r.date)}</span></div>
                </div>`).join('')}
            </div>
        </div>` : ''}
    </div>`;

    if (liveConfig.active && liveConfig.date) _initLiveCountdown(liveConfig.date);
}

function _renderActiveLiveHero(session) {
    return `
    <div class="aspect-video bg-black relative group flex items-center justify-center">
        <div class="absolute inset-0 bg-cover bg-center opacity-40 blur-lg" style="background-image: url('${session.imageUrl || 'https://via.placeholder.com/1280x720'}');"></div>
        <div class="relative z-10 text-center text-white p-8 w-full">
            <span class="inline-flex items-center gap-2 bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest mb-4 animate-pulse"><span class="w-1.5 h-1.5 bg-white rounded-full"></span> En Vivo</span>
            <h1 class="text-2xl md:text-4xl font-heading font-bold mb-2 text-shadow-lg">${session.title}</h1>
            <p class="text-sm text-slate-200 mb-6 font-medium">${session.description || 'La clase comenzará en breve.'}</p>
            <div id="live-timer" class="flex justify-center gap-4 mb-8"></div>
            ${session.youtubeId ? `<div class="w-full max-w-2xl mx-auto aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20"><iframe src="https://www.youtube.com/embed/${session.youtubeId}?autoplay=1&mute=1" class="w-full h-full" frameborder="0" allowfullscreen></iframe></div>` : `<a href="${session.zoomLink}" target="_blank" class="btn-primary px-6 py-3 shadow-xl inline-flex items-center gap-2"><i class="fas fa-video"></i> Unirse a la Sesión</a>`}
        </div>
    </div>`;
}

function _renderEmptyLiveHero(isAdmin) {
    return `
    <div class="p-16 text-center">
        <div class="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 text-2xl"><i class="fas fa-video-slash"></i></div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-1">No hay eventos en vivo</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Estamos preparando las próximas masterclasses.</p>
        ${isAdmin ? `<button onclick="App.community.openLiveConfigModal()" class="btn-primary px-5 py-2 text-xs">Programar Evento</button>` : ''}
    </div>`;
}

// ============================================================================
// 6. INYECCION MODALES Y HANDLERS
// ============================================================================

function _injectModals(community, user) {
    const container = document.getElementById('comm-modals-container');
    if (!container) return;

    let modalsHtml = `
    <!-- A. Modal Crear Post (Zen) -->
    <div id="create-post-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="App.community.closeCreatePostModal()"></div>
        <div class="card-zen w-full max-w-lg shadow-float relative z-10 flex flex-col max-h-[90vh]">
            <div class="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-2xl">
                <h3 id="modal-post-title" class="font-bold text-slate-900 dark:text-white">Crear Publicación</h3>
                <button onclick="App.community.closeCreatePostModal()"><i class="fas fa-times text-slate-400"></i></button>
            </div>
            <div class="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <input type="hidden" id="cp-cid" value="${community.id}">
                <input type="text" id="cp-title" class="w-full input-zen p-3 font-bold" placeholder="Título del post...">
                <textarea id="cp-content" rows="5" class="w-full input-zen p-3 resize-none" placeholder="Escribe tu contenido..."></textarea>
                <div class="flex gap-2 items-center">
                    <label class="cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3 hover:bg-gray-100 flex-1 text-center text-xs text-slate-500 font-bold transition-colors"><i class="fas fa-image mr-2"></i> Subir Imagen <input type="file" id="cp-file" class="hidden" accept="image/*" onchange="App.community.handleFileSelect(this)"></label>
                    <input type="text" id="cp-url" class="w-1/3 input-zen p-3 text-xs" placeholder="O URL de imagen...">
                </div>
                <div id="cp-preview-container" class="hidden mt-2 relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden"><img id="cp-preview" class="w-full h-full object-cover"><button onclick="App.community.clearPreview()" class="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center"><i class="fas fa-times text-xs"></i></button></div>
                <div class="flex items-center gap-2 pt-1"><input type="checkbox" id="cp-allow-comments" class="accent-[#1890ff] cursor-pointer" checked> <label for="cp-allow-comments" class="text-xs font-bold text-slate-500 cursor-pointer">Permitir Comentarios</label></div>
            </div>
            <div class="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end"><button onclick="App.community.submitPost()" id="btn-submit-post" class="btn-primary px-8 py-2.5 text-sm shadow-lg">Publicar</button></div>
        </div>
    </div>`;

    // B. Modal Crear Desafío (Solo Admins)
    modalsHtml += `
    <div id="create-challenge-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="App.community.closeChallengeModal()"></div>
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden max-h-[90vh]">
            <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex justify-between items-center">
                <h3 class="font-heading font-bold text-lg flex items-center gap-2" id="modal-challenge-title"><i class="fas fa-trophy text-yellow-200"></i> Crear Desafío</h3>
                <button onclick="App.community.closeChallengeModal()" class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"><i class="fas fa-times text-sm"></i></button>
            </div>
            <div class="p-6 space-y-5 bg-gray-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar">
                <input type="hidden" id="ch-is-edit" value="false">
                <input type="hidden" id="ch-id" value="">
                <input type="hidden" id="ch-cid" value="${community.id}">
                
                <div>
                    <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Tema (Color)</label>
                    <select id="ch-topic" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none">
                        <option value="General">General (Azul)</option>
                        <option value="Python">Python (Amarillo)</option>
                        <option value="SQL">SQL Server (Rojo)</option>
                        <option value="Power BI">Power BI (Naranja)</option>
                        <option value="Excel">Excel (Verde)</option>
                        <option value="Machine Learning">IA / ML (Violeta)</option>
                    </select>
                </div>

                <div>
                    <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Pregunta del Desafío</label>
                    <input type="text" id="ch-question" class="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 font-bold text-sm bg-white dark:bg-slate-900 dark:text-white" placeholder="Ej: ¿Qué comando filtra filas en SQL?">
                </div>
                
                <div class="space-y-2">
                    <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Opciones de Respuesta</label>
                    <div class="flex gap-2"><span class="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold dark:text-slate-400">A</span><input type="text" id="ch-opt1" class="flex-1 p-2 rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm" placeholder="Opción A"></div>
                    <div class="flex gap-2"><span class="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold dark:text-slate-400">B</span><input type="text" id="ch-opt2" class="flex-1 p-2 rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm" placeholder="Opción B"></div>
                    <div class="flex gap-2"><span class="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold dark:text-slate-400">C</span><input type="text" id="ch-opt3" class="flex-1 p-2 rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm" placeholder="(Opcional)"></div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Respuesta Correcta</label>
                        <select id="ch-correct" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none">
                            <option value="0">Opción A</option>
                            <option value="1">Opción B</option>
                            <option value="2">Opción C</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Duración</label>
                        <select id="ch-duration" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm font-bold shadow-sm outline-none">
                            <option value="1">1 hora</option>
                            <option value="6">6 horas</option>
                            <option value="12">12 horas</option>
                            <option value="24" selected>24 horas</option>
                            <option value="48">48 horas</option>
                            <option value="72">72 horas</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="text-[10px] font-bold uppercase text-slate-500 mb-1 block ml-1">Explicación (se muestra al terminar)</label>
                    <textarea id="ch-explanation" rows="2" class="w-full p-2.5 rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm resize-none" placeholder="¿Por qué es esa la respuesta correcta?"></textarea>
                </div>
            </div>
            <div class="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
                <button onclick="App.community.closeChallengeModal()" class="btn-ghost px-6 py-2.5 text-sm">Cancelar</button>
                <button onclick="App.community.saveChallenge()" id="btn-save-challenge" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all">Lanzar Desafío</button>
            </div>
        </div>
    </div>`;

    if (user.role === 'admin') {
        // B. Modal Live
        modalsHtml += `
        <div id="live-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="App.community.closeLiveModal()"></div>
            <div class="card-zen w-full max-w-md shadow-float relative z-10">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center"><h3 class="font-bold text-slate-900">Evento en Vivo</h3><button onclick="App.community.closeLiveModal()"><i class="fas fa-times text-slate-400"></i></button></div>
                <div class="p-6 space-y-4"><input type="hidden" id="live-cid" value="${community.id}"><input type="text" id="live-title" class="w-full input-zen p-2.5 text-sm" placeholder="Título"><input type="text" id="live-yt-id" class="w-full input-zen p-2.5 text-sm" placeholder="YouTube ID"><input type="datetime-local" id="live-date" class="w-full input-zen p-2.5 text-sm"><div class="flex items-center gap-2"><input type="checkbox" id="live-active" class="accent-green-500"><label for="live-active" class="text-sm font-bold text-slate-700">Activar Streaming</label></div><button onclick="App.community.saveLiveConfig()" class="btn-primary w-full py-2.5 text-sm">Guardar</button></div>
            </div>
        </div>`;

        // C. Modal Editar Comunidad (BRANDING UPDATE)
        modalsHtml += `
        <div id="edit-community-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="App.community.closeEditCommunityModal()"></div>
            <div class="card-zen w-full max-w-lg shadow-float relative z-10 flex flex-col max-h-[90vh]">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center"><h3 class="font-bold text-slate-900">Editar Comunidad</h3><button onclick="App.community.closeEditCommunityModal()"><i class="fas fa-times text-slate-400"></i></button></div>
                <div class="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <input type="hidden" id="ec-id" value="${community.id}">
                    <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Nombre</label><input type="text" id="ec-name" value="${community.name}" class="w-full input-zen p-2.5 text-sm"></div>
                    <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Descripción</label><textarea id="ec-desc" rows="3" class="w-full input-zen p-2.5 text-sm">${community.description || ''}</textarea></div>
                    
                    <!-- NEW: BRANDING -->
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Logo & Identidad</label>
                        <div class="flex gap-2 mb-2">
                            <input type="text" id="ec-logo" value="${community.logoUrl || ''}" class="flex-1 input-zen p-2 text-xs" placeholder="URL Logo">
                            <label class="cursor-pointer bg-white border px-3 flex items-center rounded hover:bg-gray-50"><i class="fas fa-upload text-xs"></i><input type="file" class="hidden" onchange="App.community.handleLogoSelect(this)"></label>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="ec-show-title" class="accent-[#1890ff]" ${community.showTitle !== false ? 'checked' : ''}>
                            <label for="ec-show-title" class="text-xs text-slate-600 cursor-pointer">Mostrar Título</label>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Precio</label><input type="number" id="ec-price" value="${community.price || 0}" class="w-full input-zen p-2.5 text-sm"></div>
                        <div class="space-y-1"><label class="text-xs font-bold text-slate-500 uppercase">Privacidad</label><select id="ec-private" class="w-full input-zen p-2.5 text-sm"><option value="false" ${!community.isPrivate ? 'selected' : ''}>Público</option><option value="true" ${community.isPrivate ? 'selected' : ''}>Privado</option></select></div>
                    </div>
                    <button onclick="App.community.saveCommunityConfig()" class="btn-primary w-full py-3 text-sm mt-2">Guardar Cambios</button>
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
    const m = document.getElementById('create-post-modal'); if (!m) return;
    window.App.communityState.isEditing = !!postId; window.App.communityState.editingPostId = postId;
    if (postId) {
        const post = window.App.currentFeed.find(p => p.id === postId);
        if (post) {
            document.getElementById('cp-title').value = post.title || ''; document.getElementById('cp-content').value = post.content || ''; document.getElementById('cp-url').value = post.image || '';
            const prev = document.getElementById('cp-preview');
            if (post.image) { prev.src = post.image; document.getElementById('cp-preview-container').classList.remove('hidden'); } else { document.getElementById('cp-preview-container').classList.add('hidden'); }
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
    } catch (e) { console.error(e); App.ui.toast("Error al procesar", "error"); } finally { btn.disabled = false; btn.innerHTML = window.App.communityState.isEditing ? 'Guardar Cambios' : 'Publicar Ahora'; }
};

App.community.deletePost = async (pid, cid) => {
    if (!confirm("¿Estás seguro de eliminar esta publicación?")) return;
    try {
        await window.F.deleteDoc(window.F.doc(window.F.db, "posts", pid));
        const el = document.getElementById(`post-${pid}`); if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }
        App.ui.toast("Publicación eliminada", "success");
    } catch (e) { App.ui.toast("Error al eliminar", "error"); }
};

App.community.handleLike = async (postId) => {
    const post = window.App.currentFeed.find(p => p.id === postId); if (!post) return;
    const uid = App.state.currentUser.uid;
    const isLiked = (post.likedBy || []).includes(uid);
    if (isLiked) { post.likes--; post.likedBy = post.likedBy.filter(id => id !== uid); } else { post.likes++; if (!post.likedBy) post.likedBy = []; post.likedBy.push(uid); }

    const countEl = document.getElementById(`likes-count-${postId}`); if (countEl) countEl.innerText = post.likes;
    const btn = countEl?.parentElement; if (btn) { btn.classList.toggle('text-red-500', !isLiked); btn.classList.toggle('text-slate-500', isLiked); }
    try { await window.F.updateDoc(window.F.doc(window.F.db, "posts", postId), { likes: post.likes, likedBy: post.likedBy }); } catch (e) { console.error(e); }
};

App.community.toggleComments = (id) => {
    const el = document.getElementById(`comments-${id}`); if (el) { el.classList.toggle('hidden'); if (!el.classList.contains('hidden')) { setTimeout(() => document.getElementById(`comment-input-${id}`).focus(), 100); } }
};

App.community.addComment = async (pid) => {
    const input = document.getElementById(`comment-input-${pid}`); const txt = input.value.trim(); if (!txt) return;
    const comment = { id: 'cm_' + Date.now(), authorId: App.state.currentUser.uid, authorName: App.state.currentUser.name, authorAvatar: App.state.currentUser.avatar, content: txt, createdAt: new Date().toISOString() };
    const html = `<div class="flex gap-3 group/comment animate-fade-in"><img src="${comment.authorAvatar}" class="w-7 h-7 rounded-full bg-gray-100 mt-1"><div class="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl rounded-tl-none flex-1"><div class="flex justify-between items-baseline mb-1"><span class="text-xs font-bold text-slate-900 dark:text-white">${comment.authorName}</span><span class="text-[10px] text-slate-400 font-medium">Ahora</span></div><p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${comment.content}</p></div></div>`;
    const list = document.getElementById(`comments-list-${pid}`); list.insertAdjacentHTML('beforeend', html); list.scrollTop = list.scrollHeight; input.value = '';
    try { await window.F.updateDoc(window.F.doc(window.F.db, "posts", pid), { comments: window.F.arrayUnion(comment) }); } catch (e) { console.error(e); }
};


// Handlers Admin
App.community.openLiveConfigModal = () => document.getElementById('live-modal').classList.remove('hidden');
App.community.closeLiveModal = () => document.getElementById('live-modal').classList.add('hidden');
App.community.openEditCommunityModal = () => { document.getElementById('edit-community-modal').classList.remove('hidden'); App.community.toggleSettings(); };
App.community.closeEditCommunityModal = () => document.getElementById('edit-community-modal').classList.add('hidden');

// Challenge Modal Handlers
App.community.openChallengeModal = () => {
    const modal = document.getElementById('create-challenge-modal');
    if (modal) {
        // Reset form
        document.getElementById('ch-is-edit').value = 'false';
        document.getElementById('ch-id').value = '';
        document.getElementById('ch-question').value = '';
        document.getElementById('ch-opt1').value = '';
        document.getElementById('ch-opt2').value = '';
        document.getElementById('ch-opt3').value = '';
        document.getElementById('ch-explanation').value = '';
        document.getElementById('ch-topic').value = 'General';
        document.getElementById('ch-correct').value = '0';
        document.getElementById('ch-duration').value = '24';
        document.getElementById('modal-challenge-title').innerHTML = '<i class="fas fa-trophy text-yellow-200"></i> Crear Desafío';
        document.getElementById('btn-save-challenge').innerText = 'Lanzar Desafío';
        modal.classList.remove('hidden');
    }
};

App.community.closeChallengeModal = () => {
    const modal = document.getElementById('create-challenge-modal');
    if (modal) modal.classList.add('hidden');
};

App.community.saveChallenge = async () => {
    const cid = document.getElementById('ch-cid').value;
    const question = document.getElementById('ch-question').value.trim();
    const topic = document.getElementById('ch-topic').value;
    const durationHours = parseInt(document.getElementById('ch-duration').value);
    const btn = document.getElementById('btn-save-challenge');

    if (!question) return App.ui.toast("La pregunta es requerida", "warning");

    const opts = [
        document.getElementById('ch-opt1').value.trim(),
        document.getElementById('ch-opt2').value.trim(),
        document.getElementById('ch-opt3').value.trim()
    ].filter(Boolean);

    if (opts.length < 2) return App.ui.toast("Mínimo 2 opciones requeridas", "warning");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';

    try {
        const isEdit = document.getElementById('ch-is-edit').value === 'true';
        const challengeId = isEdit ? document.getElementById('ch-id').value : 'ch_' + Date.now();
        const expiresAt = new Date(Date.now() + durationHours * 36e5).toISOString();

        const newChallenge = {
            id: challengeId,
            question,
            topic,
            options: opts,
            correctIndex: parseInt(document.getElementById('ch-correct').value),
            explanation: document.getElementById('ch-explanation').value.trim(),
            expiresAt,
            votes: {},
            stats: new Array(opts.length).fill(0),
            totalVotes: 0,
            archived: false,
            createdAt: new Date().toISOString()
        };

        await window.F.updateDoc(window.F.doc(window.F.db, "communities", cid), { activeChallenge: newChallenge });

        // Update cache
        if (!App.state.cache.communities[cid]) App.state.cache.communities[cid] = {};
        App.state.cache.communities[cid].activeChallenge = newChallenge;

        App.ui.toast(isEdit ? "Desafío actualizado" : "¡Desafío lanzado!", "success");
        App.community.closeChallengeModal();

        // Reload community to show new challenge
        const hash = window.location.hash.split('/');
        const tab = hash[2] || 'inicio';
        App.renderCommunity(cid, tab);

    } catch (e) {
        console.error(e);
        App.ui.toast("Error al guardar desafío", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Lanzar Desafío';
    }
};

App.community.voteChallenge = async (cid, chId, optionIndex) => {
    const user = App.state.currentUser;
    if (!user) return App.ui.toast("Inicia sesión para votar", "error");

    try {
        // Optimistic UI update
        const card = document.getElementById(`challenge-${chId}`);
        if (card) {
            card.style.opacity = '0.7';
            card.style.pointerEvents = 'none';
        }

        // Get fresh data from Firestore
        const docRef = window.F.doc(window.F.db, "communities", cid);
        const snap = await window.F.getDoc(docRef);

        if (!snap.exists()) throw new Error("Comunidad no encontrada");

        const data = snap.data();
        const challenge = data.activeChallenge;

        if (!challenge || challenge.id !== chId) {
            App.ui.toast("El desafío ha cambiado", "info");
            const hash = window.location.hash.split('/');
            App.renderCommunity(cid, hash[2] || 'inicio');
            return;
        }

        // Check if already voted
        if (challenge.votes && challenge.votes[user.uid] !== undefined) {
            App.ui.toast("Ya habías votado", "info");
            const hash = window.location.hash.split('/');
            App.renderCommunity(cid, hash[2] || 'inicio');
            return;
        }

        // Prepare vote data
        const currentStats = challenge.stats || new Array(challenge.options?.length || 3).fill(0);
        const newStats = [...currentStats];
        newStats[optionIndex] = (newStats[optionIndex] || 0) + 1;
        const newTotal = (challenge.totalVotes || 0) + 1;

        // Write to Firestore
        await window.F.updateDoc(docRef, {
            [`activeChallenge.votes.${user.uid}`]: optionIndex,
            [`activeChallenge.stats`]: newStats,
            [`activeChallenge.totalVotes`]: newTotal
        });

        // Update local cache
        if (App.state.cache.communities[cid] && App.state.cache.communities[cid].activeChallenge) {
            App.state.cache.communities[cid].activeChallenge.votes[user.uid] = optionIndex;
            App.state.cache.communities[cid].activeChallenge.stats = newStats;
            App.state.cache.communities[cid].activeChallenge.totalVotes = newTotal;
        }

        App.ui.toast("¡Voto registrado!", "success");

        // Reload to show results
        const hash = window.location.hash.split('/');
        App.renderCommunity(cid, hash[2] || 'inicio');

    } catch (e) {
        console.error("Error al votar:", e);
        App.ui.toast("No se pudo registrar el voto", "error");
        const hash = window.location.hash.split('/');
        App.renderCommunity(cid, hash[2] || 'inicio');
    }
};

App.community.archiveChallenge = async (cid) => {
    if (!confirm("¿Archivar este desafío?")) return;
    try {
        const docRef = window.F.doc(window.F.db, "communities", cid);
        const snap = await window.F.getDoc(docRef);
        if (snap.exists() && snap.data().activeChallenge) {
            const ch = snap.data().activeChallenge;
            ch.archived = true;
            await window.F.updateDoc(docRef, { activeChallenge: ch });

            if (App.state.cache.communities[cid]) App.state.cache.communities[cid].activeChallenge = ch;
            App.ui.toast("Desafío archivado", "success");
            const hash = window.location.hash.split('/');
            App.renderCommunity(cid, hash[2] || 'inicio');
        }
    } catch (e) {
        console.error(e);
        App.ui.toast("Error al archivar", "error");
    }
};

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
    } catch (e) { App.ui.toast("Error al guardar", "error"); }
};

App.community.saveCommunityConfig = async () => {
    const cid = document.getElementById('ec-id').value;
    const data = {
        name: document.getElementById('ec-name').value,
        description: document.getElementById('ec-desc').value,
        logoUrl: document.getElementById('ec-logo').value, // Nuevo
        showTitle: document.getElementById('ec-show-title').checked, // Nuevo
        price: document.getElementById('ec-price').value,
        isPrivate: document.getElementById('ec-private').value === 'true'
    };
    try {
        await App.api.updateCommunity(cid, data);
        App.ui.toast("Comunidad actualizada", "success"); App.community.closeEditCommunityModal(); App.renderCommunity(cid);
    } catch (e) { console.error(e); App.ui.toast("Error al guardar", "error"); }
};

function _initLiveCountdown(dateIso) {
    const el = document.getElementById('live-timer'); if (!el || !dateIso) return;
    const target = new Date(dateIso).getTime(); if (window.liveInterval) clearInterval(window.liveInterval);
    const update = () => {
        const now = new Date().getTime(); const diff = target - now;
        if (diff <= 0) { el.innerHTML = '<div class="text-xl font-bold animate-pulse text-red-500 bg-white/10 p-2 rounded">¡EN VIVO!</div>'; clearInterval(window.liveInterval); return; }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24)); const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const box = (val, label) => `<div class="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 text-center"><div class="text-2xl font-bold text-white">${val < 10 ? '0' + val : val}</div><div class="text-[9px] uppercase tracking-widest text-slate-300">${label}</div></div>`;
        el.innerHTML = box(d, 'Días') + box(h, 'Horas') + box(m, 'Min');
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
            const banner = document.querySelector('.bg-gradient-to-r'); if (banner) banner.remove();
            clearInterval(window.trialInterval);
            return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const timerSpan = document.getElementById('trial-timer');
        if (timerSpan) timerSpan.innerText = `${d}d ${h}h restantes`;
    };
    update();
    window.trialInterval = setInterval(update, 1000);
}

// ============================================================================
// CHALLENGE HELPERS
// ============================================================================

window.App.community.timers = window.App.community.timers || {};

function _isChallengeActive(ch) {
    if (!ch || ch.archived) return false;
    const expiry = new Date(ch.expiresAt);
    const now = new Date();
    if (isNaN(expiry.getTime())) return false;
    // Activo si no ha expirado O si expiró hace menos de 24 horas (para ver resultados)
    const diffHours = (now - expiry) / 36e5;
    return expiry > now || diffHours < 24;
}

function _initChallengeTimer(expiresAt, chId) {
    const elId = `timer-${chId}`;
    if (!expiresAt) return;

    if (window.App.community.timers[chId]) clearInterval(window.App.community.timers[chId]);

    const update = () => {
        const timerEl = document.getElementById(elId);
        if (!timerEl) {
            clearInterval(window.App.community.timers[chId]);
            return;
        }

        const expiry = new Date(expiresAt).getTime();
        const diff = expiry - Date.now();

        if (diff <= 0) {
            timerEl.innerText = "FIN";
            clearInterval(window.App.community.timers[chId]);
            return;
        }

        const h = Math.floor(diff / 36e5);
        const m = Math.floor((diff % 36e5) / 6e4);
        const s = Math.floor((diff % 6e4) / 1e3);
        timerEl.innerText = `${h}h ${m}m ${s}s`;
    };

    update();
    window.App.community.timers[chId] = setInterval(update, 1000);
}

function _renderChallengeCard(challenge, user, cid) {
    const t = (challenge.topic || '').toLowerCase();
    let theme = { gradient: 'from-[#1890ff] via-blue-600 to-indigo-600', icon: 'fa-code', text: 'text-white' };

    if (t.includes('sql')) theme = { gradient: 'from-red-500 via-red-600 to-rose-600', icon: 'fa-database', text: 'text-white' };
    else if (t.includes('python')) theme = { gradient: 'from-amber-400 via-amber-500 to-yellow-500', icon: 'fa-brands fa-python', text: 'text-slate-900' };
    else if (t.includes('excel')) theme = { gradient: 'from-emerald-500 via-green-600 to-teal-600', icon: 'fa-file-excel', text: 'text-white' };
    else if (t.includes('bi')) theme = { gradient: 'from-yellow-500 via-orange-500 to-orange-600', icon: 'fa-chart-bar', text: 'text-white' };
    else if (t.includes('ai') || t.includes('ml') || t.includes('machine')) theme = { gradient: 'from-violet-500 via-purple-600 to-indigo-600', icon: 'fa-brain', text: 'text-white' };

    let hasVoted = false;
    let userVoteIdx = -1;
    if (challenge.votes && challenge.votes[user.uid] !== undefined) {
        hasVoted = true;
        userVoteIdx = challenge.votes[user.uid];
    }

    const isExpired = new Date() > new Date(challenge.expiresAt);
    const totalVotes = challenge.totalVotes || 0;
    const isAdmin = user.role === 'admin';
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
                        </div>
                        <h2 class="font-heading font-bold text-lg leading-tight ${textColor} text-shadow-sm">
                            ${isExpired ? 'Resultados Finales' : 'Desafío en Curso'}
                        </h2>
                    </div>
                </div>
                
                <div class="flex items-center gap-2">
                    ${isAdmin && !isExpired ? `<button onclick="App.community.archiveChallenge('${cid}')" class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-red-500/50 transition-colors" title="Archivar"><i class="fas fa-times ${textColor} text-sm"></i></button>` : ''}
                    <div class="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex flex-col items-center min-w-[70px]">
                        <span class="text-[8px] uppercase tracking-widest ${textColor} opacity-80 mb-0.5 font-bold">Tiempo</span>
                        <span id="timer-${challenge.id}" class="font-mono font-bold text-sm leading-none tracking-tight ${textColor}">${isExpired ? 'FIN' : '...'}</span>
                    </div>
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
        const percent = totalVotes > 0 ? Math.round((challenge.stats[idx] / totalVotes) * 100) : 0;
        const isCorrect = idx === challenge.correctIndex;
        const isUserVote = hasVoted && userVoteIdx === idx;

        if (!showResult) {
            return `
                        <button onclick="App.community.voteChallenge('${cid}', '${challenge.id}', ${idx})" 
                            class="w-full text-left p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1890ff] dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group/opt relative overflow-hidden shadow-sm active:scale-[0.99]">
                            <span class="relative z-10 font-bold text-slate-700 dark:text-slate-200 text-sm pl-2 border-l-4 border-transparent group-hover/opt:border-[#1890ff] block transition-colors">${opt}</span>
                        </button>`;
        } else {
            const barColor = isCorrect
                ? 'bg-emerald-500'
                : (isUserVote && !isCorrect ? 'bg-red-400' : 'bg-slate-200 dark:bg-slate-700');
            const borderColor = isCorrect
                ? 'border-emerald-500'
                : (isUserVote ? 'border-blue-500' : 'border-slate-100 dark:border-slate-800');

            return `
                        <div class="w-full p-4 rounded-xl border-2 ${borderColor} bg-white dark:bg-slate-900 relative overflow-hidden">
                            <div class="absolute inset-0 ${barColor} opacity-20" style="width: ${percent}%"></div>
                            <div class="relative z-10 flex justify-between items-center">
                                <span class="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2">
                                    ${opt}
                                    ${isCorrect ? '<i class="fas fa-check-circle text-emerald-500"></i>' : ''}
                                    ${isUserVote ? '<span class="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">TU VOTO</span>' : ''}
                                </span>
                                <span class="font-bold text-sm ${isCorrect ? 'text-emerald-600' : 'text-slate-500'}">${percent}%</span>
                            </div>
                        </div>`;
        }
    }).join('')}
            </div>

            ${(hasVoted || isExpired) && challenge.explanation ? `
            <div class="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <p class="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                    <i class="fas fa-lightbulb mr-2"></i>${challenge.explanation}
                </p>
            </div>` : ''}

            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span><i class="fas fa-users mr-1"></i>${totalVotes} voto${totalVotes !== 1 ? 's' : ''}</span>
                ${isExpired ? '<span class="text-amber-600 font-bold">Desafío finalizado</span>' : ''}
            </div>
        </div>
    </div>`;
}