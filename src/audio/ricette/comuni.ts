// Pezzi riusati da più ricette.
import { CODA_CICLO, type Sint } from '../sintesi';

/**
 * Rumore "piatto" per i suoni in ciclo: dura tutto il giro e ANCHE la coda in più che il magazzino ripiega
 * sull'inizio (`chiudiGiro`), così al punto in cui il giro ricomincia non c'è nessun buco.
 */
export const piatto = (durata: number) => ({ durata: durata + CODA_CICLO, attacco: 0.001, tenuta: durata + CODA_CICLO });

/** Campana di bordo: parziali di una campana vera (ronzio, fondamentale, terza minore, quinta, ottava...). */
export function campana(s: Sint, t: number, base: number, vol: number, coda: number, verso?: AudioNode): void {
  s.modi({
    t, base, vol, verso,
    rapporti: [0.5, 1, 1.19, 1.5, 2, 2.51, 3.01, 4.1],
    pesi: [0.3, 1, 0.55, 0.3, 0.5, 0.22, 0.18, 0.1],
    code: [coda * 1.5, coda * 1.2, coda, coda * 0.8, coda * 0.6, coda * 0.45, coda * 0.35, coda * 0.25],
  });
  // il batacchio
  s.rumore({ t, durata: 0.02, vol: vol * 0.5, filtro: 'bandpass', da: Math.min(6000, base * 4), q: 2, verso });
}

/** Bollicine: piccoli toni che salgono, sparsi nel tempo. */
export function bolle(s: Sint, quante: number, da: number, a: number, vol: number, hzMin = 300, hzMax = 800): void {
  for (let i = 0; i < quante; i++) {
    const f = s.tra(hzMin, hzMax);
    s.tono({ t: s.tra(da, a), da: f, a: f * s.tra(1.5, 2.2), durata: s.tra(0.035, 0.07), vol: vol * s.tra(0.5, 1), attacco: 0.006 });
  }
}

/** Sassolini e schegge che cadono: ticchettii sparsi che si diradano. */
export function detriti(s: Sint, quanti: number, da: number, a: number, vol: number, hzMin: number, hzMax: number, q = 3): void {
  for (let i = 0; i < quanti; i++) {
    // più fitti all'inizio
    const k = s.rnd() ** 1.7;
    const t = da + k * (a - da);
    s.rumore({ t, durata: s.tra(0.02, 0.06), vol: vol * s.tra(0.3, 1) * (1 - k * 0.6), filtro: 'bandpass', da: s.tra(hzMin, hzMax), q });
  }
}

/** Scricchiolio di legno o di corda tesa: un dente di sega lento dentro un filtro stretto, a scatti. */
export function scricchiolio(s: Sint, t: number, durata: number, vol: number, hz = 1000): void {
  const f = s.filtro('bandpass', hz * s.tra(0.85, 1.15), 7);
  const da = s.tra(55, 75);
  s.tono({ t, tipo: 'sawtooth', da, a: da * s.tra(1.25, 1.6), durata, vol, attacco: durata * 0.3, tenuta: durata * 0.3, verso: f });
  s.tono({ t: t + durata * 0.15, tipo: 'sawtooth', da: da * 2.02, a: da * 2.6, durata: durata * 0.7, vol: vol * 0.4, attacco: durata * 0.2, verso: f });
}
