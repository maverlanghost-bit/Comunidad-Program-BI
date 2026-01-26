/**
 * auth.views.js (V12.0 - ROBUST AUTH UX)
 * Módulo de Autenticación: Login, Registro y Recuperación.
 * MEJORAS V12.0:
 * - Validaciones de formulario en tiempo real.
 * - Manejo de errores de Firebase Mock traducidos.
 * - Bloqueo de UI durante peticiones asíncronas.
 */

window.App = window.App || {};

// ==========================================
// 1. LOGIN (INICIO DE SESIÓN)
// ==========================================
window.App.renderLogin = () => {
    // Protección: Si ya hay sesión, redirigir
    if (App.state.currentUser) {
        window.location.hash = '#home';
        return;
    }

    const html = `
    <div class="min-h-screen w-full flex bg-white dark:bg-[#020617] animate-fade-in relative overflow-hidden font-sans">
        
        <!-- IZQUIERDA: ARTE VISUAL & BRANDING (Hidden on Mobile) -->
        <div class="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden desktop-only">
            <div class="absolute inset-0 bg-gradient-to-br from-[#1890ff]/30 to-slate-900/90 z-10"></div>
            <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
            
            <div class="relative z-20">
                <div class="w-12 h-12 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/30 mb-6">
                    <i class="fas fa-cubes"></i>
                </div>
                <h2 class="text-4xl font-heading font-extrabold text-white leading-tight mb-4">
                    Tu carrera en datos<br>empieza aquí.
                </h2>
                <p class="text-slate-300 text-lg max-w-md leading-relaxed">
                    Accede a una plataforma de aprendizaje inmersiva con simuladores de código reales y comunidad en vivo.
                </p>
            </div>

            <div class="relative z-20 text-xs text-slate-500 font-medium flex justify-between items-center w-full border-t border-white/10 pt-6">
                <span>© ${new Date().getFullYear()} ProgramBI Inc.</span>
                <span class="flex gap-4">
                    <a href="#" class="hover:text-white transition-colors">Privacidad</a>
                    <a href="#" class="hover:text-white transition-colors">Términos</a>
                </span>
            </div>
        </div>

        <!-- DERECHA: FORMULARIO -->
        <div class="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-white dark:bg-[#020617] relative">
            <div class="w-full max-w-md space-y-6 sm:space-y-8 animate-slide-up">
                <div class="text-center lg:text-left">
                    <div class="lg:hidden w-12 h-12 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-2xl shadow-lg mx-auto mb-6">
                        <i class="fas fa-cubes"></i>
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-heading font-bold text-slate-900 dark:text-white">Bienvenido de nuevo</h2>
                    <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">Ingresa tus credenciales para continuar aprendiendo.</p>
                </div>

                <form onsubmit="App.handleLogin(event)" class="space-y-5" id="login-form">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Correo Electrónico</label>
                        <div class="relative group">
                            <i class="fas fa-envelope absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#1890ff] transition-colors"></i>
                            <input type="email" name="email" required 
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#1890ff] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                                placeholder="nombre@ejemplo.com">
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Contraseña</label>
                        <div class="relative group">
                            <i class="fas fa-lock absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#1890ff] transition-colors"></i>
                            <input type="password" name="password" required 
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#1890ff] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                                placeholder="••••••••">
                        </div>
                    </div>

                    <div class="flex items-center justify-between text-xs font-bold">
                        <label class="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-700 select-none">
                            <input type="checkbox" class="rounded border-slate-300 text-[#1890ff] focus:ring-[#1890ff] cursor-pointer">
                            Recordarme
                        </label>
                        <a href="#" class="text-[#1890ff] hover:underline hover:text-blue-700 transition-colors">¿Olvidaste tu contraseña?</a>
                    </div>

                    <button type="submit" id="btn-login" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                        <span>Iniciar Sesión</span> <i class="fas fa-arrow-right"></i>
                    </button>
                </form>

                <p class="text-center text-sm text-slate-500 font-medium">
                    ¿No tienes cuenta? <a href="#register" class="text-[#1890ff] font-bold hover:underline">Regístrate gratis</a>
                </p>
            </div>
        </div>
    </div>`;

    App.render(html);
};

// ==========================================
// 2. REGISTRO (NUEVA CUENTA)
// ==========================================
window.App.renderRegister = () => {
    if (App.state.currentUser) {
        window.location.hash = '#home';
        return;
    }

    const html = `
    <div class="min-h-screen w-full flex bg-white dark:bg-[#020617] animate-fade-in relative overflow-hidden font-sans">
        <!-- IZQUIERDA (Simétrica - Hidden on Mobile) -->
        <div class="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden desktop-only">
            <div class="absolute inset-0 bg-gradient-to-br from-[#1890ff]/30 to-slate-900/90 z-10"></div>
            <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
            
            <div class="relative z-20">
                <div class="w-12 h-12 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-2xl shadow-lg mb-6"><i class="fas fa-rocket"></i></div>
                <h2 class="text-4xl font-heading font-extrabold text-white leading-tight mb-4">Únete a la nueva<br>generación tech.</h2>
                <div class="space-y-4 text-slate-300 mt-8">
                    <div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#1890ff]"><i class="fas fa-code"></i></div><span class="font-medium">Entornos de código en vivo</span></div>
                    <div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#1890ff]"><i class="fas fa-certificate"></i></div><span class="font-medium">Certificación profesional</span></div>
                    <div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#1890ff]"><i class="fas fa-users"></i></div><span class="font-medium">Comunidad global</span></div>
                </div>
            </div>
            <div class="relative z-20 text-xs text-slate-500 font-medium">© ${new Date().getFullYear()} ProgramBI Inc.</div>
        </div>

        <!-- DERECHA: FORMULARIO -->
        <div class="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-white dark:bg-[#020617] relative">
            <div class="w-full max-w-md space-y-6 sm:space-y-8 animate-slide-up">
                <div class="text-center lg:text-left">
                    <div class="lg:hidden w-12 h-12 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-2xl shadow-lg mx-auto mb-6">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-heading font-bold text-slate-900 dark:text-white">Crear Cuenta</h2>
                    <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">Completa tus datos para comenzar tu prueba gratuita.</p>
                </div>

                <form onsubmit="App.handleRegister(event)" class="space-y-5" id="register-form">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Nombre Completo</label>
                        <div class="relative group">
                            <i class="fas fa-user absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#1890ff] transition-colors"></i>
                            <input type="text" name="name" required class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#1890ff] transition-all text-sm font-medium" placeholder="Ej: Ana García">
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Correo Electrónico</label>
                        <div class="relative group">
                            <i class="fas fa-envelope absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#1890ff] transition-colors"></i>
                            <input type="email" name="email" required class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#1890ff] transition-all text-sm font-medium" placeholder="nombre@ejemplo.com">
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Contraseña</label>
                        <div class="relative group">
                            <i class="fas fa-lock absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#1890ff] transition-colors"></i>
                            <input type="password" name="password" required minlength="6" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#1890ff] transition-all text-sm font-medium" placeholder="Mínimo 6 caracteres">
                        </div>
                    </div>

                    <button type="submit" id="btn-register" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                        Registrarse Gratis
                    </button>
                </form>

                <p class="text-center text-sm text-slate-500 font-medium">
                    ¿Ya tienes cuenta? <a href="#login" class="text-[#1890ff] font-bold hover:underline">Inicia Sesión</a>
                </p>
            </div>
        </div>
    </div>`;
    App.render(html);
};

// ==========================================
// 3. LÓGICA DE NEGOCIO (HANDLERS ROBUSTOS)
// ==========================================

window.App.handleLogin = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const form = document.getElementById('login-form');

    // Obtener valores limpios
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
        App.ui.toast("Por favor completa todos los campos", "warning");
        return;
    }

    // UX: Bloquear botón y mostrar carga
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verificando...';

    try {
        await App.api.login(email, password);
        App.ui.toast('¡Bienvenido de nuevo!', 'success');
        // La redirección ocurre automáticamente en core.js -> onAuthStateChanged
    } catch (error) {
        console.warn("Login Failed:", error);

        // Manejo de errores específicos (Firebase style codes)
        let msg = 'Error de conexión.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = 'Correo o contraseña incorrectos.';
        } else if (error.code === 'auth/too-many-requests') {
            msg = 'Demasiados intentos. Espera un momento.';
        }

        App.ui.toast(msg, 'error');

        // UX: Restaurar botón
        btn.disabled = false;
        btn.innerHTML = originalText;

        // Limpiar password para reintento seguro
        form.password.value = '';
        form.password.focus();
    }
};

window.App.handleRegister = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-register');
    const form = document.getElementById('register-form');

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    // Validaciones locales
    if (name.length < 2) {
        App.ui.toast("El nombre es muy corto", "warning"); return;
    }
    if (password.length < 6) {
        App.ui.toast("La contraseña debe tener al menos 6 caracteres", "warning"); return;
    }

    // UX: Bloquear
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creando cuenta...';

    try {
        await App.api.register({ email, password, name });
        App.ui.toast(`¡Hola ${name}! Tu cuenta ha sido creada.`, 'success');
        // Redirección automática en core.js
    } catch (error) {
        console.error("Registration Failed:", error);

        let msg = 'Error al registrarse.';
        if (error.code === 'auth/email-already-in-use') {
            msg = 'Este correo ya está registrado.';
        } else if (error.code === 'auth/invalid-email') {
            msg = 'Formato de correo inválido.';
        }

        App.ui.toast(msg, 'error');

        // UX: Restaurar
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};