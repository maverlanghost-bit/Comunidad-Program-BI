/**
 * ai.views.js (V3.0 - LUXURY UI)
 * Interfaz de Usuario para Asistente IA de Primer Nivel.
 * * CAMBIOS VISUALES:
 * - DISEÑO CENTRADO: Estilo Claude/Perplexity (columna central limpia).
 * - ESTÉTICA PREMIUM: Sombras suaves, glassmorphism, avatares con gradiente.
 * - MARKDOWN PRO: Bloques de código con tema oscuro y barra de herramientas.
 * - INPUT FLOTANTE: Caja de texto moderna y estilizada.
 */

window.App = window.App || {};
window.App.ai = window.App.ai || {};

window.App.ai.state = {
    currentConversationId: null,
    isGenerating: false,
    userScrolledUp: false
};

// Cargar Marked.js + Highlight.js (para coloreado de sintaxis real si se desea)
(function loadDependencies() {
    if (!window.marked) {
        const s = document.createElement('script');
        s.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
        s.onload = () => {
            const renderer = new marked.Renderer();
            
            // Custom Code Block Renderer
            renderer.code = function(code, language) {
                const validLang = !!(language && language.length > 0);
                const langLabel = validLang ? language : 'texto';
                return `
                <div class="code-block group my-6 rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-2xl relative font-sans">
                    <div class="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 backdrop-blur-sm">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fas fa-code text-purple-400"></i> ${langLabel}
                        </span>
                        <button onclick="App.ai.copyToClipboard(this)" class="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md">
                            <i class="far fa-copy"></i> Copiar
                        </button>
                        <div class="hidden code-content">${encodeURIComponent(code)}</div>
                    </div>
                    <div class="p-4 overflow-x-auto custom-scrollbar">
                        <code class="text-sm font-mono text-slate-300 leading-relaxed">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
                    </div>
                </div>`;
            };

            // Custom Link Renderer (Open in new tab)
            renderer.link = function(href, title, text) {
                return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/30 transition-colors font-medium">${text}</a>`;
            };

            marked.use({ renderer });
        };
        document.head.appendChild(s);
    }
})();

// ============================================================================
// 1. RENDERIZADOR PRINCIPAL (LAYOUT)
// ============================================================================

window.App.ai.render = async (container, conversationId = null) => {
    const user = App.state.currentUser;
    window.App.ai.state.currentConversationId = conversationId;

    container.innerHTML = `
    <div class="flex flex-col h-full bg-[#f8f9fa] dark:bg-[#0b0f19] relative font-sans transition-colors duration-500">
        
        <!-- TOP BAR (Minimalista) -->
        <div class="h-16 flex items-center justify-between px-6 shrink-0 z-20 bg-transparent">
            <div class="flex items-center gap-2 md:hidden">
                <span class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> ProgramBI AI
                </span>
            </div>
            <div class="hidden md:flex items-center gap-2 mx-auto px-4 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-gray-200/50 dark:border-white/5 shadow-sm">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Modelo:</span>
                <span class="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">Grok 4.1 Fast</span>
            </div>
        </div>

        <!-- ÁREA DE SCROLL (Contenido) -->
        <div id="ai-chat-scroller" class="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative">
            <!-- Espaciador superior -->
            <div class="h-4"></div>
            
            <div id="ai-messages-container" class="max-w-3xl mx-auto w-full px-4 md:px-0 pb-32 flex flex-col gap-6">
                <div class="flex justify-center py-40 opacity-0 animate-fade-in delay-200">
                    <div class="flex flex-col items-center gap-4">
                        <div class="relative">
                            <div class="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 animate-ping absolute inset-0 opacity-50"></div>
                            <i class="fas fa-circle-notch fa-spin text-purple-600 text-3xl relative z-10"></i>
                        </div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando Memoria...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ÁREA DE INPUT (Flotante Premium) -->
        <div class="absolute bottom-0 left-0 w-full p-4 md:p-6 z-30 pointer-events-none">
            <div class="max-w-3xl mx-auto w-full relative pointer-events-auto group/input">
                
                <!-- Botón Scroll Down (Condicional) -->
                <button id="scroll-down-btn" onclick="App.ai.scrollToBottom(true)" class="absolute -top-14 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 text-slate-500 dark:text-white p-2 rounded-full shadow-xl border border-gray-100 dark:border-slate-700 hidden animate-bounce-short hover:scale-110 transition-transform z-0">
                    <i class="fas fa-arrow-down text-sm"></i>
                </button>

                <form onsubmit="App.ai.handleSubmit(event)" class="relative bg-white dark:bg-[#151b2b] rounded-[2rem] shadow-2xl shadow-purple-900/5 dark:shadow-black/50 border border-gray-200 dark:border-slate-700/50 focus-within:border-purple-500/30 focus-within:ring-4 focus-within:ring-purple-500/10 transition-all duration-300">
                    <textarea id="ai-input" rows="1" 
                        class="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 px-6 py-4 pr-16 resize-none max-h-48 custom-scrollbar font-medium text-[15px] placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                        placeholder="Pregúntame cualquier cosa..." 
                        onkeydown="App.ai.handleEnter(event)" 
                        oninput="this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 200) + 'px'"></textarea>
                    
                    <button type="submit" id="ai-send-btn" class="absolute right-2 bottom-2 w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full hover:scale-105 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-95 disabled:cursor-not-allowed flex items-center justify-center">
                        <i class="fas fa-arrow-up text-sm"></i>
                    </button>
                </form>
                
                <p class="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-3 font-medium opacity-0 group-hover/input:opacity-100 transition-opacity duration-500">
                    La IA puede cometer errores. Revisa el código importante.
                </p>
            </div>
            
            <!-- Gradiente inferior para suavizar scroll -->
            <div class="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#f8f9fa] dark:from-[#0b0f19] to-transparent -z-10 pointer-events-none"></div>
        </div>
    </div>`;

    // Setup Scroll Listener
    const scroller = document.getElementById('ai-chat-scroller');
    scroller.addEventListener('scroll', () => {
        const isBottom = scroller.scrollHeight - scroller.scrollTop <= scroller.clientHeight + 100;
        window.App.ai.state.userScrolledUp = !isBottom;
        const btn = document.getElementById('scroll-down-btn');
        if(btn) btn.classList.toggle('hidden', isBottom);
    });

    // Cargar Datos
    await App.ai.loadConversation(user.uid, conversationId);
    
    // Actualizar Sidebar (Contexto IA)
    if (App.aiService && App.aiService.getConversations) {
        App.aiService.getConversations(user.uid).then(history => {
            App.state.cache.aiConversations = history;
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                const wrapper = document.getElementById('shell-sidebar');
                if(wrapper) wrapper.innerHTML = App.sidebar.render('ai');
            }
        });
    }
};

// ============================================================================
// 2. LÓGICA DE CARGA & MENSAJES
// ============================================================================

window.App.ai.loadConversation = async (userId, conversationId) => {
    const container = document.getElementById('ai-messages-container');
    if (!container) return;

    if (!conversationId) {
        container.innerHTML = _renderWelcomeScreen(App.state.currentUser.name);
        return;
    }

    try {
        const messages = await App.aiService.getMessages(userId, conversationId);
        if (messages.length === 0) {
            container.innerHTML = _renderWelcomeScreen(App.state.currentUser.name);
        } else {
            container.innerHTML = messages.map(m => _renderMessageBubble(m.role, m.content)).join('');
        }
        // Pequeño delay para asegurar renderizado de imágenes/markdown antes de scroll
        setTimeout(() => App.ai.scrollToBottom(true), 100);
    } catch (e) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                <i class="fas fa-wifi text-3xl mb-2 text-red-400"></i>
                <p class="text-sm">No pudimos cargar la conversación.</p>
            </div>`;
    }
};

// ============================================================================
// 3. INTERACCIÓN (ENVÍO & STREAMING)
// ============================================================================

window.App.ai.handleEnter = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!window.App.ai.state.isGenerating) App.ai.handleSubmit(e);
    }
};

window.App.ai.handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const input = document.getElementById('ai-input');
    const txt = input.value.trim();
    if (!txt || window.App.ai.state.isGenerating) return;

    const container = document.getElementById('ai-messages-container');
    const userId = App.state.currentUser.uid;
    let conversationId = window.App.ai.state.currentConversationId;

    // UI Reset
    input.value = '';
    input.style.height = 'auto';
    _toggleLoadingState(true);
    
    // Si estamos en bienvenida, limpiar
    const welcome = container.querySelector('.welcome-screen');
    if (welcome) {
        welcome.classList.add('opacity-0', 'scale-95'); // Animación salida
        setTimeout(() => { 
            welcome.remove();
            // Inyectar mensaje usuario
            container.insertAdjacentHTML('beforeend', _renderMessageBubble('user', txt));
            App.ai.scrollToBottom(true);
        }, 300);
    } else {
        container.insertAdjacentHTML('beforeend', _renderMessageBubble('user', txt));
        App.ai.scrollToBottom(true);
    }

    try {
        // Crear conversación si es nueva
        if (!conversationId) {
            const title = await App.aiService.generateTitle(txt);
            conversationId = await App.aiService.createConversation(userId, title);
            window.App.ai.state.currentConversationId = conversationId;
            history.replaceState(null, null, `#ai/${conversationId}`);
            
            // Actualizar Sidebar silenciosamente
            App.aiService.getConversations(userId).then(list => {
                App.state.cache.aiConversations = list;
                const wrapper = document.getElementById('shell-sidebar');
                if(wrapper) wrapper.innerHTML = App.sidebar.render('ai');
            });
        }

        // Guardar User Message
        await App.aiService.saveMessage(userId, conversationId, 'user', txt);

        // Crear Burbuja IA con estado "Pensando"
        const aiBubbleId = `ai-msg-${Date.now()}`;
        const thinkingHtml = `
            <div class="flex items-center gap-1 h-6" id="thinking-${aiBubbleId}">
                <div class="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-75"></div>
                <div class="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-150"></div>
            </div>`;
            
        container.insertAdjacentHTML('beforeend', `
            <div class="flex gap-4 group animate-slide-up pb-2">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/20 mt-1">
                    <i class="fas fa-brain text-[10px]"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-[11px] text-slate-900 dark:text-white mb-1.5 ml-1 opacity-90">ProgramBI AI</div>
                    <div id="${aiBubbleId}" class="text-[15px] text-slate-700 dark:text-slate-300 leading-7 font-normal">
                        ${thinkingHtml}
                    </div>
                </div>
            </div>
        `);
        App.ai.scrollToBottom(true);

        // Iniciar Streaming
        const messages = await App.aiService.getMessages(userId, conversationId);
        const responseElem = document.getElementById(aiBubbleId);
        let fullResponse = "";
        let isFirstChunk = true;

        await App.aiService.streamMessage(
            messages.map(m => ({ role: m.role, content: m.content })),
            (chunk) => {
                if (isFirstChunk) {
                    const thinking = document.getElementById(`thinking-${aiBubbleId}`);
                    if(thinking) thinking.remove(); // Quitar animación pensar
                    isFirstChunk = false;
                }
                fullResponse += chunk;
                
                // Renderizado
                if (window.marked) {
                    responseElem.innerHTML = window.marked.parse(fullResponse);
                } else {
                    responseElem.innerText = fullResponse;
                }
                App.ai.scrollToBottom();
            },
            async (finalText) => {
                if (finalText) {
                    await App.aiService.saveMessage(userId, conversationId, 'assistant', finalText);
                }
                _toggleLoadingState(false);
            }
        );

    } catch (err) {
        console.error(err);
        App.ui.toast("Error de conexión con el cerebro", "error");
        _toggleLoadingState(false);
        const thinking = document.querySelector('[id^="thinking-"]');
        if(thinking) thinking.parentElement.innerHTML = `<span class="text-red-400">Error: No pude conectar con el servidor.</span>`;
    }
};

// ============================================================================
// 4. HELPERS VISUALES
// ============================================================================

window.App.ai.scrollToBottom = (force = false) => {
    if (window.App.ai.state.userScrolledUp && !force) return;
    const scroller = document.getElementById('ai-chat-scroller');
    if (scroller) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    }
};

window.App.ai.copyToClipboard = (btn) => {
    const encoded = btn.parentElement.querySelector('.code-content').innerText;
    const code = decodeURIComponent(encoded);
    navigator.clipboard.writeText(code).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check text-green-400"></i> Copiado';
        btn.classList.add('text-green-400');
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('text-green-400');
        }, 2000);
    });
};

window.App.ai.newChat = () => {
    window.location.hash = '#ai';
    App.ai.render(document.getElementById('ai-root') || document.getElementById('main-scroll-wrapper'));
};

function _renderMessageBubble(role, content) {
    const isUser = role === 'user';
    let rendered = content;
    
    if (window.marked && !isUser) {
        rendered = window.marked.parse(content);
    } else {
        rendered = content.replace(/\n/g, '<br>');
    }

    if (isUser) {
        return `
        <div class="flex justify-end animate-slide-up">
            <div class="bg-[#f4f4f4] dark:bg-[#21262d] text-slate-800 dark:text-slate-200 px-5 py-3 rounded-[20px] rounded-br-none max-w-[85%] shadow-sm border border-black/5 dark:border-white/5 text-[15px] leading-relaxed">
                ${rendered}
            </div>
        </div>`;
    } else {
        return `
        <div class="flex gap-4 group animate-slide-up pb-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/20 mt-1">
                <i class="fas fa-brain text-[10px]"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-bold text-[11px] text-slate-900 dark:text-white mb-1.5 ml-1 opacity-90">ProgramBI AI</div>
                <div class="text-[15px] text-slate-700 dark:text-slate-300 leading-7 font-normal prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-bold prose-code:text-purple-600 dark:prose-code:text-purple-300 prose-pre:my-4">
                    ${rendered}
                </div>
            </div>
        </div>`;
    }
}

function _renderWelcomeScreen(name) {
    const suggestions = [
        { icon: 'fa-code', title: 'Generar función', prompt: 'Escribe una función en Python para analizar un CSV' },
        { icon: 'fa-bug', title: 'Depurar código', prompt: 'Tengo un error en mi useEffect de React, ¿puedes ayudarme?' },
        { icon: 'fa-layer-group', title: 'Arquitectura', prompt: '¿Cuál es la mejor estructura de carpetas para una API Express?' },
        { icon: 'fa-database', title: 'SQL Query', prompt: 'Ayúdame a optimizar una consulta SQL compleja' }
    ];

    return `
    <div class="welcome-screen flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in transition-all duration-500">
        
        <div class="mb-8 relative group cursor-default">
            <div class="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full group-hover:bg-purple-500/50 transition-all duration-500"></div>
            <div class="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex items-center justify-center relative z-10 border border-gray-100 dark:border-slate-700">
                <i class="fas fa-wand-magic-sparkles text-3xl text-transparent bg-clip-text bg-gradient-to-br from-purple-600 to-blue-500"></i>
            </div>
        </div>

        <h1 class="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Hola, <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">${name}</span>
        </h1>
        <p class="text-slate-500 dark:text-slate-400 text-lg mb-12 max-w-lg font-medium">
            Soy tu arquitecto de software personal. <br>¿Qué vamos a construir hoy?
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
            ${suggestions.map(s => `
                <button onclick="document.getElementById('ai-input').value='${s.prompt}'; App.ai.handleSubmit()" 
                    class="flex items-center gap-4 p-4 text-left bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800 rounded-xl hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg transition-all group/card">
                    <div class="w-10 h-10 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/card:text-purple-500 group-hover/card:bg-purple-50 dark:group-hover/card:bg-purple-900/20 transition-colors">
                        <i class="fas ${s.icon}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-slate-700 dark:text-slate-200 group-hover/card:text-purple-600 dark:group-hover/card:text-purple-300 transition-colors">${s.title}</div>
                        <div class="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">"${s.prompt}"</div>
                    </div>
                </button>
            `).join('')}
        </div>
    </div>`;
}

function _toggleLoadingState(loading) {
    window.App.ai.state.isGenerating = loading;
    const btn = document.getElementById('ai-send-btn');
    if (loading) {
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
        btn.classList.add('bg-black', 'dark:bg-white', 'cursor-not-allowed');
    } else {
        btn.innerHTML = '<i class="fas fa-arrow-up text-sm"></i>';
        btn.classList.remove('bg-black', 'dark:bg-white', 'cursor-not-allowed');
        setTimeout(() => document.getElementById('ai-input')?.focus(), 100);
    }
}