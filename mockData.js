/**
 * mockData.js (V3 - Seed Engine)
 * Semilla de Datos Iniciales.
 * Este archivo SOLO se usa si el LocalStorage está vacío para inicializar la "DB Local".
 */

window.SeedData = {
    // 1. Usuarios del Sistema
    users: [
        {
            uid: "u_admin",
            name: "Admin ProgramBI",
            email: "admin@programbi.com",
            password: "admin", // Simulación simple (en prod: hash)
            role: "admin",
            avatar: "https://ui-avatars.com/api/?name=Admin+PBI&background=000&color=fff&bold=true",
            bio: "Arquitecto de Datos y Fundador.",
            level: "Mentor",
            points: 5000,
            joinedCommunities: ["c_powerbi", "c_python"]
        },
        {
            uid: "u_student1",
            name: "Juan Pérez",
            email: "juan@test.com",
            password: "123",
            role: "student",
            avatar: "https://ui-avatars.com/api/?name=Juan+P&background=random",
            bio: "Estudiante entusiasta de DAX.",
            level: "Novato",
            points: 120,
            joinedCommunities: ["c_powerbi"]
        }
    ],

    // 2. Comunidades (Estructura Compleja: Info + Canales + Módulos)
    communities: [
        {
            id: "c_powerbi",
            name: "Dominando Power BI",
            description: "De cero a experto en visualización y modelado de datos corporativos.",
            icon: "fa-chart-bar",
            category: "Business Intelligence",
            membersCount: 1240,
            isPrivate: false,
            
            // Estructura Discord: Canales de Chat
            channels: [
                { id: "ch_pbi_gen", name: "General", type: "text", locked: false },
                { id: "ch_pbi_dax", name: "Dudas DAX", type: "text", locked: false },
                { id: "ch_pbi_viz", name: "Showcase Dashboards", type: "text", locked: false },
                { id: "ch_pbi_ann", name: "Anuncios", type: "announcement", locked: true }
            ],

            // Estructura LMS: Módulos de Clases
            modules: [
                { 
                    id: "m_pbi_1", 
                    title: "1. Fundamentos de Modelado", 
                    duration: "45 min", 
                    completedBy: ["u_admin", "u_student1"], // Array de UIDs que completaron
                    videoUrl: "https://www.youtube.com/embed/AgpGzG3nC78"
                },
                { 
                    id: "m_pbi_2", 
                    title: "2. Contexto de Fila vs Filtro", 
                    duration: "1h 20m", 
                    completedBy: ["u_admin"],
                    videoUrl: "https://www.youtube.com/embed/AgpGzG3nC78"
                },
                { 
                    id: "m_pbi_3", 
                    title: "3. Time Intelligence Avanzado", 
                    duration: "55 min", 
                    completedBy: [], 
                    videoUrl: "https://www.youtube.com/embed/AgpGzG3nC78"
                },
                { 
                    id: "m_pbi_4", 
                    title: "4. Optimización con VertiPaq", 
                    duration: "1h 10m", 
                    completedBy: [],
                    videoUrl: "https://www.youtube.com/embed/AgpGzG3nC78"
                }
            ]
        },
        {
            id: "c_python",
            name: "Python Data Science",
            description: "Automatización, ETL y Machine Learning aplicado.",
            icon: "fa-python",
            category: "Data Science",
            membersCount: 850,
            isPrivate: true,
            
            channels: [
                { id: "ch_py_gen", name: "General", type: "text" },
                { id: "ch_py_setup", name: "Setup Entorno", type: "text" },
                { id: "ch_py_pandas", name: "Pandas & NumPy", type: "text" }
            ],

            modules: [
                { id: "m_py_1", title: "1. Anaconda & Jupyter", duration: "30 min", completedBy: [] },
                { id: "m_py_2", title: "2. Estructuras de Datos", duration: "1h", completedBy: [] }
            ]
        }
    ],

    // 3. Posts (Feed Global y Chats)
    posts: [
        {
            id: "p_1",
            communityId: "c_powerbi",
            isOfficial: true, 
            title: "Actualización del Curso: Módulo 4 Disponible",
            content: "Hola a todos. Ya está disponible el módulo sobre optimización VertiPaq. Es crucial para manejar datasets de más de 10M de filas. ¡A estudiar!",
            authorId: "u_admin",
            createdAt: new Date(Date.now() - 86400000).toISOString(), 
            likes: 45,
            comments: []
        },
        {
            id: "p_2",
            communityId: "c_powerbi",
            channelId: "ch_pbi_dax", // Pertenece a un chat específico
            content: "¿Alguien sabe por qué CALCULATE ignora mi filtro de fecha en esta medida?",
            authorId: "u_student1",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            likes: 2,
            isOfficial: false
        },
        {
            id: "p_3",
            communityId: "c_python",
            isOfficial: true,
            title: "Bienvenidos a la cohorte 2024",
            content: "Arrancamos con Python desde cero. Recuerden revisar el canal #setup-entorno antes de la clase del jueves.",
            authorId: "u_admin",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            likes: 89,
            comments: []
        }
    ],

    // 4. Estadísticas Admin
    adminStats: {
        totalMembers: 2090,
        revenue: 4200,
        engagementRate: 24,
        chartData: [12, 19, 3, 5, 20, 30, 45]
    }
};

console.log("🌱 SeedData Cargado: Listo para inicializar DB Local si es necesario.");