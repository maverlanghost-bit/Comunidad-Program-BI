/**
 * community.lms.js (V13.0 - FINAL PRODUCTION READY)
 * Motor LMS Completo: Catálogo, Reproductor, Progreso y Administración Total.
 * Código 100% explícito sin omisiones.
 */

window.App = window.App || {};
window.App.lms = window.App.lms || {};

// ============================================================================
// 1. RENDERIZADOR DEL CATÁLOGO (VISTA DE CURSOS)
// ============================================================================
window.App.lms.renderCatalog = (container, community, user, isAdmin) => {
    const courses = community.courses || [];
    
    // FIX CRÍTICO: Asegurar ID de comunidad
    const commId = community.id || (window.location.hash.split('/')[1]); 
    
    // Inyección de Modales de Administración (Solo si es Admin y no existen)
    if (isAdmin) {
        if (!document.getElementById('create-course-modal')) {
            document.body.insertAdjacentHTML('beforeend', _renderCreateCourseModalLocal());
        }
        if (!document.getElementById('edit-course-modal')) {
            document.body.insertAdjacentHTML('beforeend', _renderEditCourseModalLocal());
        }
    }

    container.innerHTML = `
        <div class="max-w-7xl mx-auto py-8 animate-fade-in px-6 lg:px-8">
            
            <!-- HEADER DE SECCIÓN -->
            <div class="flex flex-col md:flex-row justify-between items-end mb-10 gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h2 class="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Rutas de Aprendizaje</h2>
                    <p class="text-slate-500 text-sm mt-2 font-medium">
                        ${courses.length} Cursos disponibles para dominar nuevas habilidades.
                    </p>
                </div>
                ${isAdmin ? `
                <button onclick="App.lms.openCreateCourseModal('${commId}')" 
                        class="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-[#1890ff] hover:shadow-blue-500/30 transition-all flex items-center gap-2 transform active:scale-95">
                    <i class="fas fa-plus-circle"></i> <span>Crear Nuevo Curso</span>
                </button>` : ''}
            </div>

            <!-- GRID DE CURSOS -->
            ${courses.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-24">
                ${courses.map(course => {
                    // Lógica de Progreso
                    const totalClasses = course.classes ? course.classes.length : 0;
                    const completedInCourse = (course.classes || []).filter(cls => 
                        (user.completedModules || []).includes(`${commId}_${cls.id}`)
                    ).length;
                    const progress = totalClasses === 0 ? 0 : Math.round((completedInCourse / totalClasses) * 100);
                    
                    return `
                    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col h-full relative" 
                         onclick="window.location.hash='#community/${commId}/clases/${course.id}'">
                        
                        <!-- PORTADA DEL CURSO -->
                        <div class="h-48 relative overflow-hidden bg-slate-100 border-b border-slate-50">
                            ${course.image 
                                ? `<img src="${course.image}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter group-hover:brightness-105">` 
                                : `<div class="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400"><i class="fas fa-image text-3xl"></i></div>`
                            }
                            
                            <!-- Gradiente superpuesto -->
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                            
                            <!-- Barra de Progreso Visual -->
                            ${progress > 0 ? `
                                <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-700/30 backdrop-blur-sm">
                                    <div class="h-full bg-[#1890ff] shadow-[0_0_10px_rgba(24,144,255,0.8)]" style="width: ${progress}%"></div>
                                </div>
                            ` : ''}

                            <!-- Badge de Conteo -->
                            <div class="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/20 shadow-sm">
                                ${totalClasses} Clases
                            </div>
                        </div>

                        <!-- INFO DEL CURSO -->
                        <div class="p-6 flex-1 flex flex-col relative">
                            <h3 class="font-heading font-bold text-lg text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-[#1890ff] transition-colors">
                                ${course.title}
                            </h3>
                            <p class="text-xs text-slate-500 mb-6 line-clamp-3 flex-1 leading-relaxed">
                                ${course.description || 'Sin descripción disponible.'}
                            </p>
                            
                            <!-- Footer de la Tarjeta -->
                            <div class="flex items-center justify-between mt-auto border-t border-slate-50 pt-4">
                                <span class="text-[10px] font-bold uppercase tracking-wider ${progress === 100 ? 'text-green-600' : 'text-slate-400'}">
                                    ${progress === 100 ? '<i class="fas fa-check-circle mr-1"></i> Completado' : (progress > 0 ? `${progress}% Completado` : 'No Iniciado')}
                                </span>
                                <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#1890ff] group-hover:text-white transition-all shadow-sm">
                                    <i class="fas fa-arrow-right text-xs"></i>
                                </div>
                            </div>

                            <!-- BOTONES DE ADMINISTRACIÓN (FLOTANTES) -->
                            ${isAdmin ? `
                            <div class="absolute top-3 left-3 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="event.stopPropagation(); App.lms.openEditCourseModal('${commId}', '${course.id}')" 
                                        class="w-8 h-8 bg-white/90 text-slate-600 rounded-lg flex items-center justify-center hover:bg-white hover:text-[#1890ff] shadow-lg backdrop-blur-sm transition-colors" title="Editar Curso">
                                    <i class="fas fa-pen text-xs"></i>
                                </button>
                                <button onclick="event.stopPropagation(); App.lms.deleteCourse('${course.id}', '${commId}')" 
                                        class="w-8 h-8 bg-white/90 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white shadow-lg backdrop-blur-sm transition-colors" title="Eliminar Curso">
                                    <i class="fas fa-trash text-xs"></i>
                                </button>
                            </div>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>` : `
            
            <!-- ESTADO VACÍO -->
            <div class="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 text-3xl shadow-sm ring-4 ring-slate-100">
                    <i class="fas fa-box-open"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">Catálogo Vacío</h3>
                <p class="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                    ${isAdmin ? 'Comienza creando tu primer curso arriba para que tus estudiantes aprendan.' : 'El administrador aún no ha publicado cursos.'}
                </p>
                ${isAdmin ? `<button onclick="App.lms.openCreateCourseModal('${commId}')" class="text-[#1890ff] font-bold text-sm hover:underline">Crear Curso Ahora</button>` : ''}
            </div>`}
        </div>
    `;
};

// ============================================================================
// 2. REPRODUCTOR DE VIDEO (PLAYER CINEMÁTICO REDISEÑADO)
// ============================================================================
window.App.lms.renderPlayer = (container, community, courseId, user, isAdmin) => {
    const course = (community.courses || []).find(c => c.id === courseId);
    
    // Validación de seguridad
    if (!course) {
        return App.ui.toast("Curso no encontrado", "error");
    }

    const classes = course.classes || [];
    const commId = community.id || (window.location.hash.split('/')[1]); 
    
    // Inyectar modales de clase si es admin y no existen
    if (isAdmin) {
        if (!document.getElementById('add-class-modal')) {
            document.body.insertAdjacentHTML('beforeend', _renderAddClassModalLocal());
        }
    }

    // NUEVO DISEÑO: Contenedor unificado en lugar de pantalla dividida full-width
    container.innerHTML = `
        <div class="min-h-full bg-[#F8FAFC] animate-enter p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <div class="max-w-[1600px] mx-auto">
                
                <!-- Barra de Navegación (Breadcrumbs) -->
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.location.hash='#community/${commId}/clases'" class="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#1890ff] hover:border-[#1890ff] transition-all flex items-center justify-center shadow-sm">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-lg font-heading font-bold text-slate-900">${course.title}</h2>
                        <p class="text-xs text-slate-500 font-medium">${classes.length} lecciones en total</p>
                    </div>
                </div>

                <div class="flex flex-col xl:flex-row gap-8 items-start">
                    
                    <!-- COLUMNA IZQUIERDA: VIDEO + INFO (Flexible) -->
                    <div class="w-full xl:flex-1 space-y-6">
                        
                        <!-- Contenedor Video (Aspect Ratio + Rounded) -->
                        <div class="w-full bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 relative aspect-video group">
                            <!-- Placeholder -->
                            <div id="video-placeholder" class="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900 z-0">
                                <i class="fas fa-play-circle text-6xl opacity-50 mb-4 animate-pulse"></i>
                                <span class="text-xs font-bold uppercase tracking-widest opacity-70">Cargando Player...</span>
                            </div>
                            <!-- YouTube Iframe -->
                            <div id="youtube-player" class="absolute inset-0 w-full h-full z-10"></div>
                        </div>

                        <!-- Información de la Clase -->
                        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div class="flex-1">
                                    <div class="flex items-center gap-3 mb-2">
                                        <span id="player-label" class="inline-block px-2.5 py-1 rounded-lg bg-[#1890ff]/10 text-[#1890ff] text-[10px] font-bold uppercase tracking-wide border border-[#1890ff]/20">
                                            Cargando...
                                        </span>
                                    </div>
                                    <h1 id="player-title" class="text-2xl font-heading font-bold text-slate-900 mb-3 leading-tight">
                                        Selecciona una clase
                                    </h1>
                                    <p id="player-desc" class="text-slate-500 text-sm leading-relaxed">
                                        Selecciona una lección del menú de la derecha para comenzar.
                                    </p>
                                </div>
                                
                                <div class="flex flex-col gap-3 shrink-0">
                                    <button id="btn-complete-class" onclick="App.lms.markClassComplete('${commId}')" disabled 
                                            class="px-6 py-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-not-allowed w-full md:w-auto">
                                        <i class="far fa-circle"></i> <span>Marcar Vista</span>
                                    </button>
                                    
                                    ${isAdmin ? `
                                    <button onclick="App.lms.openAddClassModal('${commId}', '${course.id}')" 
                                            class="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors shadow-lg flex items-center justify-center gap-2 w-full md:w-auto">
                                        <i class="fas fa-plus"></i> <span>Agregar Clase</span>
                                    </button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- COLUMNA DERECHA: PLAYLIST (Tarjeta Flotante, NO Fixed) -->
                    <div class="w-full xl:w-[400px] shrink-0">
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                            
                            <!-- Header Playlist -->
                            <div class="p-5 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
                                <div class="flex justify-between items-center mb-3">
                                    <h3 class="font-bold text-xs text-slate-500 uppercase tracking-widest">Contenido del Curso</h3>
                                    <span class="text-[10px] font-bold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md shadow-sm" id="course-progress-badge">0%</span>
                                </div>
                                
                                <!-- Barra Progreso -->
                                <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1">
                                    <div id="course-progress-bar" class="bg-[#1890ff] h-full rounded-full transition-all duration-700 ease-out" style="width: 0%"></div>
                                </div>
                                <div class="text-right text-[9px] font-bold text-slate-400 mt-1">
                                    <span id="course-completed-count">0</span>/${classes.length} Completadas
                                </div>
                            </div>
                            
                            <!-- Lista Scrollable (Altura Máxima) -->
                            <div class="overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-[600px]" id="playlist-container">
                                ${classes.length === 0 ? `<div class="py-12 text-center text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded-xl m-2">No hay clases publicadas.</div>` : ''}
                                
                                ${classes.map((cls, idx) => {
                                    const isCompleted = (user.completedModules || []).includes(`${commId}_${cls.id}`);
                                    return `
                                        <div class="relative group">
                                            <button onclick="App.lms.playClass('${commId}', '${course.id}', '${cls.id}')" 
                                                id="btn-class-${cls.id}"
                                                class="w-full p-3 rounded-xl flex items-start gap-3 text-left hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 group-hover:shadow-sm">
                                                
                                                <!-- Icono Estado -->
                                                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 transition-all ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}">
                                                    ${isCompleted ? '<i class="fas fa-check"></i>' : (idx + 1)}
                                                </div>
                                                
                                                <div class="min-w-0 flex-1">
                                                    <h4 class="text-xs font-bold text-slate-700 group-hover:text-[#1890ff] transition-colors line-clamp-2 leading-snug">${cls.title}</h4>
                                                    <p class="text-[9px] text-slate-400 mt-1 flex items-center gap-1"><i class="far fa-play-circle"></i> Video</p>
                                                </div>
                                            </button>

                                            <!-- Botón Admin Borrar Clase (Solo Hover) -->
                                            ${isAdmin ? `
                                            <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                                <button onclick="event.stopPropagation(); App.lms.deleteClass('${course.id}', '${cls.id}', '${commId}')" 
                                                        class="w-7 h-7 bg-white border border-red-100 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-50 cursor-pointer shadow-sm" title="Borrar Clase">
                                                    <i class="fas fa-trash text-[10px]"></i>
                                                </button>
                                            </div>` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inicializar lógica de Auto-Play
    setTimeout(() => {
        _updateCourseProgressUI(commId, classes, user);
        
        if (classes.length > 0) {
            const firstIncomplete = classes.find(c => !(user.completedModules || []).includes(`${commId}_${c.id}`));
            const target = firstIncomplete || classes[0];
            
            // Verificar hash por si se pidió una clase específica
            const hashParts = window.location.hash.split('/');
            const requestedClassId = hashParts.length > 4 ? hashParts[4] : target.id;
            
            // Validar existencia
            const finalTargetId = classes.find(c => c.id === requestedClassId) ? requestedClassId : target.id;
            
            App.lms.playClass(commId, course.id, finalTargetId);
        }
    }, 150);
};

// ============================================================================
// 3. LOGICA REPRODUCTOR & PROGRESO
// ============================================================================
let _currentClassId = null;

// --- REPRODUCIR CLASE ---
window.App.lms.playClass = (cid, courseId, classId) => {
    const comm = App.state.cache.communities[cid];
    const course = comm.courses.find(c => c.id === courseId);
    const cls = course.classes.find(c => c.id === classId);
    const idx = course.classes.indexOf(cls) + 1;

    if (!cls) return;

    _currentClassId = classId;

    // Actualizar UI Texto
    const titleEl = document.getElementById('player-title');
    const descEl = document.getElementById('player-desc');
    const labelEl = document.getElementById('player-label');
    const btn = document.getElementById('btn-complete-class');

    if(titleEl) titleEl.innerText = cls.title;
    if(descEl) descEl.innerText = cls.description || "Mira el video completo para avanzar. ¡Tú puedes!";
    if(labelEl) labelEl.innerText = `Lección ${idx} de ${course.classes.length}`;

    // Actualizar Playlist (Resaltado activo)
    document.querySelectorAll('[id^="btn-class-"]').forEach(b => {
        b.classList.remove('bg-blue-50', 'ring-1', 'ring-[#1890ff]', 'border-blue-200', 'shadow-sm');
        b.classList.add('border-transparent');
    });
    const activeBtn = document.getElementById(`btn-class-${classId}`);
    if(activeBtn) {
        activeBtn.classList.remove('border-transparent');
        activeBtn.classList.add('bg-blue-50', 'ring-1', 'ring-[#1890ff]', 'border-blue-200', 'shadow-sm');
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Configurar Botón "Marcar como Vista"
    const user = App.state.currentUser;
    const isCompleted = (user.completedModules || []).includes(`${cid}_${classId}`);
    
    if (btn) {
        btn.disabled = false;
        if (isCompleted) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Lección Completada</span>';
            btn.className = "px-8 py-3.5 rounded-xl bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center gap-2 cursor-default shadow-none border border-green-200 w-full md:w-auto";
        } else {
            btn.innerHTML = '<i class="far fa-circle"></i> <span>Marcar como Vista</span>';
            btn.className = "px-8 py-3.5 rounded-xl bg-[#1890ff] hover:bg-blue-600 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer transform active:scale-95 w-full md:w-auto";
        }
    }

    // Cargar Video YouTube
    const placeholder = document.getElementById('video-placeholder');
    if(placeholder) placeholder.classList.add('hidden');

    let videoId = cls.videoUrl;
    // Extractor robusto de ID
    if (videoId.includes('v=')) videoId = videoId.split('v=')[1].split('&')[0];
    else if (videoId.includes('youtu.be/')) videoId = videoId.split('youtu.be/')[1];
    else if (videoId.includes('embed/')) videoId = videoId.split('embed/')[1];

    if (window.player && typeof window.player.loadVideoById === 'function') {
        window.player.loadVideoById(videoId);
    } else {
        window.player = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'rel': 0, 'modestbranding': 1 },
            events: {}
        });
    }
};

// --- MARCAR CLASE COMO VISTA ---
window.App.lms.markClassComplete = async (cid) => {
    if (!_currentClassId) return;
    const uid = App.state.currentUser.uid;
    const moduleId = `${cid}_${_currentClassId}`; // ID único compuesto

    const btn = document.getElementById('btn-complete-class');
    if(btn) {
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
        btn.disabled = true;
    }

    try {
        // Guardar en Firestore
        await window.F.updateDoc(window.F.doc(window.F.db, "users", uid), {
            completedModules: window.F.arrayUnion(moduleId)
        });

        // Actualizar Estado Local
        if(!App.state.currentUser.completedModules) App.state.currentUser.completedModules = [];
        if(!App.state.currentUser.completedModules.includes(moduleId)) {
            App.state.currentUser.completedModules.push(moduleId);
        }

        App.ui.toast("¡Excelente! Progreso guardado.", "success");
        
        // Actualizar UI
        const comm = App.state.cache.communities[cid];
        let currentCourse = null;
        for(const c of comm.courses) {
            if(c.classes.find(cl => cl.id === _currentClassId)) {
                currentCourse = c;
                break;
            }
        }
        
        if (currentCourse) {
            _updateCourseProgressUI(cid, currentCourse.classes, App.state.currentUser);
            const activeBtn = document.getElementById(`btn-class-${_currentClassId}`);
            if(activeBtn) {
                // Actualizar icono en playlist
                const iconDiv = activeBtn.querySelector('div:first-child');
                if(iconDiv) {
                    iconDiv.className = "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 transition-all bg-green-100 text-green-600";
                    iconDiv.innerHTML = '<i class="fas fa-check"></i>';
                }
            }
        }

        if(btn) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Lección Completada</span>';
            btn.className = "px-8 py-3.5 rounded-xl bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center gap-2 cursor-default shadow-none border border-green-200 w-full md:w-auto";
        }

    } catch (e) {
        console.error(e);
        App.ui.toast("Error al guardar progreso", "error");
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = 'Reintentar';
        }
    }
};

function _updateCourseProgressUI(cid, classes, user) {
    const total = classes.length;
    const completedCount = classes.filter(cl => (user.completedModules || []).includes(`${cid}_${cl.id}`)).length;
    const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

    const bar = document.getElementById('course-progress-bar');
    const badge = document.getElementById('course-progress-badge');
    const count = document.getElementById('course-completed-count');
    
    if(bar) bar.style.width = `${pct}%`;
    if(badge) badge.innerText = `${pct}%`;
    if(count) count.innerText = completedCount;
}

// ============================================================================
// 4. FUNCIONES DE ADMINISTRACIÓN (CRUD CURSOS/CLASES)
// ============================================================================

// --- GESTIÓN DE CURSOS ---
window.App.lms.openCreateCourseModal = (cid) => {
    const m = document.getElementById('create-course-modal');
    if(!m) return;
    document.getElementById('course-cid').value = cid;
    m.classList.remove('hidden');
};

window.App.lms.closeCreateCourseModal = () => {
    document.getElementById('create-course-modal').classList.add('hidden');
};

window.App.lms.saveCourse = async () => {
    const cid = document.getElementById('course-cid').value;
    const title = document.getElementById('course-title').value;
    const desc = document.getElementById('course-desc').value;
    const img = document.getElementById('course-img').value;
    const btn = document.getElementById('btn-save-course');

    if(!title) return App.ui.toast("El título es obligatorio", "error");

    btn.innerHTML = "Guardando..."; btn.disabled = true;

    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses || [];

        const newCourse = {
            id: 'c_' + Date.now(),
            title, description: desc, image: img,
            classes: [], createdAt: new Date().toISOString()
        };

        courses.push(newCourse);
        await window.F.updateDoc(commRef, { courses });
        
        App.ui.toast("Curso creado exitosamente", "success");
        App.lms.closeCreateCourseModal();
        // Recargar solo la vista
        App.renderCommunity(cid, 'clases'); 
    } catch(e) {
        console.error(e);
        App.ui.toast("Error al crear curso", "error");
    } finally {
        btn.innerHTML = "Crear Curso"; btn.disabled = false;
    }
};

window.App.lms.openEditCourseModal = async (cid, courseId) => {
    const comm = App.state.cache.communities[cid];
    const course = comm.courses.find(c => c.id === courseId);
    
    if(!course) return;

    const m = document.getElementById('edit-course-modal');
    document.getElementById('edit-course-cid').value = cid;
    document.getElementById('edit-course-id').value = courseId;
    document.getElementById('edit-course-title').value = course.title;
    document.getElementById('edit-course-desc').value = course.description || '';
    document.getElementById('edit-course-img').value = course.image || '';
    
    m.classList.remove('hidden');
};

window.App.lms.closeEditCourseModal = () => {
    document.getElementById('edit-course-modal').classList.add('hidden');
};

window.App.lms.updateCourse = async () => {
    const cid = document.getElementById('edit-course-cid').value;
    const courseId = document.getElementById('edit-course-id').value;
    const title = document.getElementById('edit-course-title').value;
    const desc = document.getElementById('edit-course-desc').value;
    const img = document.getElementById('edit-course-img').value;

    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses;
        const cIdx = courses.findIndex(c => c.id === courseId);
        
        if (cIdx > -1) {
            courses[cIdx] = { ...courses[cIdx], title, description: desc, image: img };
            await window.F.updateDoc(commRef, { courses });
            App.ui.toast("Curso actualizado", "success");
            App.lms.closeEditCourseModal();
            App.renderCommunity(cid, 'clases');
        }
    } catch(e) { console.error(e); App.ui.toast("Error al editar", "error"); }
};

window.App.lms.deleteCourse = async (courseId, cid) => {
    if(!confirm("⚠️ ¿Estás seguro? Se borrarán todas las clases de este curso.")) return;
    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses || [];
        
        courses = courses.filter(c => c.id !== courseId);
        await window.F.updateDoc(commRef, { courses });
        
        App.ui.toast("Curso eliminado", "success");
        App.renderCommunity(cid, 'clases');
    } catch(e) { App.ui.toast("Error al eliminar", "error"); }
};

// --- GESTIÓN DE CLASES ---
window.App.lms.openAddClassModal = (cid, courseId) => {
    const m = document.getElementById('add-class-modal');
    if(m) {
        document.getElementById('ac-cid').value = cid;
        document.getElementById('ac-courseid').value = courseId;
        m.classList.remove('hidden');
    }
};

window.App.lms.closeAddClassModal = () => {
    document.getElementById('add-class-modal').classList.add('hidden');
};

window.App.lms.saveClass = async () => {
    const cid = document.getElementById('ac-cid').value;
    const courseId = document.getElementById('ac-courseid').value;
    const title = document.getElementById('ac-title').value;
    const url = document.getElementById('ac-url').value;
    
    if(!title || !url) return App.ui.toast("Datos incompletos", "error");

    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses;
        const cIdx = courses.findIndex(c => c.id === courseId);
        
        if(cIdx === -1) throw new Error("Curso no encontrado");

        courses[cIdx].classes.push({
            id: 'cl_' + Date.now(),
            title, videoUrl: url,
            duration: '10:00'
        });

        await window.F.updateDoc(commRef, { courses });
        App.ui.toast("Clase agregada", "success");
        App.lms.closeAddClassModal();
        App.renderCommunity(cid, 'clases', courseId); // Recargar en modo player
    } catch(e) {
        App.ui.toast("Error al guardar clase", "error");
    }
};

window.App.lms.deleteClass = async (courseId, classId, cid) => {
    if(!confirm("¿Borrar esta clase?")) return;
    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses;
        const cIdx = courses.findIndex(c => c.id === courseId);
        
        if (cIdx > -1) {
            courses[cIdx].classes = courses[cIdx].classes.filter(c => c.id !== classId);
            await window.F.updateDoc(commRef, { courses });
            App.ui.toast("Clase eliminada", "success");
            // Si estábamos viendo esa clase, volver al catálogo o a otra clase
            if(_currentClassId === classId) {
                window.location.hash = `#community/${cid}/clases`;
            } else {
                App.renderCommunity(cid, 'clases', courseId);
            }
        }
    } catch(e) { App.ui.toast("Error al eliminar", "error"); }
};

// ============================================================================
// 5. MODALES LOCALES (PLANTILLAS HTML)
// ============================================================================

function _renderCreateCourseModalLocal() {
    return `
    <div id="create-course-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="font-heading font-bold text-lg text-slate-900">Nuevo Curso</h3>
                <button onclick="App.lms.closeCreateCourseModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <input type="hidden" id="course-cid">
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 ml-1">Título del Curso</label>
                    <input type="text" id="course-title" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-bold">
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 ml-1">Descripción</label>
                    <textarea id="course-desc" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm resize-none h-24"></textarea>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 ml-1">Imagen de Portada (URL)</label>
                    <input type="text" id="course-img" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white transition-all text-sm" placeholder="https://...">
                </div>
                <button onclick="App.lms.saveCourse()" id="btn-save-course" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold mt-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 active:scale-95">Crear Curso</button>
            </div>
        </div>
    </div>`;
}

function _renderEditCourseModalLocal() {
    return `
    <div id="edit-course-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="font-heading font-bold text-lg text-slate-900">Editar Curso</h3>
                <button onclick="App.lms.closeEditCourseModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <input type="hidden" id="edit-course-cid">
                <input type="hidden" id="edit-course-id">
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 ml-1">Título</label>
                    <input type="text" id="edit-course-title" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] font-bold text-sm">
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 ml-1">Descripción</label>
                    <textarea id="edit-course-desc" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] text-sm h-24 resize-none"></textarea>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 ml-1">Imagen URL</label>
                    <input type="text" id="edit-course-img" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] text-sm">
                </div>
                <button onclick="App.lms.updateCourse()" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold mt-2 hover:bg-blue-600 transition-colors">Guardar Cambios</button>
            </div>
        </div>
    </div>`;
}

function _renderAddClassModalLocal() {
    return `
    <div id="add-class-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="font-heading font-bold text-lg text-slate-900">Agregar Clase</h3>
                <button onclick="App.lms.closeAddClassModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <input type="hidden" id="ac-cid"><input type="hidden" id="ac-courseid">
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 ml-1">Título de la Clase</label>
                    <input type="text" id="ac-title" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white transition-colors text-sm font-bold">
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold uppercase text-slate-500 ml-1">Video URL (YouTube)</label>
                    <input type="text" id="ac-url" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white transition-colors text-sm" placeholder="ID o Enlace completo">
                </div>
                <button onclick="App.lms.saveClass()" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold mt-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 active:scale-95">Guardar Clase</button>
            </div>
        </div>
    </div>`;
}