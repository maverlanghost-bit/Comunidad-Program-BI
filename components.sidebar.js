﻿/**
* components.sidebar.js (V64.3 - UX POLISH)
* Componente de Barra Lateral Global con Modales de Configuración Premium.
* * CAMBIOS V64.3:
* - FIX UX: El botón Pin ahora se oculta en modo colapsado para no estorbar.
* - FIX UX: La barra ya no se cierra bruscamente al interactuar con menús.
* - REFACTOR: Dependencia total de CSS hover para interacciones fluidas.
*/

window.App = window.App || {};
window.App.sidebar = window.App.sidebar || {};

// ============================================================================
// 1. GESTOR DE ESTADO & LÓGICA INTERNA
// ============================================================================
const SidebarManager = {
    state: {
        openMenus: JSON.parse(localStorage.getItem('sidebar_open_menus') || '[]'),
        isPinned: localStorage.getItem('sidebar_pinned') === 'true',
        isUserMenuOpen: false,
        tempAvatarFile: null, // Para previsualización

    },

    init() {
        try {
            this.applyPinState();
            this.injectGlobalModals();

            if (!window._sidebarEventsInitialized) {
                this.attachGlobalListeners();
                window.addEventListener('app:ai-history-updated', () => this.refresh());
                document.addEventListener('click', (e) => this.handleClickOutside(e));
                window._sidebarEventsInitialized = true;
            }
        } catch (error) {
            console.error('SidebarManager: Error init', error);
        }
    },

    // --- RENDERIZADO DE MODALES (HTML INYECTION) ---
    injectGlobalModals() {
        if (document.getElementById('sidebar-modals-root')) return;

        const root = document.createElement('div');
        root.id = 'sidebar-modals-root';
        root.innerHTML = `
            <!-- MODAL: CAMBIAR NOMBRE -->
            <div id="modal-edit-name" class="fixed inset-0 z-[100] hidden flex items-center justify-center">
                <!-- Backdrop Blur -->
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="modal-name-backdrop" onclick="App.sidebar.closeModals()"></div>
                
                <!-- Card Content -->
                <div class="relative bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 p-6 transform scale-90 opacity-0 transition-all duration-300" id="modal-name-card">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                            <i class="fas fa-user-edit"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 dark:text-white">Editar Identidad</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400">¿Cómo quieres que te llamemos?</p>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="relative">
                            <i class="fas fa-pen absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="text" id="input-new-name" class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-bold text-slate-700 dark:text-white" placeholder="Tu nuevo nombre">
                        </div>
                        
                        <div class="flex gap-3">
                            <button onclick="App.sidebar.closeModals()" class="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                            <button onclick="App.sidebar.confirmChangeName()" class="flex-1 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/30 transition-all active:scale-95">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL: SUBIR FOTO (PREVIEW) -->
            <div id="modal-upload-avatar" class="fixed inset-0 z-[100] hidden flex items-center justify-center">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="modal-avatar-backdrop" onclick="App.sidebar.closeModals()"></div>
                
                <div class="relative bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 p-6 transform scale-90 opacity-0 transition-all duration-300" id="modal-avatar-card">
                    <div class="text-center mb-6">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">Nueva Foto de Perfil</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Selecciona una imagen para mostrar.</p>
                    </div>

                    <div class="mb-6 flex justify-center">
                        <div class="relative group cursor-pointer" onclick="document.getElementById('modal-file-input').click()">
                            <div class="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-xl relative">
                                <img id="avatar-preview-img" src="" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i class="fas fa-camera text-white text-2xl"></i>
                                </div>
                            </div>
                            <div class="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-slate-800 shadow-md">
                                <i class="fas fa-plus text-xs"></i>
                            </div>
                        </div>
                        <input type="file" id="modal-file-input" class="hidden" accept="image/*" onchange="SidebarManager.handleFileSelect(this)">
                    </div>

                    <div class="flex gap-3">
                        <button onclick="App.sidebar.closeModals()" class="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                        <button onclick="App.sidebar.confirmUploadAvatar()" id="btn-save-avatar" class="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">Actualizar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(root);
    },

    // --- LÓGICA INTERNA DE ARCHIVOS ---
    handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            App.ui.toast("Imagen muy grande (Máx 2MB)", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.state.tempAvatarFile = e.target.result; // Base64 temporal
            document.getElementById('avatar-preview-img').src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    // --- GESTIÓN VISUAL BASICA ---
    applyPinState() {
        const sb = document.getElementById('sidebar');
        if (!sb) return;

        // FIX UX: Solo forzamos width si realmente está PINNED por el usuario.
        // Si no, dejamos que CSS hover haga su magia (evita snaps).
        if (this.state.isPinned) {
            sb.classList.remove('w-[80px]', 'hover:w-[280px]');
            sb.classList.add('w-[280px]');
            document.body.classList.add('sidebar-is-pinned');
        } else {
            sb.classList.remove('w-[280px]');
            sb.classList.add('w-[80px]', 'hover:w-[280px]');
            document.body.classList.remove('sidebar-is-pinned');
        }
        this.updatePinIcon();
    },

    updatePinIcon() {
        const btn = document.getElementById('pin-btn');
        if (!btn) return;

        if (this.state.isPinned) {
            // Visible y activo
            btn.classList.add('text-blue-600', 'bg-blue-50', 'dark:text-blue-400', 'dark:bg-blue-900/20', 'opacity-100');
            btn.classList.remove('text-slate-400', 'opacity-0', 'group-hover/sidebar:opacity-100');
        } else {
            // Invisible (salvo hover) e inactivo
            btn.classList.remove('text-blue-600', 'bg-blue-50', 'dark:text-blue-400', 'dark:bg-blue-900/20', 'opacity-100');
            btn.classList.add('text-slate-400', 'opacity-0', 'group-hover/sidebar:opacity-100');
        }
    },

    refresh() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.App.sidebar.render) {
            let activeId = 'feed';
            const currentHash = window.location.hash.replace('#', '') || 'feed';

            // Lógica robusta para determinar ID activo
            if (currentHash.includes('comunidades/')) {
                // Estamos en comunidad
                if (window.App.chat && window.App.chat.state && window.App.chat.state.activeChannelId) {
                    activeId = window.App.chat.state.activeChannelId;
                } else {
                    activeId = currentHash.split('/')[1]; // Default to community ID
                }
            } else {
                activeId = currentHash.split('/')[0] || 'feed';
            }

            const newContent = window.App.sidebar.render(activeId);
            sidebar.outerHTML = newContent;
            this.applyPinState();
        }
    },

    togglePin() {
        this.state.isPinned = !this.state.isPinned;
        localStorage.setItem('sidebar_pinned', this.state.isPinned);
        this.applyPinState();
        // No refrescar entero para evitar parpadeos, solo ajustes visuales si fuera necesario, 
        // pero sidebar.render usa isPinned, así que sí refrescamos.
        this.refresh();
    },

    toggleSubmenu(id) {
        const index = this.state.openMenus.indexOf(id);
        if (index > -1) this.state.openMenus.splice(index, 1);
        else this.state.openMenus.push(id);
        localStorage.setItem('sidebar_open_menus', JSON.stringify(this.state.openMenus));
        this.refresh();
    },

    toggleUserMenu() {
        this.state.isUserMenuOpen = !this.state.isUserMenuOpen;
        const menu = document.getElementById('user-popup-menu');
        const arrow = document.getElementById('user-menu-arrow');

        if (menu && arrow) {
            if (this.state.isUserMenuOpen) {
                menu.classList.remove('hidden', 'opacity-0', 'scale-95', 'translate-y-4');
                menu.classList.add('opacity-100', 'scale-100', 'translate-y-0');
                arrow.classList.add('rotate-180');
            } else {
                menu.classList.add('opacity-0', 'scale-95', 'translate-y-4');
                menu.classList.remove('opacity-100', 'scale-100', 'translate-y-0');
                arrow.classList.remove('rotate-180');
                setTimeout(() => { if (!this.state.isUserMenuOpen) menu.classList.add('hidden'); }, 200);
            }
            if (this.state.isUserMenuOpen) menu.classList.remove('hidden');
        }
    },

    toggleTheme() {
        if (window.App && window.App.toggleTheme) {
            window.App.toggleTheme();
            this.refresh();
        }
    },

    handleClickOutside(e) {
        const menu = document.getElementById('user-popup-menu');
        const btn = document.getElementById('user-profile-btn');
        if (this.state.isUserMenuOpen && menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
            this.toggleUserMenu();
        }
    },

    // --- LÓGICA DE CANALES (COMUNIDAD) ---


    attachGlobalListeners() {
        document.addEventListener('click', (e) => {
            const pinBtn = e.target.closest('[data-sidebar-action="pin"]');
            if (pinBtn) { e.stopPropagation(); this.togglePin(); return; }

            const menuToggle = e.target.closest('[data-sidebar-action="toggle-menu"]');
            if (menuToggle) { e.stopPropagation(); e.preventDefault(); const id = menuToggle.getAttribute('data-id'); if (id) this.toggleSubmenu(id); return; }

            const themeBtn = e.target.closest('[data-sidebar-action="theme"]');
            if (themeBtn) { this.toggleTheme(); return; }

            const userBtn = e.target.closest('[data-sidebar-action="user-menu"]');
            if (userBtn) { e.stopPropagation(); this.toggleUserMenu(); return; }


        });
    }
};

SidebarManager.init();

// ============================================================================
// 2. MÉTODOS PÚBLICOS
// ============================================================================

window.App.sidebar.openNameModal = () => {
    SidebarManager.toggleUserMenu();
    const modal = document.getElementById('modal-edit-name');
    const card = document.getElementById('modal-name-card');
    const backdrop = document.getElementById('modal-name-backdrop');
    const input = document.getElementById('input-new-name');

    if (App.state.currentUser) input.value = App.state.currentUser.name || '';

    modal.classList.remove('hidden');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        card.classList.remove('opacity-0', 'scale-90');
        card.classList.add('opacity-100', 'scale-100');
        input.focus();
    }, 10);
};

window.App.sidebar.confirmChangeName = async () => {
    const newName = document.getElementById('input-new-name').value.trim();
    if (!newName) return App.ui.toast("El nombre no puede estar vacío", "warning");

    try {
        await App.api.updateProfile(App.state.currentUser.uid, { name: newName });
        App.ui.toast("Nombre actualizado", "success");
        SidebarManager.refresh();
        App.sidebar.closeModals();
    } catch (e) { App.ui.toast("Error al guardar", "error"); }
};

window.App.sidebar.openAvatarModal = () => {
    SidebarManager.toggleUserMenu();
    SidebarManager.state.tempAvatarFile = null;

    const modal = document.getElementById('modal-upload-avatar');
    const card = document.getElementById('modal-avatar-card');
    const backdrop = document.getElementById('modal-avatar-backdrop');
    const img = document.getElementById('avatar-preview-img');

    img.src = App.state.currentUser?.avatar || 'https://ui-avatars.com/api/?background=random';

    modal.classList.remove('hidden');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        card.classList.remove('opacity-0', 'scale-90');
        card.classList.add('opacity-100', 'scale-100');
    }, 10);
};

window.App.sidebar.confirmUploadAvatar = async () => {
    if (!SidebarManager.state.tempAvatarFile) return App.ui.toast("Selecciona una imagen primero", "warning");

    const btn = document.getElementById('btn-save-avatar');
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        await App.api.updateProfile(App.state.currentUser.uid, { avatar: SidebarManager.state.tempAvatarFile });
        App.ui.toast("Foto actualizada", "success");
        SidebarManager.refresh();
        App.sidebar.closeModals();
    } catch (e) {
        App.ui.toast("Error al subir", "error");
    } finally {
        btn.innerHTML = 'Actualizar';
        btn.disabled = false;
    }
};

window.App.sidebar.closeModals = () => {
    const modals = ['modal-edit-name', 'modal-upload-avatar'];
    modals.forEach(id => {
        const m = document.getElementById(id);
        const card = m.querySelector('div[id$="-card"]');
        const backdrop = m.querySelector('div[id$="-backdrop"]');

        if (!m.classList.contains('hidden')) {
            card.classList.remove('opacity-100', 'scale-100');
            card.classList.add('opacity-0', 'scale-90');
            backdrop.classList.add('opacity-0');
            setTimeout(() => m.classList.add('hidden'), 300);
        }
    });
};

// ============================================================================
// 3. RENDERIZADO PRINCIPAL
// ============================================================================

window.App.sidebar.render = (activeId = 'feed') => {
    if (!App.state || !App.state.currentUser) return '';
    const user = App.state.currentUser;

    // FIX: La clase width ahora solo depende de 'isPinned'.
    // Si no está pinned, es 'hover:w-[280px]', lo que permite que el mouse mantenga abierto el menú.
    const isPinned = SidebarManager.state.isPinned;
    const sidebarClasses = isPinned ? 'w-[280px]' : 'w-[80px] hover:w-[280px]';

    const isAIMode = activeId === 'ai' || activeId.startsWith('ai/');
    const isDark = App.state.theme === 'dark';
    const themeLabelText = isDark ? 'Modo Noche' : 'Modo Día';

    // FIX: Visibilidad de texto. Si está pinned, siempre visible. Si no, solo en hover.
    const textVisibilityClass = isPinned ? 'opacity-100 delay-0' : 'opacity-0 group-hover/sidebar:opacity-100 delay-75';

    // FIX: El botón de pin se oculta por defecto (opacity-0) para no molestar en 80px,
    // y aparece en hover o si está pinned.
    const pinBtnClass = isPinned
        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 opacity-100'
        : 'text-slate-400 opacity-0 group-hover/sidebar:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800';



    // SI ESTAMOS EN MODO COMUNIDAD, RENDERIZAMOS EL SIDEBAR ESPECÍFICO


    return `
    <aside id="sidebar" class="fixed top-0 left-0 h-full bg-white dark:bg-[#0f172a] border-r border-slate-100 dark:border-slate-800/60 z-[60] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${sidebarClasses} group/sidebar shadow-sm font-sans">
        
        <!-- HEADER -->
        <div class="h-[80px] flex items-center px-5 shrink-0 relative justify-between overflow-hidden">
            <div class="flex items-center gap-4 cursor-pointer group/logo" onclick="window.location.hash='#feed'">
                <div class="w-10 h-10 bg-blue-600/10 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl transition-transform group-hover/logo:scale-105 shrink-0 relative z-10">
                    <i class="fas fa-code"></i>
                </div>
                <div class="flex flex-col transition-opacity duration-300 ${textVisibilityClass}">
                    <span class="font-bold text-lg text-slate-800 dark:text-white leading-tight tracking-tight">
                        ProgramBI
                    </span>
                    <span class="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Academy</span>
                </div>
            </div>
            
            <!-- FIX: Botón Pin con visibilidad controlada -->
            <button data-sidebar-action="pin" id="pin-btn" class="w-8 h-8 rounded-full flex items-center justify-center transition-all absolute right-4 z-20 ${pinBtnClass}" title="Fijar menú">
                <i class="fas fa-bars text-sm"></i>
            </button>
        </div>

        <!-- CONTENIDO SCROLLEABLE -->
        <nav class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-4 flex flex-col gap-2 px-4">
            ${_renderNavItem('feed', 'Mi Feed', 'fa-home', activeId === 'feed', 'text-slate-400 group-hover/item:text-blue-500', textVisibilityClass)}
            ${_renderNavItem('chat', 'Comunidad', 'fa-users', activeId === 'chat', 'text-slate-400 group-hover/item:text-emerald-500', textVisibilityClass)} 
            ${_renderNavItemAI(isAIMode, textVisibilityClass)}
            ${_renderNavItem('discovery', 'Explorar', 'fa-compass', activeId === 'discovery', 'text-slate-400 group-hover/item:text-amber-500', textVisibilityClass)}

            ${user.role === 'admin' ? `
                <div class="my-2 h-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                ${_renderNavItem('admin', 'Admin Panel', 'fa-shield-alt', activeId === 'admin', 'text-slate-400 group-hover/item:text-rose-500', textVisibilityClass)}
            ` : ''}

            <div class="my-4 h-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
            ${isAIMode ? _renderAIHistorySection(user, textVisibilityClass) : _renderCommunitiesSection(user, activeId, textVisibilityClass)}
        </nav>

        <!-- FOOTER: PERFIL DE USUARIO & CONFIG -->
        <div class="p-4 shrink-0 bg-white dark:bg-[#0f172a] relative">
            
            <!-- POP-UP MENU DE USUARIO -->
            <div id="user-popup-menu" class="hidden absolute bottom-[115%] left-3 right-3 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-500/10 border border-white/20 dark:border-white/5 p-3 transform transition-all duration-300 ease-out z-50 origin-bottom scale-95 opacity-0 translate-y-4">
                
                <div class="px-2 py-1 mb-2">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tu Cuenta</p>
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">En línea</span>
                    </div>
                </div>

                <div class="space-y-1">
                    <button onclick="App.sidebar.openAvatarModal()" class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all text-xs font-bold group">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i class="fas fa-camera"></i></div>
                        <span>Subir Foto</span>
                    </button>

                    <button onclick="App.sidebar.openNameModal()" class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all text-xs font-bold group">
                        <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i class="fas fa-pen"></i></div>
                        <span>Cambiar Nombre</span>
                    </button>

                    <button data-sidebar-action="theme" class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all text-xs font-bold group">
                        <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i class="fas ${isDark ? 'fa-moon' : 'fa-sun'}"></i></div>
                        <span>${themeLabelText}</span>
                    </button>
                </div>

                <div class="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent my-2"></div>

                <button onclick="App.api.logout()" class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 transition-all text-xs font-bold group">
                    <div class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center group-hover:rotate-12 transition-transform"><i class="fas fa-sign-out-alt"></i></div>
                    <span>Cerrar Sesión</span>
                </button>
            </div>

            <!-- BOTÓN DE PERFIL (TRIGGER) -->
            <button id="user-profile-btn" data-sidebar-action="user-menu" class="w-full flex items-center gap-3 p-2 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/profile relative">
                <img id="sidebar-user-avatar" src="${user.avatar || 'https://ui-avatars.com/api/?background=random'}" class="w-9 h-9 rounded-xl object-cover bg-slate-200 shrink-0 border border-white dark:border-slate-600 shadow-sm group-hover/profile:scale-105 transition-transform">
                
                <div class="flex flex-col items-start overflow-hidden transition-opacity duration-200 ${textVisibilityClass}">
                    <span class="text-xs font-bold text-slate-800 dark:text-white truncate w-full text-left max-w-[140px]">${user.name || 'Usuario'}</span>
                    <span class="text-[10px] text-slate-400 truncate w-full text-left max-w-[140px]">${user.role === 'admin' ? 'Administrador' : 'Estudiante'}</span>
                </div>

                <div class="absolute right-3 transition-opacity text-slate-400 ${textVisibilityClass}">
                    <i id="user-menu-arrow" class="fas fa-chevron-up text-xs transition-transform duration-300"></i>
                </div>
            </button>
        </div>
    </aside>`;
};

// ============================================================================
// 4. HELPERS DE RENDERIZADO
// ============================================================================

function _renderNavItem(id, label, icon, isActive, iconColorClasses = '', textClass = '') {
    const defaultColor = 'text-slate-400 group-hover/item:text-slate-600 dark:group-hover/item:text-slate-300';
    const colorClasses = iconColorClasses || defaultColor;
    const activeClasses = 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold';
    const inactiveClasses = 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white font-medium';
    const finalClass = isActive ? activeClasses : inactiveClasses;
    const finalIconColor = isActive ? 'text-blue-600 dark:text-blue-400' : colorClasses;

    return `
    <a href="#${id}" onclick="document.body.classList.remove('mobile-menu-open')" class="flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ${finalClass} overflow-hidden group/item relative select-none">
        <div class="w-6 flex justify-center shrink-0 text-lg transition-colors ${finalIconColor}"><i class="fas ${icon}"></i></div>
        <span class="text-sm whitespace-nowrap transition-opacity duration-200 origin-left ${textClass}">${label}</span>
    </a>`;
}

function _renderNavItemAI(isActive, textClass = '') {
    const containerClass = isActive ? 'bg-fuchsia-50 dark:bg-fuchsia-500/10 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
    const gradientText = 'bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent';
    const normalText = 'text-slate-500 dark:text-slate-400 group-hover/item:text-slate-900 dark:group-hover/item:text-white';
    const iconColor = isActive ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-400 group-hover/item:text-fuchsia-500';

    return `
    <a href="#ai" onclick="document.body.classList.remove('mobile-menu-open')" class="flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ${containerClass} overflow-hidden group/item relative select-none">
        <div class="w-6 flex justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 transition-colors ${iconColor}">
                <path d="M12 3C12 3 14 9 16 11C18 13 22 13 22 13C22 13 18 13 16 15C14 17 12 23 12 23C12 23 10 17 8 15C6 13 2 13 2 13C2 13 6 13 8 11C10 9 12 3 12 3Z" />
                <path d="M19 16C19 16 20 18 20.5 19C21 20 23 20 23 20C23 20 21 20 20.5 21C20 22 19 24 19 24C19 24 18 22 17.5 21C17 20 15 20 15 20C15 20 17 20 17.5 19C18 18 19 16 19 16Z" />
            </svg>
        </div>
        <span class="text-sm whitespace-nowrap transition-opacity duration-200 font-bold ${textClass} ${isActive ? gradientText : normalText}">Asistente IA</span>
    </a>`;
}

function _renderAIHistorySection(user, textClass = '') {
    const history = (window.App.state && window.App.state.cache) ? window.App.state.cache.aiConversations : null;
    if (history === null && user && window.App.aiService) {
        setTimeout(() => { if (!window.App.state.cache.aiConversations) App.aiService.getConversations(user.uid); }, 50);
    }
    const isLoading = history === null;

    return `
    <div class="px-2 flex justify-between items-center transition-opacity duration-200 mb-2 whitespace-nowrap overflow-hidden ${textClass}">
        <span class="text-[10px] font-bold text-violet-500 uppercase tracking-wider flex items-center gap-2 pl-2"><i class="fas fa-history"></i> Recientes</span>
    </div>
    <button onclick="App.ai.newChat()" class="w-full flex items-center gap-3 p-3 mb-3 rounded-2xl border border-dashed border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors group/newchat overflow-hidden mx-auto">
        <div class="w-6 flex justify-center shrink-0"><i class="fas fa-plus"></i></div>
        <span class="font-bold text-xs whitespace-nowrap transition-opacity duration-200 ${textClass}">Nueva Conversación</span>
    </button>
    <div class="space-y-1 overflow-y-auto max-h-[300px] custom-scrollbar px-1">
        ${isLoading ? `<div class="p-2 space-y-3 transition-opacity ${textClass}"><div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4 animate-pulse"></div><div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2 animate-pulse"></div></div>`
            : (history.length === 0 ? `<div class="text-center p-4 transition-opacity ${textClass}"><p class="text-[11px] text-slate-400">Tu historial aparecerá aquí</p></div>`
                : history.map(chat => `
            <div class="group/chat-item relative">
                <a href="#ai/${chat.id}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-colors group/item pr-8">
                    <i class="far fa-message w-4 text-center shrink-0 text-slate-300 group-hover/item:text-violet-400 text-[10px]"></i>
                    <span class="truncate transition-opacity duration-200 flex-1 ${textClass}">${chat.title || 'Conversación sin título'}</span>
                </a>
                <button onclick="App.ai.requestDelete(event, '${chat.id}')" class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover/chat-item:opacity-100 ${textClass}" title="Eliminar"><i class="fas fa-trash text-[10px]"></i></button>
            </div>`).join(''))}
    </div>`;
}

function _renderCommunitiesSection(user, activeId, textClass = '') {
    const list = user.joinedCommunities || [];

    return `
    <div class="px-2 flex justify-between items-center transition-opacity duration-200 mb-2 whitespace-nowrap overflow-hidden ${textClass}">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">Mis Espacios</span>
        ${list.length > 0 ? `<span class="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">${list.length}</span>` : ''}
    </div>
    <div class="space-y-1">
        ${list.map(cid => {
        const c = (window.App.state && window.App.state.cache && window.App.state.cache.communities) ? window.App.state.cache.communities[cid] : null;
        if (!c) return '';
        const isOpen = SidebarManager.state.openMenus.includes(cid) || activeId === cid || window.location.hash.includes(`/${cid}/`);
        return _renderCommunityDropdown(c, activeId, isOpen, textClass);
    }).join('')}
    </div>
    ${list.length === 0 ? `<div class="text-center p-4 transition-opacity ${textClass}"><p class="text-[11px] text-slate-400 mb-2">Aún no sigues comunidades</p><button onclick="window.location.hash='#discovery'" class="text-[11px] font-bold text-blue-500 hover:underline">Explorar catálogo</button></div>` : ''}`;
}

function _renderCommunityDropdown(c, activeId, isOpen, textClass) {
    const isContextActive = activeId === c.id || window.location.hash.includes(`/${c.id}/`);
    const headerClass = isContextActive ? 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50';

    // --- BRANDING ---
    let iconHtml;
    if (c.logoUrl) {
        iconHtml = `<img src="${c.logoUrl}" class="w-8 h-8 rounded-lg object-contain bg-white shrink-0 border border-gray-100 dark:border-slate-700 p-0.5" alt="${c.name}">`;
    } else {
        iconHtml = `<img src="${c.icon || ''}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&size=64'" class="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-slate-800">`;
    }

    return `
    <div class="mb-1">
        <div class="flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${headerClass} group/comm relative select-none" data-sidebar-action="toggle-menu" data-id="${c.id}">
            <div class="flex items-center gap-3 overflow-hidden">
                ${iconHtml}
                <span class="font-medium text-sm whitespace-nowrap transition-opacity duration-200 truncate ${textClass}">${c.name}</span>
            </div>
            <div class="w-6 h-6 flex items-center justify-center transition-opacity ${textClass}">
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} opacity-60"></i>
            </div>
        </div>
        <div id="submenu-${c.id}" style="display: ${isOpen ? 'block' : 'none'};" class="pl-11 mt-1 space-y-1 overflow-hidden transition-all ${textClass ? '' : 'hidden group-hover/sidebar:block'}">
            ${_renderSubLink(c.id, 'inicio', 'Muro', 'fa-stream')}
            ${_renderSubLink(c.id, 'clases', 'Aula', 'fa-graduation-cap')}
            ${_renderSubLink(c.id, 'live', 'Live', 'fa-video', true)}
        </div>
    </div>`;
}




function _renderSubLink(cid, tab, label, icon, isLive = false) {
    const hash = `#comunidades/${cid}/${tab}`;
    const isActive = window.location.hash === hash;
    const textClass = SidebarManager.state.isPinned ? 'opacity-100' : 'opacity-0 group-hover/sidebar:opacity-100';

    return `
    <a href="${hash}" class="flex items-center gap-3 p-2 rounded-lg transition-colors ${isActive ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">
        <div class="w-5 flex justify-center shrink-0 ${isLive ? 'text-rose-500' : ''}"><i class="fas ${icon}"></i></div>
        <span class="text-xs font-medium whitespace-nowrap transition-opacity duration-200 ${textClass}">${label}</span>
    </a>`;
}