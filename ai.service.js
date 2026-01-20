/**
 * ai.service.js (V14.0 - CRITICAL STREAM FIX)
 * Capa de Datos Blindada: Corrección de acumulador de texto.
 * * CAMBIOS V14:
 * 1. FIX CRÍTICO: 'streamMessage' ahora acumula la respuesta completa en una variable local.
 * 2. FIX CALLBACK: 'onComplete' ahora devuelve el texto acumulado (antes devolvía "").
 * -> Esto permite que 'ai.views.js' reciba el texto final y lo guarde en Firebase.
 */

window.App = window.App || {};
window.App.aiService = window.App.aiService || {};

// ============================================================================
// 1. CONFIGURACIÓN DEL NÚCLEO
// ============================================================================

const AI_CONFIG = {
    // 🚀 URL DEL PROXY DE PRODUCCIÓN
    baseUrl: "https://us-central1-comunidad-program-bi.cloudfunctions.net/aiProxy", 
    
    // Modelo Rápido y Capaz
    defaultModel: "x-ai/grok-4.1-fast", 
    maxContextMessages: 15,
    timeout: 45000 // 45s Timeout
};

// 🎓 SYSTEM PROMPT: MENTOR DE DATA ANALYTICS
const SYSTEM_PROMPT = {
    role: "system",
    content: `Eres Grok-BI, un Mentor Senior en Data Analytics y Desarrollo de Software.
    Tu audiencia son estudiantes y profesionales aprendiendo: Excel, Power BI (DAX/M), Python (Pandas/NumPy) y SQL.

    TUS OBJETIVOS PEDAGÓGICOS:
    1. Claridad Absoluta: Explica conceptos complejos con analogías sencillas y lenguaje claro.
    2. Código Educativo: Todo código (Python, SQL, DAX) debe estar bien comentado, explicando el "por qué" de cada paso importante.
    3. Buenas Prácticas: No solo des la solución; enseña la forma más eficiente y profesional de hacerlo (ej: "Mejor usar XLOOKUP que VLOOKUP", "Usa Medidas en lugar de Columnas Calculadas").
    4. Seguridad: Advierte siempre sobre riesgos (ej: borrar datos en SQL sin WHERE).

    REGLAS DE FORMATO:
    - Usa Markdown para estructurar tu respuesta (Negritas para énfasis, Listas para pasos).
    - Siempre encierra el código en bloques con su lenguaje: \`\`\`python, \`\`\`dax, \`\`\`sql.
    - Sé conciso pero completo. Evita saludos largos, ve directo al valor.
    - Si detectas un error en el código del usuario, explícalo con empatía y muestra la corrección.

    ESTILO DE PERSONALIDAD:
    - Profesional, paciente y alentador.
    - Actúa como un compañero senior que quiere que el usuario triunfe.`
};

let _activeController = null;

// Helper Privado para Actualizar UI Globalmente (Sidebar)
const _updateCacheAndNotify = (conversations) => {
    window.App.state = window.App.state || {};
    window.App.state.cache = window.App.state.cache || {};
    window.App.state.cache.aiConversations = conversations;
    
    // Despachar evento para que el Sidebar se entere
    window.dispatchEvent(new CustomEvent('app:ai-history-updated', { 
        detail: conversations 
    }));
};

// ============================================================================
// 2. MOTOR DE COMUNICACIÓN (PROXY STREAMING)
// ============================================================================

App.aiService.streamMessage = async (history, onChunk, onComplete) => {
    if (_activeController) {
        _activeController.abort();
        _activeController = null;
    }

    _activeController = new AbortController();
    const signal = _activeController.signal;

    // Acumulador local para asegurar que tenemos el texto completo al finalizar
    let accumulatedResponse = ""; 

    const timeoutId = setTimeout(() => {
        if (_activeController) _activeController.abort();
    }, AI_CONFIG.timeout);

    try {
        if (!window.F || !window.F.auth || !window.F.auth.currentUser) {
            throw new Error("Debes iniciar sesión para usar la IA.");
        }
        
        const idToken = await window.F.auth.currentUser.getIdToken(false);

        const recentHistory = history.slice(-AI_CONFIG.maxContextMessages);
        const messagesPayload = [
            SYSTEM_PROMPT, 
            ...recentHistory.map(m => ({
                role: m.role,
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) 
            }))
        ];

        const response = await fetch(AI_CONFIG.baseUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${idToken}`, 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: AI_CONFIG.defaultModel,
                messages: messagesPayload,
                stream: true
            }),
            signal: signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorMsg = `Error Backend (${response.status})`;
            try {
                errorMsg = await response.text();
            } catch (e) {}
            
            if (response.status === 403) errorMsg = "Sesión inválida. Recarga la página.";
            if (response.status === 500) errorMsg = "El servidor de IA está despertando. Intenta de nuevo en 5 segundos.";
            
            throw new Error(errorMsg);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop(); 

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;
                
                if (trimmed.startsWith("data: ")) {
                    try {
                        const json = JSON.parse(trimmed.substring(6));
                        const content = json.choices?.[0]?.delta?.content || "";
                        if (content) {
                            // 1. Acumulamos el contenido aquí
                            accumulatedResponse += content;
                            if (onChunk) onChunk(content);
                        }
                    } catch (e) { /* Ignorar JSON parciales */ }
                }
            }
        }

        _activeController = null;
        
        // 2. Pasamos el texto COMPLETO al finalizar
        if (onComplete) onComplete(accumulatedResponse); 

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            if (onComplete) onComplete(null, "abort"); 
        } else {
            console.error("AI Service Error:", error);
            if (onComplete) onComplete(null, error.message || "Error de conexión.");
        }
    }
};

App.aiService.stopGeneration = () => {
    if (_activeController) {
        _activeController.abort();
        _activeController = null;
        return true;
    }
    return false;
};

// ============================================================================
// 3. PERSISTENCIA (FIRESTORE - SAFE MODE)
// ============================================================================

// A. Obtener Lista de Conversaciones (CLIENT SIDE SORTING)
App.aiService.getConversations = async (userId) => {
    try {
        if (!window.F || !window.F.db) throw new Error("Firebase no inicializado");
        
        // Sin orderBy para evitar errores de índice
        const q = window.F.query(
            window.F.collection(window.F.db, `users/${userId}/ai_conversations`),
            window.F.limit(50) 
        );
        
        const snap = await window.F.getDocs(q);
        
        const conversations = snap.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            title: doc.data().title || "Conversación sin título",
            preview: doc.data().preview || "..."
        }));

        // Ordenar en JS (Más reciente primero)
        const sorted = conversations.sort((a, b) => {
            const dateA = new Date(a.updatedAt || 0);
            const dateB = new Date(b.updatedAt || 0);
            return dateB - dateA;
        });

        // Actualizar caché reactiva
        _updateCacheAndNotify(sorted);
        
        return sorted;

    } catch (e) { 
        console.error("Error fetching conversations:", e);
        _updateCacheAndNotify([]);
        return []; 
    }
};

// B. Crear Nueva Conversación
App.aiService.createConversation = async (userId, title = "Nueva Consulta") => {
    try {
        const docRef = await window.F.addDoc(window.F.collection(window.F.db, `users/${userId}/ai_conversations`), {
            title: title,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            model: AI_CONFIG.defaultModel,
            preview: "Iniciando..."
        });
        
        // Refrescar caché
        App.aiService.getConversations(userId);
        
        return docRef.id;
    } catch (e) { throw e; }
};

// C. Guardar Mensaje (CON VALIDACIÓN DE ID)
App.aiService.saveMessage = async (userId, conversationId, role, content, files = []) => {
    // 1. Validación de seguridad
    if (!conversationId) {
        console.error("❌ ERROR FATAL: Intentando guardar mensaje sin conversationId. Abortando.");
        return; 
    }

    try {
        console.log(`💾 [AI SERVICE] Guardando mensaje (${role}) en: ${conversationId}`);
        
        const msgData = {
            role, 
            content, 
            createdAt: new Date().toISOString()
        };
        if (files && files.length > 0) msgData.files = files;

        // 2. Guardar en Subcolección
        await window.F.addDoc(
            window.F.collection(window.F.db, `users/${userId}/ai_conversations/${conversationId}/messages`), 
            msgData
        );

        // 3. Actualizar Preview en Conversación Padre
        let previewText = content ? content.substring(0, 80).replace(/\n/g, ' ') : "";
        if (files.length > 0 && !previewText) previewText = `[${files.length} Archivos adjuntos]`;
        else if (content.length > 80) previewText += "...";

        await window.F.updateDoc(window.F.doc(window.F.db, `users/${userId}/ai_conversations`, conversationId), {
            updatedAt: new Date().toISOString(),
            preview: previewText
        });
        
        console.log("✅ [AI SERVICE] Mensaje guardado correctamente.");

    } catch (e) { 
        console.error("❌ [AI SERVICE] Error guardando mensaje:", e); 
    }
};

// D. Obtener Historial (SOLUCIÓN AL ERROR DE ÍNDICE)
App.aiService.getMessages = async (userId, conversationId) => {
    if (!conversationId) return [];

    try {
        // [FIX CRÍTICO] NO USAMOS orderBy EN LA QUERY
        // Pedimos los datos "crudos" y los ordenamos en memoria.
        // Esto evita que Firebase lance error si falta el índice compuesto.
        const msgsRef = window.F.collection(window.F.db, `users/${userId}/ai_conversations/${conversationId}/messages`);
        
        const snap = await window.F.getDocs(msgsRef);
        
        const msgs = snap.docs.map(doc => doc.data());
        
        // Ordenamiento seguro en Cliente (Más antiguo arriba, más nuevo abajo)
        return msgs.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateA - dateB;
        });

    } catch (e) { 
        console.error("Error crítico obteniendo mensajes:", e);
        return [];
    }
};

// E. Eliminar Conversación
App.aiService.deleteConversation = async (userId, conversationId) => {
    console.log(`[AI SERVICE] Intentando borrar chat: ${conversationId}`);
    try {
        const docRef = window.F.doc(window.F.db, "users", userId, "ai_conversations", conversationId);
        await window.F.deleteDoc(docRef);
        
        // Actualización Optimista
        if (window.App.state.cache.aiConversations) {
            const filtered = window.App.state.cache.aiConversations.filter(c => c.id !== conversationId);
            _updateCacheAndNotify(filtered);
        }
        
        return true;
    } catch (e) { 
        console.error("[AI SERVICE] Error al borrar:", e);
        return false; 
    }
};

// ============================================================================
// 4. UTILIDADES
// ============================================================================

App.aiService.generateTitle = async (text) => {
    if (!text) return "Nueva Consulta";
    const cleanText = text.replace(/[#*`]/g, '').trim(); 
    if (cleanText.length < 30) return cleanText;
    return cleanText.split(' ').slice(0, 6).join(' ') + "...";
};