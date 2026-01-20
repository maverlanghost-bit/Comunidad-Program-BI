﻿﻿﻿/**
 * components.sidebar.js (V60.0 - DELETE CHAT FEATURE)
 * Componente de Barra Lateral Global.
 * * * CAMBIOS V60.0:
 * - ADDED: Botón de eliminar (papelera) en el historial de IA.
 * - ACTION: Conectado a 'App.ai.requestDelete' para confirmación modal.
 */

window.App = window.App || {};
window.App.sidebar = window.App.sidebar || {};

// ============================================================================
// 1. GESTOR DE ESTADO & LÓGICA
// ============================================================================
const SidebarManager = {
    state: {
        openMenus: JSON.parse(localStorage.getItem('sidebar_open_menus') || '[]'),
        isPinned: localStorage.getItem('sidebar_pinned') === 'true'
    },

    init() {
        try {
            if (this.state.isPinned) document.body.classList.add('sidebar-is-pinned');
            else document.body.classList.remove('sidebar-is-pinned');
            
            if (!window._sidebarEventsInitialized) {
                this.attachGlobalListeners();
                window._sidebarEventsInitialized = true;
            }
        } catch (error) {
            console.error('SidebarManager: Error durante inicialización', error);
        }
    },

    // --- ACCIONES ---
    togglePin(btnElement) {
        const sb = document.getElementById('sidebar');
        if (!sb) return;

        const newState = !this.state.isPinned;
        this.state.isPinned = newState;
        localStorage.setItem('sidebar_pinned', newState);

        // Animación y clases de estado
        if (newState) {
            sb.classList.remove('w-[80px]', 'hover:w-[280px]');
            sb.classList.add('w-[280px]');
            document.body.classList.add('sidebar-is-pinned');
            
            if (btnElement) {
                btnElement.classList.remove('opacity-0', 'text-slate-400');
                btnElement.classList.add('text-blue-600', 'bg-blue-50', 'dark:text-blue-400', 'dark:bg-blue-900/20', 'opacity-100');
            }
        } else {
            sb.classList.remove('w-[280px]');
            sb.classList.add('w-[80px]', 'hover:w-[280px]');
            document.body.classList.remove('sidebar-is-pinned');
            
            if (btnElement) {
                btnElement.classList.add('opacity-0', 'text-slate-400');
                btnElement.classList.remove('text-blue-600', 'bg-blue-50', 'dark:text-blue-400', 'dark:bg-blue-900/20', 'opacity-100');
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
            // CERRAR
            this.state.openMenus.splice(index, 1);
            submenu.style.display = 'none'; 
            arrow.classList.remove('rotate-180');
        } else {
            // ABRIR
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
            
            if (icon) icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun text-amber-400';
            if (label) label.innerText = isDark ? 'Modo Noche' : 'Modo Día';
        }
    },

    attachGlobalListeners() {
        document.addEventListener('click', (e) => {
            const pinBtn = e.target.closest('[data-sidebar-action="pin"]');
            if (pinBtn) { e.stopPropagation(); this.togglePin(pinBtn); return; }

            const menuToggle = e.target.closest('[data-sidebar-action="toggle-menu"]');
            if (menuToggle) { 
                e.stopPropagation(); 
                e.preventDefault(); 
                const id = menuToggle.getAttribute('data-id'); 
                if (id) this.toggleSubmenu(id); 
                return; 
            }

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
    const isAIMode = activeId === 'ai';

    const sidebarClasses = isPinned ? 'w-[280px]' : 'w-[80px] hover:w-[280px]';
    
    // Estilos dinámicos para el botón PIN
    const pinIconClass = isPinned 
        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 opacity-100' 
        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover/sidebar:opacity-100';
    
    const isDark = App.state.theme === 'dark';
    const themeIconClass = isDark ? 'fa-moon text-slate-400' : 'fa-sun text-amber-400';
    const themeLabelText = isDark ? 'Modo Noche' : 'Modo Día';

    return `
    <aside id="sidebar" class="fixed top-0 left-0 h-full bg-white dark:bg-[#0f172a] border-r border-slate-100 dark:border-slate-800/60 z-[60] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${sidebarClasses} group/sidebar shadow-sm font-sans">
        
        <!-- HEADER -->
        <div class="h-[80px] flex items-center px-5 shrink-0 relative justify-between overflow-hidden">
            <div class="flex items-center gap-4 cursor-pointer group/logo" onclick="window.location.hash='#feed'">
                <div class="w-10 h-10 bg-blue-600/10 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl transition-transform group-hover/logo:scale-105 shrink-0 relative z-10">
                    <i class="fas fa-code"></i>
                </div>
                <div class="flex flex-col opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100">
                    <span class="font-bold text-lg text-slate-800 dark:text-white leading-tight tracking-tight">
                        ProgramBI
                    </span>
                    <span class="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Academy</span>
                </div>
            </div>
            
            <button data-sidebar-action="pin" id="pin-btn" class="w-8 h-8 rounded-full flex items-center justify-center transition-all absolute right-4 ${pinIconClass} z-20 hover:scale-110" title="${isPinned ? 'Desfijar menú' : 'Fijar menú'}">
                <i class="fas fa-thumbtack text-xs" id="pin-icon-i"></i>
            </button>
        </div>

        <!-- CONTENIDO SCROLLEABLE -->
        <nav class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-4 flex flex-col gap-2 px-4" aria-label="Navegación Principal">
            
            <!-- NAV PRINCIPAL CON COLORES AL HOVER -->
            ${_renderNavItem('feed', 'Mi Feed', 'fa-home', activeId === 'feed', 'text-slate-400 group-hover/item:text-blue-500')}
            ${_renderNavItem('chat', 'Comunidad', 'fa-users', activeId === 'chat', 'text-slate-400 group-hover/item:text-emerald-500')} 
            
            <!-- ITEM IA DESTACADO CON SVG GEMINI -->
            ${_renderNavItemAI(activeId === 'ai')}
            
            ${_renderNavItem('discovery', 'Explorar', 'fa-compass', activeId === 'discovery', 'text-slate-400 group-hover/item:text-amber-500')}

            <!-- ADMIN -->
            ${user.role === 'admin' ? `
                <div class="my-2 h-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                ${_renderNavItem('admin', 'Admin Panel', 'fa-shield-alt', activeId === 'admin', 'text-slate-400 group-hover/item:text-rose-500')}
            ` : ''}

            <div class="my-4 h-px bg-slate-100 dark:bg-slate-800 mx-2"></div>

            <!-- SECCIÓN CONTEXTUAL (IA vs COMUNIDADES) -->
            ${isAIMode ? _renderAIHistorySection() : _renderCommunitiesSection(user, activeId)}

        </nav>

        <!-- FOOTER -->
        <div class="p-4 shrink-0 bg-white dark:bg-[#0f172a]">
            <button data-sidebar-action="theme" class="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 transition-colors group/theme overflow-hidden whitespace-nowrap mb-1">
                <div class="w-6 flex justify-center shrink-0 transition-colors"><i id="sidebar-theme-icon" class="fas ${themeIconClass}"></i></div>
                <span class="font-medium text-sm opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200" id="sidebar-theme-label">${themeLabelText}</span>
            </button>
            <button onclick="App.api.logout()" class="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 text-slate-500 hover:text-rose-500 transition-colors overflow-hidden whitespace-nowrap">
                <div class="w-6 flex justify-center shrink-0"><i class="fas fa-sign-out-alt"></i></div>
                <span class="font-medium text-sm opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Cerrar Sesión</span>
            </button>
        </div>
    </aside>`;
};

// ============================================================================
// 3. HELPERS DE RENDERIZADO
// ============================================================================

function _renderNavItem(id, label, icon, isActive, iconColorClasses = '') {
    const defaultColor = 'text-slate-400 group-hover/item:text-slate-600 dark:group-hover/item:text-slate-300';
    const colorClasses = iconColorClasses || defaultColor;

    const activeClasses = 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold';
    const inactiveClasses = 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white font-medium';
    
    const finalClass = isActive ? activeClasses : inactiveClasses;
    const finalIconColor = isActive ? 'text-blue-600 dark:text-blue-400' : colorClasses;
    const href = `#${id}`;

    return `
    <a href="${href}" class="flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ${finalClass} overflow-hidden group/item relative select-none">
        <div class="w-6 flex justify-center shrink-0 text-lg transition-colors ${finalIconColor}">
            <i class="fas ${icon}"></i>
        </div>
        <span class="text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75 origin-left">${label}</span>
    </a>`;
}

function _renderNavItemAI(isActive) {
    const activeClasses = 'bg-fuchsia-50 dark:bg-fuchsia-500/10 shadow-sm';
    const inactiveClasses = 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
    
    const containerClass = isActive ? activeClasses : inactiveClasses;
    
    const gradientText = 'bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent';
    const normalText = 'text-slate-500 dark:text-slate-400 group-hover/item:text-slate-900 dark:group-hover/item:text-white';
    
    const iconColor = isActive ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-400 group-hover/item:text-fuchsia-500';

    return `
    <a href="#ai" class="flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ${containerClass} overflow-hidden group/item relative select-none">
        <div class="w-6 flex justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 transition-colors ${iconColor}">
                <path d="M12 3C12 3 14 9 16 11C18 13 22 13 22 13C22 13 18 13 16 15C14 17 12 23 12 23C12 23 10 17 8 15C6 13 2 13 2 13C2 13 6 13 8 11C10 9 12 3 12 3Z" />
                <path d="M19 16C19 16 20 18 20.5 19C21 20 23 20 23 20C23 20 21 20 20.5 21C20 22 19 24 19 24C19 24 18 22 17.5 21C17 20 15 20 15 20C15 20 17 20 17.5 19C18 18 19 16 19 16Z" />
            </svg>
        </div>
        <span class="text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75 font-bold ${isActive ? gradientText : normalText}">
            Asistente IA
        </span>
    </a>`;
}

function _renderAIHistorySection() {
    // Asegurar que existe el cache
    const history = (window.App.state && window.App.state.cache) ? window.App.state.cache.aiConversations : null;
    const isLoading = history === null; 

    return `
    <div class="px-2 flex justify-between items-center group-hover/sidebar:opacity-100 opacity-0 transition-opacity duration-200 mb-2 whitespace-nowrap overflow-hidden">
        <span class="text-[10px] font-bold text-violet-500 uppercase tracking-wider flex items-center gap-2 pl-2">
            <i class="fas fa-history"></i> Recientes
        </span>
    </div>

    <button onclick="App.ai.newChat()" class="w-full flex items-center gap-3 p-3 mb-3 rounded-2xl border border-dashed border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors group/newchat overflow-hidden mx-auto">
        <div class="w-6 flex justify-center shrink-0"><i class="fas fa-plus"></i></div>
        <span class="font-bold text-xs whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Nueva Conversación</span>
    </button>

    <div class="space-y-1 overflow-y-auto max-h-[300px] custom-scrollbar px-1">
        ${isLoading ? `
            <div class="p-2 space-y-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4 animate-pulse"></div>
                <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2 animate-pulse"></div>
            </div>
        ` : (history.length === 0 ? `
            <div class="text-center p-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                <p class="text-[11px] text-slate-400">Tu historial aparecerá aquí</p>
            </div>
        ` : history.map(chat => `
            <div class="group/chat-item relative">
                <a href="#ai/${chat.id}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-colors group/item pr-8">
                    <i class="far fa-message w-4 text-center shrink-0 text-slate-300 group-hover/item:text-violet-400 text-[10px]"></i>
                    <span class="truncate opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 flex-1">${chat.title || 'Conversación sin título'}</span>
                </a>
                
                <!-- BOTÓN ELIMINAR (Solo visible al hover del item y sidebar expandido) -->
                <button onclick="App.ai.requestDelete(event, '${chat.id}')" class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover/chat-item:opacity-100 group-hover/sidebar:opacity-100" title="Eliminar">
                    <i class="fas fa-trash text-[10px]"></i>
                </button>
            </div>
        `).join(''))}
    </div>
    `;
}

function _renderCommunitiesSection(user, activeId) {
    const list = user.joinedCommunities || [];
    return `
    <div class="px-2 flex justify-between items-center group-hover/sidebar:opacity-100 opacity-0 transition-opacity duration-200 mb-2 whitespace-nowrap overflow-hidden">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">Mis Espacios</span>
        ${list.length > 0 ? `<span class="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">${list.length}</span>` : ''}
    </div>

    <div class="space-y-1">
        ${list.map(cid => {
            const c = (window.App.state && window.App.state.cache && window.App.state.cache.communities) ? window.App.state.cache.communities[cid] : null;
            if (!c) return ''; 
            const isOpen = SidebarManager.state.openMenus.includes(cid) || activeId === cid || window.location.hash.includes(`/${cid}/`);
            return _renderCommunityDropdown(c, activeId, isOpen);
        }).join('')}
    </div>

    ${list.length === 0 ? `
        <div class="text-center p-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
            <p class="text-[11px] text-slate-400 mb-2">Aún no sigues comunidades</p>
            <button onclick="window.location.hash='#discovery'" class="text-[11px] font-bold text-blue-500 hover:underline">Explorar catálogo</button>
        </div>
    ` : ''}
    `;
}

function _renderCommunityDropdown(c, activeId, isOpen) {
    const isContextActive = activeId === c.id || window.location.hash.includes(`/${c.id}/`);
    const headerClass = isContextActive 
        ? 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white';
    
    const displayStyle = isOpen ? 'block' : 'none';
    const rotateClass = isOpen ? 'rotate-180' : '';

    return `
    <div class="mb-1">
        <div class="flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${headerClass} group/comm relative select-none"
             data-sidebar-action="toggle-menu" data-id="${c.id}">
            <div class="flex items-center gap-3 overflow-hidden">
                <img src="${c.icon || ''}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&size=64'" class="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-slate-800">
                <span class="font-medium text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 truncate">${c.name}</span>
            </div>
            <div class="w-6 h-6 flex items-center justify-center opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-300 ${rotateClass} opacity-60" id="arrow-${c.id}"></i>
            </div>
        </div>
        
        <div id="submenu-${c.id}" style="display: ${displayStyle};" class="pl-11 mt-1 space-y-1 overflow-hidden group-hover/sidebar:block hidden transition-all">
            ${_renderSubLink(c.id, 'inicio', 'Muro', 'fa-stream')}
            ${_renderSubLink(c.id, 'clases', 'Aula', 'fa-graduation-cap')}
            ${_renderSubLink(c.id, 'live', 'Live', 'fa-video', true)}
        </div>
    </div>`;
}

function _renderSubLink(cid, tab, label, icon, isLive = false) {
    const isActive = window.location.hash === `#community/${cid}/${tab}` || (tab === 'inicio' && window.location.hash === `#community/${cid}`);
    const colorClass = isActive 
        ? 'text-blue-600 dark:text-blue-400 font-bold' 
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        
    return `
    <a href="#comunidades/${cid}/${tab}" class="flex items-center gap-3 py-1.5 rounded-lg text-xs transition-colors ${colorClass}">
        <i class="fas ${icon} w-3 text-center ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300'} ${isLive?'text-rose-500 animate-pulse':''}"></i>
        <span>${label}</span>
    </a>`;
}