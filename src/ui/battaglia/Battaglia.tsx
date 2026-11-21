// Schermata di battaglia: HUD sopra il canvas di Pixi (che disegna il ciclo di gioco, B), più pausa ed esito.
import { bus } from '../../core/bus';
import { T } from '../../testi/it';
import { Hud } from './Hud';
import { Esito, Pausa } from './Pannelli';
import { apriPausa } from './stato';

export function Battaglia() {
  const v = bus.battaglia.value;
  return (
    <div class="battaglia" data-testid="battaglia">
      {v ? <Hud v={v} /> : (
        <div class="caricamento" role="status">
          <button type="button" id="pausa" class="tasto-pausa" aria-label={T.battaglia.pausa} onClick={apriPausa}>II</button>
          <p>{T.battaglia.caricamento}</p>
        </div>
      )}
      <Pausa v={v} />
      {v?.esito && <Esito v={v} />}
    </div>
  );
}
