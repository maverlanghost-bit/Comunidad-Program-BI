/**
 * admin.views.js (V10.2 - SUGGESTED COMMUNITY & LIVE)
 * Panel de Control Absoluto: Gestión de Comunidades, Usuarios y Moderación.
 * UPDATES V10.2:
 * - Agregado campo "Destacar en Inicio" (isSuggested) en el modal de edición.
 * - Mantiene soporte para configuración de Live Streaming.
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
            <div class="h-screen w-full flex flex-col items-center justify-center bg-[#F0F2F5] animate-fade-in font-sans">
                <div class="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-red-100">
                    <i class="fas fa-lock text-3xl"></i>
                </div>
                <h2 class="text-2xl font-heading font-bold mb-2 text-gray-900">Acceso Restringido</h2>
                <p class="text-gray-500 mb-8 font-medium max-w-md text-center">
                    Esta área es exclusiva para administradores de ProgramBI.
                </p>
                <button onclick="window.location.hash='#home'" class="bg-[#1890ff] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-transform hover:-translate-y-1">
                    Volver al Inicio
                </button>
            </div>
        `);
    }

    // 2. Render Sidebar
    const sidebarHTML = App.sidebar && App.sidebar.render ? App.sidebar.render('#admin') : '';
    const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
    if (isPinned) document.body.classList.add('sidebar-is-pinned');

    // 3. Estructura Principal
    const html = `
        <div class="h-screen w-full bg-[#F0F2F5] overflow-hidden flex font-sans">
            ${sidebarHTML}

            <main class="flex-1 flex flex-col relative transition-all duration-300 min-w-0">
                
                <!-- HEADER ADMIN -->
                <header class="h-[80px] px-8 flex items-center justify-between shrink-0 z-30 sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/60 transition-all">
                    <div>
                        <h1 class="text-xl font-heading font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <span class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm"><i class="fas fa-shield-alt"></i></span>
                            Panel de Control
                        </h1>
                    </div>

                    <!-- Navegación Tabs -->
                    <div class="bg-slate-100/80 p-1 rounded-xl flex items-center shadow-inner">
                        <button onclick="App.renderAdmin('overview')" 
                            class="px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white text-[#1890ff] shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}">
                            <i class="fas fa-chart-pie"></i> Resumen
                        </button>
                        <button onclick="App.renderAdmin('communities')" 
                            class="px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'communities' ? 'bg-white text-[#1890ff] shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}">
                            <i class="fas fa-layer-group"></i> Comunidades
                        </button>
                        <button onclick="App.renderAdmin('content')" 
                            class="px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'content' ? 'bg-white text-[#1890ff] shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}">
                            <i class="fas fa-newspaper"></i> Publicaciones
                        </button>
                    </div>
                </header>

                <!-- CONTENIDO DINÁMICO -->
                <div class="flex-1 overflow-y-auto custom-scrollbar p-8 w-full" id="admin-content">
                    ${App.ui.skeleton('card')}
                </div>
            </main>
        </div>

        <!-- MODALES DE GESTIÓN -->
        ${_renderCreateCommunityModal()}
        ${_renderEditCommunityModalAdmin()}
        ${_renderAdminEditPostModal()}
    `;

    await App.render(html);

    // 4. Cargar Datos Específicos según Tab
    if (activeTab === 'overview') _loadAdminOverview();
    else if (activeTab === 'communities') _loadAdminCommunities();
    else if (activeTab === 'content') _loadAdminContent();
};

// ==========================================
// 2. CONTROLADORES DE TABS (LÓGICA)
// ==========================================

// --- TAB 1: RESUMEN (Métricas Reales) ---
async function _loadAdminOverview() {
    const container = document.getElementById('admin-content');
    if (!container) return;

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
            <div class="max-w-7xl mx-auto space-y-8 animate-fade-in">
                <!-- KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    ${_renderKPICard('Usuarios Totales', totalUsers, 'fa-users', 'text-blue-600', 'bg-blue-50')}
                    ${_renderKPICard('Comunidades Activas', totalComms, 'fa-project-diagram', 'text-purple-600', 'bg-purple-50')}
                    ${_renderKPICard('Publicaciones Generadas', totalPosts, 'fa-comment-alt', 'text-green-600', 'bg-green-50')}
                </div>

                <!-- Gráficos y Estado -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 class="font-heading font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <i class="fas fa-chart-pie text-slate-400"></i> Distribución de Usuarios
                        </h3>
                        <div class="h-64 relative w-full flex justify-center">
                            <canvas id="rolesChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-50"></div>
                        <div class="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 text-3xl mb-6 relative z-10 shadow-sm">
                            <i class="fas fa-server"></i>
                        </div>
                        <h3 class="font-heading font-bold text-slate-900 text-xl relative z-10">Sistema Operativo</h3>
                        <p class="text-sm text-slate-500 mt-2 max-w-xs relative z-10">Base de datos Firestore conectada y sincronizada en tiempo real.</p>
                    </div>
                </div>
            </div>`;

        _initRolesChart(roles);

    } catch (e) {
        console.error("Admin Overview Error", e);
        container.innerHTML = `<div class="p-12 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">Error cargando métricas. Verifica tu conexión.</div>`;
    }
}

// --- TAB 2: COMUNIDADES (Gestión CRUD) ---
async function _loadAdminCommunities() {
    const container = document.getElementById('admin-content');
    try {
        const communities = await App.api.getCommunities();
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto animate-fade-in">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 class="text-2xl font-heading font-bold text-slate-900">Gestión de Comunidades</h2>
                        <p class="text-sm text-slate-500 mt-1">Crea, edita o elimina espacios de aprendizaje.</p>
                    </div>
                    <button onclick="App.admin.openCreateModal()" class="bg-[#1890ff] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95">
                        <i class="fas fa-plus"></i> Nueva Comunidad
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    ${communities.map(c => `
                    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all group flex flex-col relative ${c.isSuggested ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}">
                        ${c.isSuggested ? '<div class="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-2 py-1 rounded-bl-xl z-20"><i class="fas fa-star"></i> SUGERIDA</div>' : ''}
                        
                        <!-- Botones Flotantes -->
                        <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur p-1.5 rounded-xl shadow-sm border border-slate-100 z-10">
                            <button onclick="App.admin.openEditModal('${c.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors flex items-center justify-center" title="Editar">
                                <i class="fas fa-pen text-xs"></i>
                            </button>
                            <button onclick="App.admin.deleteCommunity('${c.id}')" class="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center" title="Eliminar">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>

                        <div class="p-6 flex-1">
                            <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-[#1890ff] text-2xl shadow-sm border border-blue-100 mb-5">
                                <i class="fas ${c.icon || 'fa-users'}"></i>
                            </div>
                            
                            <h3 class="text-lg font-heading font-bold text-slate-900 mb-2">${c.name}</h3>
                            <p class="text-sm text-slate-500 line-clamp-3 mb-4 leading-relaxed">${c.description || 'Sin descripción'}</p>
                            
                            <div class="flex flex-wrap gap-2 mb-4">
                                <span class="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-slate-200">${c.category || 'General'}</span>
                                ${c.isPrivate ? '<span class="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-amber-100"><i class="fas fa-lock mr-1"></i> Privada</span>' : ''}
                                ${c.isLive ? '<span class="bg-red-50 text-red-500 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-red-100"><span class="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1"></span> Live</span>' : ''}
                            </div>
                        </div>
                        
                        <div class="mt-auto border-t border-slate-50 p-4 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-500">
                            <span class="flex items-center gap-1.5"><i class="fas fa-user-friends"></i> ${App.ui.formatNumber(c.membersCount || 0)}</span>
                            <a href="#community/${c.id}" class="text-[#1890ff] hover:underline flex items-center gap-1">Ver Tablero <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
    } catch(e) { console.error(e); }
}

// --- TAB 3: CONTENIDO (Moderación Global) ---
async function _loadAdminContent() {
    const container = document.getElementById('admin-content');
    container.innerHTML = App.ui.skeleton('card');

    try {
        const q = window.F.query(window.F.collection(window.F.db, "posts"), window.F.orderBy("createdAt", "desc"), window.F.limit(50));
        const snap = await window.F.getDocs(q);
        const posts = [];
        snap.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));

        container.innerHTML = `
            <div class="max-w-7xl mx-auto animate-fade-in pb-20">
                <div class="mb-8">
                    <h2 class="text-2xl font-heading font-bold text-slate-900">Moderación de Contenido</h2>
                    <p class="text-sm text-slate-500 mt-1">Supervisa y gestiona las publicaciones.</p>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th class="px-6 py-4 font-bold text-slate-700 uppercase text-xs tracking-wider">Autor</th>
                                    <th class="px-6 py-4 font-bold text-slate-700 uppercase text-xs tracking-wider w-1/2">Contenido</th>
                                    <th class="px-6 py-4 font-bold text-slate-700 uppercase text-xs tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${posts.length > 0 ? posts.map(post => `
                                <tr class="hover:bg-slate-50/80 transition-colors group">
                                    <td class="px-6 py-4">
                                        <div class="flex items-center gap-3">
                                            <img src="${post.author?.avatar || 'https://ui-avatars.com/api/?name=User'}" class="w-8 h-8 rounded-full bg-slate-200 object-cover">
                                            <div>
                                                <p class="font-bold text-slate-900">${post.author?.name || 'Desconocido'}</p>
                                                <p class="text-[10px] text-slate-400">ID: ${post.authorId ? post.authorId.substring(0,6) : 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="max-w-md">
                                            <p class="text-slate-500 truncate">${post.content}</p>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <button onclick="App.admin.deletePost('${post.id}')" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>`).join('') : `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 italic">No hay publicaciones.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    } catch (e) {
        container.innerHTML = `<div class="p-8 text-center text-red-500">Error al cargar contenido.</div>`;
    }
}

// ==========================================
// 3. HELPERS VISUALES
// ==========================================

function _renderKPICard(title, value, icon, colorText, colorBg) {
    return `
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">${title}</p>
            <h3 class="text-3xl font-heading font-extrabold text-slate-900">${App.ui.formatNumber(value)}</h3>
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

// ==========================================
// 4. ACCIONES ADMIN (CRUD LÓGICA)
// ==========================================
window.App.admin = {
    // --- CREATE ---
    openCreateModal: () => {
        const m = document.getElementById('admin-create-community-modal');
        const p = document.getElementById('admin-create-panel');
        const b = document.getElementById('admin-create-backdrop');
        m.classList.remove('hidden'); void m.offsetWidth;
        p.classList.remove('translate-x-full'); b.classList.remove('opacity-0');
    },

    closeCreateModal: () => {
        const m = document.getElementById('admin-create-community-modal');
        const p = document.getElementById('admin-create-panel');
        const b = document.getElementById('admin-create-backdrop');
        p.classList.add('translate-x-full'); b.classList.add('opacity-0');
        setTimeout(() => {
            m.classList.add('hidden');
            if(document.getElementById('cc-name')) document.getElementById('cc-name').value = '';
        }, 300);
    },

    submitCreateCommunity: async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-create-comm');
        const name = document.getElementById('cc-name').value;
        const icon = document.getElementById('cc-icon').value;
        const desc = document.getElementById('cc-desc').value;
        const cat = document.getElementById('cc-cat').value;
        const priv = document.getElementById('cc-private').value === 'true';

        btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creando...';

        try {
            await App.api.createCommunity({ name, icon, description: desc, category: cat, isPrivate: priv, isLive: false, liveUrl: '', isSuggested: false });
            App.ui.toast('Comunidad creada con éxito', 'success');
            App.admin.closeCreateModal();
            App.renderAdmin('communities');
        } catch(err) {
            console.error(err);
            App.ui.toast('Error al crear', 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = 'Crear Comunidad';
        }
    },

    // --- DELETE ---
    deleteCommunity: async (id) => {
        if(!confirm("⚠️ ¿Estás SEGURO? Esta acción es irreversible.")) return;
        try {
            await window.F.deleteDoc(window.F.doc(window.F.db, "communities", id));
            App.ui.toast("Comunidad eliminada", "success");
            App.renderAdmin('communities');
        } catch(e) { App.ui.toast("Error al eliminar", "error"); }
    },

    // --- EDIT (Ahora incluye 'isSuggested') ---
    openEditModal: async (id) => {
        const comm = await App.api.getCommunityById(id);
        if(!comm) return App.ui.toast("Error al cargar datos", "error");

        document.getElementById('ec-id').value = comm.id;
        document.getElementById('ec-name').value = comm.name;
        document.getElementById('ec-desc').value = comm.description || '';
        document.getElementById('ec-icon').value = comm.icon || 'fa-users';
        document.getElementById('ec-live-url').value = comm.liveUrl || '';
        document.getElementById('ec-is-live').value = comm.isLive ? 'true' : 'false';
        
        // NUEVO CAMPO: SUGERIDO
        const suggestedSelect = document.getElementById('ec-is-suggested');
        if(suggestedSelect) suggestedSelect.value = comm.isSuggested ? 'true' : 'false';

        const m = document.getElementById('admin-edit-modal');
        const p = document.getElementById('admin-edit-panel');
        const b = document.getElementById('admin-edit-backdrop');
        m.classList.remove('hidden'); void m.offsetWidth;
        p.classList.remove('scale-95', 'opacity-0'); p.classList.add('scale-100', 'opacity-100'); b.classList.remove('opacity-0');
    },

    closeEditModal: () => {
        const m = document.getElementById('admin-edit-modal');
        const p = document.getElementById('admin-edit-panel');
        const b = document.getElementById('admin-edit-backdrop');
        p.classList.remove('scale-100', 'opacity-100'); p.classList.add('scale-95', 'opacity-0'); b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    },

    submitEditCommunity: async (e) => {
        e.preventDefault();
        const id = document.getElementById('ec-id').value;
        const name = document.getElementById('ec-name').value;
        const desc = document.getElementById('ec-desc').value;
        const icon = document.getElementById('ec-icon').value;
        const liveUrl = document.getElementById('ec-live-url').value;
        const isLive = document.getElementById('ec-is-live').value === 'true';
        
        // NUEVO VALOR: SUGERIDO
        const isSuggested = document.getElementById('ec-is-suggested').value === 'true';

        try {
            await App.api.updateCommunity(id, { name, description: desc, icon, liveUrl, isLive, isSuggested });
            App.ui.toast("Comunidad actualizada", "success");
            App.admin.closeEditModal();
            App.renderAdmin('communities');
        } catch(e) {
            console.error(e);
            App.ui.toast("Error al actualizar", "error");
        }
    },

    deletePost: async (postId) => {
        if(!confirm("¿Eliminar publicación?")) return;
        try {
            await App.api.deletePost(postId);
            App.ui.toast("Publicación eliminada", "success");
            App.renderAdmin('content'); 
        } catch(e) { App.ui.toast("Error", "error"); }
    },

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
            App.ui.toast("Editado", "success");
            App.admin.closePostEdit();
            App.renderAdmin('content');
        } catch(e) { App.ui.toast("Error", "error"); }
    }
};

// ==========================================
// 5. MODALES (HTML TEMPLATES)
// ==========================================

function _renderCreateCommunityModal() {
    return `
    <div id="admin-create-community-modal" class="fixed inset-0 z-[80] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="admin-create-backdrop" onclick="App.admin.closeCreateModal()"></div>
        <div class="absolute inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl transform translate-x-full transition-transform duration-300 flex flex-col font-sans" id="admin-create-panel">
            <div class="px-8 py-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 class="font-heading font-bold text-xl text-gray-900">Nueva Comunidad</h3>
                <button onclick="App.admin.closeCreateModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200"><i class="fas fa-times"></i></button>
            </div>
            
            <form onsubmit="App.admin.submitCreateCommunity(event)" class="p-8 space-y-6 overflow-y-auto flex-1">
                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Nombre</label>
                    <input type="text" id="cc-name" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#1890ff] transition-all text-sm font-medium" placeholder="Ej: React Developers">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Categoría</label>
                        <select id="cc-cat" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#1890ff] text-sm font-medium appearance-none">
                            <option value="Programación">Programación</option>
                            <option value="Data">Data</option>
                            <option value="Diseño">Diseño</option>
                            <option value="Business">Business</option>
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Acceso</label>
                        <select id="cc-private" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#1890ff] text-sm font-medium appearance-none">
                            <option value="false">Pública</option>
                            <option value="true">Privada (Pago)</option>
                        </select>
                    </div>
                </div>

                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Icono (FontAwesome)</label>
                    <div class="flex gap-2">
                        <div class="w-12 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 border border-gray-200"><i class="fas fa-icons"></i></div>
                        <input type="text" id="cc-icon" required class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#1890ff] transition-all text-sm font-mono" placeholder="fa-rocket">
                    </div>
                </div>

                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">Descripción</label>
                    <textarea id="cc-desc" required rows="4" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#1890ff] transition-all text-sm resize-none" placeholder="Describe el propósito..."></textarea>
                </div>
            </form>

            <div class="p-8 border-t border-gray-100 bg-white">
                <button type="submit" onclick="document.querySelector('#admin-create-panel form').dispatchEvent(new Event('submit'))" id="btn-create-comm" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors shadow-lg">Crear Comunidad</button>
            </div>
        </div>
    </div>`;
}

function _renderEditCommunityModalAdmin() {
    return `
    <div id="admin-edit-modal" class="fixed inset-0 z-[80] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="admin-edit-backdrop" onclick="App.admin.closeEditModal()"></div>
        
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto flex flex-col font-sans relative z-10" id="admin-edit-panel">
            <div class="p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-3xl flex justify-between items-center">
                <h3 class="font-heading font-bold text-lg text-gray-900">Editar Comunidad</h3>
                <button onclick="App.admin.closeEditModal()" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"><i class="fas fa-times text-slate-400"></i></button>
            </div>
            
            <form onsubmit="App.admin.submitEditCommunity(event)" class="p-8 space-y-5">
                <input type="hidden" id="ec-id">
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                    <input type="text" id="ec-name" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white transition-colors text-sm font-bold">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-500 uppercase">Estado</label>
                        <select id="ec-is-live" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white transition-colors text-sm font-bold">
                            <option value="false">Offline</option>
                            <option value="true">🔴 EN VIVO</option>
                        </select>
                    </div>
                    <!-- NUEVO CAMPO: SUGERIDO -->
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-500 uppercase">Destacar</label>
                        <select id="ec-is-suggested" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white transition-colors text-sm font-bold text-blue-600">
                            <option value="false">Normal</option>
                            <option value="true">⭐ Sugerida (Dashboard)</option>
                        </select>
                    </div>
                </div>

                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase">Icono</label>
                    <input type="text" id="ec-icon" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white transition-colors text-sm font-mono text-slate-600">
                </div>

                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase">URL Transmisión (Live)</label>
                    <input type="text" id="ec-live-url" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white transition-colors text-sm" placeholder="https://youtube.com/...">
                </div>

                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase">Descripción</label>
                    <textarea id="ec-desc" rows="3" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white resize-none transition-colors text-sm"></textarea>
                </div>
                
                <div class="pt-4 flex justify-end gap-3 border-t border-slate-50 mt-2">
                    <button type="button" onclick="App.admin.closeEditModal()" class="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm">Cancelar</button>
                    <button type="submit" class="bg-[#1890ff] text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-600 transition-all">Guardar Cambios</button>
                </div>
            </form>
        </div>
    </div>`;
}

function _renderAdminEditPostModal() {
    return `
    <div id="admin-post-edit-modal" class="fixed inset-0 z-[90] hidden flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="font-bold text-gray-800">Moderación: Editar Post</h3>
                <button onclick="App.admin.closePostEdit()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6">
                <input type="hidden" id="admin-edit-post-id">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Contenido</label>
                <textarea id="admin-edit-post-content" rows="6" class="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-[#1890ff] text-sm resize-none"></textarea>
                <p class="text-[10px] text-orange-500 mt-2"><i class="fas fa-exclamation-triangle"></i> Estás editando contenido de usuario como Admin.</p>
            </div>
            <div class="p-4 bg-gray-50 flex justify-end gap-3">
                <button onclick="App.admin.closePostEdit()" class="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800">Cancelar</button>
                <button onclick="App.admin.savePostEdit()" class="px-6 py-2 bg-[#1890ff] text-white rounded-lg text-sm font-bold shadow hover:bg-blue-600">Guardar Edición</button>
            </div>
        </div>
    </div>`;
}