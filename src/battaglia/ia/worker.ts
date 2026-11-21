// Web Worker dell'IA di battaglia: riceve lo stato clonato, pensa, risponde col piano.
// Il budget è in simulazioni (BIL.ia.livelli), non in millisecondi: così il risultato è riproducibile.

import { decidi, type RichiestaWorker, type RispostaWorker } from './index';

const ambito = self as unknown as {
  onmessage: ((e: MessageEvent<RichiestaWorker>) => void) | null;
  postMessage(m: RispostaWorker): void;
};

ambito.onmessage = (e) => {
  const { id, stato, livello } = e.data;
  try {
    ambito.postMessage({ id, piano: decidi(stato, livello) });
  } catch (err) {
    ambito.postMessage({ id, errore: String(err) });
  }
};
