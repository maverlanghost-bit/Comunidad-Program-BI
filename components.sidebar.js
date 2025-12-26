/**
 * components.sidebar.js (V1.3 - Animation Fix)
 * Componente Global de Navegación Lateral.
 * * CORRECCIONES V1.3:
 * - Eliminada clase 'hidden' conflictiva.
 * - Animación puramente CSS (max-height) para fiabilidad visual.
 * - Logs de interacción al hacer clic en submenús.
 */

window.App = window.App || {};
window.App.sidebar = {

    /**
     * Renderiza el HTML del Sidebar basado en la ruta activa
     */
    render: (activeRoute) => {
        const user = App.state.currentUser;
        if (!user) return '';

        const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
        const sidebarClass = isPinned ? 'is-pinned' : '';

        // Items fijos
        const menuItems = [
            { hash: '#home', icon: 'fa-home', label: 'Inicio Global' }
        ];

        if (user.role === 'admin') {
            menuItems.push({ hash: '#admin', icon: 'fa-chart-pie', label: 'Panel Admin' });
        }

        return `
            <aside id="sidebar" class="flex flex-col justify-between shadow-sm z-50 group bg-white border-r border-gray-200 ${sidebarClass}">
                <div>
                    <!-- Header -->
                    <div class="h-20 flex items-center px-5 border-b border-gray-100 mb-6 relative shrink-0">
                        <div class="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg shrink-0 z-10">
                            <i class="fas fa-cubes text-lg"></i>
                        </div>
                        <div class="sidebar-text flex-1 overflow-hidden whitespace-nowrap ml-3">
                            <span class="font-heading font-bold text-lg text-black tracking-tight">ProgramBI</span>
                        </div>
                        <button onclick="App.sidebar.togglePin()" class="sidebar-text absolute right-4 text-gray-400 hover:text-black transition-colors p-2">
                            <i id="pin-icon" class="fas fa-thumbtack text-xs ${isPinned ? 'text-black -rotate-45' : ''} transition-transform"></i>
                        </button>
                    </div>

                    <!-- Nav Principal -->
                    <nav class="space-y-1 px-3">
                        ${menuItems.map(item => _renderItem(item.hash, item.icon, item.label, activeRoute === item.hash)).join('')}
                        
                        <div class="pt-6 pb-2 px-3 sidebar-text">
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                ${user.role === 'admin' ? 'Gestión Global' : 'Tus Comunidades'}
                            </p>
                        </div>
                        
                        <!-- Lista Dinámica de Comunidades -->
                        <div id="sidebar-communities-list" class="space-y-1">
                            <!-- Skeleton Loader -->
                            <div class="px-3 py-2 flex items-center gap-3">
                                <div class="h-5 w-5 bg-gray-100 rounded animate-pulse"></div>
                                <div class="h-4 bg-gray-100 rounded w-24 animate-pulse sidebar-text"></div>
                            </div>
                        </div>
                    </nav>
                </div>

                <!-- Footer User -->
                <div class="p-4 border-t border-gray-100 bg-white shrink-0">
                    <button onclick="App.dashboard.openProfileModal()" class="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-gray-50 transition-colors text-left group/user">
                        <img src="${user.avatar || 'https://ui-avatars.com/api/?name=User'}" class="w-9 h-9 rounded-full border border-gray-200 shrink-0 bg-gray-100 object-cover">
                        <div class="sidebar-text overflow-hidden">
                            <p class="text-sm font-bold text-gray-900 truncate">${user.name}</p>
                            <p class="text-[10px] text-gray-500 truncate capitalize">${user.role === 'admin' ? 'Administrador' : user.role}</p>
                        </div>
                        <i class="fas fa-cog text-gray-300 group-hover/user:text-black transition-colors ml-auto sidebar-text text-xs"></i>
                    </button>
                    <button onclick="App.api.logout()" class="sidebar-text mt-2 w-full text-xs text-gray-400 hover:text-red-500 flex items-center gap-2 px-3 py-1.5 transition-colors">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </div>
            </aside>
        `;
    },

    /**
     * Carga de datos con reintento (Race Condition Fix mantenido)
     */
    loadData: async (user, retryCount = 0) => {
        try {
            const sidebarList = document.getElementById('sidebar-communities-list');
            
            // Reintento si el DOM no está listo
            if (!sidebarList) {
                if (retryCount < 10) { 
                    setTimeout(() => App.sidebar.loadData(user, retryCount + 1), 100);
                }
                return;
            }

            const allCommunities = await App.api.getCommunities();
            let myCommunities = [];
            const joinedIds = user.joinedCommunities || []; 

            if (user.role === 'admin') {
                myCommunities = allCommunities;
            } else {
                myCommunities = allCommunities.filter(c => joinedIds.includes(c.id));
            }

            if (myCommunities.length > 0) {
                // NOTA: Se ha eliminado la clase 'hidden' de submenu-container para evitar conflictos
                // El CSS se encarga de ocultarlo con max-height: 0 por defecto.
                sidebarList.innerHTML = myCommunities.map(c => `
                    <div class="group/comm mb-1">
                        <button type="button" onclick="App.sidebar.toggleSubmenu('${c.id}')" class="w-full flex items-center px-3 py-2.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors relative">
                            <div class="w-5 flex justify-center shrink-0"><i class="fas ${c.icon}"></i></div>
                            <span class="sidebar-text font-medium text-sm ml-3 flex-1 text-left truncate">${c.name}</span>
                            <i class="fas fa-chevron-down text-[10px] sidebar-text transition-transform ml-2 opacity-50" id="arrow-${c.id}"></i>
                        </button>
                        <div id="submenu-${c.id}" class="submenu-container sidebar-text pl-11 border-l border-gray-100 ml-5 mt-1 overflow-hidden" style="transition: all 0.3s ease-out;">
                            <a href="#community/${c.id}/inicio" class="block py-1.5 text-xs text-gray-500 hover:text-black hover:font-bold transition-colors">Inicio</a>
                            <a href="#community/${c.id}/clases" class="block py-1.5 text-xs text-gray-500 hover:text-black hover:font-bold transition-colors">Clases</a>
                            <a href="#community/${c.id}/live" class="block py-1.5 text-xs text-gray-500 hover:text-red-500 hover:font-bold transition-colors"><i class="fas fa-circle text-[6px] text-red-500 mr-1"></i> En vivo</a>
                            <a href="#community/${c.id}/comunidad" class="block py-1.5 text-xs text-gray-500 hover:text-black hover:font-bold transition-colors">Comunidad</a>
                        </div>
                    </div>
                `).join('');
            } else {
                sidebarList.innerHTML = `<div class="sidebar-text px-4 py-2 text-xs text-gray-400 italic">No te has unido a ninguna comunidad aún.</div>`;
            }

            // Actualizar selects si existen
            const postSelect = document.getElementById('post-community-select');
            if (postSelect && postSelect.options.length <= 1) {
                postSelect.innerHTML = '<option value="" disabled selected>Selecciona una comunidad...</option>' + 
                myCommunities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }

        } catch (e) {
            console.error("Sidebar Load Error:", e);
        }
    },

    /**
     * UI Actions - Toggle Simplificado
     */
    togglePin: () => {
        const sidebar = document.getElementById('sidebar');
        const icon = document.getElementById('pin-icon');
        const isPinned = sidebar.classList.contains('is-pinned');
        
        if (isPinned) {
            sidebar.classList.remove('is-pinned');
            document.body.classList.remove('sidebar-is-pinned');
            icon.classList.remove('text-black', '-rotate-45');
            localStorage.setItem('sidebar_pinned', 'false');
        } else {
            sidebar.classList.add('is-pinned');
            document.body.classList.add('sidebar-is-pinned');
            icon.classList.add('text-black', '-rotate-45');
            localStorage.setItem('sidebar_pinned', 'true');
        }
    },

    toggleSubmenu: (id) => {
        console.log("🖱️ Click en comunidad:", id); // Log para debug
        const menu = document.getElementById(`submenu-${id}`);
        const arrow = document.getElementById(`arrow-${id}`);
        if(!menu) return;
        
        // Usamos la clase 'open' que está definida en CSS con max-height
        // Si no funciona el CSS, forzamos estilo inline como fallback
        if (menu.classList.contains('open')) {
            menu.classList.remove('open');
            // Fallback JS
            menu.style.maxHeight = '0px';
            menu.style.opacity = '0';
            if(arrow) arrow.style.transform = 'rotate(0deg)';
        } else {
            menu.classList.add('open');
            // Fallback JS
            menu.style.maxHeight = '500px'; 
            menu.style.opacity = '1';
            if(arrow) arrow.style.transform = 'rotate(180deg)';
        }
    }
};

// Helper
function _renderItem(hash, icon, label, isActive) {
    const activeClass = isActive ? "text-black bg-gray-100 font-bold" : "text-gray-500 hover:text-black hover:bg-gray-50 font-medium";
    return `
        <a href="${hash}" class="flex items-center px-3 py-2.5 rounded-lg transition-all ${activeClass} mb-1 group">
            <div class="w-5 flex justify-center shrink-0"><i class="fas ${icon}"></i></div>
            <span class="sidebar-text text-sm ml-3 truncate">${label}</span>
        </a>
    `;
}