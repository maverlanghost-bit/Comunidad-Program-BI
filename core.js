/**
 * core.js (V59.0 - ULTIMATE INTEGRATION)
 * Motor Central de ProgramBI.
 * * VERSIÓN COMPLETA SIN RECORTES.
 * * INCLUYE:
 * 1. State & Cache Management.
 * 2. Shell Layout Renderer (Sidebar + Content).
 * 3. API Layer Completa (Auth, Firestore, Storage).
 * 4. Utils (Monaco Loader) & Search Engine.
 * 5. Router Inteligente con Auto-Loading para Chat y AI.
 */

// =============================================================================
// 1. ESTADO GLOBAL & INICIALIZACIÓN
// =============================================================================
window.App = window.App || {};

App.state = {
    currentUser: null,
    currentRoute: null,
    theme: localStorage.getItem('theme') || 'light', // Persistencia de tema
    params: {}, // Parámetros de ruta
    cache: {
        communities: {}, // Caché para evitar lecturas excesivas de DB
        users: {},       // Caché de perfiles de usuario
        courses: {},     // Caché de cursos
        aiConversations: null // Caché para historial de IA
    },
    listeners: {} // Gestión de suscripciones (chat realtime)
};

// --- INIT TEMA INMEDIATO ---
// Aplica el tema antes de renderizar nada para evitar parpadeos
if (App.state.theme === 'dark') {
    document.body.classList.add('dark-mode');
} else {
    document.body.classList.remove('dark-mode');
}

// Bloqueo de scroll base (El scroll se delega al contenedor interno del Shell)
document.body.style.overflow = 'hidden';

// =============================================================================
// 2. RENDERIZADOR (SHELL LAYOUT ENGINE)
// =============================================================================
App.render = (htmlContent) => {
    return new Promise((resolve) => {
        const appRoot = document.getElementById('app-root') || document.getElementById('app');
        if (!appRoot) {
            console.error("❌ Elemento raíz #app o #app-root no encontrado");
            return resolve();
        }

        // Limpieza de listeners previos para evitar fugas de memoria
        if (App.state.listeners.chat && typeof App.state.listeners.chat === 'function') {
            App.state.listeners.chat(); 
            delete App.state.listeners.chat;
        }

        requestAnimationFrame(() => {
            const hash = window.location.hash;
            
            // Definición de Rutas Internas (App Mode)
            // Estas rutas activan la interfaz con Sidebar y Header
            const internalSections = ['/inicio', '/clases', '/live', '/miembros'];
            const isInternalSection = internalSections.some(sec => hash.includes(sec));
            const isAppMode = hash.includes('/app') || isInternalSection || hash === '#feed' || hash.startsWith('#chat') || hash.startsWith('#ai') || hash.startsWith('#admin') || hash.startsWith('#perfil') || hash.startsWith('#discovery');

            if (App.state.currentUser && isAppMode) {
                document.body.classList.add('app-mode');
                
                // Determinar contexto para el Sidebar Activo
                let activeId = 'feed';
                if (hash.includes('#comunidades/')) activeId = hash.split('/')[1];
                else if (hash.startsWith('#chat')) activeId = 'chat';
                else if (hash.startsWith('#ai')) activeId = 'ai';
                else if (hash.startsWith('#admin')) activeId = 'admin';
                else if (hash.startsWith('#discovery')) activeId = 'discovery';
                
                // Renderizar Sidebar (Delegado al componente Sidebar)
                const sidebarHTML = App.sidebar.render(activeId);
                
                // ESTRUCTURA MAESTRA (SHELL)
                appRoot.innerHTML = `
                    <div class="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300">
                        
                        <!-- 1. Sidebar Spacer (Dinámico) -->
                        <div id="shell-sidebar" class="w-[72px] h-full shrink-0 z-50 relative border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
                            ${sidebarHTML}
                        </div>
                        
                        <!-- 2. Contenido Scrolleable (Main Scroll Wrapper) -->
                        <div id="main-scroll-wrapper" class="flex-1 h-full overflow-y-auto overflow-x-hidden relative scroll-smooth custom-scrollbar">
                            ${htmlContent}
                        </div>
                    </div>
                `;
            } else {
                // Layout Landing / Public (Scroll normal o delegado)
                document.body.classList.remove('app-mode');
                appRoot.innerHTML = `<div class="h-screen w-screen overflow-y-auto custom-scrollbar bg-white dark:bg-[#020617] transition-colors">${htmlContent}</div>`;
            }

            // Reset scroll lógico al cambiar de vista
            const wrapper = document.getElementById('main-scroll-wrapper');
            if (wrapper) wrapper.scrollTop = 0;
            else window.scrollTo(0, 0);

            resolve();
        });
    });
};

// =============================================================================
// 2.5. SIDEBAR PROXY
// =============================================================================
App.sidebar = {
    render: (activeId) => {
        // Verifica si el componente real components.sidebar.js está cargado
        if (window.App.sidebar && window.App.sidebar.render && window.App.sidebar.render !== App.sidebar.render) {
            return window.App.sidebar.render(activeId);
        }
        return `<div class="p-4 text-center text-xs text-slate-400">Cargando menú...</div>`;
    }
};

// =============================================================================
// 3. CAPA DE API (Firebase Wrapper Completo)
// =============================================================================
App.api = {
    // --- AUTENTICACIÓN ---
    login: async (email, password) => {
        try {
            const cred = await window.F.signInWithEmailAndPassword(window.F.auth, email, password);
            return cred.user;
        } catch (e) { 
            console.error("Login Error:", e); 
            throw e; 
        }
    },

    register: async (data) => {
        try {
            const cred = await window.F.createUserWithEmailAndPassword(window.F.auth, data.email, data.password);
            const user = cred.user;
            // Crear documento de usuario inicial en Firestore
            await window.F.setDoc(window.F.doc(window.F.db, "users", user.uid), {
                uid: user.uid, 
                email: data.email, 
                name: data.name, 
                role: 'student',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`,
                joinedCommunities: [], 
                completedModules: [], 
                points: 0, 
                createdAt: new Date().toISOString()
            });
            return user;
        } catch (e) { 
            console.error("Register Error:", e); 
            throw e; 
        }
    },

    logout: async () => {
        try {
            await window.F.signOut(window.F.auth);
            App.state.currentUser = null;
            window.location.hash = '#comunidades'; 
            window.location.reload(); 
        } catch (e) { console.error("Logout Error:", e); }
    },

    // --- PERFIL DE USUARIO ---
    getUserProfile: async (uid) => {
        // Retornar de caché si existe
        if (App.state.cache.users[uid]) return App.state.cache.users[uid];
        try {
            const docSnap = await window.F.getDoc(window.F.doc(window.F.db, "users", uid));
            if (docSnap.exists()) {
                const data = { uid, ...docSnap.data() };
                App.state.cache.users[uid] = data; // Guardar en caché
                return data;
            }
            return null;
        } catch (e) { return null; }
    },

    updateProfile: async (uid, data) => {
        try {
            await window.F.updateDoc(window.F.doc(window.F.db, "users", uid), data);
            // Actualizar estado local si es el usuario actual
            if (App.state.currentUser && App.state.currentUser.uid === uid) {
                App.state.currentUser = { ...App.state.currentUser, ...data };
                App.state.cache.users[uid] = App.state.currentUser;
            }
            return true;
        } catch (e) { throw e; }
    },

    // --- COMUNIDADES ---
    getCommunities: async () => {
        try {
            const q = window.F.query(window.F.collection(window.F.db, "communities"));
            const querySnapshot = await window.F.getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const community = { id: doc.id, ...data };
                list.push(community);
                App.state.cache.communities[doc.id] = community;
            });
            return list;
        } catch (e) { return []; }
    },

    getCommunityById: async (id) => {
        // [MODIFICACIÓN CLAVE V57+] Mock Virtual para Chat Global
        // Esto permite que el sistema funcione sin crear una comunidad física en DB para el chat global
        if (id === 'global-workspace') {
            return {
                id: 'global-workspace',
                name: 'Chat Global',
                channels: [
                    { id: 'general', name: 'General', type: 'text', category: 'Global' },
                    { id: 'dev-help', name: 'Ayuda Dev', type: 'text', category: 'Soporte' },
                    { id: 'off-topic', name: 'Off Topic', type: 'text', category: 'Social' }
                ]
            };
        }

        if (App.state.cache.communities[id]) return { id, ...App.state.cache.communities[id] };
        try {
            const docRef = window.F.doc(window.F.db, "communities", id);
            const docSnap = await window.F.getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                App.state.cache.communities[id] = { id: docSnap.id, ...data };
                return { id: docSnap.id, ...data };
            }
            return null;
        } catch (e) { return null; }
    },

    joinCommunity: async (communityId) => {
        if (!App.state.currentUser) throw new Error("User not authenticated");
        const uid = App.state.currentUser.uid;
        try {
            const batch = window.F.writeBatch(window.F.db);
            const commRef = window.F.doc(window.F.db, "communities", communityId);
            const userRef = window.F.doc(window.F.db, "users", uid);
            
            // Actualizar contadores y arrays de forma atómica
            batch.update(commRef, { membersCount: window.F.increment(1), members: window.F.arrayUnion(uid) });
            batch.update(userRef, { joinedCommunities: window.F.arrayUnion(communityId) });
            
            await batch.commit();
            
            // Actualizar estado local inmediatamente para reflejar cambios en UI
            if (!App.state.currentUser.joinedCommunities) App.state.currentUser.joinedCommunities = [];
            if (!App.state.currentUser.joinedCommunities.includes(communityId)) { 
                App.state.currentUser.joinedCommunities.push(communityId); 
            }
            if (App.state.cache.communities[communityId]) { 
                App.state.cache.communities[communityId].membersCount = (App.state.cache.communities[communityId].membersCount || 0) + 1; 
            }
            return true;
        } catch (e) { throw e; }
    },

    leaveCommunity: async (communityId) => {
        if (!App.state.currentUser) throw new Error("User not authenticated");
        const uid = App.state.currentUser.uid;
        try {
            const batch = window.F.writeBatch(window.F.db);
            const commRef = window.F.doc(window.F.db, "communities", communityId);
            const userRef = window.F.doc(window.F.db, "users", uid);
            
            batch.update(commRef, { membersCount: window.F.increment(-1), members: window.F.arrayRemove(uid) });
            batch.update(userRef, { joinedCommunities: window.F.arrayRemove(communityId) });
            
            await batch.commit();
            
            // Limpiar estado local
            if (App.state.currentUser.joinedCommunities) { 
                App.state.currentUser.joinedCommunities = App.state.currentUser.joinedCommunities.filter(id => id !== communityId); 
            }
            if (App.state.cache.communities[communityId]) { 
                const currentCount = App.state.cache.communities[communityId].membersCount || 1; 
                App.state.cache.communities[communityId].membersCount = Math.max(0, currentCount - 1); 
            }
            return true;
        } catch (e) { throw e; }
    },

    checkAccess: (user, communityId) => {
        if (!user) return { allowed: false, reason: 'guest' };
        if (user.role === 'admin') return { allowed: true, reason: 'admin' };
        if (!user.joinedCommunities || !user.joinedCommunities.includes(communityId)) { return { allowed: false, reason: 'not_joined' }; }
        return { allowed: true };
    },

    createCommunity: async (data) => {
        try {
            const docRef = await window.F.addDoc(window.F.collection(window.F.db, "communities"), { 
                ...data, 
                membersCount: 0, 
                createdAt: new Date().toISOString(), 
                courses: [], 
                channels: [],
                isPublic: true
            });
            await window.F.updateDoc(docRef, { id: docRef.id });
            return docRef.id;
        } catch (e) { throw e; }
    },

    updateCommunity: async (communityId, data) => {
        try {
            await window.F.updateDoc(window.F.doc(window.F.db, "communities", communityId), data);
            if (App.state.cache.communities[communityId]) { 
                App.state.cache.communities[communityId] = { ...App.state.cache.communities[communityId], ...data }; 
            }
            return true;
        } catch (e) { throw e; }
    },

    // --- CONTENIDO (POSTS/CHAT) ---
    getPosts: async (communityId) => {
        try {
            let q = window.F.query(
                window.F.collection(window.F.db, "posts"), 
                window.F.where("communityId", "==", communityId)
            );
            const snap = await window.F.getDocs(q);
            const posts = [];
            snap.forEach((doc) => {
                const data = doc.data();
                if (data.authorId && data.content) { posts.push({ id: doc.id, ...data }); }
            });
            // Ordenar por fecha creación
            return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (e) { return []; }
    },

    createPost: async (postData) => {
        try {
            const cleanData = { 
                ...postData, 
                likes: 0, 
                likedBy: [], 
                comments: [], 
                createdAt: new Date().toISOString() 
            };
            const docRef = await window.F.addDoc(window.F.collection(window.F.db, "posts"), cleanData);
            return docRef.id;
        } catch (e) { throw e; }
    },

    deletePost: async (postId) => {
        try { 
            await window.F.deleteDoc(window.F.doc(window.F.db, "posts", postId)); 
            return true; 
        } catch (e) { throw e; }
    },

    toggleLike: async (postId) => {
        if (!App.state.currentUser) return false;
        const uid = App.state.currentUser.uid;
        try {
            const ref = window.F.doc(window.F.db, "posts", postId);
            const docSnap = await window.F.getDoc(ref);
            if (!docSnap.exists()) return false;
            
            const post = docSnap.data();
            const likedBy = post.likedBy || [];
            
            if (likedBy.includes(uid)) { 
                await window.F.updateDoc(ref, { likes: window.F.increment(-1), likedBy: window.F.arrayRemove(uid) }); 
            } else { 
                await window.F.updateDoc(ref, { likes: window.F.increment(1), likedBy: window.F.arrayUnion(uid) }); 
            }
            return true;
        } catch (e) { return false; }
    },

    // --- UTILIDADES ---
    fileToBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader(); 
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result); 
            reader.onerror = error => reject(error);
        });
    }
};

// =============================================================================
// 4. UI HELPERS & THEME MANAGER
// =============================================================================
App.ui = {
    toast: (msg, type = 'info') => {
        let c = document.getElementById('toast-container');
        if (!c) { 
            c = document.createElement('div'); 
            c.id = 'toast-container'; 
            c.className = "fixed bottom-5 right-5 z-[10000] flex flex-col gap-2 pointer-events-none"; 
            document.body.appendChild(c); 
        }
        const el = document.createElement('div');
        const bg = type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-green-600' : 'bg-slate-900 dark:bg-slate-700');
        el.className = `${bg} text-white px-6 py-4 rounded-xl shadow-2xl animate-slide-up border border-white/10 flex items-center gap-3 pointer-events-auto min-w-[300px]`;
        const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-info-circle"></i>');
        el.innerHTML = `${icon} <span class="font-bold text-sm">${msg}</span>`;
        c.appendChild(el); 
        setTimeout(() => { 
            el.style.transition = "all 0.3s ease"; el.style.opacity = '0'; el.style.transform = 'translateY(10px)';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    },
    
    skeleton: () => `<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl mb-4 animate-pulse h-32"></div>`,
    
    formatNumber: (n) => new Intl.NumberFormat('es-ES', { notation: "compact" }).format(n || 0),
    
    formatDate: (d) => {
        if (!d) return ''; 
        const date = new Date(d); 
        const now = new Date(); 
        const diff = (now - date) / 1000;
        if (diff < 60) return 'Hace un momento'; 
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`; 
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
};

App.toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    App.state.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', App.state.theme);
    const icon = document.getElementById('sidebar-theme-icon');
    if (icon) icon.className = `fas ${isDark ? 'fa-moon' : 'fa-sun'}`;
    if (window.monaco && window.monaco.editor) window.monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
};

// =============================================================================
// 5. UTILS (Monaco Loader) & SEARCH (Global)
// =============================================================================

App.utils = {
    loadMonaco: () => {
        return new Promise((resolve, reject) => {
            if (window.monaco) return resolve(window.monaco);
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs/loader.min.js';
            script.onload = () => {
                window.require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });
                window.require(['vs/editor/editor.main'], () => resolve(window.monaco));
            };
            script.onerror = () => reject(new Error("Fallo al cargar Monaco Editor"));
            document.body.appendChild(script);
        });
    }
};

App.search = {
    timeout: null,
    handleInput: (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (App.search.timeout) clearTimeout(App.search.timeout);
        if (term.length < 2) { document.getElementById('global-search-results')?.classList.add('hidden'); return; }
        App.search.timeout = setTimeout(() => { const results = App.search.execute(term); App.search.renderResults(results); }, 300);
    },
    execute: (term) => {
        const results = [];
        Object.values(App.state.cache.communities || {}).forEach(c => {
            if (c.name.toLowerCase().includes(term)) { results.push({ type: 'community', id: c.id, title: c.name, icon: c.icon, subtitle: `${c.membersCount || 0} miembros` }); }
        });
        return results.slice(0, 6);
    },
    renderResults: (results) => {
        const container = document.getElementById('global-search-results'); 
        if (!container) return; 
        container.classList.remove('hidden');
        if (results.length === 0) { container.innerHTML = `<div class="p-4 text-xs text-slate-500 italic text-center">No encontramos coincidencias.</div>`; return; }
        container.innerHTML = results.map(r => `
            <div onclick="window.location.hash='#comunidades/${r.id}/app'; document.getElementById('global-search-results').classList.add('hidden')" 
                 class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 transition-colors group">
                <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-[#1890ff] flex items-center justify-center shrink-0">
                    <i class="fas ${r.icon || 'fa-users'}"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#1890ff]">${r.title}</p>
                    <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide truncate">${r.subtitle}</p>
                </div>
            </div>`).join('');
    }
};

// =============================================================================
// 7. ROUTER INTELIGENTE (MODIFICADO V59.0)
// =============================================================================
App.handleRoute = async () => {
    // Esperar a que Firebase esté listo
    if (!window.F || !window.F.initialized) { await new Promise(r => setTimeout(r, 500)); }

    const hash = window.location.hash.slice(1);
    const parts = hash.split('/');
    let route = parts[0];
    const args = parts.slice(1);

    // Redirecciones y Alias
    if (route === 'discovery') { window.location.hash = '#comunidades'; return; }
    if (route === 'community') { window.location.hash = `#comunidades/${args.join('/')}`; return; }

    // Ruta por defecto
    if (!route) { route = 'comunidades'; App.state.currentRoute = 'comunidades'; } 
    else { App.state.currentRoute = route; App.state.params = args; }

    // Listener de Auth State
    window.F.onAuthStateChanged(window.F.auth, async (user) => {
        if (user) {
            // Cargar perfil si cambia el usuario o es la primera vez
            if (!App.state.currentUser || App.state.currentUser.uid !== user.uid) {
                const profile = await App.api.getUserProfile(user.uid);
                App.state.currentUser = profile || { uid: user.uid, email: user.email, role: 'student', name: user.displayName || 'Usuario' };
            }
        } else {
            App.state.currentUser = null;
        }
        const currentUser = App.state.currentUser;

        // --- RUTA 1: CHAT GLOBAL (LAZY LOAD & SELF-HEALING) ---
        if (route === 'chat') {
            if (!currentUser) { window.location.hash = '#comunidades'; return; }
            
            // 1. Mostrar pantalla de carga
            await App.render(`
                <div id="global-chat-container" class="w-full h-full bg-white dark:bg-[#0f172a] flex flex-col relative items-center justify-center">
                    <i class="fas fa-circle-notch fa-spin text-3xl text-[#1890ff] mb-4"></i>
                    <p class="text-slate-500 font-bold text-sm">Cargando Chat...</p>
                </div>
            `);

            // 2. Cargar módulo dinámicamente si no existe
            const container = document.getElementById('global-chat-container');
            const loadChat = async () => {
                if (window.App.chat) return; // Ya cargado
                await new Promise((resolve, reject) => { 
                    const s = document.createElement('script'); 
                    s.src = 'community.chat.js'; 
                    s.onload = resolve; 
                    s.onerror = () => reject(new Error("No se pudo cargar community.chat.js"));
                    document.body.appendChild(s); 
                });
                await new Promise(r => setTimeout(r, 100)); // Esperar parseo
            };

            try {
                await loadChat();
                if (window.App.chat && window.App.chat.render) {
                    // ID 'global-workspace' para que todos compartan el mismo canal
                    await window.App.chat.render(container, 'global-workspace', currentUser);
                } else {
                    throw new Error("Módulo de chat cargado pero inválido.");
                }
            } catch (e) { 
                console.error(e);
                container.innerHTML = `
                    <div class="text-red-500 p-10 text-center">
                        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                        <p>Error cargando chat.</p>
                        <button onclick="location.reload()" class="underline text-xs">Reintentar</button>
                    </div>`; 
            }
            return;
        }

        // --- RUTA 2: ASISTENTE IA (LAZY LOAD & SELF-HEALING) ---
        if (route === 'ai') {
            if (!currentUser) { window.location.hash = '#comunidades'; return; }
            
            // 1. Renderizar Pantalla de Carga Estilizada
            await App.render(`
                <div id="ai-root" class="w-full h-full bg-white dark:bg-[#0f172a] flex flex-col relative items-center justify-center">
                    <div class="text-center animate-fade-in">
                        <div class="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-brain fa-bounce text-purple-600 text-2xl"></i>
                        </div>
                        <p class="text-slate-500 dark:text-slate-400 font-bold text-sm">Conectando Neural Core...</p>
                    </div>
                </div>
            `);

            const container = document.getElementById('ai-root');
            const conversationId = args[0] || null;

            // 2. Cargador Dinámico de Dependencias (Service + View)
            const loadAIModules = async () => {
                const missingService = !window.App.aiService;
                const missingView = !window.App.ai;

                if (!missingService && !missingView) return;

                const promises = [];
                // Cargar Servicio (API)
                if (missingService) promises.push(new Promise((resolve) => { 
                    const s = document.createElement('script'); 
                    s.src = 'ai.service.js'; 
                    s.onload = resolve; 
                    document.body.appendChild(s); 
                }));
                // Cargar Vista (UI)
                if (missingView) promises.push(new Promise((resolve) => { 
                    const s = document.createElement('script'); 
                    s.src = 'ai.views.js'; 
                    s.onload = resolve; 
                    document.body.appendChild(s); 
                }));
                
                await Promise.all(promises);
                await new Promise(r => setTimeout(r, 200)); // Estabilizar
            };

            try {
                await loadAIModules();
                
                if (window.App.ai && window.App.ai.render) {
                    await window.App.ai.render(container, conversationId);
                } else {
                    throw new Error("Módulos cargados pero App.ai.render no disponible");
                }
            } catch (e) {
                console.error("AI Load Error:", e);
                container.innerHTML = `
                    <div class="text-center p-10 text-red-500 animate-fade-in">
                        <i class="fas fa-bug text-4xl mb-4"></i>
                        <h3 class="font-bold text-lg mb-2">Error de Inicialización</h3>
                        <p class="text-sm mb-4">No se pudieron cargar los archivos del Asistente.</p>
                        <button onclick="location.reload()" class="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded font-bold text-sm hover:bg-slate-200 transition-colors">Recargar Página</button>
                    </div>`;
            }
            return;
        }

        // --- RUTA 3: COMUNIDADES Y OTROS ---
        if (route === 'comunidades') {
            if (!args[0]) {
                if (App.public && App.public.renderDiscovery) App.public.renderDiscovery();
            } else {
                const cid = args[0];
                const sub = args[1];
                
                // Sub-rutas internas de la comunidad
                if (sub === 'app' || ['inicio', 'clases', 'live'].includes(sub)) {
                    if (App.renderCommunity) App.renderCommunity(cid, sub || 'inicio', args[2]);
                } else if (sub === 'planes') {
                    if (App.public.renderPlans) App.public.renderPlans(cid);
                } else {
                    if (App.public.renderLanding) App.public.renderLanding(cid);
                }
            }
        }
        else if (route === 'feed') {
            if (currentUser) {
                // Dashboard si existe, sino Feed público
                if (App.renderDashboard) App.renderDashboard(); 
                else if (App.public && App.public.renderFeed) App.public.renderFeed(); 
            }
            else window.location.hash = '#comunidades';
        }
        else if (route === 'admin') {
            if (currentUser?.role === 'admin' && App.renderAdmin) App.renderAdmin(args[0]);
            else window.location.hash = '#comunidades';
        }
        else if (['login', 'register'].includes(route)) {
            if (currentUser) window.location.hash = '#feed';
            else { 
                await App.public.renderDiscovery(); 
                setTimeout(() => App.public.openAuthModal(route), 100); 
            }
        }
        else {
            // Fallback genérico para landings
            if (App.public && App.public.renderLanding) {
                App.public.renderLanding(route);
            }
        }
    });
};

// Bootstrap Listeners
window.addEventListener('hashchange', () => App.handleRoute());
window.addEventListener('load', () => App.handleRoute());