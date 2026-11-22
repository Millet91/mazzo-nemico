// Voci dei pirati in lingua inventata (00 §9.5, studio v2 audio §3.6): versi da marinaio ("Arr!", "Yo-ho!"),
// non i gridolini acuti da verme. Due timbri: `a` basso e burbero, `b` tenore. Sintesi a formanti, segnaposto.
import type { VoceAudio } from '../tipi';
import type { Sint } from '../sintesi';

interface Timbro { f0: number; gola: number }
const TIMBRI: Record<'a' | 'b', Timbro> = {
  a: { f0: 102, gola: 0.92 },
  b: { f0: 148, gola: 1.06 },
};

type Verso = (s: Sint, t: Timbro) => void;

const VERSI: Record<string, { durata: number; volume: number; verso: Verso }> = {
  /** inizio turno: "Arr!" */
  tocca: {
    durata: 0.5, volume: 0.4,
    verso: (s, t) => s.voce({ durata: 0.46, f0: [t.f0 * 1.15, t.f0 * 1.3, t.f0], vocali: ['a', 'a', 'o'], vol: 0.9, raspa: 0.7, fiato: 0.15, gola: t.gola }),
  },
  /** al fuoco: "Ha!" */
  spara: {
    durata: 0.3, volume: 0.36,
    verso: (s, t) => s.voce({ durata: 0.26, f0: [t.f0 * 1.5, t.f0 * 1.7, t.f0 * 1.2], vocali: ['a', 'a'], vol: 0.9, fiato: 0.35, gola: t.gola, attacco: 0.01 }),
  },
  /** colpito: "Ugh!" */
  colpito: {
    durata: 0.32, volume: 0.42,
    verso: (s, t) => s.voce({ durata: 0.28, f0: [t.f0 * 1.45, t.f0 * 0.95, t.f0 * 0.8], vocali: ['u', 'o', 'u'], vol: 0.9, raspa: 0.3, fiato: 0.3, gola: t.gola, attacco: 0.01 }),
  },
  /** morte: "Aaaoooh..." che scende */
  morte: {
    durata: 0.9, volume: 0.45,
    verso: (s, t) => s.voce({ durata: 0.85, f0: [t.f0 * 1.6, t.f0 * 1.5, t.f0 * 1.1, t.f0 * 0.7], vocali: ['a', 'a', 'o', 'u'], vol: 0.9, raspa: 0.25, fiato: 0.2, gola: t.gola, rilascio: 0.25 }),
  },
  /** vittoria: "Yo-ho!" */
  vittoria: {
    durata: 0.85, volume: 0.42,
    verso(s, t) {
      s.voce({ durata: 0.3, f0: [t.f0 * 1.3, t.f0 * 1.35], vocali: ['i', 'o', 'o'], vol: 0.85, fiato: 0.15, gola: t.gola });
      s.voce({ t: 0.36, durata: 0.45, f0: [t.f0 * 1.75, t.f0 * 1.8, t.f0 * 1.6], vocali: ['o', 'o', 'u'], vol: 0.9, fiato: 0.2, gola: t.gola, rilascio: 0.15 });
    },
  },
  /** sforzo (scavalco, presa al bordo): "Hup!" */
  sforzo: {
    durata: 0.22, volume: 0.3,
    verso: (s, t) => s.voce({ durata: 0.18, f0: [t.f0 * 1.2, t.f0 * 1.5], vocali: ['u', 'a'], vol: 0.9, fiato: 0.4, gola: t.gola, attacco: 0.01, rilascio: 0.04 }),
  },
};

export type IdVerso = 'tocca' | 'spara' | 'colpito' | 'morte' | 'vittoria' | 'sforzo';
type IdVoce = `vox_${'a' | 'b'}_${IdVerso}`;

function costruisci(): Record<IdVoce, VoceAudio> {
  const r: Partial<Record<IdVoce, VoceAudio>> = {};
  for (const timbro of ['a', 'b'] as const) {
    for (const [nome, v] of Object.entries(VERSI)) {
      r[`vox_${timbro}_${nome}` as IdVoce] = {
        canale: 'voci', volume: v.volume, durata: v.durata, maxIstanze: 1,
        ricetta: (s) => v.verso(s, TIMBRI[timbro]),
      };
    }
  }
  return r as Record<IdVoce, VoceAudio>;
}

export const VOCI = costruisci();
