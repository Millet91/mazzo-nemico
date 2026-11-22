// Preferenze dell'HUD salvate sul telefono (Capacitor Preferences). Sono separate da piattaforma/impostazioni
// per non toccare il tipo `Impostazioni` (non è una cartella dell'HUD); si possono unire in M2.
// Il volume non sta più qui: i due cursori (musica, effetti) sono in src/audio/preferenze.ts.
import { signal } from '@preact/signals';
import { Preferences } from '@capacitor/preferences';
import { PIRATI_PREDEFINITI } from './battaglia/logica';
import { bus } from '../core/bus';

const CHIAVE = 'hud';
interface PreferenzeHud { mancini: boolean; comandiClassici: boolean; pirati: [number, number]; calaVista?: boolean; zoomMira?: boolean; mirinoUsato?: boolean }

/** HUD specchiato per i mancini. */
export const mancini = signal(false);
/** tasti ◀ ▶ SALTA ▲ ▼ FUOCO di prima al posto del mirino da trascinare */
export const comandiClassici = signal(false);
/** mentre si mira la visuale si allarga da sola (scelta del proprietario 21/11/2026); il valore vive in bus.zoomAutomaticoMira */
export const zoomMira = bus.zoomAutomaticoMira;
/** il giocatore ha già trascinato il mirino almeno una volta: il suggerimento non serve più */
export const mirinoUsato = signal(false);
/** pirati per lato nella Schermaglia (giocatore, Marina) */
export const piratiSchermaglia = signal<[number, number]>([PIRATI_PREDEFINITI, PIRATI_PREDEFINITI]);

/** Cala Pappagallo nel menu: dalla Fase 2 la v3 (la Cala di prima resta solo nei dati) */
export const CALA = 'cala-pappagallo-v3';
/** mappa della Schermaglia: '' = generata dal seme, altrimenti l'id di una mappa fatta a mano (battaglia/mappe).
 *  Lead design 21/11/2026: la prima Schermaglia è Cala Pappagallo, poi la scelta predefinita torna "Isola a caso". */
export const mappaSchermaglia = signal<string>(CALA);
/** Cala Pappagallo già giocata almeno una volta su questo telefono */
let calaVista = false;

/** Avvisato quando cambia la scelta dei comandi. */
const ascoltatoriClassici = new Set<(v: boolean) => void>();
export function suComandiClassici(f: (v: boolean) => void): () => void {
  ascoltatoriClassici.add(f);
  return () => ascoltatoriClassici.delete(f);
}

export async function caricaPreferenzeHud(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: CHIAVE });
    const p = value ? (JSON.parse(value) as Partial<PreferenzeHud>) : {};
    mancini.value = !!p.mancini;
    comandiClassici.value = !!p.comandiClassici;
    zoomMira.value = p.zoomMira !== false;
    mirinoUsato.value = !!p.mirinoUsato;
    calaVista = !!p.calaVista;
    if (calaVista) mappaSchermaglia.value = '';
    if (Array.isArray(p.pirati) && p.pirati.length === 2) piratiSchermaglia.value = [Number(p.pirati[0]) || 3, Number(p.pirati[1]) || 3];
  } catch { /* restano i valori predefiniti */ }
  for (const f of ascoltatoriClassici) f(comandiClassici.value);
}

async function salva(): Promise<void> {
  const p: PreferenzeHud = { mancini: mancini.value, comandiClassici: comandiClassici.value, pirati: piratiSchermaglia.value, calaVista, zoomMira: zoomMira.value, mirinoUsato: mirinoUsato.value };
  try { await Preferences.set({ key: CHIAVE, value: JSON.stringify(p) }); } catch { /* non bloccare */ }
}

export async function impostaMancini(v: boolean): Promise<void> { mancini.value = v; await salva(); }

export async function impostaComandiClassici(v: boolean): Promise<void> {
  comandiClassici.value = v;
  for (const f of ascoltatoriClassici) f(v);
  await salva();
}

export async function segnaMirinoUsato(): Promise<void> { mirinoUsato.value = true; await salva(); }

export async function impostaZoomMira(v: boolean): Promise<void> { zoomMira.value = v; await salva(); }

export async function impostaPiratiSchermaglia(p: [number, number]): Promise<void> {
  piratiSchermaglia.value = p;
  await salva();
}

/** Dopo la prima battaglia su Cala Pappagallo la scelta predefinita diventa "Isola a caso" (resta selezionabile). */
export async function segnaMappaGiocata(id: string): Promise<void> {
  if (calaVista || id !== CALA) return;
  calaVista = true;
  mappaSchermaglia.value = '';
  await salva();
}
