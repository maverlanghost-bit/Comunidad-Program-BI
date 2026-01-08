/**
 * core.js (V38.2 - GOLD MASTER COMPLETE)
 * Motor Central de ProgramBI.
 * * VERSIÓN DEFINITIVA V38.2:
 * - INTEGRIDAD GARANTIZADA: Ninguna función omitida respecto a V34.0.
 * - ROUTER V38: Implementación de rutas semánticas (#comunidades).
 * - AUTH FLOW: Manejo de acceso, pagos y landings de venta.
 * - UTILIDADES: Soporte completo para Admin, Monaco Editor y seedDatabase.
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
        communities: {}, // Caché para evitar lecturas excesivas
        users: {},
        courses: {}
    },
    listeners: {} // Gestión de suscripciones (chat realtime)
};

// --- INIT TEMA INMEDIATO (Previene "Flashbang" blanco en recarga) ---
if (App.state.theme === 'dark') {
    document.body.classList.add('dark-mode');
} else {
    document.body.classList.remove('dark-mode');
}

// =============================================================================
// 2. RENDERIZADOR (ZERO-FLICKER)
// =============================================================================
App.render = (html) => {
    return new Promise((resolve) => {
        const app = document.getElementById('app-root') || document.getElementById('app');
        if (!app) {
            console.error("❌ Elemento raíz #app o #app-root no encontrado");
            return resolve();
        }

        // Limpieza de listeners activos al cambiar de vista completa
        if (App.state.listeners.chat) {
            if (typeof App.state.listeners.chat === 'function') {
                App.state.listeners.chat(); // Unsubscribe de Firestore
            }
            delete App.state.listeners.chat;
        }

        // Renderizado en el siguiente frame de animación para suavidad y rendimiento
        requestAnimationFrame(() => {
            app.innerHTML = html;
            window.scrollTo(0, 0);
            
            // Gestión de clases de layout según autenticación
            // Esto permite estilos específicos cuando el usuario está dentro de la app
            if (App.state.currentUser) {
                document.body.classList.add('app-mode', 'has-sidebar');
            } else {
                document.body.classList.remove('app-mode', 'has-sidebar');
            }
            
            resolve();
        });
    });
};

// =============================================================================
// 3. CAPA DE API (Puente a Firebase)
// =============================================================================
App.api = {

    // --- AUTENTICACIÓN ---

    login: async (email, password) => {
        try {
            const cred = await window.F.signInWithEmailAndPassword(window.F.auth, email, password);
            // El router se encarga de la redirección post-login
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

            // Crear documento de perfil de usuario en Firestore
            await window.F.setDoc(window.F.doc(window.F.db, "users", user.uid), {
                uid: user.uid,
                email: data.email,
                name: data.name,
                role: 'student', // Rol por defecto
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
            // Redirigir a la vista pública de comunidades
            window.location.hash = '#comunidades'; 
            window.location.reload(); // Recarga limpia para reiniciar estado de memoria
        } catch (e) {
            console.error("Logout Error:", e);
        }
    },

    // --- USUARIOS & PERFILES ---

    getUserProfile: async (uid) => {
        // Estrategia Cache-First para perfiles
        if (App.state.cache.users[uid]) return App.state.cache.users[uid];

        try {
            const docSnap = await window.F.getDoc(window.F.doc(window.F.db, "users", uid));
            if (docSnap.exists()) {
                const data = { uid, ...docSnap.data() };
                App.state.cache.users[uid] = data;
                return data;
            }
            return null;
        } catch (e) {
            console.error("Get Profile Error:", e);
            return null;
        }
    },

    updateProfile: async (uid, data) => {
        try {
            await window.F.updateDoc(window.F.doc(window.F.db, "users", uid), data);

            // Actualizar estado local si es el usuario actual para reflejar cambios inmediatos
            if (App.state.currentUser && App.state.currentUser.uid === uid) {
                App.state.currentUser = { ...App.state.currentUser, ...data };
                App.state.cache.users[uid] = App.state.currentUser;
            }
            return true;
        } catch (e) {
            console.error("Update Profile Error:", e);
            throw e;
        }
    },

    // --- COMUNIDADES Y DATOS ---

    getCommunities: async () => {
        try {
            const q = window.F.query(window.F.collection(window.F.db, "communities"));
            const querySnapshot = await window.F.getDocs(q);
            const list = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const community = { id: doc.id, ...data };
                list.push(community);
                App.state.cache.communities[doc.id] = community; // Guardar en caché
            });
            return list;
        } catch (e) {
            console.error("Get Communities Error:", e);
            return [];
        }
    },

    getCommunityById: async (id) => {
        // Verificar caché primero
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
        } catch (e) {
            console.error("Get Community Error:", e);
            return null;
        }
    },

    joinCommunity: async (communityId) => {
        if (!App.state.currentUser) throw new Error("User not authenticated");
        const uid = App.state.currentUser.uid;

        try {
            const batch = window.F.writeBatch(window.F.db);
            const commRef = window.F.doc(window.F.db, "communities", communityId);
            const userRef = window.F.doc(window.F.db, "users", uid);

            // 1. Añadir usuario a la comunidad (array members) y aumentar contador
            batch.update(commRef, { 
                membersCount: window.F.increment(1),
                members: window.F.arrayUnion(uid)
            });
            // 2. Añadir comunidad al perfil del usuario (array joinedCommunities)
            batch.update(userRef, { 
                joinedCommunities: window.F.arrayUnion(communityId) 
            });

            await batch.commit();

            // Actualizar estado local (Optimistic Update)
            if (!App.state.currentUser.joinedCommunities) App.state.currentUser.joinedCommunities = [];
            if (!App.state.currentUser.joinedCommunities.includes(communityId)) {
                App.state.currentUser.joinedCommunities.push(communityId);
            }

            // Actualizar caché de comunidad si existe
            if (App.state.cache.communities[communityId]) {
                App.state.cache.communities[communityId].membersCount = (App.state.cache.communities[communityId].membersCount || 0) + 1;
            }

            return true;
        } catch (e) {
            console.error("API Error joinCommunity:", e);
            throw e;
        }
    },

    leaveCommunity: async (communityId) => {
        if (!App.state.currentUser) throw new Error("User not authenticated");
        const uid = App.state.currentUser.uid;

        try {
            const batch = window.F.writeBatch(window.F.db);
            const commRef = window.F.doc(window.F.db, "communities", communityId);
            const userRef = window.F.doc(window.F.db, "users", uid);

            // 1. Quitar usuario de la comunidad y restar contador
            batch.update(commRef, { 
                membersCount: window.F.increment(-1),
                members: window.F.arrayRemove(uid)
            });
            // 2. Quitar comunidad del usuario
            batch.update(userRef, { 
                joinedCommunities: window.F.arrayRemove(communityId) 
            });

            await batch.commit();

            // Actualización Local (Optimistic)
            if (App.state.currentUser.joinedCommunities) {
                App.state.currentUser.joinedCommunities = App.state.currentUser.joinedCommunities.filter(id => id !== communityId);
            }
            // Actualizar caché de comunidad
            if (App.state.cache.communities[communityId]) {
                const currentCount = App.state.cache.communities[communityId].membersCount || 1;
                App.state.cache.communities[communityId].membersCount = Math.max(0, currentCount - 1);
            }

            return true;
        } catch (e) {
            console.error("API Error leaveCommunity:", e);
            throw e;
        }
    },

    checkAccess: (user, communityId) => {
        if (!user) return { allowed: false, reason: 'guest' };
        if (user.role === 'admin') return { allowed: true, reason: 'admin' };

        if (!user.joinedCommunities || !user.joinedCommunities.includes(communityId)) {
            return { allowed: false, reason: 'not_joined' };
        }

        return { allowed: true };
    },

    // --- ADMIN (CRUD COMPLETO) ---

    createCommunity: async (data) => {
        try {
            const docRef = await window.F.addDoc(window.F.collection(window.F.db, "communities"), {
                ...data,
                membersCount: 0,
                createdAt: new Date().toISOString(),
                courses: [],
                channels: []
            });
            // Guardar el ID dentro del documento para facilitar búsquedas futuras
            await window.F.updateDoc(docRef, { id: docRef.id });
            return docRef.id;
        } catch (e) { throw e; }
    },

    updateCommunity: async (communityId, data) => {
        try {
            await window.F.updateDoc(window.F.doc(window.F.db, "communities", communityId), data);
            // Actualizar caché local
            if (App.state.cache.communities[communityId]) {
                App.state.cache.communities[communityId] = { ...App.state.cache.communities[communityId], ...data };
            }
            return true;
        } catch (e) { throw e; }
    },

    // --- POSTS & INTERACCIONES (CRUD COMPLETO) ---

    getPosts: async (communityId, type = 'all') => {
        try {
            // Consulta base
            let q = window.F.query(
                window.F.collection(window.F.db, "posts"),
                window.F.where("communityId", "==", communityId)
            );

            const snap = await window.F.getDocs(q);
            const posts = [];
            snap.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));

            // Ordenamiento Cliente (Más reciente primero)
            return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (e) {
            console.error("Get Posts Error:", e);
            return [];
        }
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

    updatePost: async (postId, data) => {
        try {
            await window.F.updateDoc(window.F.doc(window.F.db, "posts", postId), data);
            return true;
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
                // Quitar like
                await window.F.updateDoc(ref, {
                    likes: window.F.increment(-1),
                    likedBy: window.F.arrayRemove(uid)
                });
            } else {
                // Dar like
                await window.F.updateDoc(ref, {
                    likes: window.F.increment(1),
                    likedBy: window.F.arrayUnion(uid)
                });
            }
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    // --- UTILS ---

    fileToBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    // Inicialización de datos semilla (Mock Data)
    seedDatabase: async () => {
        if (window.SeedData && window.SeedData.init) {
            await window.SeedData.init();
        }
    }
};

// =============================================================================
// 4. UI HELPERS & THEME MANAGER
// =============================================================================
App.ui = {
    // Sistema de Notificaciones Toast
    toast: (msg, type = 'info') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = "fixed bottom-5 right-5 z-[10000] flex flex-col gap-2 pointer-events-none";
            document.body.appendChild(container);
        }

        const el = document.createElement('div');
        const bgColors = type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-green-600' : 'bg-slate-900 dark:bg-slate-700');

        el.className = `${bgColors} text-white px-6 py-4 rounded-xl shadow-2xl animate-slide-up border border-white/10 flex items-center gap-3 pointer-events-auto min-w-[300px]`;

        const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>'
            : (type === 'error' ? '<i class="fas fa-exclamation-triangle"></i>'
                : '<i class="fas fa-info-circle"></i>');

        el.innerHTML = `${icon} <span class="font-bold text-sm">${msg}</span>`;
        container.appendChild(el);

        // Auto-cierre
        setTimeout(() => {
            el.style.transition = "all 0.3s ease";
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    },

    // Skeletons de carga
    skeleton: (type) => {
        // Skeleton genérico para Cards
        return Array(3).fill(0).map(() => `
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 mb-4 animate-pulse">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                    <div class="flex-1 space-y-2">
                        <div class="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
                        <div class="h-2 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
                    </div>
                </div>
                <div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>`).join('');
    },

    formatNumber: (n) => {
        return new Intl.NumberFormat('es-ES', { notation: "compact" }).format(n || 0);
    },

    formatDate: (d) => {
        if (!d) return '';
        const date = new Date(d);
        const now = new Date();
        const diff = (now - date) / 1000; // segundos

        if (diff < 60) return 'Hace un momento';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
};

// --- GESTOR DE TEMAS ---
App.toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    
    // Guardar preferencia
    App.state.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', App.state.theme);

    // Actualizar icono en Sidebar
    if (App.sidebar && App.sidebar.render) {
        const themeIcon = document.getElementById('sidebar-theme-icon');
        const themeLabel = document.getElementById('sidebar-theme-label');
        if (themeIcon) themeIcon.className = `fas ${isDark ? 'fa-moon' : 'fa-sun text-yellow-400'}`;
        if (themeLabel) themeLabel.innerText = isDark ? 'Modo Noche' : 'Modo Día';
    }

    // Actualizar Monaco Editor en tiempo real
    if (window.monaco && window.editorInstance) {
        window.monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    }
};

// =============================================================================
// 5. UTILS TÉCNICOS & MONACO LOADER
// =============================================================================
App.utils = {
    // Carga diferida de Monaco Editor para rendimiento
    loadMonaco: () => {
        return new Promise((resolve, reject) => {
            if (window.monaco) return resolve(window.monaco);

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs/loader.min.js';
            script.onload = () => {
                window.require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });
                window.require(['vs/editor/editor.main'], () => {
                    resolve(window.monaco);
                });
            };
            script.onerror = () => reject(new Error("Fallo al cargar Monaco Editor"));
            document.body.appendChild(script);
        });
    }
};

// =============================================================================
// 6. MOTOR DE BÚSQUEDA GLOBAL
// =============================================================================
App.search = {
    timeout: null,

    handleInput: (e) => {
        const term = e.target.value.toLowerCase().trim();
        const resultsContainer = document.getElementById('global-search-results');

        if (App.search.timeout) clearTimeout(App.search.timeout);

        if (term.length < 2) {
            if (resultsContainer) resultsContainer.classList.add('hidden');
            return;
        }

        App.search.timeout = setTimeout(() => {
            const results = App.search.execute(term);
            App.search.renderResults(results);
        }, 300);
    },

    execute: (term) => {
        const results = [];
        const communities = Object.values(App.state.cache.communities || {});

        communities.forEach(c => {
            // Coincidencia en Comunidad
            if (c.name.toLowerCase().includes(term)) {
                results.push({
                    type: 'community',
                    id: c.id,
                    title: c.name,
                    image: c.logoUrl,
                    icon: c.icon,
                    subtitle: `${c.membersCount || 0} miembros`
                });
            }
        });

        return results.slice(0, 6);
    },

    renderResults: (results) => {
        const container = document.getElementById('global-search-results');
        if (!container) return;

        container.classList.remove('hidden');

        if (results.length === 0) {
            container.innerHTML = `<div class="p-4 text-xs text-slate-500 italic text-center dark:text-slate-400">No encontramos coincidencias.</div>`;
            return;
        }

        container.innerHTML = results.map(r => `
            <div onclick="window.location.hash='#comunidades/${r.id}'; document.getElementById('global-search-results').classList.add('hidden')" 
                 class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors group">
                <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-[#1890ff] flex items-center justify-center shrink-0"><i class="fas ${r.icon || 'fa-users'}"></i></div>
                <div class="min-w-0">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#1890ff] transition-colors">${r.title}</p>
                    <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide truncate">${r.subtitle}</p>
                </div>
            </div>`).join('');
    }
};

// =============================================================================
// 7. ROUTER INTELIGENTE V38 (URL SEMÁNTICAS)
// =============================================================================
App.handleRoute = async () => {
    // Asegurar que Firebase esté listo
    if (!window.F || !window.F.initialized) {
        await new Promise(r => setTimeout(r, 500));
    }

    const hash = window.location.hash.slice(1);
    const parts = hash.split('/');
    let route = parts[0];
    const args = parts.slice(1);

    // 1. REDIRECCIONES LEGACY (Migración a V38)
    // Redirigir antiguas URLs de discovery y community a la nueva estructura semántica
    if (route === 'discovery') { window.location.hash = '#comunidades'; return; }
    if (route === 'community') { window.location.hash = `#comunidades/${args.join('/')}`; return; }

    // Default Route (Landing Principal)
    if (!route) {
        route = 'comunidades';
        App.state.currentRoute = 'comunidades';
    } else {
        App.state.currentRoute = route;
        App.state.params = args;
    }

    // Monitor de Auth
    window.F.onAuthStateChanged(window.F.auth, async (user) => {
        
        if (user) {
            // Cargar Perfil si no existe en estado local
            if (!App.state.currentUser || App.state.currentUser.uid !== user.uid) {
                const profile = await App.api.getUserProfile(user.uid);
                App.state.currentUser = profile || {
                    uid: user.uid, email: user.email, role: 'student', name: user.displayName || 'Usuario'
                };
            }
        } else {
            App.state.currentUser = null;
        }

        const currentUser = App.state.currentUser;
        
        // --- ENRUTAMIENTO V38: RUTAS DEL SISTEMA ---

        if (route === 'comunidades') {
            const communityId = args[0];
            
            if (!communityId) {
                // VISTA: CATÁLOGO (DISCOVERY)
                // Se renderiza el listado público de comunidades
                if (App.public && App.public.renderDiscovery) App.public.renderDiscovery();
            } else {
                // VISTA: DETALLE COMUNIDAD
                const tab = args[1] || 'inicio';
                const access = App.api.checkAccess(currentUser, communityId);

                if (access.allowed) {
                    // Acceso permitido -> Renderizar App Interna (Feed, Chat, Aula)
                    if (App.renderCommunity) App.renderCommunity(communityId, tab, args[2]);
                } else {
                    // Acceso denegado (No unido) -> Renderizar Landing Page de Venta/Información
                    if (App.public && App.public.renderLanding) App.public.renderLanding(communityId);
                }
            }
        }
        else if (route === 'feed') {
            // Dashboard Personal
            if (currentUser) {
                if (App.renderDashboard) App.renderDashboard();
            } else {
                window.location.hash = '#comunidades';
            }
        }
        else if (route === 'admin') {
            // Panel Admin (Solo Admin)
            if (currentUser && currentUser.role === 'admin' && App.renderAdmin) App.renderAdmin(args[0]);
            else window.location.hash = '#comunidades';
        }
        else if (['login', 'register'].includes(route)) {
            // Rutas de Autenticación
            if (currentUser) {
                window.location.hash = '#feed';
            } else {
                if (App.public) {
                    await App.public.renderDiscovery();
                    setTimeout(() => App.public.openAuthModal(route), 100);
                }
            }
        }
        else {
            // --- URLs CORTAS (Smart Redirect) ---
            // Si la ruta no coincide con palabras reservadas, intentamos cargarla como una comunidad
            // ej: #python -> #comunidades/python
            if (App.public && App.public.renderLanding) {
                App.public.renderLanding(route);
            }
        }
    });
};

// Bootstrap Listeners
window.addEventListener('hashchange', () => App.handleRoute());
window.addEventListener('load', () => App.handleRoute());