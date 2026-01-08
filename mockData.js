/**
 * mockData.js (V4.0 - SUPER CLASS READY)
 * Semilla de Datos Iniciales.
 * CAMBIOS:
 * - Curso de Python configurado con MODO SUPER CLASE (IDE) activado.
 * - Datos optimizados para probar el Buscador Global.
 */

window.SeedData = {
    // 1. Usuarios del Sistema
    users: [
        {
            uid: "u_admin",
            name: "Admin ProgramBI",
            email: "admin@programbi.com",
            password: "admin",
            role: "admin",
            avatar: "https://ui-avatars.com/api/?name=Admin+PBI&background=000&color=fff&bold=true",
            bio: "Arquitecto de Datos y Fundador.",
            level: "Mentor",
            points: 5000,
            joinedCommunities: ["c_powerbi", "c_python", "c_sql"],
            completedModules: []
        },
        {
            uid: "u_student1",
            name: "Juan Pérez",
            email: "juan@test.com",
            password: "123",
            role: "student",
            avatar: "https://ui-avatars.com/api/?name=Juan+P&background=1890ff&color=fff",
            bio: "Estudiante entusiasta de Data Engineering.",
            level: "Novato",
            points: 350,
            joinedCommunities: ["c_python"],
            completedModules: []
        }
    ],

    // 2. Comunidades (Estructura Completa)
    communities: [
        {
            id: "c_python",
            name: "Python para Data Science",
            description: "Domina Python desde cero hasta modelos de ML avanzados. Incluye entorno de código en vivo.",
            icon: "fa-brands fa-python",
            membersCount: 1250,
            courses: [
                {
                    id: "course_py_1",
                    title: "Python Fullstack: De Cero a Experto",
                    description: "Aprende sintaxis, estructuras de datos y algoritmos escribiendo código real en nuestra plataforma.",
                    image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1000&auto=format&fit=crop",
                    isSuperClass: true, // <--- ACTIVADOR DEL IDE
                    codeLanguage: "python", // <--- LENGUAJE DEL EDITOR
                    classes: [
                        {
                            id: "cl_py_101",
                            title: "Introducción: Tu Primer Script",
                            description: "Configuración del entorno y variables básicas.",
                            videoUrl: "https://www.youtube.com/watch?v=GjOOE-b6tAM", // Video Demo
                            duration: "15:00"
                        },
                        {
                            id: "cl_py_102",
                            title: "Ciclos y Condicionales",
                            description: "Controlando el flujo de la aplicación con lógica booleana.",
                            videoUrl: "https://www.youtube.com/watch?v=k9TUPpGqYTo",
                            duration: "22:00"
                        }
                    ],
                    createdAt: new Date().toISOString()
                }
            ],
            channels: []
        },
        {
            id: "c_sql",
            name: "SQL Masterclass",
            description: "Aprende a consultar bases de datos relacionales como un profesional.",
            icon: "fa-database",
            membersCount: 890,
            courses: [
                {
                    id: "course_sql_1",
                    title: "SQL Avanzado para Analistas",
                    description: "Consultas complejas, Joins y optimización de queries.",
                    image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1000&auto=format&fit=crop",
                    isSuperClass: true, // <--- IDE ACTIVADO
                    codeLanguage: "sql", // <--- LENGUAJE SQL
                    classes: [
                        {
                            id: "cl_sql_1",
                            title: "SELECT y FROM: La base de todo",
                            videoUrl: "https://www.youtube.com/watch?v=HXV3zeXDq54",
                            duration: "10:00"
                        }
                    ]
                }
            ]
        },
        {
            id: "c_powerbi",
            name: "Power BI Pro",
            description: "Comunidad oficial de Power BI. DAX, Modelado y Visualización.",
            icon: "fa-chart-bar",
            membersCount: 3400,
            courses: [
                {
                    id: "course_pbi_1",
                    title: "Fundamentos de DAX",
                    description: "Entiende el contexto de fila y filtro de una vez por todas.",
                    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop",
                    isSuperClass: false, // Curso normal (solo video)
                    classes: [
                        {
                            id: "cl_pbi_1",
                            title: "Introducción a DAX",
                            videoUrl: "https://www.youtube.com/watch?v=C7k4gX2X1sQ",
                            duration: "12:00"
                        }
                    ]
                }
            ]
        }
    ],

    // 3. Posts Iniciales (Feed)
    posts: [
        {
            id: "p_1",
            communityId: "c_python",
            isOfficial: true,
            title: "¡Estrenamos el Editor de Código!",
            content: "Ahora puedes practicar Python directamente en las clases sin salir de la plataforma. Busca los cursos marcados como 'Super Clase'.",
            authorId: "u_admin",
            createdAt: new Date().toISOString(),
            likes: 120,
            comments: []
        }
    ],

    /**
     * Función de Inicialización
     * Se ejecuta solo si no hay datos en LocalStorage/Firebase para poblar la demo.
     */
    init: async () => {
        // En un entorno real con Firebase, esto se haría manualmente o con scripts de administración.
        // Aquí simulamos que los datos ya existen en la "nube" para la demo.
        console.log("🌱 Datos Semilla Listos (Simulación)");

        // Simular carga en caché de App para búsqueda inmediata
        if (window.App && window.App.state) {
            window.SeedData.communities.forEach(c => {
                window.App.state.cache.communities[c.id] = c;
            });
            window.SeedData.users.forEach(u => {
                window.App.state.cache.users[u.uid] = u;
            });
        }
    }
};