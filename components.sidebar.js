/**
 * components.sidebar.js (V3.0 - Autonomous Self-Healing)
 * Componente Global de Navegación Lateral.
 * * SOLUCIÓN DEFINITIVA V3.0:
 * - Observer Pattern: El sidebar detecta automáticamente cuando es insertado en el DOM y se hidrata solo.
 * - Desacople Total: No requiere que las vistas llamen a loadData().
 * - Reintentos Inteligentes: Si falla la red, muestra botón de reintento.
 */

window.App = window.App || {};
window.App.sidebar = {

    // Estado interno del componente
    observer: null,
    isLoaded: false,

    /**
     * INIT: Inicia el "Vigilante" del Sidebar una sola vez al cargar la App.
     * Se llama automáticamente al final de este archivo.
     */
    initObserver: () => {
        if (App.sidebar.observer) return; // Ya iniciado

        // Crear un observador que vigila cambios en el DOM
        App.sidebar.observer = new MutationObserver((mutations) => {
            // Verificar si el sidebar ha sido insertado en el documento
            const sidebarList = document.getElementById('sidebar-communities-list');
            
            // Si el elemento existe Y (no tiene contenido o solo tiene el skeleton), cargamos.
            if (sidebarList && !sidebarList.classList.contains('data-loaded')) {
                console.log("👁️ Sidebar detectado en DOM -> Iniciando Auto-Hidratación...");
                // Marcamos para evitar bucles infinitos inmediatos, aunque loadData maneja la lógica real
                sidebarList.classList.add('data-loading'); 
                App.sidebar.loadData();
            }
        });

        // Empezar a observar el cuerpo del documento
        App.sidebar.observer.observe(document.body, { childList: true, subtree: true });
        console.log("✅ Sidebar Observer Activado: Esperando inyección de vistas...");
    },

    /**
     * Renderiza el HTML Estructural (Sin lógica, solo esqueleto)
     */
    render: (activeRoute) => {
        const user = App.state.currentUser;
        if (!user) return '';

        const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
        const sidebarClass = isPinned ? 'is-pinned' : '';

        // Definir items estáticos
        const menuItems = [
            { hash: '#home', icon: 'fa-home', label: 'Inicio Global' }
        ];

        if (user.role === 'admin') {
            menuItems.push({ hash: '#admin', icon: 'fa-chart-pie', label: 'Panel Admin' });
        }

        // Retornamos el HTML. Nota: sidebar-communities-list está vacío esperando al Observer.
        return `
            <aside id="sidebar" class="flex flex-col justify-between shadow-sm z-50 group bg-white border-r border-gray-200 ${sidebarClass} h-full fixed top-0 left-0 transition-all duration-300">
                <div class="flex flex-col h-full">
                    <!-- Header -->
                    <div class="h-20 flex items-center px-5 border-b border-gray-100 mb-6 relative shrink-0">
                        <div class="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg shrink-0 z-10 transition-transform hover:scale-105 cursor-pointer" onclick="window.location.hash='#home'">
                            <i class="fas fa-cubes text-lg"></i>
                        </div>
                        <div class="sidebar-text flex-1 overflow-hidden whitespace-nowrap ml-3">
                            <span class="font-heading font-bold text-lg text-black tracking-tight">ProgramBI</span>
                        </div>
                        <button onclick="App.sidebar.togglePin()" class="sidebar-text absolute right-4 text-gray-400 hover:text-black transition-colors p-2">
                            <i id="pin-icon" class="fas fa-thumbtack text-xs ${isPinned ? 'text-black -rotate-45' : ''} transition-transform"></i>
                        </button>
                    </div>

                    <!-- Nav Principal (Scrollable) -->
                    <nav class="space-y-1 px-3 flex-1 overflow-y-auto custom-scrollbar">
                        ${menuItems.map(item => _renderItem(item.hash, item.icon, item.label, activeRoute.startsWith(item.hash))).join('')}
                        
                        <div class="pt-6 pb-2 px-3 sidebar-text">
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                ${user.role === 'admin' ? 'Gestión Global' : 'Tus Comunidades'}
                            </p>
                        </div>
                        
                        <!-- ZONA CRÍTICA: Aquí es donde el Observer inyectará los datos -->
                        <div id="sidebar-communities-list" class="space-y-1 min-h-[50px]">
                            <!-- Skeleton Default -->
                            <div class="px-3 py-2 flex items-center gap-3 opacity-50">
                                <div class="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                                <div class="h-4 bg-gray-200 rounded w-24 animate-pulse sidebar-text"></div>
                            </div>
                        </div>
                    </nav>

                    <!-- Footer User (Fijo abajo) -->
                    <div class="p-4 border-t border-gray-100 bg-white shrink-0 mt-auto">
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
                </div>
            </aside>
        `;
    },

    /**
     * Lógica de Carga Robusta
     * Ahora puede ser llamada sin argumentos y recupera el usuario del estado global.
     */
    loadData: async (userOverride = null) => {
        const sidebarList = document.getElementById('sidebar-communities-list');
        if (!sidebarList) return; // Si no está en el DOM, el Observer lo llamará luego.

        // Evitar recargas si ya está marcado como "loaded" (salvo fuerza mayor)
        if (sidebarList.classList.contains('data-loaded')) return;

        const user = userOverride || App.state.currentUser;
        if (!user) {
            sidebarList.innerHTML = `<div class="p-4 text-xs text-gray-400">Sesión no iniciada</div>`;
            return;
        }

        try {
            // 1. CACHE FIRST: Si tenemos datos, pintar INMEDIATAMENTE
            const cached = Object.values(App.state.cache.communities || {});
            if (cached.length > 0) {
                _renderCommunitiesToDom(sidebarList, cached, user);
                sidebarList.classList.add('data-loaded'); // Marcar como listo
                sidebarList.classList.remove('data-loading');
                _autoExpandActiveCommunity();
            }

            // 2. NETWORK SYNC: Actualizar en segundo plano
            const allCommunities = await App.api.getCommunities();
            
            // Volver a pintar con datos frescos
            _renderCommunitiesToDom(sidebarList, allCommunities, user);
            
            // Marcar éxito final
            sidebarList.classList.add('data-loaded');
            sidebarList.classList.remove('data-loading');
            
            // Actualizar selects globales
            _updateGlobalSelects(allCommunities);
            
            // Expandir menú si corresponde
            _autoExpandActiveCommunity();

        } catch (e) {
            console.error("Sidebar Error:", e);
            // Mostrar botón de reintento manual si falla todo
            sidebarList.innerHTML = `
                <div class="px-4 py-3 text-center sidebar-text">
                    <p class="text-[10px] text-red-400 mb-2">Error de conexión</p>
                    <button onclick="App.sidebar.loadData()" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-colors">
                        <i class="fas fa-sync-alt mr-1"></i> Reintentar
                    </button>
                </div>`;
            sidebarList.classList.remove('data-loading');
        }
    },

    // --- ACCIONES UI ---

    togglePin: () => {
        const sidebar = document.getElementById('sidebar');
        const icon = document.getElementById('pin-icon');
        const isPinned = sidebar.classList.contains('is-pinned');
        
        if (isPinned) {
            sidebar.classList.remove('is-pinned');
            document.body.classList.remove('sidebar-is-pinned');
            if(icon) icon.classList.remove('text-black', '-rotate-45');
            localStorage.setItem('sidebar_pinned', 'false');
        } else {
            sidebar.classList.add('is-pinned');
            document.body.classList.add('sidebar-is-pinned');
            if(icon) icon.classList.add('text-black', '-rotate-45');
            localStorage.setItem('sidebar_pinned', 'true');
        }
    },

    toggleSubmenu: (id) => {
        const menu = document.getElementById(`submenu-${id}`);
        const arrow = document.getElementById(`arrow-${id}`);
        if(!menu) return;
        
        const isOpen = menu.classList.contains('open');

        // Cerrar todos los demás (Acordeón exclusivo)
        document.querySelectorAll('.submenu-container.open').forEach(el => {
            el.classList.remove('open');
            el.style.maxHeight = '0px';
            el.style.opacity = '0';
            const otherArrow = document.getElementById(el.id.replace('submenu-', 'arrow-'));
            if(otherArrow) otherArrow.style.transform = 'rotate(0deg)';
        });

        if (!isOpen) {
            menu.classList.add('open');
            menu.style.maxHeight = '500px'; 
            menu.style.opacity = '1';
            if(arrow) arrow.style.transform = 'rotate(180deg)';
        }
    },

    expandMenu: (id) => {
        const menu = document.getElementById(`submenu-${id}`);
        const arrow = document.getElementById(`arrow-${id}`);
        if (menu && !menu.classList.contains('open')) {
            menu.classList.add('open');
            menu.style.maxHeight = '500px'; 
            menu.style.opacity = '1';
            if(arrow) arrow.style.transform = 'rotate(180deg)';
        }
    }
};

// ==========================================
// HELPERS
// ==========================================

function _renderItem(hash, icon, label, isActive) {
    const activeClass = isActive ? "text-black bg-gray-100 font-bold" : "text-gray-500 hover:text-black hover:bg-gray-50 font-medium";
    return `
        <a href="${hash}" class="flex items-center px-3 py-2.5 rounded-lg transition-all ${activeClass} mb-1 group">
            <div class="w-5 flex justify-center shrink-0"><i class="fas ${icon}"></i></div>
            <span class="sidebar-text text-sm ml-3 truncate">${label}</span>
        </a>
    `;
}

function _renderCommunitiesToDom(container, allCommunities, user) {
    let myCommunities = [];
    const joinedIds = user.joinedCommunities || []; 

    if (user.role === 'admin') {
        myCommunities = allCommunities;
    } else {
        myCommunities = allCommunities.filter(c => joinedIds.includes(c.id));
    }

    if (myCommunities.length > 0) {
        container.innerHTML = myCommunities.map(c => `
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
        container.innerHTML = `<div class="sidebar-text px-4 py-2 text-xs text-gray-400 italic">No te has unido a ninguna comunidad aún.</div>`;
    }
}

function _autoExpandActiveCommunity() {
    const hash = window.location.hash;
    if (hash.startsWith('#community/')) {
        const parts = hash.split('/');
        if (parts.length >= 2) {
            const communityId = parts[1];
            App.sidebar.expandMenu(communityId);
        }
    }
}

function _updateGlobalSelects(communities) {
    const postSelect = document.getElementById('post-community-select');
    if (postSelect && postSelect.options.length <= 1) {
        postSelect.innerHTML = '<option value="" disabled selected>Selecciona una comunidad...</option>' + 
        communities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

// --- AUTO-ARRANQUE DEL OBSERVER ---
// Esto garantiza que el sidebar se active independientemente de quién cargue el script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.sidebar.initObserver);
} else {
    App.sidebar.initObserver();
}
