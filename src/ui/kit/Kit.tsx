// Componenti del kit UI dipinto (P2, Arte UI). Li usano il menu (App.tsx) e i pannelli della carriera
// (src/ui/carriera/, agente Campagna). Lo stile sta in kit.css; le immagini in public/assets/ui/.
import type { ComponentChildren, JSX } from 'preact';
import type { IdArma } from '../../core/tipi';
import { tocco } from '../../piattaforma/haptics';
import { T } from '../../testi/it';
import { ARMI_CON_ICONA, LATO_ICONA_ARMA, urlIconaArma } from './risorse';

export type TipoPannello = 'cornice' | 'legno' | 'pergamena';

/** Pannello a 9 fette. `cornice` = legno con dentro pergamena (mappa del mondo), `legno`, `pergamena`. */
export function Pannello(p: { tipo?: TipoPannello; class?: string; children?: ComponentChildren } & Omit<JSX.HTMLAttributes<HTMLElement>, 'class'>) {
  const { tipo = 'cornice', class: cls, children, ...resto } = p;
  return <section {...resto} class={`kit-pannello kit-${tipo} ${cls ?? ''}`}>{children}</section>;
}

/** Pulsante di legno. `oro` = azione principale (una sola per schermata). `sotto` = riga piccola sotto il nome. */
export function PulsanteKit(p: {
  onClick: () => void; children: ComponentChildren; tipo?: 'legno' | 'oro'; grande?: boolean;
  sotto?: ComponentChildren; id?: string; label?: string; disabilitato?: boolean; class?: string;
}) {
  return (
    <button type="button" id={p.id} aria-label={p.label} disabled={p.disabilitato}
      class={`kit-pulsante kit-${p.tipo ?? 'legno'} ${p.grande ? 'grande' : ''} ${p.class ?? ''}`}
      onClick={() => { tocco(); p.onClick(); }}>
      <span>{p.children}</span>
      {p.sotto && <span class="sotto">{p.sotto}</span>}
    </button>
  );
}

/** Pulsante tondo con medaglione di ottone (ingranaggio, indietro). Il testo va in `label` per i lettori di schermo. */
export function PulsanteTondo(p: { onClick: () => void; label: string; children: ComponentChildren; id?: string }) {
  return (
    <button type="button" id={p.id} class="kit-tondo" aria-label={p.label} onClick={() => { tocco(); p.onClick(); }}>
      {p.children}
    </button>
  );
}

/** Icona dipinta di un'arma (128 px). `bloccata` = grigia, per le armi non ancora prese. */
export function IconaArma(p: { arma: IdArma; dim?: number; bloccata?: boolean; class?: string }) {
  const d = p.dim ?? 48;
  return (
    <img class={`kit-icona-arma ${p.bloccata ? 'bloccata' : ''} ${p.class ?? ''}`} src={urlIconaArma(p.arma)}
      width={d} height={d} alt="" draggable={false} decoding="async"
      data-lato={LATO_ICONA_ARMA} />
  );
}

/** icona di un premio: id di un'arma (→ icona dipinta) oppure indirizzo di un'immagine (es. urlPremio(...)) */
function srcIcona(icona: string): string {
  return (ARMI_CON_ICONA as readonly string[]).includes(icona) ? urlIconaArma(icona as IdArma) : icona;
}

/**
 * Premi appena presi (uno o due per isola): nastro "Nuovo!", icone grandi con raggi e nome, nota facoltativa,
 * battuta facoltativa di un personaggio, pulsante oro. Il tasto indietro lo gestisce chi lo apre (chiama onChiudi).
 */
export function PannelloNuovo(p: {
  premi: { icona: string | IdArma; titolo: ComponentChildren }[];
  nota?: ComponentChildren; battuta?: { chi: ComponentChildren; testo: ComponentChildren };
  etichettaPulsante?: string; onChiudi: () => void; testid?: string; idPulsante?: string;
}) {
  return (
    <div class="kit-scrim" role="dialog" aria-modal="true" aria-label={T.kit.nuovo} data-testid={p.testid ?? 'car-premio'}>
      <Pannello tipo="cornice" class="kit-nuovo">
        <div class="kit-nastro">{T.kit.nuovo}</div>
        <div class="kit-nuovo-premi">
          {p.premi.map((x, i) => (
            <div class="kit-nuovo-premio" key={i}>
              <div class="kit-nuovo-icona"><span class="kit-raggi" aria-hidden="true" /><img src={srcIcona(x.icona)} width={104} height={104} alt="" draggable={false} /></div>
              <h2 class="kit-titolo">{x.titolo}</h2>
            </div>
          ))}
        </div>
        {p.nota && <p class="kit-nuovo-nota">{p.nota}</p>}
        {p.battuta && <p class="kit-nuovo-battuta"><b>{p.battuta.chi}:</b> {p.battuta.testo}</p>}
        <PulsanteKit id={p.idPulsante ?? 'car-premio-ok'} tipo="oro" onClick={p.onChiudi}>{p.etichettaPulsante ?? T.kit.continua}</PulsanteKit>
      </Pannello>
    </div>
  );
}

/** colori dei ritratti segnaposto (cerchio con l'iniziale) finché non ci sono i ritratti dipinti */
const COLORE_RITRATTO: Record<string, string> = {
  scarlatta: '#C8322A', gancio: '#6B4226', verbale: '#7C8794', bottoni: '#2E5FA8',
  rigidini: '#4A5260', spugna: '#2FA14A', bonaccia: '#22C7D9',
};

/** Ritratto di chi parla: per ora un medaglione col colore del personaggio e l'iniziale. */
export function Ritratto(p: { chiave: string; nome?: string; dim?: number }) {
  const d = p.dim ?? 64;
  const iniziale = (p.nome ?? p.chiave).trim().charAt(0).toUpperCase();
  return (
    <span class="kit-ritratto" data-ritratto={p.chiave} aria-hidden="true"
      style={{ width: `${d}px`, height: `${d}px`, fontSize: `${Math.round(d * 0.5)}px`, background: COLORE_RITRATTO[p.chiave] ?? '#8E5A30' }}>
      {iniziale}
    </span>
  );
}

/**
 * Battuta di una scena di copione su pergamena, in basso: ritratto e nome di chi parla, la battuta,
 * "Avanti" e "Salta". Un tocco sulla pergamena vale "Avanti".
 */
export function PergamenaScena(p: {
  ritratto: string; nome: ComponentChildren; testo: ComponentChildren;
  onAvanti: () => void; onSalta?: () => void; etichette?: { avanti?: string; salta?: string };
  testid?: string; idAvanti?: string; idSalta?: string;
}) {
  return (
    <div class="kit-scena" role="dialog" aria-live="polite" data-testid={p.testid ?? 'car-scena'}>
      {p.onSalta && (
        <PulsanteKit id={p.idSalta ?? 'car-salta'} class="kit-scena-salta" onClick={p.onSalta}>{p.etichette?.salta ?? T.kit.salta}</PulsanteKit>
      )}
      <Pannello tipo="pergamena" class="kit-scena-foglio" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; tocco(); p.onAvanti(); }}>
        <Ritratto chiave={p.ritratto} nome={typeof p.nome === 'string' ? p.nome : undefined} />
        <div class="kit-scena-corpo">
          <div class="kit-scena-chi">{p.nome}</div>
          <p class="kit-scena-testo">{p.testo}</p>
        </div>
        <PulsanteKit id={p.idAvanti ?? 'car-avanti'} tipo="oro" class="kit-scena-avanti" onClick={p.onAvanti}>{p.etichette?.avanti ?? T.kit.avanti} ›</PulsanteKit>
      </Pannello>
    </div>
  );
}
