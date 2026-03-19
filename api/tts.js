/**
 * api/tts.js — Vercel Serverless Function
 * ─────────────────────────────────────────────────────────────────────────────
 * PROPÓSITO:  Actúa de proxy seguro entre la app y Gemini TTS.
 *             La API key NUNCA llega al navegador del usuario.
 *
 * SETUP:
 *   1. En Vercel → Settings → Environment Variables, agrega:
 *        GEMINI_API_KEY = AIzaSy…
 *   2. Opcionalmente agrega ALLOWED_ORIGIN con tu dominio en producción.
 *
 * ENDPOINT:   POST /api/tts
 * BODY:       { "text": "...", "voice": "Kore" }
 * RESPUESTA:  { "audio": "<base64 PCM>" }
 */

const TTS_MODEL  = 'gemini-2.5-flash-preview-tts';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;

// Máximo de caracteres que Gemini TTS acepta por llamada
const MAX_CHARS = 5000;

// Voces válidas (whitelist — evita que alguien abuse del endpoint)
const VALID_VOICES = new Set(['Kore','Aoede','Fenrir','Orus','Puck']);

// Aumenta el límite de Vercel a 60s (el plan Hobby por defecto corta a 10s)
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  // ── VALIDAR API KEY ─────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[tts] GEMINI_API_KEY no configurada en variables de entorno.');
    return res.status(503).json({ error: 'Servicio no disponible. Contacta al administrador.' });
  }

  // ── VALIDAR BODY ────────────────────────────────────────────────────────────
  const { text, voice = 'Kore' } = req.body || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'El campo "text" es requerido y no puede estar vacío.' });
  }

  if (text.length > MAX_CHARS) {
    return res.status(400).json({ error: `El texto supera el límite de ${MAX_CHARS} caracteres.` });
  }

  if (!VALID_VOICES.has(voice)) {
    return res.status(400).json({ error: `Voz "${voice}" no válida. Usa: ${[...VALID_VOICES].join(', ')}.` });
  }

  // ── LLAMAR A GEMINI TTS ─────────────────────────────────────────────────────
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 55_000); // 55s < Vercel's 60s limit

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text.trim() }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Propagar rate-limit al cliente para que pueda hacer backoff
    if (geminiRes.status === 429) {
      return res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intenta en unos segundos.' });
    }

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      const message = errBody?.error?.message || `Error de Gemini (HTTP ${geminiRes.status}).`;
      console.error('[tts] Gemini error:', geminiRes.status, message);
      return res.status(502).json({ error: 'Error generando audio. Intenta de nuevo.' });
    }

    const data  = await geminiRes.json();
    const audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audio) {
      console.error('[tts] Gemini no devolvió audio:', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'El servidor de audio no devolvió datos.' });
    }

    // ✅ Éxito — devolver el base64 al cliente
    return res.status(200).json({ audio });

  } catch (err) {
    clearTimeout(timeout);

    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Tiempo de espera agotado. El texto puede ser demasiado largo.' });
    }

    console.error('[tts] Error inesperado:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
