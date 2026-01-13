/**
 * public.views.js (V71.0 - UX RECOVERY & HYBRID STATE)
 * Motor de Experiencia Pública: Galería Multimedia, Precios Dinámicos y Feed.
 * * FEATURES V71.0:
 * 1. HYBRID SIDEBAR: Los miembros ven "Ir al Aula" Y los planes (Upselling).
 * 2. DIRECT ROUTING: Acceso directo a /planes sin timeouts ni hacks.
 * 3. LAZY AUTH: Exploración libre, registro solo al contratar.
 */

window.App = window.App || {};
window.App.public = window.App.public || {};

// Estado local para UI efímera
window.App.public.state = {
    carouselIndex: 0,
    mediaItems: []
};

// ============================================================================
// 1. DISCOVERY (CATÁLOGO PÚBLICO)
// ============================================================================

window.App.public.renderDiscovery = async () => {
    // [SAFETY CHECK]
    if (!window.F || !window.F.db) {
        console.error("Firebase no está inicializado en renderDiscovery");
        return App.render(`
            <div class="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div class="text-[#1890ff] text-4xl mb-4"><i class="fas fa-circle-notch fa-spin"></i></div>
                <p class="text-slate-500 font-medium">Conectando con el servidor...</p>
                <button onclick="window.location.reload()" class="mt-4 text-sm text-[#1890ff] font-bold hover:underline">Recargar página</button>
            </div>
        `);
    }

    let communities = [];
    try {
        const querySnapshot = await window.F.getDocs(window.F.collection(window.F.db, "communities"));
        communities = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordenar: Sugeridos primero, luego por fecha
        communities.sort((a, b) => {
            if (a.isSuggested && !b.isSuggested) return -1;
            if (!a.isSuggested && b.isSuggested) return 1;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    } catch (e) {
        console.error("Error cargando comunidades:", e);
    }

    const tags = ['🐍 Python', '🗄️ SQL', '📊 Power BI', '📈 Excel', '🧠 IA Aplicada', '🐘 Big Data', '🤖 Machine Learning'];

    await App.render(`
        <div class="h-screen overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#020617] font-sans flex flex-col relative selection:bg-[#1890ff] selection:text-white custom-scrollbar">
            ${_renderPublicHeader()}

            <section class="relative pt-32 pb-16 px-6 lg:pt-40 lg:pb-20 overflow-hidden hero-tech-bg shrink-0">
                <div class="absolute top-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
                <div class="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>

                <div class="relative z-10 max-w-5xl mx-auto text-center">
                    <span class="inline-block py-1 px-3 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-[#1890ff] dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in">
                        🚀 La evolución del aprendizaje
                    </span>
                    <h1 class="text-4xl md:text-6xl lg:text-7xl font-heading font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight animate-fade-in">
                        Comunidades que <span class="text-gradient-tech bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Aceleran Tu Futuro</span>
                    </h1>
                    <p class="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in font-medium">
                        Domina tecnologías reales con mentores expertos y una comunidad que te respalda.
                    </p>

                    <div class="max-w-xl mx-auto relative group animate-fade-in mb-8">
                        <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                        <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 flex items-center p-2 focus-within:ring-2 focus-within:ring-[#1890ff] transition-all transform group-hover:-translate-y-1">
                            <i class="fas fa-search text-slate-400 ml-4 text-lg"></i>
                            <input type="text" id="discovery-search" placeholder="Busca tu tecnología..." class="w-full bg-transparent border-none outline-none text-base p-3 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium" oninput="App.public.handleSearch(this.value)">
                        </div>
                    </div>

                    <div class="flex flex-wrap justify-center gap-2 animate-fade-in">
                        ${tags.map(tag => `
                            <button onclick="App.public.filterByTag('${tag}')" class="px-4 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-[#1890ff] transition-all backdrop-blur-sm shadow-sm hover:shadow-md">
                                ${tag}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </section>

            <section class="py-12 px-6 max-w-7xl mx-auto w-full shrink-0 min-h-[400px]" id="communities-section">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-heading font-bold text-slate-900 dark:text-white">Explorar Espacios</h2>
                    <span class="text-xs font-bold text-slate-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700">
                        ${communities.length} Activas
                    </span>
                </div>
                
                <div id="discovery-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-16">
                    ${communities.length > 0 
                        ? communities.map(c => _renderDiscoveryCard(c)).join('') 
                        : '<div class="col-span-full text-center py-20 text-slate-400 italic font-medium">No se encontraron comunidades.</div>'
                    }
                </div>
            </section>

            <footer class="py-12 bg-white dark:bg-[#020617] text-center shrink-0 border-t border-gray-200 dark:border-slate-800">
                <p class="text-sm text-slate-400 font-medium">© 2026 ProgramBI LMS. Plataforma Educativa.</p>
            </footer>
        </div>
        ${_renderAuthModal()}
    `);
    _setupDropdownLogic();
};

// ============================================================================
// 2. LANDING PAGE HÍBRIDA (SOLUCIÓN N1 & N2)
// ============================================================================

window.App.public.renderLanding = async (communityId) => {
    // 1. Análisis de URL para Navegación Directa (Fix N1)
    const rawId = communityId || '';
    const isPlansRequested = rawId.includes('/planes') || window.location.hash.includes('/planes');
    const cleanId = rawId.split('/')[0];
    const initialTab = isPlansRequested ? 'plans' : 'info';

    // 2. Router Guard
    if (!cleanId) { 
        if (window.location.hash !== '#comunidades') window.location.hash = '#comunidades';
        return App.public.renderDiscovery(); 
    }

    // 3. Fetch Data (NetworkFirst -> CacheStrategy)
    let c = null;
    try {
        const docRef = window.F.doc(window.F.db, "communities", cleanId);
        const docSnap = await window.F.getDoc(docRef);
        if (docSnap.exists()) {
            c = { id: docSnap.id, ...docSnap.data() };
            if (!App.state.cache.communities) App.state.cache.communities = {};
            App.state.cache.communities[cleanId] = c;
        }
    } catch (e) { 
        c = App.state.cache.communities ? App.state.cache.communities[cleanId] : null;
    }
    
    if (!c) return App.render(`
        <div class="h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#020617]">
            <h1 class="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Comunidad no encontrada</h1>
            <button onclick="window.location.hash='#comunidades'" class="bg-[#1890ff] text-white px-6 py-2 rounded-xl font-bold">Volver al catálogo</button>
        </div>`);

    const user = App.state.currentUser;
    const isMember = user && (user.joinedCommunities || []).includes(c.id);
    
    // 4. Preparar Multimedia
    let galleryItems = c.gallery || [];
    if (galleryItems.length === 0) {
        if (c.videoUrl) galleryItems.push({ type: 'video', url: c.videoUrl });
        if (c.image) galleryItems.push({ type: 'image', url: c.image });
        if (galleryItems.length === 0) galleryItems.push({ type: 'image', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80' });
    }
    App.public.state.mediaItems = galleryItems;
    App.public.state.carouselIndex = 0;

    const plans = Array.isArray(c.plans) ? c.plans : [];
    const hasPlans = plans.length > 0;
    const coursesList = c.courses || [];

    await App.render(`
        <div class="h-screen overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#020617] font-sans custom-scrollbar">
            ${_renderPublicHeader()}

            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-20">
                <button onclick="window.location.hash='#comunidades'" class="mb-6 flex items-center gap-2 text-slate-500 hover:text-[#1890ff] font-bold text-sm transition-colors group">
                    <div class="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center group-hover:border-blue-200 transition-colors shadow-sm">
                        <i class="fas fa-arrow-left text-xs group-hover:-translate-x-0.5 transition-transform"></i>
                    </div>
                    <span>Volver al catálogo</span>
                </button>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    <div class="lg:col-span-8 space-y-8 animate-fade-in">
                        
                        <!-- CAROUSEL -->
                        <div class="relative bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video group" id="hero-carousel">
                            ${_renderCarouselInner(galleryItems, 0)}
                            ${galleryItems.length > 1 ? `
                            <button onclick="App.public.moveCarousel(-1)" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"><i class="fas fa-chevron-left"></i></button>
                            <button onclick="App.public.moveCarousel(1)" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"><i class="fas fa-chevron-right"></i></button>
                            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                                ${galleryItems.map((_, idx) => `<div id="indicator-${idx}" class="w-2 h-2 rounded-full ${idx===0 ? 'bg-white' : 'bg-white/40'} transition-colors"></div>`).join('')}
                            </div>
                            ` : ''}
                            <div id="hero-overlay" class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-8 pointer-events-none transition-opacity ${galleryItems[0].type === 'video' ? 'opacity-0' : 'opacity-100'}">
                                <div>
                                    <span class="inline-block px-3 py-1 bg-[#1890ff] text-white text-xs font-bold rounded-lg mb-2 uppercase tracking-wide">Comunidad Oficial</span>
                                    <h1 class="text-3xl md:text-4xl font-black text-white drop-shadow-lg leading-tight">${c.name}</h1>
                                </div>
                            </div>
                        </div>

                        <!-- TABS DE NAVEGACIÓN -->
                        <div class="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar border-b border-gray-200 dark:border-slate-800 sticky top-[60px] z-30 bg-[#F8FAFC]/95 dark:bg-[#020617]/95 backdrop-blur-md">
                            <button onclick="App.public.switchLandingTab('info')" id="tab-btn-info" class="nav-pill ${initialTab === 'info' ? 'active' : ''}">Información</button>
                            <button onclick="App.public.switchLandingTab('classroom')" id="tab-btn-classroom" class="nav-pill ${initialTab === 'classroom' ? 'active' : ''}">Aula Virtual</button>
                            <button onclick="App.public.switchLandingTab('plans')" id="tab-btn-plans" class="nav-pill ${initialTab === 'plans' ? 'active' : ''}">Planes y Precios</button>
                            <button onclick="App.public.switchLandingTab('community')" id="tab-btn-community" class="nav-pill ${initialTab === 'community' ? 'active' : ''}">Comunidad</button>
                        </div>

                        <!-- CONTENIDO TABS (Estado inicial basado en URL) -->
                        
                        <!-- TAB: INFO -->
                        <div id="tab-content-info" class="${initialTab === 'info' ? '' : 'hidden'} animate-fade-in space-y-8">
                            <div class="prose dark:prose-invert max-w-none">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-4">Sobre esta comunidad</h2>
                                <p class="text-lg text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">${c.description || 'Únete a nuestra comunidad exclusiva.'}</p>
                            </div>
                            <div>
                                <h3 class="font-bold text-slate-900 dark:text-white text-lg mb-4 flex items-center gap-2"><i class="fas fa-star text-yellow-400"></i> ¿Qué obtendrás?</h3>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    ${_renderFeatureBox('fa-play-circle', 'bg-blue-50 dark:bg-blue-900/20', 'text-blue-500', '12+ Módulos', 'Contenido estructurado')}
                                    ${_renderFeatureBox('fa-users', 'bg-purple-50 dark:bg-purple-900/20', 'text-purple-500', 'Comunidad Activa', 'Ayuda 24/7')}
                                    ${_renderFeatureBox('fa-code', 'bg-green-50 dark:bg-green-900/20', 'text-green-500', 'Proyectos Reales', 'Portafolio profesional')}
                                    ${_renderFeatureBox('fa-certificate', 'bg-orange-50 dark:bg-orange-900/20', 'text-orange-500', 'Certificado', 'Validado por expertos')}
                                </div>
                            </div>
                        </div>

                        <!-- TAB: CLASSROOM -->
                        <div id="tab-content-classroom" class="${initialTab === 'classroom' ? '' : 'hidden'} animate-fade-in space-y-8">
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white">Plan de Estudios</h2>
                                <span class="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 border border-gray-200 dark:border-slate-700">${coursesList.length} Cursos</span>
                            </div>
                            ${coursesList.length > 0 ? coursesList.map((course, idx) => `
                                <div class="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <div class="p-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-[#1890ff] flex items-center justify-center font-bold text-sm">${idx + 1}</div>
                                            <h3 class="font-bold text-slate-900 dark:text-white text-lg">${course.title}</h3>
                                        </div>
                                    </div>
                                    <div class="p-2 space-y-1">
                                        ${(course.classes || []).map((cls) => `
                                            <div class="p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl flex items-center justify-between group transition-colors">
                                                <div class="flex items-center gap-3 overflow-hidden">
                                                    <div class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]"><i class="fas fa-play ml-0.5"></i></div>
                                                    <span class="text-sm text-slate-600 dark:text-slate-300 font-medium truncate group-hover:text-[#1890ff] transition-colors">${cls.title}</span>
                                                </div>
                                                <span class="text-xs text-slate-400 font-mono ml-2 shrink-0">${cls.duration || '10:00'}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('') : `<div class="text-center py-12 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700"><div class="text-4xl mb-2">📚</div><p class="text-slate-500 text-sm font-medium">El temario se está actualizando.</p></div>`}
                        </div>

                        <!-- TAB: PLANS (Fix N1) -->
                        <div id="tab-content-plans" class="${initialTab === 'plans' ? '' : 'hidden'} animate-fade-in space-y-6">
                            <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-4">Elige tu modalidad</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                ${hasPlans ? plans.map(plan => _renderPlanCardUnified(plan, c)).join('') : _renderDefaultPlan(c)}
                            </div>
                        </div>

                        <!-- TAB: COMMUNITY -->
                        <div id="tab-content-community" class="${initialTab === 'community' ? '' : 'hidden'} animate-fade-in space-y-6">
                            <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-4">Actividad Reciente</h2>
                            <div class="space-y-4">
                                ${_renderPostPreview("Juan P.", "ayuda con error en deploy", "Hola comunidad, tengo un problema con Docker...", 5, 12)}
                                ${_renderPostPreview("Maria S.", "¡Conseguí mi primer empleo!", "Gracias a todos por el apoyo, finalmente...", 24, 45)}
                            </div>
                        </div>
                    </div>

                    <!-- SIDEBAR HÍBRIDO (Fix N2) -->
                    <div class="lg:col-span-4 relative">
                        <div class="sticky-sidebar-container space-y-6">
                            ${_renderSidebar(c, user, isMember, hasPlans, plans)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ${_renderAuthModal()}
    `);
    _setupDropdownLogic();
};

// ============================================================================
// 3. VISTA DE PLANES (COMPATIBILIDAD V71)
// ============================================================================

window.App.public.renderPlans = async (cid) => {
    // Redirige directamente usando el nuevo soporte de URL
    window.location.hash = `#comunidades/${cid}/plans`;
};

// ============================================================================
// 4. GLOBAL FEED
// ============================================================================

window.App.public.renderFeed = async () => {
    const user = App.state.currentUser;
    if (!user) { window.location.hash = '#comunidades'; return; }

    await App.render(`
        <div class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans pt-24 pb-12 px-4 custom-scrollbar">
            ${_renderPublicHeader()}
            <div class="max-w-2xl mx-auto animate-fade-in">
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-black text-slate-900 dark:text-white">Tu Feed</h1>
                        <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Lo último en tus comunidades</p>
                    </div>
                    <button onclick="window.location.hash='#comunidades'" class="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-sm shadow-sm border border-gray-200 dark:border-slate-700 hover:border-blue-300 transition-all">
                        <i class="fas fa-compass mr-2 text-[#1890ff]"></i> Explorar más
                    </button>
                </div>
                <div id="feed-content" class="space-y-6">
                    <div class="text-center py-12"><i class="fas fa-circle-notch fa-spin text-[#1890ff] text-2xl"></i></div>
                </div>
            </div>
        </div>
        ${_renderAuthModal()}
    `);
    
    // Carga diferida de posts
    try {
        const q = window.F.query(
            window.F.collection(window.F.db, "posts"), 
            window.F.orderBy("createdAt", "desc"), 
            window.F.limit(50)
        );
        const querySnapshot = await window.F.getDocs(q);
        const myCommunityIds = user.joinedCommunities || [];
        const posts = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(post => myCommunityIds.includes(post.communityId));

        const container = document.getElementById('feed-content');
        if(container) {
            container.innerHTML = posts.length > 0 ? posts.map(p => _renderFeedPostCard(p)).join('') : _renderEmptyFeedState();
        }
    } catch (e) { console.error("Error feed:", e); }
    _setupDropdownLogic();
};

function _renderFeedPostCard(post) {
    const date = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Reciente';
    const authorInitial = (post.authorName || 'A').charAt(0).toUpperCase();
    return `
    <div class="bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-200 dark:border-blue-800">${authorInitial}</div>
            <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white">${post.authorName || 'Anónimo'}</h4>
                <div class="flex items-center gap-2 text-xs text-slate-400">
                    <span>${date}</span><span>•</span><span class="text-[#1890ff] font-medium cursor-pointer hover:underline" onclick="window.location.hash='#community/${post.communityId}'">Ver comunidad</span>
                </div>
            </div>
        </div>
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">${post.title || 'Sin título'}</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 whitespace-pre-line">${post.content || ''}</p>
        ${post.image ? `<img src="${post.image}" class="w-full h-64 object-cover rounded-2xl mb-4 bg-gray-100 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">` : ''}
    </div>`;
}

function _renderEmptyFeedState() {
    return `
    <div class="text-center py-16 bg-white dark:bg-[#0f172a] rounded-3xl border border-dashed border-gray-300 dark:border-slate-700">
        <div class="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">📭</div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Tu feed está tranquilo</h3>
        <p class="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6 text-sm font-medium">Únete a más comunidades para ver contenido.</p>
        <button onclick="window.location.hash='#comunidades'" class="bg-[#1890ff] hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-1">Explorar Comunidades</button>
    </div>`;
}

// ============================================================================
// 5. LÓGICA DE NEGOCIO Y HELPERS UI
// ============================================================================

// --- A. SIDEBAR BUILDER (Nuevo Helper para N2) ---
function _renderSidebar(c, user, isMember, hasPlans, plans) {
    let html = '';
    
    // 1. Tarjeta de Miembro (Solo si es miembro)
    if (isMember) {
        html += `
        <div class="power-card p-6 mb-6 animate-slide-up bg-gradient-to-br from-white to-green-50/50 dark:from-[#0f172a] dark:to-green-900/10 border-green-200 dark:border-green-900/30">
            <div class="text-center py-4">
                <div class="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl text-green-600 mb-3 animate-bounce-short"><i class="fas fa-check"></i></div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">¡Ya eres miembro!</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Tienes acceso completo al contenido.</p>
                <button onclick="window.location.hash='#community/${c.id}'" class="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                    Entrar al Aula <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>`;
    }

    // 2. Tarjeta de Pricing (Siempre visible, con texto adaptado)
    const simplePrice = c.priceMonthly || c.price || 0;
    const isFree = !hasPlans && (!simplePrice || parseFloat(simplePrice) === 0);
    const minPrice = hasPlans ? Math.min(...plans.map(p=>p.price)) : simplePrice;

    html += `
    <div class="power-card p-6 animate-slide-up bg-white dark:bg-[#0f172a]">
        <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
            <img src="${c.image || 'https://via.placeholder.com/50'}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 shadow-sm">
            <div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${isMember ? 'Tu plan actual' : 'Desde'}</div>
                <div class="flex items-baseline gap-1">
                    <span class="text-3xl font-black text-slate-900 dark:text-white">${isFree ? 'Gratis' : `$${minPrice}`}</span>
                </div>
            </div>
        </div>
        
        <button onclick="App.public.switchLandingTab('plans')" class="w-full py-4 bg-[#1890ff] hover:bg-blue-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group mb-6">
            <span>${isMember ? 'Ver Otros Planes' : 'Ver Opciones'}</span>
            <i class="fas fa-arrow-down relative z-10 group-hover:translate-y-1 transition-transform"></i>
        </button>

        <div class="space-y-2 mb-6 pl-1">
            <div class="check-list-item"><i class="fas fa-check-circle text-green-500"></i> <span>Acceso inmediato</span></div>
            <div class="check-list-item"><i class="fas fa-check-circle text-green-500"></i> <span>Recursos descargables</span></div>
            <div class="check-list-item"><i class="fas fa-check-circle text-green-500"></i> <span>Soporte prioritario</span></div>
        </div>
        <div class="text-center text-[10px] text-slate-400 border-t border-gray-100 dark:border-slate-800 pt-4 flex items-center justify-center gap-2"><i class="fas fa-lock"></i> Pago 100% Seguro</div>
    </div>`;

    return html;
}

// --- B. CARRUSEL LOGIC ---
App.public.moveCarousel = (direction) => {
    const items = App.public.state.mediaItems;
    if (!items || items.length <= 1) return;
    
    let nextIndex = App.public.state.carouselIndex + direction;
    if (nextIndex >= items.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = items.length - 1;
    
    App.public.state.carouselIndex = nextIndex;
    
    const track = document.getElementById('carousel-track');
    if (track) track.style.transform = `translateX(-${nextIndex * 100}%)`;

    items.forEach((_, idx) => {
        const ind = document.getElementById(`indicator-${idx}`);
        if(ind) {
            ind.classList.remove('bg-white', 'bg-white/40');
            ind.classList.add(idx === nextIndex ? 'bg-white' : 'bg-white/40');
        }
    });

    const overlay = document.getElementById('hero-overlay');
    if (overlay) {
        if (items[nextIndex].type === 'video') overlay.classList.add('opacity-0');
        else overlay.classList.remove('opacity-0');
    }
};

function _renderCarouselInner(items, activeIndex) {
    if(!items.length) return '';
    const slides = items.map((item, idx) => `
        <div class="min-w-full h-full relative flex items-center justify-center bg-black">
            ${item.type === 'video' 
                ? `<iframe src="https://www.youtube.com/embed/${item.url}?enablejsapi=1&rel=0" class="w-full h-full pointer-events-auto" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
                : `<img src="${item.url}" class="w-full h-full object-cover">`
            }
        </div>
    `).join('');
    return `<div id="carousel-track" class="flex h-full transition-transform duration-500 ease-out" style="transform: translateX(-${activeIndex * 100}%)">${slides}</div>`;
}

// --- C. PRECIOS DINÁMICOS & CALCULADORA ---

function _renderPlanCardUnified(plan, community) {
    if (plan.isDynamic && plan.dynamicPricing) {
        return _renderDynamicPlanCard(plan, community);
    }
    const isFree = parseFloat(plan.price) === 0;
    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-300">
        ${plan.recommended ? `<div class="absolute top-0 right-0 bg-[#1890ff] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Recomendado</div>` : ''}
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">${plan.name}</h3>
        <div class="flex items-baseline gap-1 mb-4">
            <span class="text-4xl font-black text-slate-900 dark:text-white">${isFree ? 'Gratis' : `$${plan.price}`}</span>
            ${!isFree ? `<span class="text-slate-500 font-medium text-lg">/${plan.interval || 'mes'}</span>` : ''}
        </div>
        <div class="flex-1 mb-8 border-t border-gray-100 dark:border-slate-800 pt-6">
            <ul class="space-y-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                ${(plan.features || ['Acceso completo']).map(f => `<li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>${f}</span></li>`).join('')}
            </ul>
        </div>
        <button onclick="App.public.handlePlanSelection(this, '${community.id}', '${plan.id}', '${encodeURIComponent(plan.paymentUrl || '')}')"
            class="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isFree ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-[#1890ff] hover:bg-blue-600 text-white shadow-blue-500/30'}">
            ${isFree ? 'Unirse Gratis' : 'Seleccionar Plan'}
        </button>
    </div>`;
}

function _renderDynamicPlanCard(plan, community) {
    const config = plan.dynamicPricing;
    const unitName = config.unitName || 'Unidad';
    const basePrice = config.unitPrice || 0;
    const qtyId = `qty-${plan.id}`;
    const totalId = `total-${plan.id}`;
    const btnId = `btn-${plan.id}`;
    const discountId = `disc-${plan.id}`;
    
    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-[#1890ff] ring-4 ring-blue-500/10 shadow-2xl relative overflow-hidden flex flex-col">
        <div class="absolute top-0 right-0 bg-[#1890ff] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider"><i class="fas fa-bolt"></i> Personalizable</div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">${plan.name}</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Elige la cantidad de ${unitName.toLowerCase()} que necesitas.</p>
        <div class="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div class="flex justify-between items-center mb-4">
                <label class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Cantidad (${unitName})</label>
                <div class="flex items-center gap-3">
                    <button onclick="document.getElementById('${qtyId}').stepDown(); document.getElementById('${qtyId}').dispatchEvent(new Event('input'))" class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:border-blue-500 transition-colors"><i class="fas fa-minus text-xs"></i></button>
                    <input type="number" id="${qtyId}" value="1" min="1" max="100" class="w-16 text-center font-bold text-xl bg-transparent outline-none text-slate-900 dark:text-white" oninput="App.public.calculateDynamicPrice('${community.id}', '${plan.id}', this.value)">
                    <button onclick="document.getElementById('${qtyId}').stepUp(); document.getElementById('${qtyId}').dispatchEvent(new Event('input'))" class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:border-blue-500 transition-colors"><i class="fas fa-plus text-xs"></i></button>
                </div>
            </div>
            <div class="flex justify-between items-end border-t border-slate-200 dark:border-slate-700 pt-4">
                <div>
                    <span id="${discountId}" class="block text-[10px] font-bold text-green-500 uppercase tracking-wide opacity-0 transition-opacity">¡Ahorras 0%!</span>
                    <span class="text-xs text-slate-400">Total a pagar</span>
                </div>
                <div class="text-3xl font-black text-slate-900 dark:text-white" id="${totalId}">$${basePrice}</div>
            </div>
        </div>
        <div class="flex-1 mb-8">
            <ul class="space-y-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                ${(plan.features || []).map(f => `<li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>${f}</span></li>`).join('')}
            </ul>
        </div>
        <button id="${btnId}" onclick="App.public.handlePlanSelection(this, '${community.id}', '${plan.id}', null)" class="w-full py-4 bg-[#1890ff] hover:bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95">
            Contratar 1 ${unitName}
        </button>
        <p class="text-center text-[10px] text-slate-400 mt-3"><i class="fas fa-calculator"></i> Descuentos por volumen aplicados automáticamente.</p>
    </div>`;
}

function _renderDefaultPlan(c) {
    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl flex flex-col max-w-md mx-auto w-full">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Acceso Estándar</h3>
        <div class="text-4xl font-black text-slate-900 dark:text-white mb-6">${c.priceMonthly ? `$${c.priceMonthly}` : 'Gratis'}<span class="text-lg font-normal opacity-70">/mes</span></div>
        <button onclick="App.public.handlePlanSelection(this, '${c.id}', 'default', '${encodeURIComponent(c.paymentUrl || '')}')" class="w-full py-4 bg-[#1890ff] text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors">
            Unirse Ahora
        </button>
    </div>`;
}

App.public.calculateDynamicPrice = (cid, planId, qty) => {
    const quantity = parseInt(qty) || 1;
    const comm = App.state.cache.communities[cid];
    if (!comm) return;
    
    const plan = comm.plans.find(p => p.id === planId);
    if (!plan || !plan.dynamicPricing) return;

    const config = plan.dynamicPricing;
    const baseUnit = config.unitPrice;
    
    let finalPrice = baseUnit * quantity;
    let activeLink = plan.paymentUrl || '';
    let savedAmount = 0;

    const sortedTiers = (config.tiers || []).sort((a,b) => b.qty - a.qty);
    const activeTier = sortedTiers.find(t => quantity >= t.qty);

    if (activeTier) {
        const tierUnitPrice = activeTier.price / activeTier.qty;
        if (tierUnitPrice < baseUnit) {
            finalPrice = tierUnitPrice * quantity;
            savedAmount = (baseUnit * quantity) - finalPrice;
        } else {
            finalPrice = baseUnit * quantity;
        }
        if (activeTier.link) activeLink = activeTier.link;
    }

    const totalEl = document.getElementById(`total-${planId}`);
    const discEl = document.getElementById(`disc-${planId}`);
    const btnEl = document.getElementById(`btn-${planId}`);

    if(totalEl) totalEl.innerText = `$${Math.round(finalPrice)}`;
    if(discEl) {
        if (savedAmount > 0) {
            const pct = Math.round((savedAmount / (baseUnit * quantity)) * 100);
            discEl.innerText = `¡Ahorras ${pct}% ($${Math.round(savedAmount)})!`;
            discEl.classList.remove('opacity-0');
        } else {
            discEl.classList.add('opacity-0');
        }
    }
    if(btnEl) {
        btnEl.innerText = `Contratar ${quantity} ${config.unitName}`;
        const newOnclick = `App.public.handlePlanSelection(this, '${cid}', '${planId}', '${encodeURIComponent(activeLink)}')`;
        btnEl.setAttribute('onclick', newOnclick);
    }
};

// ============================================================================
// 6. AUTH & ACTIONS (LAZY AUTH - N3)
// ============================================================================

App.public.handlePlanSelection = async (btnElement, cid, planId, encodedPaymentUrl) => {
    // 1. Guardar Intención de Compra
    const user = App.state.currentUser;
    const paymentUrl = encodedPaymentUrl && encodedPaymentUrl !== 'undefined' && encodedPaymentUrl !== 'null' ? decodeURIComponent(encodedPaymentUrl) : '';

    if (!user) {
        App.ui.toast("Inicia sesión o regístrate para continuar", "info");
        // Guardamos a dónde quería ir y qué quería comprar
        sessionStorage.setItem('target_community_id', cid);
        sessionStorage.setItem('pending_plan_action', JSON.stringify({ cid, planId, paymentUrl }));
        App.public.openAuthModal('register'); // UX: Abrir en registro por defecto
        return;
    }

    // 2. Ejecutar Acción si está logueado
    if (paymentUrl) {
        App.ui.toast('Redirigiendo a pago seguro...', 'info');
        setTimeout(() => window.open(paymentUrl, '_blank'), 1000);
        return;
    }

    const originalText = btnElement.innerText;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Procesando...';

    try {
        const userRef = window.F.doc(window.F.db, "users", user.uid);
        const commRef = window.F.doc(window.F.db, "communities", cid);
        
        await window.F.setDoc(userRef, { joinedCommunities: window.F.arrayUnion(cid) }, { merge: true });
        await window.F.updateDoc(commRef, { membersCount: window.F.increment(1) });

        App.ui.toast("¡Bienvenido a la comunidad!", "success");
        window.location.hash = `#community/${cid}`;
    } catch (e) {
        console.error("Join error:", e);
        App.ui.toast("Error al unirse. Intenta nuevamente.", "error");
        btnElement.disabled = false;
        btnElement.innerText = originalText;
    }
};

App.public.submitAuth = async (e, mode) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (mode === 'register' && data.password !== data.confirm_password) return App.ui.toast("Las contraseñas no coinciden.", "error");

    try {
        let user;
        if (mode === 'login') user = await App.api.login(data.email, data.password);
        else user = await App.api.register(data);

        App.ui.toast(`¡Hola ${user.displayName || 'Dev'}!`, 'success');
        App.public.closeAuthModal();

        // 3. Restaurar Sesión y Redirigir
        const pendingAction = sessionStorage.getItem('pending_plan_action');
        const targetId = sessionStorage.getItem('target_community_id');
        
        if (pendingAction) {
            // Re-ejecutar lógica de compra si había una pendiente
            const action = JSON.parse(pendingAction);
            sessionStorage.removeItem('pending_plan_action');
            sessionStorage.removeItem('target_community_id');
            // Simulamos click o redirigimos directo si es pago
            if(action.paymentUrl) {
                 window.open(action.paymentUrl, '_blank');
                 window.location.hash = `#comunidades/${action.cid}`;
            } else {
                 // Si era gratuito, forzamos recarga para que se una (o mejor, UI update)
                 window.location.reload(); 
            }
        } else if (targetId) {
            sessionStorage.removeItem('target_community_id');
            window.location.hash = `#comunidades/${targetId}`;
        } else {
            window.location.hash = '#feed';
        }
    } catch (err) { App.ui.toast("Error de autenticación. Verifica tus datos.", 'error'); }
};

App.public.switchLandingTab = (tabName) => {
    document.querySelectorAll('.nav-pill').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`tab-btn-${tabName}`);
    if(btn) btn.classList.add('active');
    
    ['info', 'classroom', 'plans', 'community'].forEach(c => {
        const el = document.getElementById(`tab-content-${c}`);
        if(el) el.classList.add('hidden');
    });
    const content = document.getElementById(`tab-content-${tabName}`);
    if(content) content.classList.remove('hidden');
};

// ============================================================================
// 7. COMPONENTES ESTÁTICOS
// ============================================================================

function _renderPublicHeader() {
    const user = App.state.currentUser;
    const logoUrl = "https://cdn.shopify.com/s/files/1/0564/3812/8712/files/logo-03_b7b98699-bd18-46ee-8b1b-31885a2c4c62.png?v=1766816974";
    const userName = user ? (user.name || user.email.split('@')[0]) : '';
    const initial = userName.charAt(0).toUpperCase();

    return `
    <header class="h-[72px] glass-panel fixed top-0 w-full z-50 transition-all border-b border-white/10">
        <div class="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <div class="cursor-pointer flex items-center gap-2" onclick="window.location.hash='#comunidades'">
                <img src="${logoUrl}" alt="ProgramBI" class="h-8 object-contain">
            </div>
            <div class="flex items-center gap-4">
                ${!user ? `
                    <button onclick="App.public.openAuthModal('login')" class="hidden md:block text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-[#1890ff] transition-colors">Entrar</button>
                    <button onclick="App.public.openAuthModal('register')" class="bg-[#1890ff] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5">Crear Cuenta</button>
                ` : `
                    <div class="relative" id="my-communities-wrapper">
                        <button id="btn-my-communities" class="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full border border-transparent hover:border-gray-200 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group">
                            <div class="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-800 shadow-sm">${initial}</div>
                            <span class="hidden sm:block text-sm font-bold text-slate-700 dark:text-white max-w-[100px] truncate">${userName}</span>
                            <i class="fas fa-chevron-down text-[10px] text-slate-400 ml-1 transition-transform group-focus:rotate-180"></i>
                        </button>
                        <div id="dropdown-communities" class="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hidden animate-slide-up z-50">
                            <div class="p-2">
                                <a href="#feed" class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
                                    <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><i class="fas fa-home"></i></div>
                                    Mi Feed
                                </a>
                                ${user.role === 'admin' ? `
                                <a href="#admin" class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
                                    <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><i class="fas fa-cogs"></i></div>
                                    Panel Admin
                                </a>` : ''}
                                <button onclick="App.api.logout()" class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 text-sm font-medium transition-colors">
                                     <div class="w-8 h-8 rounded-lg bg-red-100 text-red-500 flex items-center justify-center"><i class="fas fa-sign-out-alt"></i></div>
                                     Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
    </header>`;
}

function _renderDiscoveryCard(c) {
    return `
    <div onclick="window.location.hash='#comunidades/${c.id}'" class="group bg-white dark:bg-[#0f172a] rounded-3xl p-2 border border-gray-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer flex flex-col h-full discovery-card">
        <div class="h-52 w-full bg-slate-100 dark:bg-slate-800 rounded-[22px] overflow-hidden relative">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10"></div>
            <img src="${c.image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
            <div class="absolute bottom-4 left-4 z-20 pr-4">
                <span class="inline-block px-2 py-0.5 rounded bg-white/20 backdrop-blur border border-white/30 text-white text-[10px] font-bold uppercase tracking-wider mb-2">${c.category || 'General'}</span>
                <h3 class="font-heading font-bold text-white text-xl leading-tight shadow-black drop-shadow-lg">${c.name}</h3>
            </div>
        </div>
        <div class="p-5 flex-1 flex flex-col">
            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3 font-medium">${c.description || 'Comunidad educativa profesional.'}</p>
            <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                <div class="flex items-center gap-2">
                     <i class="fas fa-users text-slate-400 text-xs"></i>
                     <span class="text-xs font-bold text-slate-600 dark:text-slate-300">${App.ui.formatNumber(c.membersCount)} Miembros</span>
                </div>
                <span class="text-[#1890ff] text-xs font-bold bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full group-hover:bg-[#1890ff] group-hover:text-white transition-colors">Ver Detalles</span>
            </div>
        </div>
    </div>`;
}

function _renderAuthModal() {
    return `
    <div id="auth-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 relative">
            <button onclick="App.public.closeAuthModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10 text-lg p-2"><i class="fas fa-times"></i></button>
            <div class="p-8">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white" id="auth-title">Bienvenido</h2>
                    <p class="text-slate-500 text-sm font-medium" id="auth-subtitle">Accede para continuar.</p>
                </div>
                <div class="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl mb-6">
                    <button onclick="App.public.switchAuthTab('login')" id="tab-login" class="flex-1 py-2 text-sm font-bold rounded-lg transition-all bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white">Iniciar Sesión</button>
                    <button onclick="App.public.switchAuthTab('register')" id="tab-register" class="flex-1 py-2 text-sm font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700 dark:hover:text-white">Registrarse</button>
                </div>
                <form id="form-login" onsubmit="App.public.submitAuth(event, 'login')" class="space-y-4">
                    <input type="email" name="email" placeholder="Correo electrónico" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] font-medium">
                    <div class="relative">
                        <input type="password" id="login-pass" name="password" placeholder="Contraseña" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] pr-10 font-medium">
                        <button type="button" onclick="App.public.togglePassword('login-pass', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"><i class="fas fa-eye"></i></button>
                    </div>
                    <button type="submit" class="w-full bg-[#1890ff] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95">Entrar</button>
                </form>
                <form id="form-register" onsubmit="App.public.submitAuth(event, 'register')" class="space-y-4 hidden">
                    <input type="text" name="name" placeholder="Nombre completo" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] font-medium">
                    <input type="email" name="email" placeholder="Correo electrónico" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] font-medium">
                    <div class="relative">
                        <input type="password" id="reg-pass" name="password" placeholder="Contraseña (min 6)" required minlength="6" class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] pr-10 font-medium">
                        <button type="button" onclick="App.public.togglePassword('reg-pass', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"><i class="fas fa-eye"></i></button>
                    </div>
                    <div class="relative">
                        <input type="password" id="reg-pass-confirm" name="confirm_password" placeholder="Confirmar contraseña" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] pr-10 font-medium">
                        <button type="button" onclick="App.public.togglePassword('reg-pass-confirm', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"><i class="fas fa-eye"></i></button>
                    </div>
                    <button type="submit" class="w-full bg-[#1890ff] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95">Crear Cuenta</button>
                </form>
            </div>
        </div>
    </div>`;
}

function _renderFeatureBox(icon, bgClass, textClass, title, sub) {
    return `
    <div class="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-gray-200 dark:border-slate-800 flex gap-4 items-center transition-all hover:border-blue-200 dark:hover:border-blue-900/50">
        <div class="w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center ${textClass} text-xl shrink-0"><i class="fas ${icon}"></i></div>
        <div>
            <div class="font-bold text-slate-900 dark:text-white text-sm">${title}</div>
            <div class="text-xs text-slate-500 font-medium">${sub}</div>
        </div>
    </div>`;
}

function _renderPostPreview(author, title, body, likes, comments) {
    return `
    <div class="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-gray-200 dark:border-slate-800">
        <div class="flex items-center gap-2 mb-2">
            <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400"></div>
            <span class="text-xs font-bold text-slate-600 dark:text-slate-300">${author}</span>
            <span class="text-[10px] text-slate-400 font-medium">• Hace 2h</span>
        </div>
        <div class="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">${title}</div>
        <p class="text-xs text-slate-500 mb-3 line-clamp-2 font-medium">${body}</p>
        <div class="flex gap-4 text-xs text-slate-400 font-bold">
            <span class="flex items-center gap-1"><i class="far fa-heart"></i> ${likes}</span>
            <span class="flex items-center gap-1"><i class="far fa-comment"></i> ${comments}</span>
        </div>
    </div>`;
}

App.public.openAuthModal = (mode) => { document.getElementById('auth-modal').classList.remove('hidden'); App.public.switchAuthTab(mode); };
App.public.closeAuthModal = () => document.getElementById('auth-modal').classList.add('hidden');
App.public.switchAuthTab = (mode) => {
    const l = document.getElementById('form-login'), r = document.getElementById('form-register');
    const tl = document.getElementById('tab-login'), tr = document.getElementById('tab-register');
    const title = document.getElementById('auth-title');
    document.getElementById('form-login').reset(); document.getElementById('form-register').reset();
    if (mode === 'login') { 
        l.classList.remove('hidden'); r.classList.add('hidden'); 
        tl.className = "flex-1 py-2 text-sm font-bold rounded-lg bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white transition-all"; 
        tr.className = "flex-1 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all"; 
        title.innerText = "Bienvenido";
    } else { 
        l.classList.add('hidden'); r.classList.remove('hidden'); 
        tr.className = "flex-1 py-2 text-sm font-bold rounded-lg bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white transition-all"; 
        tl.className = "flex-1 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all"; 
        title.innerText = "Crea tu cuenta";
    }
};
App.public.togglePassword = (inputId, btn) => { const i = document.getElementById(inputId); i.type = i.type === 'password' ? 'text' : 'password'; btn.querySelector('i').classList.toggle('fa-eye'); btn.querySelector('i').classList.toggle('fa-eye-slash'); };
App.public.handleSearch = (q) => { document.querySelectorAll('.discovery-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'flex' : 'none'); };
App.public.filterByTag = (t) => { const i=document.getElementById('discovery-search'); if(i){i.value=t.split(' ')[1]||t; App.public.handleSearch(i.value);} };

function _setupDropdownLogic() {
    const btn = document.getElementById('btn-my-communities');
    const menu = document.getElementById('dropdown-communities');
    if (btn && menu) {
        btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
        document.addEventListener('click', (e) => { if (!btn.contains(e.target)) menu.classList.add('hidden'); });
    }
}
