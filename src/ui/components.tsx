import type { ComponentChildren } from 'preact';
import { ENEMIES, KEYWORDS, girataFull, type Kw } from '../content/enemies';
import { DEFENSES } from '../content/defenses';
import { enemyArt, defenseArt, SEME_ASSET, sceneArt, type VisualAsset } from '../assets/registry';
import type { SnapCard } from '../core/types';
import { set } from './store';

/** Mostra un asset: l'immagine definitiva se c'è nel registro, altrimenti il glifo segnaposto. */
export function Art({ a, cls = '', label }: { a: VisualAsset; cls?: string; label?: string }) {
  if (a.image) return <img class={`art ${cls}`} src={a.image} alt={label ?? ''} draggable={false} />;
  return <span class={`art glyph ${cls}`} aria-hidden="true">{a.glyph}</span>;
}

export function Btn(p: { onClick?: () => void; children: ComponentChildren; kind?: 'primary' | 'ghost' | 'danger' | 'gold'; disabled?: boolean; title?: string; cls?: string; small?: boolean }) {
  return (
    <button type="button" class={`btn ${p.kind ?? ''} ${p.small ? 'small' : ''} ${p.cls ?? ''}`} onClick={p.onClick} disabled={p.disabled} title={p.title}>
      {p.children}
    </button>
  );
}

export function cardLabel(c: { name: string; forza: number; seme: string; kw: string[]; ally?: boolean; cor?: number }) {
  const kws = c.kw.map((k) => KEYWORDS[k as Kw]?.name ?? k).join(', ');
  return `${c.name}${c.ally ? ' (tuo Patto)' : ''}, ${c.seme}, Forza ${c.forza}${kws ? ', ' + kws : ''}${c.cor ? `, Corazza ${c.cor}` : ''}`;
}

/** Carta nemica in gioco (snapshot). */
export function CardView({ c, small, onClick, highlight }: { c: SnapCard; small?: boolean; onClick?: () => void; highlight?: boolean }) {
  const d = ENEMIES[c.def];
  const seme = SEME_ASSET[c.seme];
  return (
    <button
      type="button"
      class={`card seme-${c.seme} ${c.ally ? 'ally' : ''} ${c.corrotto ? 'corrotto' : ''} ${c.tier === 'b' ? 'boss' : ''} ${c.tier === 'e' ? 'elite' : ''} ${c.tier === 't' ? 'token' : ''} ${small ? 'small' : ''} ${highlight ? 'hl' : ''}`}
      onClick={onClick ?? (() => set({ inspect: { kind: 'enemy', id: c.def } }))}
      aria-label={cardLabel(c)}
    >
      <span class="forza">{Math.max(0, c.forza)}</span>
      <span class="seme" aria-hidden="true">{seme.glyph}</span>
      <Art a={enemyArt(c.def)} cls="card-art" label={d?.name} />
      {!small && <span class="cname">{c.name}</span>}
      <span class="kws" aria-hidden="true">
        {c.kw.filter((k) => k !== 'corazza').slice(0, 3).map((k) => <span key={k} class="kw" title={KEYWORDS[k as Kw]?.name}>{KEYWORDS[k as Kw]?.icon ?? k}</span>)}
      </span>
      <span class="states" aria-hidden="true">
        {c.cor > 0 && <span class="st cor">⛨{c.cor}</span>}
        {c.burn > 0 && <span class="st burn">🔥{c.burn}</span>}
        {c.frozen > 0 && <span class="st frost">❄</span>}
        {c.night && <span class="st night">☾</span>}
        {c.rancore > 0 && <span class="st rancore">{'•'.repeat(c.rancore)}</span>}
        {c.bottino && <span class="st loot">⬡</span>}
      </span>
    </button>
  );
}

export function CardBack({ n }: { n?: number }) {
  return (
    <div class="card back small" aria-label="carta coperta">
      <Art a={sceneArt('mazzo')} cls="card-art" />
      <span class="q">?</span>
      {n !== undefined && <span class="cnt">{n}</span>}
    </div>
  );
}

/** Carta del mazzo (persistente) mostrata nei pannelli. */
export function DeckCardView({ def, forza, owner, lealta, corrotto, rancore, bottino, onClick, sub }: { def: string; forza?: number; owner?: string; lealta?: number; corrotto?: boolean; rancore?: number; bottino?: string | null; onClick?: () => void; sub?: ComponentChildren }) {
  const d = ENEMIES[def];
  const c: SnapCard = {
    wid: 0, uid: null, def, name: d.name, seme: d.seme, forza: forza ?? d.forza + (rancore ?? 0) + (corrotto ? 2 : 0), cor: d.kw.corazza ?? 0, burn: 0, frozen: 0,
    ally: owner === 'baro', kw: Object.keys(d.kw), tier: d.tier, night: false, bottino: bottino ?? null, rancore: rancore ?? 0, corrotto: !!corrotto,
  };
  return (
    <div class="deckcard">
      <CardView c={c} small onClick={onClick} />
      {owner === 'baro' && <span class="lealta" title="Lealtà">⛓{lealta}</span>}
      {sub}
    </div>
  );
}

export function familyShape(f: string) {
  return f === 'segno' ? 'hex' : f === 'trucco' ? 'rombo' : f === 'rito' ? 'cerchio' : 'patto';
}

/** Sigillo di una difesa (forma = famiglia). */
export function DefChip({ id, plus, onClick, selected, dim, label, contro }: { id: string; plus?: boolean; onClick?: () => void; selected?: boolean; dim?: boolean; label?: boolean; contro?: boolean }) {
  const d = DEFENSES[id];
  return (
    <button
      type="button"
      class={`defchip ${familyShape(d.family)} ${selected ? 'sel' : ''} ${dim ? 'dim' : ''} ${contro ? 'contro' : ''} rar-${d.rarity}`}
      onClick={onClick ?? (() => set({ inspect: { kind: 'defense', id } }))}
      aria-label={`${d.name}${plus ? '+' : ''}: ${plus ? d.plus : d.text}${contro ? ' (Contro-segno: non agisce)' : ''}`}
      aria-pressed={selected}
    >
      <span class="shape"><Art a={defenseArt(id)} /></span>
      {label && <span class="dname">{d.name}{plus ? '+' : ''}</span>}
      {plus && !label && <span class="plus">+</span>}
    </button>
  );
}

export function DefenseCard({ id, onClick, selected, extra, plus }: { id: string; onClick?: () => void; selected?: boolean; extra?: ComponentChildren; plus?: boolean }) {
  const d = DEFENSES[id];
  const fam = { segno: 'Segno', trucco: 'Trucco', rito: 'Rito' }[d.family];
  return (
    <button type="button" class={`defcard ${selected ? 'sel' : ''} rar-${d.rarity}`} onClick={onClick} aria-pressed={selected}>
      <div class="defcard-head">
        <span class={`defchip ${familyShape(d.family)} static`}><span class="shape"><Art a={defenseArt(id)} /></span></span>
        <div>
          <div class="dname">{d.name}{plus ? '+' : ''}</div>
          <div class="dmeta">{fam} · {{ C: 'Comune', NC: 'Non comune', R: 'Rara' }[d.rarity]}</div>
        </div>
      </div>
      <div class="dtext">{plus ? `${d.text} Potenziata: ${d.plus}` : d.text}</div>
      {d.backlash && <div class="dback">Contraccolpo: {d.backlash}</div>}
      {extra}
    </button>
  );
}

export function Modal({ onClose, children, title }: { onClose: () => void; children: ComponentChildren; title?: string }) {
  return (
    <div class="modal-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {children}
        <div class="modal-foot"><Btn onClick={onClose}>Chiudi</Btn></div>
      </div>
    </div>
  );
}

export function Inspect() {
  return null;
}

export function EnemyDetails({ id, why }: { id: string; why?: string[] }) {
  const d = ENEMIES[id];
  if (!d) return null;
  return (
    <div class="details">
      <div class="det-row">
        <DeckCardView def={id} />
        <div>
          <div class="det-name">{d.name}</div>
          <div class="det-meta">{d.seme} · Forza {d.forza} · {d.tier === 'e' ? 'Élite' : d.tier === 'b' ? 'Mazziere' : d.tier === 't' ? 'Gettone' : `Atto ${d.act}`}</div>
          {d.flavor && <div class="flavor">“{d.flavor}”</div>}
        </div>
      </div>
      {Object.entries(d.kw).map(([k, n]) => (
        <div class="kwline" key={k}><b>{KEYWORDS[k as Kw].icon} {KEYWORDS[k as Kw].name}{(n as number) > 1 ? ` ${n}` : ''}</b>: {KEYWORDS[k as Kw].text(n as number)}</div>
      ))}
      {!Object.keys(d.kw).length && <div class="kwline">Nessuna abilità.</div>}
      {d.girataText && <div class="girata"><b>Se diventa tuo Patto (girata):</b> {girataFull(id)}</div>}
      {d.role && <div class="role">Ruolo: {d.role}</div>}
      {why && why.length > 0 && (
        <div class="why"><b>Perché?</b><ol>{why.map((w, i) => <li key={i}>{w}</li>)}</ol></div>
      )}
    </div>
  );
}

export function DefenseDetails({ id, plus }: { id: string; plus?: boolean }) {
  const d = DEFENSES[id];
  return (
    <div class="details">
      <DefenseCard id={id} plus={plus} />
      <div class="kwline"><b>Potenziata (+):</b> {d.plus}</div>
      <div class="flavor">“{d.flavor}”</div>
    </div>
  );
}

export function Lumi({ lumi, max }: { lumi: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (lumi / max) * 100));
  return (
    <div class="lumi" role="meter" aria-valuenow={lumi} aria-valuemin={0} aria-valuemax={max} aria-label={`Lumi ${lumi} su ${max}`}>
      <Art a={sceneArt('lume')} />
      <div class="lumi-bar"><div class="lumi-fill" style={{ width: `${pct}%` }} /></div>
      <span class="lumi-n">{lumi}/{max}</span>
    </div>
  );
}
