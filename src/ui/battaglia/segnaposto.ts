// Segnaposto grafici dell'HUD (11 §5) finché il registro degli asset non ha le icone vere:
// emblemi delle ciurme (colore + simbolo, mai solo colore) e icone delle 16 armi.
import type { IdArma, IdCiurma } from '../../core/tipi';

export const EMBLEMA: Record<IdCiurma, string> = {
  teschio: '☠', gelo: '❄', oro: '◆', marea: '≋', marina: '⚓',
};

export const ICONA_ARMA: Record<IdArma, string> = {
  cannone: '⚫', granata: '💣', pistola: '🔫', sciabola: '🗡',
  barile: '🛢', mina: '🐚', rum: '🍾', pallaSpezzata: '⁂',
  pappagallo: '🦜', scimmia: '🐒', ancora: '⚓', bordata: '⛵',
  rampino: '🪝', vanga: '⛏', bussola: '🧭', kraken: '🐙',
};
