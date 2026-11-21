// Le due facce di carta del gioco: il nemico (in fila) e il tuo trucco (in mano).
// Grafica provvisoria: colore + emoji. Per sostituirla basta cambiare ARTE in arte.ts.
import { CARTE, CartaId, NEMICI, NemicoId } from '../game/carte';
import { Nemico } from '../game/regole';
import { arteNemico, arteCarta } from './arte';

export interface NemicoProps {
  n: Nemico | { id: NemicoId; forza: number; smascherato?: boolean; veleno?: boolean };
  stato?: '' | 'ok' | 'no' | 'esce';
  etichetta?: string | null;
  rubabile?: boolean;
  piccola?: boolean;
  onClick?: () => void;
}

export function CartaNemico({ n, stato = '', etichetta, rubabile, piccola, onClick }: NemicoProps) {
  const def = NEMICI[n.id];
  const base = def.forza;
  const ferito = n.forza < base;
  return (
    <div
      class={`cn ${stato} ${piccola ? 'piccola' : ''} ${n.id === 'mazziere' ? 'boss' : ''}`}
      style={{ '--col': def.colore } as any}
      onClick={onClick}
    >
      <div class="cn-nome">{def.nome}</div>
      <div class="cn-arte">{arteNemico(n.id)}</div>
      <div class={`forza ${ferito ? 'ferito' : ''} ${n.forza > base ? 'forte' : ''}`} title="Forza">
        {n.forza}
      </div>
      {def.abil && (
        <div class={`cn-abil ${n.smascherato ? 'spenta' : ''}`}>{def.abil}</div>
      )}
      {n.veleno && <div class="tag-veleno">🧪</div>}
      {rubabile && !etichetta && <div class="tag-ruba">🫳 Rubabile</div>}
      {etichetta && <div class="tag-mossa">{etichetta}</div>}
      {stato === 'esce' && <div class="tag-esce">Esce: −{n.id === 'barile' && !n.smascherato ? 5 : n.forza} ❤</div>}
    </div>
  );
}

export interface CartaProps {
  id: CartaId;
  sel?: boolean;
  spenta?: boolean;
  nuova?: boolean;
  grande?: boolean;
  onClick?: () => void;
  style?: any;
}

export function CartaMia({ id, sel, spenta, nuova, grande, onClick, style }: CartaProps) {
  const def = CARTE[id];
  return (
    <div
      class={`cm ${def.tipo} ${sel ? 'sel' : ''} ${spenta ? 'spenta' : ''} ${nuova ? 'nuova' : ''} ${grande ? 'grande' : ''}`}
      onClick={onClick}
      style={style}
    >
      <div class="cm-costo" title="Costo in fiche">{def.costo}</div>
      <div class="cm-nome">{def.nome}</div>
      <div class="cm-arte">{arteCarta(id)}</div>
      <div class="cm-testo">{def.testo}</div>
      {def.da && <div class="cm-da">rubata a {NEMICI[def.da].nome}</div>}
      {nuova && <div class="cm-nuova">NUOVA</div>}
    </div>
  );
}
