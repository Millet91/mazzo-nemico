// Cervello dell'IA di battaglia (01 §8, livello Mozzo di M1). Codice puro e deterministico.
//
// Come pensa, in breve:
// 1. ordina i nemici vivi per priorità (pochi PV, vicini, vicini al mare);
// 2. prepara le "linee di tiro": sciabola sui nemici a contatto, pistola su quelli a portata, cannone e
//    granata su ogni bersaglio con alcuni angoli; la potenza iniziale viene dalla formula della gittata;
//    poi corregge la potenza guardando dove è caduto il colpo simulato (budget in SIMULAZIONI, non in ms);
// 3. dà un punteggio a ogni tiro (01 §8 / BIL.ia.punteggio) e sceglie a caso tra i migliori;
// 4. aggiunge l'errore umano (uniforme, ±erroreGradi sull'angolo, ±errorePotenza sulla gittata) e controlla che il tiro sbagliato
//    non diventi un suicidio (simulazioni di riserva);
// 5. dopo lo sparo fugge lontano dall'impatto o, se nessun tiro valeva la soglia, verso un riparo.
//
// Il vento è considerato al `vento` del livello (Mozzo 50%): le simulazioni girano su una vista dello stato
// con il vento ridotto. La vista è una copia superficiale: la maschera non si copia e lo stato non si tocca.

import type { EsitoColpo, IdArma, LivelloIa, PianoColpo, PianoIa, Pirata, Punto, StatoBattaglia } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { ARMA } from '../../contenuti/armi';
import { casuale } from '../../core/rng';
import { coseno, normalizza, seno } from '../../core/trig';
import { passiSicuri, riparato } from './terreno';

/** La funzione che prova un tiro: in gioco è `simulaColpo` della sim; nei test si può contare o sostituire. */
export type Simulatore = (s: StatoBattaglia, piano: PianoColpo) => EsitoColpo;

type ParLivello = (typeof BIL.ia.livelli)[LivelloIa];

interface Prova {
  colpo: PianoColpo;
  esito: EsitoColpo;
  punti: number;
}

/** Una linea di tiro balistica (cannone o granata) verso un bersaglio, con un angolo fisso. */
interface Linea {
  arma: IdArma;
  /** punto da colpire: un nemico o un barile di polvere vicino ai nemici */
  bersaglio: Punto;
  /** angolo assoluto in mezzi gradi */
  mezziGradi: number;
  dir: -1 | 1;
  potenza: number;
  miccia?: number;
  prove: number;
  ultima?: Prova;
  finita: boolean;
}

/** Quante simulazioni tenere da parte per controllare il tiro con l'errore umano. */
const RISERVA_ERRORE = 4;
/** Angoli di alzo (gradi sopra l'orizzontale) provati per arma, dal più promettente. */
const ALZI: Partial<Record<IdArma, number[]>> = {
  cannone: [45, 30, 60, 20, 70, 38, 52],
  granata: [40, 60, 25, 50],
};
/** La fuga dura BIL.turno.fugaTick: il tratto di strada da controllare. */
const PASSI_FUGA = Math.ceil(BIL.turno.fugaTick * BIL.pirata.camminata);
/** Oltre questa distanza dall'impatto non serve scappare. */
const DISTANZA_FUGA = 200;

export function decidiCon(s: StatoBattaglia, livello: LivelloIa, simula: Simulatore): PianoIa {
  const par = BIL.ia.livelli[livello];
  const rng = { rng: (s.rng ^ s.turno.numero) >>> 0 };
  const io = s.pirati.find((p) => p.id === s.turno.pirata && p.stato === 'vivo');
  const versoNemico = (dir: number) => (dir >= 0 ? 90 : 270); // 45° nel verso indicato
  if (!io) return { arma: 'cannone', mezziGradi: versoNemico(1), potenza: BIL.mira.potenzaIniziale, fuga: 0, punteggio: 0 };

  // un pirata a 0 PV resta 'vivo' fino alla lapide (sim di A): non è più un bersaglio
  const nemici = s.pirati.filter((p) => p.squadra !== io.squadra && p.stato === 'vivo' && p.vita > 0);
  if (nemici.length === 0) return { arma: 'cannone', mezziGradi: versoNemico(io.verso), potenza: BIL.mira.potenzaIniziale, fuga: 0, punteggio: 0 };

  const armi = armiUsabili(s, io.squadra, par);
  const vista: StatoBattaglia = par.vento === 1 ? s : { ...s, vento: s.vento * par.vento };
  const riserva = Math.min(RISERVA_ERRORE, Math.floor(par.simulazioni / 10));
  let rimasti = par.simulazioni - riserva;
  const prove: Prova[] = [];
  const prova = (colpo: PianoColpo): Prova => {
    rimasti--;
    const esito = simula(vista, colpo);
    const p: Prova = { colpo, esito, punti: punteggio(s, io, esito) };
    prove.push(p);
    return p;
  };

  const bersagli = ordinaBersagli(s, io, nemici);

  // ── 1. mischia e pistola: un tiro per nemico a portata ──
  for (const b of bersagli) {
    if (rimasti <= 0) break;
    const dx = b.x - io.x, dy = b.y - io.y;
    const dir: -1 | 1 = dx >= 0 ? 1 : -1;
    if (armi.includes('sciabola') && Math.abs(dx) <= (ARMA.sciabola.portata ?? 30) + BIL.pirata.capsulaLarghezza && Math.abs(dy) <= BIL.pirata.capsulaAltezza)
      prova({ pirata: io.id, arma: 'sciabola', mezziGradi: dir > 0 ? 0 : 360, potenza: 0 });
    if (rimasti <= 0) break;
    if (armi.includes('pistola') && dx * dx + dy * dy <= (ARMA.pistola.portata ?? 500) ** 2)
      prova({ pirata: io.id, arma: 'pistola', mezziGradi: angoloVerso(dx, -dy), potenza: 0 });
  }

  // ── 2. linee balistiche: prima un tiro per linea (al massimo metà del budget), poi le correzioni ──
  const linee: Linea[] = [];
  const maxLinee = Math.max(1, Math.floor(rimasti / 2));
  const balistiche = armi.filter((a) => ALZI[a]);
  const giri = Math.max(0, ...balistiche.map((a) => ALZI[a]!.length));
  // prima i barili di polvere che scoppierebbero sui nemici (e non sui nostri), poi i nemici
  const mire: Punto[] = [...bariliUtili(s, io, nemici), ...bersagli];
  for (let i = 0; i < giri && linee.length < maxLinee; i++)
    for (const b of mire) for (const arma of balistiche) {
      const alzo = ALZI[arma]![i];
      if (alzo === undefined || linee.length >= maxLinee) continue;
      const l = nuovaLinea(s, io, b, arma, alzo);
      if (l) linee.push(l);
    }

  for (const l of linee) {
    if (rimasti <= 0) break;
    l.ultima = prova(colpoDi(io, l));
    l.prove++;
  }
  while (rimasti > 0) {
    const l = prossimaDaCorreggere(linee);
    if (!l) break;
    if (!correggi(io, l)) { l.finita = true; continue; }
    l.ultima = prova(colpoDi(io, l));
    l.prove++;
  }

  // ── 3. scelta: a caso tra i migliori che superano la soglia ──
  const soglia = BIL.ia.punteggio.sogliaMinima;
  const ordinate = prove.slice().sort((a, b) => b.punti - a.punti); // sort stabile: a parità vince l'ordine di prova
  let scelta: Prova | undefined;
  const sicure = ordinate.filter((p) => !suicida(io, p.esito));
  const buone = sicure.filter((p) => p.punti > soglia).slice(0, par.sceltaTraMigliori);
  if (buone.length) scelta = buone[Math.floor(casuale(rng) * buone.length)];
  else scelta = sicure[0] ?? ordinate[0];
  const copertura = !buone.length;

  if (!scelta) {
    // nessuna simulazione possibile (budget nullo): tiro prudente, alto e verso il nemico più vicino
    const b = bersagli[0];
    return { arma: armi.includes('cannone') ? 'cannone' : armi[0], mezziGradi: versoNemico(b.x - io.x), potenza: BIL.mira.potenzaIniziale, fuga: 0, punteggio: 0 };
  }

  // ── 4. errore umano, controllato con le simulazioni di riserva ──
  let finale = scelta.colpo;
  let impatto = scelta.esito.impatto;
  for (let tentativo = 0; tentativo < Math.max(1, riserva); tentativo++) {
    const sbagliato = conErrore(scelta.colpo, par, rng);
    if (riserva === 0) { finale = sbagliato; break; }
    const esito = simula(vista, sbagliato);
    if (!suicida(io, esito)) { finale = sbagliato; impatto = esito.impatto; break; }
  }

  // ── 5. fuga dopo lo sparo ──
  let fuga: -1 | 0 | 1 = 0;
  if (impatto && Math.abs(impatto.x - io.x) < DISTANZA_FUGA) {
    const via: -1 | 1 = impatto.x < io.x ? 1 : -1;
    if (passiSicuri(s, io, via, PASSI_FUGA) >= PASSI_FUGA) fuga = via;
  } else if (copertura) {
    fuga = versoRiparo(s, io, nemici);
  }

  return {
    arma: finale.arma,
    mezziGradi: finale.mezziGradi,
    potenza: finale.potenza,
    ...(finale.miccia !== undefined ? { miccia: finale.miccia } : {}),
    fuga,
    punteggio: scelta.punti,
  };
}

// ─── punteggio (01 §8) ───────────────────────────────────────────────────────────────────────────

/**
 * Danno ai nemici (al massimo i PV che hanno) + uccisioni + annegamenti − danno ai compagni − danno a sé
 * − penalità se il proprio pirata va in mare o muore (un suicidio vale come finire in mare).
 */
export function punteggio(s: StatoBattaglia, io: Pirata, e: EsitoColpo): number {
  const P = BIL.ia.punteggio;
  let punti = 0;
  for (const p of s.pirati) {
    if (p.stato !== 'vivo' || p.vita <= 0) continue;
    const danno = Math.min(e.danni[p.id] ?? 0, p.vita);
    const annegato = e.annegati.includes(p.id);
    const ucciso = e.uccisi.includes(p.id);
    if (p.id === io.id) {
      punti += P.dannoSe * danno;
      if (annegato || ucciso) punti += P.seInMare;
    } else if (p.squadra === io.squadra) {
      punti += P.dannoAmico * danno;
      if (annegato || ucciso) punti -= P.uccisione;
    } else {
      punti += danno;
      if (annegato) punti += P.annegamento;
      else if (ucciso) punti += P.uccisione;
    }
  }
  return punti;
}

function suicida(io: Pirata, e: EsitoColpo): boolean {
  return e.uccisi.includes(io.id) || e.annegati.includes(io.id) || (e.danni[io.id] ?? 0) >= io.vita / 2;
}

// ─── armi e bersagli ─────────────────────────────────────────────────────────────────────────────

/**
 * Armi che il livello può usare e che la squadra ha davvero (munizioni −1 = infinite o > 0).
 * Una lista vuota nel livello (Nostromo, Capitano: da definire in M2) vuol dire "tutte quelle disponibili".
 */
export function armiUsabili(s: StatoBattaglia, squadra: 0 | 1, par: ParLivello): IdArma[] {
  const mun = s.squadre[squadra].munizioni;
  const disponibili = (Object.keys(mun) as IdArma[]).filter((a) => mun[a] !== undefined && mun[a] !== 0);
  const ammesse = par.armi.length ? disponibili.filter((a) => par.armi.includes(a)) : disponibili;
  return ammesse.length ? ammesse : disponibili;
}

/**
 * Barili di polvere già piazzati che conviene far scoppiare: almeno un nemico nel raggio, nessun compagno
 * (né il pirata dell'IA) entro il raggio + 20 px. Al massimo 2, quelli con più nemici vicini per primi.
 * I barili vicini ai nostri non diventano mai bersagli; se un tiro li fa scoppiare lo stesso, il punteggio
 * (che legge i danni di simulaColpo, barili compresi) lo scarta.
 */
export function bariliUtili(s: StatoBattaglia, io: Pirata, nemici: Pirata[]): Punto[] {
  const r = BIL.barili.raggio;
  const vicino = (p: Pirata, b: Punto, d: number) => (p.x - b.x) ** 2 + (p.y - b.y) ** 2 < d * d;
  const amici = s.pirati.filter((p) => p.squadra === io.squadra && p.stato === 'vivo');
  return s.proiettili
    .filter((pr) => pr.tipo === 'barile' && pr.fermo)
    .map((pr) => ({ b: { x: pr.x, y: pr.y }, n: nemici.filter((n) => vicino(n, pr, r)).length }))
    .filter(({ b, n }) => n > 0 && !amici.some((a) => vicino(a, b, r + 20)))
    .sort((a, b) => b.n - a.n || a.b.x - b.b.x)
    .slice(0, 2)
    .map(({ b }) => b);
}

/** Nemici in ordine di priorità: pochi PV, vicini e vicini al mare prima. */
function ordinaBersagli(s: StatoBattaglia, io: Pirata, nemici: Pirata[]): Pirata[] {
  const voto = (p: Pirata) => {
    const d = Math.sqrt((p.x - io.x) ** 2 + (p.y - io.y) ** 2);
    const vicinoAlMare = s.terreno.mare - (p.y + BIL.pirata.capsulaAltezza / 2) < 80 ? 20 : 0;
    return p.vita + d / 8 - vicinoAlMare;
  };
  return nemici.map((p) => ({ p, v: voto(p) })).sort((a, b) => a.v - b.v || a.p.id - b.p.id).map((x) => x.p);
}

// ─── balistica ───────────────────────────────────────────────────────────────────────────────────

/**
 * Potenza (0-100, non arrotondata) che porta un proiettile sul punto (dx, h) con l'alzo dato, senza vento:
 * v² = g·dx² / (2·cos²θ·(dx·tanθ − h)). dx > 0 in orizzontale, h positivo se il bersaglio è più in alto.
 * `null` se con quell'alzo il punto non si raggiunge.
 */
export function potenzaPer(dx: number, h: number, alzoMezziGradi: number): number | null {
  const c = coseno(alzoMezziGradi), sn = seno(alzoMezziGradi);
  if (c <= 0) return null;
  const den = 2 * c * (dx * sn - h * c); // = 2·cos²θ·(dx·tanθ − h)
  if (den <= 0) return null;
  const v = Math.sqrt((BIL.fisica.gravita * dx * dx) / den);
  return (v / BIL.fisica.velocitaMaxProiettile) * 100;
}

function nuovaLinea(s: StatoBattaglia, io: Pirata, b: Punto, arma: IdArma, alzoGradi: number): Linea | null {
  void s;
  const dir: -1 | 1 = b.x >= io.x ? 1 : -1;
  const dx = Math.abs(b.x - io.x);
  if (dx < 20) return null; // troppo vicino per un tiro a parabola
  const alzo = alzoGradi * 2;
  const p = potenzaPer(dx, io.y - b.y, alzo);
  if (p === null || p > 115) return null;
  const l: Linea = {
    arma, bersaglio: b, dir, mezziGradi: normalizza(dir > 0 ? alzo : 360 - alzo),
    potenza: limita(Math.round(p), 5, 100), prove: 0, finita: false,
  };
  if (ARMA[arma].miccia) l.miccia = micciaPer(arma, dx, l.potenza, alzo);
  return l;
}

/** Miccia (s interi) che fa esplodere la granata più o meno all'arrivo sul bersaglio. */
function micciaPer(arma: IdArma, dx: number, potenza: number, alzo: number): number {
  const m = ARMA[arma].miccia!;
  const vx = (BIL.fisica.velocitaMaxProiettile * potenza / 100) * coseno(alzo);
  const tick = vx > 0 ? dx / vx : 999;
  return limita(Math.ceil(tick / 60), m.min, m.max);
}

function colpoDi(io: Pirata, l: Linea): PianoColpo {
  return { pirata: io.id, arma: l.arma, mezziGradi: l.mezziGradi, potenza: l.potenza, ...(l.miccia !== undefined ? { miccia: l.miccia } : {}) };
}

/** Distanza orizzontale (lungo `dir`) tra il punto d'impatto e il bersaglio: + lungo, − corto. */
function scarto(l: Linea): number | null {
  const imp = l.ultima?.esito.impatto;
  if (!imp) return null;
  return (imp.x - l.bersaglio.x) * l.dir;
}

/** La linea più promettente da correggere: punteggio alto, poi colpo più vicino. */
function prossimaDaCorreggere(linee: Linea[]): Linea | undefined {
  let migliore: Linea | undefined;
  let voto = -Infinity;
  for (const l of linee) {
    if (l.finita || l.prove === 0 || l.prove >= 3 || !l.ultima) continue;
    const sc = scarto(l);
    if (sc !== null && Math.abs(sc) <= 6) continue; // già centrata
    const v = l.ultima.punti - (sc === null ? 500 : Math.abs(sc)) / 4 - l.prove * 20;
    if (v > voto) { voto = v; migliore = l; }
  }
  return migliore;
}

/** Corregge la potenza della linea (gittata ∝ v²). Falso se non c'è niente da correggere. */
function correggi(io: Pirata, l: Linea): boolean {
  const imp = l.ultima?.esito.impatto;
  const dT = (l.bersaglio.x - io.x) * l.dir;
  let nuova: number;
  if (!imp) nuova = l.potenza * 0.85; // finito in mare o fuori: di solito è lungo
  else {
    const dI = (imp.x - io.x) * l.dir;
    nuova = dI > 10 ? l.potenza * Math.sqrt(dT / dI) : l.potenza * 1.25;
  }
  const p = limita(Math.round(nuova), 5, 100);
  if (p === l.potenza) return false;
  l.potenza = p;
  if (l.miccia !== undefined) l.miccia = micciaPer(l.arma, Math.abs(dT), p, l.dir > 0 ? l.mezziGradi : 360 - l.mezziGradi);
  return true;
}

// ─── errore umano, riparo, utilità ──────────────────────────────────────────────────────────────

/** Errore uniforme in [−1, 1) (01 §8; scelta del Lead design per M1: niente distribuzione triangolare). */
function errore(rng: { rng: number }): number {
  return casuale(rng) * 2 - 1;
}

function conErrore(c: PianoColpo, par: ParLivello, rng: { rng: number }): PianoColpo {
  const def = ARMA[c.arma];
  const out = { ...c };
  if (def.usaAngolo) out.mezziGradi = normalizza(c.mezziGradi + Math.round(errore(rng) * par.erroreGradi * 2));
  // l'errore di potenza vale sulla GITTATA (decisione del Lead, M1): la gittata va con potenza², quindi
  // ±15% di gittata = potenza × √(1 ± 0,15), circa ±7,5% di potenza
  if (def.usaPotenza) out.potenza = limita(Math.round(c.potenza * Math.sqrt(1 + errore(rng) * par.errorePotenza)), 1, 100);
  return out;
}

/** Direzione della fuga verso un riparo: dove, dopo qualche passo, più nemici restano dietro il terreno. */
function versoRiparo(s: StatoBattaglia, io: Pirata, nemici: Pirata[]): -1 | 0 | 1 {
  let migliore: -1 | 0 | 1 = 0;
  let voto = -Infinity;
  const vicino = nemici.reduce((a, b) => (Math.abs(b.x - io.x) < Math.abs(a.x - io.x) ? b : a));
  for (const dir of [-1, 1] as const) {
    const passi = passiSicuri(s, io, dir, PASSI_FUGA);
    if (passi < PASSI_FUGA) continue;
    const arrivo = { x: io.x + dir * passi, y: io.y - 6 };
    let v = nemici.filter((n) => riparato(s, arrivo, n)).length * 10;
    if ((vicino.x - io.x) * dir < 0) v += 1; // a parità, lontano dal nemico più vicino
    if (v > voto) { voto = v; migliore = dir; }
  }
  return migliore;
}

/** Angolo in mezzi gradi della direzione (dx, dySu), con la tabella (niente Math.atan2 nel codice puro). */
export function angoloVerso(dx: number, dySu: number): number {
  let migliore = 0, err = Infinity;
  const l = Math.sqrt(dx * dx + dySu * dySu) || 1;
  for (let a = 0; a < 720; a++) {
    const e = (coseno(a) - dx / l) ** 2 + (seno(a) - dySu / l) ** 2;
    if (e < err) { err = e; migliore = a; }
  }
  return migliore;
}

function limita(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}
