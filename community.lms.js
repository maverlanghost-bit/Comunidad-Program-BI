/**
 * community.lms.js (V5.5 - Sidebar Layout Fix)
 * Motor LMS Completo con Gestión Directa a Firebase.
 * * CORRECCIONES V5.5:
 * - Ajuste de layout en 'Course Manager' para respetar la barra lateral.
 * - Se añade padding-left (pl-20) para evitar que la barra tape el contenido.
 */

window.App = window.App || {};
window.App.lms = {
    
    // --- ESTADO INTERNO ---
    player: null,
    progressInterval: null,
    currentCommunityId: null,
    activeMenuId: null,
    initialized: false,

    /**
     * INIT: Inicializa listeners globales una sola vez.
     */
    init: () => {
        if (App.lms.initialized) return;
        
        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (App.lms.activeMenuId) {
                const menu = document.getElementById(App.lms.activeMenuId);
                const btn = e.target.closest(`[data-menu-trigger="${App.lms.activeMenuId}"]`);
                const isClickInsideMenu = e.target.closest(`#${App.lms.activeMenuId}`);
                
                if (!btn && !isClickInsideMenu && menu) {
                    menu.classList.add('hidden');
                    menu.classList.remove('animate-slide-up');
                    App.lms.activeMenuId = null;
                }
            }
        });
        
        App.lms.initialized = true;
        console.log("✅ LMS System V5.5 Ready (Sidebar Safe Mode)");
    },

    /**
     * VISTA 1: RENDERIZAR CATÁLOGO
     */
    renderCatalog: (container, community, user, isAdmin) => {
        App.lms.currentCommunityId = community.id;
        App.lms.init(); 

        const courses = community.courses || [];
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto py-8 animate-fade-in relative z-0">
                
                <!-- Encabezado -->
                <div class="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-gray-100 pb-6">
                    <div>
                        <h2 class="text-3xl font-heading font-bold text-gray-900 tracking-tight">Rutas de Aprendizaje</h2>
                        <p class="text-gray-500 text-sm mt-2">Gestiona el conocimiento de tu comunidad.</p>
                    </div>
                    ${isAdmin ? `
                    <button onclick="App.lms.openCreateCourseModal('${community.id}')" 
                            class="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 hover:shadow-xl transition-all flex items-center gap-2 active:scale-95 transform">
                        <i class="fas fa-plus-circle"></i> <span>Crear Nuevo Curso</span>
                    </button>` : ''}
                </div>

                <!-- Grid de Cursos -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${courses.length > 0 ? courses.map(course => {
                        const totalClasses = course.classes ? course.classes.length : 0;
                        const completedInCourse = (course.classes || []).filter(cls => 
                            (user.completedModules || []).includes(`${community.id}_${cls.id}`)
                        ).length;
                        const progress = totalClasses === 0 ? 0 : Math.round((completedInCourse / totalClasses) * 100);
                        
                        return `
                        <div class="group bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-2xl transition-all duration-300 relative hover:-translate-y-1">
                            
                            <!-- Imagen Portada -->
                            <div class="h-52 bg-gray-100 relative overflow-hidden cursor-pointer" onclick="window.location.hash='#community/${community.id}/clases/${course.id}'">
                                <img src="${course.image || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80'}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                
                                ${progress > 0 ? `
                                    <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/30 backdrop-blur">
                                        <div class="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" style="width: ${progress}%"></div>
                                    </div>
                                ` : ''}
                            </div>

                            <!-- Info -->
                            <div class="p-6 flex-1 flex flex-col cursor-pointer" onclick="window.location.hash='#community/${community.id}/clases/${course.id}'">
                                <h3 class="font-bold text-xl text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">${course.title}</h3>
                                <p class="text-sm text-gray-500 mb-6 line-clamp-3 flex-1 leading-relaxed">${course.description || 'Sin descripción disponible.'}</p>
                                
                                <div class="flex items-center justify-between text-xs font-bold pt-4 border-t border-gray-50 mt-auto uppercase tracking-wide">
                                    <span class="text-gray-400 flex items-center gap-1.5"><i class="fas fa-layer-group"></i> ${totalClasses} clases</span>
                                    ${progress === 100 
                                        ? `<span class="text-green-600 bg-green-50 px-2 py-1 rounded-md"><i class="fas fa-check-circle"></i> Completado</span>` 
                                        : (progress > 0 ? `<span class="text-black">${progress}% Hecho</span>` : `<span class="text-gray-300">Nuevo</span>`)
                                    }
                                </div>
                            </div>

                            <!-- Menú Admin (3 Puntos) -->
                            ${isAdmin ? `
                            <div class="absolute top-4 right-4 z-20">
                                <div class="relative">
                                    <button onclick="event.stopPropagation(); App.lms.toggleMenu('menu-${course.id}')" 
                                            data-menu-trigger="menu-${course.id}"
                                            class="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-black hover:scale-110 transition-all border border-transparent hover:border-gray-200">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    
                                    <div id="menu-${course.id}" class="hidden absolute right-0 top-12 bg-white border border-gray-100 shadow-2xl rounded-xl w-48 overflow-hidden z-30 origin-top-right animate-slide-up">
                                        <button onclick="event.stopPropagation(); App.lms.openCourseManager('${course.id}')" class="w-full text-left px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors flex items-center gap-3">
                                            <i class="fas fa-cog text-gray-400"></i> Gestionar Curso
                                        </button>
                                        <div class="h-px bg-gray-100 my-0"></div>
                                        <button onclick="event.stopPropagation(); App.lms.deleteCourse('${course.id}')" class="w-full text-left px-5 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-3">
                                            <i class="fas fa-trash"></i> Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>` : ''}
                        </div>
                    `}).join('') : `
                        <div class="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-gray-100 border-dashed group hover:border-gray-300 transition-colors">
                            <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 group-hover:scale-110 transition-transform duration-500">
                                <i class="fas fa-graduation-cap text-4xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-2">No hay cursos aún</h3>
                            <p class="text-gray-500 max-w-md mx-auto mb-8">Comienza a construir el conocimiento de tu comunidad.</p>
                            ${isAdmin ? `
                            <button onclick="App.lms.openCreateCourseModal('${community.id}')" class="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-xl hover:bg-gray-900 transition-transform hover:-translate-y-1">
                                <i class="fas fa-plus mr-2"></i> Crear Primer Curso
                            </button>` : ''}
                        </div>
                    `}
                </div>
            </div>
            
            <!-- MODALES / VISTAS SUPERPUESTAS -->
            ${isAdmin ? _renderCreateCourseModal() : ''}
            ${isAdmin ? _renderAddClassToCourseModal() : ''}
            
            <!-- CONTENEDOR FULL SCREEN CMS -->
            ${isAdmin ? _renderFullScreenCourseManager() : ''}
        `;
    },

    /**
     * VISTA 2: RENDERIZAR REPRODUCTOR
     */
    renderPlayer: (container, community, courseId, user, isAdmin) => {
        App.lms.currentCommunityId = community.id;
        const course = (community.courses || []).find(c => c.id === courseId);
        
        if (!course) {
            container.innerHTML = `<div class="h-[50vh] flex flex-col items-center justify-center text-gray-400"><p>Curso no encontrado.</p><a href="#community/${community.id}/clases" class="text-black font-bold mt-2">Volver</a></div>`;
            return;
        }

        const classes = course.classes || [];
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto py-6 animate-fade-in pb-20">
                <nav class="flex items-center gap-3 text-sm text-gray-500 mb-6">
                    <button onclick="window.location.hash='#community/${community.id}/clases'" class="hover:text-black transition-colors flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg hover:bg-white">
                        <i class="fas fa-arrow-left"></i> Volver a Cursos
                    </button>
                    <span class="text-gray-300">/</span>
                    <span class="font-bold text-gray-900 truncate max-w-[400px]">${course.title}</span>
                </nav>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <!-- VIDEO -->
                    <div class="lg:col-span-8 space-y-6">
                        <div class="w-full aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden relative group ring-1 ring-white/10">
                            <div id="youtube-player-placeholder" class="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-zinc-900">
                                <i class="fab fa-youtube text-5xl mb-3 opacity-50"></i>
                                <span class="text-sm font-medium opacity-50">Selecciona una clase</span>
                            </div>
                        </div>
                        <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div class="flex-1">
                                    <h1 id="player-title" class="text-2xl font-heading font-bold text-gray-900 leading-tight mb-2">Bienvenido</h1>
                                    <div class="flex items-center gap-4 text-sm text-gray-500 font-medium">
                                        <span class="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">Clase <span id="player-idx">--</span></span>
                                        <span class="flex items-center gap-1.5 text-gray-400"><i class="far fa-clock"></i> <span id="player-dur">--:--</span></span>
                                    </div>
                                </div>
                                <div class="flex gap-3 shrink-0">
                                    <button id="btn-complete-class" disabled class="bg-gray-100 text-gray-400 px-6 py-3 rounded-xl font-bold text-sm shadow-none flex items-center gap-2 cursor-not-allowed">
                                        <span>Seleccionar Clase</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="pt-4">
                            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><i class="fas fa-th"></i> Navegación Rápida</h3>
                            <div class="flex flex-wrap gap-2" id="quick-nav-grid"></div>
                        </div>
                    </div>

                    <!-- TEMARIO -->
                    <div class="lg:col-span-4">
                        <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg sticky top-24">
                            <div class="p-6 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                                <h3 class="font-bold text-gray-900 text-lg mb-1">Contenido</h3>
                                <div class="flex items-center justify-between mt-3 text-xs font-bold text-gray-500 mb-2">
                                    <span>TU PROGRESO</span>
                                    <span><span id="course-progress-text">0</span>%</span>
                                </div>
                                <div class="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                    <div id="course-progress-bar" class="bg-green-500 h-full w-0 transition-all duration-700 ease-out"></div>
                                </div>
                            </div>
                            <div class="max-h-[60vh] overflow-y-auto custom-scrollbar p-3 space-y-2 bg-white" id="playlist-container">
                                ${classes.length === 0 ? `<div class="py-12 text-center text-gray-400"><i class="fas fa-box-open text-2xl mb-2 opacity-30"></i><p class="text-xs italic">Aún no hay clases.</p></div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (classes.length > 0) {
            _renderPlaylistAndGrid(community.id, course, user, classes[0].id);
            _loadVideo(community.id, classes[0], user, 1);
        } else {
             _renderPlaylistAndGrid(community.id, course, user, null);
        }
    },

    playClass: (cid, courseId, classId) => {
        App.api.getCommunityById(cid).then(comm => {
            const course = comm.courses.find(c => c.id === courseId);
            const cls = course.classes.find(c => c.id === classId);
            const idx = course.classes.findIndex(c => c.id === classId) + 1;
            if(cls) {
                _loadVideo(cid, cls, App.state.currentUser, idx);
                if(window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            _renderPlaylistAndGrid(cid, course, App.state.currentUser, classId);
        });
    },

    // ============================================================
    // GESTIÓN DE CURSOS: CREACIÓN (METODO ROBUSTO)
    // ============================================================

    openCreateCourseModal: (cid) => { 
        const targetCid = cid || App.lms.currentCommunityId;
        const input = document.getElementById('course-cid');
        if (input && targetCid) {
            input.value = targetCid;
            _toggleModal('create-course', true);
        }
    },

    closeCreateCourseModal: () => _toggleModal('create-course', false),
    
    saveCourse: async () => {
        const cid = document.getElementById('course-cid').value;
        const title = document.getElementById('course-title').value;
        const desc = document.getElementById('course-desc').value;
        const img = document.getElementById('course-img').value;
        const btn = document.getElementById('btn-create-course-final');

        if (!title) return App.ui.toast("El título es obligatorio", "error");

        btn.disabled = true; 
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';

        try {
            const communityRef = window.F.doc(window.F.db, "communities", cid);
            const docSnap = await window.F.getDoc(communityRef);

            if (!docSnap.exists()) throw new Error("La comunidad no existe.");

            const communityData = docSnap.data();
            let courses = communityData.courses || []; 

            const newCourse = {
                id: 'c_' + Date.now(),
                title: title.trim(),
                description: desc.trim(),
                image: img.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
                classes: [],
                createdAt: new Date().toISOString()
            };

            courses.push(newCourse);
            await window.F.updateDoc(communityRef, { courses: courses });
            
            App.ui.toast("¡Curso creado con éxito!", "success");
            _toggleModal('create-course', false);
            
            document.getElementById('course-title').value = "";
            document.getElementById('course-desc').value = "";
            document.getElementById('course-img').value = "";

            App.renderCommunity(cid, 'clases');

        } catch(e) { 
            console.error("Error:", e);
            App.ui.toast("Error al guardar: " + e.message, "error");
        } finally { 
            btn.disabled = false; 
            btn.innerHTML = originalText; 
        }
    },

    deleteCourse: async (id) => {
        if(!confirm("¿Estás seguro de eliminar este curso? Esta acción es irreversible.")) return;
        const cid = App.lms.currentCommunityId;
        try {
            const communityRef = window.F.doc(window.F.db, "communities", cid);
            const docSnap = await window.F.getDoc(communityRef);
            if (!docSnap.exists()) return;

            let courses = docSnap.data().courses || [];
            courses = courses.filter(c => c.id !== id);

            await window.F.updateDoc(communityRef, { courses: courses });
            App.ui.toast("Curso eliminado", "success");
            App.renderCommunity(cid, 'clases');
        } catch(e) { 
            App.ui.toast("Error al eliminar", "error");
        }
    },

    // ============================================================
    // SECCIÓN ADMIN: COURSE MANAGER (FULL SCREEN MODE)
    // ============================================================

    openCourseManager: async (courseId) => {
        if (App.lms.activeMenuId) {
            const menu = document.getElementById(App.lms.activeMenuId);
            if(menu) menu.classList.add('hidden');
        }
        App.lms.activeMenuId = null;

        const cid = App.lms.currentCommunityId;
        const docSnap = await window.F.getDoc(window.F.doc(window.F.db, "communities", cid));
        if(!docSnap.exists()) return;

        const commData = docSnap.data();
        const course = (commData.courses || []).find(c => c.id === courseId);
        
        if (!course) return App.ui.toast("Error: Curso no encontrado", "error");

        // Llenar campos
        document.getElementById('mgr-course-id').value = course.id;
        document.getElementById('mgr-title').value = course.title;
        document.getElementById('mgr-desc').value = course.description || '';
        document.getElementById('mgr-img').value = course.image || '';

        // Renderizar lista
        App.lms.renderManagerClassList(course.classes || []);
        
        // ACTIVAR MODO FULL SCREEN
        const container = document.getElementById('full-cms-container');
        if(container) {
            container.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Bloquear scroll body
        }
    },

    closeCourseManager: () => {
        const container = document.getElementById('full-cms-container');
        if(container) {
            container.classList.add('hidden');
            document.body.style.overflow = ''; // Restaurar scroll body
        }
    },

    renderManagerClassList: (classes) => {
        const list = document.getElementById('mgr-class-list');
        list.innerHTML = '';

        if (classes.length === 0) {
            list.innerHTML = `<div class="text-center py-12 bg-white border-2 border-dashed border-gray-200 rounded-xl"><p class="text-gray-400 text-sm">Sin clases aún. ¡Añade la primera!</p></div>`;
        } else {
            classes.forEach((cls, idx) => {
                const el = document.createElement('div');
                el.className = "flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl mb-3 shadow-sm hover:shadow-md transition-shadow group";
                el.innerHTML = `
                    <div class="flex items-center gap-4 overflow-hidden">
                        <div class="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">${idx + 1}</div>
                        <div class="min-w-0">
                            <h4 class="text-sm font-bold text-gray-900 truncate">${cls.title}</h4>
                            <p class="text-xs text-gray-500 font-mono mt-0.5"><i class="far fa-clock"></i> ${cls.duration || '00:00'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="App.lms.deleteClassFromManager('${cls.id}')" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                `;
                list.appendChild(el);
            });
        }

        const addBtnContainer = document.createElement('div');
        addBtnContainer.className = "mt-6";
        addBtnContainer.innerHTML = `
            <button onclick="App.lms.openAddClassPopUp()" class="w-full py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold text-sm hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 group">
                <div class="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-black group-hover:text-white flex items-center justify-center transition-colors"><i class="fas fa-plus text-[10px]"></i></div>
                <span>Agregar Nueva Clase</span>
            </button>`;
        list.appendChild(addBtnContainer);
    },

    saveCourseDetails: async () => {
        const cid = App.lms.currentCommunityId;
        const courseId = document.getElementById('mgr-course-id').value;
        const title = document.getElementById('mgr-title').value;
        const desc = document.getElementById('mgr-desc').value;
        const img = document.getElementById('mgr-img').value;
        const btn = document.getElementById('btn-save-mgr');

        if(!title) return App.ui.toast("Título requerido", "error");
        btn.innerHTML = 'Guardando...'; btn.disabled = true;
        
        try {
            const communityRef = window.F.doc(window.F.db, "communities", cid);
            const docSnap = await window.F.getDoc(communityRef);
            if (!docSnap.exists()) throw new Error("No data");

            const courses = docSnap.data().courses || [];
            const idx = courses.findIndex(c => c.id === courseId);
            if (idx === -1) throw new Error("Curso no encontrado");

            courses[idx] = { ...courses[idx], title, description: desc, image: img };
            await window.F.updateDoc(communityRef, { courses: courses });
            
            App.ui.toast("Curso actualizado correctamente", "success");
            App.renderCommunity(cid, 'clases');
        } catch(e) { console.error(e); App.ui.toast("Error al actualizar", "error"); } 
        finally { btn.innerHTML = 'Guardar Cambios'; btn.disabled = false; }
    },

    openAddClassPopUp: () => {
        document.getElementById('add-class-course-id').value = document.getElementById('mgr-course-id').value;
        _toggleModal('add-class', true);
    },
    closeAddClassToCourseModal: () => _toggleModal('add-class', false),

    saveClassFromPopUp: async () => {
        const cid = App.lms.currentCommunityId;
        const courseId = document.getElementById('mgr-course-id').value;
        const title = document.getElementById('class-title').value;
        const dur = document.getElementById('class-dur').value;
        const url = document.getElementById('class-url').value;
        const btn = document.getElementById('btn-save-class');

        if(!title || !url) return App.ui.toast("Faltan datos (Título o URL)", "error");
        btn.disabled = true; btn.innerHTML = 'Agregando...';

        try {
            const communityRef = window.F.doc(window.F.db, "communities", cid);
            const docSnap = await window.F.getDoc(communityRef);
            const courses = docSnap.data().courses || [];
            const course = courses.find(c => c.id === courseId);
            
            if(!course) throw new Error("Curso no encontrado");
            if(!course.classes) course.classes = [];
            
            course.classes.push({ id: 'cl_' + Date.now(), title, duration: dur || '10:00', videoUrl: url });

            await window.F.updateDoc(communityRef, { courses: courses });

            App.ui.toast("Clase agregada", "success");
            _toggleModal('add-class', false);
            
            document.getElementById('class-title').value = '';
            document.getElementById('class-url').value = '';

            App.lms.renderManagerClassList(course.classes);
            App.renderCommunity(cid, 'clases');

        } catch(e) { console.error(e); App.ui.toast("Error al guardar clase", "error"); }
        finally { btn.disabled = false; btn.innerHTML = 'Publicar Clase'; }
    },
    
    deleteClassFromManager: async (classId) => {
        if(!confirm("¿Borrar clase?")) return;
        const cid = App.lms.currentCommunityId;
        const courseId = document.getElementById('mgr-course-id').value;

        try {
            const communityRef = window.F.doc(window.F.db, "communities", cid);
            const docSnap = await window.F.getDoc(communityRef);
            const courses = docSnap.data().courses;
            const cIdx = courses.findIndex(c => c.id === courseId);
            
            courses[cIdx].classes = courses[cIdx].classes.filter(c => c.id !== classId);
            await window.F.updateDoc(communityRef, { courses: courses });
            
            App.ui.toast("Clase eliminada", "success");
            App.lms.renderManagerClassList(courses[cIdx].classes);
            App.renderCommunity(cid, 'clases');
        } catch(e) { App.ui.toast("Error al eliminar", "error"); }
    },

    toggleMenu: (menuId) => {
        if (App.lms.activeMenuId && App.lms.activeMenuId !== menuId) {
            document.getElementById(App.lms.activeMenuId).classList.add('hidden');
        }
        const el = document.getElementById(menuId);
        if (el.classList.contains('hidden')) {
            el.classList.remove('hidden'); el.classList.add('animate-slide-up');
            App.lms.activeMenuId = menuId;
        } else {
            el.classList.add('hidden'); el.classList.remove('animate-slide-up');
            App.lms.activeMenuId = null;
        }
    }
};

function _renderPlaylistAndGrid(cid, course, user, activeClassId) {
    const listContainer = document.getElementById('playlist-container');
    const gridContainer = document.getElementById('quick-nav-grid');
    if(!listContainer || !gridContainer) return;

    const classes = course.classes || [];
    const completed = user.completedModules || [];
    
    const completedCount = classes.filter(c => completed.includes(`${cid}_${c.id}`)).length;
    const pct = classes.length === 0 ? 0 : Math.round((completedCount / classes.length) * 100);
    const bar = document.getElementById('course-progress-bar');
    const txt = document.getElementById('course-progress-text');
    if(bar) bar.style.width = `${pct}%`;
    if(txt) txt.innerText = pct;

    listContainer.innerHTML = classes.map((cls, idx) => {
        const isDone = completed.includes(`${cid}_${cls.id}`);
        const isActive = cls.id === activeClassId;
        
        return `
        <div onclick="App.lms.playClass('${cid}', '${course.id}', '${cls.id}')" 
             class="p-3 rounded-xl cursor-pointer flex gap-3 items-center transition-all group border ${isActive ? 'bg-black border-black shadow-md' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'}">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${isActive ? 'bg-white text-black' : (isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}">
                ${isDone ? '<i class="fas fa-check"></i>' : idx + 1}
            </div>
            <div class="flex-1 overflow-hidden">
                <h4 class="text-sm font-medium ${isActive ? 'text-white' : 'text-gray-700 group-hover:text-black'} truncate">${cls.title}</h4>
                <p class="text-[10px] ${isActive ? 'text-gray-400' : 'text-gray-400'} flex items-center gap-2 mt-0.5"><i class="far fa-clock"></i> ${cls.duration || '00:00'}</p>
            </div>
        </div>`;
    }).join('');

    gridContainer.innerHTML = classes.map((cls, idx) => {
        const isDone = completed.includes(`${cid}_${cls.id}`);
        const isActive = cls.id === activeClassId;
        let btnClass = "border border-gray-200 bg-white text-gray-700 hover:border-black hover:text-black";
        if (isActive) btnClass = "bg-black text-white border-black shadow-md";
        else if (isDone) btnClass = "bg-green-50 text-green-700 border-green-200 hover:bg-green-100";
        return `<button onclick="App.lms.playClass('${cid}', '${course.id}', '${cls.id}')" class="h-10 px-4 rounded-lg text-xs font-bold transition-all ${btnClass}" title="${cls.title}">${isDone && !isActive ? '<i class="fas fa-check mr-1"></i>' : ''} Clase ${idx + 1}</button>`;
    }).join('');
}

function _loadVideo(cid, cls, user, index) {
    const titleEl = document.getElementById('player-title');
    const durEl = document.getElementById('player-dur');
    const idxEl = document.getElementById('player-idx');
    if(titleEl) titleEl.innerText = cls.title;
    if(durEl) durEl.innerText = cls.duration || '--';
    if(idxEl) idxEl.innerText = index;

    const btn = document.getElementById('btn-complete-class');
    if(btn) {
        const moduleId = `${cid}_${cls.id}`;
        const isDone = (user.completedModules || []).includes(moduleId);
        
        if (isDone) {
            btn.className = "bg-green-50 text-green-600 border border-green-200 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-default";
            btn.innerHTML = `<span>Completada</span> <i class="fas fa-check-circle"></i>`;
            btn.disabled = true;
            btn.onclick = null;
        } else {
            btn.className = "bg-black text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 active:scale-95";
            btn.innerHTML = `<span>Marcar como vista</span> <i class="fas fa-check"></i>`;
            btn.disabled = false;
            
            btn.onclick = async () => {
                try {
                    await window.F.updateDoc(window.F.doc(window.F.db, "users", user.uid), { completedModules: window.F.arrayUnion(moduleId) });
                    App.ui.toast("¡Clase completada!", "success");
                    
                    if(!user.completedModules) user.completedModules = [];
                    user.completedModules.push(moduleId);
                    App.state.currentUser = user;

                    btn.className = "bg-green-50 text-green-600 border border-green-200 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-default";
                    btn.innerHTML = `<span>Completada</span> <i class="fas fa-check-circle"></i>`;
                    btn.disabled = true;
                    
                    const listBtn = document.querySelector(`#playlist-container div[onclick*='${cls.id}'] div`);
                    if(listBtn) {
                        listBtn.className = listBtn.className.replace('bg-white text-black', 'bg-green-100 text-green-600');
                        listBtn.innerHTML = '<i class="fas fa-check"></i>';
                    }
                } catch(e) { console.error(e); }
            };
        }
    }

    let videoId = '';
    if (cls.videoUrl) {
        if (cls.videoUrl.includes('v=')) videoId = cls.videoUrl.split('v=')[1];
        else if (cls.videoUrl.includes('youtu.be')) videoId = cls.videoUrl.split('/').pop();
        else videoId = cls.videoUrl;
        
        if (videoId && videoId.includes('&')) videoId = videoId.split('&')[0];
    }

    const savedTime = (user.videoProgress && user.videoProgress[videoId]) || 0;
    
    if (App.lms.player) { App.lms.player.destroy(); App.lms.player = null; }
    if (App.lms.progressInterval) clearInterval(App.lms.progressInterval);

    if(window.YT && window.YT.Player && videoId) {
        App.lms.player = new YT.Player('youtube-player-placeholder', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'rel': 0, 'modestbranding': 1, 'start': Math.floor(savedTime) },
            events: {
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        App.lms.progressInterval = setInterval(() => {
                            if(App.lms.player && App.lms.player.getCurrentTime) {
                                // Save progress logic here
                            }
                        }, 10000);
                    } else {
                        if (App.lms.progressInterval) clearInterval(App.lms.progressInterval);
                    }
                }
            }
        });
    }
}

function _toggleModal(prefix, show) {
    const m = document.getElementById(`${prefix}-modal`);
    const p = document.getElementById(`${prefix}-panel`);
    const b = document.getElementById(`${prefix}-backdrop`);
    
    if(!m) return;

    if(show) {
        m.classList.remove('hidden'); 
        requestAnimationFrame(() => {
            p.classList.remove('scale-95', 'opacity-0'); 
            p.classList.add('scale-100', 'opacity-100'); 
            b.classList.remove('opacity-0');
        });
    } else {
        p.classList.remove('scale-100', 'opacity-100'); 
        p.classList.add('scale-95', 'opacity-0'); 
        b.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    }
}

function _renderFullScreenCourseManager() {
    // FIX: Agregado 'pl-20' al contenedor principal para respetar el sidebar que está debajo
    return `
    <div id="full-cms-container" class="fixed inset-0 z-[60] bg-[#FAFAFA] hidden flex flex-col pl-0 md:pl-20">
        <!-- HEADER CMS -->
        <header class="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm sticky top-0 z-10">
            <div class="flex items-center gap-4">
                <button onclick="App.lms.closeCourseManager()" class="flex items-center gap-2 text-gray-500 hover:text-black transition-colors font-bold text-sm">
                    <i class="fas fa-arrow-left"></i> Volver al Curso
                </button>
                <div class="h-6 w-px bg-gray-200"></div>
                <h2 class="text-lg font-bold text-gray-900">Gestor de Contenido</h2>
            </div>
            <button onclick="App.lms.saveCourseDetails()" id="btn-save-mgr" class="bg-black text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-gray-800 transition-colors shadow-lg flex items-center gap-2">
                <i class="fas fa-save"></i> Guardar Todo
            </button>
        </header>

        <!-- CONTENT LAYOUT (2 COLUMNS) -->
        <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            <!-- LEFT PANEL: SETTINGS (350px Fixed) -->
            <div class="w-full md:w-[350px] bg-white border-r border-gray-200 p-6 overflow-y-auto">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Configuración General</h3>
                <input type="hidden" id="mgr-course-id">
                
                <div class="space-y-6">
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-900 uppercase">Título del Curso</label>
                        <input type="text" id="mgr-title" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black focus:bg-white transition-colors text-sm font-medium">
                    </div>
                    
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-900 uppercase">Descripción</label>
                        <textarea id="mgr-desc" rows="4" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black focus:bg-white resize-none transition-colors text-sm"></textarea>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-900 uppercase">Imagen Portada (URL)</label>
                        <input type="text" id="mgr-img" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black focus:bg-white transition-colors text-xs font-mono text-gray-600">
                    </div>
                </div>
            </div>

            <!-- RIGHT PANEL: CURRICULUM (Flexible) -->
            <div class="flex-1 bg-[#FAFAFA] p-6 md:p-10 overflow-y-auto">
                <div class="max-w-3xl mx-auto">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-bold text-gray-900">Plan de Estudios</h3>
                        <span class="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-500">Drag & Drop (Próximamente)</span>
                    </div>

                    <!-- CLASS LIST -->
                    <div id="mgr-class-list" class="space-y-3">
                        <!-- Dynamic Content -->
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function _renderAddClassToCourseModal() {
    return `
    <div id="add-class-modal" class="fixed inset-0 z-[210] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity opacity-0" id="add-class-backdrop" onclick="App.lms.closeAddClassToCourseModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none pl-0 md:pl-20">
            <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto border border-gray-100 z-[211]" id="add-class-panel">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl">
                    <h2 class="text-lg font-bold text-gray-900">Agregar Nueva Clase</h2>
                    <button onclick="App.lms.closeAddClassToCourseModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-8 space-y-5">
                    <input type="hidden" id="add-class-course-id">
                    <div class="space-y-1"><label class="text-xs font-bold uppercase text-gray-500">Título</label><input type="text" id="class-title" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1"><label class="text-xs font-bold uppercase text-gray-500">Duración</label><input type="text" id="class-dur" placeholder="10:00" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                        <div class="space-y-1"><label class="text-xs font-bold uppercase text-gray-500">Video URL</label><input type="text" id="class-url" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black" placeholder="ID YouTube"></div>
                    </div>
                </div>
                <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
                    <button onclick="App.lms.saveClassFromPopUp()" id="btn-save-class" class="bg-black text-white px-6 py-3.5 rounded-xl font-bold text-sm w-full hover:bg-gray-800 shadow-lg">Publicar Clase</button>
                </div>
            </div>
        </div>
    </div>`;
}

function _renderCreateCourseModal() {
    return `
    <div id="create-course-modal" class="fixed inset-0 z-[100] hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" id="create-course-backdrop" onclick="App.lms.closeCreateCourseModal()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 pointer-events-auto z-[101]" id="create-course-panel">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl">
                    <h2 class="text-lg font-bold text-gray-900">Crear Nuevo Curso</h2>
                    <button onclick="App.lms.closeCreateCourseModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="course-cid">
                    <div class="space-y-1"><label class="text-xs font-bold uppercase text-gray-500">Título</label><input type="text" id="course-title" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                    <div class="space-y-1"><label class="text-xs font-bold uppercase text-gray-500">Descripción</label><textarea id="course-desc" rows="2" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black resize-none"></textarea></div>
                    <div class="space-y-1"><label class="text-xs font-bold uppercase text-gray-500">Imagen URL</label><input type="text" id="course-img" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black"></div>
                </div>
                <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
                    <button onclick="App.lms.saveCourse()" id="btn-create-course-final" class="bg-black text-white px-6 py-3.5 rounded-xl font-bold text-sm w-full shadow-lg">Crear Curso</button>
                </div>
            </div>
        </div>
    </div>`;
}