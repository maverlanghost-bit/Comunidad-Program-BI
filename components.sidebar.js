/**
 * sidebar.js (V37.0 - NAV REFACTOR)
 * Componente de Barra Lateral Completo.
 * * CAMBIOS V37.0:
 * - NUEVO: Botón "Explorar" agregado explícitamente bajo "Mi Feed".
 * - UX: Icono de fijado cambiado a 'fa-bars' (3 líneas).
 * - LIMPIEZA: Estructura optimizada para navegación directa.
 */

window.App = window.App || {};
window.App.sidebar = window.App.sidebar || {};

// Estado local para menús abiertos y pin
window.App.sidebarState = {
    openMenus: JSON.parse(localStorage.getItem('sidebar_open_menus') || '[]'),
    isPinned: localStorage.getItem('sidebar_pinned') === 'true'
};

window.App.sidebar.render = (activeId = 'feed') => {
    const user = App.state.currentUser;
    if (!user) return '';

    // Clases dinámicas según estado (Pinned vs Hover)
    const sidebarWidthClass = window.App.sidebarState.isPinned ? 'w-[260px]' : 'w-[72px] hover:w-[260px]';
    // Cambio de icono a Barras (fa-bars)
    const pinIconClass = window.App.sidebarState.isPinned ? 'text-[#1890ff]' : 'text-slate-400';
    
    // Rutas activas
    const isFeedActive = activeId === 'feed';
    const isDiscoveryActive = activeId === 'discovery'; // Nuevo estado activo
    
    const isDark = App.state.theme === 'dark';
    const themeIconClass = isDark ? 'fa-moon text-slate-400' : 'fa-sun text-yellow-400';
    const themeLabelText = isDark ? 'Modo Noche' : 'Modo Día';

    return `
    <aside id="sidebar" class="fixed top-0 left-0 h-full bg-white dark:bg-[#0f172a] border-r border-gray-200 dark:border-slate-800 z-50 flex flex-col transition-all duration-300 ${sidebarWidthClass} group/sidebar shadow-2xl overflow-visible">
        
        <!-- 1. HEADER (LOGO + PIN/TOGGLE) -->
        <div class="h-[72px] flex items-center px-4 border-b border-gray-100 dark:border-slate-800 shrink-0 relative justify-between">
            
            <div class="flex items-center gap-3 cursor-pointer overflow-hidden" onclick="window.location.hash='#feed'">
                <div class="w-10 h-10 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/30 shrink-0">
                    <i class="fas fa-code"></i>
                </div>
                <span class="font-heading font-black text-xl text-slate-900 dark:text-white tracking-tight whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75">
                    ProgramBI
                </span>
            </div>

            <!-- Botón Pin/Toggle (Ahora son 3 líneas / Hamburguesa) -->
            <button onclick="App.sidebar.togglePin()" class="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all opacity-0 group-hover/sidebar:opacity-100 absolute right-3" title="${window.App.sidebarState.isPinned ? 'Desfijar menú' : 'Fijar menú'}">
                <i class="fas fa-bars text-sm ${pinIconClass}" id="pin-icon-i"></i>
            </button>
        </div>

        <!-- 2. MENÚ SCROLLABLE -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6 flex flex-col gap-1 px-3">
            
            <!-- Global Navigation -->
            ${_renderNavItem('feed', 'Mi Feed', 'fa-home', isFeedActive)}
            ${_renderNavItem('discovery', 'Explorar', 'fa-compass', isDiscoveryActive)}
            
            ${user.role === 'admin' ? _renderNavItem('admin', 'Admin Panel', 'fa-shield-alt', activeId === 'admin', 'text-purple-500') : ''}

            <div class="my-3 border-t border-gray-100 dark:border-slate-800 mx-2"></div>

            <!-- Título Sección -->
            <div class="px-3 flex justify-between items-center group-hover/sidebar:opacity-100 opacity-0 transition-opacity duration-200 mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tus Comunidades</span>
                <span class="text-[10px] font-bold text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">${user.joinedCommunities?.length || 0}</span>
            </div>

            <!-- Lista Comunidades (Con Dropdowns) -->
            <div class="space-y-1">
                ${(user.joinedCommunities || []).map(cid => {
                    const c = App.state.cache.communities[cid];
                    if (!c) return ''; 
                    const isOpen = window.App.sidebarState.openMenus.includes(cid) || activeId === cid;
                    return _renderCommunityDropdown(c, activeId, isOpen);
                }).join('')}
            </div>

            ${(user.joinedCommunities || []).length === 0 ? `
                <div class="text-center p-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                    <p class="text-xs text-slate-400 mb-2">Sin comunidades</p>
                    <button onclick="window.location.hash='#discovery'" class="text-xs font-bold text-[#1890ff] hover:underline">Explorar ahora</button>
                </div>
            ` : ''}
        </div>

        <!-- 3. FOOTER -->
        <div class="p-3 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-[#0f172a]">
            
            <!-- Toggle Tema -->
            <button onclick="App.sidebar.handleThemeToggle()" class="w-full flex items-center gap-4 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors group/theme overflow-hidden whitespace-nowrap">
                <div class="w-6 flex justify-center shrink-0 transition-colors">
                    <i id="sidebar-theme-icon" class="fas ${themeIconClass}"></i>
                </div>
                <span class="font-medium text-sm opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200" id="sidebar-theme-label">
                    ${themeLabelText}
                </span>
            </button>
            
            <button onclick="App.api.logout()" class="w-full flex items-center gap-4 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors mt-1 overflow-hidden whitespace-nowrap">
                <div class="w-6 flex justify-center shrink-0"><i class="fas fa-sign-out-alt"></i></div>
                <span class="font-medium text-sm opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                    Cerrar Sesión
                </span>
            </button>
        </div>
    </aside>`;
};

// --- HELPERS ---

function _renderNavItem(id, label, icon, isActive, iconColorClass = '') {
    const bgClass = isActive 
        ? 'bg-[#1890ff] text-white shadow-lg shadow-blue-500/30' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-[#1890ff]';
    
    const finalIconColor = isActive ? 'text-white' : (iconColorClass || '');

    // Para discovery, usamos el hash directo, para otros el ID
    const href = id === 'discovery' ? '#discovery' : `#${id}`;

    return `
    <a href="${href}" class="flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${bgClass} overflow-hidden group/item relative">
        <div class="w-6 flex justify-center shrink-0 text-lg ${finalIconColor}">
            <i class="fas ${icon}"></i>
        </div>
        <span class="font-bold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75">
            ${label}
        </span>
        ${isActive ? '<div class="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/20 rounded-l-full"></div>' : ''}
    </a>`;
}

function _renderCommunityDropdown(c, activeId, isOpen) {
    const isContextActive = activeId === c.id || window.location.hash.includes(`/${c.id}/`);
    
    const headerClass = isContextActive 
        ? 'bg-blue-50 dark:bg-blue-900/10 text-[#1890ff]' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white';

    const arrowRotation = isOpen ? 'rotate-180' : 'rotate-0';
    const submenuDisplay = isOpen ? 'block' : 'none';

    return `
    <div class="mb-1">
        <div class="flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${headerClass} group/comm relative"
             onclick="App.sidebar.toggleSubmenu('${c.id}')">
            
            <div class="flex items-center gap-3 overflow-hidden">
                <img src="${c.icon || ''}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random'" 
                     class="w-8 h-8 rounded-lg object-cover shrink-0 bg-gray-200 border border-gray-200 dark:border-slate-700">
                <span class="font-bold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 truncate">
                    ${c.name}
                </span>
            </div>

            <div class="w-6 h-6 flex items-center justify-center opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-300 ${arrowRotation}" id="arrow-${c.id}"></i>
            </div>
            
            ${isContextActive ? '<div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1890ff] rounded-r-full group-hover/sidebar:opacity-0 transition-opacity"></div>' : ''}
        </div>

        <div id="submenu-${c.id}" style="display: ${submenuDisplay};" class="pl-4 mt-1 space-y-0.5 overflow-hidden group-hover/sidebar:block hidden transition-all">
            <div class="border-l-2 border-gray-100 dark:border-slate-800 ml-3 pl-2 py-1 space-y-1">
                ${_renderSubLink(c.id, 'inicio', 'Muro', 'fa-stream')}
                ${_renderSubLink(c.id, 'clases', 'Aula', 'fa-graduation-cap')}
                ${_renderSubLink(c.id, 'chat', 'Chat', 'fa-comments')}
                ${_renderSubLink(c.id, 'live', 'Live', 'fa-video', true)}
            </div>
        </div>
    </div>`;
}

function _renderSubLink(cid, tab, label, icon, isLive = false) {
    const currentHash = window.location.hash;
    const targetHash = `#community/${cid}/${tab}`;
    const isActive = currentHash === targetHash || (tab === 'inicio' && currentHash === `#community/${cid}`);
    
    const colorClass = isActive ? 'text-[#1890ff] font-bold bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/50';
    
    return `
    <a href="${targetHash}" class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${colorClass}">
        <i class="fas ${icon} w-4 text-center ${isActive ? 'text-[#1890ff]' : 'text-slate-400'} ${isLive?'text-red-500':''}"></i>
        <span>${label}</span>
        ${isLive ? '<span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse ml-auto"></span>' : ''}
    </a>`;
}

// --- LOGICA ---

App.sidebar.togglePin = () => {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const newState = !window.App.sidebarState.isPinned;
    window.App.sidebarState.isPinned = newState;
    localStorage.setItem('sidebar_pinned', newState);
    
    // Forzar re-render suave para actualizar clases del layout main si fuera necesario
    // Pero principalmente cambiamos clases del sidebar
    
    if (newState) {
        sb.classList.remove('w-[72px]', 'hover:w-[260px]'); sb.classList.add('w-[260px]');
        document.body.classList.add('sidebar-is-pinned');
        
        // Actualizar icono
        const icon = document.getElementById('pin-icon-i');
        if(icon) { icon.classList.add('text-[#1890ff]'); icon.classList.remove('text-slate-400'); }
    } else {
        sb.classList.add('w-[72px]', 'hover:w-[260px]'); sb.classList.remove('w-[260px]');
        document.body.classList.remove('sidebar-is-pinned');
        
        // Actualizar icono
        const icon = document.getElementById('pin-icon-i');
        if(icon) { icon.classList.remove('text-[#1890ff]'); icon.classList.add('text-slate-400'); }
    }
};

App.sidebar.toggleSubmenu = (id) => {
    const index = window.App.sidebarState.openMenus.indexOf(id);
    const isOpen = index > -1;
    if (isOpen) {
        window.App.sidebarState.openMenus.splice(index, 1);
        document.getElementById(`submenu-${id}`).style.display = 'none';
        document.getElementById(`arrow-${id}`).classList.remove('rotate-180');
    } else {
        window.App.sidebarState.openMenus.push(id);
        document.getElementById(`submenu-${id}`).style.display = 'block';
        document.getElementById(`arrow-${id}`).classList.add('rotate-180');
    }
    localStorage.setItem('sidebar_open_menus', JSON.stringify(window.App.sidebarState.openMenus));
};

App.sidebar.handleThemeToggle = () => {
    App.toggleTheme();
    const isDark = document.body.classList.contains('dark-mode');
    const icon = document.getElementById('sidebar-theme-icon');
    const label = document.getElementById('sidebar-theme-label');
    
    if (icon) {
        icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun text-yellow-400';
    }
    if (label) {
        label.innerText = isDark ? 'Modo Noche' : 'Modo Día';
    }
};