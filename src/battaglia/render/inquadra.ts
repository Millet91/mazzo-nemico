// Inquadratura automatica della mira (scelta del proprietario 21/11: "mentre miri la visuale si allarga da sola").
// Parte PURA, testata in Node. Dati il pirata che tira e il punto dove cade il colpo, trova lo zoom più alto
// (mai oltre quello scelto dal giocatore) e lo spostamento più piccolo della camera con cui si vedono tutti e
// due, senza finire sotto la barra in alto o sotto i tasti negli angoli in basso.
//
// La parte libera dello schermo ha la forma di una T: la fascia larga sopra i tasti e la colonna in mezzo
// ai tasti. Ogni punto deve stare in una delle due.

export interface Punto { x: number; y: number }
export interface Rett { x0: number; x1: number; y0: number; y1: number }

/** margini in px CSS: bordi, barra in alto, riquadri dei tasti negli angoli in basso (comandi v3) */
export const INQUADRA = {
  lato: 56,
  alto: 96,
  basso: 48,
  /** riquadro dei tasti in ogni angolo: frecce e salto da una parte, FUOCO, ARMA e "45° · 60%" dall'altra */
  levaLarga: 212,
  levaAlta: 170,
  /** la visuale si riallarga subito, ma si restringe solo se c'è almeno il 12% da guadagnare (niente "respiro") */
  bandaZoom: 1.12,
  /** tempo di assestamento della camera che inquadra, in ms */
  tau: 180,
} as const;

/** Le due zone libere dello schermo w×h (px CSS): fascia sopra i tasti e colonna in mezzo. */
export function zoneLibere(w: number, h: number): [Rett, Rett] {
  const I = INQUADRA;
  const fascia: Rett = { x0: I.lato, x1: w - I.lato, y0: I.alto, y1: Math.max(I.alto + 40, h - I.levaAlta) };
  const x0 = Math.min(I.levaLarga, w / 2 - 40);
  const colonna: Rett = { x0, x1: w - x0, y0: I.alto, y1: Math.max(I.alto + 40, h - I.basso) };
  return [fascia, colonna];
}

/** true se il punto dello schermo sta in una zona libera */
export function inZonaLibera(p: Punto, w: number, h: number): boolean {
  return zoneLibere(w, h).some((z) => p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1);
}

/** scala massima (px CSS per px di mondo) con cui due coordinate di mondo entrano nei rispettivi intervalli di schermo */
function scalaMax(a: number, a0: number, a1: number, b: number, b0: number, b1: number): number {
  if (a === b) return Infinity;
  const k = a > b ? (a1 - b0) / (a - b) : (b1 - a0) / (b - a);
  return k > 0 ? k : 0;
}

/** intervallo del centro camera (una coordinata) che tiene `v` di mondo tra s0 e s1 di schermo, a scala k */
function intervallo(v: number, s0: number, s1: number, meta: number, k: number): [number, number] {
  return [v - (s1 - meta) / k, v - (s0 - meta) / k];
}

export interface Inquadratura { x: number; y: number; scala: number }

/**
 * @param centro   centro attuale della camera (px di mondo)
 * @param pirata   chi tira (px di mondo)
 * @param impatto  dove cade il colpo, o null se non c'è (allora conta solo il pirata)
 * @param scalaGiocatore scala scelta dal giocatore: non si stringe mai oltre questa
 * @param scalaMin scala allo zoom minimo
 * @returns la scala e il centro camera più vicino a quello attuale con cui i due punti si vedono
 */
export function inquadra(centro: Punto, pirata: Punto, impatto: Punto | null, w: number, h: number, scalaGiocatore: number, scalaMin: number): Inquadratura {
  const zone = zoneLibere(w, h);
  const punti = impatto ? [pirata, impatto] : [pirata];
  // ogni punto in una delle due zone: 2 o 4 combinazioni
  let meglio: { k: number; x: number; y: number; d: number } | null = null;
  const n = zone.length ** punti.length;
  for (let c = 0; c < n; c++) {
    const zp = zone[c % zone.length];
    const zi = zone[Math.floor(c / zone.length) % zone.length];
    let k = scalaGiocatore;
    if (impatto) {
      k = Math.min(k,
        scalaMax(pirata.x, zp.x0, zp.x1, impatto.x, zi.x0, zi.x1),
        scalaMax(pirata.y, zp.y0, zp.y1, impatto.y, zi.y0, zi.y1));
    }
    k = Math.max(scalaMin, k);
    let ix = intervallo(pirata.x, zp.x0, zp.x1, w / 2, k);
    let iy = intervallo(pirata.y, zp.y0, zp.y1, h / 2, k);
    if (impatto) {
      const jx = intervallo(impatto.x, zi.x0, zi.x1, w / 2, k);
      const jy = intervallo(impatto.y, zi.y0, zi.y1, h / 2, k);
      ix = [Math.max(ix[0], jx[0]), Math.min(ix[1], jx[1])];
      iy = [Math.max(iy[0], jy[0]), Math.min(iy[1], jy[1])];
    }
    // intervallo vuoto (già allo zoom minimo e non basta): si sta a metà tra i due vincoli
    const x = ix[0] > ix[1] ? (ix[0] + ix[1]) / 2 : Math.min(ix[1], Math.max(ix[0], centro.x));
    const y = iy[0] > iy[1] ? (iy[0] + iy[1]) / 2 : Math.min(iy[1], Math.max(iy[0], centro.y));
    const d = Math.hypot((x - centro.x) * k, (y - centro.y) * k);
    // vince la scala più alta; a pari scala (entro l'1%) lo spostamento più piccolo
    if (!meglio || k > meglio.k * 1.01 || (k >= meglio.k * 0.99 && d < meglio.d)) meglio = { k, x, y, d };
  }
  return { x: meglio!.x, y: meglio!.y, scala: meglio!.k };
}

/**
 * Zoom "pigro": si allarga subito quando serve, si restringe solo se la differenza supera la banda.
 * @param attuale lo zoom d'inquadratura in uso; @param ideale quello appena calcolato
 */
export function zoomPigro(attuale: number, ideale: number): number {
  if (ideale < attuale) return ideale;
  return ideale > attuale * INQUADRA.bandaZoom ? ideale : attuale;
}
