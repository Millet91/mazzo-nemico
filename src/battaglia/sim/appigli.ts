// Scale e liane (appigli): segmenti verticali fuori dalla maschera, a cui il pirata attivo si aggrappa col
// comando `arrampica` (regole in docs: /mnt/project-files/design/comandi/scale-e-liane.md). Appeso non ha gravità e
// può sparare; sale e scende a BIL.movimento.scalaVel (90 px/s, "in un tocco": il comando resta finché arriva in cima o in fondo); destra e sinistra da appeso non fanno niente. Un'esplosione stacca chi spinge e taglia il tratto di appiglio nel raggio.

import type { Appiglio, EventoBattaglia, MappaGenerata, Pirata, StatoBattaglia, Terreno } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { capsulaUrta, MEZZA_ALTEZZA_PIRATA } from './terreno';

const A = BIL.arrampicata;
/** tolleranza in px sotto la cima per aggrapparsi stando in piedi sulla piattaforma */
const MARGINE_CIMA = 2;

/** Appigli della mappa: copie con un id nuovo, scartati quelli più corti del pezzo minimo. */
export function creaAppigli(s: StatoBattaglia, appigli: MappaGenerata['appigli']): void {
  for (const a of appigli ?? []) {
    const yAlto = Math.min(a.yAlto, a.yBasso), yBasso = Math.max(a.yAlto, a.yBasso);
    if (yBasso - yAlto < A.pezzoMinimo) continue;
    s.appigli.push({ id: s.prossimoId++, tipo: a.tipo, x: a.x, yAlto, yBasso });
  }
}

/** Il pirata in (x, y) può tenersi a questo appiglio? (vicino all'asse e con la capsula lungo il segmento) */
export function aPortata(a: Appiglio, x: number, y: number, presa: number = A.presa): boolean {
  if (Math.abs(a.x - x) > presa) return false;
  return y + MEZZA_ALTEZZA_PIRATA >= a.yAlto - MARGINE_CIMA && y <= a.yBasso;
}

/** Appiglio più vicino a portata del pirata (a parità, id più basso), o undefined. */
export function appiglioVicino(s: StatoBattaglia, x: number, y: number): Appiglio | undefined {
  let migliore: Appiglio | undefined;
  for (const a of s.appigli) {
    if (!aPortata(a, x, y)) continue;
    if (!migliore || Math.abs(a.x - x) < Math.abs(migliore.x - x)) migliore = a;
  }
  return migliore;
}

/** Aggrappa il pirata all'appiglio (lo usa anche il Balzo "afferra"). */
export function aggrappa(s: StatoBattaglia, p: Pirata, a: Appiglio, eventi: EventoBattaglia[]): void {
  // si avvicina all'asse quanto può senza entrare nel terreno
  const passo = a.x > p.x ? 1 : -1;
  for (let k = Math.floor(Math.abs(a.x - p.x)); k >= 0; k--) {
    const nx = k === Math.floor(Math.abs(a.x - p.x)) ? a.x : p.x + passo * k;
    if (!capsulaUrta(s.terreno, nx, p.y)) { p.x = nx; break; }
  }
  p.appeso = a.id;
  p.aTerra = false;
  p.vx = 0; p.vy = 0;
  p.yInizioCaduta = p.y;
  eventi.push({ t: 'aggrappato', pirata: p.id, appiglio: a.id });
}

/** In piedi sul piano in cima all'appiglio (piedi vicini alla cima, asse entro il passaggio)? Da qui "scendi" aggrappa. */
export function sulPianoInCima(a: Appiglio, p: Pick<Pirata, 'x' | 'y' | 'aTerra'>): boolean {
  if (!p.aTerra) return false;
  const piedi = p.y + MEZZA_ALTEZZA_PIRATA;
  return Math.abs(a.x - p.x) <= A.passaggioCima && Math.abs(piedi - a.yAlto) <= A.piediCima;
}

/** Appiglio da prendere con "scendi" stando sul piano in cima (il più vicino; a parità, id più basso), o undefined. */
export function appiglioSotto(s: Pick<StatoBattaglia, 'appigli'>, p: Pick<Pirata, 'x' | 'y' | 'aTerra'>): Appiglio | undefined {
  let migliore: Appiglio | undefined;
  for (const a of s.appigli) {
    if (!sulPianoInCima(a, p)) continue;
    if (!migliore || Math.abs(a.x - p.x) < Math.abs(migliore.x - p.x)) migliore = a;
  }
  return migliore;
}

/**
 * Un passo verso l'asse dell'appiglio (al più `passo` px), se la capsula ci sta; in cima può anche alzarsi di un
 * gradino per staccarsi dal labbro del piano. Restituisce false se il terreno lo ferma.
 */
function versoAsse(t: Terreno, p: Pirata, a: Appiglio, passo: number, alza: boolean): boolean {
  const d = a.x - p.x;
  if (d === 0) return true;
  const nx = Math.abs(d) <= passo ? a.x : p.x + (d > 0 ? passo : -passo);
  if (!capsulaUrta(t, nx, p.y)) { p.x = nx; return true; }
  if (alza) for (let k = 1; k <= BIL.pirata.gradinoMax; k++) if (!capsulaUrta(t, nx, p.y - k)) { p.x = nx; p.y -= k; return true; }
  return false;
}

/** Lascia l'appiglio: a terra se ha il suolo sotto i piedi, altrimenti comincia a cadere da qui. */
export function lascia(t: Terreno, p: Pirata, eventi: EventoBattaglia[]): void {
  if (p.appeso < 0) return;
  p.appeso = -1;
  p.vx = 0; p.vy = 0;
  p.yInizioCaduta = p.y;
  p.aTerra = capsulaUrta(t, p.x, p.y + 1);
  eventi.push({ t: 'staccato', pirata: p.id });
}

/** Cerca il suolo appena sotto (fino a un gradino): se c'è ci appoggia il pirata e restituisce true. */
function appoggiaSeSuolo(t: Terreno, p: Pirata): boolean {
  for (let k = 1; k <= BIL.pirata.gradinoMax + 1; k++) {
    if (capsulaUrta(t, p.x, p.y + k)) { p.y += k - 1; return true; }
  }
  return false;
}

/** In cima: da che lato c'è il piano (entro presa + mezza larghezza) e a quanti px. null = nessun piano. */
function pianoAccanto(t: Terreno, p: Pirata): { lato: -1 | 1; px: number } | null {
  const max = A.passaggioCima;
  for (const lato of [p.verso, (-p.verso) as -1 | 1]) {
    for (let k = 1; k <= max; k++) {
      const nx = p.x + lato * k;
      if (capsulaUrta(t, nx, p.y)) break; // muro: da questo lato non si passa
      if (capsulaUrta(t, nx, p.y + 1)) return { lato, px: k };
    }
  }
  return null;
}


/**
 * Un tick per il pirata appeso (design/comandi/scale-e-liane.md). `su` = arrampicata: −1 su, 1 giù, 0 ferma.
 * Lungo l'appiglio il pirata si porta sull'asse (1 px a tick) appena il terreno lo permette. In cima, se accanto
 * c'è un piano, ci passa da solo a passo di camminata; preso dall'alto con "scendi", torna prima sull'asse e poi
 * scende. In fondo, se tocca terra, ci appoggia i piedi; in fondo sopra il vuoto, scendendo ancora, si lascia
 * andare. Restituisce false se non è più appeso.
 */
export function aggiornaAppeso(s: StatoBattaglia, p: Pirata, su: -1 | 0 | 1, eventi: EventoBattaglia[]): boolean {
  const t = s.terreno;
  const a = s.appigli.find((x) => x.id === p.appeso);
  const cima = a ? a.yAlto - MEZZA_ALTEZZA_PIRATA : 0; // centro del pirata con i piedi alla cima
  // in cima (piedi alla cima, o sul piano accanto) la presa si allarga: serve per passare dal piano all'asse e viceversa
  const inCima = a !== undefined && p.y <= cima + A.piediCima;
  if (!a || !aPortata(a, p.x, p.y, inCima ? A.passaggioCima : A.presa)) { lascia(t, p, eventi); return false; }
  p.vx = 0; p.vy = 0;
  if (su === -1) {
    if (p.y > cima) versoAsse(t, p, a, 1, false);
    const ny = Math.max(cima, p.y - BIL.movimento.scalaVel);
    if (ny < p.y && !capsulaUrta(t, p.x, ny)) p.y = ny;
    if (p.y <= cima) {
      if (capsulaUrta(t, p.x, p.y + 1)) { lascia(t, p, eventi); return false; }
      const piano = pianoAccanto(t, p);
      if (piano) {
        p.x += piano.lato * Math.min(BIL.pirata.camminata, piano.px);
        if (capsulaUrta(t, p.x, p.y + 1)) { lascia(t, p, eventi); return false; }
      }
    }
  } else if (su === 1) {
    if (p.x !== a.x && inCima) {
      // preso dal piano in cima: prima torna sull'asse a passo di camminata, senza scendere
      if (!versoAsse(t, p, a, BIL.pirata.camminata, true)) { lascia(t, p, eventi); return false; }
      p.yInizioCaduta = p.y;
      return true;
    }
    versoAsse(t, p, a, 1, false);
    const fondo = a.yBasso - MEZZA_ALTEZZA_PIRATA;
    if (p.y >= fondo) { lascia(t, p, eventi); return false; } // in fondo: si lascia (o è già a terra)
    const ny = Math.min(fondo, p.y + BIL.movimento.scalaVel);
    if (capsulaUrta(t, p.x, ny)) { appoggiaSeSuolo(t, p); lascia(t, p, eventi); return false; }
    p.y = ny;
  }
  p.yInizioCaduta = p.y;
  return true;
}

/**
 * Comando arrampica per il pirata attivo non appeso: si aggrappa all'appiglio a portata, se c'è e se nella
 * direzione chiesta c'è ancora appiglio (in cima non si riaggrappa salendo, in fondo non si riaggrappa scendendo).
 * Con "scendi" dal piano in cima prende l'appiglio che comincia lì accanto (entro `passaggioCima` px dall'asse).
 */
export function provaAggrappo(s: StatoBattaglia, p: Pirata, su: -1 | 1, eventi: EventoBattaglia[]): boolean {
  if (su === 1) {
    const sotto = appiglioSotto(s, p);
    if (sotto) {
      // resta dov'è, appeso: aggiornaAppeso lo porta sull'asse e poi giù
      p.appeso = sotto.id;
      p.aTerra = false;
      p.vx = 0; p.vy = 0;
      p.yInizioCaduta = p.y;
      p.verso = sotto.x >= p.x ? 1 : -1;
      eventi.push({ t: 'aggrappato', pirata: p.id, appiglio: sotto.id });
      return true;
    }
  }
  const a = appiglioVicino(s, p.x, p.y);
  if (!a) return false;
  if (su === -1 && p.y - MEZZA_ALTEZZA_PIRATA <= a.yAlto) return false;
  if (su === 1 && p.y + MEZZA_ALTEZZA_PIRATA >= a.yBasso) return false;
  aggrappa(s, p, a, eventi);
  return true;
}

/**
 * Esplosione in (x, y) di raggio r: toglie da ogni appiglio il tratto dentro il cerchio. Restano 0, 1 o 2 pezzi
 * (il pezzo in alto tiene l'id, quello in basso ne prende uno nuovo); i pezzi più corti di pezzoMinimo spariscono.
 * Chi era appeso al pezzo in basso passa al nuovo id; chi era sul tratto tolto cade al tick dopo.
 */
export function tagliaAppigli(s: StatoBattaglia, x: number, y: number, r: number, eventi: EventoBattaglia[]): void {
  if (s.appigli.length === 0) return;
  const restano: Appiglio[] = [];
  for (const a of s.appigli) {
    const dx = a.x - x;
    if (dx * dx >= r * r) { restano.push(a); continue; }
    const h = Math.sqrt(r * r - dx * dx);
    const y0 = y - h, y1 = y + h;
    if (y1 <= a.yAlto || y0 >= a.yBasso) { restano.push(a); continue; }
    eventi.push({ t: 'appiglioRotto', appiglio: a.id, x: a.x, yAlto: Math.max(a.yAlto, y0), yBasso: Math.min(a.yBasso, y1) });
    let idSopra = -1;
    if (y0 - a.yAlto >= A.pezzoMinimo) {
      restano.push({ id: a.id, tipo: a.tipo, x: a.x, yAlto: a.yAlto, yBasso: y0 });
      idSopra = a.id;
    }
    if (a.yBasso - y1 >= A.pezzoMinimo) {
      const sotto: Appiglio = { id: idSopra < 0 ? a.id : s.prossimoId++, tipo: a.tipo, x: a.x, yAlto: y1, yBasso: a.yBasso };
      restano.push(sotto);
      for (const p of s.pirati) if (p.appeso === a.id && p.y + MEZZA_ALTEZZA_PIRATA > y1) p.appeso = sotto.id;
    }
  }
  s.appigli = restano;
}
