/**
 * admin.views.js (V47.0 - PRO PLAN BUILDER)
 * Panel de Control Unificado.
 * * CAMBIOS V47.0:
 * - PLANES: Soporte completo para facturación dual (Mensual/Anual).
 * - TRIALS: Configuración de días de prueba y flag "Sin Tarjeta".
 * - DYNAMIC V2: Constructor de variantes con Links de Pago independientes por opción.
 */

window.App = window.App || {};
window.App.admin = window.App.admin || {};

// Almacenes temporales para la edición en curso
window.App.admin.tempPlans = [];
window.App.admin.tempGallery = [];
window.App.admin.tempVariants = [];

// ==========================================
// 1. RENDERIZADOR PRINCIPAL & SEGURIDAD
// ==========================================
window.App.renderAdmin = async (activeTab = 'overview') => {
    const user = App.state.currentUser;

    // 1. Verificación rápida de sesión local
    if (!user) {
        window.location.hash = '#feed';
        return;
    }

    // 2. Pantalla de carga mientras verificamos permisos reales
    await App.render(`
        <div class="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-[#020617] font-sans">
            <i class="fas fa-circle-notch fa-spin text-4xl text-[#1890ff] mb-4"></i>
            <p class="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Verificando credenciales de administrador...</p>
        </div>
    `);

    // 3. Verificación Estricta contra Firestore
    let isVerifiedAdmin = false;
    try {
        const userDocRef = window.F.doc(window.F.db, "users", user.uid);
        const userDocSnap = await window.F.getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.role === 'admin') {
                isVerifiedAdmin = true;
            }
        }
    } catch (e) {
        console.error("Error crítico verificando admin:", e);
    }

    // 4. Bloqueo de Acceso si falla
    if (!isVerifiedAdmin) {
        return App.render(`
            <div class="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#020617] animate-fade-in font-sans p-4">
                <div class="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-red-100 dark:border-red-900/30">
                    <i class="fas fa-shield-alt text-3xl"></i>
                </div>
                <h2 class="text-2xl font-heading font-bold mb-2 text-slate-900 dark:text-white">Acceso Denegado</h2>
                <p class="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8 font-medium">
                    La cuenta <span class="text-slate-900 dark:text-white font-bold">${user.email}</span> no tiene permisos de administrador.
                </p>
                <div class="flex gap-4">
                    <button onclick="window.location.hash='#feed'" class="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-white hover:bg-gray-50 transition-colors">Volver</button>
                    <button onclick="App.api.logout()" class="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">Cerrar Sesión</button>
                </div>
            </div>
        `);
    }

    // 5. Configuración de Layout Dinámico
    const isSidebarPinned = localStorage.getItem('sidebar_pinned') === 'true';
    if (isSidebarPinned) document.body.classList.add('sidebar-is-pinned');
    else document.body.classList.remove('sidebar-is-pinned');

    const sidebarHTML = App.sidebar && App.sidebar.render ? App.sidebar.render('admin') : '';

    await App.render(`
        <style>
            #admin-main { 
                transition: margin-left 300ms ease-in-out;
                will-change: margin-left;
            }
            @media (max-width: 767px) { #admin-main { margin-left: 0 !important; padding-bottom: 80px; } }
            @media (min-width: 768px) {
                #admin-main { margin-left: 72px; }
                body.sidebar-is-pinned #admin-main { margin-left: 260px; }
            }
        </style>

        ${sidebarHTML}
        
        <main id="admin-main" class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors p-6 lg:p-8 relative flex flex-col">
            <!-- HEADER -->
            <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                <div>
                    <h1 class="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <span class="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-lg shadow-lg"><i class="fas fa-cogs"></i></span>
                        Panel de Control
                    </h1>
                    <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-1">Administración Global del Sistema</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="App.admin.openCommunityModal()" class="px-5 py-3 bg-[#1890ff] text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 group">
                        <i class="fas fa-plus group-hover:rotate-90 transition-transform"></i> Nueva Comunidad
                    </button>
                </div>
            </header>

            <!-- TABS DE NAVEGACIÓN -->
            <div class="flex items-center gap-2 mb-8 border-b border-gray-200 dark:border-slate-800 overflow-x-auto pb-1 custom-scrollbar sticky top-0 bg-[#F8FAFC]/90 dark:bg-[#020617]/90 backdrop-blur z-20">
                <button onclick="App.renderAdmin('overview')" class="px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm font-bold ${activeTab === 'overview' ? 'border-[#1890ff] text-[#1890ff]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}">
                    <i class="fas fa-chart-pie mr-2"></i> Resumen
                </button>
                <button onclick="App.renderAdmin('communities')" class="px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm font-bold ${activeTab === 'communities' ? 'border-[#1890ff] text-[#1890ff]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}">
                    <i class="fas fa-layer-group mr-2"></i> Comunidades
                </button>
                <button onclick="App.renderAdmin('users')" class="px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm font-bold ${activeTab === 'users' ? 'border-[#1890ff] text-[#1890ff]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}">
                    <i class="fas fa-users mr-2"></i> Usuarios
                </button>
                <button onclick="App.renderAdmin('content')" class="px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm font-bold ${activeTab === 'content' ? 'border-[#1890ff] text-[#1890ff]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}">
                    <i class="fas fa-newspaper mr-2"></i> Moderación
                </button>
            </div>

            <div id="admin-content" class="flex-1 animate-fade-in relative z-10">
                <div class="flex justify-center py-12"><i class="fas fa-circle-notch fa-spin text-4xl text-[#1890ff]"></i></div>
            </div>
        </main>
        
        <!-- MODALES GLOBALES -->
        ${_renderCommunityModalUnified()}
        ${_renderAdminEditPostModal()}
    `);

    if (activeTab === 'overview') _loadAdminOverview();
    else if (activeTab === 'communities') _loadAdminCommunities();
    else if (activeTab === 'users') _loadAdminUsers();
    else if (activeTab === 'content') _loadAdminContent();
};

// ==========================================
// 2. LÓGICA DE CARGA DE TABS
// ==========================================

async function _loadAdminOverview() {
    const container = document.getElementById('admin-content');
    try {
        const [usersSnap, commsSnap, postsSnap] = await Promise.all([
            window.F.getDocs(window.F.collection(window.F.db, "users")),
            window.F.getDocs(window.F.collection(window.F.db, "communities")),
            window.F.getDocs(window.F.collection(window.F.db, "posts"))
        ]);

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                ${_renderKPICard('Usuarios Totales', usersSnap.size, 'fa-users', 'text-blue-600', 'bg-blue-50 dark:bg-blue-900/20')}
                ${_renderKPICard('Comunidades', commsSnap.size, 'fa-project-diagram', 'text-purple-600', 'bg-purple-50 dark:bg-purple-900/20')}
                ${_renderKPICard('Posts Activos', postsSnap.size, 'fa-comment-alt', 'text-green-600', 'bg-green-50 dark:bg-green-900/20')}
                ${_renderKPICard('Estado Sistema', 'Online', 'fa-check-circle', 'text-orange-600', 'bg-orange-50 dark:bg-orange-900/20')}
            </div>
            
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 text-center shadow-sm">
                 <div class="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1890ff] text-3xl"><i class="fas fa-rocket"></i></div>
                 <h3 class="text-xl font-bold text-slate-900 dark:text-white">Panel de Administración</h3>
                 <p class="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-2">Gestiona comunidades, usuarios y contenido desde un solo lugar.</p>
            </div>
        `;
    } catch (e) { console.error(e); }
}

async function _loadAdminCommunities() {
    const container = document.getElementById('admin-content');
    try {
        const communities = await App.api.getCommunities();
        
        if (communities.length === 0) {
            container.innerHTML = `<div class="text-center py-20 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl"><p class="text-slate-500">No hay comunidades creadas.</p><button onclick="App.admin.openCommunityModal()" class="text-[#1890ff] font-bold hover:underline mt-2">Crear la primera</button></div>`;
            return;
        }

        container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            ${communities.map(c => {
                const planCount = c.plans ? c.plans.length : 0;
                const galleryCount = c.gallery ? c.gallery.length : (c.image ? 1 : 0);
                
                return `
                <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all group relative">
                    <div class="flex items-start justify-between mb-4">
                        <div class="w-16 h-16 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-slate-700 relative">
                            ${c.image ? `<img src="${c.image}" class="w-full h-full object-cover">` : `<i class="fas ${c.icon || 'fa-users'} text-2xl text-slate-400"></i>`}
                            ${galleryCount > 1 ? `<div class="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] px-1.5 rounded-md font-bold backdrop-blur-sm">+${galleryCount-1}</div>` : ''}
                        </div>
                        <div class="flex gap-2">
                            <button onclick="App.admin.editCommunity('${c.id}')" class="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"><i class="fas fa-pen text-xs"></i></button>
                            <button onclick="App.admin.deleteCommunity('${c.id}')" class="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors"><i class="fas fa-trash text-xs"></i></button>
                        </div>
                    </div>
                    <h3 class="font-bold text-slate-900 dark:text-white text-lg mb-1 truncate">${c.name}</h3>
                    <p class="text-xs text-slate-400 font-mono mb-3 truncate">ID: ${c.id}</p>
                    
                    <div class="flex gap-2 text-xs font-bold mb-4">
                        <span class="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700"><i class="fas fa-tags mr-1"></i> ${planCount} Planes</span>
                        <span class="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700"><i class="fas fa-photo-video mr-1"></i> ${galleryCount} Assets</span>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    } catch (e) { 
        console.error(e); 
        container.innerHTML = `<div class="p-8 text-center text-red-500">Error cargando comunidades.</div>`;
    }
}

async function _loadAdminUsers() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
            <div class="p-6 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <h3 class="font-bold text-slate-900 dark:text-white">Directorio de Usuarios</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Gestión completa de estudiantes y roles.</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                        <tr>
                            <th class="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Usuario</th>
                            <th class="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Rol</th>
                            <th class="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Comunidades</th>
                            <th class="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-slate-800" id="users-table-body">
                        <tr><td colspan="4" class="p-8 text-center"><i class="fas fa-circle-notch fa-spin text-[#1890ff]"></i> Cargando usuarios...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

    try {
        const snap = await window.F.getDocs(window.F.query(window.F.collection(window.F.db, "users"), window.F.limit(50)));
        const tbody = document.getElementById('users-table-body');
        
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500">No hay usuarios registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = snap.docs.map(doc => {
            const u = doc.data();
            return `
            <tr class="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        ${u.avatar ? `<img src="${u.avatar}" class="w-8 h-8 rounded-full bg-gray-200 object-cover">` : `<div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">${(u.name||'U').charAt(0)}</div>`}
                        <div>
                            <p class="font-bold text-slate-900 dark:text-white">${u.name || 'Sin Nombre'}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400">${u.email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}">${u.role || 'student'}</span>
                </td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    ${(u.joinedCommunities || []).length}
                </td>
                <td class="px-6 py-4 text-right">
                    <button class="text-slate-400 hover:text-[#1890ff] transition-colors"><i class="fas fa-edit"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) { console.error(e); }
}

async function _loadAdminContent() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `
    <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
        <div class="p-6 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <h3 class="font-bold text-slate-900 dark:text-white">Moderación de Contenido</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Supervisa y edita las últimas publicaciones.</p>
        </div>
        <div id="moderation-list" class="divide-y divide-gray-100 dark:divide-slate-800">
            <div class="p-12 text-center"><i class="fas fa-circle-notch fa-spin text-[#1890ff]"></i></div>
        </div>
    </div>`;

    try {
        const q = window.F.query(window.F.collection(window.F.db, "posts"), window.F.orderBy("createdAt", "desc"), window.F.limit(50));
        const snap = await window.F.getDocs(q);
        const list = document.getElementById('moderation-list');
        
        if (snap.empty) {
            list.innerHTML = `<div class="p-12 text-center text-slate-500 italic">No hay publicaciones recientes.</div>`;
            return;
        }

        list.innerHTML = snap.docs.map(doc => {
            const p = { id: doc.id, ...doc.data() };
            return `
            <div class="p-6 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group flex gap-4" id="mod-post-${p.id}">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="font-bold text-sm text-slate-900 dark:text-white">${p.authorName || 'Anónimo'}</span>
                        <span class="text-xs text-slate-400">• ${new Date(p.createdAt).toLocaleDateString()}</span>
                        <span class="text-[10px] text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 rounded-full font-mono">ID: ${p.id.substring(0,6)}</span>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-300 truncate font-medium">${p.content}</p>
                </div>
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="App.admin.openPostEdit('${p.id}', '${encodeURIComponent(p.content || '')}')" class="p-2 text-slate-400 hover:text-[#1890ff] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"><i class="fas fa-pen text-xs"></i></button>
                    <button onclick="App.admin.deletePost('${p.id}')" class="p-2 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"><i class="fas fa-trash text-xs"></i></button>
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.error(e); }
}

// ==========================================
// 3. LÓGICA DE NEGOCIO (CORE PLANES V47)
// ==========================================

// --- A. GESTIÓN DE VARIANTES (CONSTRUCTOR VISUAL V2) ---
App.admin.addVariant = () => {
    const name = document.getElementById('var-name').value.trim();
    const price = parseFloat(document.getElementById('var-price').value);
    const link = document.getElementById('var-link').value.trim();

    if (!name || isNaN(price)) {
        return App.ui.toast("Debes ingresar al menos Nombre y Precio", "warning");
    }

    if (!link) {
        return App.ui.toast("El link de pago es obligatorio para planes dinámicos", "warning");
    }

    // Agregar al store temporal (Ahora INCLUYE el paymentUrl)
    App.admin.tempVariants.push({ name, price, paymentUrl: link });
    
    // Limpiar inputs
    document.getElementById('var-name').value = '';
    document.getElementById('var-price').value = '';
    document.getElementById('var-link').value = '';
    
    // Renderizar la lista visual
    App.admin.renderVariantsList();
};

App.admin.removeVariant = (index) => {
    App.admin.tempVariants.splice(index, 1);
    App.admin.renderVariantsList();
};

App.admin.renderVariantsList = () => {
    const container = document.getElementById('variants-list-visual');
    if (!container) return;

    if (App.admin.tempVariants.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-xs text-slate-400 italic bg-white dark:bg-slate-900 rounded-lg border border-dashed border-gray-300 dark:border-slate-700">No hay variantes agregadas. Usa los campos de arriba.</div>`;
        return;
    }

    container.innerHTML = App.admin.tempVariants.map((v, idx) => `
        <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-gray-200 dark:border-slate-700 mb-2 shadow-sm text-xs group">
            <div class="flex-1 min-w-0 mr-3">
                <div class="font-bold text-slate-800 dark:text-white truncate">${v.name}</div>
                <div class="flex items-center gap-2 text-slate-500">
                    <span class="text-green-600 font-mono font-bold">$${v.price}</span>
                    <span class="text-slate-300">|</span>
                    <span class="truncate text-[10px] max-w-[150px] text-blue-500"><i class="fas fa-link"></i> ${v.paymentUrl || 'Sin link'}</span>
                </div>
            </div>
            <button onclick="App.admin.removeVariant(${idx})" class="text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 p-1.5 rounded transition-colors"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
};

// --- B. GESTIÓN DE PLANES UNIFICADA (PRO) ---
App.admin.toggleDynamicPricingUI = (enabled) => {
    const dynamicSection = document.getElementById('plan-dynamic-settings');
    const staticSection = document.getElementById('plan-static-pricing');
    
    if (enabled) {
        dynamicSection.classList.remove('hidden');
        staticSection.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
    } else {
        dynamicSection.classList.add('hidden');
        staticSection.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
    }
};

App.admin.addPlanUnified = () => {
    const name = document.getElementById('plan-name').value.trim();
    const isDynamic = document.getElementById('plan-is-dynamic').checked;

    if (!name) return App.ui.toast("Nombre del plan requerido", "warning");

    let planData = {
        id: 'plan_' + Date.now(),
        name,
        features: document.getElementById('plan-features').value.split(',').map(s => s.trim()).filter(Boolean),
        isDynamic: isDynamic,
        // Configuración de Trial (Global para el plan)
        trialDays: parseInt(document.getElementById('plan-trial-days').value) || 0,
        noCardRequired: document.getElementById('plan-no-card').checked
    };

    if (isDynamic) {
        if (App.admin.tempVariants.length === 0) {
            return App.ui.toast("Debes agregar al menos una variante en la lista", "error");
        }
        
        planData.dynamicPricing = {
            selectorLabel: document.getElementById('dyn-unit-name').value || 'Selecciona una opción',
            variants: [...App.admin.tempVariants]
        };
        // Precio base visual (el menor de las variantes)
        const minPrice = Math.min(...App.admin.tempVariants.map(v => v.price));
        planData.priceMonthly = minPrice; // Fallback para compatibilidad
        planData.priceDisplay = `Desde $${minPrice}`;
    } else {
        // Modo Estático Dual (Mensual + Anual)
        const priceMonthly = parseFloat(document.getElementById('plan-price-monthly').value);
        const urlMonthly = document.getElementById('plan-link-monthly').value.trim();
        const priceAnnual = parseFloat(document.getElementById('plan-price-annual').value);
        const urlAnnual = document.getElementById('plan-link-annual').value.trim();

        if (isNaN(priceMonthly) && isNaN(priceAnnual)) {
            return App.ui.toast("Debes definir al menos un precio (Mensual o Anual)", "warning");
        }

        planData.priceMonthly = isNaN(priceMonthly) ? null : priceMonthly;
        planData.paymentUrlMonthly = urlMonthly;
        planData.priceAnnual = isNaN(priceAnnual) ? null : priceAnnual;
        planData.paymentUrlAnnual = urlAnnual;
        
        // Compatibilidad Legacy
        planData.price = planData.priceMonthly || planData.priceAnnual;
        planData.interval = planData.priceMonthly ? 'month' : 'year';
        planData.paymentUrl = planData.paymentUrlMonthly || planData.paymentUrlAnnual;
    }

    App.admin.tempPlans.push(planData);
    
    // Limpiar Formulario
    document.getElementById('plan-name').value = '';
    document.getElementById('plan-features').value = '';
    document.getElementById('plan-is-dynamic').checked = false;
    document.getElementById('plan-trial-days').value = '';
    document.getElementById('plan-no-card').checked = false;
    
    // Limpiar Sección Estática
    document.getElementById('plan-price-monthly').value = '';
    document.getElementById('plan-link-monthly').value = '';
    document.getElementById('plan-price-annual').value = '';
    document.getElementById('plan-link-annual').value = '';

    // Limpiar Sección Dinámica
    document.getElementById('dyn-unit-name').value = '';
    App.admin.tempVariants = [];
    App.admin.renderVariantsList();
    App.admin.toggleDynamicPricingUI(false);

    App.admin.renderPlansList();
};

App.admin.removePlan = (idx) => {
    App.admin.tempPlans.splice(idx, 1);
    App.admin.renderPlansList();
};

App.admin.renderPlansList = () => {
    const list = document.getElementById('plans-list');
    if (!list) return;
    
    if (App.admin.tempPlans.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs italic bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">Sin planes configurados. Agrega uno a la derecha.</div>`;
        return;
    }

    list.innerHTML = App.admin.tempPlans.map((p, idx) => {
        let details = '';
        if (p.isDynamic && p.dynamicPricing) {
            const count = p.dynamicPricing.variants.length;
            details = `<div class="text-xs text-blue-600 bg-blue-50 p-1.5 rounded mt-1 border border-blue-100 flex items-center gap-1">
                <i class="fas fa-bolt"></i> Dinámico: ${count} variantes
            </div>`;
        } else {
            const monthly = p.priceMonthly ? `$${p.priceMonthly}/mes` : '';
            const annual = p.priceAnnual ? `$${p.priceAnnual}/año` : '';
            const sep = (monthly && annual) ? ' + ' : '';
            details = `<div class="text-xs text-slate-500 font-mono mt-1">${monthly}${sep}${annual}</div>`;
        }
        
        let trialLabel = '';
        if (p.trialDays > 0) {
            trialLabel = `<span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200 ml-2">Trial ${p.trialDays}d</span>`;
        }

        return `
        <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-700 relative group hover:border-blue-300 transition-colors">
            <div class="flex justify-between items-start">
                <h5 class="font-bold text-slate-900 dark:text-white text-sm flex items-center">${p.name} ${trialLabel}</h5>
                <button onclick="App.admin.removePlan(${idx})" class="text-slate-400 hover:text-red-500 transition-colors"><i class="fas fa-trash text-xs"></i></button>
            </div>
            ${details}
        </div>`;
    }).join('');
};

// --- C. GESTIÓN COMUNIDADES (MODAL) ---
App.admin.openCommunityModal = () => {
    const m = document.getElementById('community-modal');
    if(!m) return;
    
    document.getElementById('modal-title').innerText = "Nueva Comunidad";
    document.getElementById('btn-save-community').innerText = "Crear Comunidad";
    
    // Reset Inputs
    ['comm-id','comm-name','comm-icon','comm-desc','comm-category'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    
    // Reset Stores
    App.admin.tempPlans = [];
    App.admin.tempGallery = [];
    App.admin.tempVariants = [];
    
    App.admin.renderGalleryList();
    App.admin.renderPlansList();
    App.admin.renderVariantsList();
    App.admin.toggleDynamicPricingUI(false);

    m.classList.remove('hidden');
};

App.admin.closeCommunityModal = () => document.getElementById('community-modal').classList.add('hidden');

App.admin.editCommunity = async (id) => {
    try {
        const comm = await App.api.getCommunityById(id);
        if (!comm) return;

        const m = document.getElementById('community-modal');
        document.getElementById('modal-title').innerText = "Editar Comunidad";
        document.getElementById('btn-save-community').innerText = "Guardar Cambios";

        // Datos Básicos
        document.getElementById('comm-id').value = comm.id;
        document.getElementById('comm-name').value = comm.name || '';
        document.getElementById('comm-icon').value = comm.icon || '';
        document.getElementById('comm-desc').value = comm.description || '';
        document.getElementById('comm-category').value = comm.category || 'General';
        
        // Cargar Galería
        App.admin.tempGallery = comm.gallery || [];
        if (App.admin.tempGallery.length === 0) {
            if (comm.image) App.admin.tempGallery.push({ type: 'image', url: comm.image });
            if (comm.videoUrl) App.admin.tempGallery.push({ type: 'video', url: comm.videoUrl });
        }
        App.admin.renderGalleryList();

        // Cargar Planes (Mapeo Inteligente)
        App.admin.tempPlans = comm.plans || [];
        // Compatibilidad Legacy si es necesario
        if (App.admin.tempPlans.length === 0 && comm.priceMonthly) {
            App.admin.tempPlans.push({
                id: 'legacy_'+Date.now(), name: 'Plan Estándar', 
                priceMonthly: comm.priceMonthly, 
                paymentUrlMonthly: comm.paymentUrl || '',
                price: comm.priceMonthly, interval: 'month'
            });
        }
        App.admin.renderPlansList();

        // Reset Variantes UI
        App.admin.tempVariants = [];
        App.admin.renderVariantsList();
        App.admin.toggleDynamicPricingUI(false);

        m.classList.remove('hidden');
    } catch (e) { console.error(e); App.ui.toast("Error cargando datos", "error"); }
};

App.admin.saveCommunity = async () => {
    const btn = document.getElementById('btn-save-community');
    let id = document.getElementById('comm-id').value;
    const name = document.getElementById('comm-name').value.trim();
    
    if (!name) return App.ui.toast("El nombre es obligatorio", "warning");

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';

    // 1. GENERACIÓN Y VALIDACIÓN DE SLUG
    if (!id) {
        id = name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        if (id.length < 3) id += "-edu";

        try {
            const docRef = window.F.doc(window.F.db, "communities", id);
            const docSnap = await window.F.getDoc(docRef);
            if (docSnap.exists()) {
                btn.disabled = false; btn.innerHTML = "Crear Comunidad";
                return App.ui.toast(`El nombre "${name}" ya existe.`, "error");
            }
        } catch(e) { console.error(e); }
    }

    // 2. PREPARAR DATOS
    // Calculamos precios mínimos para mostrar "Desde $X" en cards
    const allPrices = [];
    App.admin.tempPlans.forEach(p => {
        if (p.isDynamic && p.dynamicPricing) {
            p.dynamicPricing.variants.forEach(v => allPrices.push(v.price));
        } else {
            if (p.priceMonthly) allPrices.push(p.priceMonthly);
        }
    });
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;

    const data = {
        id: id,
        name: name,
        icon: document.getElementById('comm-icon').value.trim(),
        description: document.getElementById('comm-desc').value.trim(),
        category: document.getElementById('comm-category').value,
        gallery: App.admin.tempGallery,
        image: App.admin.tempGallery.find(i => i.type === 'image')?.url || '',
        videoUrl: App.admin.tempGallery.find(i => i.type === 'video')?.url || '',
        plans: App.admin.tempPlans,
        priceMonthly: minPrice, // Precio de referencia para filtrado
        isPublic: true, 
        updatedAt: new Date().toISOString()
    };

    try {
        await window.F.setDoc(window.F.doc(window.F.db, "communities", id), data, { merge: true });
        App.ui.toast("Comunidad guardada con éxito", "success");
        App.admin.closeCommunityModal();
        App.renderAdmin('communities');
    } catch (e) {
        console.error(e);
        App.ui.toast("Error al guardar en base de datos", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = document.getElementById('comm-id').value ? "Guardar Cambios" : "Crear Comunidad";
    }
};

App.admin.deleteCommunity = async (id) => {
    if(confirm("⚠️ ¿Estás seguro de eliminar esta comunidad? Esta acción no se puede deshacer.")) {
        try {
            await window.F.deleteDoc(window.F.doc(window.F.db, "communities", id));
            App.ui.toast("Comunidad eliminada", "success");
            App.renderAdmin('communities');
        } catch (e) {
            App.ui.toast("Error al eliminar", "error");
        }
    }
};

// --- D. GESTOR MULTIMEDIA ---
App.admin.addMediaItem = () => {
    const url = document.getElementById('media-url').value.trim();
    const type = document.getElementById('media-type').value; 
    
    if (!url) return App.ui.toast("Ingresa una URL válida", "warning");

    let finalUrl = url;
    if (type === 'video' && url.includes('youtube.com/watch?v=')) {
        finalUrl = url.split('v=')[1].split('&')[0]; 
    }

    App.admin.tempGallery.push({ type, url: finalUrl });
    document.getElementById('media-url').value = '';
    App.admin.renderGalleryList();
};

App.admin.removeMediaItem = (index) => {
    App.admin.tempGallery.splice(index, 1);
    App.admin.renderGalleryList();
};

App.admin.moveMediaItem = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === App.admin.tempGallery.length - 1) return;

    const item = App.admin.tempGallery[index];
    App.admin.tempGallery.splice(index, 1);
    App.admin.tempGallery.splice(index + direction, 0, item);
    App.admin.renderGalleryList();
};

App.admin.renderGalleryList = () => {
    const list = document.getElementById('gallery-list');
    if (!list) return;

    if (App.admin.tempGallery.length === 0) {
        list.innerHTML = `<div class="col-span-full text-center py-6 text-slate-400 text-xs italic bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">Sin contenido multimedia.</div>`;
        return;
    }

    list.innerHTML = App.admin.tempGallery.map((item, idx) => `
        <div class="relative group aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-black">
            ${item.type === 'image' 
                ? `<img src="${item.url}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">` 
                : `<div class="w-full h-full flex items-center justify-center bg-slate-900 text-red-500"><i class="fab fa-youtube text-3xl"></i></div>`
            }
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onclick="App.admin.moveMediaItem(${idx}, -1)" class="w-8 h-8 rounded-full bg-white text-slate-900 hover:bg-[#1890ff] hover:text-white transition-colors flex items-center justify-center"><i class="fas fa-arrow-left"></i></button>
                <button onclick="App.admin.removeMediaItem(${idx})" class="w-8 h-8 rounded-full bg-white text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"><i class="fas fa-trash"></i></button>
                <button onclick="App.admin.moveMediaItem(${idx}, 1)" class="w-8 h-8 rounded-full bg-white text-slate-900 hover:bg-[#1890ff] hover:text-white transition-colors flex items-center justify-center"><i class="fas fa-arrow-right"></i></button>
            </div>
        </div>
    `).join('');
};

// --- E. MODERACIÓN ---
App.admin.openPostEdit = (id, content) => {
    document.getElementById('admin-edit-post-id').value = id;
    document.getElementById('admin-edit-post-content').value = decodeURIComponent(content);
    document.getElementById('admin-post-edit-modal').classList.remove('hidden');
};

App.admin.closePostEdit = () => document.getElementById('admin-post-edit-modal').classList.add('hidden');

App.admin.savePostEdit = async () => {
    const id = document.getElementById('admin-edit-post-id').value;
    const content = document.getElementById('admin-edit-post-content').value;
    const btn = document.querySelector('#admin-post-edit-modal button:last-child');
    
    btn.innerHTML = 'Guardando...';
    btn.disabled = true;

    try {
        await App.api.updatePost(id, { content });
        App.ui.toast("Publicación editada correctamente", "success");
        App.admin.closePostEdit();
        App.renderAdmin('content'); 
    } catch(e) { 
        console.error(e);
        App.ui.toast("Error al editar", "error"); 
    } finally {
        btn.innerHTML = 'Guardar';
        btn.disabled = false;
    }
};

App.admin.deletePost = async (postId) => {
    if(!confirm("⚠️ ¿Eliminar permanentemente?")) return;
    
    try {
        await App.api.deletePost(postId);
        App.ui.toast("Eliminado", "success");
        const el = document.getElementById(`mod-post-${postId}`);
        if(el) el.remove();
    } catch(e) { App.ui.toast("Error al eliminar", "error"); }
};

// ==========================================
// 4. HELPERS VISUALES
// ==========================================
function _renderKPICard(title, value, icon, colorText, colorBg) {
    return `
    <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">${title}</p>
            <h3 class="text-2xl font-heading font-extrabold text-slate-900 dark:text-white">${App.ui.formatNumber(value)}</h3>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center ${colorBg} ${colorText} text-lg shadow-sm">
            <i class="fas ${icon}"></i>
        </div>
    </div>`;
}

// ==========================================
// 5. MODALES UNIFICADOS (HTML)
// ==========================================

function _renderCommunityModalUnified() {
    return `
    <div id="community-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
        <div class="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            
            <!-- Modal Header -->
            <div class="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center rounded-t-3xl z-10 shrink-0">
                <div>
                    <h3 class="font-heading font-bold text-xl text-slate-900 dark:text-white" id="modal-title">Nueva Comunidad</h3>
                    <p class="text-xs text-slate-500">Configura la identidad, galería y planes de venta.</p>
                </div>
                <button onclick="App.admin.closeCommunityModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><i class="fas fa-times"></i></button>
            </div>
            
            <!-- Modal Body -->
            <div class="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <input type="hidden" id="comm-id">
                
                <!-- 1. IDENTIDAD -->
                <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div class="md:col-span-8 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre</label>
                                <input type="text" id="comm-name" class="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:border-[#1890ff] outline-none" placeholder="Ej: Python Pro">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Categoría</label>
                                <select id="comm-category" class="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none cursor-pointer">
                                    <option value="General">General</option>
                                    <option value="Programación">Programación</option>
                                    <option value="Negocios">Negocios</option>
                                    <option value="Diseño">Diseño</option>
                                    <option value="Data Science">Data Science</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Descripción</label>
                            <textarea id="comm-desc" rows="2" class="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:border-[#1890ff] outline-none resize-none"></textarea>
                        </div>
                    </div>
                    <div class="md:col-span-4 space-y-4">
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase mb-1 block">Icono (FontAwesome)</label>
                            <input type="text" id="comm-icon" class="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white font-mono" placeholder="Ej: fa-rocket">
                        </div>
                    </div>
                </div>

                <hr class="border-gray-100 dark:border-slate-800">

                <!-- 2. MOTOR MULTIMEDIA (GALERÍA MIXTA) -->
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <i class="fas fa-photo-video text-[#1890ff]"></i> Galería Multimedia
                    </h4>
                    
                    <div class="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700 mb-4">
                        <div class="flex flex-col md:flex-row gap-3">
                            <select id="media-type" class="md:w-32 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white cursor-pointer">
                                <option value="image">Imagen</option>
                                <option value="video">YouTube</option>
                            </select>
                            <input type="text" id="media-url" class="flex-1 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white placeholder:text-slate-400" placeholder="URL de la imagen o link de YouTube">
                            <button onclick="App.admin.addMediaItem()" class="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">Agregar</button>
                        </div>
                    </div>

                    <!-- Lista Visual de Items -->
                    <div id="gallery-list" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>
                    <p class="text-[10px] text-slate-400 mt-2 font-medium">* Usa las flechas para ordenar. El primer elemento será la portada principal.</p>
                </div>

                <hr class="border-gray-100 dark:border-slate-800">

                <!-- 3. MOTOR DE PLANES V2 PRO (UNIFICADO) -->
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <i class="fas fa-tags text-green-500"></i> Planes de Venta
                    </h4>

                    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <!-- Left: Lista de Planes -->
                        <div class="md:col-span-4 space-y-3" id="plans-list"></div>

                        <!-- Right: Editor de Planes -->
                        <div class="md:col-span-8 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700">
                            <!-- Header Editor -->
                            <div class="flex justify-between items-center mb-4">
                                <h5 class="text-xs font-bold text-slate-500 uppercase">Editor de Planes</h5>
                                <div class="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700">
                                    <label class="text-[10px] font-bold text-slate-500 cursor-pointer select-none uppercase" for="plan-is-dynamic">Modo Dinámico</label>
                                    <input type="checkbox" id="plan-is-dynamic" class="accent-[#1890ff] w-4 h-4 cursor-pointer" onchange="App.admin.toggleDynamicPricingUI(this.checked)">
                                </div>
                            </div>

                            <!-- Campos Base -->
                            <div class="mb-4">
                                <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Nombre del Plan</label>
                                <input type="text" id="plan-name" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white font-bold" placeholder="Ej: Plan Experto">
                            </div>

                            <!-- SECCIÓN ESTÁTICA (Mensual/Anual) -->
                            <div id="plan-static-pricing" class="space-y-3 transition-all">
                                <div class="grid grid-cols-12 gap-3 items-center">
                                    <div class="col-span-4">
                                        <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Precio Mensual</label>
                                        <div class="relative">
                                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                            <input type="number" id="plan-price-monthly" class="w-full pl-6 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="0">
                                        </div>
                                    </div>
                                    <div class="col-span-8">
                                        <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Link de Pago Mensual</label>
                                        <input type="text" id="plan-link-monthly" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="https://...">
                                    </div>
                                </div>
                                <div class="grid grid-cols-12 gap-3 items-center">
                                    <div class="col-span-4">
                                        <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Precio Anual (Opcional)</label>
                                        <div class="relative">
                                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                            <input type="number" id="plan-price-annual" class="w-full pl-6 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="0">
                                        </div>
                                    </div>
                                    <div class="col-span-8">
                                        <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Link de Pago Anual</label>
                                        <input type="text" id="plan-link-annual" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="https://...">
                                    </div>
                                </div>
                            </div>

                            <!-- SECCIÓN DINÁMICA (Asesorías/Cantidad) -->
                            <div id="plan-dynamic-settings" class="hidden bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 mb-4 animate-fade-in relative overflow-hidden">
                                <div class="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl">PRO V2</div>
                                <p class="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-3 uppercase flex items-center gap-1"><i class="fas fa-cubes"></i> Constructor de Variantes</p>
                                
                                <input type="text" id="dyn-unit-name" class="w-full mb-3 p-2.5 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs outline-none dark:text-white placeholder:text-slate-400" placeholder="Título del Selector (Ej: Elige Horas de Asesoría)">
                                
                                <div class="grid grid-cols-12 gap-2 items-end mb-2">
                                    <div class="col-span-5">
                                        <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Opción</label>
                                        <input type="text" id="var-name" placeholder="Ej: 5 Horas" class="w-full p-2 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs outline-none dark:text-white">
                                    </div>
                                    <div class="col-span-3">
                                        <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Precio</label>
                                        <input type="number" id="var-price" placeholder="$$" class="w-full p-2 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs outline-none dark:text-white">
                                    </div>
                                    <div class="col-span-4">
                                        <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Link Pago Único</label>
                                        <input type="text" id="var-link" placeholder="Link Específico" class="w-full p-2 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs outline-none dark:text-white">
                                    </div>
                                </div>
                                <button onclick="App.admin.addVariant()" class="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm mb-3">Agregar Variante</button>

                                <!-- LISTA VISUAL DE VARIANTES -->
                                <div class="max-h-32 overflow-y-auto custom-scrollbar border-t border-blue-200 dark:border-blue-800 pt-2" id="variants-list-visual"></div>
                            </div>

                            <!-- Configuración Extra (Trials) -->
                            <div class="grid grid-cols-2 gap-4 mt-4 mb-4">
                                <div>
                                    <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Días de Prueba (Trial)</label>
                                    <input type="number" id="plan-trial-days" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="0">
                                </div>
                                <div class="flex items-center gap-2 h-full pt-6">
                                    <input type="checkbox" id="plan-no-card" class="accent-green-500 w-4 h-4 cursor-pointer">
                                    <label for="plan-no-card" class="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">Sin Tarjeta Requerida</label>
                                </div>
                            </div>
                            
                            <div class="mb-4">
                                <label class="text-[9px] text-slate-500 uppercase font-bold pl-1 mb-0.5 block">Características</label>
                                <input type="text" id="plan-features" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="Soporte 24/7, Acceso total (separar por comas)">
                            </div>
                            
                            <button onclick="App.admin.addPlanUnified()" class="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">Guardar Plan en la Lista</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-4 rounded-b-3xl shrink-0">
                <button onclick="App.admin.closeCommunityModal()" class="px-6 py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold transition-colors">Cancelar</button>
                <button onclick="App.admin.saveCommunity()" id="btn-save-community" class="px-8 py-3 bg-[#1890ff] text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors">Guardar Todo</button>
            </div>
        </div>
    </div>`;
}

function _renderAdminEditPostModal() {
    return `
    <div id="admin-post-edit-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div class="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <h3 class="font-bold text-slate-800 dark:text-white">Moderación: Editar Post</h3>
                <button onclick="App.admin.closePostEdit()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6">
                <input type="hidden" id="admin-edit-post-id">
                <textarea id="admin-edit-post-content" rows="6" class="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] text-sm resize-none dark:text-white"></textarea>
                <p class="text-[10px] text-orange-500 mt-2 flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> Estás editando contenido de usuario como Admin.</p>
            </div>
            <div class="p-4 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button onclick="App.admin.closePostEdit()" class="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">Cancelar</button>
                <button onclick="App.admin.savePostEdit()" class="px-6 py-2 bg-[#1890ff] text-white rounded-lg text-sm font-bold shadow hover:bg-blue-600">Guardar</button>
            </div>
        </div>
    </div>`;
}