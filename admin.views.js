/**
 * admin.views.js (V30.0 - SLUGS & VALIDATION MASTER)
 * Panel de Control Unificado: Gestión de Comunidades, Ventas, Usuarios y Moderación.
 * * MEJORAS V30.0:
 * - SLUGS AMIGABLES: Generación automática de IDs basados en el nombre (ej: /python-avanzado).
 * - VALIDACIÓN: Prevención de nombres duplicados al crear comunidades.
 * - PLANES: Sistema completo de gestión de membresías.
 * - MODERACIÓN: Herramientas para editar y eliminar contenido.
 */

window.App = window.App || {};
window.App.admin = window.App.admin || {};

// ==========================================
// 1. RENDERIZADOR PRINCIPAL (LAYOUT)
// ==========================================
window.App.renderAdmin = async (activeTab = 'overview') => {
    const user = App.state.currentUser;

    // 1. Guardia de Seguridad (Solo Admins)
    if (!user || user.role !== 'admin') {
        return App.render(`
            <div class="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#020617] animate-fade-in font-sans">
                <div class="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-red-100 dark:border-red-900/30">
                    <i class="fas fa-lock text-3xl"></i>
                </div>
                <h2 class="text-2xl font-heading font-bold mb-2 text-slate-900 dark:text-white">Acceso Restringido</h2>
                <p class="text-slate-500 dark:text-slate-400 text-center max-w-md">Esta zona es exclusiva para administradores.</p>
                <button onclick="window.location.hash='#home'" class="mt-6 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity">Volver al Inicio</button>
            </div>
        `);
    }

    // 2. Sidebar + Layout
    const sidebarHTML = App.sidebar && App.sidebar.render ? App.sidebar.render('admin') : '';
    const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
    if (isPinned) document.body.classList.add('sidebar-is-pinned');

    // 3. Renderizar Contenedor
    await App.render(`
        ${sidebarHTML}
        <main class="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors p-6 lg:p-8 relative flex flex-col">
            
            <!-- HEADER -->
            <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <span class="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-lg"><i class="fas fa-shield-alt"></i></span>
                        Panel de Control
                    </h1>
                    <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-1">Gestiona tu ecosistema educativo, ventas y seguridad.</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="App.admin.openCommunityModal()" class="px-5 py-2.5 bg-[#1890ff] text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95">
                        <i class="fas fa-plus"></i> Nueva Comunidad
                    </button>
                </div>
            </header>

            <!-- TABS DE NAVEGACIÓN -->
            <div class="flex items-center gap-2 mb-8 border-b border-gray-200 dark:border-slate-800 overflow-x-auto pb-1 custom-scrollbar">
                <button onclick="App.renderAdmin('overview')" class="px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === 'overview' ? 'border-[#1890ff] text-[#1890ff] font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}">
                    <i class="fas fa-chart-pie mr-2"></i> Resumen
                </button>
                <button onclick="App.renderAdmin('communities')" class="px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === 'communities' ? 'border-[#1890ff] text-[#1890ff] font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}">
                    <i class="fas fa-layer-group mr-2"></i> Comunidades & Ventas
                </button>
                <button onclick="App.renderAdmin('users')" class="px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === 'users' ? 'border-[#1890ff] text-[#1890ff] font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}">
                    <i class="fas fa-users mr-2"></i> Usuarios
                </button>
                <button onclick="App.renderAdmin('content')" class="px-4 py-2 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === 'content' ? 'border-[#1890ff] text-[#1890ff] font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}">
                    <i class="fas fa-newspaper mr-2"></i> Moderación
                </button>
            </div>

            <div id="admin-content" class="flex-1 animate-fade-in">
                <div class="flex justify-center py-12"><i class="fas fa-circle-notch fa-spin text-4xl text-[#1890ff]"></i></div>
            </div>
        </main>
        
        <!-- Modales Globales Admin -->
        ${_renderCommunityModalUnified()}
        ${_renderAdminEditPostModal()}
    `);

    // 4. Router de Tabs Interno
    if (activeTab === 'overview') _loadAdminOverview();
    else if (activeTab === 'communities') _loadAdminCommunities();
    else if (activeTab === 'users') _loadAdminUsers();
    else if (activeTab === 'content') _loadAdminContent();
};

// ==========================================
// 2. TAB: RESUMEN (Métricas & Gráficos)
// ==========================================
async function _loadAdminOverview() {
    const container = document.getElementById('admin-content');
    try {
        const [usersSnap, commsSnap, postsSnap] = await Promise.all([
            window.F.getDocs(window.F.collection(window.F.db, "users")),
            window.F.getDocs(window.F.collection(window.F.db, "communities")),
            window.F.getDocs(window.F.collection(window.F.db, "posts"))
        ]);

        const totalUsers = usersSnap.size;
        const totalComms = commsSnap.size;
        const totalPosts = postsSnap.size;

        const roles = { student: 0, admin: 0, teacher: 0 };
        usersSnap.forEach(doc => {
            const r = doc.data().role || 'student';
            if (roles[r] !== undefined) roles[r]++;
            else roles.student++;
        });

        container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-8">
                <!-- KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    ${_renderKPICard('Usuarios Totales', totalUsers, 'fa-users', 'text-blue-600', 'bg-blue-50 dark:bg-blue-900/20')}
                    ${_renderKPICard('Comunidades Activas', totalComms, 'fa-project-diagram', 'text-purple-600', 'bg-purple-50 dark:bg-purple-900/20')}
                    ${_renderKPICard('Posts Generados', totalPosts, 'fa-comment-alt', 'text-green-600', 'bg-green-50 dark:bg-green-900/20')}
                </div>

                <!-- Gráficos y Estado -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
                        <h3 class="font-heading font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <i class="fas fa-chart-pie text-slate-400"></i> Distribución de Usuarios
                        </h3>
                        <div class="h-64 relative w-full flex justify-center">
                            <canvas id="rolesChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent dark:from-slate-800/50 opacity-50"></div>
                        <div class="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 text-3xl mb-6 relative z-10 shadow-sm">
                            <i class="fas fa-server"></i>
                        </div>
                        <h3 class="font-heading font-bold text-slate-900 dark:text-white text-xl relative z-10">Sistema Operativo</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs relative z-10">Base de datos Firestore conectada y sincronizada en tiempo real.</p>
                        <div class="mt-6 flex gap-2">
                            <span class="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold relative z-10">Online</span>
                            <span class="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold relative z-10">V30.0</span>
                        </div>
                    </div>
                </div>
            </div>`;

        _initRolesChart(roles);

    } catch (e) {
        console.error("Admin Overview Error", e);
        container.innerHTML = `<div class="p-12 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/50">Error cargando métricas.</div>`;
    }
}

// --- TAB 3: COMUNIDADES (Gestión Unificada con Planes) ---
async function _loadAdminCommunities() {
    const container = document.getElementById('admin-content');
    try {
        const communities = await App.api.getCommunities();
        
        if (communities.length === 0) {
            container.innerHTML = `<div class="text-center py-20 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl"><div class="text-4xl mb-4">📂</div><p class="text-slate-500 dark:text-slate-400 mb-4">No hay comunidades creadas.</p><button onclick="App.admin.openCommunityModal()" class="text-[#1890ff] font-bold hover:underline">Crear la primera</button></div>`;
            return;
        }

        container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${communities.map(c => {
                // Lógica visual de precio
                let priceDisplay = 'Gratis';
                if (c.plans && c.plans.length > 0) {
                    const prices = c.plans.map(p => parseFloat(p.price));
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    if (minPrice === 0) priceDisplay = `Gratis - $${maxPrice}`;
                    else if (minPrice === maxPrice) priceDisplay = `$${minPrice}`;
                    else priceDisplay = `Desde $${minPrice}`;
                } else if (c.priceMonthly) {
                    priceDisplay = `$${c.priceMonthly}/mes`;
                }

                return `
                <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all group relative ${c.isSuggested ? 'ring-2 ring-yellow-400 ring-offset-2 dark:ring-offset-slate-900' : ''}">
                    ${c.isSuggested ? '<div class="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-2 py-1 rounded-bl-xl z-20 shadow-sm"><i class="fas fa-star"></i> DESTACADA</div>' : ''}
                    
                    <div class="flex items-start justify-between mb-4">
                        <div class="w-12 h-12 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-xl text-slate-700 dark:text-slate-200 border border-gray-100 dark:border-slate-700 overflow-hidden">
                            ${c.image ? `<img src="${c.image}" class="w-full h-full object-cover">` : `<i class="fas ${c.icon || 'fa-users'}"></i>`}
                        </div>
                        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="App.admin.editCommunity('${c.id}')" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-[#1890ff] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center"><i class="fas fa-pen text-xs"></i></button>
                            <button onclick="App.admin.deleteCommunity('${c.id}')" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"><i class="fas fa-trash text-xs"></i></button>
                        </div>
                    </div>
                    
                    <h3 class="font-heading font-bold text-slate-900 dark:text-white mb-1 truncate">${c.name}</h3>
                    <div class="text-[10px] text-slate-400 font-mono mb-2 truncate">ID: ${c.id}</div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 min-h-[2.5em]">${c.description || 'Sin descripción'}</p>
                    
                    <div class="flex flex-wrap gap-2 mb-4">
                        <span class="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase border border-gray-200 dark:border-slate-700">${c.category || 'General'}</span>
                        ${c.plans ? `<span class="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase">${c.plans.length} Planes</span>` : ''}
                    </div>

                    <div class="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                        <div class="text-xs font-bold text-slate-500 dark:text-slate-400">
                            <i class="fas fa-users mr-1"></i> ${c.membersCount || 0}
                        </div>
                        <div class="text-xs font-bold text-slate-900 dark:text-white">
                            ${priceDisplay}
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="p-8 text-center text-red-500">Error cargando comunidades</div>`;
    }
}

// --- TAB 4: USUARIOS (Listado Básico) ---
async function _loadAdminUsers() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div class="p-6 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <h3 class="font-bold text-slate-900 dark:text-white">Directorio de Usuarios</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Gestión de roles y accesos.</p>
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
                        <img src="${u.avatar}" class="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 object-cover">
                        <div>
                            <p class="font-bold text-slate-900 dark:text-white">${u.name}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400">${u.email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}">${u.role || 'student'}</span>
                </td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    ${(u.joinedCommunities || []).length}
                </td>
                <td class="px-6 py-4 text-right">
                    <button class="text-slate-400 hover:text-[#1890ff]"><i class="fas fa-ellipsis-h"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) { console.error(e); }
}

// --- TAB 5: MODERACIÓN (Posts) ---
async function _loadAdminContent() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `<div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-6 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <h3 class="font-bold text-slate-900 dark:text-white">Moderación de Contenido</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Supervisa las últimas publicaciones.</p>
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
                        <span class="font-bold text-sm text-slate-900 dark:text-white">${p.author?.name || 'Anon'}</span>
                        <span class="text-xs text-slate-400">• ${App.ui.formatDate(p.createdAt)}</span>
                        <span class="text-xs text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 rounded-full">ID: ${p.id.substring(0,6)}</span>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-300 truncate">${p.content}</p>
                </div>
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="App.admin.openPostEdit('${p.id}', '${encodeURIComponent(p.content)}')" class="p-2 text-slate-400 hover:text-[#1890ff] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm"><i class="fas fa-pen text-xs"></i></button>
                    <button onclick="App.admin.deletePost('${p.id}')" class="p-2 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm"><i class="fas fa-trash text-xs"></i></button>
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.error(e); }
}

// ==========================================
// 3. HELPERS VISUALES
// ==========================================
function _renderKPICard(title, value, icon, colorText, colorBg) {
    return `
    <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">${title}</p>
            <h3 class="text-3xl font-heading font-extrabold text-slate-900 dark:text-white">${App.ui.formatNumber(value)}</h3>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center ${colorBg} ${colorText} text-xl shadow-sm">
            <i class="fas ${icon}"></i>
        </div>
    </div>`;
}

function _initRolesChart(roles) {
    const ctx = document.getElementById('rolesChart');
    if (!ctx) return;
    if (window.myRolesChart) window.myRolesChart.destroy();

    // Chart.js es global
    if (typeof Chart !== 'undefined') {
        window.myRolesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Estudiantes', 'Admins', 'Profesores'],
                datasets: [{
                    data: [roles.student, roles.admin, roles.teacher || 0],
                    backgroundColor: ['#1890ff', '#faad14', '#52c41a'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
        });
    }
}

// ==========================================
// 4. LÓGICA DE NEGOCIO (CRUD UNIFICADO)
// ==========================================
window.App.admin = {
    
    // Almacén temporal de planes mientras se edita la comunidad
    tempPlans: [],

    // --- GESTIÓN DE COMUNIDADES ---
    
    openCommunityModal: () => {
        const m = document.getElementById('community-modal');
        if(!m) return;
        
        document.getElementById('modal-title').innerText = "Nueva Comunidad";
        document.getElementById('btn-save-community').innerText = "Crear Comunidad";
        
        // Reset Inputs Generales
        ['comm-id','comm-name','comm-icon','comm-desc','comm-video', 'comm-image'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = '';
        });
        
        // Reset Selects/Checks
        document.getElementById('comm-cat').value = 'General';
        document.getElementById('comm-public').checked = true;
        document.getElementById('comm-suggested').checked = false;

        // Reset Planes
        App.admin.tempPlans = [];
        App.admin.renderPlansList();

        m.classList.remove('hidden');
    },

    closeCommunityModal: () => document.getElementById('community-modal').classList.add('hidden'),

    editCommunity: async (id) => {
        try {
            const comm = await App.api.getCommunityById(id);
            if (!comm) return;

            const m = document.getElementById('community-modal');
            document.getElementById('modal-title').innerText = "Editar Comunidad";
            document.getElementById('btn-save-community').innerText = "Guardar Cambios";

            document.getElementById('comm-id').value = comm.id; // slug (readonly en teoría, pero editable en backend si necesario)
            document.getElementById('comm-name').value = comm.name || '';
            document.getElementById('comm-icon').value = comm.icon || '';
            document.getElementById('comm-desc').value = comm.description || '';
            document.getElementById('comm-cat').value = comm.category || 'General';
            document.getElementById('comm-video').value = comm.videoUrl || '';
            document.getElementById('comm-image').value = comm.image || '';
            
            // Toggles
            document.getElementById('comm-public').checked = comm.isPublic !== false; // Default true
            document.getElementById('comm-suggested').checked = comm.isSuggested === true;

            // Cargar Planes (o Migrar Legacy)
            if (comm.plans && Array.isArray(comm.plans) && comm.plans.length > 0) {
                App.admin.tempPlans = comm.plans;
            } else if (comm.priceMonthly || comm.priceYearly) {
                // Migración visual de datos antiguos a un plan "Estándar"
                App.admin.tempPlans = [{
                    id: 'legacy_' + Date.now(),
                    name: 'Plan Estándar (Legacy)',
                    price: comm.priceMonthly || 0,
                    interval: 'month',
                    trialDays: comm.trialDays || 0,
                    paymentUrl: comm.paymentUrl || '',
                    features: comm.features || [],
                    recommended: true
                }];
                App.ui.toast("Precios antiguos convertidos a Plan Estándar", "info");
            } else {
                App.admin.tempPlans = [];
            }
            App.admin.renderPlansList();

            m.classList.remove('hidden');
        } catch (e) { console.error(e); App.ui.toast("Error cargando datos", "error"); }
    },

    saveCommunity: async () => {
        const btn = document.getElementById('btn-save-community');
        let id = document.getElementById('comm-id').value;
        const name = document.getElementById('comm-name').value.trim();
        
        if (!name) return App.ui.toast("El nombre es obligatorio", "warning");

        btn.disabled = true; btn.innerHTML = "Procesando...";

        // GENERAR SLUG AMIGABLE SI ES NUEVA
        if (!id) {
            // "Curso Python" -> "curso-python"
            id = name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales
                .replace(/\s+/g, '-')         // Espacios a guiones
                .replace(/-+/g, '-');         // Guiones múltiples a uno solo
            
            if (id.length < 3) id += "-edu"; // Asegurar longitud mínima

            // VALIDAR DUPLICADOS
            try {
                const docRef = window.F.doc(window.F.db, "communities", id);
                const docSnap = await window.F.getDoc(docRef);
                if (docSnap.exists()) {
                    btn.disabled = false; btn.innerHTML = "Crear Comunidad";
                    return App.ui.toast(`El nombre "${name}" ya existe (ID: ${id}). Elige otro.`, "error");
                }
            } catch(e) {
                console.error("Error verificando duplicado", e);
            }
        }

        const data = {
            id: id, // Asegurar que el ID vaya en el objeto
            name: name,
            icon: document.getElementById('comm-icon').value.trim() || 'fa-users',
            description: document.getElementById('comm-desc').value.trim(),
            category: document.getElementById('comm-cat').value,
            videoUrl: document.getElementById('comm-video').value.trim(),
            image: document.getElementById('comm-image').value.trim(),
            // Planes System
            plans: App.admin.tempPlans,
            // Config
            isPublic: document.getElementById('comm-public').checked,
            isSuggested: document.getElementById('comm-suggested').checked,
            isPrivate: !document.getElementById('comm-public').checked,
            updatedAt: new Date().toISOString()
        };

        // Campos Legacy para compatibilidad
        if (App.admin.tempPlans.length > 0) {
            data.priceMonthly = App.admin.tempPlans[0].price;
            data.membersCount = data.membersCount || 0;
        }

        try {
            // USAR SETDOC PARA FORZAR EL ID PERSONALIZADO (SLUG)
            await window.F.setDoc(window.F.doc(window.F.db, "communities", id), data, { merge: true });
            
            App.ui.toast(id === document.getElementById('comm-id').value ? "Comunidad actualizada" : "Comunidad creada con éxito", "success");
            
            App.admin.closeCommunityModal();
            App.renderAdmin('communities');
        } catch (e) {
            console.error(e);
            App.ui.toast("Error al guardar en Firestore", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = id === document.getElementById('comm-id').value ? "Guardar Cambios" : "Crear Comunidad";
        }
    },

    deleteCommunity: async (id) => {
        if(!confirm("⚠️ ¿Estás seguro de eliminar esta comunidad? Esta acción no se puede deshacer.")) return;
        try {
            await window.F.deleteDoc(window.F.doc(window.F.db, "communities", id));
            App.ui.toast("Comunidad eliminada", "success");
            App.renderAdmin('communities');
        } catch(e) { App.ui.toast("Error al eliminar", "error"); }
    },

    // --- GESTIÓN INTERNA DE PLANES (EN MEMORIA) ---

    renderPlansList: () => {
        const list = document.getElementById('plans-list');
        if (!list) return;

        if (App.admin.tempPlans.length === 0) {
            list.innerHTML = `<div class="text-center py-4 text-slate-400 text-sm italic bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">No hay planes configurados. Añade uno abajo.</div>`;
            return;
        }

        list.innerHTML = App.admin.tempPlans.map((p, idx) => `
            <div class="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 relative group">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h5 class="font-bold text-slate-900 dark:text-white text-sm">${p.name} ${p.recommended ? '<span class="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded ml-1">TOP</span>' : ''}</h5>
                        <p class="text-xs text-slate-500 font-mono">${p.price === 0 ? 'Gratis' : `$${p.price}/${p.interval}`} ${p.trialDays > 0 ? `(${p.trialDays}d Trial)` : ''}</p>
                    </div>
                    <button onclick="App.admin.removePlan(${idx})" class="text-red-400 hover:text-red-600 bg-white dark:bg-slate-900 p-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-slate-600 transition-colors"><i class="fas fa-trash text-xs"></i></button>
                </div>
                <div class="text-[10px] text-slate-400 truncate"><i class="fas fa-link mr-1"></i> ${p.paymentUrl || 'Link directo'}</div>
            </div>
        `).join('');
    },

    addPlan: () => {
        const name = document.getElementById('plan-name').value.trim();
        const price = parseFloat(document.getElementById('plan-price').value) || 0;
        const interval = document.getElementById('plan-interval').value;
        const trial = parseInt(document.getElementById('plan-trial').value) || 0;
        const link = document.getElementById('plan-link').value.trim();
        const feats = document.getElementById('plan-features').value.split(',').map(s=>s.trim()).filter(s=>s);
        const rec = document.getElementById('plan-rec').checked;

        if (!name) return App.ui.toast("Nombre del plan requerido", "warning");

        App.admin.tempPlans.push({
            id: 'plan_' + Date.now(),
            name, price, interval, trialDays: trial, paymentUrl: link, features: feats, recommended: rec
        });

        // Limpiar inputs
        document.getElementById('plan-name').value = '';
        document.getElementById('plan-price').value = '';
        document.getElementById('plan-trial').value = '';
        document.getElementById('plan-link').value = '';
        document.getElementById('plan-features').value = '';
        document.getElementById('plan-rec').checked = false;

        App.admin.renderPlansList();
    },

    removePlan: (idx) => {
        App.admin.tempPlans.splice(idx, 1);
        App.admin.renderPlansList();
    },

    // --- MODERACIÓN DE POSTS ---

    openPostEdit: (postId, content) => {
        document.getElementById('admin-edit-post-id').value = postId;
        document.getElementById('admin-edit-post-content').value = decodeURIComponent(content);
        document.getElementById('admin-post-edit-modal').classList.remove('hidden');
    },

    closePostEdit: () => document.getElementById('admin-post-edit-modal').classList.add('hidden'),

    savePostEdit: async () => {
        const id = document.getElementById('admin-edit-post-id').value;
        const content = document.getElementById('admin-edit-post-content').value;
        try {
            await App.api.updatePost(id, { content });
            App.ui.toast("Post editado por moderación", "success");
            App.admin.closePostEdit();
            App.renderAdmin('content');
        } catch(e) { App.ui.toast("Error al editar", "error"); }
    },

    deletePost: async (postId) => {
        if(!confirm("¿Eliminar publicación permanentemente?")) return;
        try {
            await App.api.deletePost(postId);
            App.ui.toast("Publicación eliminada", "success");
            const el = document.getElementById(`mod-post-${postId}`);
            if(el) el.remove();
        } catch(e) { App.ui.toast("Error", "error"); }
    }
};

// ==========================================
// 5. MODALES UNIFICADOS (HTML)
// ==========================================

function _renderCommunityModalUnified() {
    return `
    <div id="community-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
        <div class="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            
            <!-- Modal Header -->
            <div class="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center rounded-t-3xl z-10 shrink-0">
                <h3 class="font-heading font-bold text-xl text-slate-900 dark:text-white" id="modal-title">Nueva Comunidad</h3>
                <button onclick="App.admin.closeCommunityModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><i class="fas fa-times"></i></button>
            </div>
            
            <!-- Modal Body -->
            <div class="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <input type="hidden" id="comm-id">
                
                <!-- SECCIÓN 1: IDENTIDAD -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2"><i class="fas fa-fingerprint"></i> 1. Identidad</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-1">
                            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre</label>
                            <input type="text" id="comm-name" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white transition-colors placeholder:text-slate-400" placeholder="Ej: Python Masterclass">
                            <p class="text-[10px] text-slate-400">Esto generará la URL: /comunidades/python-masterclass</p>
                        </div>
                        <div class="space-y-1">
                            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Categoría</label>
                            <select id="comm-cat" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white transition-colors cursor-pointer">
                                <option value="General">General</option>
                                <option value="Programación">Programación</option>
                                <option value="Data Science">Data Science</option>
                                <option value="Diseño">Diseño</option>
                                <option value="Marketing">Marketing</option>
                            </select>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Icono (FontAwesome)</label>
                        <div class="flex gap-2">
                            <div class="w-12 flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-xl text-slate-400 border border-gray-200 dark:border-slate-700"><i class="fas fa-icons"></i></div>
                            <input type="text" id="comm-icon" class="flex-1 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white font-mono placeholder:text-slate-400" placeholder="Ej: fa-rocket">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Descripción Corta</label>
                        <textarea id="comm-desc" rows="2" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white resize-none transition-colors placeholder:text-slate-400" placeholder="Breve resumen para las tarjetas..."></textarea>
                    </div>
                </div>

                <!-- SECCIÓN 2: ASSETS VISUALES (Nuevo) -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2"><i class="fas fa-photo-video"></i> 2. Visuales</h4>
                    
                    <div class="space-y-1">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Imagen Portada (URL)</label>
                        <input type="text" id="comm-image" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white text-sm placeholder:text-slate-400" placeholder="https://...">
                        <p class="text-[10px] text-slate-400">Imagen grande para el Hero de la Landing y la Tarjeta.</p>
                    </div>
                    <div class="space-y-1">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Video Promocional (YouTube URL)</label>
                        <input type="text" id="comm-video" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white text-sm placeholder:text-slate-400" placeholder="https://youtube.com/watch?v=...">
                    </div>
                </div>

                <!-- SECCIÓN 3: GESTOR DE PLANES (Nuevo Sistema) -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-[#1890ff] mb-2 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2"><i class="fas fa-tags"></i> 3. Planes de Acceso</h4>
                    
                    <!-- Lista de Planes Existentes -->
                    <div id="plans-list" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <!-- Renderizado dinámico -->
                    </div>

                    <!-- Formulario Nuevo Plan -->
                    <div class="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700">
                        <h5 class="text-xs font-bold text-slate-500 uppercase mb-3">Agregar Nuevo Plan</h5>
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                            <div class="md:col-span-4">
                                <input type="text" id="plan-name" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="Nombre (ej: Pro)">
                            </div>
                            <div class="md:col-span-2">
                                <input type="number" id="plan-price" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="$$">
                            </div>
                            <div class="md:col-span-3">
                                <select id="plan-interval" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white">
                                    <option value="month">Mensual</option>
                                    <option value="year">Anual</option>
                                    <option value="one_time">Único</option>
                                    <option value="forever">Gratis</option>
                                </select>
                            </div>
                            <div class="md:col-span-3">
                                <input type="number" id="plan-trial" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="Días Trial">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <input type="text" id="plan-link" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="URL de Pago (Stripe/PayPal)">
                            <input type="text" id="plan-features" class="w-full p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" placeholder="Características (sep por comas)">
                        </div>
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-2">
                                <input type="checkbox" id="plan-rec" class="w-4 h-4 rounded text-[#1890ff] accent-[#1890ff]">
                                <label for="plan-rec" class="text-xs font-bold text-slate-500 cursor-pointer">Recomendado</label>
                            </div>
                            <button onclick="App.admin.addPlan()" class="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">Añadir Plan</button>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 4: VISIBILIDAD -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2"><i class="fas fa-eye"></i> 4. Visibilidad</h4>
                    
                    <div class="flex flex-col gap-3">
                        <div class="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                            <input type="checkbox" id="comm-public" class="w-5 h-5 text-[#1890ff] rounded focus:ring-0 cursor-pointer accent-[#1890ff]">
                            <div>
                                <label for="comm-public" class="text-sm font-bold text-slate-900 dark:text-white cursor-pointer">Mostrar en Discovery (Pública)</label>
                                <p class="text-xs text-slate-500 dark:text-slate-400">Si está desactivado, solo se podrá acceder con enlace directo.</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                            <input type="checkbox" id="comm-suggested" class="w-5 h-5 text-yellow-500 rounded focus:ring-0 cursor-pointer accent-yellow-500">
                            <div>
                                <label for="comm-suggested" class="text-sm font-bold text-slate-900 dark:text-white cursor-pointer">Destacar Comunidad (Sugerida)</label>
                                <p class="text-xs text-slate-500 dark:text-slate-400">Aparecerá con distintivo especial y prioridad en el Dashboard.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-4 rounded-b-3xl shrink-0">
                <button onclick="App.admin.closeCommunityModal()" class="px-6 py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold transition-colors">Cancelar</button>
                <button onclick="App.admin.saveCommunity()" id="btn-save-community" class="px-8 py-3 bg-[#1890ff] text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-colors transform active:scale-95">Guardar Comunidad</button>
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
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Contenido</label>
                <textarea id="admin-edit-post-content" rows="6" class="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] text-sm resize-none dark:text-white"></textarea>
                <p class="text-[10px] text-orange-500 mt-2 flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> Estás editando contenido de usuario como Admin.</p>
            </div>
            <div class="p-4 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button onclick="App.admin.closePostEdit()" class="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Cancelar</button>
                <button onclick="App.admin.savePostEdit()" class="px-6 py-2 bg-[#1890ff] text-white rounded-lg text-sm font-bold shadow hover:bg-blue-600">Guardar Edición</button>
            </div>
        </div>
    </div>`;
}