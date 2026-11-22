// Schermata Schermaglia (m1-ritmo §9): quanti pirati per lato, da 1 a 5, poi "Salpa!". La scelta resta salvata.
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { COLORI_CIURMA } from '../../core/palette';
import type { IdCiurma } from '../../core/tipi';
import { PIRATI_MAX, PIRATI_MIN } from './logica';
import { avviaSchermaglia, sceltaSchermaglia } from './stato';
import { impostaPiratiSchermaglia, mappaSchermaglia, piratiSchermaglia } from '../preferenze';
import { EMBLEMA } from './segnaposto';

function Contatore({ lato, ciurma, etichetta }: { lato: 0 | 1; ciurma: IdCiurma; etichetta: string }) {
  const n = piratiSchermaglia.value[lato];
  const cambia = (d: number) => {
    const p = [...piratiSchermaglia.value] as [number, number];
    p[lato] = Math.max(PIRATI_MIN, Math.min(PIRATI_MAX, n + d));
    tocco();
    void impostaPiratiSchermaglia(p);
  };
  const c = COLORI_CIURMA[ciurma];
  return (
    <div class="contatore" data-testid={`pirati-${lato}`}>
      <span class="emblema" style={{ background: c.colore, borderColor: c.scuro }}>{EMBLEMA[ciurma]}</span>
      <span class="etichetta">{etichetta}</span>
      <button type="button" id={`meno-${lato}`} class="btn icona" aria-label={T.schermaglia.meno} disabled={n <= PIRATI_MIN} onClick={() => cambia(-1)}>−</button>
      <span class="numero" aria-live="polite">{n}</span>
      <button type="button" id={`piu-${lato}`} class="btn icona" aria-label={T.schermaglia.piu} disabled={n >= PIRATI_MAX} onClick={() => cambia(1)}>+</button>
    </div>
  );
}

export function SceltaSchermaglia() {
  if (!sceltaSchermaglia.value) return null;
  return (
    <div class="scrim" onClick={(e) => { if (e.target === e.currentTarget) sceltaSchermaglia.value = false; }}>
      <section class="modale scelta-schermaglia" role="dialog" aria-modal="true" aria-labelledby="titolo-schermaglia">
        <header>
          <h2 id="titolo-schermaglia">{T.schermaglia.titolo}</h2>
          <button type="button" class="btn icona" aria-label={T.schermaglia.indietro} onClick={() => (sceltaSchermaglia.value = false)}>✕</button>
        </header>
        <Contatore lato={0} ciurma="teschio" etichetta={T.schermaglia.tuoi} />
        <Contatore lato={1} ciurma="marina" etichetta={T.schermaglia.nemici} />
        <div class="contatore scelta-mappa" role="radiogroup" aria-label={T.schermaglia.mappa}>
          <span class="etichetta">{T.schermaglia.mappa}</span>
          {/* Fase 2 (Lead P1): la Cala v3 ha sostituito la Cala di prima, che resta nei dati solo per i salvataggi vecchi */}
          {([['cala-pappagallo-v3', T.schermaglia.mappaCala], ['', T.schermaglia.mappaCasuale]] as const).map(([id, nome]) => (
            <button type="button" id={`mappa-${id || 'casuale'}`} role="radio" aria-checked={mappaSchermaglia.value === id}
              class={`btn ${mappaSchermaglia.value === id ? 'primario' : 'secondario'}`}
              onClick={() => { tocco(); mappaSchermaglia.value = id; }}>{nome}</button>
          ))}
        </div>
        <button type="button" id="salpa" class="btn primario" onClick={() => { tocco(); avviaSchermaglia(); }}>{T.schermaglia.salpa}</button>
      </section>
    </div>
  );
}
