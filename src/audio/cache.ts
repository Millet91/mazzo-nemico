// I suoni pronti restano sul telefono (IndexedDB): dal secondo avvio non si sintetizza più niente.
// Misura del 22/11/2026 (tests/audio/misura-avvio.ts, Chromium con CPU ×4): preparare tutto costa circa 5,5 s e un
// quarto dei frame del menu (le ricette si COSTRUISCONO sul filo principale: oscillatori, filtri, inviluppi).
// Prepararle a fette non toglieva scatti e allungava a 8 s; tenerle da parte sì. Si salvano a 16 bit (metà spazio,
// differenza non udibile dall'altoparlante del telefono). La chiave è il file della build che contiene l'audio
// (il nome cambia a ogni build diversa): un aggiornamento dell'app rifà i suoni una volta, poi tornano in cassetto.
// Se IndexedDB manca o si rompe, si sintetizza come prima: il cassetto è solo una scorciatoia.

const NOME_DB = 'kaboom-audio';
const NEGOZIO = 'suoni';

/** Un suono (o una nota) pronto: i campioni a 16 bit e la frequenza. */
export interface Conservato { dati: Int16Array; freq: number }

/** Chiave del cassetto: il file della build (con l'impronta nel nome). Nel server di sviluppo e nei test: niente cassetto. */
export function chiaveBuild(): string | null {
  // fuori da Vite (banco d'ascolto impacchettato con esbuild) import.meta può essere vuoto: niente cassetto
  const url: unknown = import.meta.url;
  return typeof url === 'string' ? chiaveDa(url, import.meta.env?.DEV === true) : null;
}

/** Solo i file con l'impronta della build (es. index-CkCNdGze.js): un file senza impronta non dice se è cambiato. */
export function chiaveDa(url: string | undefined, sviluppo: boolean): string | null {
  if (sviluppo || typeof url !== 'string') return null;
  const file = url.split('?')[0].split('#')[0].split('/').pop() ?? '';
  return /-[A-Za-z0-9_-]{6,}\.js$/.test(file) ? file : null;
}

export function a16(d: Float32Array): Int16Array {
  const o = new Int16Array(d.length);
  for (let i = 0; i < d.length; i++) { const x = d[i]; o[i] = x >= 1 ? 32767 : x <= -1 ? -32767 : Math.round(x * 32767); }
  return o;
}

export function da16(d: Int16Array): Float32Array {
  const o = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) o[i] = d[i] / 32767;
  return o;
}

function apri(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
      if (!idb) { ok(null); return; }
      const r = idb.open(NOME_DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(NEGOZIO); };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
      r.onblocked = () => ok(null);
    } catch { ok(null); }
  });
}

/** Il cassetto di `gruppo` ('suoni' o 'note') per questa build, o null (vuoto, di un'altra build, o niente IndexedDB). */
export async function leggi(gruppo: string, chiave: string | null): Promise<Map<string, Conservato> | null> {
  if (!chiave) return null;
  const db = await apri();
  if (!db) return null;
  try {
    return await new Promise((ok) => {
      const r = db.transaction(NEGOZIO, 'readonly').objectStore(NEGOZIO).get(gruppo);
      r.onsuccess = () => {
        const v = r.result as { chiave: string; voci: [string, Conservato][] } | undefined;
        ok(v && v.chiave === chiave && Array.isArray(v.voci) ? new Map(v.voci) : null);
      };
      r.onerror = () => ok(null);
    });
  } catch { return null; } finally { db.close(); }
}

/** Mette i suoni nel cassetto di `gruppo` (sostituisce quelli di un'altra build). Non fallisce mai. */
export async function scrivi(gruppo: string, chiave: string | null, voci: Map<string, Conservato>): Promise<void> {
  if (!chiave) return;
  const db = await apri();
  if (!db) return;
  try {
    await new Promise<void>((ok) => {
      const tr = db.transaction(NEGOZIO, 'readwrite');
      tr.objectStore(NEGOZIO).put({ chiave, voci: [...voci] }, gruppo);
      tr.oncomplete = () => ok();
      tr.onerror = () => ok();
      tr.onabort = () => ok();
    });
  } catch { /* il cassetto è solo una scorciatoia */ } finally { db.close(); }
}
