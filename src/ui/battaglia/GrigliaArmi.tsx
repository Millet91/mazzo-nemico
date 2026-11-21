// Selettore armi (00 §3, studio v2 UX §3.6): una fila con le sole armi che il pirata ha, in basso a destra
// accanto ad ARMA; il centro del campo resta libero. Le armi ancora da sbloccare stanno dietro "+12 🔒" e non
// si toccano. Oltre le 4 armi la fila va a capo (4 per riga, nell'ordine di 00 §1.3).
// Un tocco su un'arma la sceglie e chiude; un tocco fuori (o il tasto indietro, o Esc) chiude. Il timer NON si ferma.
import type { VistaBattaglia } from '../../core/bus';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { celleGriglia } from './logica';
import { grigliaAperta, invia } from './stato';
import { ICONA_ARMA } from './segnaposto';

export function GrigliaArmi({ v }: { v: VistaBattaglia }) {
  const chiudi = () => (grigliaAperta.value = false);
  const celle = celleGriglia(v.munizioni);
  const attive = celle.filter((c) => c.attiva);
  const bloccate = celle.length - attive.length;
  return (
    <div class="scrim-griglia" data-testid="scrim-griglia"
      onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); chiudi(); } }}>
      <div class="griglia-armi" role="dialog" aria-label={T.battaglia.griglia} data-testid="griglia-armi"
        style={{ '--colonne': String(Math.min(4, Math.max(1, attive.length))) } as Record<string, string>}>
        {attive.map((c) => (
          <button type="button" key={c.id} data-arma={c.id}
            class={`cella-arma attiva ${c.id === v.arma ? 'scelta' : ''}`} aria-label={T.armi[c.id]}
            onClick={() => {
              tocco();
              invia({ t: 'arma', arma: c.id });
              chiudi();
            }}>
            <span class="icona">{ICONA_ARMA[c.id]}</span>
            <span class="munizioni">{c.munizioni === -1 ? T.battaglia.infinite : c.munizioni}</span>
            <span class="nome">{T.armi[c.id]}</span>
          </button>
        ))}
        {bloccate > 0 && (
          <span class="armi-bloccate" data-testid="armi-bloccate" role="img" aria-label={T.battaglia.armiBloccateAiuto(bloccate)}>
            {T.battaglia.armiBloccate(bloccate)}
          </span>
        )}
      </div>
    </div>
  );
}
