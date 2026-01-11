/**
 * public.views.js (V65.0 - GLOBAL FEED IMPLEMENTATION)
 * Motor de Experiencia Pública.
 * * FIX PANTALLA BLANCA (FEED):
 * - CAUSA: La ruta '#feed' existía en el header pero no tenía una función asignada para renderizarla.
 * - SOLUCIÓN: Se implementó 'renderFeed' que carga y muestra la actividad reciente de las comunidades del usuario.
 * - FEATURES: Filtrado de posts por 'joinedCommunities', tarjetas de diseño consistente y manejo de estado vacío.
 */

window.App = window.App || {};
window.App.public = window.App.public || {};

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
// 2. LANDING PAGE RICA
// ============================================================================

window.App.public.renderLanding = async (communityId) => {
    const cleanId = communityId ? communityId.split('/')[0] : null;
    const isPlansRoute = window.location.hash.includes('/planes') || (communityId && communityId.includes('/planes'));

    if (isPlansRoute && cleanId) return App.public.renderPlans(cleanId);
    
    // [CRITICAL FIX] Router Guard
    if (!cleanId) { 
        if (window.location.hash !== '#comunidades') window.location.hash = '#comunidades';
        return App.public.renderDiscovery(); 
    }

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
    const videoId = c.videoUrl ? (c.videoUrl.includes('v=') ? c.videoUrl.split('v=')[1].split('&')[0] : c.videoUrl.split('/').pop()) : null;
    const plans = Array.isArray(c.plans) ? c.plans : [];
    const hasPlans = plans.length > 0;
    const simplePrice = c.priceMonthly || c.price || 0;
    const isFree = !hasPlans && (!simplePrice || parseFloat(simplePrice) === 0);
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
                        <div class="relative">
                            <div class="glow-backdrop"></div>
                            <div class="video-glow-container aspect-video bg-black shadow-2xl">
                                ${videoId ? `
                                    <iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0" frameborder="0" allowfullscreen></iframe>
                                ` : `
                                    <img src="${c.image || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80'}" class="w-full h-full object-cover opacity-90">
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                                        <div>
                                            <span class="inline-block px-3 py-1 bg-[#1890ff] text-white text-xs font-bold rounded-lg mb-2 uppercase tracking-wide">Curso Destacado</span>
                                            <h1 class="text-3xl md:text-4xl font-black text-white drop-shadow-lg leading-tight">${c.name}</h1>
                                        </div>
                                    </div>
                                `}
                            </div>
                        </div>

                        <div class="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar border-b border-gray-200 dark:border-slate-800 sticky top-[60px] z-30 bg-[#F8FAFC]/95 dark:bg-[#020617]/95 backdrop-blur-md">
                            <button onclick="App.public.switchLandingTab('info')" id="tab-btn-info" class="nav-pill active">Información</button>
                            <button onclick="App.public.switchLandingTab('classroom')" id="tab-btn-classroom" class="nav-pill">Aula Virtual</button>
                            <button onclick="App.public.switchLandingTab('community')" id="tab-btn-community" class="nav-pill">Comunidad</button>
                            <button onclick="App.public.switchLandingTab('instructor')" id="tab-btn-instructor" class="nav-pill">Instructor</button>
                        </div>

                        <div id="tab-content-info" class="animate-fade-in space-y-8">
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

                        <div id="tab-content-classroom" class="hidden animate-fade-in space-y-8">
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
                                        <span class="text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-gray-200 dark:border-slate-700">${(course.classes || []).length} Clases</span>
                                    </div>
                                    <div class="p-2 space-y-1">
                                        ${(course.classes || []).length > 0 ? (course.classes || []).map((cls) => `
                                            <div class="p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl flex items-center justify-between group transition-colors">
                                                <div class="flex items-center gap-3 overflow-hidden">
                                                    <div class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]"><i class="fas fa-play ml-0.5"></i></div>
                                                    <span class="text-sm text-slate-600 dark:text-slate-300 font-medium truncate group-hover:text-[#1890ff] transition-colors">${cls.title}</span>
                                                </div>
                                                <span class="text-xs text-slate-400 font-mono ml-2 shrink-0">${cls.duration || '10:00'}</span>
                                            </div>
                                        `).join('') : '<div class="p-4 text-center text-xs text-slate-400 italic">Contenido en preparación</div>'}
                                    </div>
                                </div>
                            `).join('') : `<div class="text-center py-12 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700"><div class="text-4xl mb-2">📚</div><p class="text-slate-500 text-sm font-medium">El temario se está actualizando.</p></div>`}
                            ${!isMember ? `<div class="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-center"><p class="text-sm text-blue-600 dark:text-blue-400 font-bold mb-2">🔒 Desbloquea todo el contenido</p><button onclick="App.public.handleJoinFlow('${c.id}')" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors">Unirse Ahora</button></div>` : ''}
                        </div>

                        <div id="tab-content-community" class="hidden animate-fade-in space-y-6">
                            <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-4">Actividad Reciente</h2>
                            <div class="space-y-4">
                                ${_renderPostPreview("Juan P.", "ayuda con error en deploy", "Hola comunidad, tengo un problema con Docker...", 5, 12)}
                                ${_renderPostPreview("Maria S.", "¡Conseguí mi primer empleo!", "Gracias a todos por el apoyo, finalmente...", 24, 45)}
                                ${_renderPostPreview("Admin", "Nuevo recurso disponible", "Hemos agregado la cheat-sheet de Pandas...", 10, 8)}
                            </div>
                        </div>

                        <div id="tab-content-instructor" class="hidden animate-fade-in">
                            <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left shadow-sm">
                                <div class="relative shrink-0"><img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" class="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-xl"><div class="absolute bottom-1 right-1 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 border-white dark:border-slate-800"><i class="fas fa-check"></i></div></div>
                                <div>
                                    <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-1">Equipo ProgramBI</h2>
                                    <p class="text-[#1890ff] font-bold text-sm mb-4 uppercase tracking-wide">Instructor Principal</p>
                                    <p class="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed font-medium">Expertos en desarrollo de software y ciencia de datos con más de 10 años de experiencia.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-4 relative">
                        <div class="sticky-sidebar-container space-y-6">
                            <div class="power-card p-6 animate-slide-up bg-white dark:bg-[#0f172a]">
                                ${isMember ? `
                                    <div class="text-center py-6">
                                        <div class="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-3xl text-green-600 mb-4 animate-bounce-short"><i class="fas fa-check"></i></div>
                                        <h3 class="text-xl font-bold text-slate-900 dark:text-white">¡Ya eres miembro!</h3>
                                        <button onclick="window.location.hash='#community/${c.id}'" class="w-full mt-4 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">Entrar al Aula <i class="fas fa-arrow-right"></i></button>
                                    </div>
                                ` : `
                                    <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
                                        <img src="${c.image || 'https://via.placeholder.com/50'}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 shadow-sm">
                                        <div>
                                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suscripción</div>
                                            <div class="flex items-baseline gap-1">
                                                <span class="text-3xl font-black text-slate-900 dark:text-white">${isFree ? 'Gratis' : (hasPlans ? 'Desde $'+Math.min(...plans.map(p=>p.price)) : `$${simplePrice}`)}</span>
                                                ${!isFree ? '<span class="text-sm font-medium text-slate-500">/mes</span>' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button onclick="App.public.handleJoinFlow('${c.id}')" class="w-full py-4 bg-[#1890ff] hover:bg-blue-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group mb-6 relative overflow-hidden">
                                        <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <span class="relative z-10">${isFree ? 'Unirse Gratis' : 'Ver Planes y Precios'}</span>
                                        <i class="fas fa-rocket relative z-10 group-hover:translate-x-1 transition-transform"></i>
                                    </button>
                                    <div class="space-y-2 mb-6 pl-1">
                                        <div class="check-list-item"><i class="fas fa-check-circle text-green-500"></i> <span>Acceso inmediato</span></div>
                                        <div class="check-list-item"><i class="fas fa-check-circle text-green-500"></i> <span>Recursos descargables</span></div>
                                        <div class="check-list-item"><i class="fas fa-check-circle text-green-500"></i> <span>Soporte prioritario</span></div>
                                    </div>
                                    <div class="text-center text-[10px] text-slate-400 border-t border-gray-100 dark:border-slate-800 pt-4 flex items-center justify-center gap-2"><i class="fas fa-lock"></i> Pago 100% Seguro y Encriptado</div>
                                `}
                            </div>
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
// 3. VISTA DE PLANES & PAGO
// ============================================================================

window.App.public.renderPlans = async (cid) => {
    if (!cid || cid === 'undefined') cid = sessionStorage.getItem('target_community_id');
    const cleanId = cid ? cid.split('/')[0] : null;

    if (!cleanId) { window.location.hash = '#comunidades'; return; }

    let c = null;
    try { 
        const docRef = window.F.doc(window.F.db, "communities", cleanId);
        const docSnap = await window.F.getDoc(docRef);
        if(docSnap.exists()) c = { id: docSnap.id, ...docSnap.data() };
    } catch(e) { console.error("Error fetching plans:", e); }

    if (!c) return App.public.renderLanding(cleanId);

    const plans = Array.isArray(c.plans) ? c.plans : [];
    const hasPlans = plans.length > 0;

    await App.render(`
        <div class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans pt-24 pb-12 px-6">
            ${_renderPublicHeader()}
            
            <div class="max-w-6xl mx-auto text-center animate-fade-in">
                <button onclick="window.location.hash='#comunidades/${cleanId}'" class="mb-8 text-slate-500 hover:text-[#1890ff] font-bold text-sm flex items-center justify-center gap-2 transition-colors"><i class="fas fa-arrow-left"></i> Volver a la comunidad</button>
                
                <h1 class="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">Elige tu Plan de Acceso</h1>
                <p class="text-lg text-slate-600 dark:text-slate-400 mb-16 max-w-2xl mx-auto font-medium">
                    Selecciona la opción para desbloquear <strong>${c.name}</strong>.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-${Math.min(plans.length || 1, 3)} gap-8 text-left justify-center items-start">
                    ${hasPlans ? plans.map(plan => _renderPlanCard(plan, c)).join('') : _renderDefaultPlan(c)}
                </div>
            </div>
        </div>
        <!-- Inyección del Modal de Bienvenida -->
        <div id="welcome-modal-container"></div>
    `);
};

// ============================================================================
// 4. GLOBAL FEED (IMPLEMENTACIÓN REAL)
// ============================================================================

window.App.public.renderFeed = async () => {
    const user = App.state.currentUser;
    
    // 1. Auth Guard: Si no hay usuario, volver al inicio
    if (!user) {
        window.location.hash = '#comunidades';
        return;
    }

    // 2. UI Loading
    await App.render(`
        <div class="h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans flex flex-col">
            ${_renderPublicHeader()}
            <div class="flex-1 flex items-center justify-center">
                <div class="text-center animate-pulse">
                    <div class="text-[#1890ff] text-4xl mb-4"><i class="fas fa-circle-notch fa-spin"></i></div>
                    <p class="text-slate-500 font-medium">Cargando tu feed...</p>
                </div>
            </div>
        </div>
    `);

    // 3. Fetch Data (Posts)
    let posts = [];
    try {
        // Traemos posts recientes (Limitado a 50 para performance)
        const q = window.F.query(
            window.F.collection(window.F.db, "posts"), 
            window.F.orderBy("createdAt", "desc"), 
            window.F.limit(50)
        );
        const querySnapshot = await window.F.getDocs(q);
        
        // Filtramos en memoria por las comunidades del usuario para evitar índices complejos
        const myCommunityIds = user.joinedCommunities || [];
        
        posts = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(post => myCommunityIds.includes(post.communityId));

    } catch (e) {
        console.error("Error cargando feed:", e);
        // Fallback silencioso: array vacío
    }

    // 4. Render Final
    await App.render(`
        <div class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans pt-24 pb-12 px-4 custom-scrollbar">
            ${_renderPublicHeader()}
            
            <div class="max-w-2xl mx-auto animate-fade-in">
                <!-- Header del Feed -->
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-black text-slate-900 dark:text-white">Tu Feed</h1>
                        <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Lo último en tus comunidades</p>
                    </div>
                    <button onclick="window.location.hash='#comunidades'" class="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-sm shadow-sm border border-gray-200 dark:border-slate-700 hover:border-blue-300 transition-all">
                        <i class="fas fa-compass mr-2 text-[#1890ff]"></i> Explorar más
                    </button>
                </div>

                <!-- Lista de Posts -->
                <div class="space-y-6">
                    ${posts.length > 0 ? posts.map(p => _renderFeedPostCard(p)).join('') : _renderEmptyFeedState()}
                </div>
            </div>
        </div>
        ${_renderAuthModal()}
    `);
    _setupDropdownLogic();
};

function _renderFeedPostCard(post) {
    // Helper para formatear fecha relativa
    const date = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Reciente';
    const authorInitial = (post.authorName || 'A').charAt(0).toUpperCase();
    
    return `
    <div class="bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-200 dark:border-blue-800">
                ${authorInitial}
            </div>
            <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white">${post.authorName || 'Anónimo'}</h4>
                <div class="flex items-center gap-2 text-xs text-slate-400">
                    <span>${date}</span>
                    <span>•</span>
                    <span class="text-[#1890ff] font-medium cursor-pointer hover:underline" onclick="window.location.hash='#community/${post.communityId}'">En su comunidad</span>
                </div>
            </div>
        </div>
        
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">${post.title || 'Sin título'}</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 whitespace-pre-line">${post.content || ''}</p>
        
        ${post.image ? `<img src="${post.image}" class="w-full h-64 object-cover rounded-2xl mb-4 bg-gray-100 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">` : ''}

        <div class="flex items-center gap-6 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button class="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-bold group">
                <i class="far fa-heart group-hover:scale-110 transition-transform"></i> ${post.likes || 0}
            </button>
            <button class="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors text-sm font-bold group">
                <i class="far fa-comment group-hover:scale-110 transition-transform"></i> ${post.commentsCount || 0}
            </button>
        </div>
    </div>`;
}

function _renderEmptyFeedState() {
    return `
    <div class="text-center py-16 bg-white dark:bg-[#0f172a] rounded-3xl border border-dashed border-gray-300 dark:border-slate-700">
        <div class="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">📭</div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Tu feed está tranquilo</h3>
        <p class="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6 text-sm font-medium">Aún no hay actividad reciente en tus comunidades. ¡Únete a más espacios para ver contenido aquí!</p>
        <button onclick="window.location.hash='#comunidades'" class="bg-[#1890ff] hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-1">
            Explorar Comunidades
        </button>
    </div>`;
}

// ============================================================================
// 5. LÓGICA DE NEGOCIO Y PAGOS (ROBUSTECIDA & SANITIZADA)
// ============================================================================

App.public.toggleTrialMode = (planId, days) => {
    const btn = document.getElementById(`btn-plan-${planId}`);
    const desc = document.getElementById(`desc-plan-${planId}`);
    const checkbox = document.getElementById(`trial-switch-${planId}`);
    if (!btn || !checkbox) return;
    if (checkbox.checked) {
        btn.innerText = `Probar ${days} días gratis`;
        btn.setAttribute('data-mode', 'trial');
        btn.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
        btn.classList.remove('bg-[#1890ff]', 'bg-slate-900', 'dark:bg-white');
        if(desc) desc.innerHTML = '<i class="fas fa-bolt text-yellow-500"></i> Sin cobro hoy';
    } else {
        btn.innerText = 'Pagar y Unirse';
        btn.setAttribute('data-mode', 'payment');
        btn.className = "w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 bg-[#1890ff] hover:bg-blue-600 text-white shadow-blue-500/30"; 
        if(desc) desc.innerHTML = '<i class="fas fa-external-link-alt"></i> Pago seguro externo';
    }
};

App.public.handlePlanSelection = async (btnElement, cid, planId, encodedPaymentUrl) => {
    const user = App.state.currentUser;
    if (!user) {
        App.ui.toast("Debes iniciar sesión primero", "warning");
        App.public.openAuthModal('login');
        return;
    }

    const mode = btnElement.getAttribute('data-mode');
    const paymentUrl = encodedPaymentUrl ? decodeURIComponent(encodedPaymentUrl) : '';

    if (mode === 'payment' && paymentUrl && paymentUrl !== 'undefined' && paymentUrl !== '') {
        App.ui.toast('Redirigiendo a pasarela de pago...', 'info');
        setTimeout(() => window.open(paymentUrl, '_blank'), 800);
        return;
    }

    const originalText = btnElement.innerText;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Procesando...';

    try {
        const userRef = window.F.doc(window.F.db, "users", user.uid);
        const commRef = window.F.doc(window.F.db, "communities", cid);
        
        await window.F.setDoc(userRef, { 
            joinedCommunities: window.F.arrayUnion(cid),
            email: user.email || '',
            role: user.role || 'student',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        if (!user.joinedCommunities) user.joinedCommunities = [];
        if (!user.joinedCommunities.includes(cid)) user.joinedCommunities.push(cid);

        try {
            await window.F.updateDoc(commRef, { membersCount: window.F.increment(1) });
        } catch (counterError) {
            console.warn("No se pudo actualizar contador (permisos), pero la unión fue exitosa.");
        }

        _showWelcomeModal(cid);

    } catch (e) {
        console.error("Fallo al unirse:", e);
        App.ui.toast(`Error al unirse: ${e.code || 'Conexión'}`, 'error');
        btnElement.disabled = false;
        btnElement.innerText = originalText;
    }
};

App.public.handleJoinFlow = async (cid) => {
    sessionStorage.setItem('target_community_id', cid);
    const user = App.state.currentUser;
    if (user) {
        if ((user.joinedCommunities || []).includes(cid)) window.location.hash = `#community/${cid}`;
        else window.location.hash = `#comunidades/${cid}/planes`;
    } else {
        sessionStorage.setItem('pending_plan_redirect', 'true');
        App.public.openAuthModal('register');
    }
};

function _showWelcomeModal(cid) {
    const container = document.getElementById('welcome-modal-container');
    const commName = App.state.cache.communities[cid]?.name || 'la comunidad';
    
    if (container) {
        container.innerHTML = `
        <div class="fixed inset-0 z-[200] flex items-center justify-center welcome-overlay animate-fade-in p-4">
            <div class="absolute inset-0 overflow-hidden pointer-events-none">
                ${Array(30).fill(0).map((_,i) => `<div class="confetti-piece" style="left:${Math.random()*100}%; animation-delay:${Math.random()*2}s"></div>`).join('')}
            </div>
            <div class="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center relative welcome-card border-4 border-white dark:border-slate-800">
                <div class="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce-short">
                    <i class="fas fa-check text-4xl text-green-500"></i>
                </div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">¡Bienvenido!</h2>
                <p class="text-slate-500 dark:text-slate-400 mb-8 font-medium">Te has unido exitosamente a <br><strong class="text-[#1890ff]">${commName}</strong>.</p>
                <button onclick="window.location.hash='#community/${cid}'" class="w-full py-4 bg-[#1890ff] text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:scale-105 transition-transform">Ir al Aula Virtual <i class="fas fa-arrow-right ml-2"></i></button>
            </div>
        </div>`;
    }
}

// ============================================================================
// 6. HELPERS Y COMPONENTES
// ============================================================================

function _renderPlanCard(plan, community) {
    const isRecommended = plan.recommended;
    const isFree = parseFloat(plan.price) === 0;
    const trialDays = plan.trialDays ? parseInt(plan.trialDays) : 0;
    const paymentUrl = plan.paymentUrl ? encodeURIComponent(plan.paymentUrl) : ''; 

    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border ${isRecommended ? 'border-[#1890ff] ring-4 ring-blue-500/10' : 'border-gray-200 dark:border-slate-800'} shadow-xl relative overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-300">
        ${isRecommended ? `<div class="absolute top-0 right-0 bg-[#1890ff] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Recomendado</div>` : ''}
        
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">${plan.name}</h3>
        <div class="flex items-baseline gap-1 mb-4">
            <span class="text-4xl font-black text-slate-900 dark:text-white">${isFree ? 'Gratis' : `$${plan.price}`}</span>
            ${!isFree && plan.interval ? `<span class="text-slate-500 font-medium text-lg">/${plan.interval === 'month' ? 'mes' : 'año'}</span>` : ''}
        </div>
        
        ${(!isFree && trialDays > 0) ? `
        <div class="mb-6 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-3 rounded-xl flex items-center justify-between">
            <span class="text-xs font-bold text-green-700 dark:text-green-400">Activar ${trialDays} días gratis</span>
            <div class="toggle-wrapper">
                <input type="checkbox" id="trial-switch-${plan.id}" class="toggle-checkbox" onchange="App.public.toggleTrialMode('${plan.id}', ${trialDays})">
                <label for="trial-switch-${plan.id}" class="toggle-label">
                    <div class="toggle-rail">
                        <div class="toggle-circle"></div>
                    </div>
                </label>
            </div>
        </div>` : ''}
        
        <div class="flex-1 mb-8 border-t border-gray-100 dark:border-slate-800 pt-6">
            <ul class="space-y-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                ${(plan.features || ['Acceso completo']).map(f => `<li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>${f}</span></li>`).join('')}
            </ul>
        </div>

        <button id="btn-plan-${plan.id}"
            onclick="App.public.handlePlanSelection(this, '${community.id}', '${plan.id}', '${paymentUrl}')"
            data-mode="${isFree ? 'trial' : 'payment'}" 
            data-free="${isFree}"
            data-trial-days="${trialDays}"
            class="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isRecommended ? 'bg-[#1890ff] hover:bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900'}">
            ${isFree ? 'Unirse Gratis' : (plan.paymentUrl ? 'Pagar y Unirse' : 'Seleccionar Plan')}
        </button>
        ${!isFree && plan.paymentUrl ? `<p id="desc-plan-${plan.id}" class="text-center text-[10px] text-slate-400 mt-3 flex items-center justify-center gap-1"><i class="fas fa-external-link-alt"></i> Pago seguro externo</p>` : ''}
    </div>`;
}

function _renderDefaultPlan(c) {
    const isFree = !c.priceMonthly || parseFloat(c.priceMonthly) === 0;
    const paymentUrl = c.paymentUrl ? encodeURIComponent(c.paymentUrl) : '';

    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl flex flex-col max-w-md mx-auto w-full">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Acceso Estándar</h3>
        <div class="text-4xl font-black text-slate-900 dark:text-white mb-6">${isFree ? 'Gratis' : `$${c.priceMonthly}`}<span class="text-lg font-normal opacity-70">/mes</span></div>
        <ul class="space-y-4 mb-8 text-slate-600 dark:text-slate-300 text-sm font-medium">
             <li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>Acceso a todas las clases</span></li>
             <li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>Comunidad exclusiva</span></li>
        </ul>
        <button onclick="App.public.handlePlanSelection(this, '${c.id}', 'default', '${paymentUrl}')" 
            data-mode="${isFree ? 'trial' : 'payment'}" 
            data-free="${isFree}"
            class="w-full py-4 bg-[#1890ff] text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors">
            ${isFree ? 'Unirse Ahora' : 'Suscribirse'}
        </button>
    </div>`;
}

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

        if (sessionStorage.getItem('pending_plan_redirect') === 'true') {
            sessionStorage.removeItem('pending_plan_redirect');
            let targetId = sessionStorage.getItem('target_community_id');
            if (targetId === 'undefined' || targetId === 'null') targetId = null;

            if (targetId) window.location.hash = `#comunidades/${targetId}/planes`;
            else window.location.hash = '#feed'; // V65 FIX: Ahora sí funcionará
        } else {
            window.location.hash = '#feed'; // V65 FIX: Ahora sí funcionará
        }
    } catch (err) { App.ui.toast("Error de autenticación. Verifica tus datos.", 'error'); }
};

App.public.switchLandingTab = (tabName) => {
    document.querySelectorAll('.nav-pill').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    ['info', 'classroom', 'community', 'instructor'].forEach(c => {
        const el = document.getElementById(`tab-content-${c}`);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
};

function _renderPublicHeader() {
    const user = App.state.currentUser;
    const logoUrl = "https://cdn.shopify.com/s/files/1/0564/3812/8712/files/logo-03_b7b98699-bd18-46ee-8b1b-31885a2c4c62.png?v=1766816974";
    
    const userName = user ? (user.name || user.displayName || user.email || 'Estudiante') : '';
    const safeName = userName.includes(' ') ? userName.split(' ')[0] : userName;
    
    let avatarHtml = '';
    if (user && user.avatar && user.avatar.trim() !== '' && !user.avatar.includes('pravatar.cc')) {
        avatarHtml = `<img src="${user.avatar}" class="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-slate-700">`;
    } else if (user) {
        const initial = safeName.charAt(0).toUpperCase();
        avatarHtml = `
            <div class="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-800 shadow-sm select-none">
                ${initial}
            </div>`;
    }

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
                            ${avatarHtml}
                            <span class="hidden sm:block text-sm font-bold text-slate-700 dark:text-white max-w-[100px] truncate">${safeName}</span>
                            <i class="fas fa-chevron-down text-[10px] text-slate-400 ml-1 transition-transform group-focus:rotate-180"></i>
                        </button>
                        <div id="dropdown-communities" class="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hidden animate-slide-up z-50">
                            <div class="p-4 border-b border-gray-50 dark:border-slate-800 flex items-center gap-3">
                                ${avatarHtml}
                                <div class="overflow-hidden">
                                    <p class="text-sm font-bold text-slate-900 dark:text-white truncate">${userName}</p>
                                    <p class="text-xs text-slate-400 truncate">Estudiante</p>
                                </div>
                            </div>
                            <div class="p-2">
                                <a href="#feed" class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
                                    <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><i class="fas fa-home"></i></div>
                                    Mi Feed
                                </a>
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