// Paywall unico a fine cap. 1 (business.md dec. 6): si apre solo dal pannello di vittoria del capitolo, mai dopo
// una sconfitta né in battaglia. Un prodotto ("Sblocca tutto"), "Ripristina acquisto", "Continua a giocare gratis".
// Sotto si vede la mappa del mondo (bus.schermata = 'paywall'). Acquisti in piattaforma/acquisti.ts (oggi finti).
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { bus } from '../../core/bus';
import { T } from '../../testi/it';
import { ACQUISTI_FINTI, compra, prezzo, ripristina } from '../../piattaforma/acquisti';
import { Pannello, PulsanteKit } from '../kit';
import { segnaCompleto, tornaAlMenu } from './stato';

const P = T.carriera.paywall;
const prezzoMostrato = signal('1,99 €');
const occupato = signal(false);
const nota = signal('');

async function suCompra() {
  if (occupato.value) return;
  occupato.value = true;
  nota.value = '';
  const e = await compra();
  occupato.value = false;
  if (e === 'ok') segnaCompleto();
  else if (e === 'errore') nota.value = P.errore;
}

async function suRipristina() {
  if (occupato.value) return;
  occupato.value = true;
  nota.value = '';
  const ok = await ripristina();
  occupato.value = false;
  if (ok) { segnaCompleto(); nota.value = P.ripristinato; } else nota.value = P.nienteDaRipristinare;
}

export function Paywall() {
  useEffect(() => { nota.value = ''; void prezzo().then((p) => (prezzoMostrato.value = p)); }, []);
  const completo = bus.carriera.value?.completo ?? false;
  return (
    <div class="kit-scrim car-paywall-fondo" data-testid="car-paywall">
      <Pannello tipo="cornice" class="car-paywall" role="dialog" aria-modal="true" aria-labelledby="car-paywall-titolo">
        {completo ? (
          <>
            <h2 id="car-paywall-titolo" class="kit-titolo">{P.grazie}</h2>
            <p>{P.grazieTesto}</p>
            {nota.value && <p class="car-nota" role="status">{nota.value}</p>}
            <PulsanteKit id="car-paywall-menu" tipo="oro" onClick={tornaAlMenu}>{P.chiudi}</PulsanteKit>
          </>
        ) : (
          <>
            <h2 id="car-paywall-titolo" class="kit-titolo">{P.titolo}</h2>
            <div class="car-paywall-corpo">
            <div class="car-paywall-testo">
              <p>{P.testo}</p>
              <ul class="car-paywall-punti">{P.punti.map((x) => <li key={x}>⚓ {x}</li>)}</ul>
            </div>
            <div class="car-paywall-pulsanti">
              <PulsanteKit id="car-sblocca" tipo="oro" disabilitato={occupato.value} onClick={() => void suCompra()}
                sotto={occupato.value ? P.attendi : P.sbloccaSotto(prezzoMostrato.value)}>{P.sblocca}</PulsanteKit>
              <PulsanteKit id="car-gratis" tipo="legno" onClick={tornaAlMenu} sotto={P.gratisSotto}>{P.gratis}</PulsanteKit>
              <button type="button" id="car-ripristina" class="car-link" disabled={occupato.value} onClick={() => void suRipristina()}>{P.ripristina}</button>
            </div>
            </div>
            {nota.value && <p class="car-nota" role="status">{nota.value}</p>}
            {ACQUISTI_FINTI && <p class="car-nota car-prova">{P.prova}</p>}
          </>
        )}
      </Pannello>
    </div>
  );
}
