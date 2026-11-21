// Diagnostica (piano QA §4, Impostazioni → Diagnostica → "Prova 60 fps").
// L'HUD (D) la carica con import() dinamico, così Pixi non entra nel pezzo della UI:
//   const { provaFps } = await import('../battaglia/partita/diagnostica');
//   const r = await provaFps(); // ~60 s
// Gioca da sola una battaglia 5 contro 5, IA contro IA, con lo zoom che va dal minimo al massimo,
// e misura fps medio, fps del secondo peggiore (esclusi i secondi di caricamento), frame sopra 20 ms,
// ms di simulazione per tick e frequenza dello schermo stimata (hzSchermo: 90 sul Pixel 6).
import { registaAttivo, type RisultatoProvaFps } from './regista';

export type { RisultatoProvaFps };

/** Soglie di accettazione sul Pixel 6 (piano QA §4.3). */
export const SOGLIE_PROVA = { fpsMedio: 58, fpsMinimo: 50, msSimPerTick: 2 } as const;

export function provaSuperata(r: RisultatoProvaFps): boolean {
  return r.fpsMedio >= SOGLIE_PROVA.fpsMedio && r.fpsMinimo >= SOGLIE_PROVA.fpsMinimo && r.msSimPerTick <= SOGLIE_PROVA.msSimPerTick;
}

/** Avvia la prova (durata predefinita 60 s). Fallisce se la grafica non è partita. */
export function provaFps(durataMs = 60_000): Promise<RisultatoProvaFps> {
  const r = registaAttivo();
  if (!r) return Promise.reject(new Error('La grafica non è pronta'));
  return r.avviaProva(durataMs);
}
