/**
 * BACKEND SEGURO: Proxy para OpenRouter/Grok
 * Proyecto: comunidad-program-bi
 */

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const fetch = require("node-fetch"); 

admin.initializeApp();

exports.aiProxy = onRequest(
  { 
    cors: true, // Permite que tu web llame a esta función
    secrets: ["OPENROUTER_API_KEY"], // 🔐 Aquí ocurre la magia de seguridad
    region: "us-central1" // O la región que prefieras
  },
  async (req, res) => {
    // 1. SEGURIDAD: Validar que el usuario viene de tu app
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: { message: "No autorizado. Token faltante." } });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Verificar que el token pertenece a un usuario real de 'comunidad-program-bi'
      await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error("Error Auth:", error);
      return res.status(403).json({ error: { message: "Token inválido." } });
    }

    // 2. OBTENER LA CLAVE SECRETA (Inyectada por Firebase)
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    // 3. CONECTAR CON OPENROUTER
    try {
      const { messages, stream } = req.body;
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://comunidad-program-bi.web.app", // Tu dominio (o localhost)
          "X-Title": "ProgramBI Neural",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "x-ai/grok-4.1-fast", // 🔥 Modelo forzado aquí para seguridad
          messages: messages,
          stream: stream
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).send(errText);
      }

      // 4. RESPUESTA (Pipe directo para streaming)
      response.body.pipe(res);

    } catch (error) {
      console.error("Error Proxy:", error);
      res.status(500).json({ error: { message: "Error interno del servidor." } });
    }
  }
);