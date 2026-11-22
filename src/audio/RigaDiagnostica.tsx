// La riga dell'audio in Impostazioni → Diagnostica (P1-contratti §6, Audio punto 3): quanti suoni sono pronti (nel
// menu solo i tasti, il resto entrando in battaglia), in quanto tempo, se calcolati ora o presi dal cassetto del telefono (cache.ts), e lo stato del motore WebAudio.
// statoAudio() non è un signal: la riga si rilegge ogni mezzo secondo finché è a schermo.
import { useEffect, useState } from 'preact/hooks';
import { T } from '../testi/it';
import { statoAudio } from './index';

function testo(): string {
  const s = statoAudio();
  const restoInBattaglia = s.msMenu !== null && s.msPronti === null && s.scena !== 'battaglia' && s.scena !== 'attesa';
  return T.diagnostica.audioStato(s.pronti, s.totale, s.msPronti === null ? null : s.msPronti / 1000, s.daCassetto > 0 && s.daCassetto === s.totale, s.contesto, restoInBattaglia);
}

export function RigaDiagnosticaAudio() {
  const [riga, setRiga] = useState(testo);
  useEffect(() => {
    const t = setInterval(() => setRiga(testo()), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <section>
      <p class="stato" data-testid="stato-audio" role="status"><strong>{T.diagnostica.audio}:</strong> {riga}</p>
      <p class="nota">{T.diagnostica.audioNota}</p>
    </section>
  );
}
