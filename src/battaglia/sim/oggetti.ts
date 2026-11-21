// Oggetti sulla mappa (passata di ritmo di M1, m1-ritmo §9): barili di polvere già piazzati dal generatore e
// casse col paracadute dal turno 3. Sono Proiettile con tipo 'barile' o 'cassa', fermi e senza miccia finché
// un'esplosione o un colpo non li fa scoppiare (reazione a catena come le lapidi). La cassa si apre quando un
// pirata ci passa sopra: Rum (+25 PV, fino a 100) o Trappola (esplode 30/50).

import type { ContenutoCassa, EventoBattaglia, Proiettile, StatoBattaglia, Terreno } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { casuale, intero } from '../../core/rng';
import { capsulaUrta, distanza2Capsula, solido, MEZZA_ALTEZZA_PIRATA, MEZZA_LARGHEZZA_PIRATA } from './terreno';
import { inGioco } from './pirata';
import type { Bersaglio } from './proiettili';
import { CASSA_DERIVA_PER_PUNTO, CASSA_PARTENZA_Y, MICCIA_REAZIONE_TICK, OGGETTO_MEZZA_ALTEZZA, OGGETTO_RAGGIO } from './costanti';

export function eOggetto(pr: Proiettile): boolean {
  return pr.tipo === 'barile' || pr.tipo === 'cassa';
}

/**
 * Proiettile "attivo": vola, rimbalza o ha la miccia accesa. Le fasi volo e risoluzione aspettano solo questi.
 * Barili e casse fermi (e le casse che scendono col paracadute) non fanno aspettare nessuno.
 */
export function attivo(pr: Proiettile): boolean {
  if (pr.tickEsplosione >= 0) return true;
  if (pr.tipo === 'cassa') return false;
  if (pr.tipo === 'barile') return !pr.fermo;
  return true;
}

/** Centro dell'oggetto (il Proiettile ha il punto alla base, appoggiato al suolo). */
export function centroOggetto(pr: { x: number; y: number }): { x: number; y: number } {
  return { x: pr.x, y: pr.y - OGGETTO_MEZZA_ALTEZZA };
}

/** Id del bersaglio di un oggetto (negativo, per distinguerlo dai pirati) e ritorno. */
export function idBersaglioOggetto(idProiettile: number): number { return -1 - idProiettile; }
export function idProiettileDaBersaglio(idBersaglio: number): number { return -1 - idBersaglio; }

/** Barili e casse come bersagli per cannone e pistola (capsula 12×22 sopra la base). */
export function bersagliOggetti(proiettili: readonly Proiettile[]): Bersaglio[] {
  const out: Bersaglio[] = [];
  for (const pr of proiettili) if (eOggetto(pr) && pr.tickEsplosione < 0) {
    const c = centroOggetto(pr);
    out.push({ id: idBersaglioOggetto(pr.id), x: c.x, y: c.y });
  }
  return out;
}

/** Esplosione in (x, y) di raggio r: gli oggetti raggiunti si accendono e scoppiano tra pochi tick (catena). */
export function accendiOggetti(s: StatoBattaglia, x: number, y: number, raggio: number): void {
  for (const pr of s.proiettili) {
    if (!eOggetto(pr) || pr.tickEsplosione >= 0) continue;
    const c = centroOggetto(pr);
    const dx = c.x - x, dy = c.y - y, lim = raggio + OGGETTO_RAGGIO;
    if (dx * dx + dy * dy < lim * lim) pr.tickEsplosione = s.tick + MICCIA_REAZIONE_TICK;
  }
}

/** Colpito direttamente (pistola): scoppia tra pochi tick. */
export function accendiOggetto(s: StatoBattaglia, idProiettile: number): void {
  const pr = s.proiettili.find((p) => p.id === idProiettile);
  if (pr && eOggetto(pr) && pr.tickEsplosione < 0) pr.tickEsplosione = s.tick + MICCIA_REAZIONE_TICK;
}

/** Barili della mappa: Proiettile fermi alla base indicata dal generatore. */
export function creaBarili(s: StatoBattaglia, barili: readonly { x: number; y: number }[] | undefined): void {
  for (const b of barili ?? []) {
    s.proiettili.push({
      id: s.prossimoId++, tipo: 'barile', arma: 'barile', x: b.x, y: b.y - 1, vx: 0, vy: 0,
      tickEsplosione: -1, lanciatore: -1, fermo: true,
    });
  }
}

// ─── Casse ───────────────────────────────────────────────────────────────────────────────────────

/** Deriva orizzontale col vento, in px/tick. */
function deriva(vento: number): number {
  return vento * CASSA_DERIVA_PER_PUNTO;
}

/**
 * Un tick di discesa col paracadute (60 px/s, spostata dal vento). Restituisce 'mare' se cade in acqua,
 * 'atterrata' se tocca terra in questo tick, altrimenti null. Una cassa ferma ricomincia a scendere se il
 * terreno sotto sparisce.
 */
export function scendiCassa(t: Terreno, mare: number, vento: number, c: { x: number; y: number; vx: number; vy: number; fermo: boolean }): 'mare' | 'atterrata' | null {
  if (c.fermo) {
    if (solido(t, Math.floor(c.x), Math.floor(c.y) + 1)) return null;
    c.fermo = false;
  }
  c.vx = deriva(vento);
  c.vy = BIL.casse.discesa;
  const passi = Math.max(1, Math.ceil(Math.max(Math.abs(c.vx), Math.abs(c.vy))));
  for (let i = 0; i < passi; i++) {
    const nx = c.x + c.vx / passi, ny = c.y + c.vy / passi;
    if (solido(t, Math.floor(nx), Math.floor(ny) + 1) || solido(t, Math.floor(nx), Math.floor(ny))) {
      if (!solido(t, Math.floor(nx), Math.floor(ny))) { c.x = nx; c.y = ny; }
      c.vx = 0; c.vy = 0; c.fermo = true;
      return 'atterrata';
    }
    c.x = nx; c.y = ny;
    if (c.y >= mare) return 'mare';
  }
  return null;
}

/** Dove atterrerebbe una cassa lasciata in x col vento attuale (null se finisce in mare o in un posto stretto). */
export function atterraggio(t: Terreno, mare: number, vento: number, x: number): { x: number; y: number } | null {
  const c = { x, y: CASSA_PARTENZA_Y, vx: 0, vy: 0, fermo: false };
  for (let i = 0; i < 4 * t.h; i++) {
    const r = scendiCassa(t, mare, vento, c);
    if (r === 'mare') return null;
    if (r === 'atterrata') {
      const m = BIL.mondo;
      if (c.x < 64 || c.x > m.larghezza - 64) return null;
      if (c.y > mare - 2 * MEZZA_ALTEZZA_PIRATA) return null;
      // un pirata ci sta in piedi sopra: raggiungibile
      if (capsulaUrta(t, c.x, c.y - MEZZA_ALTEZZA_PIRATA)) return null;
      return { x: c.x, y: c.y };
    }
  }
  return null;
}

function pvInGioco(s: StatoBattaglia, sq: 0 | 1): number {
  let n = 0;
  for (const p of s.pirati) if (p.squadra === sq && inGioco(p)) n += p.vita;
  return n;
}

/** Metà della mappa della squadra (dove stanno in media i suoi pirati): [x0, x1). */
function metaDi(s: StatoBattaglia, sq: 0 | 1): [number, number] {
  let somma = 0, n = 0;
  for (const p of s.pirati) if (p.squadra === sq && inGioco(p)) { somma += p.x; n++; }
  const w = s.terreno.w;
  return n > 0 && somma / n < w / 2 ? [64, w / 2] : [w / 2, w - 64];
}

/** A inizio turno (dal turno 3, 50%, al massimo 3 in mappa) può cadere una cassa. */
export function forseCassa(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  const C = BIL.casse;
  if (s.turno.numero < C.dalTurno) return;
  if (s.proiettili.filter((p) => p.tipo === 'cassa').length >= C.maxInMappa) return;
  if (casuale(s) >= C.probabilita) return;
  const totale = C.pesi.rum + C.pesi.trappola;
  const contenuto: ContenutoCassa = casuale(s) * totale < C.pesi.rum ? 'rum' : 'trappola';
  // rimonta: chi è sotto il 60% dei PV avversari ha il 70% di probabilità di averla nella sua metà
  let zona: [number, number] = [64, s.terreno.w - 64];
  for (const sq of [0, 1] as const) {
    const mio = pvInGioco(s, sq), loro = pvInGioco(s, (1 - sq) as 0 | 1);
    if (loro > 0 && mio < C.rimontaSoglia * loro) {
      const sua = metaDi(s, sq);
      zona = casuale(s) < C.rimontaProbabilita ? sua : metaDi(s, (1 - sq) as 0 | 1);
      break;
    }
  }
  for (let tentativo = 0; tentativo < 8; tentativo++) {
    const x = intero(s, Math.ceil(zona[0]), Math.floor(zona[1]) - 1);
    // il punto di partenza è scelto perché, col vento di adesso, atterri su un punto raggiungibile
    if (!atterraggio(s.terreno, s.terreno.mare, s.vento, x)) continue;
    const id = s.prossimoId++;
    s.proiettili.push({
      id, tipo: 'cassa', arma: 'lapide', x, y: CASSA_PARTENZA_Y, vx: 0, vy: 0,
      tickEsplosione: -1, lanciatore: -1, fermo: false, contenuto,
    });
    eventi.push({ t: 'cassaCaduta', proiettile: id, x });
    return;
  }
}

/** Un pirata in campo che tocca la cassa la apre. Restituisce true se la cassa è stata aperta (e va tolta). */
export function apriCassa(s: StatoBattaglia, c: Proiettile, eventi: EventoBattaglia[], esplodiTrappola: (x: number, y: number) => void): boolean {
  if (c.tipo !== 'cassa' || c.tickEsplosione >= 0) return false;
  const centro = centroOggetto(c);
  const lim = MEZZA_LARGHEZZA_PIRATA + OGGETTO_RAGGIO;
  for (const p of s.pirati) {
    if (!inGioco(p)) continue;
    if (distanza2Capsula(p.x, p.y, centro.x, centro.y) > lim * lim) continue;
    const contenuto = c.contenuto ?? 'rum';
    eventi.push({ t: 'cassaAperta', proiettile: c.id, pirata: p.id, contenuto });
    if (contenuto === 'rum') {
      p.vita = Math.max(p.vita, Math.min(BIL.casse.rumPvMax, p.vita + BIL.casse.rumPv));
      if (p.vita > p.vitaMax) p.vitaMax = p.vita; // la barra del pirata si allunga
    } else {
      esplodiTrappola(centro.x, centro.y);
    }
    return true;
  }
  return false;
}

