// Cosa "copre" una battaglia, letto dagli eventi della sim. Serve a scegliere i 10 replay d'oro (genera.ts)
// e a controllare che, dopo un cambio voluto, ognuno copra ancora ciò per cui è stato scelto (replay-oro.test.ts).
import type { EventoBattaglia, StatoBattaglia } from '../../src/core/tipi';

/** Cosa devono coprire, tutti insieme, i replay d'oro della M1 (piano QA §2 L2). */
export const COPERTURA_M1 = [
  'sparo:cannone', 'sparo:granata', 'sparo:pistola', 'sparo:sciabola',
  'annegamento', 'lapide', 'catenaLapidi', 'mareSale',
  'fine:eliminazione', 'fine:tempo', '5v5:fine',
  // passata di ritmo (m1-ritmo §9): barili di polvere e casse Rum/Trappola
  'barile', 'cassaCaduta', 'cassa:rum', 'cassa:trappola',
] as const;
/** Desiderabile ma raro: si prende se il generatore lo trova. */
export const COPERTURA_FACOLTATIVA = ['fine:tempo-parita', 'fine:ritirata', 'dannoCaduta'] as const;

export class Copertura {
  readonly tag = new Set<string>();
  private lapidiNelTurno = 0;
  osserva(s: StatoBattaglia, eventi: readonly EventoBattaglia[]): void {
    for (const e of eventi) {
      switch (e.t) {
        case 'turnoIniziato': this.lapidiNelTurno = 0; break;
        case 'sparo': this.tag.add(`sparo:${e.arma}`); break;
        case 'morto': if (e.causa === 'mare') this.tag.add('annegamento'); break;
        case 'lapide': this.tag.add('lapide'); break;
        case 'esplosione':
          if (e.arma === 'lapide' && ++this.lapidiNelTurno >= 2) this.tag.add('catenaLapidi');
          if (e.arma === 'barile') this.tag.add('barile');
          break;
        case 'mareSale': this.tag.add('mareSale'); break;
        case 'cassaCaduta': this.tag.add('cassaCaduta'); break;
        case 'cassaAperta': this.tag.add(`cassa:${e.contenuto}`); break;
        case 'atterrato': if (e.dannoCaduta > 0) this.tag.add('dannoCaduta'); break;
        case 'fine': {
          this.tag.add(`fine:${e.esito.motivo}`);
          if (e.esito.motivo === 'tempo' && e.esito.pvTotali[0] === e.esito.pvTotali[1]) this.tag.add('fine:tempo-parita');
          if (s.config.squadre[0].pirati === 5 && s.config.squadre[1].pirati === 5) this.tag.add('5v5:fine');
          break;
        }
        default: break;
      }
    }
  }
}
