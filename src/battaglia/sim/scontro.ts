// Regole dei tipi di scontro (studio v2): PUNTO D'AGGANCIO lasciato dal Lead P1 per il Pacchetto 2.
// `avanza` (turno.ts) chiama `regoleScontro` alla fine di ogni tick, a battaglia non finita, in qualunque fase.
// Assalto e duello non hanno regole in più: si vince eliminando tutti, come sempre.
// La regola Bandiera la scrive il Pacchetto 2 in sim/bandiera.ts e la chiama da qui. Per vincere:
//   eventi.push({ t: 'bandieraPresa', pirata });  concludi(squadra, 'bandiera');
// Come tutto in sim/: deterministica, niente Math.random, solo lo stato `s`.
import type { EventoBattaglia, MotivoFine, StatoBattaglia } from '../../core/tipi';

/** chiude la battaglia: esito, fase 'fine' ed evento `fine` (è `concludi` di turno.ts, già legato a stato ed eventi) */
export type Concludi = (vincitore: 0 | 1, motivo: MotivoFine) => void;

export function regoleScontro(s: StatoBattaglia, _eventi: EventoBattaglia[], _concludi: Concludi): void {
  const scontro = s.config.scontro;
  if (!scontro || scontro.tipo !== 'bandiera') return;
  // Pacchetto 2: regola Bandiera
}
