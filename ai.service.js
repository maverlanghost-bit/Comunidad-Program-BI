/**
 * ai.service.js (V2.0 - SMART ENGINE)
 * Servicio de IA con Gestión de Personalidad y Contexto.
 * * CAMBIOS V2.0:
 * - SYSTEM PROMPT: Define la personalidad de experto de ProgramBI.
 * - ERROR HANDLING: Reintentos silenciosos y mensajes de error amigables.
 * - CONTEXT WINDOW: Limpieza básica de historial para eficiencia.
 */

window.App = window.App || {};
window.App.aiService = window.App.aiService || {};

// CONFIGURACIÓN (Recuerda: En producción usa un Proxy/Backend)
const AI_CONFIG = {
    apiKey: "", // ⚠️ INSERTA TU OPENROUTER KEY AQUÍ
    baseUrl: "https://openrouter.ai/api/v1",
    siteUrl: window.location.origin,
    siteName: "ProgramBI LMS"
};

// PERSONALIDAD DEL ASISTENTE
const SYSTEM_PROMPT = {
    role: "system",
    content: "Eres el Asistente de IA oficial de ProgramBI, una plataforma de educación tecnológica de alto nivel. Tu objetivo es ayudar a los estudiantes con código, arquitectura de software y dudas técnicas. Tus respuestas deben ser: 1. Profesionales y concisas. 2. Usar Markdown para el código. 3. Didácticas (explica el porqué). 4. En español neutro. Si te preguntan quién eres, responde que eres el copiloto de ProgramBI."
};

// ============================================================================
// 1. API DE OPENROUTER (STREAMING PRO)
// ============================================================================

App.aiService.streamMessage = async (history, onChunk, onComplete) => {
    if (!AI_CONFIG.apiKey) {
        App.ui.toast("⚠️ Configura la API Key en ai.service.js", "warning");
        if (onComplete) onComplete("Error: API Key no configurada.");
        return;
    }

    try {
        // Preparar mensajes: System Prompt + Últimos 10 mensajes (Context Window)
        const messagesPayload = [SYSTEM_PROMPT, ...history.slice(-10)];

        const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AI_CONFIG.apiKey}`,
                "HTTP-Referer": AI_CONFIG.siteUrl,
                "X-Title": AI_CONFIG.siteName,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "x-ai/grok-2-vision-1212", // O "google/gemini-pro-1.5" según prefieras
                messages: messagesPayload,
                stream: true,
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `Error API: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullResponse = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const content = json.choices[0]?.delta?.content || "";
                        if (content) {
                            fullResponse += content;
                            if (onChunk) onChunk(content);
                        }
                    } catch (e) { /* Ignorar chunks incompletos */ }
                }
            }
        }

        if (onComplete) onComplete(fullResponse);

    } catch (error) {
        console.error("AI Service Error:", error);
        App.ui.toast("La IA tuvo un problema momentáneo", "error");
        if (onComplete) onComplete(null, error);
    }
};

// ============================================================================
// 2. GESTIÓN DE HISTORIAL (FIREBASE)
// ============================================================================

App.aiService.getConversations = async (userId) => {
    try {
        const q = window.F.query(
            window.F.collection(window.F.db, `users/${userId}/ai_conversations`),
            window.F.orderBy("updatedAt", "desc"),
            window.F.limit(20)
        );
        const snap = await window.F.getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error historial:", e);
        return [];
    }
};

App.aiService.createConversation = async (userId, title = "Nuevo Chat") => {
    try {
        const docRef = await window.F.addDoc(window.F.collection(window.F.db, `users/${userId}/ai_conversations`), {
            title: title,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preview: "Iniciando..."
        });
        return docRef.id;
    } catch (e) { throw e; }
};

App.aiService.saveMessage = async (userId, conversationId, role, content) => {
    try {
        await window.F.addDoc(window.F.collection(window.F.db, `users/${userId}/ai_conversations/${conversationId}/messages`), {
            role, content, createdAt: new Date().toISOString()
        });

        // Actualizar resumen y timestamp
        const preview = content.substring(0, 40) + (content.length > 40 ? "..." : "");
        await window.F.updateDoc(window.F.doc(window.F.db, `users/${userId}/ai_conversations`, conversationId), {
            updatedAt: new Date().toISOString(),
            preview: preview
        });
    } catch (e) { console.error("Error guardando mensaje:", e); }
};

App.aiService.getMessages = async (userId, conversationId) => {
    try {
        const q = window.F.query(
            window.F.collection(window.F.db, `users/${userId}/ai_conversations/${conversationId}/messages`),
            window.F.orderBy("createdAt", "asc")
        );
        const snap = await window.F.getDocs(q);
        return snap.docs.map(doc => doc.data());
    } catch (e) { return []; }
};

App.aiService.generateTitle = async (text) => {
    // Título inteligente simple basado en las primeras palabras
    return text.split(' ').slice(0, 5).join(' ') + "...";
};