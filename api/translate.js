/**
 * api/translate.js — Vercel Serverless Function
 * Traduce texto usando Gemini Flash (mismo GEMINI_API_KEY, sin costo adicional en free tier).
 *
 * ENDPOINT:  POST /api/translate
 * BODY:      { "text": "...", "from": "en", "to": "es" }
 * RESPUESTA: { "translated": "..." }
 */

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_CHARS    = 8000;

const LANG_NAMES = {
  es: 'Spanish', en: 'English', fr: 'French',
  de: 'German',  pt: 'Portuguese', it: 'Italian',
};

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin',  allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método no permitido.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY no configurada.' });

  const { text, from, to } = req.body || {};
  if (!text?.trim())             return res.status(400).json({ error: 'Texto requerido.' });
  if (text.length > MAX_CHARS)   return res.status(400).json({ error: 'Texto demasiado largo.' });
  if (!LANG_NAMES[from] || !LANG_NAMES[to]) return res.status(400).json({ error: 'Idioma no válido.' });
  if (from === to)               return res.status(400).json({ error: 'El idioma origen y destino son iguales.' });

  const prompt =
    `Translate the following text from ${LANG_NAMES[from]} to ${LANG_NAMES[to]}.\n` +
    `Return ONLY the translated text. Preserve paragraph breaks. No explanations.\n\n` +
    text.trim();

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 25_000);

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (geminiRes.status === 429)
      return res.status(429).json({ error: 'Límite de solicitudes. Intenta en unos segundos.' });
    if (!geminiRes.ok)
      return res.status(502).json({ error: `Error de Gemini (${geminiRes.status}).` });

    const data       = await geminiRes.json();
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!translated)
      return res.status(502).json({ error: 'Gemini no devolvió traducción.' });

    return res.status(200).json({ translated: translated.trim() });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError')
      return res.status(504).json({ error: 'Tiempo de espera agotado.' });
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
