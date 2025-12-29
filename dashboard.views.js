/**
 * dashboard.views.js (V10.4 - FINAL FIXES)
 * Dashboard Global: Feed, Eventos y Recomendaciones.
 * * CORRECCIONES V10.4:
 * - Widget "Comunidad Sugerida" implementado y funcional.
 * - Fix Z-Index: Modales ahora aparecen correctamente sobre la interfaz.
 * - Fix Feed: Lógica de carga de posts robustecida para evitar el estado "Cargando" eterno.
 */

window.App = window.App || {};
window.App.dashboard = window.App.dashboard || {};

// ==========================================
// 1. RENDERIZADOR PRINCIPAL (LAYOUT)
// ==========================================
window.App.renderDashboard = async (forceTab = null) => {
    const user = App.state.currentUser;
    if (!user) return; 

    // 1. Configuración Inicial
    const hasCommunities = user.joinedCommunities && user.joinedCommunities.length > 0;
    const activeTab = forceTab || (hasCommunities ? 'feed' : 'explore');

    // 2. Render Sidebar
    const sidebarHTML = App.sidebar && App.sidebar.render ? App.sidebar.render('#home') : '';
    const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
    if (isPinned) document.body.classList.add('sidebar-is-pinned');

    // 3. Estructura Principal
    const html = `
        <div class="h-screen w-full bg-[#F0F2F5] overflow-hidden flex font-sans">
            ${sidebarHTML}

            <main class="flex-1 flex flex-col relative transition-all duration-300 min-w-0">
                
                <!-- HEADER FLOTANTE -->
                <header class="h-[80px] px-8 flex items-center justify-between shrink-0 z-30 sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 transition-all">
                    
                    <!-- IZQUIERDA: SALUDO + NAVEGACIÓN (TABS) -->
                    <div class="flex items-center gap-8 animate-enter">
                        <div>
                            <h1 class="text-xl font-heading font-bold text-slate-900 tracking-tight">
                                ${activeTab === 'feed' ? `Hola, ${user.name.split(' ')[0]} 👋` : 'Explorar Catálogo'}
                            </h1>
                            <p class="text-xs text-slate-500 font-medium mt-0.5 tracking-wide">
                                ${activeTab === 'feed' ? 'Tu centro de aprendizaje y comunidad.' : 'Descubre nuevas rutas de conocimiento.'}
                            </p>
                        </div>

                        <!-- Selector de Vistas (Tabs) - A LA IZQUIERDA -->
                        <div class="hidden md:flex bg-slate-100/80 p-1 rounded-xl items-center shadow-inner relative">
                            <button onclick="App.renderDashboard('explore')" 
                                class="px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 relative z-10 ${activeTab === 'explore' ? 'bg-white text-[#1890ff] shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}">
                                <i class="fas fa-compass"></i> Explorar
                            </button>
                            <button onclick="App.renderDashboard('feed')" 
                                class="px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 relative z-10 ${activeTab === 'feed' ? 'bg-white text-[#1890ff] shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}">
                                <i class="fas fa-stream"></i> Tu Feed
                            </button>
                        </div>
                    </div>

                    <!-- DERECHA: ACCIONES -->
                    <div class="flex items-center gap-5">
                        
                        <!-- Botón Admin / Post Global -->
                        <button onclick="App.dashboard.openPostModal()" class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-[#1890ff] transition-colors shadow-lg hover:shadow-blue-500/30 active:scale-95" title="Crear Publicación">
                            <i class="fas fa-plus"></i>
                        </button>
                        
                        <!-- Perfil Mini -->
                        <button onclick="App.dashboard.openProfileModal()" class="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1890ff] transition-all">
                            <img src="${user.avatar}" class="w-full h-full object-cover">
                        </button>
                    </div>
                </header>

                <!-- CONTENIDO SCROLLABLE -->
                <div class="flex-1 overflow-y-auto custom-scrollbar p-8 w-full" id="dashboard-content">
                    ${App.ui.skeleton('card')}
                </div>
            </main>
        </div>

        <!-- MODALES GLOBALES (Z-INDEX 200 CORREGIDO) -->
        ${_renderPostModal()}
        ${_renderProfileModal(user)}
        ${_renderEditPostModal()} 
    `;

    await App.render(html);
    if (App.sidebar && App.sidebar.loadData) App.sidebar.loadData(user);
    
    // 4. Carga de Pestañas
    if (activeTab === 'explore') {
        await App.dashboard.loadExploreTab(user);
    } else {
        await App.dashboard.loadFeedTab(user);
    }
};

// ==========================================
// 2. CONTROLADORES DE PESTAÑAS (LOGIC)
// ==========================================
Object.assign(App.dashboard, {

    // --- TAB: EXPLORAR ---
    loadExploreTab: async (user) => {
        try {
            const container = document.getElementById('dashboard-content');
            if(!container) return;

            const allCommunities = await App.api.getCommunities();
            
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-enter pb-20">
                    ${allCommunities.map(c => _renderExploreCard(c, user)).join('')}
                </div>
            `;
        } catch (e) {
            console.error("Explore Error:", e);
            App.ui.toast("Error cargando comunidades", "error");
        }
    },

    // --- TAB: FEED (Live Events + Smart Continue + Suggestions) ---
    loadFeedTab: async (user) => {
        try {
            const container = document.getElementById('dashboard-content');
            if(!container) return;

            const allCommunities = await App.api.getCommunities();
            const joinedIds = user.joinedCommunities || [];
            
            // Filtro: Solo comunidades unidas (o todas si es admin)
            const myCommunities = user.role === 'admin' 
                ? allCommunities 
                : allCommunities.filter(c => joinedIds.includes(c.id));

            // 1. Encontrar eventos Live (Global)
            const liveCandidates = user.role === 'admin' ? allCommunities : myCommunities;
            let featuredLive = null;
            const now = new Date();
            const upcomingLives = [];

            liveCandidates.forEach(c => {
                if (c.nextLiveSession && c.nextLiveSession.date) {
                    const liveDate = new Date(c.nextLiveSession.date);
                    const diff = liveDate - now;
                    // Si es futuro o pasó hace menos de 2 horas
                    if (diff > -7200000) { 
                        upcomingLives.push({
                            communityId: c.id,
                            communityName: c.name,
                            ...c.nextLiveSession,
                            isLiveNow: diff <= 0
                        });
                    }
                }
            });

            upcomingLives.sort((a, b) => {
                if (a.isLiveNow && !b.isLiveNow) return -1;
                if (!a.isLiveNow && b.isLiveNow) return 1;
                return new Date(a.date) - new Date(b.date);
            });

            if (upcomingLives.length > 0) featuredLive = upcomingLives[0];

            // 2. Encontrar Comunidad Sugerida (Flag isSuggested)
            // Priorizamos las marcadas como sugeridas que el usuario NO ha unido
            const suggestedComm = allCommunities.find(c => c.isSuggested === true && !joinedIds.includes(c.id));

            // Si no tiene comunidades y no hay lives, mostrar Empty State
            if (myCommunities.length === 0 && user.role !== 'admin' && !featuredLive) {
                container.innerHTML = _renderEmptyState();
                return;
            }

            // 3. Calcular Smart Continue Global
            const smartNext = _calculateGlobalSmartContinue(user, myCommunities);

            // 4. Renderizar Layout Bento
            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-enter pb-24 max-w-7xl mx-auto">
                    
                    <!-- COLUMNA PRINCIPAL (8/12) -->
                    <div class="lg:col-span-8 space-y-8">
                        
                        <!-- WIDGET LIVE GLOBAL -->
                        ${featuredLive ? _renderGlobalLiveBanner(featuredLive) : ''}

                        <!-- WIDGET SMART CONTINUE -->
                        <section>
                            ${_renderSmartContinueWidget(smartNext)}
                        </section>

                        <!-- FEED STREAM -->
                        <section>
                            <div class="flex items-center justify-between mb-4 px-1">
                                <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <i class="fas fa-rss text-[#1890ff]"></i> Actividad Reciente
                                </h2>
                            </div>
                            <div id="feed-list" class="space-y-6">
                                ${App.ui.skeleton('card')}
                            </div>
                        </section>
                    </div>

                    <!-- COLUMNA LATERAL (4/12) -->
                    <div class="lg:col-span-4 space-y-6 sticky top-6">
                        
                        <!-- Widget: Comunidad Sugerida (NUEVO) -->
                        ${suggestedComm ? _renderSuggestedCommunityWidget(suggestedComm) : ''}

                        <!-- Widget: Próximos Lives -->
                        <div class="bento-card p-6 bg-white border border-slate-200">
                            <h3 class="font-heading font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                                <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                                Agenda en Vivo
                            </h3>
                            <div id="lives-widget-list" class="space-y-3">
                                ${upcomingLives.length > 0 
                                    ? upcomingLives.slice(0, 3).map(l => _renderSmallLiveItem(l)).join('') 
                                    : '<p class="text-xs text-slate-400 italic text-center py-2">Sin eventos próximos.</p>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 5. Cargar Datos Asíncronos (Posts)
            _loadPostsForFeed(myCommunities, user);

        } catch (e) {
            console.error("Feed Error:", e);
        }
    }
});

// ==========================================
// 3. LÓGICA DE NEGOCIO
// ==========================================

function _calculateGlobalSmartContinue(user, communities) {
    const joinedIds = user.joinedCommunities || [];
    const completedIds = user.completedModules || [];

    for (const community of communities) {
        if (!community.courses) continue;
        const access = App.api.checkAccess(user, community.id);
        if (!access.allowed) continue;

        for (const course of community.courses) {
            const classes = course.classes || [];
            if (classes.length === 0) continue;
            const firstPendingClass = classes.find(c => !completedIds.includes(`${community.id}_${c.id}`));

            if (firstPendingClass) {
                const idx = classes.indexOf(firstPendingClass);
                const progress = Math.round((idx / classes.length) * 100);
                
                return {
                    type: 'continue',
                    communityId: community.id,
                    communityName: community.name,
                    courseId: course.id,
                    courseTitle: course.title,
                    classTitle: firstPendingClass.title,
                    classIndex: idx + 1,
                    totalClasses: classes.length,
                    image: course.image || community.image,
                    progress: progress
                };
            }
        }
    }
    if (joinedIds.length > 0) return { type: 'all_done' };
    return { type: 'new_user' };
}

// ==========================================
// 4. ACCIONES SOCIALES (MODALES FIX)
// ==========================================
Object.assign(App.dashboard, {

    openPostModal: () => {
        // Uso de _toggleModal con lógica de espera
        _toggleModal('post', true);
        const select = document.getElementById('post-community-select');
        if (select) {
            App.api.getCommunities().then(all => {
                const user = App.state.currentUser;
                let valid = user.role === 'admin' ? all : all.filter(c => (user.joinedCommunities||[]).includes(c.id));
                select.innerHTML = '<option value="" disabled selected>Selecciona una comunidad...</option>' + 
                    valid.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            });
        }
    },
    closePostModal: () => _toggleModal('post', false),

    submitPost: async () => {
        const btn = document.getElementById('btn-submit-post');
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const communityId = document.getElementById('post-community-select').value;
        const fileInput = document.getElementById('post-file-input');
        const urlInput = document.getElementById('post-image-url');

        if(!communityId || !content) return App.ui.toast("El contenido es obligatorio", "error");
        
        btn.disabled = true; btn.innerHTML = "Publicando...";

        try {
            let img = null;
            if (fileInput.files[0]) {
                img = await App.api.fileToBase64(fileInput.files[0]);
            } else if (urlInput.value) {
                img = urlInput.value;
            }

            await App.api.createPost({
                communityId, title, content, image: img, isOfficial: false,
                authorId: App.state.currentUser.uid,
                author: { name: App.state.currentUser.name, avatar: App.state.currentUser.avatar }
            });
            
            App.ui.toast("Publicado con éxito", "success");
            App.dashboard.closePostModal();
            document.getElementById('post-title').value = '';
            document.getElementById('post-content').value = '';
            
            App.renderDashboard('feed'); 
        } catch(e) { 
            console.error(e);
            App.ui.toast("Error al publicar", "error"); 
        } finally { 
            btn.disabled = false; btn.innerHTML = "Publicar"; 
        }
    },

    previewFile: async (inputId, imgId, areaId, placeholderId) => {
        const fileInput = document.getElementById(inputId);
        if(!fileInput || !fileInput.files[0]) return;
        try {
            const b64 = await App.api.fileToBase64(fileInput.files[0]);
            if(document.getElementById(imgId)) document.getElementById(imgId).src = b64;
            if(areaId) document.getElementById(areaId).classList.remove('hidden');
            if(placeholderId) document.getElementById(placeholderId).classList.add('hidden');
        } catch(e) { console.error(e); }
    },
    
    previewUrl: (url, imgId, areaId, placeholderId) => {
        if(url && areaId) {
            const img = document.getElementById(imgId);
            if(img) img.src = url;
            document.getElementById(areaId).classList.remove('hidden');
            if(placeholderId) document.getElementById(placeholderId).classList.add('hidden');
        }
    },

    handleLike: async (postId) => { 
        await App.api.toggleLike(postId); 
        App.renderDashboard('feed'); 
    },

    toggleComments: (id) => {
        const el = document.getElementById(`dash-comments-${id}`);
        if(el) el.classList.toggle('hidden');
    },

    submitComment: async (e, postId) => {
        e.preventDefault();
        const input = e.target.comment;
        const text = input.value.trim();
        if(!text) return;
        App.ui.toast("Comentario enviado (Simulado)", "success");
        input.value = '';
    },

    openProfileModal: () => _toggleModal('profile', true),
    closeProfileModal: () => _toggleModal('profile', false),
    saveProfile: async () => {
        const name = document.getElementById('profile-name').value;
        if(!name) return;
        try {
            await App.api.updateProfile(App.state.currentUser.uid, { name });
            App.ui.toast("Perfil actualizado", "success");
            App.dashboard.closeProfileModal();
            App.renderDashboard();
        } catch(e) { App.ui.toast("Error", "error"); }
    },

    openEditModal: (id, content) => {
        _toggleModal('dash-edit', true);
        document.getElementById('dash-edit-post-id').value = id;
        document.getElementById('dash-edit-content').value = decodeURIComponent(content);
    },
    closeEditModal: () => _toggleModal('dash-edit', false),
    saveEditPost: async () => {
        const id = document.getElementById('dash-edit-post-id').value;
        const content = document.getElementById('dash-edit-content').value;
        try {
            await App.api.updatePost(id, { content });
            App.ui.toast("Post actualizado", "success");
            App.dashboard.closeEditModal();
            App.renderDashboard('feed');
        } catch(e) { App.ui.toast("Error", "error"); }
    }
});

// ==========================================
// 5. COMPONENTES VISUALES
// ==========================================

function _renderGlobalLiveBanner(live) {
    const isLive = live.isLiveNow;
    const badge = isLive 
        ? `<span class="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold animate-pulse shadow-lg shadow-red-500/40">🔴 EN VIVO AHORA</span>`
        : `<span class="bg-black text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"><i class="far fa-calendar-alt mr-1"></i> Próximo Live</span>`;
    
    const timeText = isLive 
        ? '¡La sesión ha comenzado! Únete ahora.' 
        : `Comienza: ${App.ui.formatDate(live.date)}`;

    return `
    <div class="relative w-full rounded-2xl overflow-hidden shadow-xl group cursor-pointer" onclick="window.location.hash='#community/${live.communityId}/live'">
        <!-- Background -->
        <div class="absolute inset-0 bg-slate-900">
            ${live.imageUrl ? `<img src="${live.imageUrl}" class="w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-opacity">` : ''}
            <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
        </div>
        
        <!-- Content -->
        <div class="relative p-8 md:p-10 flex flex-col justify-center h-full min-h-[240px]">
            <div class="flex items-center gap-3 mb-4">
                ${badge}
                <span class="text-white/80 text-xs font-bold uppercase tracking-wider bg-white/10 px-2 py-1 rounded backdrop-blur-md border border-white/10">${live.communityName}</span>
            </div>
            
            <h2 class="text-3xl md:text-4xl font-heading font-extrabold text-white mb-2 max-w-2xl leading-tight">${live.title}</h2>
            <p class="text-slate-300 text-sm md:text-base font-medium mb-6 flex items-center gap-2">
                <i class="far fa-clock"></i> ${timeText}
            </p>
            
            <div>
                <button class="bg-[#1890ff] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2 transform active:scale-95">
                    ${isLive ? '<i class="fas fa-play"></i> Entrar a la Sala' : '<i class="fas fa-bell"></i> Ver Detalles'}
                </button>
            </div>
        </div>
    </div>`;
}

// NUEVO: WIDGET DE COMUNIDAD SUGERIDA
function _renderSuggestedCommunityWidget(c) {
    return `
    <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm relative group mb-6">
        <div class="bg-gradient-to-r from-[#1890ff] to-blue-600 p-4 text-white flex justify-between items-center">
            <h3 class="font-bold text-sm flex items-center gap-2"><i class="fas fa-star text-yellow-300"></i> Recomendado</h3>
        </div>
        <div class="p-5">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-12 h-12 rounded-xl bg-blue-50 text-[#1890ff] flex items-center justify-center text-xl shadow-sm border border-blue-100">
                    <i class="fas ${c.icon || 'fa-users'}"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-900 text-sm leading-tight group-hover:text-[#1890ff] transition-colors">${c.name}</h4>
                    <span class="text-[10px] text-slate-400 font-bold uppercase">${c.category || 'General'}</span>
                </div>
            </div>
            <p class="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">${c.description || 'Únete para aprender más sobre este tema.'}</p>
            <button onclick="window.location.hash='#landing/${c.id}'" class="w-full py-2 bg-slate-50 text-slate-700 font-bold text-xs rounded-lg hover:bg-[#1890ff] hover:text-white transition-all border border-slate-100 hover:border-transparent">
                Ver Comunidad
            </button>
        </div>
    </div>`;
}

function _renderSmallLiveItem(live) {
    return `
    <a href="#community/${live.communityId}/live" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
        <div class="w-10 h-10 rounded-lg ${live.isLiveNow ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'} flex flex-col items-center justify-center border border-transparent group-hover:border-slate-200 shrink-0">
            <i class="fas fa-video text-sm ${live.isLiveNow ? 'animate-pulse' : ''}"></i>
        </div>
        <div class="min-w-0">
            <h4 class="text-xs font-bold text-slate-900 truncate group-hover:text-[#1890ff] transition-colors">${live.title}</h4>
            <p class="text-[10px] text-slate-400 truncate">${App.ui.formatDate(live.date)}</p>
        </div>
    </a>`;
}

function _renderSmartContinueWidget(data) {
    if (data.type === 'new_user') {
        return `
        <div class="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg group">
            <div class="relative z-10 max-w-lg">
                <h2 class="text-2xl font-heading font-extrabold mb-2">Comienza tu viaje</h2>
                <p class="text-slate-300 mb-6 text-sm leading-relaxed">Únete a tu primera comunidad para acceder a contenido premium.</p>
                <button onclick="App.renderDashboard('explore')" class="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-slate-100 transition-all text-sm">Explorar Catálogo</button>
            </div>
            <i class="fas fa-rocket text-8xl absolute -right-6 -bottom-6 opacity-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-500"></i>
        </div>`;
    }
    if (data.type === 'all_done') {
        return `<div class="bg-emerald-50 text-emerald-900 p-6 rounded-2xl flex items-center gap-4 border border-emerald-100"><i class="fas fa-check-circle text-3xl text-emerald-500"></i><div><h2 class="text-lg font-bold">¡Todo al día!</h2><p class="text-sm opacity-80">Has completado tus pendientes.</p></div></div>`;
    }
    return `
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row cursor-pointer group relative"
         onclick="window.location.hash='#community/${data.communityId}/clases/${data.courseId}'">
        <div class="absolute top-0 left-0 bg-[#1890ff] w-1 h-full"></div>
        <div class="w-full md:w-1/3 lg:w-[200px] h-40 md:h-auto relative bg-slate-900 overflow-hidden">
            ${data.image ? `<img src="${data.image}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700">` : ''}
            <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                <div class="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-[#1890ff] shadow-lg transform scale-90 group-hover:scale-110 transition-transform"><i class="fas fa-play ml-1 text-xs"></i></div>
            </div>
        </div>
        <div class="p-6 flex-1 flex flex-col justify-center">
            <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] font-bold text-[#1890ff] uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">Continuar</span>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${data.communityName}</span>
            </div>
            <h3 class="text-lg font-heading font-bold text-slate-900 mb-1 group-hover:text-[#1890ff] transition-colors line-clamp-1">${data.classTitle}</h3>
            <p class="text-xs text-slate-500 font-medium mb-4">${data.courseTitle} • Clase ${data.classIndex}</p>
            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1">
                <div class="bg-gradient-to-r from-[#1890ff] to-blue-400 h-full rounded-full" style="width: ${data.progress}%"></div>
            </div>
        </div>
    </div>`;
}

function _renderExploreCard(c, user) {
    const isJoined = user.joinedCommunities && user.joinedCommunities.includes(c.id);
    const access = App.api.checkAccess(user, c.id);
    
    let actionBtn;
    if (isJoined) {
        if (access.allowed) {
            actionBtn = `<button class="w-full py-2.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors">Ingresar</button>`;
        } else {
            actionBtn = `<button class="w-full py-2.5 rounded-lg bg-red-50 text-red-500 font-bold text-xs border border-red-100">Expirado</button>`;
        }
    } else {
        actionBtn = `<button class="w-full py-2.5 rounded-lg bg-[#1890ff] text-white font-bold text-xs shadow-md hover:bg-blue-600 transition-colors">Ver Detalles</button>`;
    }
    
    const clickAction = isJoined && access.allowed ? `window.location.hash='#community/${c.id}'` : `window.location.hash='#landing/${c.id}'`;

    return `
    <div class="bento-card group flex flex-col h-full bg-white hover:border-[#1890ff] transition-colors cursor-pointer" onclick="${clickAction}">
        <div class="h-32 relative overflow-hidden border-b border-slate-100 bg-slate-50">
            ${c.logoUrl ? `<img src="${c.logoUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">` : ''}
            ${isJoined ? `<div class="absolute top-3 right-3 bg-white/90 backdrop-blur text-[#1890ff] px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase"><i class="fas fa-check-circle"></i> Miembro</div>` : ''}
        </div>
        <div class="p-5 flex-1 flex flex-col">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-lg bg-blue-50 text-[#1890ff] flex items-center justify-center text-lg shadow-sm border border-blue-100">
                    <i class="fas ${c.icon || 'fa-users'}"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-900 text-sm leading-tight group-hover:text-[#1890ff] transition-colors">${c.name}</h3>
                    <span class="text-[10px] text-slate-400 font-bold uppercase">${c.category || 'General'}</span>
                </div>
            </div>
            <p class="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">${c.description || 'Sin descripción.'}</p>
            <div class="mt-auto pt-4 border-t border-slate-50">${actionBtn}</div>
        </div>
    </div>`;
}

function _renderBentoPost(post, user) {
    const isLiked = post.likedBy && post.likedBy.includes(user.uid);
    const comments = post.comments || [];
    const cName = post.communityData ? post.communityData.name : 'Comunidad';
    
    return `
    <div class="bento-card p-6 bg-white border border-slate-200/60 hover:border-slate-300 transition-colors relative">
        <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-[#1890ff] flex items-center justify-center text-lg shadow-sm">
                    <i class="fas ${post.communityData?.icon || 'fa-users'}"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-900 text-sm leading-tight">${cName}</h4>
                    <div class="flex gap-2 items-center">
                        <span class="text-[10px] text-slate-400 font-bold">${post.author?.name || 'Usuario'}</span>
                        <span class="text-[10px] text-slate-300">•</span>
                        <span class="text-[10px] text-slate-400 font-medium">${App.ui.formatDate(post.createdAt)}</span>
                    </div>
                </div>
            </div>
            ${user.role === 'admin' ? `
            <button onclick="App.dashboard.openEditModal('${post.id}', '${encodeURIComponent(post.content)}')" class="text-slate-300 hover:text-slate-600"><i class="fas fa-ellipsis-h"></i></button>` : ''}
        </div>
        <div class="pl-[52px]">
            ${post.title ? `<h3 class="text-base font-heading font-bold text-slate-900 mb-2">${post.title}</h3>` : ''}
            <p class="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-line">${post.content}</p>
            ${post.image ? `<div class="rounded-xl overflow-hidden border border-slate-100 mb-4 shadow-sm relative group cursor-pointer"><img src="${post.image}" class="w-full max-h-80 object-cover"></div>` : ''}
            <div class="flex items-center gap-6 pt-2 border-t border-slate-50">
                 <button onclick="App.dashboard.handleLike('${post.id}')" class="flex items-center gap-2 text-xs font-bold transition-colors py-1 px-2 rounded-lg hover:bg-slate-50 ${isLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart text-sm"></i> <span>${post.likes || 0}</span>
                </button>
                <button onclick="App.dashboard.toggleComments('${post.id}')" class="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#1890ff] transition-colors py-1 px-2 rounded-lg hover:bg-slate-50">
                    <i class="far fa-comment-alt text-sm"></i> <span>${comments.length}</span>
                </button>
            </div>
            <div id="dash-comments-${post.id}" class="hidden mt-4 pt-4 border-t border-slate-50 space-y-3 animate-fade-in">
                 ${comments.length > 0 ? comments.slice(0,3).map(c => `
                    <div class="flex gap-3 text-xs">
                        <img src="${c.authorAvatar || 'https://ui-avatars.com/api/?name=U'}" class="w-6 h-6 rounded-full bg-slate-100 object-cover">
                        <div class="bg-slate-50 px-3 py-2 rounded-2xl rounded-tl-none text-slate-700 flex-1 border border-slate-100">
                            <span class="font-bold text-slate-900 block text-[10px] mb-0.5">${c.authorName}</span>
                            ${c.content}
                        </div>
                    </div>`).join('') : ''}
                 <form onsubmit="App.dashboard.submitComment(event, '${post.id}')" class="flex gap-2 mt-2 items-center">
                    <img src="${user.avatar}" class="w-6 h-6 rounded-full bg-slate-100 object-cover opacity-50">
                    <input name="comment" class="flex-1 bg-transparent border-b border-slate-200 py-1.5 text-xs outline-none focus:border-[#1890ff] transition-colors placeholder-slate-400" placeholder="Escribe una respuesta...">
                    <button class="text-[#1890ff] font-bold text-xs hover:underline">Enviar</button>
                 </form>
            </div>
        </div>
    </div>`;
}

function _renderEmptyState(type = 'default') {
    if (type === 'news') {
        return `
        <div class="p-8 text-center border-dashed border-2 border-slate-200 rounded-2xl bg-slate-50/50">
            <i class="far fa-newspaper text-slate-300 text-3xl mb-3"></i>
            <p class="text-slate-500 text-xs font-medium">Todo tranquilo en el feed.</p>
        </div>`;
    }
    return `
    <div class="flex flex-col items-center justify-center py-20 text-center animate-enter">
        <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-3xl text-[#1890ff] shadow-sm ring-8 ring-blue-50/50"><i class="fas fa-rocket"></i></div>
        <h2 class="text-2xl font-heading font-bold text-slate-900 mb-2">¡Tu viaje comienza aquí!</h2>
        <p class="text-slate-500 max-w-sm mb-8 text-sm">Aún no te has unido a ninguna comunidad. Explora el catálogo para empezar.</p>
        <button onclick="App.renderDashboard('explore')" class="bg-[#1890ff] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2">
            Explorar Comunidades <i class="fas fa-arrow-right"></i>
        </button>
    </div>`;
}

// Helpers Modales (Reutilizados del código original para mantener funcionalidad)
function _toggleModal(name, show) {
    const m = document.getElementById(`${name}-modal`);
    const p = document.getElementById(`${name}-panel`);
    const b = document.getElementById('modal-overlay'); // Asumiendo overlay global en index.html
    if(!m) return;
    if(show) {
        m.classList.remove('hidden');
        if(b) b.classList.remove('hidden', 'opacity-0');
        requestAnimationFrame(() => {
            if(p) { p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100'); }
        });
    } else {
        if(p) { p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0'); }
        if(b) b.classList.add('opacity-0');
        setTimeout(() => { m.classList.add('hidden'); if(b) b.classList.add('hidden'); }, 300);
    }
}

// 6. HELPERS AUXILIARES (FIX FEED LOADING)
async function _loadPostsForFeed(communities, user) {
    const feedList = document.getElementById('feed-list');
    if(!feedList) return;

    let globalFeed = [];
    
    // Ejecución paralela
    await Promise.all(communities.map(async (c) => {
        try {
            const posts = await App.api.getPosts(c.id, 'all'); 
            posts.forEach(p => p.communityData = { name: c.name, id: c.id, icon: c.icon });
            globalFeed.push(...posts);
        } catch (err) {
            console.warn(`Error fetching posts for community ${c.id}:`, err);
        }
    }));
    
    // Ordenar y Limitar
    globalFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    globalFeed = globalFeed.slice(0, 15);

    // FIX: Siempre remover skeleton, incluso si está vacío
    if (globalFeed.length > 0) {
        feedList.innerHTML = globalFeed.map(post => _renderBentoPost(post, user)).join('');
    } else {
        feedList.innerHTML = _renderEmptyState('news');
    }
}

// Funciones de Renderizado de Modales (Z-Index Actualizado a 200)
function _renderPostModal() {
    return `<div id="post-modal" class="fixed inset-0 z-[200] hidden flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm"><div id="post-panel" class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 flex flex-col max-h-[90vh]"><div class="p-6 border-b border-slate-100 flex justify-between items-center"><h2 class="text-lg font-heading font-bold text-slate-900">Crear Publicación</h2><button onclick="App.dashboard.closePostModal()"><i class="fas fa-times"></i></button></div><div class="p-8 space-y-6 overflow-y-auto"><div class="space-y-2"><label class="text-xs font-bold text-slate-400 uppercase">Comunidad</label><select id="post-community-select" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"></select></div><div class="space-y-4"><input type="text" id="post-title" class="w-full px-0 py-2 bg-transparent border-b border-slate-200 font-bold text-xl outline-none" placeholder="Título..."><textarea id="post-content" rows="5" class="w-full p-4 bg-slate-50 border-none rounded-xl outline-none resize-none text-sm" placeholder="Contenido..."></textarea></div><div class="flex items-center gap-4"><button onclick="document.getElementById('post-file-input').click()" class="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200"><i class="fas fa-image"></i> Imagen</button><input type="file" id="post-file-input" class="hidden" accept="image/*"><input type="text" id="post-image-url" class="flex-1 px-3 py-2 bg-transparent border-b border-slate-200 text-xs outline-none" placeholder="URL Imagen..."></div></div><div class="p-6 border-t border-slate-100 flex justify-end gap-3"><button onclick="App.dashboard.closePostModal()" class="px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancelar</button><button onclick="App.dashboard.submitPost()" id="btn-submit-post" class="bg-[#1890ff] text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-600">Publicar</button></div></div></div>`;
}
function _renderEditPostModal() { return `<div id="dash-edit-modal" class="fixed inset-0 z-[200] hidden flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm"><div id="dash-edit-panel" class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 flex flex-col"><div class="p-6 border-b border-slate-100 flex justify-between items-center"><h2 class="text-lg font-bold">Editar</h2><button onclick="App.dashboard.closeEditModal()"><i class="fas fa-times"></i></button></div><div class="p-8"><input type="hidden" id="dash-edit-post-id"><textarea id="dash-edit-content" rows="8" class="w-full p-4 bg-slate-50 border-none rounded-xl outline-none resize-none text-sm"></textarea></div><div class="p-6 border-t border-slate-100 flex justify-end gap-3"><button onclick="App.dashboard.closeEditModal()" class="px-6 py-2 font-bold text-slate-500">Cancelar</button><button onclick="App.dashboard.saveEditPost()" id="btn-save-edit" class="bg-[#1890ff] text-white px-8 py-2 rounded-xl font-bold">Guardar</button></div></div></div>`; }
function _renderProfileModal(user) { return `<div id="profile-modal" class="fixed inset-0 z-[200] hidden flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm"><div id="profile-panel" class="bg-white w-full max-w-md rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 overflow-hidden"><div class="h-32 bg-gradient-to-r from-slate-800 to-slate-900 relative"><button onclick="App.dashboard.closeProfileModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center"><i class="fas fa-times"></i></button></div><div class="px-8 pb-8 -mt-12 relative"><div class="flex justify-center mb-6"><div class="relative group"><img src="${user.avatar}" class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl bg-white"><input type="file" id="profile-file-input" class="hidden"><label for="profile-file-input" class="absolute inset-0 cursor-pointer"></label></div></div><div class="space-y-5"><div class="text-center mb-6"><h2 class="text-xl font-bold">Tu Perfil</h2></div><div class="space-y-1"><label class="text-xs font-bold text-slate-900 uppercase">Nombre</label><input type="text" id="profile-name" value="${user.name}" class="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#1890ff]"></div><div class="space-y-1"><label class="text-xs font-bold text-slate-900 uppercase">Rol</label><input type="text" id="profile-role-desc" value="${user.roleDescription || ''}" class="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#1890ff]"></div><button onclick="App.dashboard.saveProfile()" id="btn-save-profile" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold shadow-lg mt-4">Guardar</button></div></div></div></div>`; }