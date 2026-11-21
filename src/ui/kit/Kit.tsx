// Componenti del kit UI dipinto (P2, Arte UI). Li usano il menu (App.tsx) e i pannelli della carriera
// (src/ui/carriera/, agente Campagna). Lo stile sta in kit.css; le immagini in public/assets/ui/.
import type { ComponentChildren, JSX } from 'preact';
import type { IdArma } from '../../core/tipi';
import { tocco } from '../../piattaforma/haptics';
import { LATO_ICONA_ARMA, urlIconaArma } from './risorse';

export type TipoPannello = 'cornice' | 'legno' | 'pergamena';

/** Pannello a 9 fette. `cornice` = legno con dentro pergamena (mappa del mondo), `legno`, `pergamena`. */
export function Pannello(p: { tipo?: TipoPannello; class?: string; children?: ComponentChildren } & Omit<JSX.HTMLAttributes<HTMLElement>, 'class'>) {
  const { tipo = 'cornice', class: cls, children, ...resto } = p;
  return <section {...resto} class={`kit-pannello ${tipo} ${cls ?? ''}`}>{children}</section>;
}

/** Pulsante di legno. `oro` = azione principale (una sola per schermata). `sotto` = riga piccola sotto il nome. */
export function PulsanteKit(p: {
  onClick: () => void; children: ComponentChildren; tipo?: 'legno' | 'oro'; grande?: boolean;
  sotto?: ComponentChildren; id?: string; label?: string; disabilitato?: boolean; class?: string;
}) {
  return (
    <button type="button" id={p.id} aria-label={p.label} disabled={p.disabilitato}
      class={`kit-pulsante ${p.tipo ?? 'legno'} ${p.grande ? 'grande' : ''} ${p.class ?? ''}`}
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
