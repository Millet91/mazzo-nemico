// Vetrina del kit dipinto: con ?vetrina-kit nell'indirizzo il menu mostra tutti i pezzi del kit,
// per le immagini di prova e per i test e2e (tests/e2e/menu-kit.spec.ts). Non è una schermata del gioco.
import { signal } from '@preact/signals';
import { ARMI_CON_ICONA, MOSSE_CON_ICONA, PEZZI_MONDO, urlPezzoMondo, urlPremio, type IdPezzoMondo } from './risorse';
import { IconaArma, Pannello, PannelloNuovo, PergamenaScena, PulsanteKit, PulsanteTondo } from './Kit';

export const vetrinaKit = typeof location !== 'undefined' && new URLSearchParams(location.search).has('vetrina-kit');
const vista = signal<'pezzi' | 'nuovo' | 'scena'>('pezzi');
const avanti = signal(0);

export function VetrinaKit() {
  const niente = () => {};
  return (
    <div class="kit-vetrina" data-testid="vetrina-kit">
      <div class="kit-vetrina-riga">
        <PulsanteKit id="v-pezzi" onClick={() => (vista.value = 'pezzi')}>Pezzi</PulsanteKit>
        <PulsanteKit id="v-nuovo" onClick={() => (vista.value = 'nuovo')}>Nuovo!</PulsanteKit>
        <PulsanteKit id="v-scena" onClick={() => (vista.value = 'scena')}>Scena</PulsanteKit>
        <PulsanteTondo label="ingranaggio" onClick={niente}>⚙</PulsanteTondo>
      </div>
      {vista.value === 'pezzi' && (
        <div class="kit-vetrina-riga">
          <Pannello tipo="legno">
            <div class="kit-vetrina-griglia">{ARMI_CON_ICONA.map((a, i) => <IconaArma key={a} arma={a} bloccata={i > 11} />)}</div>
          </Pannello>
          <Pannello tipo="cornice">
            <div class="kit-vetrina-griglia">
              {MOSSE_CON_ICONA.map((m) => <img key={m} src={urlPremio({ t: 'mossa', mossa: m })} width={48} height={48} alt="" />)}
              <img src={urlPremio({ t: 'recluta', nome: '', aspetto: '' })} width={48} height={48} alt="" />
              <img src={urlPremio({ t: 'bandiera', id: '' })} width={48} height={48} alt="" />
              <img src="assets/ui/ui_premio_arma.webp" width={48} height={48} alt="" />
            </div>
          </Pannello>
          <Pannello tipo="pergamena">
            <div class="kit-vetrina-riga">
              {(Object.keys(PEZZI_MONDO) as IdPezzoMondo[]).map((id) => (
                <img key={id} src={urlPezzoMondo(id)} width={PEZZI_MONDO[id].w / 3} height={PEZZI_MONDO[id].h / 3} alt="" />
              ))}
            </div>
          </Pannello>
        </div>
      )}
      {vista.value === 'nuovo' && (
        <PannelloNuovo premi={[{ icona: 'rampino', titolo: 'Rampino' }, { icona: urlPremio({ t: 'mossa', mossa: 'dondolo' }), titolo: 'Dondolo' }]}
          nota="Arriva in battaglia con il prossimo aggiornamento." battuta={{ chi: 'Mastro Gancio', testo: 'Finalmente un attrezzo serio.' }}
          onChiudi={() => (vista.value = 'pezzi')} />
      )}
      {vista.value === 'scena' && (
        <PergamenaScena ritratto="gancio" nome="Mastro Gancio" testo={avanti.value % 2 ? 'Scarlatta, quel cartello lo strappi tu o devo farlo io con l\'uncino?' : 'Il Re ha vietato i corvi nella Baia dei Corvi. Tutti. Anche quelli dipinti.'}
          onAvanti={() => avanti.value++} onSalta={() => (vista.value = 'pezzi')} />
      )}
    </div>
  );
}
