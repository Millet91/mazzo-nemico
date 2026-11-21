// Regole del nucleo. Tutto è puro: ogni azione prende uno Stato e ne restituisce uno nuovo
// più la lista di Eventi (per le animazioni). Niente tempo reale: il gioco è a turni.
//
// La partita in una frase: il Mazziere gira le sue carte in una fila di FILA caselle che avanza
// verso di te; quando un nemico esce dalla fila ti toglie Vite pari alla sua Forza.
// Ogni turno hai 3 fiche e 5 carte: colpisci, rubi (il nemico diventa una tua carta per sempre),
// sposti. Sopravvivi a 3 mani e vinci.

import { AGGIUNTE, CARTE, CartaId, MAZZO_INIZIALE, NEMICI, NEMICI_MANO_1, NemicoId, TRUCCHI } from './carte';
import { mescola, rand } from './rng';

export const FILA = 5;
export const MANI = 3;
export const FICHE = 3;
export const CARTE_IN_MANO = 5;
export const VITE = 15;
/** Quante carte ha il Mazziere a inizio mano (boss escluso). */
export const DIM_MAZZO = [0, 8, 12, 16];
const POOL: NemicoId[] = ['scagnozzo', 'scagnozzo', 'bruto', 'corazzato', 'lesto', 'spettro', 'barile', 'oste', 'capobanda'];

export interface Nemico {
  uid: number;
  id: NemicoId;
  forza: number;
  smascherato?: boolean;
  veleno?: boolean;
}

export interface Carta {
  uid: number;
  id: CartaId;
}

export type Fase = 'turno' | 'premio' | 'vinto' | 'perso';

export interface Stato {
  seed: number;
  mano: number;
  turno: number;
  vite: number;
  viteMax: number;
  fiche: number;
  inMano: Carta[];
  pesca: Carta[];
  scarti: Carta[];
  /** fila[0] è la casella vicino alla tua porta, fila[FILA-1] quella da cui entrano */
  fila: (Nemico | null)[];
  /** mazzo del Mazziere: [0] è la prossima carta (tu, da baro, la vedi) */
  mazzoN: NemicoId[];
  /** nemici uccisi in questa mano: tornano nel mazzo alla mano dopo */
  morti: NemicoId[];
  parate: number;
  fermi: boolean;
  fase: Fase;
  /** a fine mano: 3 trucchi tra cui scegliere */
  offerta: CartaId[];
  /** cosa aggiunge il Mazziere alla prossima mano (annuncio) */
  annuncio: NemicoId[];
  uid: number;
  stats: { uccisi: number; rubati: NemicoId[]; danniPresi: number; turni: number };
}

export type Evento =
  | { t: 'danno'; uid: number; n: number; immune?: boolean }
  | { t: 'morto'; uid: number; id: NemicoId }
  | { t: 'esplode'; uid: number }
  | { t: 'rubato'; uid: number; id: NemicoId; carta: CartaId }
  | { t: 'rimandato'; uid: number }
  | { t: 'cura'; n: number }
  | { t: 'fiche'; n: number }
  | { t: 'pesca'; n: number }
  | { t: 'buff'; uid: number }
  | { t: 'veleno'; uid: number }
  | { t: 'esce'; uid: number; id: NemicoId; n: number; parato: boolean }
  | { t: 'entra'; uid: number; id: NemicoId }
  | { t: 'parata' }
  | { t: 'fermi' }
  | { t: 'arretra' }
  | { t: 'fineMano' }
  | { t: 'vinto' }
  | { t: 'perso' };

export interface Passo {
  stato: Stato;
  eventi: Evento[];
}

const clone = (s: Stato): Stato => structuredClone(s);

export function nuovaPartita(seed = Date.now() % 2147483647): Stato {
  let s: Stato = {
    seed,
    mano: 1,
    turno: 0,
    vite: VITE,
    viteMax: VITE,
    fiche: FICHE,
    inMano: [],
    pesca: [],
    scarti: [],
    fila: Array(FILA).fill(null),
    mazzoN: [...NEMICI_MANO_1],
    morti: [],
    parate: 0,
    fermi: false,
    fase: 'turno',
    offerta: [],
    annuncio: [],
    uid: 1,
    stats: { uccisi: 0, rubati: [], danniPresi: 0, turni: 0 },
  };
  s.pesca = MAZZO_INIZIALE.map((id) => ({ uid: s.uid++, id }));
  // la prima mano è guidata: Colpo e Ruba arrivano subito
  s = mescolaPesca(s);
  const prima = PRIMA_MANO.map((id) => s.pesca.splice(s.pesca.findIndex((c) => c.id === id), 1)[0]);
  s.pesca.unshift(...prima);
  entra(s, []);
  iniziaTurno(s, []);
  return s;
}

/** La prima mano è sempre questa: insegna a colpire e poi rubare. */
const PRIMA_MANO: CartaId[] = ['colpo', 'ruba', 'colpo', 'spingi', 'colpo'];

function mescolaPesca(s: Stato): Stato {
  const [arr, seed] = mescola(s.pesca, s.seed);
  s.pesca = arr;
  s.seed = seed;
  return s;
}

function pescaCarte(s: Stato, n: number, ev: Evento[]) {
  let pescate = 0;
  for (let i = 0; i < n; i++) {
    if (s.pesca.length === 0) {
      if (s.scarti.length === 0) break;
      s.pesca = s.scarti;
      s.scarti = [];
      mescolaPesca(s);
    }
    s.inMano.push(s.pesca.shift()!);
    pescate++;
  }
  if (pescate) ev.push({ t: 'pesca', n: pescate });
}

function iniziaTurno(s: Stato, ev: Evento[]) {
  s.turno++;
  s.stats.turni++;
  s.fiche = FICHE;
  s.fermi = false;
  pescaCarte(s, CARTE_IN_MANO, ev);
}

/** Forza con cui entra un nemico: il Mazziere si fa più cattivo a ogni mano. */
export const BONUS_MANO = [0, 0, 2, 4];
export function forzaBase(s: Stato, id: NemicoId): number {
  return NEMICI[id].forza + (['mazziere', 'barile', 'spettro', 'corazzato'].includes(id) ? 0 : BONUS_MANO[s.mano]);
}

/** Quante carte gira il Mazziere a fine turno. */
export function ritmo(s: Stato): number {
  if (s.mano === 1 && s.turno < RITMO_LENTO) return 1;
  return RITMO;
}
export const RITMO = 3;
export const RITMO_LENTO = 3;

/** Il Mazziere gira k carte: entrano nelle ultime caselle libere, la prima più avanti. */
function entra(s: Stato, ev: Evento[], k = 1) {
  const libere: number[] = [];
  for (let i = FILA - 1; i >= 0 && libere.length < k; i--) {
    if (s.fila[i]) break;
    libere.unshift(i);
  }
  for (const i of libere) {
    if (s.mazzoN.length === 0) return;
    const id = s.mazzoN.shift()!;
    const n: Nemico = { uid: s.uid++, id, forza: forzaBase(s, id) };
    s.fila[i] = n;
    ev.push({ t: 'entra', uid: n.uid, id });
  }
}

// ---------- domande sulla fila (servono anche alla UI per mostrare cosa puoi fare) ----------

export const abile = (n: Nemico) => !n.smascherato;
export const indice = (s: Stato, uid: number) => s.fila.findIndex((n) => n?.uid === uid);

export function tettoColpo(n: Nemico): number {
  if (!abile(n)) return Infinity;
  if (n.id === 'corazzato') return 1;
  if (n.id === 'mazziere') return 2;
  return Infinity;
}

export const immune = (n: Nemico) => abile(n) && n.id === 'spettro';

export function sogliaFurto(id: CartaId): number {
  return id === 'grandefurto' ? 4 : 2;
}

/** Perché non puoi rubare questo nemico (null = puoi). */
export function bloccoFurto(s: Stato, n: Nemico, carta: CartaId): string | null {
  if (n.id === 'mazziere') return 'Il Mazziere non si ruba';
  const soglia = sogliaFurto(carta);
  if (n.forza > soglia && !(n.id === 'spettro' && abile(n))) return `Forza ${n.forza}: troppo forte (max ${soglia})`;
  const capo = s.fila.find((m) => m && m.uid !== n.uid && m.id === 'capobanda' && abile(m));
  if (capo) return 'Il Capobanda lo protegge';
  return null;
}

/** Danno che quella carta farebbe a quel nemico (per l'anteprima). */
export function dannoPrevisto(n: Nemico, base: number): number {
  if (immune(n)) return 0;
  return Math.min(base, tettoColpo(n));
}

/** Può questa carta essere giocata su questo bersaglio? Restituisce il motivo se no. */
export function nonGiocabile(s: Stato, cartaUid: number, bersaglio?: number): string | null {
  if (s.fase !== 'turno') return 'Non è il tuo turno';
  const carta = s.inMano.find((c) => c.uid === cartaUid);
  if (!carta) return 'Carta non in mano';
  const def = CARTE[carta.id];
  if (def.costo > s.fiche) return 'Fiche insufficienti';
  if (def.bersaglio === 'nessuno') {
    if (carta.id === 'freccia' && !lontano(s)) return 'Nessun nemico in fila';
    if (carta.id === 'spazzata' && !s.fila.some(Boolean)) return 'Nessun nemico in fila';
    return null;
  }
  if (bersaglio === undefined) return 'Scegli un nemico';
  const i = indice(s, bersaglio);
  if (i < 0) return 'Bersaglio non valido';
  const n = s.fila[i]!;
  switch (carta.id) {
    case 'ruba':
    case 'grandefurto':
      return bloccoFurto(s, n, carta.id);
    case 'spingi':
      if (i === FILA - 1 || !s.fila[i + 1]) return 'Nessuno dietro da scambiare';
      return null;
    case 'colpo': case 'mazzata': case 'coltello': case 'randello':
      if (immune(n)) return 'I danni non lo toccano';
      return null;
    case 'rimanda':
      if (n.id === 'mazziere') return 'Il Mazziere non si rimanda';
      return null;
    case 'smaschera':
      if (!NEMICI[n.id].abil || n.smascherato) return 'Non ha abilità';
      return null;
    case 'veleno':
      if (n.veleno) return 'Già avvelenato';
      if (immune(n)) return 'I danni non lo toccano';
      return null;
    default:
      return null;
  }
}

function lontano(s: Stato): Nemico | null {
  for (let i = FILA - 1; i >= 0; i--) if (s.fila[i]) return s.fila[i];
  return null;
}

// ---------- danni ----------

function ferisci(s: Stato, uid: number, n: number, ev: Evento[], areaPerTetto = false) {
  const i = indice(s, uid);
  if (i < 0) return;
  const nem = s.fila[i]!;
  if (immune(nem)) {
    ev.push({ t: 'danno', uid, n: 0, immune: true });
    return;
  }
  const d = areaPerTetto ? n : Math.min(n, tettoColpo(nem));
  nem.forza -= d;
  ev.push({ t: 'danno', uid, n: d });
  if (nem.forza <= 0) uccidi(s, i, ev);
}

function uccidi(s: Stato, i: number, ev: Evento[]) {
  const nem = s.fila[i]!;
  s.fila[i] = null;
  s.stats.uccisi++;
  if (nem.id !== 'mazziere') s.morti.push(nem.id);
  ev.push({ t: 'morto', uid: nem.uid, id: nem.id });
  if (nem.id === 'barile' && abile(nem)) {
    ev.push({ t: 'esplode', uid: nem.uid });
    for (const j of [i - 1, i + 1]) {
      const v = s.fila[j];
      if (v) ferisci(s, v.uid, 3, ev);
    }
  }
}

// ---------- giocare una carta ----------

export function gioca(s0: Stato, cartaUid: number, bersaglio?: number): Passo {
  const motivo = nonGiocabile(s0, cartaUid, bersaglio);
  if (motivo) throw new Error(motivo);
  const s = clone(s0);
  const ev: Evento[] = [];
  const k = s.inMano.findIndex((c) => c.uid === cartaUid);
  const carta = s.inMano.splice(k, 1)[0];
  const def = CARTE[carta.id];
  s.fiche -= def.costo;
  s.scarti.push(carta);
  const i = bersaglio !== undefined ? indice(s, bersaglio) : -1;
  const nem = i >= 0 ? s.fila[i]! : null;

  switch (carta.id) {
    case 'colpo': ferisci(s, nem!.uid, 2, ev); break;
    case 'mazzata': ferisci(s, nem!.uid, 5, ev); break;
    case 'coltello': ferisci(s, nem!.uid, 1, ev); break;
    case 'randello': ferisci(s, nem!.uid, 4, ev); break;
    case 'ruba':
    case 'grandefurto': {
      s.fila[i] = null;
      const nuova = NEMICI[nem!.id].tua!;
      s.inMano.push({ uid: s.uid++, id: nuova });
      s.stats.rubati.push(nem!.id);
      ev.push({ t: 'rubato', uid: nem!.uid, id: nem!.id, carta: nuova });
      break;
    }
    case 'spingi': {
      const tmp = s.fila[i + 1];
      s.fila[i + 1] = s.fila[i];
      s.fila[i] = tmp;
      break;
    }
    case 'rimanda':
      s.fila[i] = null;
      s.mazzoN.unshift(nem!.id);
      ev.push({ t: 'rimandato', uid: nem!.uid });
      break;
    case 'smaschera': nem!.smascherato = true; break;
    case 'brivido': {
      const d = Math.floor(nem!.forza / 2);
      nem!.forza -= d;
      ev.push({ t: 'danno', uid: nem!.uid, n: d });
      break;
    }
    case 'veleno': nem!.veleno = true; ev.push({ t: 'veleno', uid: nem!.uid }); break;
    case 'spazzata':
      for (const v of s.fila.filter(Boolean).map((n) => n!.uid)) ferisci(s, v, 1, ev);
      break;
    case 'freccia': ferisci(s, lontano(s)!.uid, 4, ev); break;
    case 'fermi': s.fermi = true; ev.push({ t: 'fermi' }); break;
    case 'fondo': s.fiche += 2; ev.push({ t: 'fiche', n: 2 }); break;
    case 'sbircia': case 'scatto': pescaCarte(s, 2, ev); break;
    case 'parata': case 'scudo': s.parate++; ev.push({ t: 'parata' }); break;
    case 'brindisi': {
      const n = Math.min(3, s.viteMax - s.vite);
      s.vite += n;
      ev.push({ t: 'cura', n });
      break;
    }
    case 'esplosivo': {
      const vicini = [s.fila[i - 1], s.fila[i + 1]].filter(Boolean).map((n) => n!.uid);
      ferisci(s, nem!.uid, 2, ev);
      for (const v of vicini) ferisci(s, v, 2, ev);
      break;
    }
    case 'ritirata':
    case 'comando': {
      // chi è nell'ultima casella torna in cima al mazzo del Mazziere
      const ultimo = s.fila[FILA - 1];
      if (ultimo) {
        s.mazzoN.unshift(ultimo.id);
        ev.push({ t: 'rimandato', uid: ultimo.uid });
      }
      for (let j = FILA - 1; j > 0; j--) s.fila[j] = s.fila[j - 1];
      s.fila[0] = null;
      ev.push({ t: 'arretra' });
      break;
    }
  }
  controllaFineMano(s, ev);
  return { stato: s, eventi: ev };
}

// ---------- fine turno: la fila si muove ----------

/** Muove la fila di un passo (Lesto: due). Chi esce dalla porta ti colpisce. */
function muovi(s: Stato, ev: Evento[]) {
  for (let i = 0; i < FILA; i++) {
    const n = s.fila[i];
    if (!n) continue;
    const passiN = n.id === 'lesto' && abile(n) ? 2 : 1;
    let pos = i;
    for (let p = 0; p < passiN; p++) {
      const dest = pos - 1;
      if (dest < 0) {
        s.fila[pos] = null;
        const danno = dannoUscita(n);
        const parato = s.parate > 0;
        if (parato) s.parate--;
        else { s.vite -= danno; s.stats.danniPresi += danno; }
        if (n.id !== 'mazziere') s.morti.push(n.id);
        ev.push({ t: 'esce', uid: n.uid, id: n.id, n: danno, parato });
        break;
      }
      if (s.fila[dest]) break;
      s.fila[dest] = n;
      s.fila[pos] = null;
      pos = dest;
    }
  }
}

export function dannoUscita(n: Nemico): number {
  if (n.id === 'barile' && abile(n)) return 5;
  return Math.max(0, n.forza);
}

/** Anteprima: cosa succede se finisci il turno adesso. */
export function anteprima(s: Stato): { danno: number; escono: Set<number> } {
  const escono = new Set<number>();
  if (s.fermi) return { danno: 0, escono };
  const c = clone(s);
  // l'Oste agisce prima del movimento
  abilita(c, []);
  const ev: Evento[] = [];
  const prima = c.vite;
  muovi(c, ev);
  for (const e of ev) if (e.t === 'esce') escono.add(e.uid);
  return { danno: prima - c.vite, escono };
}

function abilita(s: Stato, ev: Evento[]) {
  for (let i = 0; i < FILA; i++) {
    const n = s.fila[i];
    if (n && n.id === 'oste' && abile(n)) {
      for (const j of [i - 1, i + 1]) {
        const v = s.fila[j];
        if (v) { v.forza++; ev.push({ t: 'buff', uid: v.uid }); }
      }
    }
  }
  for (const uid of s.fila.filter(Boolean).map((n) => n!.uid)) {
    const k = indice(s, uid);
    const v = s.fila[k];
    if (v?.veleno && !immune(v)) {
      v.forza -= 1;
      ev.push({ t: 'danno', uid: v.uid, n: 1 });
      if (v.forza <= 0) uccidi(s, k, ev);
    }
  }
}

/** Fine turno in passi separati, così la UI può animarli uno alla volta. */
export function fineTurno(s0: Stato): Passo[] {
  if (s0.fase !== 'turno') throw new Error('Non è il tuo turno');
  const passi: Passo[] = [];
  let s = clone(s0);
  const push = (ev: Evento[]) => {
    passi.push({ stato: s, eventi: ev });
    s = clone(s);
  };

  // 1. scarta la mano
  s.scarti.push(...s.inMano);
  s.inMano = [];
  push([]);

  // 2. abilità: l'Oste offre da bere, il veleno lavora
  const ev1: Evento[] = [];
  abilita(s, ev1);
  if (ev1.length) push(ev1);

  // 3. la fila avanza (a meno di Fermi tutti)
  if (!s.fermi) {
    const ev2: Evento[] = [];
    muovi(s, ev2);
    push(ev2);
    if (s.vite <= 0) {
      s.vite = 0;
      s.fase = 'perso';
      passi.push({ stato: s, eventi: [{ t: 'perso' }] });
      return passi;
    }
  } else {
    push([{ t: 'fermi' }]);
  }

  // 4. il Mazziere gira la prossima carta
  const ev3: Evento[] = [];
  entra(s, ev3, ritmo(s));
  if (ev3.length) push(ev3);

  // 5. fine mano o nuovo turno
  const ev4: Evento[] = [];
  controllaFineMano(s, ev4);
  if (s.fase === 'turno') iniziaTurno(s, ev4);
  passi.push({ stato: s, eventi: ev4 });
  return passi;
}

function controllaFineMano(s: Stato, ev: Evento[]) {
  if (s.fase !== 'turno') return;
  if (s.mazzoN.length > 0 || s.fila.some(Boolean)) return;
  if (s.mano >= MANI) {
    s.fase = 'vinto';
    ev.push({ t: 'vinto' });
    return;
  }
  s.fase = 'premio';
  s.scarti.push(...s.inMano);
  s.inMano = [];
  const [offerta, seed] = mescola(TRUCCHI, s.seed);
  s.seed = seed;
  s.offerta = offerta.slice(0, 3);
  // il Mazziere riporta il mazzo alla dimensione della prossima mano: prima le novità, poi a caso
  const giaSuoi = s.morti.length + s.mazzoN.length;
  const mancano = Math.max(AGGIUNTE[s.mano + 1].length, DIM_MAZZO[s.mano + 1] - giaSuoi);
  const annuncio: NemicoId[] = [];
  let giro: NemicoId[] = POOL;
  for (let i = 0; i < mancano; i++) {
    if (i < AGGIUNTE[s.mano + 1].length) annuncio.push(AGGIUNTE[s.mano + 1][i]);
    else {
      if (i === AGGIUNTE[s.mano + 1].length) {
        const [m, seed] = mescola(POOL, s.seed);
        s.seed = seed;
        giro = m;
      }
      annuncio.push(giro[(i - AGGIUNTE[s.mano + 1].length) % giro.length]);
    }
  }
  if (s.mano + 1 === MANI) annuncio.push('mazziere');
  s.annuncio = annuncio;
  ev.push({ t: 'fineMano' });
}

/** Scegli il premio a fine mano (una delle 3 carte, oppure 'riposo' per +6 Vite). */
export function scegli(s0: Stato, scelta: CartaId | 'riposo'): Stato {
  if (s0.fase !== 'premio') throw new Error('Niente da scegliere');
  const s = clone(s0);
  if (scelta === 'riposo') s.vite = Math.min(s.viteMax, s.vite + 6);
  else {
    if (!s.offerta.includes(scelta)) throw new Error('Carta non offerta');
    s.scarti.push({ uid: s.uid++, id: scelta });
  }
  // nuova mano: il Mazziere rimescola i suoi morti, aggiunge le nuove carte, il boss va in fondo
  s.mano++;
  const boss = s.annuncio.includes('mazziere');
  const nuovi = [...s.morti, ...s.mazzoN, ...s.annuncio.filter((id) => id !== 'mazziere')];
  const [mazzo, seed] = mescola(nuovi, s.seed);
  s.seed = seed;
  s.mazzoN = boss ? [...mazzo, 'mazziere'] : mazzo;
  s.morti = [];
  s.annuncio = [];
  s.offerta = [];
  s.fase = 'turno';
  s.parate = 0;
  s.pesca = [...s.pesca, ...s.scarti];
  s.scarti = [];
  mescolaPesca(s);
  s.turno = 0;
  entra(s, []);
  iniziaTurno(s, []);
  return s;
}

/** Il tuo mazzo completo (per la schermata premio). */
export const tuttoIlMazzo = (s: Stato): Carta[] => [...s.inMano, ...s.pesca, ...s.scarti];

export { rand };
