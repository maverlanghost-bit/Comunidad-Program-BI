/**
 * components.sidebar.js (V7.1 - LIVE LINK FIX)
 * Componente Global de Navegación Lateral.
 * * CAMBIOS V7.1:
 * - El enlace a "Live" ahora es visible SIEMPRE en el submenú de comunidad.
 * - Diferenciación visual: Rojo/Pulsante (Online) vs Gris (Offline/Sala de Espera).
 */

window.App = window.App || {};
window.App.sidebar = {

    // Estado interno
    observer: null,
    isLoaded: false,

    /**
     * INIT: Inicia el "Vigilante" del Sidebar para carga diferida.
     */
    initObserver: () => {
        if (App.sidebar.observer) return;

        App.sidebar.observer = new MutationObserver((mutations) => {
            const sidebarList = document.getElementById('sidebar-communities-list');
            // Solo cargar si el elemento existe y no tiene datos aún
            if (sidebarList && !sidebarList.classList.contains('data-loaded')) {
                if (!sidebarList.classList.contains('data-loading')) {
                    sidebarList.classList.add('data-loading'); 
                    App.sidebar.loadData();
                }
            }
        });

        App.sidebar.observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * ACCIÓN: Manejar salida del mouse (Auto-Close si no está fijado)
     */
    handleMouseLeave: () => {
        const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
        if (isPinned) return;

        // Cerrar todos los submenús al salir
        document.querySelectorAll('.submenu-container.open').forEach(el => {
            el.classList.remove('open');
            el.style.maxHeight = '0px';
            el.style.opacity = '0';
            
            const id = el.id.replace('submenu-', '');
            const arrow = document.getElementById(`arrow-${id}`);
            if(arrow) arrow.style.transform = 'rotate(0deg)';
        });
    },

    /**
     * RENDER: Estructura HTML Principal
     */
    render: (activeRoute) => {
        const user = App.state.currentUser;
        if (!user) return '';

        const isPinned = localStorage.getItem('sidebar_pinned') === 'true';
        const sidebarClass = isPinned ? 'is-pinned' : '';

        // LOGOS DEFINIDOS POR EL CLIENTE
        const logoSmall = "https://cdn.shopify.com/s/files/1/0564/3812/8712/files/freepik_br_34e81470-d8f7-4535-8a62-0ad154587c5a.png?v=1766816899";
        const logoFull = "https://cdn.shopify.com/s/files/1/0564/3812/8712/files/logo-03_b7b98699-bd18-46ee-8b1b-31885a2c4c62.png?v=1766816974";

        // Menú Principal
        const menuItems = [
            { hash: '#home', icon: 'fa-home', label: 'Inicio Global' }
        ];

        if (user.role === 'admin') {
            menuItems.push({ hash: '#admin', icon: 'fa-chart-pie', label: 'Panel Admin' });
        }

        return `
            <aside id="sidebar" onmouseleave="App.sidebar.handleMouseLeave()" class="flex flex-col justify-between shadow-sm z-50 group bg-white border-r border-gray-100 ${sidebarClass} h-full fixed top-0 left-0 transition-all duration-300">
                <div class="flex flex-col h-full">
                    
                    <!-- HEADER CON LOGOS DINÁMICOS -->
                    <div class="h-20 flex items-center px-4 border-b border-gray-50 mb-4 relative shrink-0 cursor-pointer group/header" onclick="window.location.hash='#home'">
                        <!-- Logo Colapsado (Pequeño) -->
                        <img src="${logoSmall}" class="logo-collapsed w-10 h-10 object-contain absolute left-4 transition-all duration-200" alt="Logo Small">
                        
                        <!-- Logo Expandido (Grande) -->
                        <img src="${logoFull}" class="logo-expanded h-8 object-contain absolute left-4 transition-all duration-200" alt="Logo Full">
                        
                        <!-- Botón Pin (AHORA ES UN MENÚ HAMBURGUESA) -->
                        <button onclick="event.stopPropagation(); App.sidebar.togglePin()" class="sidebar-text absolute right-4 text-gray-400 hover:text-[#1890ff] transition-colors p-2 z-20" title="${isPinned ? 'Desfijar menú' : 'Fijar menú'}">
                            <i id="pin-icon" class="fas fa-bars text-sm ${isPinned ? 'text-[#1890ff]' : ''} transition-transform"></i>
                        </button>
                    </div>

                    <!-- NAVEGACIÓN PRINCIPAL -->
                    <nav class="space-y-1 px-3 flex-1 overflow-y-auto custom-scrollbar">
                        ${menuItems.map(item => _renderItem(item.hash, item.icon, item.label, activeRoute.startsWith(item.hash))).join('')}
                        
                        <!-- SEPARADOR -->
                        <div class="pt-6 pb-2 px-3 sidebar-text flex justify-between items-center">
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                ${user.role === 'admin' ? 'Gestión' : 'Mis Comunidades'}
                            </p>
                            ${user.role === 'admin' ? '' : '<a href="#home" class="text-[10px] text-[#1890ff] hover:underline font-bold">Explorar</a>'}
                        </div>
                        
                        <!-- LISTA DINÁMICA DE COMUNIDADES -->
                        <div id="sidebar-communities-list" class="space-y-1 min-h-[50px]">
                            <!-- Skeleton Loader -->
                            <div class="px-3 py-2 flex items-center gap-3 opacity-50">
                                <div class="h-8 w-8 bg-gray-100 rounded-lg animate-pulse"></div>
                                <div class="h-3 bg-gray-100 rounded w-20 animate-pulse sidebar-text"></div>
                            </div>
                        </div>
                    </nav>

                    <!-- FOOTER USUARIO -->
                    <div class="p-4 border-t border-gray-100 bg-white shrink-0 mt-auto">
                        <button onclick="App.dashboard.openProfileModal()" class="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-gray-50 transition-colors text-left group/user relative overflow-hidden">
                            <img src="${user.avatar || 'https://ui-avatars.com/api/?name=User'}" class="w-9 h-9 rounded-full border border-gray-100 shrink-0 bg-gray-50 object-cover shadow-sm z-10">
                            <div class="sidebar-text overflow-hidden z-10 relative">
                                <p class="text-sm font-bold text-gray-900 truncate font-heading">${user.name}</p>
                                <p class="text-[10px] text-gray-500 truncate capitalize">${user.role === 'admin' ? 'Administrador' : user.role}</p>
                            </div>
                            <i class="fas fa-cog text-gray-300 group-hover/user:text-[#1890ff] transition-colors ml-auto sidebar-text text-xs z-10"></i>
                        </button>
                        <button onclick="App.api.logout()" class="sidebar-text mt-2 w-full text-xs text-gray-400 hover:text-red-500 flex items-center gap-2 px-3 py-1.5 transition-colors font-medium">
                            <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>
        `;
    },

    /**
     * LOGIC: Carga de Comunidades (Usuario o Admin)
     */
    loadData: async (userOverride = null) => {
        const sidebarList = document.getElementById('sidebar-communities-list');
        if (!sidebarList) return; 
        if (sidebarList.classList.contains('data-loaded')) return;

        const user = userOverride || App.state.currentUser;
        if (!user) {
            sidebarList.innerHTML = `<div class="p-4 text-xs text-gray-400">Inicia sesión</div>`;
            return;
        }

        try {
            // Estrategia Cache First
            const cached = Object.values(App.state.cache.communities || {});
            
            // Si hay cache, renderizar de inmediato
            if (cached.length > 0) {
                _renderCommunitiesToDom(sidebarList, cached, user);
                sidebarList.classList.add('data-loaded');
                sidebarList.classList.remove('data-loading');
                _autoExpandActiveCommunity();
            }

            // Sync con Red (para obtener actualizaciones)
            const allCommunities = await App.api.getCommunities();
            _renderCommunitiesToDom(sidebarList, allCommunities, user);
            
            sidebarList.classList.add('data-loaded');
            sidebarList.classList.remove('data-loading');
            
            // Actualizar selectores globales si existen en el DOM
            _updateGlobalSelects(allCommunities);
            _autoExpandActiveCommunity();

        } catch (e) {
            console.error("Sidebar Error:", e);
            sidebarList.classList.remove('data-loading');
        }
    },

    /**
     * UX: Fijar/Desfijar Sidebar
     */
    togglePin: () => {
        const sidebar = document.getElementById('sidebar');
        const icon = document.getElementById('pin-icon');
        const isPinned = sidebar.classList.contains('is-pinned');
        
        if (isPinned) {
            sidebar.classList.remove('is-pinned');
            document.body.classList.remove('sidebar-is-pinned');
            if(icon) icon.classList.remove('text-[#1890ff]'); // Quitamos color activo
            localStorage.setItem('sidebar_pinned', 'false');
        } else {
            sidebar.classList.add('is-pinned');
            document.body.classList.add('sidebar-is-pinned');
            if(icon) icon.classList.add('text-[#1890ff]'); // Ponemos color activo
            localStorage.setItem('sidebar_pinned', 'true');
        }
    },

    /**
     * UX: Acordeón de Submenús
     */
    toggleSubmenu: (id) => {
        const menu = document.getElementById(`submenu-${id}`);
        const arrow = document.getElementById(`arrow-${id}`);
        if(!menu) return;
        
        const isOpen = menu.classList.contains('open');

        // Cerrar otros abiertos (comportamiento acordeón estricto)
        document.querySelectorAll('.submenu-container.open').forEach(el => {
            if(el.id !== `submenu-${id}`) {
                el.classList.remove('open');
                el.style.maxHeight = '0px';
                el.style.opacity = '0';
                const otherArrow = document.getElementById(el.id.replace('submenu-', 'arrow-'));
                if(otherArrow) otherArrow.style.transform = 'rotate(0deg)';
            }
        });

        if (!isOpen) {
            menu.classList.add('open');
            menu.style.maxHeight = '500px'; 
            menu.style.opacity = '1';
            if(arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
            menu.classList.remove('open');
            menu.style.maxHeight = '0px'; 
            menu.style.opacity = '0';
            if(arrow) arrow.style.transform = 'rotate(0deg)';
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
// HELPERS PRIVADOS
// ==========================================

function _renderItem(hash, icon, label, isActive) {
    // Estilo Activo: Azul Corporativo + Fondo Azul Claro + Borde Derecho
    const activeClass = isActive 
        ? "text-[#1890ff] bg-blue-50 font-bold border-r-2 border-[#1890ff]" 
        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium border-r-2 border-transparent";
    
    return `
        <a href="${hash}" class="flex items-center px-3 py-2.5 mx-2 rounded-lg transition-all ${activeClass} mb-1 group">
            <div class="w-6 flex justify-center shrink-0 text-center"><i class="fas ${icon}"></i></div>
            <span class="sidebar-text text-sm ml-3 truncate">${label}</span>
        </a>
    `;
}

function _renderCommunitiesToDom(container, allCommunities, user) {
    let myCommunities = [];
    const joinedIds = user.joinedCommunities || []; 

    // Admin ve todo, Usuario solo las que se ha unido
    if (user.role === 'admin') {
        myCommunities = allCommunities;
    } else {
        myCommunities = allCommunities.filter(c => joinedIds.includes(c.id));
    }

    if (myCommunities.length > 0) {
        container.innerHTML = myCommunities.map(c => `
            <div class="group/comm mb-1">
                <!-- Botón Principal Comunidad -->
                <button type="button" onclick="App.sidebar.toggleSubmenu('${c.id}')" class="w-full flex items-center px-3 py-2.5 mx-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors relative max-w-[calc(100%-16px)]">
                    <div class="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm text-xs text-gray-600 group-hover/comm:border-[#1890ff] group-hover/comm:text-[#1890ff] transition-colors">
                        <i class="fas ${c.icon || 'fa-users'}"></i>
                    </div>
                    <span class="sidebar-text font-medium text-sm ml-3 flex-1 text-left truncate">${c.name}</span>
                    <i class="fas fa-chevron-down text-[10px] sidebar-text transition-transform ml-2 text-gray-300 group-hover/comm:text-gray-500" id="arrow-${c.id}"></i>
                </button>
                
                <!-- Submenú Corregido (Live siempre visible) -->
                <div id="submenu-${c.id}" class="submenu-container sidebar-text pl-4 ml-6 border-l border-gray-200 mt-1 overflow-hidden transition-all duration-300 max-h-0 opacity-0">
                    <a href="#community/${c.id}/inicio" onclick="window.location.hash='#community/${c.id}/inicio'; location.reload()" class="block py-2 pl-4 text-[13px] text-gray-500 hover:text-[#1890ff] hover:font-bold transition-colors">Inicio</a>
                    <a href="#community/${c.id}/clases" onclick="window.location.hash='#community/${c.id}/clases'; location.reload()" class="block py-2 pl-4 text-[13px] text-gray-500 hover:text-[#1890ff] hover:font-bold transition-colors">Clases</a>
                    
                    <!-- ENLACE LIVE SIEMPRE VISIBLE CON ESTILOS CONDICIONALES -->
                    <a href="#community/${c.id}/live" onclick="window.location.hash='#community/${c.id}/live'; location.reload()" 
                       class="block py-2 pl-4 text-[13px] transition-colors flex items-center gap-1.5 ${c.isLive ? 'text-red-500 font-bold hover:bg-red-50 rounded-r-lg animate-pulse' : 'text-gray-500 hover:text-[#1890ff] hover:font-bold'}">
                        ${c.isLive 
                            ? '<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Live' 
                            : '<i class="fas fa-video text-[10px] opacity-70"></i> Sala Live'}
                    </a>
                    
                    <a href="#community/${c.id}/comunidad" onclick="window.location.hash='#community/${c.id}/comunidad'; location.reload()" class="block py-2 pl-4 text-[13px] text-gray-500 hover:text-[#1890ff] hover:font-bold transition-colors">Chat</a>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="sidebar-text px-6 py-8 text-center">
                <div class="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300">
                    <i class="fas fa-compass"></i>
                </div>
                <p class="text-xs text-gray-400 italic mb-2">Aún no tienes comunidades.</p>
                <a href="#home" class="text-[10px] font-bold text-[#1890ff] hover:underline">Explorar ahora</a>
            </div>`;
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

// Auto-init si el DOM ya está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.sidebar.initObserver);
} else {
    App.sidebar.initObserver();
}