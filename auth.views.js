/**
 * auth.views.js (V11.0 - Professional Identity)
 * Módulo de Autenticación: Login, Registro y Onboarding.
 * Diseño Split-Screen moderno alineado con la marca #1890ff.
 */

window.App = window.App || {};

// ==========================================
// 1. LOGIN (INICIO DE SESIÓN)
// ==========================================
window.App.renderLogin = () => {
    // Si ya hay sesión, el router redirige, pero por seguridad:
    if (App.state.currentUser) return window.location.hash = '#home';

    const html = `
    <div class="min-h-screen w-full flex bg-white animate-fade-in relative overflow-hidden font-sans">
        
        <!-- IZQUIERDA: ARTE VISUAL (Desktop) -->
        <div class="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-[#1890ff]/30 to-slate-900/90 z-10"></div>
            <!-- Imagen de fondo profesional -->
            <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
            
            <div class="relative z-20">
                <div class="w-12 h-12 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/30 mb-6">
                    <i class="fas fa-cubes"></i>
                </div>
                <h2 class="text-4xl font-heading font-extrabold text-white leading-tight mb-4">
                    Domina el futuro.<br>Aprende hoy.
                </h2>
                <p class="text-slate-300 text-lg max-w-md">
                    Únete a la comunidad de aprendizaje más avanzada. Cursos en vivo, mentorías y proyectos reales.
                </p>
            </div>

            <div class="relative z-20 text-xs text-slate-500 font-medium">
                © ${new Date().getFullYear()} ProgramBI Inc. Todos los derechos reservados.
            </div>
        </div>

        <!-- DERECHA: FORMULARIO -->
        <div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
            <div class="w-full max-w-md space-y-8">
                <div class="text-center lg:text-left">
                    <div class="lg:hidden w-12 h-12 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-2xl shadow-lg mx-auto mb-6">
                        <i class="fas fa-cubes"></i>
                    </div>
                    <h2 class="text-3xl font-heading font-bold text-slate-900">Bienvenido de nuevo</h2>
                    <p class="text-slate-500 mt-2">Ingresa tus credenciales para continuar.</p>
                </div>

                <form onsubmit="App.handleLogin(event)" class="space-y-5">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Correo Electrónico</label>
                        <div class="relative group">
                            <i class="fas fa-envelope absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#1890ff] transition-colors"></i>
                            <input type="email" name="email" required 
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#1890ff] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium"
                                placeholder="nombre@ejemplo.com">
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Contraseña</label>
                        <div class="relative group">
                            <i class="fas fa-lock absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#1890ff] transition-colors"></i>
                            <input type="password" name="password" required 
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#1890ff] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium"
                                placeholder="••••••••">
                        </div>
                    </div>

                    <div class="flex items-center justify-between text-xs font-bold">
                        <label class="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-700">
                            <input type="checkbox" class="rounded border-slate-300 text-[#1890ff] focus:ring-[#1890ff]">
                            Recordarme
                        </label>
                        <a href="#" class="text-[#1890ff] hover:underline">¿Olvidaste tu contraseña?</a>
                    </div>

                    <button type="submit" id="btn-login" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        Iniciar Sesión
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
    if (App.state.currentUser) return window.location.hash = '#home';

    const html = `
    <div class="min-h-screen w-full flex bg-white animate-fade-in relative overflow-hidden font-sans">
        <!-- IZQUIERDA (Igual que login para consistencia) -->
        <div class="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-[#1890ff]/30 to-slate-900/90 z-10"></div>
            <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
            
            <div class="relative z-20">
                <div class="w-12 h-12 bg-[#1890ff] rounded-xl flex items-center justify-center text-white text-2xl shadow-lg mb-6"><i class="fas fa-cubes"></i></div>
                <h2 class="text-4xl font-heading font-extrabold text-white leading-tight mb-4">Comienza tu viaje<br>profesional.</h2>
                <div class="space-y-4 text-slate-300">
                    <div class="flex items-center gap-3"><i class="fas fa-check-circle text-green-400"></i><span>Acceso ilimitado a cursos base</span></div>
                    <div class="flex items-center gap-3"><i class="fas fa-check-circle text-green-400"></i><span>Certificados de finalización</span></div>
                    <div class="flex items-center gap-3"><i class="fas fa-check-circle text-green-400"></i><span>Comunidad activa 24/7</span></div>
                </div>
            </div>
            <div class="relative z-20 text-xs text-slate-500 font-medium">© ${new Date().getFullYear()} ProgramBI Inc.</div>
        </div>

        <!-- DERECHA: FORMULARIO -->
        <div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
            <div class="w-full max-w-md space-y-8">
                <div class="text-center lg:text-left">
                    <h2 class="text-3xl font-heading font-bold text-slate-900">Crear Cuenta</h2>
                    <p class="text-slate-500 mt-2">Únete gratis y empieza a aprender hoy.</p>
                </div>

                <form onsubmit="App.handleRegister(event)" class="space-y-5">
                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">Nombre Completo</label>
                        <div class="relative group">
                            <i class="fas fa-user absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#1890ff] transition-colors"></i>
                            <input type="text" name="name" required class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#1890ff] transition-all text-sm font-medium" placeholder="Tu nombre">
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

                    <button type="submit" id="btn-register" class="w-full bg-[#1890ff] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-[0.98] transition-all">
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
// 3. LOGICA DE FORMULARIOS (HANDLERS)
// ==========================================
window.App.handleLogin = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const email = e.target.email.value;
    const password = e.target.password.value;

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Entrando...';

    try {
        await App.api.login(email, password);
        // La redirección la maneja el listener onAuthStateChanged en core.js
    } catch (error) {
        console.error(error);
        App.ui.toast('Credenciales incorrectas o error de conexión.', 'error');
        btn.disabled = false; btn.innerHTML = 'Iniciar Sesión';
    }
};

window.App.handleRegister = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-register');
    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creando...';

    try {
        await App.api.register({ email, password, name });
        App.ui.toast('¡Bienvenido! Cuenta creada.', 'success');
        // Redirección automática por core.js
    } catch (error) {
        console.error(error);
        let msg = 'Error al registrarse.';
        if(error.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado.';
        App.ui.toast(msg, 'error');
        btn.disabled = false; btn.innerHTML = 'Registrarse Gratis';
    }
};