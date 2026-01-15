/**
 * components.sidebar.js (V58.0 - CONTEXT AWARE AI)
 * Componente de Barra Lateral Global e Inteligente.
 * * CAMBIOS V58.0:
 * - CONTEXTO IA: Si la ruta es '#ai', reemplaza comunidades por Historial de Chats.
 * - NEW CHAT: Botón de acción rápida para iniciar nueva conversación.
 * - HISTORY LIST: Renderizado de conversaciones previas desde caché.
 */

window.App = window.App || {};
window.App.sidebar = window.App.sidebar || {};

// ============================================================================
// 1. GESTOR DE ESTADO & LOGICA
// ============================================================================
const SidebarManager = {
    state: {
        openMenus: JSON.parse(localStorage.getItem('sidebar_open_menus') || '[]'),
        isPinned: localStorage.getItem('sidebar_pinned') === 'true'
    },

    init() {
        if (this.state.isPinned) document.body.classList.add('sidebar-is-pinned');
        else document.body.classList.remove('sidebar-is-pinned');
        
        if (!window._sidebarEventsInitialized) {
            this.attachGlobalListeners();
            window._sidebarEventsInitialized = true;
        }
    },

    // --- ACCIONES ---
    togglePin(btnElement) {
        const sb = document.getElementById('sidebar');
        if (!sb) return;

        const newState = !this.state.isPinned;
        this.state.isPinned = newState;
        localStorage.setItem('sidebar_pinned', newState);

        if (newState) {
            sb.classList.remove('w-[72px]', 'hover:w-[260px]');
            sb.classList.add('w-[260px]');
            document.body.classList.add('sidebar-is-pinned');
            
            if (btnElement) {
                btnElement.classList.remove('opacity-0', 'group-hover/sidebar:opacity-100', 'text-slate-400');
                btnElement.classList.add('text-[#1890ff]', 'bg-blue-50', 'dark:bg-blue-900/20', 'opacity-100');
                const icon = btnElement.querySelector('i');
                if(icon) icon.classList.add('-rotate-45');
            }
        } else {
            sb.classList.remove('w-[260px]');
            sb.classList.add('w-[72px]', 'hover:w-[260px]');
            document.body.classList.remove('sidebar-is-pinned');
            
            if (btnElement) {
                btnElement.classList.add('opacity-0', 'group-hover/sidebar:opacity-100', 'text-slate-400');
                btnElement.classList.remove('text-[#1890ff]', 'bg-blue-50', 'dark:bg-blue-900/20', 'opacity-100');
                const icon = btnElement.querySelector('i');
                if(icon) icon.classList.remove('-rotate-45');
            }
        }
    },

    toggleSubmenu(id) {
        const submenu = document.getElementById(`submenu-${id}`);
        const arrow = document.getElementById(`arrow-${id}`);
        if (!submenu || !arrow) return;

        const index = this.state.openMenus.indexOf(id);
        const isOpen = index > -1;

        if (isOpen) {
            this.state.openMenus.splice(index, 1);
            submenu.style.display = 'none';
            arrow.classList.remove('rotate-180');
        } else {
            this.state.openMenus.push(id);
            submenu.style.display = 'block';
            arrow.classList.add('rotate-180');
        }
        localStorage.setItem('sidebar_open_menus', JSON.stringify(this.state.openMenus));
    },

    toggleTheme() {
        if (window.App && window.App.toggleTheme) {
            window.App.toggleTheme();
            const isDark = document.body.classList.contains('dark-mode');
            const icon = document.getElementById('sidebar-theme-icon');
            const label = document.getElementById('sidebar-theme-label');
            if (icon) icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun text-yellow-400';
            if (label) label.innerText = isDark ? 'Modo Noche' : 'Modo Día';
        }
    },

    attachGlobalListeners() {
        document.addEventListener('click', (e) => {
            const pinBtn = e.target.closest('[data-sidebar-action="pin"]');
            if (pinBtn) { e.stopPropagation(); this.togglePin(pinBtn); return; }

            const menuToggle = e.target.closest('[data-sidebar-action="toggle-menu"]');
            if (menuToggle) { e.stopPropagation(); e.preventDefault(); const id = menuToggle.getAttribute('data-id'); if (id) this.toggleSubmenu(id); return; }

            const themeBtn = e.target.closest('[data-sidebar-action="theme"]');
            if (themeBtn) { this.toggleTheme(); return; }
        });
    }
};

SidebarManager.init();

// ============================================================================
// 2. RENDERIZADO PRINCIPAL
// ============================================================================

window.App.sidebar.render = (activeId = 'feed') => {
    const user = App.state.currentUser;
    if (!user) return '';

    const isPinned = SidebarManager.state.isPinned;
    const isAIMode = activeId === 'ai'; // DETECCIÓN DE CONTEXTO IA

    const sidebarClasses = isPinned ? 'w-[260px]' : 'w-[72px] hover:w-[260px]';
    const pinIconClass = isPinned ? 'text-[#1890ff] bg-blue-50 dark:bg-blue-900/20 opacity-100' : 'text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 opacity-0 group-hover/sidebar:opacity-100';
    const isDark = App.state.theme === 'dark';
    const themeIconClass = isDark ? 'fa-moon text-slate-400' : 'fa-sun text-yellow-400';
    const themeLabelText = isDark ? 'Modo Noche' : 'Modo Día';

    return `
    <aside id="sidebar" class="fixed top-0 left-0 h-full bg-white dark:bg-[#0f172a] border-r border-gray-200 dark:border-slate-800 z-[60] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarClasses} group/sidebar shadow-2xl overflow-visible">
        
        <!-- HEADER -->
        <div class="h-[72px] flex items-center px-4 border-b border-gray-100 dark:border-slate-800 shrink-0 relative justify-between overflow-hidden">
            <div class="flex items-center gap-3 cursor-pointer" onclick="window.location.hash='#feed'">
                <div class="w-10 h-10 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/30 shrink-0 relative z-10">
                    <i class="fas fa-code"></i>
                </div>
                <span class="font-heading font-black text-xl text-slate-900 dark:text-white tracking-tight whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75">
                    ProgramBI
                </span>
            </div>
            <button data-sidebar-action="pin" id="pin-btn" class="w-8 h-8 rounded-lg flex items-center justify-center transition-all absolute right-3 ${pinIconClass} z-20" title="${isPinned ? 'Desfijar menú' : 'Fijar menú'}">
                <i class="fas fa-thumbtack text-xs transition-transform ${isPinned ? '-rotate-45' : ''}" id="pin-icon-i"></i>
            </button>
        </div>

        <!-- CONTENIDO SCROLLEABLE -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6 flex flex-col gap-1 px-3">
            
            <!-- NAV PRINCIPAL -->
            ${_renderNavItem('feed', 'Mi Feed', 'fa-home', activeId === 'feed')}
            ${_renderNavItem('chat', 'Comunidad', 'fa-users', activeId === 'chat', 'text-green-500')} 
            ${_renderNavItem('ai', 'Asistente IA', 'fa-brain', activeId === 'ai', 'text-purple-500')}
            ${_renderNavItem('discovery', 'Explorar', 'fa-compass', activeId === 'discovery')}

            <!-- ADMIN -->
            ${user.role === 'admin' ? `
                <div class="my-2 border-t border-gray-100 dark:border-slate-800 mx-2"></div>
                ${_renderNavItem('admin', 'Admin Panel', 'fa-shield-alt', activeId === 'admin', 'text-orange-500')}
            ` : ''}

            <div class="my-3 border-t border-gray-100 dark:border-slate-800 mx-2"></div>

            <!-- SECCIÓN CONTEXTUAL (IA vs COMUNIDADES) -->
            ${isAIMode ? _renderAIHistorySection() : _renderCommunitiesSection(user, activeId)}

        </div>

        <!-- FOOTER -->
        <div class="p-3 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-[#0f172a]">
            <button data-sidebar-action="theme" class="w-full flex items-center gap-4 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors group/theme overflow-hidden whitespace-nowrap">
                <div class="w-6 flex justify-center shrink-0 transition-colors"><i id="sidebar-theme-icon" class="fas ${themeIconClass}"></i></div>
                <span class="font-medium text-sm opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200" id="sidebar-theme-label">${themeLabelText}</span>
            </button>
            <button onclick="App.api.logout()" class="w-full flex items-center gap-4 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors mt-1 overflow-hidden whitespace-nowrap">
                <div class="w-6 flex justify-center shrink-0"><i class="fas fa-sign-out-alt"></i></div>
                <span class="font-medium text-sm opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Cerrar Sesión</span>
            </button>
        </div>
    </aside>`;
};

// ============================================================================
// 3. HELPERS DE RENDERIZADO
// ============================================================================

function _renderAIHistorySection() {
    // Verificar si hay datos en caché (cargados por ai.views.js)
    const history = App.state.cache.aiConversations;
    const isLoading = history === null; 

    return `
    <div class="px-3 flex justify-between items-center group-hover/sidebar:opacity-100 opacity-0 transition-opacity duration-200 mb-2 whitespace-nowrap overflow-hidden">
        <span class="text-[10px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-2"><i class="fas fa-history"></i> Historial</span>
    </div>

    <!-- Botón Nuevo Chat -->
    <button onclick="App.ai.newChat()" class="w-full flex items-center gap-3 p-2.5 mb-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors group/newchat overflow-hidden border border-purple-100 dark:border-purple-800">
        <div class="w-6 flex justify-center shrink-0"><i class="fas fa-plus"></i></div>
        <span class="font-bold text-xs whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Nuevo Chat</span>
    </button>

    <div class="space-y-1">
        ${isLoading ? `
            <div class="p-2 space-y-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-3/4 animate-pulse"></div>
                <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/2 animate-pulse"></div>
            </div>
        ` : (history.length === 0 ? `
            <div class="text-center p-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                <p class="text-[10px] text-slate-400">Sin historial reciente</p>
            </div>
        ` : history.map(chat => `
            <a href="#ai/${chat.id}" class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors group/item">
                <i class="far fa-message w-4 text-center shrink-0 text-slate-400 group-hover/item:text-purple-500"></i>
                <span class="truncate opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">${chat.title || 'Conversación'}</span>
            </a>
        `).join(''))}
    </div>
    `;
}

function _renderCommunitiesSection(user, activeId) {
    const list = user.joinedCommunities || [];
    return `
    <div class="px-3 flex justify-between items-center group-hover/sidebar:opacity-100 opacity-0 transition-opacity duration-200 mb-2 whitespace-nowrap overflow-hidden">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mis Espacios</span>
        <span class="text-[10px] font-bold text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">${list.length}</span>
    </div>

    <div class="space-y-1">
        ${list.map(cid => {
            const c = App.state.cache.communities[cid];
            if (!c) return ''; 
            const isOpen = SidebarManager.state.openMenus.includes(cid) || activeId === cid || window.location.hash.includes(`/${cid}/`);
            return _renderCommunityDropdown(c, activeId, isOpen);
        }).join('')}
    </div>

    ${list.length === 0 ? `
        <div class="text-center p-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
            <p class="text-xs text-slate-400 mb-2">Sin comunidades</p>
            <button onclick="window.location.hash='#discovery'" class="text-xs font-bold text-[#1890ff] hover:underline">Explorar ahora</button>
        </div>
    ` : ''}
    `;
}

function _renderNavItem(id, label, icon, isActive, iconColorClass = '') {
    const bgClass = isActive 
        ? 'bg-[#1890ff] text-white shadow-lg shadow-blue-500/30' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-[#1890ff]';
    const finalIconColor = isActive ? 'text-white' : (iconColorClass || '');
    const href = `#${id}`;

    return `
    <a href="${href}" class="flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${bgClass} overflow-hidden group/item relative">
        <div class="w-6 flex justify-center shrink-0 text-lg ${finalIconColor}"><i class="fas ${icon}"></i></div>
        <span class="font-bold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75">${label}</span>
        ${isActive ? '<div class="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/20 rounded-l-full"></div>' : ''}
    </a>`;
}

function _renderCommunityDropdown(c, activeId, isOpen) {
    const isContextActive = activeId === c.id || window.location.hash.includes(`/${c.id}/`);
    const headerClass = isContextActive 
        ? 'bg-blue-50 dark:bg-blue-900/10 text-[#1890ff]' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white';
    
    const displayStyle = isOpen ? 'block' : 'none';
    const rotateClass = isOpen ? 'rotate-180' : '';

    return `
    <div class="mb-1">
        <div class="flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${headerClass} group/comm relative select-none"
             data-sidebar-action="toggle-menu" data-id="${c.id}">
            <div class="flex items-center gap-3 overflow-hidden">
                <img src="${c.icon || ''}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random'" class="w-8 h-8 rounded-lg object-cover shrink-0 bg-gray-200 border border-gray-200 dark:border-slate-700">
                <span class="font-bold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 truncate">${c.name}</span>
            </div>
            <div class="w-6 h-6 flex items-center justify-center opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-300 ${rotateClass}" id="arrow-${c.id}"></i>
            </div>
            ${isContextActive ? '<div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1890ff] rounded-r-full group-hover/sidebar:opacity-0 transition-opacity"></div>' : ''}
        </div>
        <div id="submenu-${c.id}" style="display: ${displayStyle};" class="pl-4 mt-1 space-y-0.5 overflow-hidden group-hover/sidebar:block hidden transition-all">
            <div class="border-l-2 border-gray-100 dark:border-slate-800 ml-3 pl-2 py-1 space-y-1">
                ${_renderSubLink(c.id, 'inicio', 'Muro', 'fa-stream')}
                ${_renderSubLink(c.id, 'clases', 'Aula', 'fa-graduation-cap')}
                ${_renderSubLink(c.id, 'live', 'Live', 'fa-video', true)}
            </div>
        </div>
    </div>`;
}

function _renderSubLink(cid, tab, label, icon, isLive = false) {
    const isActive = window.location.hash === `#community/${cid}/${tab}` || (tab === 'inicio' && window.location.hash === `#community/${cid}`);
    const colorClass = isActive ? 'text-[#1890ff] font-bold bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/50';
    return `
    <a href="#comunidades/${cid}/${tab}" class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${colorClass}">
        <i class="fas ${icon} w-4 text-center ${isActive ? 'text-[#1890ff]' : 'text-slate-400'} ${isLive?'text-red-500':''}"></i>
        <span>${label}</span>
        ${isLive ? '<span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse ml-auto"></span>' : ''}
    </a>`;
}