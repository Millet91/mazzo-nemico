// Dalla carriera alla battaglia: la ConfigBattaglia e lo scontro di un attacco (o di una difesa). Puro.
// Fase A: Bandiera non c'è ancora nella sim (P1), quindi si gioca come Assalto; il Duello è già un 1 contro 1.
import type { BattagliaCarriera } from '../../core/bus';
import type { DefCapitolo, StatoCarriera } from '../../core/carriera';
import type { ConfigBattaglia } from '../../core/tipi';
import { VERSIONE_REGOLE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { piratiInCampo } from './regole';

/** Battaglie del capitolo col timer lungo di Mozzo (15 §5: 30 s nelle prime 2, poi 20). */
const BATTAGLIE_TIMER_LUNGO = 2;

/** Config della battaglia per l'attacco in corso. `seme` è nuovo a ogni battaglia: varia vento, casse e IA. */
export function battagliaDaAttacco(cap: DefCapitolo, s: StatoCarriera, seme: number): { carriera: BattagliaCarriera; config: ConfigBattaglia } | null {
  const a = s.attacco;
  if (!a) return null;
  const isola = cap.isole.find((i) => i.id === a.verso);
  if (!isola) return null;
  const scontro = a.difesa || !isola.scontro ? { tipo: 'assalto' as const } : { ...isola.scontro };
  const [att, dif] = piratiInCampo(cap, s, a);
  const giocatoreAttacca = !a.difesa;
  const config: ConfigBattaglia = {
    versioneRegole: VERSIONE_REGOLE,
    // il seme della battaglia cambia a ogni tentativo (vento, casse, IA); la forma dell'isola la decide semeMappa,
    // il seme validato dai Livelli, così chi riprova trova la stessa isola ma una partita nuova
    seme: seme >>> 0,
    ...('seme' in isola.mappa ? { semeMappa: isola.mappa.seme >>> 0 } : {}),
    ...('fissa' in isola.mappa ? { mappaFissa: isola.mappa.fissa } : {}),
    bioma: isola.bioma,
    squadre: [
      giocatoreAttacca
        ? { ciurma: 'teschio', ruolo: 'attaccante', controllo: 'umano', pirati: att }
        : { ciurma: 'marina', ruolo: 'attaccante', controllo: 'ia', livelloIa: 'mozzo', pirati: att },
      giocatoreAttacca
        ? { ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: dif }
        : { ciurma: 'teschio', ruolo: 'difensore', controllo: 'umano', pirati: dif },
    ],
    timerSecondi: s.battaglieGiocate < BATTAGLIE_TIMER_LUNGO ? BIL.turno.timerMozzo : BIL.turno.timerNormale,
    traiettoriaCompleta: true,
  };
  return { carriera: { isola: a.verso, scontro }, config };
}
