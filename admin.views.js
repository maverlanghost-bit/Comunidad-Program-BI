/**
 * admin.views.js (V25.0 - MASTER ADMIN PANEL)
 * Panel de Control Unificado: Gestión de Comunidades, Ventas, Usuarios y Moderación.
 * * CARACTERÍSTICAS COMPLETAS:
 * - Dashboard: KPIs y Gráficos de distribución de usuarios.
 * - Gestión de Comunidades: CRUD completo con configuración de Ventas (Precios, Trial, Landing) y Discovery (Sugeridos).
 * - Moderación: Eliminación y edición de posts de usuarios.
 * - Usuarios: Listado y gestión básica.
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
                            <span class="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold relative z-10">V25.0</span>
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

// --- TAB 3: COMUNIDADES (Gestión Unificada) ---
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
            ${communities.map(c => `
            <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all group relative ${c.isSuggested ? 'ring-2 ring-yellow-400 ring-offset-2 dark:ring-offset-slate-900' : ''}">
                ${c.isSuggested ? '<div class="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-2 py-1 rounded-bl-xl z-20 shadow-sm"><i class="fas fa-star"></i> DESTACADA</div>' : ''}
                
                <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-xl text-slate-700 dark:text-slate-200 border border-gray-100 dark:border-slate-700">
                        <i class="fas ${c.icon || 'fa-users'}"></i>
                    </div>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="App.admin.editCommunity('${c.id}')" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-[#1890ff] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center"><i class="fas fa-pen text-xs"></i></button>
                        <button onclick="App.admin.deleteCommunity('${c.id}')" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"><i class="fas fa-trash text-xs"></i></button>
                    </div>
                </div>
                
                <h3 class="font-heading font-bold text-slate-900 dark:text-white mb-2 truncate">${c.name}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 min-h-[2.5em]">${c.description || 'Sin descripción'}</p>
                
                <div class="flex flex-wrap gap-2 mb-4">
                    <span class="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase border border-gray-200 dark:border-slate-700">${c.category || 'General'}</span>
                    ${c.isPublic !== false ? 
                        '<span class="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase">Pública</span>' : 
                        '<span class="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase"><i class="fas fa-lock mr-1"></i> Privada</span>'}
                </div>

                <div class="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div class="text-xs font-bold text-slate-500 dark:text-slate-400">
                        <i class="fas fa-users mr-1"></i> ${c.membersCount || 0}
                    </div>
                    <div class="text-xs font-bold text-slate-900 dark:text-white">
                        ${c.priceMonthly ? `$${c.priceMonthly}/mes` : 'Gratis'}
                    </div>
                </div>
            </div>`).join('')}
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
                        <!-- Se llena dinámicamente -->
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
    
    // --- GESTIÓN DE COMUNIDADES ---
    
    openCommunityModal: () => {
        const m = document.getElementById('community-modal');
        if(!m) return;
        
        document.getElementById('modal-title').innerText = "Nueva Comunidad";
        document.getElementById('btn-save-community').innerText = "Crear Comunidad";
        
        // Reset Inputs
        ['comm-id','comm-name','comm-icon','comm-desc','comm-price-m','comm-price-y','comm-trial','comm-video','comm-features'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = '';
        });
        
        // Reset Selects/Checks
        document.getElementById('comm-cat').value = 'General';
        document.getElementById('comm-public').checked = true;
        document.getElementById('comm-suggested').checked = false;

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

            document.getElementById('comm-id').value = comm.id;
            document.getElementById('comm-name').value = comm.name || '';
            document.getElementById('comm-icon').value = comm.icon || '';
            document.getElementById('comm-desc').value = comm.description || '';
            document.getElementById('comm-cat').value = comm.category || 'General';
            
            // Sales Fields
            document.getElementById('comm-price-m').value = comm.priceMonthly || '';
            document.getElementById('comm-price-y').value = comm.priceYearly || '';
            document.getElementById('comm-trial').value = comm.trialDays || '';
            document.getElementById('comm-video').value = comm.videoUrl || '';
            document.getElementById('comm-features').value = (comm.features || []).join('\n');
            
            // Toggles
            document.getElementById('comm-public').checked = comm.isPublic !== false; // Default true
            document.getElementById('comm-suggested').checked = comm.isSuggested === true;

            m.classList.remove('hidden');
        } catch (e) { App.ui.toast("Error cargando datos", "error"); }
    },

    saveCommunity: async () => {
        const btn = document.getElementById('btn-save-community');
        const id = document.getElementById('comm-id').value;
        const name = document.getElementById('comm-name').value.trim();
        
        if (!name) return App.ui.toast("El nombre es obligatorio", "warning");

        btn.disabled = true; btn.innerHTML = "Procesando...";

        const data = {
            name: name,
            icon: document.getElementById('comm-icon').value.trim() || 'fa-users',
            description: document.getElementById('comm-desc').value.trim(),
            category: document.getElementById('comm-cat').value,
            // Ventas
            priceMonthly: parseFloat(document.getElementById('comm-price-m').value) || 0,
            priceYearly: parseFloat(document.getElementById('comm-price-y').value) || 0,
            trialDays: parseInt(document.getElementById('comm-trial').value) || 0,
            videoUrl: document.getElementById('comm-video').value.trim(),
            features: document.getElementById('comm-features').value.split('\n').filter(l => l.trim().length > 0),
            // Config
            isPublic: document.getElementById('comm-public').checked,
            isSuggested: document.getElementById('comm-suggested').checked,
            isPrivate: !document.getElementById('comm-public').checked, // Compatibilidad legacy
            updatedAt: new Date().toISOString()
        };

        try {
            if (id) {
                await App.api.updateCommunity(id, data);
                App.ui.toast("Comunidad actualizada", "success");
            } else {
                await App.api.createCommunity(data);
                App.ui.toast("Comunidad creada", "success");
            }
            App.admin.closeCommunityModal();
            App.renderAdmin('communities');
        } catch (e) {
            console.error(e);
            App.ui.toast("Error al guardar", "error");
        } finally {
            btn.disabled = false;
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

                <!-- SECCIÓN 2: ESTRATEGIA DE VENTA (SKOOL STYLE) -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-[#1890ff] mb-2 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2"><i class="fas fa-tag"></i> 2. Estrategia de Venta</h4>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="space-y-1">
                            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Precio Mensual ($)</label>
                            <input type="number" id="comm-price-m" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white font-mono" placeholder="0">
                        </div>
                        <div class="space-y-1">
                            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Precio Anual ($)</label>
                            <input type="number" id="comm-price-y" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white font-mono" placeholder="0">
                        </div>
                        <div class="space-y-1">
                            <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Días de Prueba</label>
                            <input type="number" id="comm-trial" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white font-mono" placeholder="Ej: 7">
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Video de Portada (YouTube URL)</label>
                        <input type="text" id="comm-video" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white text-sm" placeholder="https://youtube.com/watch?v=...">
                        <p class="text-[10px] text-slate-400">Este video se reproducirá automáticamente en la Landing Page de ventas.</p>
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Características / Beneficios (Lista)</label>
                        <textarea id="comm-features" rows="4" class="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white resize-none" placeholder="Acceso a mentorías en vivo&#10;Certificado oficial&#10;Grupo privado de Discord..."></textarea>
                        <p class="text-[10px] text-slate-400">Escribe una característica por línea.</p>
                    </div>
                </div>

                <!-- SECCIÓN 3: VISIBILIDAD -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2"><i class="fas fa-eye"></i> 3. Visibilidad</h4>
                    
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