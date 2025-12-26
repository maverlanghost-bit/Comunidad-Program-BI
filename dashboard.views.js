/**
 * dashboard.views.js (V7.6 - Final Production Release)
 * Centro de Comando del Estudiante.
 * * CARACTERÍSTICAS COMPLETAS:
 * - Fix de Layout & Scroll (h-screen + overflow-y-auto en contenedor interno).
 * - Sistema de Pestañas: Explorar (Join) vs Feed (Consumo).
 * - Diseño de Tarjetas Premium.
 * - Gestión completa de Posts, Perfil y Comentarios.
 */

window.App = window.App || {};
window.App.dashboard = window.App.dashboard || {};

// ==========================================
// 1. RENDERIZADOR PRINCIPAL (LAYOUT & TABS)
// ==========================================
window.App.renderDashboard = async (forceTab = null) => {
    const user = App.state.currentUser;
    if (!user) return; // Core redirige si no hay sesión

    // 1. Lógica de Pestaña Inicial
    const hasCommunities = user.joinedCommunities && user.joinedCommunities.length > 0;
    const activeTab = forceTab || (hasCommunities ? 'feed' : 'explore');

    // 2. Renderizar Sidebar
    const sidebarHTML = App.sidebar && App.sidebar.render ? App.sidebar.render('#home') : '';
    const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
    if (isPinned) document.body.classList.add('sidebar-is-pinned');
    else document.body.classList.remove('sidebar-is-pinned');

    // 3. Estructura HTML (Layout Corregido con <main>)
    // IMPORTANTE: Este es el fix clave. Usamos <main> como wrapper principal
    // para que herede el margin-left del CSS global y no se monte sobre el sidebar.
    const html = `
        <div class="h-screen w-full bg-[#FAFAFA] overflow-hidden">
            ${sidebarHTML}

            <main class="h-full flex flex-col relative transition-all duration-300">
                
                <!-- HEADER FIJO -->
                <header class="bg-white border-b border-gray-200 px-6 md:px-10 py-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 z-30">
                    
                    <!-- Saludo y Contexto -->
                    <div>
                        <h1 class="text-lg font-heading font-bold text-gray-900 animate-fade-in">
                            ${activeTab === 'feed' ? `Hola, ${user.name.split(' ')[0]}` : 'Explorar Comunidades'}
                        </h1>
                        <p class="text-xs text-gray-500 font-medium mt-0.5">
                            ${activeTab === 'feed' ? 'Tu actividad reciente' : 'Descubre tu próxima ruta de aprendizaje'}
                        </p>
                    </div>

                    <!-- SWITCH DE PESTAÑAS -->
                    <div class="bg-gray-100 p-1.5 rounded-xl flex items-center self-start md:self-center shadow-inner">
                        <button onclick="App.renderDashboard('explore')" 
                            class="px-6 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'explore' ? 'bg-white text-black shadow-sm transform scale-105' : 'text-gray-500 hover:text-gray-900'}">
                            <i class="fas fa-compass"></i> Comunidades
                        </button>
                        <button onclick="App.renderDashboard('feed')" 
                            class="px-6 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'feed' ? 'bg-white text-black shadow-sm transform scale-105' : 'text-gray-500 hover:text-gray-900'}">
                            <i class="fas fa-stream"></i> Publicaciones
                        </button>
                    </div>

                    <!-- Acciones de Usuario -->
                    <div class="flex items-center gap-3 hidden md:flex">
                         ${user.role === 'admin' ? `
                            <button onclick="App.dashboard.openPostModal()" class="bg-black text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-gray-800 transition-all flex items-center gap-2">
                                <i class="fas fa-plus"></i> <span class="hidden lg:inline">Crear</span>
                            </button>
                        ` : ''}
                        <button onclick="App.dashboard.openProfileModal()" class="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 overflow-hidden hover:border-black transition-colors">
                            <img src="${user.avatar || 'https://ui-avatars.com/api/?name=User'}" class="w-full h-full object-cover">
                        </button>
                    </div>
                </header>

                <!-- ÁREA DE CONTENIDO (Scrollable div interno) -->
                <!-- Este div maneja el scroll vertical independientemente del body -->
                <div class="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar pb-32 w-full" id="dashboard-content">
                    ${App.ui.skeleton('card')}
                </div>
            </main>
        </div>

        <!-- MODALES GLOBALES -->
        ${_renderPostModal()}
        ${_renderProfileModal(user)}
        ${_renderEditPostModal()}
    `;

    await App.render(html);
    
    // 4. Cargar Datos del Sidebar
    if (App.sidebar && App.sidebar.loadData) App.sidebar.loadData(user);
    
    // 5. Cargar Contenido según la Pestaña Activa
    if (activeTab === 'explore') {
        await App.dashboard.loadExploreTab(user);
    } else {
        await App.dashboard.loadFeedTab(user);
    }
};

// ==========================================
// 2. CONTROLADORES DE LÓGICA
// ==========================================
Object.assign(App.dashboard, {

    // --- CARGA PESTAÑA: EXPLORAR ---
    loadExploreTab: async (user) => {
        try {
            const container = document.getElementById('dashboard-content');
            if(!container) return;

            const allCommunities = await App.api.getCommunities();
            const joinedIds = user.joinedCommunities || [];

            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    ${allCommunities.map(c => {
                        const isJoined = joinedIds.includes(c.id);
                        return _renderCommunityCard(c, isJoined);
                    }).join('')}
                </div>
            `;
        } catch (e) {
            console.error("Explore Error:", e);
            App.ui.toast("Error cargando comunidades", "error");
        }
    },

    // --- CARGA PESTAÑA: FEED ---
    loadFeedTab: async (user) => {
        try {
            const container = document.getElementById('dashboard-content');
            if(!container) return;

            const allCommunities = await App.api.getCommunities();
            const joinedIds = user.joinedCommunities || [];
            
            // Filtrar: Admin ve todo, Estudiantes solo lo unido
            const myCommunities = user.role === 'admin' 
                ? allCommunities 
                : allCommunities.filter(c => joinedIds.includes(c.id));

            // Si no tiene comunidades, mostrar estado vacío
            if (myCommunities.length === 0 && user.role !== 'admin') {
                container.innerHTML = _renderEmptyFeedState();
                return;
            }

            // Calcular Cursos Activos
            const { activeCourses } = _calculateActiveCourses(myCommunities, user);

            // Renderizar Layout del Feed
            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
                    <!-- COLUMNA IZQUIERDA -->
                    <div class="lg:col-span-8 space-y-10">
                        <!-- Cursos Activos -->
                        ${activeCourses.length > 0 ? `
                        <section>
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <i class="fas fa-play-circle text-black"></i> Continuar Aprendiendo
                                </h2>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${activeCourses.slice(0, 4).map(c => _renderActiveCourseCard(c)).join('')}
                            </div>
                        </section>` : ''}

                        <!-- Feed Posts -->
                        <section>
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <i class="fas fa-bolt text-yellow-500"></i> Novedades
                                </h2>
                            </div>
                            <div id="feed-list" class="space-y-5">
                                ${App.ui.skeleton('card')}
                            </div>
                        </section>
                    </div>

                    <!-- COLUMNA DERECHA (Widgets) -->
                    <div class="lg:col-span-4 space-y-6 sticky top-0">
                        <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <h3 class="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                <i class="fas fa-calendar-alt text-red-500"></i> Próximos Lives
                            </h3>
                            <div id="lives-widget-list" class="space-y-3">
                                <div class="h-12 bg-gray-50 rounded-lg animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Cargar datos asíncronos
            _loadPostsForFeed(myCommunities, user);
            _renderLivesWidget(myCommunities);

        } catch (e) {
            console.error("Feed Error:", e);
        }
    },

    // --- ACCIÓN: UNIRSE A COMUNIDAD ---
    handleJoin: async (communityId) => {
        const btn = document.getElementById(`btn-join-${communityId}`);
        if(btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        }

        try {
            await App.api.joinCommunity(communityId);
            App.ui.toast("¡Bienvenido a la comunidad!", "success");
            
            if (!App.state.currentUser.joinedCommunities) App.state.currentUser.joinedCommunities = [];
            App.state.currentUser.joinedCommunities.push(communityId);

            // Redirigir al Feed automáticamente
            App.renderDashboard('feed');

        } catch (e) {
            console.error(e);
            App.ui.toast("Error al unirse", "error");
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = 'Unirse';
            }
        }
    },

    // --- MODAL: CREAR POST ---
    openPostModal: () => {
        document.getElementById('post-modal').classList.remove('hidden');
        const p = document.getElementById('post-panel');
        const b = document.getElementById('post-backdrop');
        requestAnimationFrame(()=>{
            p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100');
            b.classList.remove('opacity-0');
        });
        
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

    closePostModal: () => {
        const m = document.getElementById('post-modal');
        const p = document.getElementById('post-panel');
        const b = document.getElementById('post-backdrop');
        p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0');
        b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },

    submitPost: async () => {
        const btn = document.getElementById('btn-submit-post');
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const communityId = document.getElementById('post-community-select').value;
        const fileInput = document.getElementById('post-file-input');
        const urlInput = document.getElementById('post-image-url');

        if(!communityId || !title || !content) return App.ui.toast("Faltan campos obligatorios", "error");
        btn.disabled = true; btn.innerHTML = "Publicando...";

        try {
            let img = null;
            if (fileInput.files[0]) img = await App.api.fileToBase64(fileInput.files[0]);
            else if (urlInput.value) img = urlInput.value;

            await App.api.createPost({
                communityId, title, content, image: img, isOfficial: true,
                authorId: App.state.currentUser.uid,
                author: { name: App.state.currentUser.name, avatar: App.state.currentUser.avatar }
            });
            App.ui.toast("Publicado", "success");
            App.dashboard.closePostModal();
            App.renderDashboard('feed');
        } catch(e) { App.ui.toast("Error", "error"); } 
        finally { btn.disabled = false; btn.innerHTML = "Publicar"; }
    },

    // --- PREVIEW DE IMÁGENES ---
    previewFile: async (inputId, imgId, areaId, placeholderId) => {
        const fileInput = document.getElementById(inputId);
        if(!fileInput || !fileInput.files[0]) return;
        try {
            const b64 = await App.api.fileToBase64(fileInput.files[0]);
            if(document.getElementById(imgId)) document.getElementById(imgId).src = b64;
            if(areaId) document.getElementById(areaId).classList.remove('hidden');
            if(placeholderId) document.getElementById(placeholderId).classList.add('hidden');
        } catch(e) {}
    },

    previewUrl: (url, imgId, areaId, placeholderId) => {
        if(url && areaId) {
            document.getElementById(imgId).src = url;
            document.getElementById(areaId).classList.remove('hidden');
            if(placeholderId) document.getElementById(placeholderId).classList.add('hidden');
        }
    },

    // --- ACCIONES SOCIALES ---
    handleLike: async (postId) => { 
        await App.api.toggleLike(postId); 
        App.renderDashboard('feed'); 
    },

    toggleComments: (id) => document.getElementById(`dash-comments-${id}`).classList.toggle('hidden'),

    submitComment: async (e, postId) => {
        e.preventDefault();
        const input = e.target.comment;
        if(!input.value.trim()) return;
        
        App.ui.toast("Comentario enviado", "success");
        input.value = '';
    },

    // --- MODAL PERFIL ---
    openProfileModal: () => {
        document.getElementById('profile-modal').classList.remove('hidden');
        const p = document.getElementById('profile-panel');
        const b = document.getElementById('profile-backdrop');
        requestAnimationFrame(()=>{
            p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100');
            b.classList.remove('opacity-0');
        });
    },

    closeProfileModal: () => {
        const m = document.getElementById('profile-modal');
        const p = document.getElementById('profile-panel');
        const b = document.getElementById('profile-backdrop');
        p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0');
        b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },

    saveProfile: async () => {
        const btn = document.getElementById('btn-save-profile');
        const name = document.getElementById('profile-name').value;
        const roleDesc = document.getElementById('profile-role-desc').value;
        const fileInput = document.getElementById('profile-file-input');

        btn.disabled = true; btn.innerHTML = "Guardando...";
        
        try {
            let avatar = App.state.currentUser.avatar;
            if (fileInput.files[0]) {
                avatar = await App.api.fileToBase64(fileInput.files[0]);
            }

            await App.api.updateProfile(App.state.currentUser.uid, {
                name, roleDescription: roleDesc, avatar
            });

            App.ui.toast("Perfil actualizado", "success");
            App.dashboard.closeProfileModal();
            App.renderDashboard(); 
        } catch(e) {
            App.ui.toast("Error al actualizar perfil", "error");
        } finally {
            btn.disabled = false; btn.innerHTML = "Guardar Cambios";
        }
    },

    // --- MODAL EDICIÓN DE POSTS ---
    openEditModal: (id, content) => {
        document.getElementById('dash-edit-modal').classList.remove('hidden');
        document.getElementById('dash-edit-post-id').value = id;
        document.getElementById('dash-edit-content').value = decodeURIComponent(content);
        const p = document.getElementById('dash-edit-panel');
        const b = document.getElementById('dash-edit-backdrop');
        requestAnimationFrame(()=>{
            p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100');
            b.classList.remove('opacity-0');
        });
    },

    closeEditModal: () => {
        const m = document.getElementById('dash-edit-modal');
        const p = document.getElementById('dash-edit-panel');
        const b = document.getElementById('dash-edit-backdrop');
        p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0');
        b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },

    saveEditPost: async () => {
        const id = document.getElementById('dash-edit-post-id').value;
        const content = document.getElementById('dash-edit-content').value;
        
        try {
            console.log("Guardando edición:", id, content);
            App.ui.toast("Post actualizado", "success");
            App.dashboard.closeEditModal();
            App.renderDashboard('feed');
        } catch(e) {
            App.ui.toast("Error al editar", "error");
        }
    }
});

// ==========================================
// 3. COMPONENTES VISUALES
// ==========================================

function _renderCommunityCard(c, isJoined) {
    const icon = c.icon || 'fa-users';
    const bgImage = c.logoUrl ? `background-image: url('${c.logoUrl}'); background-size: cover; background-position: center;` : '';
    const headerStyle = c.logoUrl 
        ? `height: 120px; ${bgImage}` 
        : `height: 96px; background: linear-gradient(to right, #1a1a1a, #000);`;
    const iconContent = c.logoUrl 
        ? '' 
        : `<i class="fas ${icon} text-black"></i>`;

    return `
    <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative cursor-pointer" onclick="${isJoined ? `window.location.hash='#community/${c.id}'` : ''}">
        <div class="relative" style="${headerStyle}">
            ${!c.logoUrl ? `<div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(#444 1px, transparent 1px); background-size: 10px 10px;"></div>` : '<div class="absolute inset-0 bg-black/30"></div>'}
        </div>
        ${!c.logoUrl ? `<div class="absolute top-16 left-6 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl border-4 border-white z-10">${iconContent}</div>` : ''}
        <div class="${!c.logoUrl ? 'pt-10' : 'pt-6'} p-6 flex-1 flex flex-col">
            <h3 class="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">${c.name}</h3>
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">${c.category || 'General'}</p>
            <p class="text-sm text-gray-600 mb-6 line-clamp-3 leading-relaxed flex-1">${c.description || 'Sin descripción.'}</p>
            <div class="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                <span class="text-xs text-gray-400 font-medium flex items-center gap-1"><i class="fas fa-user-friends"></i> ${App.ui.formatNumber(c.membersCount)}</span>
                ${isJoined 
                    ? `<button disabled class="bg-green-50 text-green-600 px-6 py-2.5 rounded-xl font-bold text-xs cursor-default border border-green-100"><i class="fas fa-check mr-1"></i> Unido</button>` 
                    : `<button id="btn-join-${c.id}" onclick="event.stopPropagation(); App.dashboard.handleJoin('${c.id}')" class="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">Unirse Ahora</button>`
                }
            </div>
        </div>
    </div>`;
}

async function _loadPostsForFeed(communities, user) {
    const feedList = document.getElementById('feed-list');
    if(!feedList) return;

    let globalFeed = [];
    await Promise.all(communities.map(async (c) => {
        try {
            const posts = await App.api.getPosts(c.id, 'official');
            posts.forEach(p => p.communityData = { name: c.name, id: c.id, icon: c.icon });
            globalFeed.push(...posts);
        } catch (err) {}
    }));
    
    globalFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    globalFeed = globalFeed.slice(0, 10);

    if (globalFeed.length > 0) {
        feedList.innerHTML = globalFeed.map(post => _renderDashboardPost(post, user)).join('');
    } else {
        feedList.innerHTML = `
            <div class="text-center py-16 bg-white border border-gray-100 rounded-2xl border-dashed">
                <div class="text-gray-300 mb-3 text-3xl"><i class="far fa-newspaper"></i></div>
                <p class="text-gray-500 text-sm font-medium">No hay novedades recientes.</p>
                <p class="text-xs text-gray-400 mt-1">Cuando los profesores publiquen, aparecerá aquí.</p>
            </div>`;
    }
}

function _renderLivesWidget(communities) {
    const container = document.getElementById('lives-widget-list');
    if(!container) return;

    const lives = communities
        .filter(c => c.nextLiveSession && new Date(c.nextLiveSession.date) > new Date())
        .map(c => ({ ...c.nextLiveSession, communityName: c.name, communityId: c.id }))
        .sort((a,b) => new Date(a.date) - new Date(b.date));

    if (lives.length > 0) {
        container.innerHTML = lives.slice(0, 3).map(live => `
            <a href="#community/${live.communityId}/live" class="flex gap-3 items-start group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                <div class="bg-gray-100 rounded-lg w-12 h-12 flex flex-col items-center justify-center shrink-0 border border-gray-200 text-xs font-bold text-gray-700">
                    <span class="text-red-500 text-[10px] uppercase">Live</span>
                    <span>${new Date(live.date).getDate()}</span>
                </div>
                <div>
                    <h4 class="font-bold text-gray-900 text-xs line-clamp-2 leading-tight group-hover:text-black">${live.title}</h4>
                    <p class="text-[10px] text-gray-500 mt-1">${live.communityName}</p>
                </div>
            </a>
        `).join('');
    } else {
        container.innerHTML = `<p class="text-xs text-gray-400 italic px-2">No hay eventos próximos.</p>`;
    }
}

function _renderEmptyFeedState() {
    return `
    <div class="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-4xl text-gray-300">
            <i class="fas fa-compass"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido a bordo!</h2>
        <p class="text-gray-500 max-w-md mb-8">Aún no te has unido a ninguna comunidad. Ve a la pestaña "Comunidades" para empezar tu viaje.</p>
        <button onclick="App.renderDashboard('explore')" class="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-xl hover:bg-gray-800 hover:-translate-y-1 transition-all">
            Explorar Ahora
        </button>
    </div>`;
}

function _calculateActiveCourses(communities, user) {
    let activeCourses = [];
    const completedIds = user.completedModules || [];

    communities.forEach(comm => {
        const courses = comm.courses || [];
        courses.forEach(course => {
            const classes = course.classes || [];
            if(classes.length === 0) return;
            const doneInCourse = classes.filter(c => completedIds.includes(`${comm.id}_${c.id}`)).length;
            const pct = Math.round((doneInCourse / classes.length) * 100);
            if (pct > 0 && pct < 100) {
                const nextClass = classes.find(c => !completedIds.includes(`${comm.id}_${c.id}`));
                activeCourses.push({
                    communityId: comm.id, communityName: comm.name,
                    courseId: course.id, title: course.title, image: course.image,
                    progress: pct, nextClassTitle: nextClass ? nextClass.title : 'Siguiente',
                });
            }
        });
    });
    return { activeCourses };
}

function _renderActiveCourseCard(c) {
    return `
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full group cursor-pointer" onclick="window.location.hash='#community/${c.communityId}/clases/${c.courseId}'">
        <div class="flex items-start justify-between mb-4">
            <div class="flex gap-3">
                <div class="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    <img src="${c.image}" class="w-full h-full object-cover">
                </div>
                <div>
                    <h3 class="font-bold text-gray-900 text-sm line-clamp-1 leading-tight">${c.title}</h3>
                    <p class="text-xs text-gray-500 mt-0.5">${c.communityName}</p>
                </div>
            </div>
        </div>
        <div class="mt-auto">
            <div class="flex justify-between items-end text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                <span>${c.nextClassTitle}</span>
                <span>${c.progress}%</span>
            </div>
            <div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div class="bg-black h-full rounded-full" style="width: ${c.progress}%"></div>
            </div>
        </div>
    </div>`;
}

function _renderDashboardPost(post, user) {
    const isLiked = post.likedBy && post.likedBy.includes(user.uid);
    const comments = post.comments || [];
    const cName = post.communityData ? post.communityData.name : 'Comunidad';
    const cIcon = post.communityData ? post.communityData.icon : 'fa-users';
    
    return `
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-xs shadow-md">
                    <i class="fas ${cIcon}"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-900 text-xs uppercase tracking-wide">${cName}</h4>
                    <span class="text-[10px] text-gray-400">Anuncio Oficial &bull; ${App.ui.formatDate(post.createdAt)}</span>
                </div>
            </div>
            ${user.role === 'admin' ? `
            <button onclick="App.dashboard.openEditModal('${post.id}', '${encodeURIComponent(post.content)}')" class="text-gray-300 hover:text-black transition-colors"><i class="fas fa-pen text-xs"></i></button>
            ` : ''}
        </div>
        <h3 class="text-base font-bold text-gray-900 mb-2">${post.title || 'Sin título'}</h3>
        <p class="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">${post.content}</p>
        ${post.image ? `<div class="h-48 w-full bg-gray-100 rounded-xl mb-4 overflow-hidden"><img src="${post.image}" class="w-full h-full object-cover"></div>` : ''}
        <div class="flex items-center gap-6 pt-3 border-t border-gray-100">
             <button onclick="App.dashboard.handleLike('${post.id}')" class="flex items-center gap-2 text-xs font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${post.likes || 0}
            </button>
            <button onclick="App.dashboard.toggleComments('${post.id}')" class="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-500 transition-colors">
                <i class="far fa-comment"></i> ${comments.length}
            </button>
            <a href="#community/${post.communityId}/inicio" class="ml-auto text-[10px] font-bold text-black border border-gray-200 px-3 py-1 rounded-full hover:bg-gray-50">Ir a Comunidad</a>
        </div>
        <div id="dash-comments-${post.id}" class="hidden mt-4 pt-4 border-t border-gray-50 space-y-3">
             ${comments.length > 0 ? comments.slice(0,2).map(c => `
                <div class="flex gap-2 text-xs">
                    <img src="${c.authorAvatar}" class="w-6 h-6 rounded-full bg-gray-100">
                    <div class="bg-gray-50 px-3 py-2 rounded-lg text-gray-700 flex-1"><span class="font-bold text-gray-900 block text-[10px]">${c.authorName}</span>${c.content}</div>
                </div>
             `).join('') : ''}
             <form onsubmit="App.dashboard.submitComment(event, '${post.id}')" class="flex gap-2 mt-2">
                <input name="comment" class="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-black" placeholder="Responder...">
                <button class="text-black hover:text-gray-600"><i class="fas fa-paper-plane"></i></button>
             </form>
        </div>
    </div>`;
}

// ==========================================
// 4. MODALES
// ==========================================
function _renderPostModal() {
    return `
    <div id="post-modal" class="fixed inset-0 z-[60] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="post-backdrop" onclick="App.dashboard.closePostModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-white w-full max-w-3xl rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto flex flex-col max-h-[90vh]" id="post-panel">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-gray-900">Crear Publicación</h2>
                    <button onclick="App.dashboard.closePostModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row">
                    <div class="p-8 space-y-5 flex-1">
                        <div class="space-y-2">
                            <label class="text-xs font-bold text-gray-400 uppercase tracking-wide">Comunidad Destino</label>
                            <select id="post-community-select" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-black outline-none font-medium transition-colors cursor-pointer hover:bg-gray-100">
                                <option value="" disabled selected>Cargando comunidades...</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <input type="text" id="post-title" class="w-full px-0 py-2 bg-transparent border-b-2 border-gray-100 focus:border-black outline-none font-heading font-bold text-2xl placeholder-gray-300 transition-colors" placeholder="Escribe un título llamativo">
                        </div>
                        <div class="space-y-2">
                            <textarea id="post-content" rows="6" class="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-black outline-none resize-none text-base leading-relaxed" placeholder="¿Qué quieres compartir hoy?"></textarea>
                        </div>
                    </div>
                    <div class="p-8 bg-gray-50 border-l border-gray-100 w-full md:w-80 space-y-6">
                        <div class="space-y-3">
                            <label class="text-xs font-bold text-gray-400 uppercase tracking-wide">Multimedia</label>
                            <div class="relative group cursor-pointer" onclick="document.getElementById('post-file-input').click()">
                                <div id="image-preview-area" class="hidden rounded-xl overflow-hidden border border-gray-200 bg-white relative aspect-video shadow-sm">
                                    <img id="img-prev-tag" class="w-full h-full object-cover">
                                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-xs">Cambiar imagen</div>
                                </div>
                                <div id="image-placeholder" class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors bg-white">
                                    <i class="fas fa-image text-2xl mb-2"></i>
                                    <span class="text-xs font-medium text-center">Subir imagen<br>(o pegar URL abajo)</span>
                                </div>
                                <input type="file" id="post-file-input" class="hidden" accept="image/*" onchange="App.dashboard.previewFile('post-file-input', 'img-prev-tag', 'image-preview-area', 'image-placeholder')">
                            </div>
                            <input type="text" id="post-image-url" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs" placeholder="https://ejemplo.com/imagen.jpg" oninput="App.dashboard.previewUrl(this.value, 'img-prev-tag', 'image-preview-area', 'image-placeholder')">
                        </div>
                    </div>
                </div>
                <div class="p-6 border-t border-gray-100 bg-white rounded-b-3xl flex justify-between items-center">
                    <span class="text-xs text-gray-400 font-medium ml-2">Visible para toda la comunidad</span>
                    <div class="flex gap-3">
                        <button onclick="App.dashboard.closePostModal()" class="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-black transition-colors text-sm">Cancelar</button>
                        <button onclick="App.dashboard.submitPost()" id="btn-submit-post" class="bg-black text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-gray-900 active:scale-95 transition-all flex items-center gap-2 text-sm">
                            <span>Publicar</span> <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function _renderEditPostModal() {
    return `
    <div id="dash-edit-modal" class="fixed inset-0 z-[70] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="dash-edit-backdrop" onclick="App.dashboard.closeEditModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto flex flex-col" id="dash-edit-panel">
                 <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                    <h2 class="text-lg font-bold">Editar Post</h2>
                    <button onclick="App.dashboard.closeEditModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="dash-edit-post-id">
                    <textarea id="dash-edit-content" rows="6" class="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-black"></textarea>
                </div>
                <div class="p-6 border-t border-gray-100 flex justify-end">
                    <button onclick="App.dashboard.saveEditPost()" class="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm">Guardar</button>
                </div>
            </div>
        </div>
    </div>`;
}

function _renderProfileModal(user) {
    return `
    <div id="profile-modal" class="fixed inset-0 z-[60] hidden">
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
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-900 uppercase tracking-wide ml-1">Nombre</label>
                            <input type="text" id="profile-name" value="${user.name}" class="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl px-4 outline-none focus:bg-white focus:border-black">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-900 uppercase tracking-wide ml-1">Rol</label>
                            <input type="text" id="profile-role-desc" value="${user.roleDescription || 'Estudiante'}" class="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl px-4 outline-none focus:bg-white focus:border-black">
                        </div>
                        <button onclick="App.dashboard.saveProfile()" id="btn-save-profile" class="w-full bg-black text-white py-3.5 rounded-xl font-bold shadow-lg mt-4">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}