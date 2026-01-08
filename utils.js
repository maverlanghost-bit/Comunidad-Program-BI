/**
 * utils.js (CORE UTILITIES)
 * El pegamento que mantiene unida la aplicación.
 * FUNCIONES CRÍTICAS:
 * 1. Gestión de Tema (Día/Noche) con persistencia.
 * 2. Cargador Asíncrono de Monaco Editor (Para Super Clase).
 * 3. Formateadores de fecha y números.
 */

window.App = window.App || {};
window.App.utils = window.App.utils || {};

// ============================================================================
// 1. GESTIÓN DE TEMA (DARK MODE)
// ============================================================================
window.App.state = window.App.state || {};
window.App.state.theme = localStorage.getItem('theme') || 'light';

// Aplicar tema al iniciar
if (window.App.state.theme === 'dark') {
    document.body.classList.add('dark-mode');
}

window.App.toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    const newTheme = isDark ? 'dark' : 'light';
    
    // Guardar estado
    window.App.state.theme = newTheme;
    localStorage.setItem('theme', newTheme);

    // Actualizar Mónaco si está abierto (Super Clase)
    if (window.monaco && window.editorInstance) {
        window.monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    }

    // Feedback en consola
    console.log(`🌗 Tema cambiado a: ${newTheme.toUpperCase()}`);
};

// ============================================================================
// 2. MONACO EDITOR LOADER (SUPER CLASE)
// ============================================================================
// Carga perezosa (Lazy Load) para no ralentizar la app si no se usa el IDE
window.App.utils.loadMonaco = () => {
    return new Promise((resolve, reject) => {
        if (window.monaco) {
            resolve(window.monaco); // Ya estaba cargado
            return;
        }

        // 1. Configurar Loader de RequireJS
        const loaderScript = document.createElement('script');
        loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js';
        
        loaderScript.onload = () => {
            // 2. Configurar rutas de Monaco
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

            // 3. Cargar módulos principales
            require(['vs/editor/editor.main'], () => {
                resolve(window.monaco);
            });
        };

        loaderScript.onerror = reject;
        document.body.appendChild(loaderScript);
    });
};

// ============================================================================
// 3. FORMATEADORES (FECHAS Y NÚMEROS)
// ============================================================================

window.App.ui = window.App.ui || {};

// Formato relativo ("Hace 2 horas", "Ayer")
window.App.ui.formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diff = (now - date) / 1000; // Segundos

    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
    
    // Formato fecha corta para antiguos
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

// Formato compacto (1.2k, 1M)
window.App.ui.formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

// Toast Notification Simple (Feedback visual)
window.App.ui.toast = (msg, type = 'info') => {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-slate-800'
    };
    
    const div = document.createElement('div');
    div.className = `fixed bottom-5 right-5 ${colors[type] || colors.info} text-white px-6 py-3 rounded-xl shadow-2xl z-[10000] animate-slide-up font-bold text-sm flex items-center gap-3`;
    div.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : 'fa-info-circle'}"></i>
        <span>${msg}</span>
    `;
    
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateY(10px)';
        setTimeout(() => div.remove(), 300);
    }, 3000);
};