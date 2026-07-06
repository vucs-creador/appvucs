
// api/ia.js — Funcion serverless de Vercel (VERSION PROTEGIDA)
// Proxy seguro hacia la API de Anthropic
// Proteccion: solo acepta peticiones que vengan de la propia app

const DOMINIOS_PERMITIDOS = [
  'appvucs.vercel.app',
  'localhost'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  // ── Verificar origen: solo la propia app puede usar la IA ──
  const origen = req.headers.origin || req.headers.referer || '';
  const autorizado = DOMINIOS_PERMITIDOS.some(function(d) {
    return origen.includes(d);
  });
  if (!autorizado) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key no configurada en Vercel' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Formato de mensajes invalido' });
    }

    // Limite de tamano: evita abusos con historiales gigantes
    const totalChars = JSON.stringify(messages).length;
    if (totalChars > 60000) {
      return res.status(400).json({ error: 'Conversacion demasiado larga' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: (data.error && data.error.message) || 'Error de la API'
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
