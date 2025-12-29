/**
 * core.js (V7.0 - Trial Engine & Realtime Core)
 * Motor Central de ProgramBI.
 * * CAMBIOS V7.0:
 * - Lógica de Trial de 10 Días (joinDate + checkAccess).
 * - CRUD Real para Posts (Delete/Update).
 * - Listeners en tiempo real para el Chat.
 * - Enrutamiento para Landing Pages.
 */

// ==========================================
// 1. ESTADO GLOBAL & INICIALIZACIÓN
// ==========================================
window.App = window.App || {};

App.state = {
    currentUser: null,
    currentRoute: null,
    params: {},
    cache: {
        communities: {},
        users: {}
    },
    listeners: {} // Para gestionar suscripciones de chat y limpiar memoria
};

// ==========================================
// 2. RENDERIZADOR (ZERO-FLICKER)
// ==========================================
App.render = (html) => {
    return new Promise((resolve) => {
        const app = document.getElementById('app');
        if (!app) {
            console.error("❌ Elemento raíz #app no encontrado");
            resolve();
            return;
        }

        // Limpieza de listeners activos al cambiar de vista completa
        if (App.state.listeners.chat) {
            App.state.listeners.chat(); // Unsubscribe
            delete App.state.listeners.chat;
        }
        
        requestAnimationFrame(() => {
            app.innerHTML = html;
            window.scrollTo(0, 0);
            resolve();
        });
    });
};

// ==========================================
// 3. CAPA DE API (Puente Seguro a Firebase)
// ==========================================
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
            await window.F.setDoc(window.F.doc(window.F.db, "users", user.uid), {
                uid: user.uid,
                email: data.email,
                name: data.name,
                role: 'student',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
                joinedCommunities: [],
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
            window.location.reload();
        } catch (e) {
            console.error("Logout Error:", e);
        }
    },

    // --- USUARIOS & PERFILES ---
    getUserProfile: async (uid) => {
        // Cache temporal para evitar lecturas excesivas
        if (App.state.cache.users[uid]) return App.state.cache.users[uid];
        try {
            const docSnap = await window.F.getDoc(window.F.doc(window.F.db, "users", uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const userProfile = { uid, ...data };
                App.state.cache.users[uid] = userProfile;
                return userProfile;
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    updateProfile: async (uid, data) => {
        try {
            await window.F.updateDoc(window.F.doc(window.F.db, "users", uid), data);
            if (App.state.currentUser && App.state.currentUser.uid === uid) {
                App.state.currentUser = { ...App.state.currentUser, ...data };
                App.state.cache.users[uid] = App.state.currentUser;
            }
            return true;
        } catch (e) {
            throw e;
        }
    },

    // --- COMUNIDADES & TRIAL LOGIC ---
    getCommunities: async () => {
        try {
            const q = window.F.query(window.F.collection(window.F.db, "communities"));
            const querySnapshot = await window.F.getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                list.push({ id: doc.id, ...data });
                App.state.cache.communities[doc.id] = data;
            });
            return list;
        } catch (e) {
            return [];
        }
    },

    getCommunityById: async (id) => {
        if (App.state.cache.communities[id]) return { id, ...App.state.cache.communities[id] };
        try {
            const docSnap = await window.F.getDoc(window.F.doc(window.F.db, "communities", id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                App.state.cache.communities[id] = data;
                return { id, ...data };
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    // LÓGICA DE UNIÓN CON FECHA PARA TRIAL
    joinCommunity: async (communityId) => {
        if (!App.state.currentUser) return;
        const uid = App.state.currentUser.uid;
        
        try {
            // 1. Incrementar contador en comunidad
            await window.F.updateDoc(window.F.doc(window.F.db, "communities", communityId), {
                membersCount: window.F.increment(1)
            });

            // 2. Actualizar usuario: Array de IDs Y Fecha específica de unión
            const joinDateKey = `joinDate_${communityId}`;
            const updateData = {
                joinedCommunities: window.F.arrayUnion(communityId),
            };
            updateData[joinDateKey] = new Date().toISOString(); // Marca de tiempo para el Trial

            await window.F.updateDoc(window.F.doc(window.F.db, "users", uid), updateData);

            // Actualizar estado local
            if(!App.state.currentUser.joinedCommunities) App.state.currentUser.joinedCommunities = [];
            if(!App.state.currentUser.joinedCommunities.includes(communityId)) {
                App.state.currentUser.joinedCommunities.push(communityId);
                App.state.currentUser[joinDateKey] = updateData[joinDateKey];
            }
            return true;
        } catch (e) {
            throw e;
        }
    },

    // VERIFICADOR DE ACCESO (10 DÍAS)
    checkAccess: (user, communityId) => {
        if (!user) return { allowed: false, reason: 'guest' };
        if (user.role === 'admin') return { allowed: true, reason: 'admin' }; // Admin siempre pasa

        // Verificar si es miembro
        if (!user.joinedCommunities || !user.joinedCommunities.includes(communityId)) {
            return { allowed: false, reason: 'not_joined' };
        }

        // Verificar Trial
        const joinDateStr = user[`joinDate_${communityId}`];
        if (!joinDateStr) {
            // Si no tiene fecha (usuarios antiguos), asumimos que tienen acceso o se migran
            // Para este caso, permitimos acceso pero marcamos fecha hoy si quisiéramos ser estrictos
            // Por defecto: Permitir para evitar bloqueos a usuarios legacy, o bloquear.
            // Decisión: Permitir (Legacy Support)
            return { allowed: true, daysLeft: 10 }; 
        }

        const joinDate = new Date(joinDateStr);
        const now = new Date();
        const diffTime = Math.abs(now - joinDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const limit = 10;

        if (diffDays > limit) {
            return { allowed: false, reason: 'trial_expired', expiredDays: diffDays };
        }

        return { allowed: true, daysLeft: limit - diffDays };
    },

    // --- ADMIN CRUD (COMUNIDADES) ---
    createCommunity: async (data) => {
        try {
            const docRef = await window.F.addDoc(window.F.collection(window.F.db, "communities"), {
                ...data,
                membersCount: 0,
                createdAt: new Date().toISOString(),
                courses: [],
                channels: []
            });
            return docRef.id;
        } catch (e) { throw e; }
    },

    updateCommunity: async (communityId, data) => {
        try {
            await window.F.updateDoc(window.F.doc(window.F.db, "communities", communityId), data);
            delete App.state.cache.communities[communityId];
            return true;
        } catch (e) { throw e; }
    },

    // --- POSTS & CHAT (REALTIME & CRUD) ---
    getPosts: async (communityId, type = 'all') => {
        try {
            let q = window.F.query(
                window.F.collection(window.F.db, "posts"), 
                window.F.where("communityId", "==", communityId)
            );
            
            // Filtros
            if (type === 'official') q = window.F.query(q, window.F.where("isOfficial", "==", true));
            else if (type === 'chat') q = window.F.query(q, window.F.where("isChat", "==", true)); // Asumiendo flag isChat
            
            // Ordenar
            // Nota: Requiere índice compuesto en Firestore. Si falla, ordenamos en cliente.
            // q = window.F.query(q, window.F.orderBy("createdAt", "desc"));

            const snap = await window.F.getDocs(q);
            const posts = [];
            snap.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
            
            // Ordenamiento Cliente (Fallback seguro)
            return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (e) {
            console.warn("Firestore Index might be missing for sort", e);
            return [];
        }
    },

    // CHAT EN TIEMPO REAL
    subscribeToChat: (communityId, callback) => {
        const q = window.F.query(
            window.F.collection(window.F.db, "posts"),
            window.F.where("communityId", "==", communityId),
            window.F.where("isChat", "==", true),
            window.F.orderBy("createdAt", "asc"), // Mensajes antiguos arriba
            window.F.limit(50)
        );

        const unsubscribe = window.F.onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
            callback(messages);
        });

        App.state.listeners.chat = unsubscribe;
    },

    createPost: async (postData) => {
        try {
            await window.F.addDoc(window.F.collection(window.F.db, "posts"), {
                ...postData,
                likes: 0,
                likedBy: [],
                comments: [],
                createdAt: new Date().toISOString()
            });
            return true;
        } catch (e) { throw e; }
    },

    // ADMIN: ACTUALIZAR POST
    updatePost: async (postId, data) => {
        try {
            await window.F.updateDoc(window.F.doc(window.F.db, "posts", postId), data);
            return true;
        } catch (e) { throw e; }
    },

    // ADMIN: BORRAR POST
    deletePost: async (postId) => {
        try {
            await window.F.deleteDoc(window.F.doc(window.F.db, "posts", postId));
            return true;
        } catch (e) { throw e; }
    },

    toggleLike: async (postId) => {
        if (!App.state.currentUser) return;
        const uid = App.state.currentUser.uid;
        try {
            const ref = window.F.doc(window.F.db, "posts", postId);
            const docSnap = await window.F.getDoc(ref);
            if (!docSnap.exists()) return;
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

    fileToBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },
    
    seedDatabase: async () => {
        if (window.SeedData && window.SeedData.init) await window.SeedData.init();
    }
};

// ==========================================
// 4. UI HELPERS
// ==========================================
App.ui = {
    toast: (msg, type = 'info') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = "fixed bottom-5 right-5 z-[1000] flex flex-col gap-2 pointer-events-none";
            document.body.appendChild(container);
        }
        const el = document.createElement('div');
        const bgClass = type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-green-600' : 'bg-slate-900');
        const iconClass = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle');
        
        el.className = `${bgClass} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up min-w-[300px] transition-all duration-300 pointer-events-auto border border-white/10`;
        el.innerHTML = `<i class="fas ${iconClass} text-lg"></i><span class="font-medium text-sm">${msg}</span>`;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';
            setTimeout(() => el.remove(), 300);
        }, 4000);
    },

    skeleton: (type) => {
        return Array(3).fill(0).map(() => `
            <div class="bg-white p-4 rounded-2xl border border-gray-100 mb-4 animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div class="h-32 bg-gray-100 rounded-xl mb-3"></div>
                <div class="flex gap-2"><div class="h-3 bg-gray-200 rounded w-1/4"></div><div class="h-3 bg-gray-200 rounded w-1/4"></div></div>
            </div>`).join('');
    },

    formatDate: (isoString) => {
        if(!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute:'2-digit' });
    },

    formatNumber: (num) => {
        return new Intl.NumberFormat('es-ES', { notation: "compact" }).format(num || 0);
    }
};

// ==========================================
// 5. ROUTER (Gestión de Rutas & Accesos)
// ==========================================
window.addEventListener('hashchange', () => App.handleRoute());
window.addEventListener('load', () => App.handleRoute());

App.handleRoute = async () => {
    if (!window.F || !window.F.initialized) {
        await new Promise(r => window.addEventListener('firebase-ready', r, { once: true }));
    }

    const hash = window.location.hash.slice(1) || 'login';
    const parts = hash.split('/');
    const route = parts[0]; 
    App.state.currentRoute = hash;

    window.F.onAuthStateChanged(window.F.auth, async (user) => {
        if (user) {
            // Cargar Perfil si no existe
            if (!App.state.currentUser) {
                const profile = await App.api.getUserProfile(user.uid);
                App.state.currentUser = profile || { 
                    uid: user.uid, email: user.email, role: 'student', name: user.displayName || 'Usuario' 
                };
            }

            // --- LÓGICA DE RUTAS PROTEGIDAS ---
            
            if (route === 'login' || route === 'register') {
                window.location.hash = '#home'; 
            } 
            else if (route === 'home') { 
                if(App.renderDashboard) App.renderDashboard(); 
            } 
            else if (route === 'landing') {
                // Nueva Ruta: Landing Page de Comunidad
                const communityId = parts[1];
                if(App.renderLanding) App.renderLanding(communityId);
            }
            else if (route === 'community') {
                const communityId = parts[1];
                const tab = parts[2] || 'inicio';
                const extra = parts[3]; 

                // VALIDACIÓN DE ACCESO (TRIAL)
                const access = App.api.checkAccess(App.state.currentUser, communityId);
                
                if (!access.allowed) {
                    if (access.reason === 'not_joined') {
                        // Si no es miembro, ir a Landing para "Prueba 10 días"
                        window.location.hash = `#landing/${communityId}`;
                        return;
                    }
                    if (access.reason === 'trial_expired') {
                        // Trial Vencido
                        App.ui.toast(`Tu prueba de 10 días ha terminado. Contacta al admin para acceso completo.`, 'error');
                        window.location.hash = '#home'; // O redirigir a una página de pago
                        return;
                    }
                }

                // Acceso concedido
                if(App.renderCommunity) App.renderCommunity(communityId, tab, extra);
            } 
            else if (route === 'admin') { 
                if(App.renderAdmin) App.renderAdmin(); 
            }
            else if (route === 'onboarding') { 
                if(App.renderOnboarding) App.renderOnboarding(); 
            }
            else { 
                if(App.renderDashboard) App.renderDashboard(); 
            }

        } else {
            // NO AUTENTICADO
            App.state.currentUser = null;
            if (['login', 'register'].includes(route)) {
                if (route === 'login' && App.renderLogin) App.renderLogin();
                if (route === 'register' && App.renderRegister) App.renderRegister();
            } else {
                window.location.hash = '#login';
            }
        }
    });
};