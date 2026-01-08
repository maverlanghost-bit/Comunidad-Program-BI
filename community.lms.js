/**
 * community.lms.js (V25.0 - SUPER CLASS 3.0 PRODUCTION)
 * Motor LMS Completo: Catálogo, Player Estándar, MODO SUPER CLASE (IDE + NOTAS) y Administración.
 * * CARACTERÍSTICAS COMPLETAS:
 * - Catálogo: Grid visual con progreso y badges.
 * - Player: Reproductor de video con lista de reproducción y seguimiento.
 * - Super Clase: Entorno de desarrollo (IDE) redimensionable con notas y consola.
 * - Administración: CRUD total de cursos y clases.
 */

window.App = window.App || {};
window.App.lms = window.App.lms || {};

// Variables de estado interno para el módulo LMS
let _currentClassId = null;
let _scIsResizing = false;
let _editorInstance = null; // Instancia de Monaco Editor

// ============================================================================
// 1. RENDERIZADOR DEL CATÁLOGO (VISTA DE CURSOS)
// ============================================================================
window.App.lms.renderCatalog = (container, community, user, isAdmin) => {
    const courses = community.courses || [];
    const commId = community.id || (window.location.hash.split('/')[1]);

    // Inyectar modales de administración si es necesario (Lazy Injection)
    if (isAdmin) {
        if (!document.getElementById('create-course-modal')) {
            document.body.insertAdjacentHTML('beforeend', _renderCreateCourseModalLocal());
        }
        if (!document.getElementById('edit-course-modal')) {
            document.body.insertAdjacentHTML('beforeend', _renderEditCourseModalLocal());
        }
    }

    container.innerHTML = `
        <div class="max-w-7xl mx-auto py-8 animate-fade-in px-4 lg:px-8">
            <!-- Header Sección -->
            <div class="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-gray-200 dark:border-slate-800 pb-6 transition-colors">
                <div>
                    <h2 class="text-2xl md:text-3xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight">Rutas de Aprendizaje</h2>
                    <p class="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                        Explora los ${courses.length} cursos disponibles en esta comunidad.
                    </p>
                </div>
                ${isAdmin ? `
                <button onclick="App.lms.openCreateCourseModal('${commId}')" 
                        class="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center gap-2 active:scale-95">
                    <i class="fas fa-plus-circle"></i> <span>Crear Nuevo Curso</span>
                </button>` : ''}
            </div>

            <!-- Grid de Cursos -->
            ${courses.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                ${courses.map(course => {
                    // Cálculo de Progreso
                    const total = course.classes ? course.classes.length : 0;
                    const completed = (course.classes || []).filter(cls => 
                        (user.completedModules || []).includes(`${commId}_${cls.id}`)
                    ).length;
                    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

                    return `
                    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-[#1890ff]/30 transition-all duration-300 group cursor-pointer flex flex-col h-full relative" 
                         onclick="window.location.hash='#community/${commId}/clases/${course.id}'">
                        
                        <!-- Portada -->
                        <div class="h-44 relative overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800">
                            ${course.image 
                                ? `<img src="${course.image}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">` 
                                : `<div class="w-full h-full flex items-center justify-center text-slate-400"><i class="fas fa-image text-3xl"></i></div>`
                            }
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                            
                            <!-- Badges -->
                            <div class="absolute top-3 right-3 flex gap-2">
                                ${course.isSuperClass ? `<span class="bg-indigo-600/90 backdrop-blur text-white px-2 py-1 rounded-lg text-[10px] font-bold border border-white/20 shadow-sm"><i class="fas fa-code mr-1"></i> IDE</span>` : ''}
                                <span class="bg-black/40 backdrop-blur text-white px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/20 shadow-sm">${total} Clases</span>
                            </div>
                            
                            <!-- Barra de Progreso Visual -->
                            ${progress > 0 ? `<div class="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-700/30 backdrop-blur-sm"><div class="h-full bg-[#1890ff] shadow-[0_0_10px_rgba(24,144,255,0.8)]" style="width: ${progress}%"></div></div>` : ''}
                        </div>

                        <!-- Información -->
                        <div class="p-5 flex-1 flex flex-col relative">
                            <h3 class="font-heading font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-[#1890ff] transition-colors">${course.title}</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-3 flex-1">${course.description || 'Sin descripción.'}</p>
                            
                            <div class="flex items-center justify-between mt-auto border-t border-gray-100 dark:border-slate-800/50 pt-4">
                                <span class="text-[10px] font-bold uppercase tracking-wider ${progress === 100 ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}">
                                    ${progress === 100 ? '<i class="fas fa-check-circle mr-1"></i> Completado' : (progress > 0 ? `${progress}% Completado` : 'No Iniciado')}
                                </span>
                                <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-300 group-hover:bg-[#1890ff] group-hover:text-white transition-all shadow-sm">
                                    <i class="fas fa-arrow-right text-xs"></i>
                                </div>
                            </div>

                            <!-- Botones Admin (Hover) -->
                            ${isAdmin ? `
                            <div class="absolute top-3 left-3 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="event.stopPropagation(); App.lms.openEditCourseModal('${commId}', '${course.id}')" class="w-8 h-8 bg-white/90 text-slate-600 rounded-lg flex items-center justify-center hover:text-[#1890ff] shadow-lg"><i class="fas fa-pen text-xs"></i></button>
                                <button onclick="event.stopPropagation(); App.lms.deleteCourse('${course.id}', '${commId}')" class="w-8 h-8 bg-white/90 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white shadow-lg"><i class="fas fa-trash text-xs"></i></button>
                            </div>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>` : `
            <div class="py-24 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl">
                <div class="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                    <i class="fas fa-books text-slate-300 dark:text-slate-600"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">Catálogo Vacío</h3>
                <p class="text-slate-500 dark:text-slate-400 mt-2">No hay cursos disponibles en este momento.</p>
            </div>`}
        </div>`;
};

// ============================================================================
// 2. REPRODUCTOR ESTÁNDAR
// ============================================================================
window.App.lms.renderPlayer = (container, community, courseId, user, isAdmin) => {
    const course = (community.courses || []).find(c => c.id === courseId);
    if (!course) return App.ui.toast("Curso no encontrado", "error");
    
    const classes = course.classes || [];
    const commId = community.id;

    // Inyectar modal de clases para admin
    if (isAdmin && !document.getElementById('add-class-modal')) {
        document.body.insertAdjacentHTML('beforeend', _renderAddClassModalLocal());
    }

    container.innerHTML = `
        <div class="min-h-full bg-[#F8FAFC] dark:bg-[#020617] animate-enter p-4 lg:p-6 overflow-y-auto custom-scrollbar transition-colors">
            <div class="max-w-[1600px] mx-auto">
                <!-- Navegación -->
                <div class="flex items-center gap-4 mb-4">
                    <button onclick="window.location.hash='#community/${commId}/clases'" class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-500 hover:text-[#1890ff] transition-all flex items-center justify-center shadow-sm">
                        <i class="fas fa-arrow-left text-xs"></i>
                    </button>
                    <div>
                        <h2 class="text-base font-heading font-bold text-slate-900 dark:text-white">${course.title}</h2>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">${classes.length} lecciones</span>
                            ${course.isSuperClass ? '<span class="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold uppercase border border-indigo-200 dark:border-indigo-800">Modo IDE</span>' : ''}
                        </div>
                    </div>
                </div>

                <div class="flex flex-col xl:flex-row gap-6 items-start">
                    <!-- Reproductor y Detalles -->
                    <div class="w-full xl:flex-1 space-y-4">
                        <div class="w-full bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video group">
                            <div id="video-placeholder" class="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900 z-0">
                                <i class="fas fa-play-circle text-6xl opacity-50 mb-4 animate-pulse"></i>
                                <span class="text-xs font-bold uppercase tracking-widest opacity-70">Cargando Player...</span>
                            </div>
                            <div id="youtube-player" class="absolute inset-0 w-full h-full z-10"></div>
                        </div>
                        
                        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
                            <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div class="flex-1">
                                    <div class="flex items-center gap-3 mb-2">
                                        <span id="player-label" class="inline-block px-2 py-0.5 rounded bg-[#1890ff]/10 text-[#1890ff] text-[10px] font-bold uppercase tracking-wide border border-[#1890ff]/20">Cargando...</span>
                                    </div>
                                    <h1 id="player-title" class="text-xl font-heading font-bold text-slate-900 dark:text-white mb-2 leading-tight">Selecciona una clase</h1>
                                    <p id="player-desc" class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">...</p>
                                </div>
                                <div class="flex flex-col gap-3 shrink-0 w-full md:w-auto min-w-[180px]">
                                    <button id="btn-complete-class" onclick="App.lms.markClassComplete('${commId}')" disabled class="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-not-allowed w-full border border-transparent">
                                        <i class="far fa-circle"></i> <span>Marcar Vista</span>
                                    </button>
                                    ${isAdmin ? `<button onclick="App.lms.openAddClassModal('${commId}', '${course.id}')" class="px-5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 w-full"><i class="fas fa-plus"></i> <span>Agregar Clase</span></button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sidebar Playlist -->
                    <div class="w-full xl:w-[400px] shrink-0 space-y-4 sticky top-4">
                        ${course.isSuperClass ? `
                        <div class="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-1 shadow-lg shadow-indigo-500/20">
                            <div class="bg-white dark:bg-slate-900 rounded-xl p-4 text-center">
                                <div class="flex items-center justify-center gap-2 text-indigo-500 mb-2">
                                    <i class="fas fa-code text-lg"></i> <span class="text-xs font-bold uppercase tracking-widest">Modo Desarrollador</span>
                                </div>
                                <p class="text-slate-500 dark:text-slate-400 text-xs mb-4">Abre el editor de código integrado y practica mientras ves la clase.</p>
                                <button onclick="App.lms.renderSuperClass('${commId}', '${course.id}')" class="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <i class="fas fa-terminal"></i> Abrir Super Clase
                                </button>
                            </div>
                        </div>` : ''}
                        
                        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                            <div class="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
                                <div class="flex justify-between items-center mb-2">
                                    <h3 class="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">Contenido del Curso</h3>
                                    <span class="text-[10px] font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md shadow-sm" id="course-progress-badge">0%</span>
                                </div>
                                <div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div id="course-progress-bar" class="bg-[#1890ff] h-full rounded-full transition-all duration-700 ease-out" style="width: 0%"></div>
                                </div>
                            </div>
                            <div class="overflow-y-auto custom-scrollbar p-2 space-y-1 max-h-[500px]">
                                ${classes.map((cls, idx) => {
                                    const isCompleted = (user.completedModules || []).includes(`${commId}_${cls.id}`);
                                    return `
                                    <div class="relative group">
                                        <button onclick="App.lms.playClass('${commId}', '${course.id}', '${cls.id}')" id="btn-class-${cls.id}" class="w-full p-3 rounded-xl flex items-start gap-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                                            <div class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 transition-all ${isCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}">
                                                ${isCompleted ? '<i class="fas fa-check"></i>' : (idx + 1)}
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#1890ff] dark:group-hover:text-white transition-colors line-clamp-1">${cls.title}</h4>
                                                <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1"><i class="far fa-play-circle"></i> Video</p>
                                            </div>
                                        </button>
                                        ${isAdmin ? `<div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10"><button onclick="event.stopPropagation(); App.lms.deleteClass('${course.id}', '${cls.id}', '${commId}')" class="w-6 h-6 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 text-red-500 rounded flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer shadow-sm"><i class="fas fa-trash text-[9px]"></i></button></div>` : ''}
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    // Inicialización diferida
    setTimeout(() => {
        _updateCourseProgressUI(commId, classes, user);
        if (classes.length > 0) {
            const currentHash = window.location.hash.split('/');
            let targetId = currentHash.length > 4 ? currentHash[4] : null;
            if (!targetId) {
                const firstIncomplete = classes.find(c => !(user.completedModules || []).includes(`${commId}_${c.id}`));
                targetId = firstIncomplete ? firstIncomplete.id : classes[0].id;
            }
            App.lms.playClass(commId, course.id, targetId);
        }
    }, 150);
};

// ============================================================================
// 3. SUPER CLASE 3.0 (IDE + RESIZER + THEME SYNC)
// ============================================================================

window.App.lms.renderSuperClass = async (commId, courseId) => {
    // Pausar reproductor de fondo si existe
    if (window.player && typeof window.player.pauseVideo === 'function') try { window.player.pauseVideo(); } catch (e) {}

    const comm = App.state.cache.communities[commId];
    const course = comm.courses.find(c => c.id === courseId);
    const clsId = _currentClassId;
    const cls = course.classes.find(c => c.id === clsId);

    if (!cls) return App.ui.toast("Selecciona una clase", "error");

    // Construcción del Layout Super Clase (Overlay)
    const overlayHtml = `
    <div id="superclass-overlay" class="super-class-overlay animate-fade-in flex flex-col bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
        <!-- HEADER -->
        <div class="h-12 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#020617] flex items-center justify-between px-4 shrink-0 transition-colors">
            <div class="flex items-center gap-4">
                <button onclick="App.lms.exitSuperClass('${commId}', '${courseId}')" class="text-slate-500 dark:text-slate-400 hover:text-[#1890ff] dark:hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
                <div class="h-4 w-px bg-gray-300 dark:bg-slate-800"></div>
                <h2 class="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px] md:max-w-md">${cls.title}</h2>
            </div>
            
            <div class="flex items-center gap-3">
                <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/50 hidden sm:inline-block">
                    ${course.codeLanguage || 'Editor'}
                </span>
                <button onclick="App.lms.runCodeMock()" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-500 transition-colors shadow flex items-center gap-2">
                    <i class="fas fa-play"></i> <span class="hidden sm:inline">Run Code</span>
                </button>
            </div>
        </div>

        <!-- MAIN LAYOUT (RESIZABLE FLEX) -->
        <div class="flex-1 flex flex-col lg:flex-row overflow-hidden relative" id="sc-main-container">
            
            <!-- PANEL IZQUIERDO: VIDEO + NOTAS -->
            <div id="sc-left-panel" class="flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-slate-800 bg-black transition-all duration-0 w-full lg:w-1/2 min-w-[300px]">
                <div id="sc-video-wrapper" class="w-full bg-black relative aspect-video shrink-0">
                    <div id="sc-youtube-player" class="absolute inset-0 w-full h-full"></div>
                </div>

                <!-- BLOC DE NOTAS -->
                <div class="flex-1 bg-white dark:bg-[#0f172a] flex flex-col min-h-[200px] border-t border-gray-200 dark:border-slate-800 transition-colors">
                    <div class="h-10 bg-gray-50 dark:bg-[#1e293b] border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 shrink-0 transition-colors">
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2"><i class="fas fa-sticky-note"></i> Mis Apuntes</span>
                        <div class="flex gap-2">
                            <button onclick="App.lms.downloadNotes('${course.title}')" class="text-slate-400 hover:text-[#1890ff] text-xs"><i class="fas fa-download"></i></button>
                            <button onclick="App.lms.saveNotes()" class="text-slate-400 hover:text-green-500 text-xs"><i class="fas fa-save"></i></button>
                        </div>
                    </div>
                    <textarea id="sc-notes-area" class="flex-1 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-300 p-4 text-sm outline-none resize-none font-mono leading-relaxed transition-colors" placeholder="Escribe tus apuntes aquí..."></textarea>
                </div>
            </div>

            <!-- GUTTER (BARRA DE REDIMENSIONAMIENTO) -->
            <div id="sc-gutter" class="gutter hidden lg:block bg-gray-200 dark:bg-slate-800 w-[6px] hover:w-[8px] hover:bg-[#1890ff] cursor-col-resize z-50 transition-all"></div>

            <!-- PANEL DERECHO: CODE EDITOR -->
            <div id="sc-right-panel" class="relative bg-white dark:bg-[#1e1e1e] flex-1 flex flex-col transition-colors min-w-[300px]">
                <div id="monaco-editor-container" class="w-full flex-1"></div>
                
                <!-- MOCK CONSOLE -->
                <div class="h-32 bg-gray-100 dark:bg-[#000000] border-t border-gray-200 dark:border-slate-800 flex flex-col font-mono text-xs">
                    <div class="h-8 bg-gray-200 dark:bg-[#111] px-4 flex items-center justify-between text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0">
                        <span><i class="fas fa-terminal mr-2"></i>Consola</span>
                        <button onclick="document.getElementById('sc-console-output').innerHTML=''" class="hover:text-red-500"><i class="fas fa-ban"></i></button>
                    </div>
                    <div id="sc-console-output" class="flex-1 p-3 overflow-y-auto text-slate-600 dark:text-green-400 whitespace-pre-wrap"></div>
                </div>

                <!-- LOADING INDICATOR -->
                <div id="monaco-loading" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#1e1e1e] text-slate-500 z-10 transition-colors">
                    <div class="text-center">
                        <i class="fas fa-circle-notch fa-spin text-2xl mb-2 text-[#1890ff]"></i>
                        <p class="text-xs font-mono">Cargando IDE...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);
    
    // Iniciar Resizer
    _initResizer();

    // Iniciar Video Super Clase
    let videoId = cls.videoUrl;
    if (videoId.includes('v=')) videoId = videoId.split('v=')[1].split('&')[0];
    else if (videoId.includes('youtu.be/')) videoId = videoId.split('youtu.be/')[1];

    new YT.Player('sc-youtube-player', {
        height: '100%', width: '100%', videoId: videoId,
        playerVars: { 'autoplay': 0, 'rel': 0, 'modestbranding': 1, 'theme': App.state.theme === 'dark' ? 'dark' : 'light' }
    });

    // Cargar Notas previas
    const savedNotes = localStorage.getItem(`notes_${courseId}`);
    if (savedNotes) document.getElementById('sc-notes-area').value = savedNotes;

    // Cargar Monaco Editor
    try {
        const monaco = await App.utils.loadMonaco();
        document.getElementById('monaco-loading').style.display = 'none';
        
        // Tema Dinámico (Día/Noche)
        const isDark = App.state.theme === 'dark';
        const editorTheme = isDark ? 'vs-dark' : 'vs';

        const langMap = { 'python': 'python', 'sql': 'sql', 'javascript': 'javascript', 'html': 'html' };
        const lang = langMap[course.codeLanguage] || 'python';
        let defaultCode = `print("Hola mundo desde ${course.title}")\n# Tu código aquí...`;
        if (lang === 'javascript') defaultCode = `console.log("Hola Dev!");`;

        _editorInstance = monaco.editor.create(document.getElementById('monaco-editor-container'), {
            value: defaultCode,
            language: lang,
            theme: editorTheme,
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', Consolas, monospace",
            scrollBeyondLastLine: false,
        });

    } catch (e) {
        console.error("Monaco Error:", e);
        document.getElementById('monaco-loading').innerHTML = `<p class="text-red-500 text-xs">Error cargando editor.</p>`;
    }
};

// Lógica de Resizer (Drag & Drop para ajustar layout)
function _initResizer() {
    const gutter = document.getElementById('sc-gutter');
    const left = document.getElementById('sc-left-panel');
    const right = document.getElementById('sc-right-panel');
    const container = document.getElementById('sc-main-container');

    if (!gutter || !left || !right) return;

    gutter.addEventListener('mousedown', (e) => {
        e.preventDefault();
        _scIsResizing = true;
        document.body.style.cursor = 'col-resize';
        gutter.classList.add('bg-[#1890ff]'); // Feedback visual
    });

    document.addEventListener('mousemove', (e) => {
        if (!_scIsResizing) return;
        
        const containerRect = container.getBoundingClientRect();
        const offsetX = e.clientX - containerRect.left;
        const totalWidth = containerRect.width;
        
        // Limitar redimensionamiento entre 20% y 80%
        let newLeftWidth = (offsetX / totalWidth) * 100;
        if (newLeftWidth < 20) newLeftWidth = 20;
        if (newLeftWidth > 80) newLeftWidth = 80;

        left.style.width = `${newLeftWidth}%`;
        // El panel derecho usa flex-1, se adapta automáticamente
        
        // Forzar relayout del editor si existe para evitar glitches
        if (_editorInstance) _editorInstance.layout();
    });

    document.addEventListener('mouseup', () => {
        if (_scIsResizing) {
            _scIsResizing = false;
            document.body.style.cursor = 'default';
            gutter.classList.remove('bg-[#1890ff]');
        }
    });
}

// Helpers Super Clase
window.App.lms.runCodeMock = () => {
    const consoleDiv = document.getElementById('sc-console-output');
    if (!consoleDiv) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const mockOutput = `[${timestamp}] Ejecutando script...\n> Hola Dev!\n> Proceso finalizado con código 0.`;
    
    consoleDiv.innerHTML += (consoleDiv.innerHTML ? '\n' : '') + mockOutput;
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
};

window.App.lms.saveNotes = () => {
    const notes = document.getElementById('sc-notes-area').value;
    // Extraer ID del curso del hash para persistencia única
    const hashParts = window.location.hash.split('/');
    const courseId = hashParts.length > 3 ? hashParts[3] : 'general';
    localStorage.setItem(`notes_${courseId}`, notes);
    App.ui.toast("Apuntes guardados", "success");
};

window.App.lms.downloadNotes = (title) => {
    const notes = document.getElementById('sc-notes-area').value;
    if (!notes) return App.ui.toast("Nada que descargar", "warning");
    const blob = new Blob([notes], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Apuntes_${title}.txt`;
    a.click();
};

window.App.lms.exitSuperClass = (commId, courseId) => {
    // Auto-guardar notas
    if (document.getElementById('sc-notes-area')) window.App.lms.saveNotes();
    
    const overlay = document.getElementById('superclass-overlay');
    if (overlay) {
        overlay.classList.add('opacity-0');
        setTimeout(() => {
            overlay.remove();
            if (_editorInstance) { _editorInstance.dispose(); _editorInstance = null; }
            App.renderCommunity(commId, 'clases', courseId);
        }, 300);
    }
};

// ============================================================================
// 4. LÓGICA DE REPRODUCCIÓN & GESTIÓN DE PROGRESO
// ============================================================================

window.App.lms.playClass = (cid, courseId, classId) => {
    const comm = App.state.cache.communities[cid];
    const course = comm.courses.find(c => c.id === courseId);
    const cls = course.classes.find(c => c.id === classId);
    const idx = course.classes.indexOf(cls) + 1;

    if (!cls) return;
    _currentClassId = classId;

    // Actualizar Textos
    const titleEl = document.getElementById('player-title');
    const descEl = document.getElementById('player-desc');
    const labelEl = document.getElementById('player-label');
    const btn = document.getElementById('btn-complete-class');

    if (titleEl) titleEl.innerText = cls.title;
    if (descEl) descEl.innerText = cls.description || "Mira el video completo para avanzar.";
    if (labelEl) labelEl.innerText = `Lección ${idx} de ${course.classes.length}`;

    // Actualizar Estilos de la Lista
    document.querySelectorAll('[id^="btn-class-"]').forEach(b => {
        b.className = "w-full p-3 rounded-xl flex items-start gap-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700";
    });
    const activeBtn = document.getElementById(`btn-class-${classId}`);
    if (activeBtn) {
        activeBtn.className = "w-full p-3 rounded-xl flex items-start gap-3 text-left bg-blue-50 dark:bg-blue-900/20 ring-1 ring-[#1890ff] border border-blue-200 dark:border-blue-800 shadow-sm";
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Estado del Botón Completar
    const user = App.state.currentUser;
    const isCompleted = (user.completedModules || []).includes(`${cid}_${classId}`);

    if (btn) {
        btn.disabled = false;
        if (isCompleted) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Lección Completada</span>';
            btn.className = "px-5 py-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-xs flex items-center justify-center gap-2 cursor-default border border-green-200 dark:border-green-800 w-full";
        } else {
            btn.innerHTML = '<i class="far fa-circle"></i> <span>Marcar como Vista</span>';
            btn.className = "px-5 py-3 rounded-xl bg-[#1890ff] hover:bg-blue-600 text-white font-bold text-xs transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 w-full";
        }
    }

    // Carga de Video
    const placeholder = document.getElementById('video-placeholder');
    if (placeholder) placeholder.classList.add('hidden');

    let videoId = cls.videoUrl;
    if (videoId.includes('v=')) videoId = videoId.split('v=')[1].split('&')[0];
    else if (videoId.includes('youtu.be/')) videoId = videoId.split('youtu.be/')[1];

    if (window.player && typeof window.player.loadVideoById === 'function') {
        window.player.loadVideoById(videoId);
    } else {
        window.player = new YT.Player('youtube-player', {
            height: '100%', width: '100%', videoId: videoId,
            playerVars: { 'autoplay': 1, 'rel': 0, 'modestbranding': 1 }
        });
    }
};

window.App.lms.markClassComplete = async (cid) => {
    if (!_currentClassId) return;
    const uid = App.state.currentUser.uid;
    const moduleId = `${cid}_${_currentClassId}`;
    const btn = document.getElementById('btn-complete-class');
    if (btn) { btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...'; btn.disabled = true; }

    try {
        await window.F.updateDoc(window.F.doc(window.F.db, "users", uid), { completedModules: window.F.arrayUnion(moduleId) });
        
        // Actualizar estado local
        if (!App.state.currentUser.completedModules) App.state.currentUser.completedModules = [];
        if (!App.state.currentUser.completedModules.includes(moduleId)) App.state.currentUser.completedModules.push(moduleId);
        
        App.ui.toast("Progreso guardado", "success");

        // Actualizar barra de progreso
        const comm = App.state.cache.communities[cid];
        const currentCourse = comm.courses.find(c => c.classes.find(cl => cl.id === _currentClassId));
        if (currentCourse) _updateCourseProgressUI(cid, currentCourse.classes, App.state.currentUser);

        // Actualizar icono en lista
        const activeBtn = document.getElementById(`btn-class-${_currentClassId}`);
        if (activeBtn) {
            const iconDiv = activeBtn.querySelector('div:first-child');
            if (iconDiv) {
                iconDiv.className = "w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 transition-all bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
                iconDiv.innerHTML = '<i class="fas fa-check"></i>';
            }
        }
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Lección Completada</span>';
            btn.className = "px-5 py-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-xs flex items-center justify-center gap-2 cursor-default border border-green-200 dark:border-green-800 w-full";
        }
    } catch (e) {
        console.error(e);
        App.ui.toast("Error al guardar", "error");
        if (btn) { btn.disabled = false; btn.innerHTML = 'Reintentar'; }
    }
};

function _updateCourseProgressUI(cid, classes, user) {
    const total = classes.length;
    const completedCount = classes.filter(cl => (user.completedModules || []).includes(`${cid}_${cl.id}`)).length;
    const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    
    const bar = document.getElementById('course-progress-bar');
    const badge = document.getElementById('course-progress-badge');
    
    if (bar) bar.style.width = `${pct}%`;
    if (badge) badge.innerText = `${pct}%`;
}

// ============================================================================
// 5. ADMINISTRACIÓN (MODALES Y LÓGICA CRUD)
// ============================================================================

// --- GESTIÓN DE CURSOS ---
window.App.lms.openCreateCourseModal = (cid) => { 
    const m = document.getElementById('create-course-modal'); 
    if (!m) return; 
    document.getElementById('course-cid').value = cid; 
    m.classList.remove('hidden'); 
};
window.App.lms.closeCreateCourseModal = () => document.getElementById('create-course-modal').classList.add('hidden');

window.App.lms.saveCourse = async () => {
    const cid = document.getElementById('course-cid').value;
    const title = document.getElementById('course-title').value;
    const desc = document.getElementById('course-desc').value;
    const img = document.getElementById('course-img').value;
    const isSuperClass = document.getElementById('course-superclass').value === 'true';
    const codeLanguage = document.getElementById('course-language').value;
    
    if (!title) return App.ui.toast("El título es obligatorio", "error");
    
    const btn = document.getElementById('btn-save-course');
    btn.innerHTML = "Guardando..."; btn.disabled = true;

    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses || [];
        
        const newCourse = { 
            id: 'c_' + Date.now(), 
            title, 
            description: desc, 
            image: img, 
            isSuperClass, 
            codeLanguage, 
            classes: [], 
            createdAt: new Date().toISOString() 
        };
        
        courses.push(newCourse);
        await window.F.updateDoc(commRef, { courses });
        App.ui.toast("Curso creado", "success");
        App.lms.closeCreateCourseModal();
        App.renderCommunity(cid, 'clases');
    } catch (e) { 
        console.error(e); 
        App.ui.toast("Error al crear", "error"); 
    } finally { 
        btn.innerHTML = "Crear Curso"; btn.disabled = false; 
    }
};

window.App.lms.openEditCourseModal = (cid, courseId) => {
    const comm = App.state.cache.communities[cid];
    const course = comm.courses.find(c => c.id === courseId);
    if (!course) return;
    
    const m = document.getElementById('edit-course-modal');
    document.getElementById('edit-course-cid').value = cid;
    document.getElementById('edit-course-id').value = courseId;
    document.getElementById('edit-course-title').value = course.title;
    document.getElementById('edit-course-desc').value = course.description || '';
    document.getElementById('edit-course-img').value = course.image || '';
    
    if(document.getElementById('edit-course-superclass')) document.getElementById('edit-course-superclass').value = course.isSuperClass ? 'true' : 'false';
    if(document.getElementById('edit-course-language')) document.getElementById('edit-course-language').value = course.codeLanguage || 'python';
    
    m.classList.remove('hidden');
};
window.App.lms.closeEditCourseModal = () => document.getElementById('edit-course-modal').classList.add('hidden');

window.App.lms.updateCourse = async () => {
    const cid = document.getElementById('edit-course-cid').value;
    const courseId = document.getElementById('edit-course-id').value;
    const title = document.getElementById('edit-course-title').value;
    const desc = document.getElementById('edit-course-desc').value;
    const img = document.getElementById('edit-course-img').value;
    const isSuperClass = document.getElementById('edit-course-superclass').value === 'true';
    const codeLanguage = document.getElementById('edit-course-language').value;
    
    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses;
        const cIdx = courses.findIndex(c => c.id === courseId);
        
        if (cIdx > -1) {
            courses[cIdx] = { ...courses[cIdx], title, description: desc, image: img, isSuperClass, codeLanguage };
            await window.F.updateDoc(commRef, { courses });
            App.ui.toast("Curso actualizado", "success");
            App.lms.closeEditCourseModal();
            App.renderCommunity(cid, 'clases');
        }
    } catch (e) { App.ui.toast("Error al editar", "error"); }
};

window.App.lms.deleteCourse = async (courseId, cid) => {
    if (!confirm("⚠️ ¿Eliminar curso y todas sus clases?")) return;
    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses.filter(c => c.id !== courseId);
        await window.F.updateDoc(commRef, { courses });
        App.ui.toast("Curso eliminado", "success");
        App.renderCommunity(cid, 'clases');
    } catch (e) { App.ui.toast("Error al eliminar", "error"); }
};

// --- GESTIÓN DE CLASES ---
window.App.lms.openAddClassModal = (cid, courseId) => { 
    const m = document.getElementById('add-class-modal'); 
    if (m) { 
        document.getElementById('ac-cid').value = cid; 
        document.getElementById('ac-courseid').value = courseId; 
        m.classList.remove('hidden'); 
    } 
};
window.App.lms.closeAddClassModal = () => document.getElementById('add-class-modal').classList.add('hidden');

window.App.lms.saveClass = async () => {
    const cid = document.getElementById('ac-cid').value;
    const courseId = document.getElementById('ac-courseid').value;
    const title = document.getElementById('ac-title').value;
    const url = document.getElementById('ac-url').value;
    
    if (!title || !url) return App.ui.toast("Datos incompletos", "error");
    
    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses;
        const cIdx = courses.findIndex(c => c.id === courseId);
        
        courses[cIdx].classes.push({ id: 'cl_' + Date.now(), title, videoUrl: url, duration: '10:00' });
        await window.F.updateDoc(commRef, { courses });
        App.ui.toast("Clase agregada", "success");
        App.lms.closeAddClassModal();
        App.renderCommunity(cid, 'clases', courseId);
    } catch (e) { App.ui.toast("Error al guardar clase", "error"); }
};

window.App.lms.deleteClass = async (courseId, classId, cid) => {
    if (!confirm("¿Borrar esta clase?")) return;
    try {
        const commRef = window.F.doc(window.F.db, "communities", cid);
        const commSnap = await window.F.getDoc(commRef);
        let courses = commSnap.data().courses;
        const cIdx = courses.findIndex(c => c.id === courseId);
        
        if (cIdx > -1) {
            courses[cIdx].classes = courses[cIdx].classes.filter(c => c.id !== classId);
            await window.F.updateDoc(commRef, { courses });
            App.ui.toast("Clase eliminada", "success");
            if (_currentClassId === classId) window.location.hash = `#community/${cid}/clases`;
            else App.renderCommunity(cid, 'clases', courseId);
        }
    } catch (e) { App.ui.toast("Error al eliminar", "error"); }
};

// ============================================================================
// 6. PLANTILLAS LOCALES (MODALES)
// ============================================================================

function _renderCreateCourseModalLocal() {
    return `
    <div id="create-course-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all">
            <div class="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <h3 class="font-heading font-bold text-lg text-slate-900 dark:text-white">Nuevo Curso</h3>
                <button onclick="App.lms.closeCreateCourseModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <input type="hidden" id="course-cid">
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Título</label><input type="text" id="course-title" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] dark:text-white font-bold"></div>
                <div class="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div class="space-y-1"><label class="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 ml-1">Super Clase</label><select id="course-superclass" class="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-sm font-bold dark:text-white"><option value="false">Desactivado</option><option value="true">Activado (IDE)</option></select></div>
                    <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Lenguaje</label><select id="course-language" class="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-sm dark:text-white"><option value="python">Python</option><option value="sql">SQL</option><option value="javascript">JavaScript</option></select></div>
                </div>
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Descripción</label><textarea id="course-desc" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] text-sm resize-none h-20 dark:text-white"></textarea></div>
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Imagen URL</label><input type="text" id="course-img" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] text-sm dark:text-white"></div>
                <button onclick="App.lms.saveCourse()" id="btn-save-course" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold mt-2 hover:bg-blue-600 transition-colors shadow-lg active:scale-95">Crear Curso</button>
            </div>
        </div>
    </div>`;
}

function _renderEditCourseModalLocal() {
    return `
    <div id="edit-course-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all">
            <div class="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <h3 class="font-heading font-bold text-lg text-slate-900 dark:text-white">Editar Curso</h3>
                <button onclick="App.lms.closeEditCourseModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <input type="hidden" id="edit-course-cid"><input type="hidden" id="edit-course-id">
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Título</label><input type="text" id="edit-course-title" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] font-bold text-sm dark:text-white"></div>
                <div class="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div class="space-y-1"><label class="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 ml-1">Super Clase</label><select id="edit-course-superclass" class="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-sm font-bold dark:text-white"><option value="false">Desactivado</option><option value="true">Activado (IDE)</option></select></div>
                    <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Lenguaje</label><select id="edit-course-language" class="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-sm dark:text-white"><option value="python">Python</option><option value="sql">SQL</option><option value="javascript">JavaScript</option></select></div>
                </div>
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Descripción</label><textarea id="edit-course-desc" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] text-sm h-20 resize-none dark:text-white"></textarea></div>
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Imagen URL</label><input type="text" id="edit-course-img" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] text-sm dark:text-white"></div>
                <button onclick="App.lms.updateCourse()" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold mt-2 hover:bg-blue-600 transition-colors">Guardar Cambios</button>
            </div>
        </div>
    </div>`;
}

function _renderAddClassModalLocal() {
    return `
    <div id="add-class-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
            <div class="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <h3 class="font-heading font-bold text-lg text-slate-900 dark:text-white">Agregar Clase</h3>
                <button onclick="App.lms.closeAddClassModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <input type="hidden" id="ac-cid"><input type="hidden" id="ac-courseid">
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Título</label><input type="text" id="ac-title" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white dark:focus:bg-slate-800 transition-colors text-sm font-bold dark:text-white"></div>
                <div class="space-y-1"><label class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Video URL (YouTube)</label><input type="text" id="ac-url" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1890ff] focus:bg-white dark:focus:bg-slate-800 transition-colors text-sm dark:text-white" placeholder="ID o Enlace completo"></div>
                <button onclick="App.lms.saveClass()" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold mt-2 hover:bg-blue-600 transition-colors shadow-lg active:scale-95">Guardar Clase</button>
            </div>
        </div>
    </div>`;
}