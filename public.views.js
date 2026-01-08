/**
 * public.views.js (V44.0 - ULTIMATE INTEGRATION)
 * Motor de Experiencia Pública & Landing.
 * * CARACTERÍSTICAS V44.0:
 * - CORE: Integración total con Admin Plans (Tarjetas de precios dinámicas).
 * - DISEÑO: Fusión del estilo "Premium" (V41) con la estructura "Skool" (V43).
 * - TAGS: Python, SQL, Power BI, Excel, IA, Big Data, ML.
 * - UX: Flujo de Auth -> Planes -> Pago optimizado.
 * - SOCIAL PROOF: Sección de testimonios y estadísticas restaurada.
 */

window.App = window.App || {};
window.App.public = window.App.public || {};

// ============================================================================
// 1. CATALOGO (DISCOVERY) - RUTA: #comunidades
// ============================================================================

window.App.public.renderDiscovery = async () => {
    // 1. Obtener Datos
    let communities = [];
    try {
        communities = await App.api.getCommunities();
        // Ordenar: Sugeridas primero, luego por fecha
        communities.sort((a, b) => {
            if (a.isSuggested && !b.isSuggested) return -1;
            if (!a.isSuggested && b.isSuggested) return 1;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    } catch (e) {
        console.warn("Error cargando comunidades:", e);
    }

    // TAGS SOLICITADOS (DATA & AI FOCUS)
    const tags = [
        '🐍 Python', '🗄️ SQL', '📊 Power BI', '📈 Excel', '🧠 IA Aplicada', '🐘 Big Data', '🤖 Machine Learning'
    ];

    await App.render(`
        <div class="h-screen overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#020617] font-sans flex flex-col relative selection:bg-[#1890ff] selection:text-white custom-scrollbar">
            
            <!-- HEADER (Glass Effect) -->
            ${_renderPublicHeader()}

            <!-- HERO SECTION PREMIUM (Restaurado de V41) -->
            <section class="relative pt-32 pb-16 px-6 lg:pt-40 lg:pb-20 overflow-hidden hero-tech-bg shrink-0">
                <!-- Decoración Fondo -->
                <div class="absolute top-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
                <div class="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>

                <div class="relative z-10 max-w-5xl mx-auto text-center">
                    <span class="inline-block py-1 px-3 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-[#1890ff] dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in">
                        🚀 La evolución del aprendizaje
                    </span>
                    
                    <h1 class="text-4xl md:text-6xl lg:text-7xl font-heading font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight animate-fade-in">
                        Únete a Comunidades que <br> <span class="text-gradient-tech bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Aceleran Tu Aprendizaje</span>
                    </h1>
                    
                    <p class="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in font-medium">
                        Cursos interactivos, proyectos reales y colaboración experta en un ecosistema diseñado para crecer.
                    </p>

                    <!-- BUSCADOR -->
                    <div class="max-w-xl mx-auto relative group animate-fade-in mb-8">
                        <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                        <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 flex items-center p-2 focus-within:ring-2 focus-within:ring-[#1890ff] transition-all transform group-hover:-translate-y-1">
                            <i class="fas fa-search text-slate-400 ml-4 text-lg"></i>
                            <input type="text" id="discovery-search" placeholder="Busca tu tecnología..." class="w-full bg-transparent border-none outline-none text-base p-3 text-slate-900 dark:text-white placeholder:text-slate-400" oninput="App.public.handleSearch(this.value)">
                        </div>
                    </div>

                    <!-- TAGS -->
                    <div class="flex flex-wrap justify-center gap-2 animate-fade-in">
                        ${tags.map(tag => `
                            <button onclick="App.public.filterByTag('${tag}')" class="px-4 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-[#1890ff] transition-all backdrop-blur-sm shadow-sm hover:shadow-md">
                                ${tag}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </section>

            <!-- GRID SECTION (MAX 3 COLUMNAS - Tarjetas Grandes) -->
            <section class="py-12 px-6 max-w-7xl mx-auto w-full shrink-0" id="communities-section">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-heading font-bold text-slate-900 dark:text-white">Explorar Espacios</h2>
                    <span class="text-xs font-bold text-slate-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700">
                        ${communities.length} Activas
                    </span>
                </div>
                
                <div id="discovery-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-16">
                    ${communities.length > 0 
                        ? communities.map(c => _renderDiscoveryCard(c)).join('') 
                        : '<div class="col-span-full text-center py-20 text-slate-400 italic">Cargando comunidades...</div>'
                    }
                </div>
            </section>

            <!-- SOCIAL PROOF (Restaurado de V41) -->
            <section class="py-20 bg-white dark:bg-[#0b1120] border-y border-gray-100 dark:border-slate-800 shrink-0">
                <div class="max-w-7xl mx-auto px-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-16">
                        ${_renderStat('10k+', 'Lecciones Completadas', 'fa-check-circle', 'text-green-500')}
                        ${_renderStat('500+', 'Devs Activos', 'fa-users', 'text-blue-500')}
                        ${_renderStat('4.9/5', 'Calificación Promedio', 'fa-star', 'text-yellow-400')}
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-slate-800/50 rounded-3xl p-8 md:p-12 relative overflow-hidden border border-gray-100 dark:border-slate-800">
                        <i class="fas fa-quote-left text-4xl text-gray-200 dark:text-slate-700 absolute top-8 left-8"></i>
                        <div class="relative z-10 max-w-3xl mx-auto text-center">
                            <p class="text-xl md:text-2xl font-medium text-slate-800 dark:text-slate-200 mb-6 italic">
                                "Transformé mi carrera con la comunidad de Programbi. Pasé de no saber nada a conseguir mi primer empleo como Data Analyst en 3 meses."
                            </p>
                            <div class="flex items-center justify-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">👨‍💻</div>
                                <div class="text-left">
                                    <div class="font-bold text-slate-900 dark:text-white">Carlos Díaz</div>
                                    <div class="text-xs text-slate-500 dark:text-blue-400 font-bold uppercase">Data Analyst</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- FOOTER -->
            <footer class="py-12 bg-white dark:bg-[#020617] text-center shrink-0 border-t border-gray-200 dark:border-slate-800">
                <div class="flex justify-center gap-6 mb-8">
                    <a href="#" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-[#1890ff] hover:text-white transition-all"><i class="fab fa-linkedin-in"></i></a>
                    <a href="#" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-[#1890ff] hover:text-white transition-all"><i class="fab fa-instagram"></i></a>
                </div>
                <p class="text-sm text-slate-400">© 2026 ProgramBI. Hecho en Chile 🇨🇱.</p>
            </footer>
        </div>
        ${_renderAuthModal()}
    `);
    _setupDropdownLogic();
};

// ============================================================================
// 2. LANDING PAGE (DISEÑO SKOOL INTERNO) - RUTA: #comunidades/:id
// ============================================================================

window.App.public.renderLanding = async (communityId) => {
    let c = App.state.cache.communities[communityId];
    if (!c) { try { c = await App.api.getCommunityById(communityId); } catch (e) {} }
    
    if (!c) return App.render(`
        <div class="h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#020617]">
            <h1 class="text-4xl font-bold mb-2 text-slate-900 dark:text-white">Comunidad no encontrada</h1>
            <button onclick="window.location.hash='#comunidades'" class="text-[#1890ff] font-bold hover:underline">Volver al catálogo</button>
        </div>`);

    const user = App.state.currentUser;
    const isMember = user && (user.joinedCommunities || []).includes(c.id);
    const videoId = c.videoUrl ? (c.videoUrl.includes('v=') ? c.videoUrl.split('v=')[1].split('&')[0] : c.videoUrl.split('/').pop()) : null;
    
    // Verificar si hay planes configurados
    const hasPlans = c.plans && c.plans.length > 0;
    // Si no hay planes, verificar precio legacy
    const simplePrice = c.priceMonthly || c.price || 0;
    const isFree = !hasPlans && (!simplePrice || parseFloat(simplePrice) === 0);

    await App.render(`
        <div class="h-screen overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#020617] font-sans custom-scrollbar">
            ${_renderPublicHeader()}

            <!-- BANNER SUPERIOR (Estilo Skool/YouTube) -->
            <div class="h-64 md:h-80 bg-slate-900 relative overflow-hidden group">
                 <img src="${c.image || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1600&q=80'}" class="w-full h-full object-cover opacity-60 blur-[2px] scale-105 group-hover:scale-100 transition-transform duration-700">
                 <div class="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] dark:from-[#020617] via-transparent to-black/30"></div>
            </div>

            <div class="max-w-6xl mx-auto px-6 relative -mt-32 pb-20 animate-fade-in">
                
                <!-- HEADER COMUNIDAD -->
                <div class="flex flex-col md:flex-row gap-8 items-end mb-10">
                    <div class="w-40 h-40 rounded-3xl bg-white dark:bg-slate-800 p-1.5 shadow-2xl shrink-0 rotate-3 md:rotate-0 transition-transform hover:rotate-2">
                        <img src="${c.image || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover rounded-2xl bg-slate-100">
                    </div>
                    <div class="flex-1 mb-2 text-shadow-sm">
                        <h1 class="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-3 leading-tight drop-shadow-md md:drop-shadow-none">${c.name}</h1>
                        <p class="text-slate-700 dark:text-slate-300 font-medium text-lg max-w-2xl leading-relaxed bg-white/60 dark:bg-black/40 md:bg-transparent md:dark:bg-transparent backdrop-blur-md md:backdrop-blur-none p-2 md:p-0 rounded-lg">
                            ${c.description ? c.description.substring(0, 150) + '...' : 'Comunidad de aprendizaje profesional.'}
                        </p>
                    </div>
                </div>

                <!-- LAYOUT 2 COLUMNAS (SKOOL STYLE) -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    <!-- COLUMNA IZQUIERDA (Contenido Principal - 8 Cols) -->
                    <div class="lg:col-span-8 space-y-8">
                        
                        <!-- Pestañas Visuales -->
                        <div class="flex items-center gap-8 border-b border-gray-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                            <button class="pb-4 border-b-2 border-slate-900 dark:border-white font-bold text-slate-900 dark:text-white whitespace-nowrap">Información</button>
                            <button class="pb-4 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 whitespace-nowrap">Aula Virtual</button>
                            <button class="pb-4 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 whitespace-nowrap">Miembros</button>
                        </div>

                        <!-- VIDEO DE BIENVENIDA -->
                        ${videoId ? `
                        <div class="rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video relative group border border-gray-200 dark:border-slate-800">
                            <div class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                                <div class="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center pl-1 shadow-lg"><i class="fas fa-play text-white text-3xl"></i></div>
                            </div>
                            <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" frameborder="0" allowfullscreen></iframe>
                        </div>` : ''}

                        <!-- DESCRIPCION LARGA -->
                        <div class="bg-white dark:bg-[#0f172a] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-800">
                            <h3 class="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Sobre esta comunidad</h3>
                            <div class="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p class="whitespace-pre-line">${c.description || 'Únete para acceder a contenido exclusivo y conectar con expertos.'}</p>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                <div class="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-4 items-start">
                                    <div class="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg text-blue-600 dark:text-blue-300"><i class="fas fa-graduation-cap"></i></div>
                                    <div>
                                        <h4 class="font-bold text-slate-900 dark:text-white text-sm">Cursos Prácticos</h4>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Acceso a material exclusivo.</p>
                                    </div>
                                </div>
                                <div class="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 flex gap-4 items-start">
                                    <div class="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg text-purple-600 dark:text-purple-300"><i class="fas fa-users"></i></div>
                                    <div>
                                        <h4 class="font-bold text-slate-900 dark:text-white text-sm">Networking</h4>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Conecta con otros expertos.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- COLUMNA DERECHA (Sticky Sidebar - 4 Cols) -->
                    <div class="lg:col-span-4">
                        <div class="sticky top-28 space-y-6">
                            
                            <!-- TARJETA DE ACCIÓN -->
                            <div class="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                
                                ${isMember ? `
                                    <div class="text-center py-4">
                                        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl text-green-600 mx-auto mb-4 animate-bounce-short"><i class="fas fa-check"></i></div>
                                        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">¡Ya estás dentro!</h3>
                                        <p class="text-slate-500 text-sm mb-6">Tu acceso está activo.</p>
                                        
                                        <button onclick="window.location.hash='#comunidades/${c.id}'" class="w-full mt-6 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2">
                                            <i class="fas fa-door-open"></i> Entrar al Aula
                                        </button>
                                    </div>
                                ` : `
                                    <div class="mb-8">
                                        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Comienza Hoy</span>
                                        ${hasPlans ? `
                                            <div class="text-2xl font-black text-slate-900 dark:text-white mb-1">Planes Disponibles</div>
                                            <div class="text-sm text-slate-500">Elige tu membresía al unirte</div>
                                        ` : `
                                            <div class="flex items-baseline gap-2">
                                                <span class="text-4xl font-black text-slate-900 dark:text-white">${isFree ? 'Gratis' : `$${simplePrice}`}</span>
                                                ${!isFree ? '<span class="text-slate-500 font-medium">/mes</span>' : ''}
                                            </div>
                                        `}
                                    </div>

                                    <!-- BOTÓN JOIN (Trigger Auth -> Planes) -->
                                    <button id="btn-join-main" 
                                        onclick="App.public.handleJoinFlow('${c.id}')" 
                                        class="w-full py-4 bg-[#1890ff] hover:bg-blue-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group">
                                        ${isFree ? 'Unirse Gratis' : 'Ver Planes y Unirse'}
                                        <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                    </button>
                                    
                                    <div class="mt-6 flex flex-col gap-3 text-xs text-slate-500 dark:text-slate-400">
                                        <div class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Acceso inmediato</div>
                                        <div class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Cancela cuando quieras</div>
                                        <div class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Garantía de satisfacción</div>
                                    </div>
                                `}
                            </div>

                            <!-- INFO EXTRA -->
                            <div class="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                <span class="flex items-center gap-2"><i class="fas fa-users text-blue-500"></i> ${App.ui.formatNumber(c.membersCount)} Miembros</span>
                                <span class="flex items-center gap-2"><i class="fas fa-globe text-purple-500"></i> Pública</span>
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
// 3. SELECCIÓN DE PLANES (DINÁMICO SEGÚN CONFIG ADMIN) - RUTA: #planes
// ============================================================================

window.App.public.renderPlans = async () => {
    const cid = sessionStorage.getItem('target_community_id');
    if (!cid) { window.location.hash = '#comunidades'; return; }

    let c = App.state.cache.communities[cid];
    if (!c) { try { c = await App.api.getCommunityById(cid); } catch(e){} }
    
    // Fallback si no hay planes configurados (Crear plan default)
    const plans = c.plans || [];
    const hasPlans = plans.length > 0;

    await App.render(`
        <div class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans pt-24 pb-12 px-6">
            ${_renderPublicHeader()}
            
            <div class="max-w-6xl mx-auto text-center animate-fade-in">
                <button onclick="window.history.back()" class="mb-8 text-slate-500 hover:text-[#1890ff] font-bold text-sm flex items-center justify-center gap-2 transition-colors"><i class="fas fa-arrow-left"></i> Volver a la comunidad</button>
                
                <h1 class="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">Elige tu Plan de Acceso</h1>
                <p class="text-lg text-slate-600 dark:text-slate-400 mb-16 max-w-2xl mx-auto">
                    Selecciona la opción que mejor se adapte a ti para desbloquear el contenido de <strong>${c.name}</strong>.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-${Math.min(plans.length || 1, 3)} gap-8 text-left justify-center items-start">
                    ${hasPlans ? plans.map(plan => _renderPlanCard(plan, c)).join('') : _renderDefaultPlan(c)}
                </div>
            </div>
        </div>
    `);
};

// Renderizador de Tarjeta de Plan Individual
function _renderPlanCard(plan, community) {
    const isRecommended = plan.recommended;
    const isFree = parseFloat(plan.price) === 0;
    
    // Si tiene trial, mostrarlo
    const trialBadge = plan.trialDays > 0 ? `<div class="mb-4 inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-200 dark:border-green-800">${plan.trialDays} días de prueba gratis</div>` : '';

    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border ${isRecommended ? 'border-[#1890ff] dark:border-[#1890ff] ring-4 ring-blue-500/10' : 'border-gray-200 dark:border-slate-800'} shadow-xl relative overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-300">
        ${isRecommended ? `<div class="absolute top-0 right-0 bg-[#1890ff] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Recomendado</div>` : ''}
        
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">${plan.name}</h3>
        <div class="flex items-baseline gap-1 mb-4">
            <span class="text-4xl font-black text-slate-900 dark:text-white">${isFree ? 'Gratis' : `$${plan.price}`}</span>
            ${!isFree && plan.interval ? `<span class="text-slate-500 font-medium text-lg">${plan.interval}</span>` : ''}
        </div>
        
        ${trialBadge}
        
        <div class="flex-1 mb-8 border-t border-gray-100 dark:border-slate-800 pt-6">
            <ul class="space-y-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                ${(plan.features || ['Acceso completo a la comunidad', 'Soporte prioritario']).map(f => `
                    <li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>${f}</span></li>
                `).join('')}
            </ul>
        </div>

        <button onclick="App.public.handlePlanSelection('${community.id}', '${plan.id}', '${plan.paymentUrl || ''}', ${isFree})" 
            class="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isRecommended ? 'bg-[#1890ff] hover:bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900'}">
            ${isFree ? 'Unirse Gratis' : (plan.trialDays > 0 ? 'Empezar Prueba' : 'Seleccionar Plan')}
        </button>
        ${!isFree ? `<p class="text-center text-[10px] text-slate-400 mt-3 flex items-center justify-center gap-1"><i class="fas fa-lock"></i> Pago seguro externo</p>` : ''}
    </div>`;
}

// Fallback si no hay planes configurados (Legacy Support)
function _renderDefaultPlan(c) {
    const isFree = !c.priceMonthly || parseFloat(c.priceMonthly) === 0;
    return `
    <div class="bg-white dark:bg-[#0f172a] p-8 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl flex flex-col max-w-md mx-auto w-full">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Acceso Estándar</h3>
        <div class="text-4xl font-black text-slate-900 dark:text-white mb-6">${isFree ? 'Gratis' : `$${c.priceMonthly}`}<span class="text-lg font-normal opacity-70">/mes</span></div>
        <ul class="space-y-4 mb-8 text-slate-600 dark:text-slate-300 text-sm font-medium">
             <li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>Acceso a todas las clases</span></li>
             <li class="flex items-start gap-3"><i class="fas fa-check text-green-500 mt-1"></i> <span>Comunidad exclusiva</span></li>
        </ul>
        <button onclick="App.public.handlePlanSelection('${c.id}', 'default', '${c.paymentUrl || ''}', ${isFree})" class="w-full py-4 bg-[#1890ff] text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors">
            ${isFree ? 'Unirse Ahora' : 'Suscribirse'}
        </button>
    </div>`;
}

// ============================================================================
// 4. LÓGICA CORE (AUTH & JOIN FLOW)
// ============================================================================

// Paso 1: Intentar Unirse desde Landing
App.public.handleJoinFlow = async (cid) => {
    sessionStorage.setItem('target_community_id', cid);
    // Si hay usuario logueado -> Ir directo a selección de planes
    if (App.state.currentUser) {
        window.location.hash = '#planes';
    } else {
        // Si no -> Guardar flag y abrir modal de registro
        sessionStorage.setItem('pending_plan_redirect', 'true');
        App.public.openAuthModal('register');
    }
};

// Paso 2: Selección de Plan
App.public.handlePlanSelection = async (cid, planId, paymentUrl, isFree) => {
    if (isFree || !paymentUrl) {
        // Unirse directamente (Plan Gratis)
        try {
            App.ui.toast('Procesando acceso...', 'info');
            await App.api.joinCommunity(cid);
            App.ui.toast('¡Bienvenido a la comunidad!', 'success');
            window.location.hash = `#comunidades/${cid}`;
        } catch(e) {
            console.error(e);
            App.ui.toast('Error al unirse.', 'error');
        }
    } else {
        // Redirigir a pasarela externa (Stripe/PayPal)
        App.ui.toast('Redirigiendo a pasarela de pago...', 'success');
        setTimeout(() => window.location.href = paymentUrl, 1500);
    }
};

// Paso 3: Autenticación (Login/Register)
App.public.submitAuth = async (e, mode) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (mode === 'register' && data.password !== data.confirm_password) {
        return App.ui.toast("Las contraseñas no coinciden.", "error");
    }

    try {
        let user;
        if (mode === 'login') user = await App.api.login(data.email, data.password);
        else user = await App.api.register(data);

        App.ui.toast(`¡Hola ${user.displayName || 'Dev'}!`, 'success');
        App.public.closeAuthModal();

        // Verificar si venía de intentar unirse
        if (sessionStorage.getItem('pending_plan_redirect') === 'true') {
            sessionStorage.removeItem('pending_plan_redirect');
            window.location.hash = '#planes';
        } else {
            window.location.hash = '#feed';
        }

    } catch (err) {
        let errorMsg = "Error en la autenticación.";
        if (err.code === 'auth/wrong-password') errorMsg = "Contraseña incorrecta.";
        if (err.code === 'auth/user-not-found') errorMsg = "Usuario no registrado.";
        if (err.code === 'auth/email-already-in-use') errorMsg = "Este correo ya está en uso.";
        App.ui.toast(errorMsg, 'error');
    }
};

// ============================================================================
// 5. COMPONENTES VISUALES
// ============================================================================

function _renderPublicHeader() {
    const user = App.state.currentUser;
    const logoUrl = "https://cdn.shopify.com/s/files/1/0564/3812/8712/files/logo-03_b7b98699-bd18-46ee-8b1b-31885a2c4c62.png?v=1766816974";

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
                            <img src="${user.avatar}" class="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-slate-700">
                            <span class="hidden sm:block text-sm font-bold text-slate-700 dark:text-white max-w-[100px] truncate">${user.name.split(' ')[0]}</span>
                            <i class="fas fa-chevron-down text-[10px] text-slate-400 ml-1 transition-transform group-focus:rotate-180"></i>
                        </button>
                        <div id="dropdown-communities" class="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hidden animate-slide-up z-50">
                            <div class="p-4 border-b border-gray-50 dark:border-slate-800">
                                <p class="text-sm font-bold text-slate-900 dark:text-white truncate">${user.name}</p>
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

// TARJETA DE COMUNIDAD (MÁS GRANDE & PREMIUM)
function _renderDiscoveryCard(c) {
    return `
    <div onclick="window.location.hash='#comunidades/${c.id}'" class="group bg-white dark:bg-[#0f172a] rounded-3xl p-2 border border-gray-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer flex flex-col h-full discovery-card">
        
        <!-- Imagen Header (Aumentada h-52) -->
        <div class="h-52 w-full bg-slate-100 dark:bg-slate-800 rounded-[22px] overflow-hidden relative">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10"></div>
            <img src="${c.image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
            
            <div class="absolute bottom-4 left-4 z-20 pr-4">
                <span class="inline-block px-2 py-0.5 rounded bg-white/20 backdrop-blur border border-white/30 text-white text-[10px] font-bold uppercase tracking-wider mb-2">${c.category || 'General'}</span>
                <h3 class="font-heading font-bold text-white text-xl leading-tight shadow-black drop-shadow-lg">${c.name}</h3>
            </div>
        </div>

        <div class="p-5 flex-1 flex flex-col">
            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3">${c.description || 'Comunidad educativa profesional.'}</p>
            
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

function _renderComingSoonCard(title, icon, colorClass) {
    return `<div class="group bg-gray-50 dark:bg-slate-900/50 rounded-3xl p-8 border-2 border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity hover:border-gray-300 dark:hover:border-slate-700 relative overflow-hidden h-full"><div class="w-16 h-16 rounded-2xl ${colorClass} bg-opacity-10 flex items-center justify-center text-3xl mb-4"><i class="fas ${icon} ${colorClass.replace('bg-', 'text-')}"></i></div><h3 class="font-bold text-slate-700 dark:text-slate-300 text-lg mb-2">${title}</h3><p class="text-xs text-slate-400 font-medium uppercase tracking-widest">Próximamente</p></div>`;
}

function _renderStat(val, label, icon, color) {
    return `
    <div class="flex flex-col items-center">
        <div class="text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            ${val} <i class="fas ${icon} text-lg ${color} opacity-80"></i>
        </div>
        <div class="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">${label}</div>
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
                    <p class="text-slate-500 text-sm" id="auth-subtitle">Accede para continuar.</p>
                </div>
                <!-- Tabs -->
                <div class="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl mb-6">
                    <button onclick="App.public.switchAuthTab('login')" id="tab-login" class="flex-1 py-2 text-sm font-bold rounded-lg transition-all bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white">Iniciar Sesión</button>
                    <button onclick="App.public.switchAuthTab('register')" id="tab-register" class="flex-1 py-2 text-sm font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700 dark:hover:text-white">Registrarse</button>
                </div>
                <!-- Forms -->
                <form id="form-login" onsubmit="App.public.submitAuth(event, 'login')" class="space-y-4">
                    <input type="email" name="email" placeholder="Correo electrónico" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff]">
                    <div class="relative">
                        <input type="password" id="login-pass" name="password" placeholder="Contraseña" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] pr-10">
                        <button type="button" onclick="App.public.togglePassword('login-pass', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"><i class="fas fa-eye"></i></button>
                    </div>
                    <button type="submit" class="w-full bg-[#1890ff] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95">Entrar</button>
                </form>
                <form id="form-register" onsubmit="App.public.submitAuth(event, 'register')" class="space-y-4 hidden">
                    <input type="text" name="name" placeholder="Nombre completo" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff]">
                    <input type="email" name="email" placeholder="Correo electrónico" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff]">
                    <div class="relative">
                        <input type="password" id="reg-pass" name="password" placeholder="Contraseña (min 6)" required minlength="6" class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] pr-10">
                        <button type="button" onclick="App.public.togglePassword('reg-pass', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"><i class="fas fa-eye"></i></button>
                    </div>
                    <div class="relative">
                        <input type="password" id="reg-pass-confirm" name="confirm_password" placeholder="Confirmar contraseña" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none dark:text-white transition-colors focus:border-[#1890ff] pr-10">
                        <button type="button" onclick="App.public.togglePassword('reg-pass-confirm', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"><i class="fas fa-eye"></i></button>
                    </div>
                    <button type="submit" class="w-full bg-[#1890ff] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95">Crear Cuenta</button>
                </form>
            </div>
        </div>
    </div>`;
}

// Helpers
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
