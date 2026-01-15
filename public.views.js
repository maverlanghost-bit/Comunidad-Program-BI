/**
 * public.views.js (V71.2 - STABILITY FIX)
 * Motor de Experiencia Pública: Landing, Feed, Auth y Planes.
 * * CORRECCIONES V71.2 (PANTALLA BLANCA):
 * - SAFETY: Try/Catch global en renderizadores para evitar "White Screen of Death".
 * - DATA: Validaciones opcionales (?.) profundas en objetos de planes y variantes.
 * - STATE: Inicialización defensiva del estado global.
 */

window.App = window.App || {};
window.App.public = window.App.public || {};

// Inicialización defensiva del estado
window.App.public.state = window.App.public.state || {
    carouselIndex: 0,
    mediaItems: [],
    billingPeriod: 'monthly'
};

// [FIX] Helper robusto para forzar el scroll nativo
const _unlockScroll = () => {
    try {
        const targets = [document.documentElement, document.body];
        targets.forEach(el => {
            el.style.overflow = 'auto';
            el.style.height = 'auto';
            el.style.position = 'static';
            el.classList.remove('overflow-hidden', 'h-screen', 'fixed');
        });

        const appRoot = document.getElementById('app-root') || document.getElementById('app');
        if (appRoot) {
            appRoot.style.height = 'auto';
            appRoot.style.overflow = 'visible';
            appRoot.style.display = 'block';
            appRoot.classList.remove('h-screen', 'overflow-hidden');
        }
    } catch (e) { console.warn("Scroll unlock warning:", e); }
};

// ============================================================================
// 1. DISCOVERY (CATÁLOGO PÚBLICO)
// ============================================================================

window.App.public.renderDiscovery = async () => {
    try {
        // [SAFETY CHECK]
        if (!window.F || !window.F.db) {
            return App.render(`
                <div class="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                    <div class="text-[#1890ff] text-4xl mb-4"><i class="fas fa-circle-notch fa-spin"></i></div>
                    <p class="text-slate-500 font-medium">Inicializando sistema...</p>
                    <button onclick="window.location.reload()" class="mt-4 text-sm text-[#1890ff] font-bold hover:underline">Recargar</button>
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
        } catch (e) { console.error("Error loading communities:", e); }

        const tags = ['🐍 Python', '🗄️ SQL', '📊 Power BI', '📈 Excel', '🧠 IA Aplicada', '🐘 Big Data', '🤖 Machine Learning'];

        await App.render(`
            <div class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans flex flex-col relative selection:bg-[#1890ff] selection:text-white pb-20">
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

                <footer class="py-12 bg-white dark:bg-[#020617] text-center shrink-0 border-t border-gray-200 dark:border-slate-800 mt-auto">
                    <p class="text-sm text-slate-400 font-medium">© 2026 ProgramBI LMS. Plataforma Educativa.</p>
                </footer>
            </div>
            ${_renderAuthModal()}
        `);
    } catch (err) {
        console.error("FATAL ERROR renderDiscovery:", err);
        App.render(`<div class="p-10 text-red-500 text-center">Error crítico cargando Discovery: ${err.message}</div>`);
    } finally {
        _unlockScroll();
        _setupDropdownLogic();
    }
};

// ============================================================================
// 2. LANDING PAGE
// ============================================================================

window.App.public.renderLanding = async (communityId) => {
    try {
        const cleanId = communityId ? communityId.split('/')[0] : null;
        const isPlansRoute = window.location.hash.includes('/planes') || (communityId && communityId.includes('/planes'));

        if (isPlansRoute && cleanId) return App.public.renderPlans(cleanId);
        
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
        
        if (!c) return App.render(`<div class="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#020617]"><h1 class="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Comunidad no encontrada</h1><button onclick="window.location.hash='#comunidades'" class="bg-[#1890ff] text-white px-6 py-2 rounded-xl font-bold">Volver</button></div>`);

        const user = App.state.currentUser;
        const isMember = user && (user.joinedCommunities || []).includes(c.id);
        
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
        const trialPlan = plans.find(p => p.trialDays > 0);
        
        const simplePrice = c.priceMonthly || c.price || 0;
        const isFree = !hasPlans && (!simplePrice || parseFloat(simplePrice) === 0);

        const coursesList = c.courses || [];

        let priceDisplayHTML = '';
        let ctaButtonText = '';
        
        if (isMember) {
            priceDisplayHTML = `<div class="text-green-500 font-bold mb-2 flex items-center gap-2"><i class="fas fa-check-circle"></i> Miembro Activo</div>`;
            ctaButtonText = 'Entrar al Aula';
        } else if (trialPlan) {
            priceDisplayHTML = `
                <div class="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded inline-block mb-1 uppercase tracking-wider">¡Oferta Especial!</div>
                <div class="text-3xl font-black text-slate-900 dark:text-white">Prueba ${trialPlan.trialDays} Días Gratis</div>
                ${trialPlan.noCardRequired ? '<div class="text-xs text-slate-500 font-bold mt-1"><i class="fas fa-credit-card-slash"></i> Sin tarjeta requerida</div>' : ''}
            `;
            ctaButtonText = 'Empezar Prueba Gratis';
        } else {
            priceDisplayHTML = `
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desde</div>
                <div class="flex items-baseline gap-1">
                    <span class="text-3xl font-black text-slate-900 dark:text-white">${isFree ? 'Gratis' : (hasPlans ? 'Ver Planes' : `$${simplePrice}`)}</span>
                </div>
            `;
            ctaButtonText = hasPlans ? 'Ver Opciones' : 'Unirse Ahora';
        }

        await App.render(`
            <div class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans flex flex-col">
                ${_renderPublicHeader()}

                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-20 w-full flex-1">
                    <button onclick="window.location.hash='#comunidades'" class="mb-6 flex items-center gap-2 text-slate-500 hover:text-[#1890ff] font-bold text-sm transition-colors group">
                        <div class="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center group-hover:border-blue-200 transition-colors shadow-sm">
                            <i class="fas fa-arrow-left text-xs group-hover:-translate-x-0.5 transition-transform"></i>
                        </div>
                        <span>Volver al catálogo</span>
                    </button>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                        <div class="lg:col-span-8 space-y-8 animate-fade-in">
                            
                            <!-- MULTIMEDIA CAROUSEL -->
                            <div class="relative bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video group" id="hero-carousel">
                                ${_renderCarouselInner(galleryItems, 0)}
                                
                                ${galleryItems.length > 1 ? `
                                <button onclick="App.public.moveCarousel(-1)" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <button onclick="App.public.moveCarousel(1)" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
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

                            <!-- TABS NAVEGACIÓN -->
                            <div class="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar border-b border-gray-200 dark:border-slate-800 sticky top-[60px] z-30 bg-[#F8FAFC]/95 dark:bg-[#020617]/95 backdrop-blur-md">
                                <button onclick="App.public.switchLandingTab('info')" id="tab-btn-info" class="nav-pill active">Información</button>
                                <button onclick="App.public.switchLandingTab('classroom')" id="tab-btn-classroom" class="nav-pill">Aula Virtual</button>
                                <button onclick="App.public.switchLandingTab('live')" id="tab-btn-live" class="nav-pill">Clases en Vivo</button>
                                <button onclick="App.public.switchLandingTab('community')" id="tab-btn-community" class="nav-pill">Comunidad</button>
                            </div>

                            <!-- 1. INFO -->
                            <div id="tab-content-info" class="animate-fade-in space-y-8">
                                <div class="prose dark:prose-invert max-w-none">
                                    <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-4">Sobre esta comunidad</h2>
                                    <p class="text-lg text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">${c.description || 'Únete a nuestra comunidad exclusiva.'}</p>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    ${_renderFeatureBox('fa-play-circle', 'bg-blue-50 dark:bg-blue-900/20', 'text-blue-500', '12+ Módulos', 'Contenido estructurado')}
                                    ${_renderFeatureBox('fa-users', 'bg-purple-50 dark:bg-purple-900/20', 'text-purple-500', 'Comunidad Activa', 'Ayuda 24/7')}
                                    ${_renderFeatureBox('fa-code', 'bg-green-50 dark:bg-green-900/20', 'text-green-500', 'Proyectos Reales', 'Portafolio profesional')}
                                    ${_renderFeatureBox('fa-certificate', 'bg-orange-50 dark:bg-orange-900/20', 'text-orange-500', 'Certificado', 'Validado por expertos')}
                                </div>
                            </div>

                            <!-- 2. AULA -->
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

                            <!-- 3. LIVE -->
                            <div id="tab-content-live" class="hidden animate-fade-in space-y-8">
                                <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                    <div class="absolute top-0 right-0 p-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div class="relative z-10">
                                        <span class="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4"><span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Próximo Evento</span>
                                        <h2 class="text-3xl font-black mb-2">Masterclass Semanal: Q&A y Revisión</h2>
                                        <p class="text-slate-300 mb-8 max-w-lg font-medium">Únete cada semana para resolver dudas en tiempo real con el instructor y revisar proyectos de la comunidad.</p>
                                        
                                        <div class="flex flex-col sm:flex-row gap-4 items-center">
                                            <div class="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10 flex-1 w-full sm:w-auto text-center">
                                                <div class="text-2xl font-bold">Jueves</div>
                                                <div class="text-xs text-slate-400 uppercase tracking-wider">Día</div>
                                            </div>
                                            <div class="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10 flex-1 w-full sm:w-auto text-center">
                                                <div class="text-2xl font-bold">19:00</div>
                                                <div class="text-xs text-slate-400 uppercase tracking-wider">Hora Global</div>
                                            </div>
                                            <div class="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10 flex-1 w-full sm:w-auto text-center">
                                                <div class="text-2xl font-bold">Zoom</div>
                                                <div class="text-xs text-slate-400 uppercase tracking-wider">Plataforma</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 class="font-bold text-slate-900 dark:text-white text-lg mb-4 flex items-center gap-2"><i class="fas fa-play-circle text-slate-400"></i> Grabaciones Recientes</h3>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        ${[1, 2].map(i => `
                                        <div class="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                                            <div class="aspect-video bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                                                <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-slate-900 shadow-lg group-hover:scale-110 transition-transform"><i class="fas fa-play ml-1"></i></div>
                                            </div>
                                            <div class="p-4">
                                                <div class="text-xs text-slate-400 font-bold mb-1">Hace ${i} semanas</div>
                                                <h4 class="font-bold text-slate-900 dark:text-white text-sm">Análisis de Datos Avanzado - Sesión #${10-i}</h4>
                                            </div>
                                        </div>`).join('')}
                                    </div>
                                </div>
                            </div>

                            <!-- 4. COMUNIDAD -->
                            <div id="tab-content-community" class="hidden animate-fade-in space-y-6">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-4">Así se ve tu nueva red</h2>
                                
                                <div class="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm opacity-80 pointer-events-none select-none">
                                    <div class="flex gap-4">
                                        <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700"></div>
                                        <div class="flex-1 bg-gray-50 dark:bg-slate-800 rounded-2xl h-10 flex items-center px-4 text-sm text-slate-400">Comparte algo con la comunidad...</div>
                                    </div>
                                </div>

                                <div class="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
                                    <div class="flex items-center gap-3 mb-4">
                                        <img src="https://i.pravatar.cc/150?u=4" class="w-10 h-10 rounded-full bg-gray-200 object-cover">
                                        <div>
                                            <h4 class="font-bold text-slate-900 dark:text-white text-sm">Sofía Rodriguez</h4>
                                            <span class="text-xs text-slate-400">Hace 2 horas</span>
                                        </div>
                                    </div>
                                    <p class="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed font-medium">¡Por fin logré conectar la API con mi frontend! 🎉 Gracias a todos por los consejos en la sesión en vivo de ayer. Aquí les dejo una captura del resultado final.</p>
                                    <div class="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 overflow-hidden relative">
                                        <img src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=800&q=80" class="w-full h-full object-cover">
                                    </div>
                                    <div class="flex gap-6 pt-2 border-t border-gray-100 dark:border-slate-800 text-slate-400 text-xs font-bold">
                                        <span class="flex items-center gap-2"><i class="fas fa-heart text-red-500"></i> 24 Likes</span>
                                        <span class="flex items-center gap-2"><i class="fas fa-comment text-blue-500"></i> 8 Comentarios</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- SIDEBAR -->
                        <div class="lg:col-span-4 relative">
                            <div class="sticky-sidebar-container space-y-6">
                                <div class="power-card p-6 animate-slide-up bg-white dark:bg-[#0f172a]">
                                    ${isMember ? `
                                        <div class="text-center py-6">
                                            <div class="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-3xl text-green-600 mb-4 animate-bounce-short"><i class="fas fa-check"></i></div>
                                            <h3 class="text-xl font-bold text-slate-900 dark:text-white">¡Ya eres miembro!</h3>
                                            <button onclick="window.location.hash='#comunidades/${c.id}/app'" class="w-full mt-4 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">Entrar al Aula <i class="fas fa-arrow-right"></i></button>
                                            <button onclick="window.location.hash='#comunidades/${c.id}/planes'" class="mt-4 text-xs font-bold text-[#1890ff] hover:underline">Ver mis opciones de mejora</button>
                                        </div>
                                    ` : `
                                        <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
                                            <img src="${c.image || 'https://via.placeholder.com/50'}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 shadow-sm">
                                            <div>
                                                ${priceDisplayHTML}
                                            </div>
                                        </div>
                                        <button onclick="window.location.hash='#comunidades/${c.id}/planes'" class="w-full py-4 bg-[#1890ff] hover:bg-blue-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group mb-6">
                                            <span>${ctaButtonText}</span>
                                            <i class="fas fa-arrow-down relative z-10 group-hover:translate-y-1 transition-transform"></i>
                                        </button>
                                        <div class="text-center text-[10px] text-slate-400 border-t border-gray-100 dark:border-slate-800 pt-4 flex items-center justify-center gap-2"><i class="fas fa-lock"></i> Pago 100% Seguro</div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ${_renderAuthModal()}
        `);

        App.public.switchLandingTab('info');
    } catch (err) {
        console.error("FATAL ERROR renderLanding:", err);
        App.render(`<div class="p-10 text-red-500">Error cargando Landing: ${err.message}</div>`);
    } finally {
        _unlockScroll();
        _setupDropdownLogic();
    }
};

// ============================================================================
// 3. VISTA DE PLANES & PAGO (REFACTOR V71.2 - SAFETY FIRST)
// ============================================================================

window.App.public.renderPlans = async (cid) => {
    try {
        let c = App.state.cache.communities[cid];
        if (!c) {
            try {
                const doc = await window.F.getDoc(window.F.doc(window.F.db, "communities", cid));
                if(doc.exists()) { c = {id:doc.id, ...doc.data()}; App.state.cache.communities[cid] = c; }
            } catch(e) {}
        }
        
        if (!c) return App.render(`<div class="p-10 text-center">Comunidad no encontrada</div>`);

        const plans = Array.isArray(c.plans) ? c.plans : [];
        
        const hasAnnualOptions = plans.some(p => p.priceAnnual || p.paymentUrlAnnual);
        const billingPeriod = App.public.state.billingPeriod; // 'monthly' | 'annual'

        await App.render(`
            <div class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans custom-scrollbar flex flex-col">
                ${_renderPublicHeader()}
                
                <div class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
                    <!-- Header simple de vuelta -->
                    <div class="mb-10 text-center">
                        <button onclick="window.location.hash='#comunidades/${cid}'" class="inline-flex items-center gap-2 text-slate-500 hover:text-[#1890ff] font-bold text-sm mb-6 transition-colors">
                            <i class="fas fa-arrow-left"></i> Volver a la información
                        </button>
                        <h1 class="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">Elige tu plan ideal</h1>
                        <p class="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto font-medium">
                            Únete a <span class="font-bold text-[#1890ff]">${c.name}</span> y lleva tus habilidades al siguiente nivel.
                        </p>

                        <!-- SWITCH GLOBAL (MENSUAL / ANUAL) -->
                        ${hasAnnualOptions ? `
                            <div class="inline-flex bg-gray-200 dark:bg-slate-800 p-1 rounded-full relative mb-12">
                                <div class="w-1/2 h-full absolute top-0 left-0 bg-white dark:bg-[#1890ff] rounded-full shadow-sm transition-all duration-300" 
                                    style="transform: translateX(${billingPeriod === 'monthly' ? '0%' : '100%'})"></div>
                                
                                <button onclick="App.public.toggleBilling('monthly')" 
                                    class="relative z-10 px-6 py-2 text-sm font-bold rounded-full transition-colors ${billingPeriod === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}">
                                    Mensual
                                </button>
                                <button onclick="App.public.toggleBilling('annual')" 
                                    class="relative z-10 px-6 py-2 text-sm font-bold rounded-full transition-colors flex items-center gap-2 ${billingPeriod === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}">
                                    Anual <span class="text-[9px] bg-green-500 text-white px-1.5 rounded-sm">-20%</span>
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Grid de Planes -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center items-start">
                        ${plans.length > 0 
                            ? plans.map(plan => _renderPlanCardUnified(plan, c, billingPeriod)).join('') 
                            : _renderDefaultPlan(c)
                        }
                    </div>

                    <!-- Footer de Garantía -->
                    <div class="mt-16 text-center border-t border-gray-200 dark:border-slate-800 pt-10">
                        <div class="flex flex-col md:flex-row justify-center gap-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
                            <span class="flex items-center justify-center gap-2"><i class="fas fa-shield-alt text-green-500"></i> Pagos seguros encriptados</span>
                            <span class="flex items-center justify-center gap-2"><i class="fas fa-bolt text-yellow-500"></i> Acceso inmediato al contenido</span>
                            <span class="flex items-center justify-center gap-2"><i class="fas fa-undo text-blue-500"></i> Cancelación flexible</span>
                        </div>
                    </div>
                </div>
            </div>
            ${_renderAuthModal()}
        `);
    } catch (err) {
        console.error("FATAL ERROR renderPlans:", err);
        App.render(`<div class="p-10 text-red-500 text-center">Error renderizando planes: ${err.message}</div>`);
    } finally {
        _unlockScroll();
    }
};

// ============================================================================
// 4. GLOBAL FEED (IMPLEMENTACIÓN REAL)
// ============================================================================

window.App.public.renderFeed = async () => {
    try {
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
        
        _unlockScroll();
        
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
    } catch(err) {
        console.error("FATAL ERROR renderFeed", err);
    } finally {
        _setupDropdownLogic();
    }
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
                    <span>${date}</span><span>•</span><span class="text-[#1890ff] font-medium cursor-pointer hover:underline" onclick="window.location.hash='#comunidades/${post.communityId}/app'">Ver comunidad</span>
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
// 5. LÓGICA DE NEGOCIO: CARRUSEL & PRECIOS DINÁMICOS
// ============================================================================

// --- A. CARRUSEL LOGIC ---
App.public.moveCarousel = (direction) => {
    const items = App.public.state.mediaItems;
    if (!items || items.length <= 1) return;
    
    let nextIndex = App.public.state.carouselIndex + direction;
    if (nextIndex >= items.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = items.length - 1;
    
    App.public.state.carouselIndex = nextIndex;
    
    // Actualizar Slider
    const track = document.getElementById('carousel-track');
    if (track) {
        track.style.transform = `translateX(-${nextIndex * 100}%)`;
    }

    // Actualizar Indicadores
    items.forEach((_, idx) => {
        const ind = document.getElementById(`indicator-${idx}`);
        if(ind) {
            ind.classList.remove('bg-white', 'bg-white/40');
            ind.classList.add(idx === nextIndex ? 'bg-white' : 'bg-white/40');
        }
    });

    // Toggle Overlay (Solo mostrar en imágenes)
    const overlay = document.getElementById('hero-overlay');
    if (overlay) {
        if (items[nextIndex].type === 'video') overlay.classList.add('opacity-0');
        else overlay.classList.remove('opacity-0');
    }
};

function _renderCarouselInner(items, activeIndex) {
    if(!items || !items.length) return '';
    
    const slides = items.map((item, idx) => `
        <div class="min-w-full h-full relative flex items-center justify-center bg-black">
            ${item.type === 'video' 
                ? `<iframe src="https://www.youtube.com/embed/${item.url}?enablejsapi=1&rel=0" class="w-full h-full pointer-events-auto" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
                : `<img src="${item.url}" class="w-full h-full object-cover">`
            }
        </div>
    `).join('');

    return `
    <div id="carousel-track" class="flex h-full transition-transform duration-500 ease-out" style="transform: translateX(-${activeIndex * 100}%)">
        ${slides}
    </div>`;
}

// --- B. PRECIOS DINÁMICOS V2 & SWITCH ---

// Toggle para el switch mensual/anual
App.public.toggleBilling = (period) => {
    App.public.state.billingPeriod = period;
    const cid = window.location.hash.split('/')[1];
    if (cid) App.public.renderPlans(cid);
};

function _renderPlanCardUnified(plan, community, billingPeriod) {
    // Si es Plan Dinámico (V2) -> Render especial con Selector
    if (plan.isDynamic && plan.dynamicPricing) {
        return _renderDynamicPlanCardSelector(plan, community);
    }
    
    // Lógica Plan Estático (Dual Billing)
    const isMonthly = billingPeriod === 'monthly';
    const price = isMonthly ? plan.priceMonthly : plan.priceAnnual;
    // Si no hay precio anual definido, fallback al mensual (o mostrar "No disponible")
    const finalPrice = price || plan.priceMonthly || plan.price || 0;
    const paymentUrl = isMonthly ? (plan.paymentUrlMonthly || plan.paymentUrl) : (plan.paymentUrlAnnual || plan.paymentUrl);
    
    const isFree = parseFloat(finalPrice) === 0;
    const intervalLabel = isMonthly ? '/mes' : '/año';
    
    // [N2] Switch Visual para Trial (Badge destacado)
    const trialDays = plan.trialDays ? parseInt(plan.trialDays) : 0;
    const noCard = plan.noCardRequired;

    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-300">
        ${plan.recommended ? `<div class="absolute top-0 right-0 bg-[#1890ff] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Recomendado</div>` : ''}
        
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">${plan.name}</h3>
        
        <div class="flex items-baseline gap-1 mb-2">
            <span class="text-4xl font-black text-slate-900 dark:text-white transition-all duration-300">${isFree ? 'Gratis' : `$${finalPrice}`}</span>
            ${!isFree ? `<span class="text-slate-500 font-medium text-lg">${intervalLabel}</span>` : ''}
        </div>

        <!-- TRIAL BADGE (Switch Visual) -->
        ${trialDays > 0 ? `
        <div class="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-xl flex items-center justify-between group cursor-default">
            <div>
                <div class="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Prueba Gratis Activa</div>
                <div class="text-sm font-bold text-slate-900 dark:text-white">${trialDays} Días de Acceso Total</div>
            </div>
            <div class="w-10 h-6 bg-green-500 rounded-full relative shadow-inner">
                <div class="w-4 h-4 bg-white rounded-full absolute top-1 right-1 shadow-sm"></div>
            </div>
        </div>
        ${noCard ? `<div class="text-xs text-slate-500 dark:text-slate-400 font-bold mb-4 flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Sin tarjeta de crédito</div>` : ''}
        ` : `<div class="mb-6 h-4"></div>`} <!-- Spacer -->

        <div class="flex-1 mb-8 border-t border-gray-100 dark:border-slate-800 pt-6">
            <ul class="space-y-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                ${(plan.features || ['Acceso completo']).map(f => `<li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>${f}</span></li>`).join('')}
            </ul>
        </div>

        <button onclick="App.public.handlePlanSelection(this, '${community.id}', '${plan.id}', '${encodeURIComponent(paymentUrl || '')}')"
            class="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isFree ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-[#1890ff] hover:bg-blue-600 text-white shadow-blue-500/30'}">
            ${isFree ? 'Unirse Gratis' : (trialDays > 0 ? `Empezar Prueba de ${trialDays} Días` : 'Seleccionar Plan')}
        </button>
    </div>`;
}

function _renderDynamicPlanCardSelector(plan, community) {
    // [N1 FIX] Selector Robusto para Variantes con Links Únicos
    const config = plan.dynamicPricing || {};
    const variants = config.variants || [];
    if (variants.length === 0) return ''; // Fallback si no hay variantes

    const firstVar = variants[0] || { price: 0, paymentUrl: '' };
    const selectId = `sel-${plan.id}`;
    const totalId = `total-${plan.id}`;
    const btnId = `btn-${plan.id}`;

    // Generar opciones del Select
    const optionsHTML = variants.map((v, idx) => `
        <option value="${idx}" data-price="${v.price}" data-url="${v.paymentUrl || ''}">${v.name}</option>
    `).join('');

    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-[#1890ff] ring-4 ring-blue-500/10 shadow-2xl relative overflow-hidden flex flex-col">
        <div class="absolute top-0 right-0 bg-[#1890ff] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider"><i class="fas fa-bolt"></i> Personalizable</div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">${plan.name}</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Elige la opción perfecta para ti.</p>
        
        <div class="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div class="mb-4">
                <label class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 block">${config.selectorLabel || 'Selecciona una opción'}</label>
                <div class="relative">
                    <select id="${selectId}" onchange="App.public.updateDynamicCard('${community.id}', '${plan.id}')"
                        class="w-full appearance-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-slate-900 dark:text-white font-bold text-sm rounded-xl py-3 px-4 outline-none focus:border-[#1890ff] cursor-pointer shadow-sm">
                        ${optionsHTML}
                    </select>
                    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"><i class="fas fa-chevron-down text-xs"></i></div>
                </div>
            </div>
            
            <div class="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-4">
                <span class="text-xs text-slate-400">Precio Total</span>
                <div class="text-3xl font-black text-slate-900 dark:text-white" id="${totalId}">$${firstVar.price}</div>
            </div>
        </div>

        <div class="flex-1 mb-8">
            <ul class="space-y-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                ${(plan.features || []).map(f => `<li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>${f}</span></li>`).join('')}
            </ul>
        </div>

        <button id="${btnId}" 
            onclick="App.public.handlePlanSelection(this, '${community.id}', '${plan.id}', '${encodeURIComponent(firstVar.paymentUrl || '')}')" 
            class="w-full py-4 bg-[#1890ff] hover:bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95">
            Contratar Ahora
        </button>
    </div>`;
}

function _renderDefaultPlan(c) {
    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl flex flex-col max-w-md mx-auto w-full">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Acceso Estándar</h3>
        <div class="text-4xl font-black text-slate-900 dark:text-white mb-6">${c.priceMonthly ? `$${c.priceMonthly}` : 'Gratis'}<span class="text-lg font-normal opacity-70">/mes</span></div>
        <button onclick="App.public.handlePlanSelection(this, '${c.id}', 'default', '${encodeURIComponent(c.paymentUrl || '')}')" 
            class="w-full py-4 bg-[#1890ff] text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors">
            Unirse Ahora
        </button>
    </div>`;
}

App.public.updateDynamicCard = (cid, planId) => {
    const select = document.getElementById(`sel-${planId}`);
    if (!select) return;

    const selectedOption = select.options[select.selectedIndex];
    const price = selectedOption.getAttribute('data-price');
    const url = selectedOption.getAttribute('data-url');
    
    // Actualizar Precio Visual
    const totalEl = document.getElementById(`total-${planId}`);
    if(totalEl) totalEl.innerText = `$${price}`;

    // Actualizar Botón (Onclick link)
    const btn = document.getElementById(`btn-${planId}`);
    if(btn) {
        // Re-generamos el onclick con el nuevo URL
        const newOnclick = `App.public.handlePlanSelection(this, '${cid}', '${planId}', '${encodeURIComponent(url || '')}')`;
        btn.setAttribute('onclick', newOnclick);
    }
};

// ============================================================================
// 6. AUTH & ACTIONS
// ============================================================================

App.public.handlePlanSelection = async (btnElement, cid, planId, encodedPaymentUrl) => {
    const user = App.state.currentUser;
    if (!user) {
        App.ui.toast("Debes iniciar sesión primero", "warning");
        sessionStorage.setItem('target_community_id', cid);
        App.public.openAuthModal('login');
        return;
    }

    const paymentUrl = encodedPaymentUrl && encodedPaymentUrl !== 'undefined' && encodedPaymentUrl !== 'null' ? decodeURIComponent(encodedPaymentUrl) : '';

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
        window.location.hash = `#comunidades/${cid}/app`;
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

        const targetId = sessionStorage.getItem('target_community_id');
        if (targetId) {
            sessionStorage.removeItem('target_community_id');
            window.location.hash = `#comunidades/${targetId}/app`;
        } else {
            window.location.hash = '#feed';
        }
    } catch (err) { App.ui.toast("Error de autenticación. Verifica tus datos.", 'error'); }
};

App.public.switchLandingTab = (tabName) => {
    document.querySelectorAll('.nav-pill').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`tab-btn-${tabName}`);
    if(btn) btn.classList.add('active');
    
    ['info', 'classroom', 'live', 'community'].forEach(c => {
        const el = document.getElementById(`tab-content-${c}`);
        if(el) el.classList.add('hidden');
    });
    const content = document.getElementById(`tab-content-${tabName}`);
    if(content) content.classList.remove('hidden');
};

// ============================================================================
// 7. HELPERS & COMPONENTES
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

function _renderDiscoveryCard(c) {
    return `
    <div onclick="window.location.hash='#comunidades/${c.id}'" class="group bg-white dark:bg-[#0f172a] rounded-3xl p-2 border border-gray-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer flex flex-col h-full discovery-card">
        <div class="h-52 w-full bg-slate-100 dark:bg-slate-800 rounded-[22px] overflow-hidden relative">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10"></div>
            <img src="${c.image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
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