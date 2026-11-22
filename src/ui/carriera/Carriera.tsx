// UI Preact della carriera sopra la scena del mondo: barra del round, pannello della fase, pannello d'attacco,
// scheda dell'isola, difesa, avvisi (banner, «Nuovo!», scene di copione) e fine capitolo.
// Testi in testi/it.ts › carriera. Regia in ./stato.ts. Finché la scena Pixi del mondo non c'è, sotto si vede la
// carta di prova (CartaDiProva.tsx).
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { bus } from '../../core/bus';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { CAMPAGNA } from '../../contenuti/campagna';
import * as R from '../../mondo/carriera/regole';
import { CartaDiProva, cartaDiProva } from './CartaDiProva';
import { Paywall } from './Paywall';
import { iconaPremio, testoPremio } from './premi';
import { PannelloNuovo, PergamenaScena, urlPremio } from '../kit';
import {
  annullaPreparazione, apriPaywall, avantiScena, avvisi, banner, CAP, cambiaImbarco, chiudiAvviso, chiudiScheda, confermaRinforzi, defIsola,
  difendi, fineTurno, lanciaAttacco, nomeIsola, partenzeAperte, preparazione, riprovaCapitolo, rigaScena, schedaIsola,
  selezionata, tornaAlMenu,
} from './stato';
import './carriera.css';

const C = T.carriera;

function Bottone(p: { onClick: () => void; children: ComponentChildren; tipo?: 'primario' | 'secondario' | 'icona'; id?: string; disabled?: boolean; label?: string }) {
  return (
    <button type="button" id={p.id} class={`btn ${p.tipo ?? 'secondario'}`} disabled={p.disabled} aria-label={p.label}
      onClick={() => { tocco(); p.onClick(); }}>
      {p.children}
    </button>
  );
}

// ─── Barra in alto ───────────────────────────────────────────────────────────────────────────────

function BarraRound() {
  const s = bus.carriera.value!;
  const mie = R.isoleDi(CAP, s, 'giocatore').length;
  return (
    <header class="car-barra">
      <Bottone tipo="icona" id="car-menu" label={C.menuPrincipale} onClick={tornaAlMenu}>‹</Bottone>
      <div class="car-round">
        <span class="car-capitolo">{C.capitoli[CAP.nome]}</span>
        <span>{C.round(s.round, CAP.limiteRound)} · {C.fasi[s.fase]}</span>
      </div>
      <div class="car-conto" aria-label={`${mie} / ${CAP.isole.length}`}>🚩 {mie}/{CAP.isole.length}</div>
    </header>
  );
}

// ─── Pannello della fase (in basso) ──────────────────────────────────────────────────────────────

function PannelloFase() {
  const s = bus.carriera.value!;
  if (s.fase === 'fine' || s.attacco || preparazione.value) return null;
  if (s.fase === 'rinforzi') {
    const bonus = R.regioniComplete(CAP, s).map((r) => C.regioni[CAP.regioni.find((x) => x.id === r)!.nome]);
    const bloccato = s.rinforzi > 0 && R.isoleRinforzabili(CAP, s).length === 0;
    return (
      <section class="car-fase" data-testid="car-rinforzi">
        <h2>{C.rinforziTitolo(s.rinforzi)}</h2>
        <p>{C.rinforziAiuto}</p>
        {bonus.length > 0 && <p class="car-nota">{C.rinforziBonus(bonus.join(', '))}</p>}
        {bloccato && <Bottone tipo="primario" id="car-fine-rinforzi" onClick={confermaRinforzi}>{C.rinforziFatto}</Bottone>}
      </section>
    );
  }
  if (s.fase === 'attacco') {
    const sel = selezionata.value;
    const nessuno = R.bersagli(CAP, s).length === 0;
    const stanchi = nessuno && s.usate.length > 0;
    return (
      <section class="car-fase" data-testid="car-attacco">
        <h2>{C.fasi.attacco}</h2>
        <p>{stanchi ? C.attaccoFatto : nessuno ? C.attaccoNessuno : sel ? C.attaccoAiutoDa(nomeIsola(sel)) : C.attaccoAiuto}</p>
        <Bottone tipo={nessuno ? 'primario' : 'secondario'} id="car-fine-turno" onClick={fineTurno}>{C.fineTurno}</Bottone>
      </section>
    );
  }
  return null;
}

// ─── Pannello d'attacco ──────────────────────────────────────────────────────────────────────────

function DettagliScontro({ isola }: { isola: string }) {
  const d = defIsola(isola);
  // le isole di partenza riprese dalla Marina si riattaccano con un Assalto
  const sc = d.scontro ?? { tipo: 'assalto' as const };
  return (
    <ul class="car-scontro">
      <li>{C.scontri[sc.tipo]}</li>
      {sc.notte && <li>{C.notte}</li>}
      {sc.bariliExtra ? <li>{C.barili(sc.bariliExtra)}</li> : null}
      {(sc.tipo === 'bandiera' || sc.tipo === 'duello') && <li class="car-nota">{C.sfidaNota}</li>}
      {sc.capo && <li class="car-capo">«{C.boss[0]}» · {C.personaggi.rigidini}</li>}
    </ul>
  );
}

function Premi({ isola }: { isola: string }) {
  const s = bus.carriera.value!;
  const d = defIsola(isola);
  if (!d.premi.length) return null;
  const preso = s.isole[isola]?.presa;
  return (
    <div class={`car-premi ${preso ? 'preso' : ''}`}>
      <span class="car-etichetta">{preso ? C.premioGiaPreso : C.premioIsola}</span>
      {d.premi.map((p, i) => <span key={i} class="car-premio">{iconaPremio(p)} {testoPremio(p)}</span>)}
    </div>
  );
}

function PannelloAttacco() {
  const p = preparazione.value;
  const s = bus.carriera.value!;
  const [errore, setErrore] = useState('');
  if (!p) return null;
  const partenze = partenzeAperte.value;
  const tot = partenze.reduce((n, d) => n + d.pirati, 0);
  const unito = partenze.filter((d) => d.pirati > 0).length > 1;
  const difensori = s.isole[p.verso].pirati;
  return (
    <div class="scrim" onClick={(e) => { if (e.target === e.currentTarget) annullaPreparazione(); }}>
      <section class="car-pergamena car-attacco" role="dialog" aria-modal="true" aria-labelledby="car-titolo-attacco" data-testid="car-pannello-attacco">
        <h2 id="car-titolo-attacco">{C.attaccaTitolo(nomeIsola(p.verso))}</h2>
        <p class="car-cartello">🪧 «{C.cartelli[p.verso]}»</p>
        <div class="car-colonne">
          <div>
            <DettagliScontro isola={p.verso} />
            <p class="car-difensori">⚓ {C.difensori(difensori)}</p>
            <Premi isola={p.verso} />
          </div>
          <div class="car-imbarco">
            <span class="car-etichetta">{C.partono}</span>
            {partenze.map((d) => (
              <div class="car-riga" key={d.isola}>
                <span class="car-nome">{nomeIsola(d.isola)}</span>
                <Bottone tipo="icona" label={C.menoUno} id={`car-meno-${d.isola}`} disabled={d.pirati <= 0}
                  onClick={() => { setErrore(''); cambiaImbarco(d.isola, -1); }}>−</Bottone>
                <span class="car-numero" data-testid={`car-imbarco-${d.isola}`}>{d.pirati}</span>
                <Bottone tipo="icona" label={C.piuUno} id={`car-piu-${d.isola}`} disabled={d.pirati >= d.max || tot >= CAP.piratiMaxPerLato}
                  onClick={() => { setErrore(''); cambiaImbarco(d.isola, 1); }}>+</Bottone>
                <span class="car-nota">{C.restanoACasa(s.isole[d.isola].pirati - d.pirati)}</span>
              </div>
            ))}
            <p class="car-totale">{C.totale(tot, CAP.piratiMaxPerLato)}</p>
            {unito && <p class="car-nota">{C.attaccoUnito}</p>}
            {errore && <p class="car-errore" role="alert">{errore}</p>}
          </div>
        </div>
        <footer>
          <Bottone id="car-annulla" onClick={annullaPreparazione}>{C.annulla}</Bottone>
          <Bottone tipo="primario" id="car-arrembaggio" disabled={tot === 0} onClick={() => setErrore(lanciaAttacco())}>{C.arrembaggio}</Bottone>
        </footer>
      </section>
    </div>
  );
}

// ─── Scheda dell'isola, difesa, avvisi ───────────────────────────────────────────────────────────

function SchedaIsola() {
  const x = schedaIsola.value;
  if (!x) return null;
  const s = bus.carriera.value!;
  const mia = s.isole[x.isola]?.padrone === 'giocatore';
  return (
    <section class="car-scheda" role="dialog" aria-label={nomeIsola(x.isola)} data-testid="car-scheda" onClick={chiudiScheda}>
      <h3>{nomeIsola(x.isola)}</h3>
      {!mia && <p class="car-cartello">🪧 «{C.cartelli[x.isola]}»</p>}
      {!mia && <DettagliScontro isola={x.isola} />}
      {!mia && <Premi isola={x.isola} />}
      {x.nota && <p class="car-nota">{x.nota}</p>}
    </section>
  );
}

function PannelloDifesa() {
  const s = bus.carriera.value!;
  const a = s.attacco;
  if (!a?.difesa || bus.richiestaBattaglia.value) return null;
  return (
    <div class="scrim">
      <section class="car-pergamena car-difesa" role="dialog" aria-modal="true" data-testid="car-difesa">
        <h2>{C.fasi.marina}</h2>
        <p>{C.marinaAttacca(a.da.map((d) => nomeIsola(d.isola)).join(', '), nomeIsola(a.verso))}</p>
        <p class="car-difensori">⚓ {C.difensori(a.da.reduce((n, d) => n + d.pirati, 0))} · 🏴‍☠️ {s.isole[a.verso].pirati}</p>
        <footer><Bottone tipo="primario" id="car-difendi" onClick={difendi}>{C.difendi}</Bottone></footer>
      </section>
    </div>
  );
}

function Avvisi() {
  const a = avvisi.value[0];
  if (!a) return null;
  if (a.t === 'premio') {
    const battuta = C.battutePremio[a.isola];
    return (
      <PannelloNuovo
        premi={a.premi.map((p) => ({ icona: p.t === 'arma' ? p.arma : urlPremio(p), titolo: testoPremio(p) }))}
        nota={a.premi.some((p) => p.t === 'mossa' || p.t === 'arma') ? C.premi.prestoInBattaglia : undefined}
        battuta={battuta ? { chi: C.personaggi[battuta.chi], testo: `«${battuta.testo}»` } : undefined}
        etichettaPulsante={C.avanti} onChiudi={chiudiAvviso} />
    );
  }
  const righe = C.scene[a.chiave] ?? [];
  const r = righe[rigaScena.value];
  if (!r) return null;
  return (
    <div class="scrim car-scena-fondo">
      <PergamenaScena ritratto={r.chi} nome={C.personaggi[r.chi]} testo={r.testo}
        onAvanti={avantiScena} onSalta={chiudiAvviso} etichette={{ avanti: C.avanti, salta: C.salta }} />
    </div>
  );
}

function FineCapitolo() {
  const s = bus.carriera.value!;
  const esito = R.esitoCapitolo(CAP, s);
  if (!esito || avvisi.value.length) return null;
  const vinto = esito === 'vinto';
  const stelle = vinto ? R.stelleCapitolo(s) : 0;
  const perIsole = R.isoleDi(CAP, s, 'giocatore').length === 0;
  return (
    <div class="scrim">
      <section class={`car-pergamena car-fine ${vinto ? 'vinto' : 'perso'}`} role="dialog" aria-modal="true" data-testid="car-fine">
        <h2>{vinto ? C.vintoTitolo : C.persoTitolo}</h2>
        {vinto ? (
          <>
            <p class="car-stelle" aria-label={`${stelle}/3`}>{'★'.repeat(stelle)}{'☆'.repeat(3 - stelle)}</p>
            <ul class="car-righe-stelle">
              <li class="ok">★ {C.stelleRighe.vinto}</li>
              <li class={s.round <= CAMPAGNA.stelle.roundVeloce ? 'ok' : ''}>★ {C.stelleRighe.veloce(CAMPAGNA.stelle.roundVeloce)}</li>
              <li class={s.perditeSfide <= CAMPAGNA.stelle.perditeSfideMax ? 'ok' : ''}>★ {C.stelleRighe.sfide}</li>
            </ul>
            {s.completo && <p class="car-nota">{C.prossimamente}</p>}
          </>
        ) : <p>{perIsole ? C.persoIsole : C.persoRound(CAP.limiteRound)}</p>}
        <footer>
          <Bottone id="car-fine-menu" onClick={tornaAlMenu}>{C.menuPrincipale}</Bottone>
          <Bottone tipo={vinto ? 'secondario' : 'primario'} id="car-riprova" onClick={riprovaCapitolo}>{vinto ? C.rigioca : C.riprova}</Bottone>
          {vinto && !s.completo && <Bottone tipo="primario" id="car-continua-viaggio" onClick={apriPaywall}>{C.continuaViaggio}</Bottone>}
        </footer>
      </section>
    </div>
  );
}

/** Tutto quello che la carriera mostra quando bus.schermata è 'mondo' o 'scena'. */
export function Carriera() {
  const s = bus.carriera.value;
  if (!s) return null;
  if (bus.schermata.value === 'paywall') return <Paywall />;
  // con un pannello grande aperto la barra e il pannello della fase si nascondono (a 360 px di altezza non c'è posto)
  const modale = !!preparazione.value || avvisi.value.length > 0 || (s.attacco?.difesa ?? false) || s.fase === 'fine';
  return (
    <>
      {cartaDiProva.value && <CartaDiProva />}
      <main class="ui car-ui" key="carriera" data-testid="carriera">
        {!modale && <BarraRound />}
        {!modale && <PannelloFase />}
        {!modale && <SchedaIsola />}
      </main>
      <PannelloAttacco />
      <PannelloDifesa />
      <FineCapitolo />
      <Avvisi />
      {banner.value && <div class="car-banner" role="status" data-testid="car-banner">{banner.value}</div>}
    </>
  );
}
