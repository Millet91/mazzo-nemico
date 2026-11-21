// Icona e testo di un premio della carriera (pannello d'attacco, «Nuovo!», carta di prova).
import type { Premio } from '../../core/carriera';
import { T } from '../../testi/it';

const C = T.carriera;

export function iconaPremio(p: Premio): string {
  if (p.t === 'arma') return p.arma === 'ancora' ? '⚓' : p.arma === 'rampino' ? '🪝' : '💣';
  if (p.t === 'mossa') return '🤸';
  if (p.t === 'recluta') return '🧑‍✈️';
  return '🏴‍☠️';
}

export function testoPremio(p: Premio): string {
  if (p.t === 'arma') return C.premi.arma(T.armi[p.arma]);
  if (p.t === 'mossa') return C.premi.mossa(C.mosse[p.mossa] ?? p.mossa);
  if (p.t === 'recluta') return C.premi.recluta(p.nome);
  return C.premi.bandiera(C.bandiere[p.id] ?? p.id);
}
