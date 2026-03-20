/**
 * api/tts-openai.js — Vercel Serverless Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Proxy seguro para OpenAI TTS (tts-1-hd).
 * Voces neurales de alta calidad — suenan como personas reales hablando español.
 *
 * SETUP:
 *   En Vercel → Settings → Environment Variables, agrega:
 *     OPENAI_API_KEY = sk-...
 *
 * ENDPOINT:  POST /api/tts-openai
 * BODY:      { "text": "...", "voice": "nova" }
 * RESPUESTA: { "audio": "<base64 MP3>", "format": "mp3" }
 */

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const MAX_CHARS      = 4096;  // límite de OpenAI por llamada

// Las 6 voces de OpenAI — todas hablan español si el texto está en español
const VALID_VOICES = new Set(['alloy','echo','fable','onyx','nova','shimmer']);

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método no permitido.' });

  // ── API KEY ─────────────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[tts-openai] OPENAI_API_KEY no configurada.');
    return res.status(503).json({ error: 'Servicio no disponible. Configura OPENAI_API_KEY en Vercel.' });
  }

  // ── VALIDACIÓN ──────────────────────────────────────────────────────────────
  const { text, voice = 'nova' } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim())
    return res.status(400).json({ error: 'El campo "text" es requerido.' });
  if (text.length > MAX_CHARS)
    return res.status(400).json({ error: `El texto supera ${MAX_CHARS} caracteres.` });
  if (!VALID_VOICES.has(voice))
    return res.status(400).json({ error: `Voz "${voice}" no válida.` });

  // ── LLAMAR A OPENAI TTS ─────────────────────────────────────────────────────
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 55_000);

  try {
    const openaiRes = await fetch(OPENAI_TTS_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:           'tts-1-hd',   // alta calidad (vs tts-1 que es más rápido pero inferior)
        input:           text.trim(),
        voice,
        response_format: 'mp3',
        speed:           1.0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (openaiRes.status === 429)
      return res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intenta en unos segundos.' });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.json().catch(() => ({}));
      console.error('[tts-openai] Error OpenAI:', openaiRes.status, errBody);
      return res.status(502).json({ error: `Error de OpenAI (${openaiRes.status}).` });
    }

    // OpenAI devuelve MP3 binario — convertir a base64 para enviarlo al cliente
    const arrayBuffer = await openaiRes.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString('base64');

    return res.status(200).json({ audio: base64, format: 'mp3' });

  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError')
      return res.status(504).json({ error: 'Tiempo de espera agotado.' });
    console.error('[tts-openai] Error inesperado:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
