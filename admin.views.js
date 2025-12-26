/**
 * admin.views.js (V4.0 - Refactor Modular)
 * Panel Admin: Actualizado para usar el nuevo Sidebar Global (App.sidebar).
 */

window.App.renderAdmin = async () => {
    const user = App.state.currentUser;

    // 1. Guardia de Seguridad
    if (!user || user.role !== 'admin') {
        App.render(`
            <div class="h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] animate-fade-in">
                <div class="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-red-100">
                    <i class="fas fa-lock text-3xl"></i>
                </div>
                <h2 class="text-2xl font-heading font-bold mb-2 text-gray-900">Acceso Restringido</h2>
                <p class="text-gray-500 mb-8 font-medium max-w-md text-center">
                    Esta área es exclusiva para administradores.
                </p>
                <button onclick="window.location.hash='#home'" class="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-transform hover:-translate-y-1">
                    Volver al Inicio
                </button>
            </div>
        `);
        return;
    }

    // 2. Sidebar Global (Actualizado a App.sidebar)
    const sidebarHTML = App.sidebar.render('#admin');
    
    // Lógica de pin (Layout CSS)
    const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
    if (isPinned) document.body.classList.add('sidebar-is-pinned');
    else document.body.classList.remove('sidebar-is-pinned');

    const html = `
        <div class="min-h-screen bg-[#FAFAFA]">
            ${sidebarHTML}

            <main class="min-h-screen flex flex-col transition-all duration-300 relative">
                
                <!-- Header Admin -->
                <header class="bg-white border-b border-gray-200 h-20 flex items-center justify-between px-8 sticky top-0 z-30">
                    <div class="flex items-center gap-4">
                        <h1 class="font-heading font-bold text-xl text-gray-900">Panel de Control</h1>
                        <span class="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 uppercase tracking-wide">
                            <i class="fas fa-circle text-[8px] mr-1"></i> Live
                        </span>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-right hidden md:block">
                            <p class="text-xs font-bold text-gray-900">Admin Mode</p>
                            <p class="text-[10px] text-gray-400 font-mono cursor-pointer hover:text-blue-500" onclick="navigator.clipboard.writeText('${user.uid}'); App.ui.toast('UID Copiado')">
                                ${user.uid.substring(0,8)}... <i class="far fa-copy"></i>
                            </p>
                        </div>
                    </div>
                </header>

                <div class="p-6 md:p-10 max-w-7xl mx-auto w-full animate-fade-in">
                    
                    <!-- Actions Header -->
                    <div class="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                        <div>
                            <h2 class="text-3xl font-heading font-bold text-gray-900">Resumen General</h2>
                            <p class="text-gray-500 mt-1">Gestiona el crecimiento de tu plataforma.</p>
                        </div>
                        <button onclick="App.admin.openCreateModal()" class="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 active:scale-95">
                            <i class="fas fa-plus"></i> Nueva Comunidad
                        </button>
                    </div>

                    <!-- KPIs Grid -->
                    <div id="admin-kpi-container" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        ${_renderSkeletonKPI()}
                        ${_renderSkeletonKPI()}
                        ${_renderSkeletonKPI()}
                        ${_renderSkeletonKPI()}
                    </div>

                    <!-- Communities List -->
                    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 class="font-bold text-lg text-gray-900">Comunidades Activas</h3>
                            <span class="text-xs font-bold bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                                Firestore
                            </span>
                        </div>
                        <div id="admin-communities-list" class="divide-y divide-gray-100">
                            <div class="p-8 text-center text-gray-400">Cargando datos...</div>
                        </div>
                    </div>

                </div>
            </main>
        </div>

        <!-- MODAL: CREAR COMUNIDAD -->
        <div id="create-modal" class="fixed inset-0 z-[60] hidden">
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity opacity-0" id="create-backdrop" onclick="App.admin.closeCreateModal()"></div>
            
            <div class="absolute inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl transform translate-x-full transition-transform duration-300 ease-out flex flex-col" id="create-panel">
                
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 class="text-xl font-bold text-gray-900">Nueva Comunidad</h2>
                        <p class="text-xs text-gray-500">Se creará directamente en Firestore.</p>
                    </div>
                    <button onclick="App.admin.closeCreateModal()" class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="flex-1 p-8 overflow-y-auto space-y-6">
                    
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-900 uppercase tracking-wide">Nombre</label>
                        <input type="text" id="cc-name" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-black outline-none font-medium transition-colors" placeholder="Ej. Master en SQL Avanzado">
                    </div>
                    
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-900 uppercase tracking-wide">Descripción</label>
                        <textarea id="cc-desc" rows="3" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-black outline-none font-medium resize-none transition-colors" placeholder="¿De qué trata esta comunidad?"></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-xs font-bold text-gray-900 uppercase tracking-wide">Categoría</label>
                            <select id="cc-cat" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-black outline-none font-medium appearance-none">
                                <option value="Business Intelligence">Business Intelligence</option>
                                <option value="Data Science">Data Science</option>
                                <option value="Data Engineering">Data Engineering</option>
                                <option value="Programación">Programación</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-bold text-gray-900 uppercase tracking-wide">Privacidad</label>
                            <select id="cc-private" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-black outline-none font-medium appearance-none">
                                <option value="false">Pública</option>
                                <option value="true">Privada</option>
                            </select>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-900 uppercase tracking-wide">Icono (FontAwesome)</label>
                        <div class="flex gap-3">
                            <div class="w-14 h-12 bg-black text-white rounded-xl flex items-center justify-center text-xl shadow-md shrink-0 transition-all" id="cc-icon-preview">
                                <i class="fas fa-rocket"></i>
                            </div>
                            <input type="text" id="cc-icon" value="fa-rocket" oninput="App.admin.updateIconPreview(this.value)" class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-black outline-none font-mono text-sm transition-colors" placeholder="fa-rocket">
                        </div>
                    </div>

                </div>

                <div class="p-6 border-t border-gray-100 bg-white">
                    <button onclick="App.admin.handleCreateSubmit()" id="btn-create-submit" class="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:bg-gray-900 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <span>Lanzar Comunidad</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    App.render(html);
    
    // 3. CARGAR DATOS
    // Carga Sidebar Global (Actualizado)
    App.sidebar.loadData(user);
    // Carga datos del dashboard admin
    await _loadAdminDashboard();
};

// ==========================================
// LOGICA ADMIN
// ==========================================

App.admin = {
    openCreateModal: () => {
        const modal = document.getElementById('create-modal');
        const panel = document.getElementById('create-panel');
        const backdrop = document.getElementById('create-backdrop');
        modal.classList.remove('hidden');
        void modal.offsetWidth; // Force Reflow
        panel.classList.remove('translate-x-full');
        backdrop.classList.remove('opacity-0');
    },

    closeCreateModal: () => {
        const modal = document.getElementById('create-modal');
        const panel = document.getElementById('create-panel');
        const backdrop = document.getElementById('create-backdrop');
        panel.classList.add('translate-x-full');
        backdrop.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('cc-name').value = '';
            document.getElementById('cc-desc').value = '';
        }, 300);
    },

    updateIconPreview: (val) => {
        const preview = document.getElementById('cc-icon-preview');
        if (preview) {
            const icon = preview.querySelector('i');
            if (icon) icon.className = `fas ${val}`;
        }
    },

    handleCreateSubmit: async () => {
        const btn = document.getElementById('btn-create-submit');
        const name = document.getElementById('cc-name').value;
        const desc = document.getElementById('cc-desc').value;
        const category = document.getElementById('cc-cat').value;
        const isPrivate = document.getElementById('cc-private').value === 'true';
        const icon = document.getElementById('cc-icon').value;

        if(!name || !desc) return App.ui.toast('Nombre y descripción requeridos', 'error');

        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creando...';
        btn.disabled = true;

        try {
            await App.api.createCommunity({
                name,
                description: desc,
                category,
                isPrivate,
                icon
            });

            App.ui.toast('¡Comunidad desplegada en Firestore!', 'success');
            App.admin.closeCreateModal();
            
            // Recargar Sidebar y Dashboard (Actualizado)
            App.sidebar.loadData(App.state.currentUser);
            await _loadAdminDashboard();

        } catch (error) {
            console.error(error);
            App.ui.toast('Error: Verifica permisos de Admin', 'error');
        } finally {
            btn.innerHTML = '<span>Lanzar Comunidad</span><i class="fas fa-arrow-right"></i>';
            btn.disabled = false;
        }
    }
};

async function _loadAdminDashboard() {
    try {
        const communities = await App.api.getCommunities();
        
        // Métricas
        const totalCommunities = communities.length;
        const totalMembers = communities.reduce((acc, curr) => acc + (curr.membersCount || 0), 0);
        
        // Render KPIs
        const kpiContainer = document.getElementById('admin-kpi-container');
        if (kpiContainer) {
            kpiContainer.innerHTML = `
                ${_renderKPI('Estudiantes Totales', App.ui.formatNumber(totalMembers), 'fa-users', 'bg-blue-50 text-blue-600')}
                ${_renderKPI('Comunidades Activas', totalCommunities, 'fa-layer-group', 'bg-purple-50 text-purple-600')}
                ${_renderKPI('Server Status', 'Online', 'fa-server', 'bg-green-50 text-green-600')}
                ${_renderKPI('DB Latency', '~45ms', 'fa-bolt', 'bg-yellow-50 text-yellow-600')}
            `;
        }

        // Render Lista
        const listContainer = document.getElementById('admin-communities-list');
        if (listContainer) {
            if (communities.length === 0) {
                listContainer.innerHTML = `<div class="p-8 text-center text-gray-400 italic">No hay comunidades. ¡Crea la primera!</div>`;
            } else {
                listContainer.innerHTML = communities.map(c => `
                    <div class="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 shadow-sm text-xl">
                                <i class="fas ${c.icon}"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-900 text-base">${c.name}</h4>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded">${c.category}</span>
                                    <span class="text-xs text-gray-400">• ${App.ui.formatNumber(c.membersCount)} miembros</span>
                                    ${c.isPrivate ? '<span class="text-xs text-gray-300"><i class="fas fa-lock"></i></span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="window.location.hash='#community/${c.id}'" class="text-sm font-bold text-black hover:underline">Ver</button>
                        </div>
                    </div>
                `).join('');
            }
        }

    } catch (e) {
        console.error("Admin Load Error:", e);
        App.ui.toast('Error cargando datos. ¿Eres Admin?', 'error');
    }
}

function _renderKPI(label, value, icon, colorClass) {
    return `
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">${label}</p>
                <h3 class="text-2xl font-heading font-bold text-gray-900">${value}</h3>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} text-xl">
                <i class="fas ${icon}"></i>
            </div>
        </div>
    `;
}

function _renderSkeletonKPI() {
    return `<div class="bg-white p-6 rounded-2xl border border-gray-100 h-32 skeleton"></div>`;
}