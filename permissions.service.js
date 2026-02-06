/**
 * permissions.service.js (V1.0 - SUBSCRIPTION RESTRICTIONS)
 * Servicio centralizado para verificar permisos y restricciones por plan.
 * 
 * FEATURES:
 * 1. Verificación de acceso a clases (límite por plan)
 * 2. Verificación de acceso a modelos IA
 * 3. Control de mensajes con profesor (límite mensual)
 * 4. Verificación de estado de trial
 * 5. Modal de upgrade centralizado
 */

window.App = window.App || {};
window.App.permissions = window.App.permissions || {};

// ============================================================================
// 1. CONFIGURACIÓN POR DEFECTO
// ============================================================================

const DEFAULT_RESTRICTIONS = {
    maxClassesPerCourse: 2,          // -1 = ilimitado
    maxProfessorMessages: 5,          // -1 = ilimitado
    allowedAIModels: ['grok-fast'],   // Modelos permitidos
    accessAIAfterTrial: false,        // ¿Puede usar AI después del trial?
    canAccessSuperClass: false,       // ¿Puede usar modo IDE?
    canDownloadContent: false         // ¿Puede descargar contenido?
};

const AI_MODELS_CONFIG = {
    'grok-fast': {
        name: 'Grok 4.1 Fast',
        tier: 'free',
        modelId: 'x-ai/grok-4.1-fast',
        logo: 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/grok-ai-icon.webp?v=1768942289'
    },
    'grok-full': {
        name: 'Grok 4.1 Full',
        tier: 'basic',
        modelId: 'x-ai/grok-beta',
        logo: 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/grok-ai-icon.webp?v=1768942289'
    },
    'claude': {
        name: 'Claude Sonnet 4.5',
        tier: 'premium',
        modelId: 'anthropic/claude-sonnet-4.5',
        logo: 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/claude_thumb_c1f3b471-3047-4528-bde1-d19b76f11498.png?v=1769488490'
    },
    'gpt': {
        name: 'Chat GPT 5.2',
        tier: 'premium',
        modelId: 'openai/gpt-5.2-chat',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg'
    },
    'gemini-flash': {
        name: 'Gemini 3 Flash',
        tier: 'premium',
        modelId: 'google/gemini-3-flash-preview',
        logo: 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/Google_Gemini_icon_2025_svg.png?v=1769488490'
    },
    'gemini-pro': {
        name: 'Gemini 3 Pro',
        tier: 'premium',
        modelId: 'google/gemini-3-pro-preview',
        logo: 'https://cdn.shopify.com/s/files/1/0564/3812/8712/files/Google_Gemini_icon_2025_svg.png?v=1769488490'
    }
};

// ============================================================================
// 2. OBTENER PLAN Y RESTRICCIONES DEL USUARIO
// ============================================================================

/**
 * Obtiene la suscripción activa del usuario para una comunidad
 * @param {Object} user - Usuario actual
 * @param {string} communityId - ID de la comunidad
 * @returns {Object|null} Datos de suscripción o null
 */
window.App.permissions.getActiveSubscription = (user, communityId) => {
    if (!user) return null;

    // Buscar en subscriptions del usuario
    const subs = user.subscriptions || {};
    return subs[communityId] || null;
};

/**
 * Obtiene las restricciones del plan del usuario
 * @param {Object} user - Usuario actual
 * @param {Object} community - Datos de la comunidad
 * @returns {Object} Objeto de restricciones
 */
window.App.permissions.getPlanRestrictions = (user, community) => {
    if (!user || !community) return { ...DEFAULT_RESTRICTIONS };

    // Admin tiene acceso total
    if (user.role === 'admin') {
        return {
            maxClassesPerCourse: -1,
            maxProfessorMessages: -1,
            allowedAIModels: Object.keys(AI_MODELS_CONFIG),
            accessAIAfterTrial: true,
            canAccessSuperClass: true,
            canDownloadContent: true
        };
    }

    // Obtener suscripción del usuario
    const subscription = window.App.permissions.getActiveSubscription(user, community.id);

    if (!subscription) {
        return { ...DEFAULT_RESTRICTIONS };
    }

    // Buscar el plan en la comunidad
    const plans = community.plans || [];
    const userPlan = plans.find(p => p.id === subscription.planId);

    if (!userPlan || !userPlan.restrictions) {
        return { ...DEFAULT_RESTRICTIONS };
    }

    // Merge con defaults para campos faltantes
    return {
        ...DEFAULT_RESTRICTIONS,
        ...userPlan.restrictions
    };
};

/**
 * Verifica si el trial del usuario ha expirado
 * @param {Object} user - Usuario actual
 * @param {string} communityId - ID de la comunidad
 * @returns {Object} { isInTrial, trialEnded, daysRemaining }
 */
window.App.permissions.getTrialStatus = (user, communityId) => {
    const subscription = window.App.permissions.getActiveSubscription(user, communityId);

    if (!subscription) {
        return { isInTrial: false, trialEnded: true, daysRemaining: 0 };
    }

    // Si ya pagó, no está en trial
    if (subscription.status === 'active' && subscription.paidAt) {
        return { isInTrial: false, trialEnded: false, daysRemaining: -1 };
    }

    // Verificar trial
    if (subscription.trialEndsAt) {
        const trialEnd = new Date(subscription.trialEndsAt);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

        return {
            isInTrial: daysRemaining > 0,
            trialEnded: daysRemaining <= 0,
            daysRemaining: Math.max(0, daysRemaining)
        };
    }

    return { isInTrial: false, trialEnded: false, daysRemaining: -1 };
};

// ============================================================================
// 3. VERIFICACIÓN DE ACCESO A CLASES
// ============================================================================

/**
 * Verifica si el usuario puede acceder a una clase específica
 * @param {Object} user - Usuario actual
 * @param {Object} community - Datos de la comunidad
 * @param {number} classIndex - Índice de la clase (0-based)
 * @returns {Object} { allowed, reason, maxAllowed }
 */
window.App.permissions.canAccessClass = (user, community, classIndex) => {
    const restrictions = window.App.permissions.getPlanRestrictions(user, community);

    // -1 = ilimitado
    if (restrictions.maxClassesPerCourse === -1) {
        return { allowed: true };
    }

    // Verificar índice vs límite
    if (classIndex < restrictions.maxClassesPerCourse) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: `Tu plan actual solo incluye las primeras ${restrictions.maxClassesPerCourse} clases por curso.`,
        maxAllowed: restrictions.maxClassesPerCourse
    };
};

/**
 * Verifica si puede acceder al modo Super Clase (IDE)
 */
window.App.permissions.canAccessSuperClass = (user, community) => {
    const restrictions = window.App.permissions.getPlanRestrictions(user, community);

    if (restrictions.canAccessSuperClass) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: 'El modo Super Clase (IDE) no está disponible en tu plan actual.'
    };
};

// ============================================================================
// 4. VERIFICACIÓN DE ACCESO A IA
// ============================================================================

/**
 * Verifica si el usuario puede acceder al panel de IA
 * @param {Object} user - Usuario actual
 * @param {Object} community - Datos de la comunidad (opcional para AI global)
 * @returns {Object} { allowed, reason }
 */
window.App.permissions.canAccessAI = (user, community = null) => {
    // Admin siempre tiene acceso
    if (user?.role === 'admin') {
        return { allowed: true };
    }

    // Si no hay comunidad específica, verificar cualquier suscripción activa
    if (!community) {
        // Permitir acceso básico si tiene alguna suscripción
        const hasSubs = user?.subscriptions && Object.keys(user.subscriptions).length > 0;
        if (!hasSubs) {
            return {
                allowed: false,
                reason: 'Necesitas estar suscrito a una comunidad para usar el asistente IA.'
            };
        }
        // Verificar trial en cualquier comunidad
        for (const commId of Object.keys(user.subscriptions)) {
            const trialStatus = window.App.permissions.getTrialStatus(user, commId);
            if (!trialStatus.trialEnded) {
                return { allowed: true }; // Al menos una suscripción activa
            }
        }
    }

    if (community) {
        const trialStatus = window.App.permissions.getTrialStatus(user, community.id);
        const restrictions = window.App.permissions.getPlanRestrictions(user, community);

        // Si trial terminó y no tiene acceso post-trial
        if (trialStatus.trialEnded && !restrictions.accessAIAfterTrial) {
            return {
                allowed: false,
                reason: 'Tu periodo de prueba ha terminado. Suscríbete para continuar usando el asistente IA.',
                trialEnded: true
            };
        }
    }

    return { allowed: true };
};

/**
 * Verifica si el usuario puede usar un modelo de IA específico
 * @param {Object} user - Usuario actual
 * @param {Object} community - Datos de la comunidad
 * @param {string} modelId - ID del modelo (ej: 'grok-fast', 'claude')
 * @returns {Object} { allowed, reason }
 */
window.App.permissions.canUseAIModel = (user, community, modelId) => {
    // Admin bypass
    if (user?.role === 'admin') return { allowed: true };

    const restrictions = window.App.permissions.getPlanRestrictions(user, community);
    const allowedModels = restrictions.allowedAIModels || ['grok-fast'];

    if (allowedModels.includes(modelId)) {
        return { allowed: true };
    }

    const modelName = AI_MODELS_CONFIG[modelId]?.name || modelId;
    return {
        allowed: false,
        reason: `El modelo ${modelName} no está disponible en tu plan actual.`
    };
};

/**
 * Obtiene la lista de modelos IA con estado de disponibilidad
 * @param {Object} user - Usuario actual
 * @param {Object} community - Datos de la comunidad
 * @returns {Array} Lista de modelos con { id, name, available, tier }
 */
window.App.permissions.getAvailableAIModels = (user, community) => {
    const isAdmin = user?.role === 'admin';
    const restrictions = window.App.permissions.getPlanRestrictions(user, community);
    const allowedModels = restrictions.allowedAIModels || ['grok-fast'];

    return Object.entries(AI_MODELS_CONFIG).map(([id, config]) => ({
        id,
        name: config.name,
        tier: config.tier,
        modelId: config.modelId,
        logo: config.logo,
        available: isAdmin || allowedModels.includes(id)
    }));
};

// ============================================================================
// 5. CONTROL DE MENSAJES CON PROFESOR
// ============================================================================

/**
 * Obtiene el conteo de mensajes del mes actual
 * @param {Object} user - Usuario actual
 * @param {string} communityId - ID de la comunidad
 * @returns {Promise<number>} Número de mensajes este mes
 */
window.App.permissions.getMonthlyMessageCount = async (user, communityId) => {
    if (!user || !communityId) return 0;

    try {
        const usageRef = window.F.doc(window.F.db, "communities", communityId, "usage", user.uid);
        const usageSnap = await window.F.getDoc(usageRef);

        if (!usageSnap.exists()) return 0;

        const data = usageSnap.data();
        const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"

        // Verificar si los datos son del mes actual
        if (data.messageMonth === currentMonth) {
            return data.monthlyMessages || 0;
        }

        return 0; // Nuevo mes, resetear contador
    } catch (e) {
        console.warn("Error obteniendo uso:", e);
        return 0;
    }
};

/**
 * Incrementa el contador de mensajes del usuario
 * @param {Object} user - Usuario actual
 * @param {string} communityId - ID de la comunidad
 * @returns {Promise<number>} Nuevo conteo
 */
window.App.permissions.incrementMessageCount = async (user, communityId) => {
    if (!user || !communityId) return 0;

    try {
        const usageRef = window.F.doc(window.F.db, "communities", communityId, "usage", user.uid);
        const currentMonth = new Date().toISOString().slice(0, 7);

        await window.F.setDoc(usageRef, {
            monthlyMessages: window.F.increment(1),
            messageMonth: currentMonth,
            lastMessageAt: new Date().toISOString()
        }, { merge: true });

        return await window.App.permissions.getMonthlyMessageCount(user, communityId);
    } catch (e) {
        console.error("Error incrementando mensajes:", e);
        return 0;
    }
};

/**
 * Verifica si el usuario puede enviar mensajes al profesor
 * @param {Object} user - Usuario actual
 * @param {Object} community - Datos de la comunidad
 * @returns {Promise<Object>} { allowed, remaining, limit }
 */
window.App.permissions.canSendProfessorMessage = async (user, community) => {
    // Admin siempre puede
    if (user?.role === 'admin') {
        return { allowed: true, remaining: -1, limit: -1 };
    }

    const restrictions = window.App.permissions.getPlanRestrictions(user, community);

    // -1 = ilimitado
    if (restrictions.maxProfessorMessages === -1) {
        return { allowed: true, remaining: -1, limit: -1 };
    }

    const count = await window.App.permissions.getMonthlyMessageCount(user, community.id);
    const remaining = Math.max(0, restrictions.maxProfessorMessages - count);

    return {
        allowed: remaining > 0,
        remaining,
        limit: restrictions.maxProfessorMessages,
        used: count
    };
};

// ============================================================================
// 6. UI HELPERS - MODAL DE UPGRADE
// ============================================================================

/**
 * Muestra un modal de upgrade cuando el usuario no tiene acceso
 * @param {string} feature - Característica que requiere upgrade
 * @param {string} reason - Razón del bloqueo
 * @param {string} communityId - ID de la comunidad para enlace de upgrade
 */
window.App.permissions.showUpgradeModal = (feature, reason, communityId = null) => {
    // Remover modal existente si hay
    const existingModal = document.getElementById('upgrade-modal');
    if (existingModal) existingModal.remove();

    const featureIcons = {
        'class': 'fa-graduation-cap',
        'ai': 'fa-robot',
        'messages': 'fa-comments',
        'superclass': 'fa-code',
        'download': 'fa-download',
        'default': 'fa-lock'
    };

    const icon = featureIcons[feature] || featureIcons['default'];

    const modalHTML = `
    <div id="upgrade-modal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onclick="if(event.target.id==='upgrade-modal') App.permissions.closeUpgradeModal()">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
            <!-- Header -->
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"30\" height=\"30\" viewBox=\"0 0 30 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z\" fill=\"rgba(255,255,255,0.07)\"%3E%3C/path%3E%3C/svg%3E')] opacity-50"></div>
                <div class="relative">
                    <div class="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl text-white shadow-lg">
                        <i class="fas ${icon}"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-1">Mejora tu Plan</h2>
                    <p class="text-white/80 text-sm">Desbloquea todo el potencial</p>
                </div>
            </div>
            
            <!-- Body -->
            <div class="p-6">
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <p class="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">${reason}</p>
                    </div>
                </div>
                
                <div class="space-y-3 mb-6">
                    <div class="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <i class="fas fa-check-circle text-emerald-500"></i>
                        <span class="text-sm text-slate-700 dark:text-slate-300">Clases ilimitadas</span>
                    </div>
                    <div class="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <i class="fas fa-check-circle text-emerald-500"></i>
                        <span class="text-sm text-slate-700 dark:text-slate-300">Chat ilimitado con profesor</span>
                    </div>
                    <div class="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <i class="fas fa-check-circle text-emerald-500"></i>
                        <span class="text-sm text-slate-700 dark:text-slate-300">Acceso a todos los modelos IA</span>
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <button onclick="App.permissions.closeUpgradeModal()" class="flex-1 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-sm transition-colors">
                        Más Tarde
                    </button>
                    <button onclick="App.permissions.goToUpgrade('${communityId || ''}')" class="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        <i class="fas fa-crown"></i> Ver Planes
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

/**
 * Cierra el modal de upgrade
 */
window.App.permissions.closeUpgradeModal = () => {
    const modal = document.getElementById('upgrade-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 200);
    }
};

/**
 * Navega a la página de upgrade
 */
window.App.permissions.goToUpgrade = (communityId) => {
    window.App.permissions.closeUpgradeModal();
    if (communityId) {
        window.location.hash = `#community/${communityId}/pricing`;
    } else {
        window.location.hash = '#feed';
    }
};

// ============================================================================
// 7. BADGE DE RESTRICCIÓN (UI COMPONENT)
// ============================================================================

/**
 * Genera HTML para mostrar un badge de bloqueo en un elemento
 * @param {string} size - 'sm', 'md', 'lg'
 * @returns {string} HTML del badge
 */
window.App.permissions.renderLockBadge = (size = 'md') => {
    const sizes = {
        sm: 'w-5 h-5 text-[10px]',
        md: 'w-8 h-8 text-xs',
        lg: 'w-12 h-12 text-base'
    };

    return `
    <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-inherit">
        <div class="${sizes[size]} bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-amber-500 shadow-lg border-2 border-amber-400">
            <i class="fas fa-lock"></i>
        </div>
    </div>`;
};

/**
 * Genera HTML para overlay de contenido premium
 * @param {string} message - Mensaje a mostrar
 * @returns {string} HTML del overlay
 */
window.App.permissions.renderPremiumOverlay = (message = 'Contenido Premium') => {
    return `
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-end p-4 z-10 rounded-inherit">
        <div class="text-center">
            <div class="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                <i class="fas fa-crown text-white"></i>
            </div>
            <p class="text-white font-bold text-sm">${message}</p>
            <p class="text-white/70 text-xs mt-1">Mejora tu plan para desbloquear</p>
        </div>
    </div>`;
};

console.log("✅ Permissions Service Loaded (V1.0)");
