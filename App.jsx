/**
 * AudioBook Creator — Production PWA
 * Soporta Dark / Light / Sistema (sigue prefers-color-scheme del OS automáticamente).
 * Deps: npm install pdfjs-dist epubjs mammoth
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── DESIGN TOKENS (CSS Custom Properties) ────────────────────────────────────
// La estrategia:
//  • :root define el tema DARK por defecto.
//  • @media prefers-color-scheme:light aplica LIGHT cuando el OS lo pide
//    (solo si el usuario no forzó un tema manualmente).
//  • [data-theme="light"] y [data-theme="dark"] permiten forzar el tema.
//    Se aplican al <html> desde el hook useTheme.

const GLOBAL_CSS = `
  :root {
    --c-bg:           #0f172a;
    --c-surface:      #1e293b;
    --c-surface2:     #0f172a;
    --c-shimmer:      #2d3f52;
    --c-border:       #1e293b;
    --c-border2:      #334155;
    --c-text:         #f1f5f9;
    --c-text2:        #94a3b8;
    --c-text3:        #cbd5e1;
    --c-muted:        #64748b;
    --c-muted2:       #475569;
    --c-disabled:     #334155;
    --c-accent:       #818cf8;
    --c-accent-bg:    #312e81;
    --c-accent-text:  #c7d2fe;
    --c-btn:          #4f46e5;
    --c-btn-glow:     rgba(79,70,229,0.45);
    --c-btn-glow2:    rgba(79,70,229,0.15);
    --c-overlay:      rgba(0,0,0,0.72);
    --c-drag-bg:      rgba(129,140,248,0.07);
    --c-active-row:   rgba(79,70,229,0.14);
    --c-badge-bg:     rgba(129,140,248,0.15);
  }

  /* OS pide light mode y el usuario no forzó nada */
  @media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]):not([data-theme="light"]) {
      --c-bg:           #f8fafc;
      --c-surface:      #ffffff;
      --c-surface2:     #f1f5f9;
      --c-shimmer:      #e2e8f0;
      --c-border:       #f1f5f9;
      --c-border2:      #e2e8f0;
      --c-text:         #0f172a;
      --c-text2:        #475569;
      --c-text3:        #334155;
      --c-muted:        #94a3b8;
      --c-muted2:       #64748b;
      --c-disabled:     #e2e8f0;
      --c-accent:       #4f46e5;
      --c-accent-bg:    #e0e7ff;
      --c-accent-text:  #3730a3;
      --c-btn:          #4f46e5;
      --c-btn-glow:     rgba(79,70,229,0.30);
      --c-btn-glow2:    rgba(79,70,229,0.10);
      --c-overlay:      rgba(0,0,0,0.50);
      --c-drag-bg:      rgba(79,70,229,0.05);
      --c-active-row:   rgba(79,70,229,0.08);
      --c-badge-bg:     rgba(79,70,229,0.12);
    }
  }

  /* Usuario forzó LIGHT */
  [data-theme="light"] {
    --c-bg:           #f8fafc;
    --c-surface:      #ffffff;
    --c-surface2:     #f1f5f9;
    --c-shimmer:      #e2e8f0;
    --c-border:       #f1f5f9;
    --c-border2:      #e2e8f0;
    --c-text:         #0f172a;
    --c-text2:        #475569;
    --c-text3:        #334155;
    --c-muted:        #94a3b8;
    --c-muted2:       #64748b;
    --c-disabled:     #e2e8f0;
    --c-accent:       #4f46e5;
    --c-accent-bg:    #e0e7ff;
    --c-accent-text:  #3730a3;
    --c-btn:          #4f46e5;
    --c-btn-glow:     rgba(79,70,229,0.30);
    --c-btn-glow2:    rgba(79,70,229,0.10);
    --c-overlay:      rgba(0,0,0,0.50);
    --c-drag-bg:      rgba(79,70,229,0.05);
    --c-active-row:   rgba(79,70,229,0.08);
    --c-badge-bg:     rgba(79,70,229,0.12);
  }

  /* Usuario forzó DARK */
  [data-theme="dark"] {
    --c-bg:           #0f172a;
    --c-surface:      #1e293b;
    --c-surface2:     #0f172a;
    --c-shimmer:      #2d3f52;
    --c-border:       #1e293b;
    --c-border2:      #334155;
    --c-text:         #f1f5f9;
    --c-text2:        #94a3b8;
    --c-text3:        #cbd5e1;
    --c-muted:        #64748b;
    --c-muted2:       #475569;
    --c-disabled:     #334155;
    --c-accent:       #818cf8;
    --c-accent-bg:    #312e81;
    --c-accent-text:  #c7d2fe;
    --c-btn:          #4f46e5;
    --c-btn-glow:     rgba(79,70,229,0.45);
    --c-btn-glow2:    rgba(79,70,229,0.15);
    --c-overlay:      rgba(0,0,0,0.72);
    --c-drag-bg:      rgba(129,140,248,0.07);
    --c-active-row:   rgba(79,70,229,0.14);
    --c-badge-bg:     rgba(129,140,248,0.15);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root {
    height: 100%;
    background: var(--c-bg);
    color: var(--c-text);
    transition: background 0.25s ease, color 0.25s ease;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
  }
  input, button { font-family: inherit; }
  button:focus-visible { outline: 2px solid var(--c-accent); outline-offset: 2px; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--c-surface); }
  ::-webkit-scrollbar-thumb { background: var(--c-border2); border-radius: 2px; }

  input[type=range] {
    -webkit-appearance: none; appearance: none; width: 100%;
    height: 6px; border-radius: 3px; outline: none; cursor: pointer;
    background: linear-gradient(to right, var(--c-accent) var(--prog,0%), var(--c-border2) var(--prog,0%));
    transition: background 0.1s;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
    background: var(--c-accent); cursor: pointer;
    box-shadow: 0 0 6px var(--c-btn-glow);
  }
  input[type=range]:disabled { opacity: .35; cursor: default; }

  @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes slideUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse    { 0%,100%{box-shadow:0 0 0 0 var(--c-btn-glow)} 50%{box-shadow:0 0 0 14px rgba(79,70,229,0)} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes wave     { 0%,100%{height:6px} 50%{height:30px} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VOICES = [
  { id:'Kore',   label:'Kore',   gender:'Mujer',  desc:'Clara y enérgica'    },
  { id:'Aoede',  label:'Aoede',  gender:'Mujer',  desc:'Suave y pausada'     },
  { id:'Fenrir', label:'Fenrir', gender:'Hombre', desc:'Profunda y grave'    },
  { id:'Orus',   label:'Orus',   gender:'Hombre', desc:'Cálida y narrativa'  },
  { id:'Puck',   label:'Puck',   gender:'Hombre', desc:'Vibrante y expresiva'},
];
const SPEEDS          = [0.75, 1, 1.25, 1.5, 2];
const WORDS_PER_CHUNK = 400;  // máx por llamada TTS — 400 palabras ≈ 2000 chars, genera rápido
const PARSE_TIMEOUT   = 60_000;
const TTS_ENDPOINT    = '/api/tts';

const THEME_OPTIONS = [
  { id:'system', label:'Sistema', emoji:'💻' },
  { id:'light',  label:'Claro',   emoji:'☀️' },
  { id:'dark',   label:'Oscuro',  emoji:'🌙' },
];

// ─── UTILITIES ────────────────────────────────────────────────────────────────
/** Crea un Blob WAV silencioso (para desbloquear el audio dentro del gesto del usuario) */
function silentWavBlob(durationSec=0.1, sr=8000) {
  const numSamples=Math.floor(sr*durationSec);
  const pcm=new Uint8Array(numSamples*2);
  const buf=new ArrayBuffer(44+pcm.length); const v=new DataView(buf);
  const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');v.setUint32(4,36+pcm.length,true);ws(8,'WAVE');ws(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);
  v.setUint16(32,2,true);v.setUint16(34,16,true);
  ws(36,'data');v.setUint32(40,pcm.length,true);
  new Uint8Array(buf).set(pcm,44);
  return new Blob([buf],{type:'audio/wav'});
}

function pcmBase64ToWavBlob(b64, sr=24000, ch=1, bits=16) {
  const raw = atob(b64);
  const pcm = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) pcm[i]=raw.charCodeAt(i);
  const buf=new ArrayBuffer(44+pcm.length); const v=new DataView(buf);
  const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');v.setUint32(4,36+pcm.length,true);ws(8,'WAVE');ws(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*ch*bits/8,true);
  v.setUint16(32,ch*bits/8,true);v.setUint16(34,bits,true);
  ws(36,'data');v.setUint32(40,pcm.length,true);
  new Uint8Array(buf).set(pcm,44);
  return new Blob([buf],{type:'audio/wav'});
}

function mapError(status,body={}) {
  const m=body?.error||body?.message||'';
  if(status===429) return 'Demasiadas solicitudes. Espera unos segundos.';
  if(status===503) return 'Servicio temporalmente ocupado. Intenta en un momento.';
  if(status>=500)  return 'Error en el servidor. Por favor intenta de nuevo.';
  if(status===400) return `Texto inválido: ${m||'demasiado largo o vacío.'}`;
  return m||`Error inesperado (${status}).`;
}

function formatTime(s) {
  if(!s||isNaN(s)) return '0:00';
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}
function estimateMins(w) { return Math.max(1,Math.round(w/150)); }

// ─── TEXT PROCESSING ──────────────────────────────────────────────────────────
function chunkByWords(text,max=WORDS_PER_CHUNK) {
  const words=text.split(/\s+/).filter(Boolean); const out=[];
  for(let i=0;i<words.length;i+=max) out.push(words.slice(i,i+max).join(' '));
  return out;
}
function detectChapters(text) {
  // Normalizar saltos de línea (Windows \r\n, Mac antiguo \r)
  const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  const breaks=[];

  lines.forEach((line,i)=>{
    const l=line.trim();
    if(!l||l.length>100) return;

    const isHeading=(
      // "Capítulo 1", "Capítulo 1: El inicio", "Chapter One", "Parte II", "Sección 3"
      // "Prólogo", "Epílogo", "Introducción", "Conclusión", "Apéndice"
      /^(cap[ií]tulo|chapter|parte|part|secci[oó]n|section|pr[oó]logo|prologue|ep[ií]logo|epilogue|introducci[oó]n|introduction|conclusi[oó]n|conclusion|ap[eé]ndice|appendix)\b.*$/i.test(l) ||
      // Número romano solo en la línea: "I", "II", "III" … "XXIX"
      /^[IVXLCDM]{1,6}\.?\s*$/i.test(l) ||
      // Número solo: "1", "2" … "99"
      /^\d{1,3}\.?\s*$/.test(l) ||
      // "1. El comienzo", "1 - Dawn", "I: La partida" (número + separador + título)
      /^(\d{1,3}|[IVXLCDM]{1,6})[\s.\-:–—]+\S.{0,80}$/i.test(l) ||
      // Línea toda en MAYÚSCULAS corta (estilo clásico): "EL COMIENZO", "PARTE UNO"
      (l.length>=3&&l.length<=60&&l===l.toUpperCase()&&/[A-ZÁÉÍÓÚÜÑ]{3}/.test(l)&&!/[.!?,;:]$/.test(l))
    );
    if(isHeading) breaks.push(i);
  });

  if(breaks.length<1) return null;

  const chapters=[];
  breaks.forEach((start,idx)=>{
    const end=breaks[idx+1]??lines.length;

    // Construir el título: línea del encabezado
    let title=lines[start].trim();

    // Si la línea siguiente no vacía es corta (≤8 palabras), es un subtítulo
    let bodyStart=start+1;
    let peek=start+1;
    while(peek<end&&!lines[peek].trim()) peek++;
    const nextLine=(lines[peek]||'').trim();
    if(nextLine&&nextLine.length<=80&&nextLine.split(/\s+/).length<=8&&
       !/^(cap[ií]tulo|chapter|\d|[IVXLCDM]{1,6})/i.test(nextLine)){
      title=`${title}: ${nextLine}`;
      bodyStart=peek+1;
    }

    const body=lines.slice(bodyStart,end).join('\n').trim();
    const wc=body.split(/\s+/).filter(Boolean).length;
    if(wc<20) return; // ignorar capítulos vacíos o muy cortos
    chapters.push({title,text:body,wordCount:wc});
  });

  return chapters.length>=1?chapters:null;
}

function buildBook(rawText,filename) {
  const text=rawText.trim();
  const detected=detectChapters(text);

  if(detected&&detected.length>=1){
    // Capítulos detectados — sub-dividir los que superen el límite TTS
    const result=[];
    detected.forEach(ch=>{
      if(ch.wordCount<=WORDS_PER_CHUNK){
        result.push({id:result.length,title:ch.title,text:ch.text,wordCount:ch.wordCount});
      } else {
        // Capítulo largo: dividir en partes conservando el título
        const parts=chunkByWords(ch.text);
        parts.forEach((part,j)=>{
          const wc=part.split(/\s+/).filter(Boolean).length;
          result.push({
            id:result.length,
            title:parts.length===1?ch.title:`${ch.title} — parte ${j+1}`,
            text:part,wordCount:wc,
          });
        });
      }
    });
    return result;
  }

  // Sin capítulos detectados — dividir todo el libro en secciones
  const chunks=chunkByWords(text);
  return chunks.map((chunk,i)=>({
    id:i,
    title:chunks.length===1?(filename||'Texto completo'):`Sección ${i+1} de ${chunks.length}`,
    text:chunk,
    wordCount:chunk.split(/\s+/).filter(Boolean).length,
  }));
}

// ─── FILE PARSERS ─────────────────────────────────────────────────────────────
function withTimeout(p,ms=PARSE_TIMEOUT,label='Operación') {
  let tid;
  const g=new Promise((_,rej)=>{tid=setTimeout(()=>rej(new Error(`${label} superó 60 segundos.`)),ms);});
  return Promise.race([p,g]).finally(()=>clearTimeout(tid));
}
function parseTXT(file) {
  return withTimeout(new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=e=>res(e.target.result);
    r.onerror=()=>rej(new Error('Error leyendo el archivo.'));
    r.readAsText(file);
  }),PARSE_TIMEOUT,'Lectura TXT');
}
async function parsePDF(file) {
  const pdfjsLib=await import('pdfjs-dist');
  // Usa el worker empaquetado por Vite — evita errores de versión en CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc=
    new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  const ab=await file.arrayBuffer();
  const pdf=await withTimeout(pdfjsLib.getDocument({data:ab}).promise,PARSE_TIMEOUT,'PDF');
  let text='';
  for(let i=1;i<=pdf.numPages;i++){
    const p=await pdf.getPage(i); const c=await p.getTextContent();
    text+=c.items.map(x=>x.str).join(' ')+'\n';
  }
  return text;
}
async function parseEPUB(file) {
  const {default:ePub}=await import('epubjs');
  const ab=await file.arrayBuffer(); const book=ePub(ab);
  await withTimeout(book.ready,PARSE_TIMEOUT,'EPUB');
  let text='';
  for(const item of book.spine.items){
    const doc=await book.load(item.href);
    text+=((doc?.body||doc?.documentElement)?.textContent||'')+'\n\n';
  }
  return text;
}
async function parseDOCX(file) {
  const {default:mammoth}=await import('mammoth');
  const ab=await file.arrayBuffer();
  const result=await withTimeout(mammoth.extractRawText({arrayBuffer:ab}),PARSE_TIMEOUT,'DOCX');
  return result.value;
}
async function parseFile(file) {
  const ext=file.name.split('.').pop().toLowerCase(); let text;
  if(ext==='txt') text=await parseTXT(file);
  else if(ext==='pdf') text=await parsePDF(file);
  else if(ext==='epub') text=await parseEPUB(file);
  else if(ext==='docx'||ext==='doc') text=await parseDOCX(file);
  else throw new Error(`.${ext} no soportado. Usa TXT, PDF, EPUB o DOCX.`);
  if(!text?.trim()||text.trim().length<100)
    throw new Error('El archivo parece estar vacío o sin texto legible.');
  const title=file.name.replace(/\.[^/.]+$/,'');
  const chapters=buildBook(text,title);
  const totalWords=chapters.reduce((s,c)=>s+c.wordCount,0);
  return {title,chapters,totalWords,estimatedMins:estimateMins(totalWords)};
}

// ─── TTS SERVICE ─────────────────────────────────────────────────────────────
async function generateAudio(text,voice,signal) {
  const MAX_ATTEMPTS=4;
  // Backoff agresivo para respetar el límite de la API: 5s, 15s, 45s
  const BACKOFF=[5_000, 15_000, 45_000];
  for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
    if(signal?.aborted) throw new DOMException('Cancelado','AbortError');
    const tc=new AbortController();
    const tid=setTimeout(()=>tc.abort(),55_000);
    const sig=(signal&&typeof AbortSignal.any==='function')
      ? AbortSignal.any([signal,tc.signal]) : tc.signal;
    try {
      const res=await fetch(TTS_ENDPOINT,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({text,voice}),signal:sig,
      });
      clearTimeout(tid);
      if(res.status===429){
        if(attempt===MAX_ATTEMPTS-1)
          throw new Error('Límite de solicitudes alcanzado. Espera un momento e intenta de nuevo.');
        const wait=(BACKOFF[attempt]||45_000)+Math.random()*1000;
        await new Promise(r=>setTimeout(r,wait));
        continue;
      }
      if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(mapError(res.status,err));}
      const data=await res.json();
      const b64=data.audio;
      if(!b64) throw new Error('El servidor no devolvió audio.');
      return pcmBase64ToWavBlob(b64);
    } catch(e){
      clearTimeout(tid);
      if(e.name==='AbortError'){
        if(tc.signal.aborted&&!signal?.aborted)
          throw new Error('Tiempo de espera agotado. Intenta de nuevo.');
        throw e;
      }
      if(attempt===MAX_ATTEMPTS-1) throw e;
    }
  }
  throw new Error('No se pudo generar el audio. Intenta de nuevo.');
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useLS(key,def) {
  const [v,setV]=useState(()=>{
    try{const s=localStorage.getItem(key);return s!=null?JSON.parse(s):def;}catch{return def;}
  });
  const set=useCallback(val=>{
    setV(val);try{localStorage.setItem(key,JSON.stringify(val));}catch{}
  },[key]);
  return [v,set];
}

function useToast() {
  const [toasts,setToasts]=useState([]);
  const toast=useCallback((msg,type='error')=>{
    const id=Date.now();
    setToasts(t=>[...t.slice(-2),{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),5000);
  },[]);
  return {toasts,toast};
}

/**
 * useTheme — Gestiona el tema de la app.
 * pref: 'system' | 'light' | 'dark'
 *  • 'system' → elimina data-theme del <html>; el CSS media query maneja el cambio automáticamente.
 *  • 'light' | 'dark' → fuerza data-theme en <html>, ignorando el OS.
 * Cuando el OS cambia su preferencia y pref==='system', el cambio ocurre instantáneamente
 * gracias a la escucha del MediaQueryList 'change'.
 */
function useTheme() {
  const [pref, setPref] = useLS('ab_theme', 'system');

  useEffect(() => {
    const root = document.documentElement;
    const mq   = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      if (pref === 'system') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', pref);
      }
    };

    apply();
    // Cuando el OS cambia (y el usuario eligió 'system'), re-aplicar para forzar re-render
    // En realidad no hace falta porque el CSS media query ya actúa solo,
    // pero esto dispara el re-render de React para actualizar el icono del botón.
    const onChange = () => { if (pref === 'system') setThemeKey(k => k+1); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  // Detecta si el tema efectivo actualmente es dark (para el icono del toggle)
  const isDark = pref === 'dark'
    || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { pref, setPref, isDark };
}
// eslint-disable-next-line no-unused-vars -- usado dentro de useTheme
let setThemeKey;
function useThemeFixed() {
  const [, forceUpdate] = useState(0);
  setThemeKey = forceUpdate;  // expone el setter al closure de useTheme
  return useTheme();
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic = {
  Play:()=><svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M8 5v14l11-7z"/></svg>,
  Pause:()=><svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  Upload:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  Rew:()=><svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M11 18V6l-8.5 6L11 18zm.5-6l8.5 6V6l-8.5 6z"/></svg>,
  Fwd:()=><svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>,
  List:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Gear:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Check:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="1em" height="1em"><polyline points="20 6 9 17 4 12"/></svg>,
  Close:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="1em" height="1em"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Book:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  Clock:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Headphones:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3z"/><path d="M3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>,
  Sun:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function Spinner({size=28,color='var(--c-text)'}) {
  return <div style={{width:size,height:size,border:`3px solid transparent`,borderTopColor:color,borderRadius:'50%',animation:'spin .85s linear infinite',flexShrink:0}}/>;
}

function Skeleton({h=18,r=6,mb=0}) {
  return <div style={{
    height:h,borderRadius:r,marginBottom:mb,
    background:'linear-gradient(90deg,var(--c-surface) 25%,var(--c-shimmer) 50%,var(--c-surface) 75%)',
    backgroundSize:'200% 100%',animation:'shimmer 1.6s ease infinite',
  }}/>;
}

function ToastContainer({toasts}) {
  return (
    <div style={{position:'fixed',bottom:82,left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',flexDirection:'column',gap:8,width:'calc(100vw - 32px)',maxWidth:420,pointerEvents:'none'}}>
      {toasts.map(t=>(
        <div key={t.id} style={{padding:'12px 16px',borderRadius:12,fontSize:14,fontWeight:500,color:'#fff',boxShadow:'0 4px 20px rgba(0,0,0,.35)',animation:'slideUp .3s ease',
          background:t.type==='success'?'#16a34a':t.type==='info'?'#2563eb':'#dc2626'}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── SETTINGS MODAL ───────────────────────────────────────────────────────────
function SettingsModal({voice, setVoice, themePref, setThemePref, onClose}) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Preferencias"
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,background:'var(--c-overlay)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,animation:'fadeIn .2s ease'}}
    >
      <div style={{background:'var(--c-surface)',borderRadius:24,padding:24,width:'100%',maxWidth:440,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 48px rgba(0,0,0,.4)'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <h2 style={{fontSize:19,fontWeight:800,color:'var(--c-text)'}}>Preferencias</h2>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--c-text2)',cursor:'pointer',fontSize:22,display:'flex'}}><Ic.Close/></button>
        </div>

        {/* ── TEMA ── */}
        <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--c-text2)',marginBottom:12,textTransform:'uppercase',letterSpacing:'.08em'}}>
          Apariencia
        </label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:28}}>
          {THEME_OPTIONS.map(opt=>{
            const active=themePref===opt.id;
            return (
              <button
                key={opt.id}
                onClick={()=>setThemePref(opt.id)}
                aria-pressed={active}
                style={{
                  padding:'12px 8px',borderRadius:14,
                  border:`2px solid ${active?'var(--c-accent)':'var(--c-border2)'}`,
                  background:active?'var(--c-accent-bg)':'var(--c-surface2)',
                  cursor:'pointer',transition:'all .18s',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                }}
              >
                <span style={{fontSize:20}}>{opt.emoji}</span>
                <span style={{fontSize:12,fontWeight:700,color:active?'var(--c-accent-text)':'var(--c-text2)'}}>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── VOZ ── */}
        <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--c-text2)',marginBottom:12,textTransform:'uppercase',letterSpacing:'.08em'}}>
          Voz narradora
        </label>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:28}}>
          {VOICES.map(v=>(
            <button
              key={v.id} onClick={()=>setVoice(v.id)} aria-pressed={voice===v.id}
              style={{textAlign:'left',padding:'13px 15px',borderRadius:13,
                border:`2px solid ${voice===v.id?'var(--c-accent)':'var(--c-border2)'}`,
                background:voice===v.id?'var(--c-accent-bg)':'var(--c-surface2)',
                cursor:'pointer',transition:'all .18s'}}
            >
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontWeight:700,color:'var(--c-text)',fontSize:15}}>{v.label}</span>
                <span style={{fontSize:11,color:'var(--c-text2)',background:'var(--c-surface)',padding:'2px 8px',borderRadius:20}}>{v.gender}</span>
              </div>
              <p style={{fontSize:13,color:'var(--c-muted)',marginTop:3}}>{v.desc}</p>
            </button>
          ))}
        </div>

        <button onClick={onClose}
          style={{width:'100%',background:'var(--c-btn)',color:'#fff',border:'none',borderRadius:14,padding:'14px',fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px var(--c-btn-glow)'}}>
          Guardar
        </button>
      </div>
    </div>
  );
}

// ─── UPLOAD SCREEN ────────────────────────────────────────────────────────────
function UploadScreen({onBook, toast, isParsing, setIsParsing}) {
  const [drag,setDrag]=useState(false);
  const inputRef=useRef();

  const process=async(file)=>{
    if(!file) return;
    setIsParsing(true);
    try{
      const book=await parseFile(file);
      onBook(book);
      toast(`"${book.title}" listo — ${book.chapters.length} capítulos`,'success');
    }catch(e){toast(e.message||'Error al procesar el archivo.');}
    finally{setIsParsing(false);}
  };

  if(isParsing) return (
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,gap:24}}>
      <Spinner size={52} color="var(--c-accent)"/>
      <div style={{textAlign:'center'}}>
        <p style={{color:'var(--c-accent-text)',fontSize:17,fontWeight:700,marginBottom:6}}>Procesando archivo…</p>
        <p style={{color:'var(--c-muted)',fontSize:13}}>Detectando capítulos y estructura</p>
      </div>
      <div style={{width:'100%',maxWidth:300,display:'flex',flexDirection:'column',gap:10}}>
        <Skeleton h={15} r={6}/><Skeleton h={12} r={6}/><Skeleton h={12} r={6}/>
      </div>
    </div>
  );

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
      <div
        role="button" tabIndex={0} aria-label="Zona de carga de archivo"
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);process(e.dataTransfer.files[0]);}}
        onClick={()=>inputRef.current?.click()}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')inputRef.current?.click();}}
        style={{
          width:'100%',maxWidth:340,
          border:`2px dashed ${drag?'var(--c-accent)':'var(--c-border2)'}`,
          borderRadius:22,padding:'40px 32px',textAlign:'center',cursor:'pointer',
          background:drag?'var(--c-drag-bg)':'transparent',
          transition:'all .25s',
        }}
      >
        <div style={{fontSize:60,color:drag?'var(--c-accent)':'var(--c-muted)',marginBottom:18,transition:'color .2s'}}><Ic.Upload/></div>
        <p style={{fontSize:20,fontWeight:800,color:'var(--c-text)',marginBottom:8}}>
          {drag?'¡Suelta aquí!':'Sube tu libro'}
        </p>
        <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:22,lineHeight:1.6}}>
          Arrastra un archivo o toca para seleccionar
        </p>
        <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
          {['TXT','PDF','EPUB','DOCX'].map(f=>(
            <span key={f} style={{fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:20,background:'var(--c-surface)',color:'var(--c-text2)',letterSpacing:'.07em'}}>{f}</span>
          ))}
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".txt,.pdf,.epub,.docx,.doc" onChange={e=>process(e.target.files[0])} style={{display:'none'}}/>
      <p style={{color:'var(--c-disabled)',fontSize:12,marginTop:20,textAlign:'center',maxWidth:280,lineHeight:1.6}}>
        Tu archivo se procesa localmente en tu dispositivo.
      </p>
    </div>
  );
}

// ─── PLAYER SCREEN ────────────────────────────────────────────────────────────
function PlayerScreen({book,chapterIdx,setChapterIdx,chapterCache,setChapterCache,chapterStatus,setChapterStatus,voice,toast}) {
  const audioRef=useRef(null); const abortRef=useRef(null); const rangeRef=useRef(null);
  const prefetchAbortRef=useRef(null);
  const genAndPlayRef=useRef(null); // referencia para el countdown auto-retry
  const [isPlaying,     setIsPlaying]     =useState(false);
  const [isGen,         setIsGen]         =useState(false);
  const [currentT,      setCurrentT]      =useState(0);
  const [duration,      setDuration]      =useState(0);
  const [speed,         setSpeed]         =useState(1);
  const [rateLimitSecs, setRateLimitSecs] =useState(0); // cuenta regresiva 429

  const chapter=book?.chapters[chapterIdx];
  const isReady=!!chapterCache[chapterIdx];
  const prog=duration>0?(currentT/duration)*100:0;

  useEffect(()=>{if(audioRef.current)audioRef.current.playbackRate=speed;},[speed]);
  // Cancelar prefetch al desmontar
  useEffect(()=>()=>{prefetchAbortRef.current?.abort();},[]);

  useEffect(()=>{
    const a=audioRef.current; if(!a) return;
    const onTime=()=>{setCurrentT(a.currentTime);if(rangeRef.current&&a.duration)rangeRef.current.style.setProperty('--prog',`${(a.currentTime/a.duration)*100}%`);};
    const onMeta=()=>setDuration(a.duration);
    const onPlay=()=>setIsPlaying(true); const onPause=()=>setIsPlaying(false);
    const onEnded=()=>{setIsPlaying(false);if(book&&chapterIdx<book.chapters.length-1)setChapterIdx(i=>i+1);};
    a.addEventListener('timeupdate',onTime); a.addEventListener('loadedmetadata',onMeta);
    a.addEventListener('play',onPlay);       a.addEventListener('pause',onPause);
    a.addEventListener('ended',onEnded);
    return()=>{a.removeEventListener('timeupdate',onTime);a.removeEventListener('loadedmetadata',onMeta);a.removeEventListener('play',onPlay);a.removeEventListener('pause',onPause);a.removeEventListener('ended',onEnded);};
  },[chapterIdx,book]);

  useEffect(()=>{
    const a=audioRef.current; if(!a) return;
    a.pause(); setIsPlaying(false); setCurrentT(0); setDuration(0);
    if(rangeRef.current)rangeRef.current.style.setProperty('--prog','0%');
    // No llamar a.load() — resetea el elemento y puede cancelar play() posterior
    if(chapterCache[chapterIdx]){a.src=chapterCache[chapterIdx];a.playbackRate=speed;}
    else a.src='';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[chapterIdx]);

  // ── Cuenta regresiva 429 → auto-retry ────────────────────────────────────────
  useEffect(()=>{
    if(rateLimitSecs<=0) return;
    const t=setTimeout(()=>{
      setRateLimitSecs(s=>{
        const next=s-1;
        if(next<=0) setTimeout(()=>genAndPlayRef.current?.(),0);
        return next;
      });
    },1000);
    return()=>clearTimeout(t);
  },[rateLimitSecs]);

  const generateAndPlay=async()=>{
    if(!chapter) return;
    setRateLimitSecs(0); // cancelar cualquier countdown previo
    const a=audioRef.current;
    const silentUrl=URL.createObjectURL(silentWavBlob());
    a.src=silentUrl;
    try{ const p=a.play(); if(p) await p; a.pause(); }catch{}

    abortRef.current?.abort(); abortRef.current=new AbortController();
    setIsGen(true); setChapterStatus(p=>({...p,[chapterIdx]:'generating'}));
    try{
      const blob=await generateAudio(chapter.text,voice,abortRef.current.signal);
      const url=URL.createObjectURL(blob);
      setChapterCache(p=>({...p,[chapterIdx]:url}));
      setChapterStatus(p=>({...p,[chapterIdx]:'ready'}));
      a.src=url; a.playbackRate=speed;
      a.play().catch(()=>toast('Toca Play nuevamente.','error'));
      startPrefetch(chapterIdx+1);
    }catch(e){
      if(e.name==='AbortError') return;
      setChapterStatus(p=>({...p,[chapterIdx]:'error'}));
      // 429 → iniciar cuenta regresiva de 60s y reintentar automáticamente
      if(e.message?.toLowerCase().includes('límite')||e.message?.toLowerCase().includes('limite')){
        setRateLimitSecs(60);
      } else {
        toast(e.message||'Error al generar el audio.','error');
      }
    }finally{
      setIsGen(false);
      URL.revokeObjectURL(silentUrl);
    }
  };
  // Mantener ref actualizada para el countdown
  genAndPlayRef.current=generateAndPlay;

  const togglePlay=async()=>{
    const a=audioRef.current; if(!a) return;
    if(isPlaying){a.pause();return;}
    // ⚠️ NO usar a.src para detectar si hay audio — en Chrome/Safari, a.src=''
    // devuelve la URL de la página (truthy), causando play() sobre fuente inválida.
    // Usar chapterCache como fuente de verdad.
    if(chapterCache[chapterIdx]){
      a.src=chapterCache[chapterIdx]; a.playbackRate=speed;
      a.play().catch(()=>toast('Toca Play nuevamente para reproducir.','error'));
    } else {
      await generateAndPlay();
    }
  };

  const skip=d=>{const a=audioRef.current;if(a?.src)a.currentTime=Math.max(0,Math.min(a.duration||0,a.currentTime+d));};
  const changeChap=d=>{
    prefetchAbortRef.current?.abort();
    abortRef.current?.abort();
    setIsGen(false);
    setRateLimitSecs(0);
    setChapterIdx(i=>i+d);
  };

  // ── Prefetch silencioso del capítulo siguiente ──────────────────────────────
  // Espera 25s para no competir con la llamada principal y respetar el rate-limit.
  const startPrefetch=useCallback((nextIdx)=>{
    if(!book?.chapters[nextIdx]) return;
    if(chapterCache[nextIdx]) return; // ya está en caché
    prefetchAbortRef.current?.abort();
    prefetchAbortRef.current=new AbortController();
    const sig=prefetchAbortRef.current.signal;
    setTimeout(async()=>{
      if(sig.aborted) return;
      try{
        const blob=await generateAudio(book.chapters[nextIdx].text,voice,sig);
        if(sig.aborted) return;
        const url=URL.createObjectURL(blob);
        setChapterCache(p=>({...p,[nextIdx]:url}));
        setChapterStatus(p=>({...p,[nextIdx]:'ready'}));
      }catch{/* fallo silencioso — el usuario puede generarlo manualmente */}
    },25_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[book,voice]);

  if(!book) return (
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:16}}>
      <div style={{fontSize:72,color:'var(--c-border2)'}}><Ic.Book/></div>
      <p style={{color:'var(--c-muted)',fontSize:16,textAlign:'center'}}>Sube un libro para comenzar</p>
    </div>
  );

  const total=book.chapters.length;

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',padding:'20px',gap:16,overflowY:'auto'}}>
      <audio ref={audioRef} preload="auto"/>

      {/* Title */}
      <div style={{textAlign:'center'}}>
        <p style={{fontSize:10,fontWeight:800,color:'var(--c-accent)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:6}}>Reproduciendo</p>
        <h2 style={{fontSize:20,fontWeight:800,color:'var(--c-text)',lineHeight:1.3,marginBottom:4}}>{book.title}</h2>
        <p style={{color:'var(--c-muted)',fontSize:13}}>{chapter?.title} · {chapterIdx+1}/{total}</p>
      </div>

      {/* Waveform */}
      <div style={{background:'var(--c-surface)',borderRadius:20,height:100,display:'flex',alignItems:'center',justifyContent:'center',gap:3,padding:'0 16px',overflow:'hidden'}}>
        {isGen?(
          Array.from({length:22}).map((_,i)=>(
            <div key={i} style={{width:4,borderRadius:4,background:'var(--c-accent)',animation:`wave .9s ease-in-out infinite`,animationDelay:`${i*.075}s`,height:8}}/>
          ))
        ):isReady?(
          Array.from({length:22}).map((_,i)=>(
            <div key={i} style={{width:4,borderRadius:4,height:`${10+Math.abs(Math.sin(i*.72+1))*26}px`,background:(i/22)<(prog/100)?'var(--c-accent)':'var(--c-border2)',transition:'background .25s'}}/>
          ))
        ):rateLimitSecs>0?(
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:28,fontWeight:900,color:'var(--c-accent)',marginBottom:6}}>{rateLimitSecs}s</div>
            <p style={{fontSize:12,color:'var(--c-muted)'}}>Límite de API — reintentando automáticamente…</p>
          </div>
        ):(
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:36,color:'var(--c-border2)',marginBottom:8}}><Ic.Headphones/></div>
            <p style={{fontSize:12,color:'var(--c-muted)'}}>Toca ▶ para generar el audio</p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div>
        <input ref={rangeRef} type="range" min="0" max="100" value={prog}
          onChange={e=>{const a=audioRef.current;if(!a?.duration)return;const t=(+e.target.value/100)*a.duration;a.currentTime=t;setCurrentT(t);e.target.style.setProperty('--prog',`${e.target.value}%`);}}
          disabled={!isReady}/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
          <span style={{fontSize:12,color:'var(--c-muted)'}}>{formatTime(currentT)}</span>
          <span style={{fontSize:12,color:'var(--c-muted)'}}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Transport */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:24}}>
        <button onClick={()=>skip(-15)} style={{background:'none',border:'none',color:'var(--c-text2)',fontSize:28,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,transition:'opacity .15s'}}>
          <Ic.Rew/><span style={{fontSize:9,fontWeight:700}}>15s</span>
        </button>
        <button onClick={togglePlay} disabled={isGen}
          style={{width:70,height:70,borderRadius:'50%',background:isGen?'var(--c-surface)':'var(--c-btn)',border:'none',color:isGen?'var(--c-accent)':'#fff',fontSize:28,cursor:isGen?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:isPlaying?'none':`0 0 24px var(--c-btn-glow)`,animation:isPlaying?'pulse 2s ease-in-out infinite':'none',transition:'background .2s'}}>
          {isGen?<Spinner size={26} color="var(--c-accent)"/>:isPlaying?<Ic.Pause/>:<Ic.Play/>}
        </button>
        <button onClick={()=>skip(15)} style={{background:'none',border:'none',color:'var(--c-text2)',fontSize:28,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,transition:'opacity .15s'}}>
          <Ic.Fwd/><span style={{fontSize:9,fontWeight:700}}>15s</span>
        </button>
      </div>

      {/* Speed */}
      <div style={{display:'flex',justifyContent:'center',gap:6}}>
        {SPEEDS.map(s=>(
          <button key={s} onClick={()=>setSpeed(s)} aria-pressed={speed===s}
            style={{padding:'5px 11px',borderRadius:20,border:`1.5px solid ${speed===s?'var(--c-accent)':'var(--c-border2)'}`,background:speed===s?'var(--c-accent-bg)':'transparent',color:speed===s?'var(--c-accent-text)':'var(--c-muted)',fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .15s'}}>
            {s}×
          </button>
        ))}
      </div>

      {/* Prev/Next */}
      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>chapterIdx>0&&changeChap(-1)} disabled={chapterIdx===0}
          style={{flex:1,padding:'12px',borderRadius:13,border:'1.5px solid var(--c-border2)',background:'transparent',color:chapterIdx===0?'var(--c-disabled)':'var(--c-text2)',cursor:chapterIdx===0?'default':'pointer',fontSize:13,fontWeight:700,transition:'color .15s'}}>
          ← Anterior
        </button>
        <button onClick={()=>chapterIdx<total-1&&changeChap(1)} disabled={chapterIdx===total-1}
          style={{flex:1,padding:'12px',borderRadius:13,border:'1.5px solid var(--c-border2)',background:'transparent',color:chapterIdx===total-1?'var(--c-disabled)':'var(--c-text2)',cursor:chapterIdx===total-1?'default':'pointer',fontSize:13,fontWeight:700,transition:'color .15s'}}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// ─── CHAPTERS SCREEN ──────────────────────────────────────────────────────────
function ChaptersScreen({book,chapterIdx,setChapterIdx,chapterStatus,setActiveTab}) {
  if(!book) return (
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:14}}>
      <div style={{fontSize:64,color:'var(--c-border2)'}}><Ic.List/></div>
      <p style={{color:'var(--c-muted)',fontSize:16}}>No hay libro cargado</p>
    </div>
  );

  const totalReady=Object.values(chapterStatus).filter(s=>s==='ready').length;
  const pct=(totalReady/book.chapters.length)*100;

  const dot=s=>{
    if(s==='ready')      return {node:<Ic.Check/>,  color:'#22c55e'};
    if(s==='generating') return {node:<Spinner size={15} color="var(--c-accent)"/>, color:'var(--c-accent)'};
    if(s==='error')      return {node:'✕', color:'#ef4444'};
    return                      {node:'○', color:'var(--c-disabled)'};
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflowY:'auto'}}>
      <div style={{padding:'18px 20px 14px',borderBottom:'1px solid var(--c-border)',flexShrink:0}}>
        <h2 style={{fontSize:16,fontWeight:800,color:'var(--c-text)',marginBottom:6}}>{book.title}</h2>
        <div style={{display:'flex',gap:14,marginBottom:10,flexWrap:'wrap'}}>
          <span style={{fontSize:12,color:'var(--c-muted)',display:'flex',alignItems:'center',gap:4}}><Ic.Book/>{book.chapters.length} cap.</span>
          <span style={{fontSize:12,color:'var(--c-muted)',display:'flex',alignItems:'center',gap:4}}><Ic.Clock/>~{book.estimatedMins} min</span>
          <span style={{fontSize:12,color:'#22c55e',fontWeight:700}}>{totalReady}/{book.chapters.length} listos</span>
        </div>
        <div style={{background:'var(--c-surface)',borderRadius:4,height:5}}>
          <div style={{background:'linear-gradient(90deg,var(--c-btn),var(--c-accent))',height:5,borderRadius:4,width:`${pct}%`,transition:'width .5s ease'}}/>
        </div>
      </div>

      <div>
        {book.chapters.map((ch,idx)=>{
          const st=dot(chapterStatus[idx]||'idle'); const active=idx===chapterIdx;
          return (
            <button key={ch.id} onClick={()=>{setChapterIdx(idx);setActiveTab('player');}}
              aria-current={active?'true':undefined}
              style={{width:'100%',textAlign:'left',padding:'13px 20px',background:active?'var(--c-active-row)':'transparent',border:'none',borderLeft:`3px solid ${active?'var(--c-accent)':'transparent'}`,cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'background .15s'}}>
              <div style={{flexShrink:0,width:20,color:st.color,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>{st.node}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:active?800:500,color:active?'var(--c-accent-text)':'var(--c-text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ch.title}</p>
                <p style={{fontSize:11,color:'var(--c-muted)',marginTop:2}}>~{estimateMins(ch.wordCount)} min · {ch.wordCount.toLocaleString()} palabras</p>
              </div>
              {active&&<span style={{fontSize:10,fontWeight:800,color:'var(--c-accent)',background:'var(--c-badge-bg)',padding:'2px 8px',borderRadius:20,flexShrink:0}}>Actual</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [voice,         setVoice]         = useLS('ab_voice','Kore');
  const [showSettings,  setShowSettings]  = useState(false);
  const [activeTab,     setActiveTab]     = useState('upload');
  const [book,          setBook]          = useState(null);
  const [chapterIdx,    setChapterIdx]    = useState(0);
  const [chapterCache,  setChapterCache]  = useState({});
  const [chapterStatus, setChapterStatus] = useState({});
  const [isParsing,     setIsParsing]     = useState(false);
  const {toasts, toast} = useToast();

  // ── Theme ──
  const { pref: themePref, setPref: setThemePref } = useThemeFixed();

  // ── Inject CSS once ──
  useEffect(()=>{
    const tag=document.createElement('style');
    tag.textContent=GLOBAL_CSS;
    document.head.appendChild(tag);
    return()=>document.head.removeChild(tag);
  },[]);

  const onBook=useCallback(b=>{
    setBook(b); setChapterIdx(0); setChapterCache({}); setChapterStatus({});
    setActiveTab('player');
  },[]);

  const TABS=[
    {id:'upload',   label:'Cargar',      Icon:Ic.Upload    },
    {id:'player',   label:'Reproductor', Icon:Ic.Headphones},
    {id:'chapters', label:'Capítulos',   Icon:Ic.List      },
  ];

  return (
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:'var(--c-bg)',maxWidth:480,margin:'0 auto',position:'relative',overflow:'hidden'}}>

      {/* Header */}
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid var(--c-border)',flexShrink:0,background:'var(--c-bg)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{color:'var(--c-accent)',fontSize:24}}><Ic.Headphones/></span>
          <span style={{fontSize:18,fontWeight:800,color:'var(--c-text)',letterSpacing:'-.01em'}}>AudioBook Creator</span>
        </div>
        <button onClick={()=>setShowSettings(true)} aria-label="Abrir preferencias"
          style={{background:'none',border:'none',color:'var(--c-muted)',fontSize:22,cursor:'pointer',padding:6,display:'flex',borderRadius:8,transition:'color .15s'}}>
          <Ic.Gear/>
        </button>
      </header>

      {/* Screens */}
      <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',animation:'fadeIn .2s ease'}}>
        {activeTab==='upload'   && <UploadScreen onBook={onBook} toast={toast} isParsing={isParsing} setIsParsing={setIsParsing}/>}
        {activeTab==='player'   && <PlayerScreen book={book} chapterIdx={chapterIdx} setChapterIdx={setChapterIdx} chapterCache={chapterCache} setChapterCache={setChapterCache} chapterStatus={chapterStatus} setChapterStatus={setChapterStatus} voice={voice} toast={toast}/>}
        {activeTab==='chapters' && <ChaptersScreen book={book} chapterIdx={chapterIdx} setChapterIdx={setChapterIdx} chapterStatus={chapterStatus} setActiveTab={setActiveTab}/>}
      </main>

      {/* Bottom Nav */}
      <nav aria-label="Navegación principal"
        style={{display:'flex',background:'var(--c-bg)',borderTop:'1px solid var(--c-border)',flexShrink:0,paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        {TABS.map(({id,label,Icon})=>{
          const active=activeTab===id;
          return (
            <button key={id} onClick={()=>setActiveTab(id)} aria-current={active?'page':undefined}
              style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 0 8px',background:'none',border:'none',color:active?'var(--c-accent)':'var(--c-muted2)',fontSize:22,cursor:'pointer',transition:'color .15s'}}>
              <Icon/>
              <span style={{fontSize:10,fontWeight:active?700:500}}>{label}</span>
              {active&&<div style={{width:4,height:4,borderRadius:'50%',background:'var(--c-accent)'}}/>}
            </button>
          );
        })}
      </nav>

      <ToastContainer toasts={toasts}/>
      {showSettings&&(
        <SettingsModal
          voice={voice} setVoice={setVoice}
          themePref={themePref} setThemePref={setThemePref}
          onClose={()=>setShowSettings(false)}
        />
      )}
    </div>
  );
}
