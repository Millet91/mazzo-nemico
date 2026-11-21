// Selettore armi a griglia 4×4 (00 §3): righe 1-4 Base, 5-8 esplosivi, 9-12 speciali, 13-16 utilità e Kraken.
// Un tocco su un'arma attiva la sceglie e chiude; un tocco fuori chiude. Il timer NON si ferma.
import type { VistaBattaglia } from '../../core/bus';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { celleGriglia } from './logica';
import { grigliaAperta, invia } from './stato';
import { ICONA_ARMA } from './segnaposto';

export function GrigliaArmi({ v }: { v: VistaBattaglia }) {
  const chiudi = () => (grigliaAperta.value = false);
  return (
    <div class="scrim-griglia" data-testid="scrim-griglia"
      onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); chiudi(); } }}>
      <div class="griglia-armi" role="dialog" aria-label={T.battaglia.griglia} data-testid="griglia-armi">
        {celleGriglia(v.munizioni).map((c) => (
          <button type="button" key={c.id} data-arma={c.id}
            class={`cella-arma ${c.attiva ? 'attiva' : 'bloccata'} ${c.id === v.arma ? 'scelta' : ''}`}
            aria-disabled={!c.attiva} aria-label={c.attiva ? T.armi[c.id] : `${T.armi[c.id]} · ${T.battaglia.bloccata}`}
            onClick={() => {
              if (!c.attiva) return;
              tocco();
              invia({ t: 'arma', arma: c.id });
              chiudi();
            }}>
            <span class="icona">{c.attiva ? ICONA_ARMA[c.id] : '🔒'}</span>
            {c.attiva && <span class="munizioni">{c.munizioni === -1 ? T.battaglia.infinite : c.munizioni}</span>}
            <span class="nome">{T.armi[c.id]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
