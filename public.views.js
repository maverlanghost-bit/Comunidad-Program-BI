/**
 * public.views.js (V40.0 - SKOOL-LIKE REDESIGN)
 * Motor de Experiencia Pública & Landing.
 * * CAMBIOS V40.0:
 * - UI CARDS: Diseño estilo Skool (Cover + Avatar + Stats).
 * - LANDING: Diseño de conversión de alta fidelidad.
 * - FLOW: Lógica "Join -> Auth -> Payment" integrada.
 * - TEXTOS: Actualizados según requerimiento.
 */

window.App = window.App || {};
window.App.public = window.App.public || {};

// ============================================================================
// 1. CATALOGO (DISCOVERY) - RUTA: #comunidades
// ============================================================================

window.App.public.renderDiscovery = async () => {
    // 1. Obtener Datos (Con Fallback)
    let communities = [];
    try {
        communities = await App.api.getCommunities();
    } catch (e) {
        console.warn("Error cargando comunidades:", e);
    }

    // Fallback Data para que nunca se vea vacío
    if (!communities || communities.length === 0) {
        communities = [
            { 
                id: 'python-mastery', 
                name: 'Python Mastery', 
                description: 'Domina Python desde cero hasta avanzado. Backend, Data Science y Automatización.', 
                icon: 'fa-snake', 
                membersCount: 1420, 
                image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=800&q=80',
                price: 0
            },
            { 
                id: 'react-pro', 
                name: 'React Pro Team', 
                description: 'Construye aplicaciones web modernas con React, Next.js y Tailwind CSS.', 
                icon: 'fa-react', 
                membersCount: 850, 
                image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80',
                price: 29
            },
            { 
                id: 'data-analytics', 
                name: 'Data Analytics Hub', 
                description: 'Transforma datos en decisiones. SQL, Power BI y Tableau.', 
                icon: 'fa-chart-pie', 
                membersCount: 2100, 
                image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
                price: 0
            }
        ];
    } else {
        communities.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    const tags = ['🐍 Python', '⚛️ React', '📊 Datos', '🤖 IA', '🎨 Diseño', '💼 Negocios'];

    await App.render(`
        <div class="h-screen overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0f172a] font-sans flex flex-col relative selection:bg-[#1890ff] selection:text-white custom-scrollbar">
            
            ${_renderPublicHeader()}

            <!-- HERO SECTION (TEXTOS ACTUALIZADOS) -->
            <section class="relative pt-32 pb-16 px-6 overflow-hidden bg-white dark:bg-[#0f172a]">
                <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div class="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <div class="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                </div>

                <div class="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                    <h1 class="text-4xl md:text-6xl font-heading font-black text-slate-900 dark:text-white leading-tight tracking-tight animate-fade-in">
                        Únete a Comunidades que <br> 
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                            Aceleran Tu Aprendizaje
                        </span>
                    </h1>
                    
                    <p class="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-in delay-100">
                        Cursos interactivos, proyectos reales y colaboración experta en un ecosistema diseñado para crecer.
                    </p>

                    <div class="max-w-xl mx-auto relative group animate-fade-in delay-200">
                        <div class="relative bg-white dark:bg-slate-900 rounded-full shadow-2xl border border-gray-200 dark:border-slate-800 flex items-center p-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                            <i class="fas fa-search text-slate-400 ml-4 text-lg"></i>
                            <input type="text" id="discovery-search" placeholder="Encuentra tu comunidad..." 
                                   class="w-full bg-transparent border-none outline-none text-base p-3 text-slate-900 dark:text-white placeholder:text-slate-400"
                                   oninput="App.public.handleSearch(this.value)">
                        </div>
                    </div>

                    <div class="flex flex-wrap justify-center gap-2 animate-fade-in delay-300">
                        ${tags.map(tag => `
                            <button onclick="App.public.filterByTag('${tag}')" class="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 border border-transparent hover:border-blue-500/30 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                                ${tag}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </section>

            <!-- GRID SECTION (ESTILO SKOOL) -->
            <section class="py-12 px-4 md:px-8 max-w-[1400px] mx-auto w-full flex-1" id="communities-section">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-heading font-bold text-slate-900 dark:text-white">Descubrir</h2>
                    <div class="flex gap-2">
                        <button class="px-3 py-1 text-sm font-bold text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white">Todas</button>
                        <button class="px-3 py-1 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Populares</button>
                    </div>
                </div>

                <div id="discovery-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    ${communities.map(c => _renderSkoolCard(c)).join('')}
                </div>
            </section>
            
            <footer class="py-8 border-t border-gray-200 dark:border-slate-800 text-center text-sm text-slate-400 bg-white dark:bg-[#0f172a]">
                © 2024 ProgramBI. Construye tu futuro.
            </footer>
        </div>
        ${_renderAuthModal()}
    `);
    _setupDropdownLogic();
};

// ============================================================================
// 2. LANDING PAGE (REDISENADA TIPO SKOOL)
// ============================================================================

window.App.public.renderLanding = async (communityId) => {
    const cid = communityId;
    let c = App.state.cache.communities[cid];
    if (!c) { try { c = await App.api.getCommunityById(cid); } catch (e) {} }
    
    // Fallback Demo Data
    if (!c && ['python-mastery'].includes(cid)) {
        c = { id: cid, name: 'Python Mastery', description: 'La comunidad definitiva para backend devs.', image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935', membersCount: 1420, price: 0 };
    }

    if (!c) return App.render(`<div class="h-screen flex items-center justify-center bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">Comunidad no encontrada. <a href="#comunidades" class="ml-2 underline">Volver</a></div>`);

    const user = App.state.currentUser;
    const isMember = user && (user.joinedCommunities || []).includes(c.id);
    const hasPrice = c.price && parseFloat(c.price) > 0;
    const paymentUrl = c.paymentUrl;

    await App.render(`
        <div class="h-screen overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0f172a] font-sans custom-scrollbar">
            ${_renderPublicHeader()}

            <!-- BANNER DE COMUNIDAD -->
            <div class="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden">
                <img src="${c.image || 'https://via.placeholder.com/1500x500'}" class="w-full h-full object-cover opacity-60">
                <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
            </div>

            <!-- CONTENIDO PRINCIPAL -->
            <div class="max-w-6xl mx-auto px-4 md:px-6 relative z-10 -mt-20 pb-20">
                
                <!-- CABECERA DE PERFIL -->
                <div class="flex flex-col md:flex-row items-end md:items-center gap-6 mb-8">
                    <div class="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white dark:bg-slate-800 p-1.5 shadow-2xl shrink-0">
                        <div class="w-full h-full rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-5xl text-white">
                            <i class="fas ${c.icon || 'fa-users'}"></i>
                        </div>
                    </div>
                    <div class="flex-1 pb-2">
                        <h1 class="text-3xl md:text-4xl font-heading font-black text-slate-900 dark:text-white mb-2 text-shadow-sm">${c.name}</h1>
                        <p class="text-slate-600 dark:text-slate-300 text-lg line-clamp-2 max-w-2xl">${c.description}</p>
                    </div>
                    <div class="hidden md:block pb-4">
                        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-sm">
                            <i class="fas fa-globe"></i> Comunidad Pública
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    <!-- COLUMNA IZQUIERDA (INFO) -->
                    <div class="lg:col-span-2 space-y-8">
                        <!-- NAV TABS (Visual) -->
                        <div class="flex border-b border-gray-200 dark:border-slate-800">
                            <button class="px-6 py-3 text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600 dark:border-blue-400">Información</button>
                            <button class="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Cursos</button>
                            <button class="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Miembros</button>
                        </div>

                        <div class="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Sobre esta comunidad</h3>
                            <p class="leading-relaxed whitespace-pre-line">${c.description || 'Bienvenido a la comunidad oficial de ' + c.name + '. Aquí aprenderás y crecerás junto a otros profesionales.'}</p>
                            
                            <div class="my-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center text-xl"><i class="fas fa-video"></i></div>
                                    <div>
                                        <div class="font-bold text-slate-900 dark:text-white">Clases en Vivo</div>
                                        <div class="text-xs text-slate-500">Sesiones semanales</div>
                                    </div>
                                </div>
                                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center text-xl"><i class="fas fa-comments"></i></div>
                                    <div>
                                        <div class="font-bold text-slate-900 dark:text-white">Chat Exclusivo</div>
                                        <div class="text-xs text-slate-500">Networking 24/7</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- COLUMNA DERECHA (CTA STICKY) -->
                    <div class="lg:col-span-1">
                        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl sticky top-24">
                            
                            ${isMember ? `
                                <div class="text-center mb-6">
                                    <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl"><i class="fas fa-check"></i></div>
                                    <h3 class="font-bold text-lg text-slate-900 dark:text-white">Ya eres miembro</h3>
                                </div>
                                <button onclick="window.location.hash='#community/${c.id}'" class="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-transform flex items-center justify-center gap-2">
                                    <i class="fas fa-door-open"></i> Entrar al Aula
                                </button>
                            ` : `
                                <div class="text-center mb-6">
                                    <p class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Acceso Total</p>
                                    ${hasPrice 
                                        ? `<div class="text-5xl font-black text-slate-900 dark:text-white tracking-tight">$${c.price}<span class="text-lg text-slate-400 font-medium">/mes</span></div>` 
                                        : `<div class="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Gratis</div>`
                                    }
                                </div>

                                <button id="btn-join-landing-${c.id}" 
                                        onclick="App.public.handleJoinFlow('${c.id}', ${hasPrice}, '${paymentUrl || ''}')" 
                                        class="w-full py-4 bg-[#1890ff] hover:bg-blue-600 text-white font-bold rounded-xl text-lg shadow-blue-500/30 shadow-lg hover:-translate-y-1 transition-all mb-4 animate-pulse-glow">
                                    ${hasPrice ? 'Empezar Trial Gratis' : 'Unirse Ahora'}
                                </button>

                                <div class="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                    <div class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Acceso a todos los cursos</div>
                                    <div class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Soporte de la comunidad</div>
                                    <div class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i> Certificados incluidos</div>
                                </div>
                                
                                ${hasPrice ? `<div class="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 text-center text-xs text-slate-400">Cancelación flexible en cualquier momento.</div>` : ''}
                            `}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ${_renderAuthModal()}
        ${_renderPlanSelectionModal()} <!-- Placeholder para planes futuros -->
    `);
    _setupDropdownLogic();
};

// ============================================================================
// 3. LOGICA DE CONVERSIÓN (JOIN -> AUTH -> PAYMENT)
// ============================================================================

App.public.handleJoinFlow = async (cid, isPaid, paymentUrl) => {
    const btn = document.getElementById(`btn-join-landing-${cid}`);
    
    // 1. Verificar si está logueado
    if (App.state.currentUser) {
        if (isPaid) {
            // Usuario logueado + Comunidad de Pago -> Ir a Pasarela/Selección
            // Si hay URL externa, redirigir. Si no, mostrar modal de planes (Placeholder)
            if (paymentUrl) {
                if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirigiendo...';
                window.location.href = paymentUrl;
            } else {
                App.public.openPlanModal(cid);
            }
        } else {
            // Usuario logueado + Gratis -> Unirse Directamente
            if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uniéndote...';
            try {
                await App.api.joinCommunity(cid);
                App.ui.toast("¡Bienvenido a la comunidad!", "success");
                window.location.hash = `#community/${cid}`;
            } catch (e) {
                App.ui.toast("Error al unirse.", "error");
                if(btn) btn.innerHTML = 'Intentar de nuevo';
            }
        }
    } else {
        // 2. NO LOGUEADO -> Guardar intención y abrir Auth
        sessionStorage.setItem('pending_action', JSON.stringify({ type: 'join', cid, isPaid, paymentUrl }));
        App.public.openAuthModal('register'); // Forzar registro por defecto para nuevos usuarios
    }
};

App.public.openPlanModal = (cid) => {
    const modal = document.getElementById('plan-modal');
    if(modal) modal.classList.remove('hidden');
};
App.public.closePlanModal = () => document.getElementById('plan-modal').classList.add('hidden');

function _renderPlanSelectionModal() {
    return `
    <div id="plan-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 relative">
            <button onclick="App.public.closePlanModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10 p-2"><i class="fas fa-times"></i></button>
            <div class="p-8 md:p-12 text-center">
                <h2 class="text-3xl font-black text-slate-900 dark:text-white mb-2">Elige tu Plan</h2>
                <p class="text-slate-500 mb-8">Desbloquea todo el potencial de tu carrera.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Mensual -->
                    <div class="border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition-colors cursor-pointer text-left relative group">
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Mensual</h3>
                        <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">$29<span class="text-sm font-medium text-slate-500">/mes</span></div>
                        <p class="text-xs text-slate-500 mt-2">Facturado mensualmente.</p>
                        <button class="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">Seleccionar</button>
                    </div>
                    
                    <!-- Anual -->
                    <div class="border-2 border-blue-500 rounded-2xl p-6 bg-blue-50/10 text-left relative cursor-pointer group">
                        <div class="absolute -top-3 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">AHORRA 20%</div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Anual</h3>
                        <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">$290<span class="text-sm font-medium text-slate-500">/año</span></div>
                        <p class="text-xs text-slate-500 mt-2">Un solo pago anual.</p>
                        <button class="mt-4 w-full py-2 bg-[#1890ff] text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Seleccionar (Recomendado)</button>
                    </div>
                </div>
                <p class="text-xs text-slate-400 mt-6">Esta es una vista previa de los planes que crearás más adelante.</p>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// 4. COMPONENTES VISUALES (SKOOL STYLE)
// ============================================================================

function _renderPublicHeader() {
    const user = App.state.currentUser;
    const logoUrl = "https://cdn.shopify.com/s/files/1/0564/3812/8712/files/logo-03_b7b98699-bd18-46ee-8b1b-31885a2c4c62.png?v=1766816974";

    return `
    <header class="h-[72px] bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md fixed top-0 w-full z-50 border-b border-gray-200 dark:border-slate-800 transition-all">
        <div class="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
            <div class="cursor-pointer flex items-center gap-2" onclick="window.location.hash='#comunidades'">
                <img src="${logoUrl}" alt="ProgramBI" class="h-7 object-contain">
            </div>

            <div class="flex items-center gap-3">
                ${!user ? `
                    <button onclick="App.public.openAuthModal('login')" class="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 transition-colors">Log In</button>
                    <button onclick="App.public.openAuthModal('register')" class="bg-[#1890ff] hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all shadow-lg shadow-blue-500/20">Sign Up</button>
                ` : `
                    <div class="relative" id="my-communities-wrapper">
                        <button id="btn-my-communities" class="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full border border-transparent hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                            <img src="${user.avatar}" class="w-8 h-8 rounded-full object-cover">
                            <i class="fas fa-chevron-down text-xs text-slate-400"></i>
                        </button>
                        <div id="dropdown-communities" class="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hidden animate-slide-up z-50">
                            <div class="p-3 border-b border-gray-50 dark:border-slate-800">
                                <p class="text-sm font-bold text-slate-900 dark:text-white truncate">${user.name}</p>
                            </div>
                            <div class="p-1">
                                <a href="#feed" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium">
                                    <i class="fas fa-columns w-5 text-center"></i> Dashboard
                                </a>
                                <button onclick="App.api.logout()" class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 text-sm font-medium">
                                    <i class="fas fa-sign-out-alt w-5 text-center"></i> Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
    </header>`;
}

// --- SKOOL CARD DESIGN ---
function _renderSkoolCard(c) {
    const isFree = !c.price || parseFloat(c.price) === 0;
    
    return `
    <div onclick="window.location.hash='#comunidades/${c.id}'" class="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col overflow-hidden relative">
        <!-- Cover Image (Top Half) -->
        <div class="h-32 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            ${c.image 
                ? `<img src="${c.image}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">` 
                : `<div class="w-full h-full bg-gradient-to-r from-blue-500 to-violet-600"></div>`
            }
            <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
        </div>

        <!-- Content -->
        <div class="p-5 pt-12 relative flex-1 flex flex-col">
            <!-- Avatar Superpuesto -->
            <div class="absolute -top-8 left-5 w-16 h-16 rounded-xl bg-white dark:bg-slate-900 p-1 shadow-md">
                <div class="w-full h-full rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl text-[#1890ff] overflow-hidden">
                    ${c.icon && c.icon.startsWith('http') 
                        ? `<img src="${c.icon}" class="w-full h-full object-cover">` 
                        : `<i class="fas ${c.icon || 'fa-users'}"></i>`
                    }
                </div>
            </div>

            <!-- Title & Desc -->
            <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-[#1890ff] transition-colors line-clamp-1">${c.name}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 font-medium">${c.description || 'Sin descripción.'}</p>

            <!-- Metadata Footer -->
            <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                <div class="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wide">
                    <i class="fas fa-user-friends"></i> ${App.ui.formatNumber(c.membersCount || 0)}
                </div>
                <div class="text-xs font-bold px-2 py-1 rounded border ${isFree ? 'border-green-200 text-green-600 bg-green-50 dark:bg-green-900/10 dark:border-green-900' : 'border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900'}">
                    ${isFree ? 'GRATIS' : 'PREMIUM'}
                </div>
            </div>
        </div>
    </div>`;
}

// --- MODAL DE AUTH (Reutilizado pero adaptado a V40) ---
function _renderAuthModal() {
    return `
    <div id="auth-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 relative">
            <button onclick="App.public.closeAuthModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors z-10 p-2"><i class="fas fa-times"></i></button>
            <div class="p-8">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-black text-slate-900 dark:text-white" id="auth-title">Bienvenido</h2>
                    <p class="text-slate-500 text-sm font-medium">Accede a tu cuenta para continuar</p>
                </div>
                
                <div class="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg mb-6">
                    <button onclick="App.public.switchAuthTab('login')" id="tab-login" class="flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md shadow bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all">Entrar</button>
                    <button onclick="App.public.switchAuthTab('register')" id="tab-register" class="flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all">Registro</button>
                </div>

                <form id="form-login" onsubmit="App.public.submitAuth(event, 'login')" class="space-y-4">
                    <input type="email" name="email" placeholder="Email" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all dark:text-white">
                    <input type="password" name="password" placeholder="Contraseña" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all dark:text-white">
                    <button type="submit" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity">Iniciar Sesión</button>
                </form>

                <form id="form-register" onsubmit="App.public.submitAuth(event, 'register')" class="space-y-4 hidden">
                    <input type="text" name="name" placeholder="Nombre completo" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all dark:text-white">
                    <input type="email" name="email" placeholder="Email" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all dark:text-white">
                    <input type="password" name="password" placeholder="Contraseña" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all dark:text-white">
                    <input type="password" name="confirm_password" placeholder="Confirmar contraseña" required class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all dark:text-white">
                    <button type="submit" class="w-full bg-[#1890ff] text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30">Crear Cuenta Gratis</button>
                </form>
            </div>
        </div>
    </div>`;
}

// Helpers Auth
App.public.openAuthModal = (mode) => { document.getElementById('auth-modal').classList.remove('hidden'); App.public.switchAuthTab(mode); };
App.public.closeAuthModal = () => document.getElementById('auth-modal').classList.add('hidden');
App.public.switchAuthTab = (mode) => {
    const l = document.getElementById('form-login'), r = document.getElementById('form-register');
    const tl = document.getElementById('tab-login'), tr = document.getElementById('tab-register');
    if (mode === 'login') { 
        l.classList.remove('hidden'); r.classList.add('hidden'); 
        tl.className = "flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md shadow bg-white dark:bg-slate-700 text-slate-900 dark:text-white"; 
        tr.className = "flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-white"; 
    } else { 
        l.classList.add('hidden'); r.classList.remove('hidden'); 
        tr.className = "flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md shadow bg-white dark:bg-slate-700 text-slate-900 dark:text-white"; 
        tl.className = "flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-white"; 
    }
};

App.public.submitAuth = async (e, mode) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (mode === 'register' && data.password !== data.confirm_password) return App.ui.toast("Contraseñas no coinciden", "error");

    try {
        let user;
        if (mode === 'login') user = await App.api.login(data.email, data.password);
        else user = await App.api.register(data);

        App.ui.toast(`¡Bienvenido ${user.displayName || 'Dev'}!`, 'success');
        App.public.closeAuthModal();

        // Check Pending Actions (Join Flow)
        const pending = sessionStorage.getItem('pending_action');
        if (pending) {
            const action = JSON.parse(pending);
            sessionStorage.removeItem('pending_action');
            if (action.type === 'join') App.public.handleJoinFlow(action.cid, action.isPaid, action.paymentUrl);
        } else {
            window.location.hash = '#feed';
        }
    } catch (err) {
        App.ui.toast("Error de autenticación: " + err.message, "error");
    }
};

App.public.handleSearch = (q) => {
    const term = q.toLowerCase();
    document.querySelectorAll('.discovery-card').forEach(c => {
        c.parentNode.style.display = c.innerText.toLowerCase().includes(term) ? 'block' : 'none'; // Grid fix
    });
};

App.public.filterByTag = (tag) => {
    const term = tag.replace(/[^a-zA-ZáéíóúÁÉÍÓÚ ]/g, "").trim().split(' ')[0];
    document.getElementById('discovery-search').value = term;
    App.public.handleSearch(term);
};

function _setupDropdownLogic() {
    const btn = document.getElementById('btn-my-communities');
    const menu = document.getElementById('dropdown-communities');
    if (btn && menu) {
        btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
        document.addEventListener('click', (e) => { if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.add('hidden'); });
    }
}