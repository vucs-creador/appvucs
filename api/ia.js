// api/ia.js — Funcion serverless de Vercel
// Proxy seguro hacia Kie.ai (Claude Sonnet 4.6)
// La clave API de Kie vive en las variables de entorno de Vercel, nunca en el codigo

export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  // Verificar que la clave este configurada
  if (!process.env.KIE_API_KEY) {
    return res.status(500).json({ error: 'API key de Kie no configurada en Vercel' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Formato de mensajes invalido' });
    }

    const response = await fetch('https://api.kie.ai/claude/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.KIE_API_KEY
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        stream: false,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: (data.error && data.error.message) || data.msg || 'Error de la API de Kie'
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
