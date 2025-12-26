/**
 * auth.views.js (V3 - Flagship Edition - PROD)
 * Autenticación conectada a Firebase.
 */

window.App.renderLogin = () => {
    if (App.state.currentUser) {
        window.location.hash = '#home';
        return;
    }

    const html = `
        <div class="min-h-screen w-full flex items-center justify-center bg-[#FAFAFA] px-4 animate-fade-in">
            <div class="w-full max-w-[400px]">
                
                <div class="flex flex-col items-center mb-10">
                    <div class="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center text-2xl shadow-xl mb-4">
                        <i class="fas fa-cubes"></i>
                    </div>
                    <h1 class="text-2xl font-heading font-bold text-gray-900">ProgramBI</h1>
                    <p class="text-gray-500 text-sm">Plataforma Educativa & Comunidad</p>
                </div>

                <div class="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <h2 class="text-xl font-bold mb-6 text-gray-900 text-center">Bienvenido</h2>
                    
                    <form onsubmit="App.handleLogin(event)" class="space-y-5 relative z-10">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-gray-900 uppercase tracking-wide ml-1">Email</label>
                            <input type="email" id="login-email" class="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-0 outline-none transition-all text-sm font-medium" placeholder="tu@email.com" required>
                        </div>
                        
                        <div class="space-y-1.5">
                            <div class="flex justify-between ml-1">
                                <label class="text-xs font-bold text-gray-900 uppercase tracking-wide">Contraseña</label>
                            </div>
                            <input type="password" id="login-pass" class="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-0 outline-none transition-all text-sm font-medium" placeholder="••••" required>
                        </div>

                        <button type="submit" id="btn-login" class="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2 mt-4">
                            <span>Entrar</span>
                        </button>
                    </form>

                    <div id="login-loader" class="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center hidden z-20">
                        <i class="fas fa-circle-notch fa-spin text-2xl"></i>
                    </div>
                </div>
                
                <div class="mt-8 text-center space-y-4">
                    <p class="text-xs text-gray-500">¿Nuevo aquí? <a href="#register" class="font-bold text-black hover:underline">Crear cuenta gratis</a></p>
                    
                    <!-- HERRAMIENTA DE MIGRACIÓN (SOLO PRIMER USO) -->
                    <div class="pt-4 border-t border-gray-200">
                        <button onclick="App.runMigration()" class="text-[10px] text-gray-400 hover:text-red-500 font-mono cursor-pointer transition-colors">
                            <i class="fas fa-database mr-1"></i> Inicializar DB (Seed Data)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    App.render(html);
};

window.App.handleLogin = async (e) => {
    e.preventDefault();
    const loader = document.getElementById('login-loader');
    loader.classList.remove('hidden');

    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    try {
        await App.api.login(email, pass);
        // La redirección ocurre en onAuthStateChanged (core.js)
    } catch (error) {
        loader.classList.add('hidden');
        App.ui.toast(error.message, 'error');
    }
};

window.App.runMigration = async () => {
    if(confirm("¿Estás seguro? Esto inyectará datos de prueba en tu base de datos de Firebase.")) {
        App.ui.toast("Iniciando migración...", "info");
        await App.api.seedDatabase();
        App.ui.toast("Migración completada. Ahora puedes loguearte.", "success");
    }
};

// ... Resto de funciones de registro (igual que antes) ...

window.App.renderRegister = () => {
    const html = `
        <div class="min-h-screen w-full flex items-center justify-center bg-[#FAFAFA] px-4 animate-slide-up">
            <div class="w-full max-w-[400px]">
                <div class="text-center mb-8">
                    <h1 class="text-2xl font-heading font-bold text-gray-900">Crear Cuenta</h1>
                    <p class="text-gray-500 text-sm">Empieza tu viaje en datos.</p>
                </div>

                <div class="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <form onsubmit="App.handleRegister(event)" class="space-y-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-900 uppercase ml-1">Nombre Completo</label>
                            <input type="text" id="reg-name" class="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-medium" placeholder="Ej. Ana Torres" required>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-900 uppercase ml-1">Email</label>
                            <input type="email" id="reg-email" class="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-medium" placeholder="tu@email.com" required>
                        </div>
                        
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-900 uppercase ml-1">Contraseña</label>
                            <input type="password" id="reg-pass" class="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-medium" placeholder="Mínimo 6 caracteres" required minlength="6">
                        </div>

                        <button type="submit" id="btn-reg" class="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-900 transition-all shadow-lg mt-2">
                            Registrarme
                        </button>
                    </form>
                </div>
                
                <p class="text-center text-xs text-gray-500 mt-6">
                    ¿Ya tienes cuenta? <a href="#login" class="font-bold text-black hover:underline">Iniciar Sesión</a>
                </p>
            </div>
        </div>
    `;
    App.render(html);
};

window.App.handleRegister = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-reg');
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creando...';
    btn.disabled = true;

    try {
        await App.api.register({ name, email, password });
        App.ui.toast('¡Cuenta creada con éxito!', 'success');
        window.location.hash = '#onboarding';
    } catch (error) {
        btn.innerHTML = 'Registrarme';
        btn.disabled = false;
        App.ui.toast(error.message, 'error');
    }
};

window.App.renderOnboarding = () => {
    if (!App.state.currentUser) { window.location.hash = '#login'; return; }

    const html = `
        <div class="min-h-screen w-full flex items-center justify-center bg-[#FAFAFA] px-4 animate-fade-in">
            <div class="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                <div class="bg-black text-white p-10 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
                    <div class="relative z-10">
                        <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-6"><i class="fas fa-rocket"></i></div>
                        <h2 class="text-xl font-bold mb-2">Personaliza tu perfil</h2>
                        <p class="text-sm text-gray-400">Ayúdanos a recomendarte las mejores comunidades.</p>
                    </div>
                </div>

                <div class="p-10 md:flex-1 flex flex-col justify-center">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">¿Cuál es tu perfil actual?</h2>
                    <div class="space-y-3 mb-8">
                        ${['Estudiante', 'Analista de Datos', 'Desarrollador', 'Gerente'].map(role => `
                            <label class="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-black transition-colors group has-[:checked]:border-black has-[:checked]:bg-gray-50">
                                <input type="radio" name="role" class="mr-3 accent-black" value="${role}">
                                <span class="font-medium text-gray-700 group-has-[:checked]:text-black">${role}</span>
                            </label>
                        `).join('')}
                    </div>

                    <div class="flex justify-end">
                        <button onclick="App.handleFinishOnboarding()" class="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg flex items-center gap-2">
                            Finalizar <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    App.render(html);
};

window.App.handleFinishOnboarding = async () => {
    const selected = document.querySelector('input[name="role"]:checked');
    if (!selected) return App.ui.toast('Por favor selecciona un rol', 'error');

    const role = selected.value;
    try {
        await App.api.updateProfile(App.state.currentUser.uid, { 
            roleDescription: role,
            onboardingCompleted: true 
        });
        App.ui.toast('¡Perfil configurado!', 'success');
        window.location.hash = '#home';
    } catch (e) {
        App.ui.toast('Error guardando perfil', 'error');
    }
};