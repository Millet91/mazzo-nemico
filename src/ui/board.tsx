import { useEffect, useMemo, useRef } from 'preact/hooks';
import { get, set, useStore, act, beginWave, finishWave, useAsso, toast } from './store';
import { Art, Btn, CardBack, CardView, DefChip, DefenseCard, DeckCardView, Lumi } from './components';
import { WaveSim, truccatoCandidates } from '../core/wave';
import { forecast, meanDamage } from '../core/forecast';
import { visibleQueue, allies, gainDefenseClone } from './runhelpers';
import { ENEMIES, SEMI, type Seme } from '../content/enemies';
import { DEFENSES } from '../content/defenses';
import { ACT_NAMES, slotNames } from '../content/config';
import { BOSS_TEXT } from '../content/meta';
import { TUTORIAL } from '../content/tutorial';
import { sceneArt, SEME_ASSET } from '../assets/registry';
import { sfx } from '../assets/audio';
import type { Ev, RunState, Snap, SnapCard } from '../core/types';

// ------------------------------------------------------------------ barra in alto
export function TopBar({ run, lumi, sp }: { run: RunState; lumi?: number; sp?: number }) {
  const act = run.cfg.tutorial ? ACT_NAMES[0] : ACT_NAMES[run.act];
  return (
    <header class={`topbar act-${run.act}`}>
      <button type="button" class="btn ghost small" onClick={() => set({ menu: true })} aria-label="Menu">☰</button>
      <div class="tb-act">
        <b>{act}</b>
        <span>Rintocco {run.rintocco}{run.cfg.sigillo ? ` · Sigillo ${run.cfg.sigillo}` : ''}</span>
      </div>
      <Lumi lumi={lumi ?? run.lumi} max={run.maxLumi} />
      <div class="sp" aria-label={`Spiccioli ${sp ?? run.sp}`}><Art a={sceneArt('spicciolo')} /> {sp ?? run.sp}</div>
    </header>
  );
}

// ------------------------------------------------------------------ pannello del mazzo
export function DeckPanel({ run }: { run: RunState }) {
  const s = useStore();
  const fato = run.deck.filter((x) => x.owner === 'fato');
  const bySeme: Record<string, number> = {};
  for (const c of fato) bySeme[ENEMIES[c.def].seme] = (bySeme[ENEMIES[c.def].seme] ?? 0) + 1;
  const s7 = run.cfg.sigillo >= 7;
  const al = allies(run);
  return (
    <section class="deckpanel" aria-label="Mazzo del Fato">
      <button type="button" class="deck-pile" onClick={() => set({ showDeck: !s.showDeck })} aria-expanded={s.showDeck}>
        <Art a={sceneArt('mazzo')} />
        <b>{run.deck.length}</b>
        <span class="small-label">carte</span>
      </button>
      <div class="deck-info">
        <div class="semi">
          {SEMI.map((se) => (
            <span key={se} class={`semebadge seme-${se}`} title={se}>{SEME_ASSET[se].glyph} {bySeme[se] ?? 0}</span>
          ))}
        </div>
        {run.announced.length > 0 && (
          <div class="announced">
            <span class="small-label">Il Fato aggiunge:</span>
            {run.announced.map((u) => {
              const c = run.deck.find((x) => x.uid === u);
              if (!c) return null;
              return s7 ? <span key={u} class={`semebadge seme-${ENEMIES[c.def].seme}`}>{SEME_ASSET[ENEMIES[c.def].seme].glyph} ?</span> : (
                <button type="button" key={u} class="chiplink" onClick={() => set({ inspect: { kind: 'enemy', id: c.def } })}>+{ENEMIES[c.def].name}</button>
              );
            })}
          </div>
        )}
      </div>
      <div class="trucchi" aria-label="Trucchi">
        {Array.from({ length: run.def.tsock }, (_, k) => run.def.trucchi[k]).map((t, k) =>
          t ? <DefChip key={t} id={t} plus={run.def.plus.includes(t)} selected={s.selected === t} onClick={() => selectDef(t)} /> : <span key={k} class="defchip rombo empty" aria-label="posto Trucco vuoto"><span class="shape" /></span>,
        )}
      </div>
      {al.length > 0 && (
        <div class="patti" aria-label="Patti">
          {al.map((a) => (
            <button type="button" key={a.uid} class="defchip patto" onClick={() => set({ inspect: { kind: 'enemy', id: a.def, extra: `Lealtà ${a.lealta}` } })} aria-label={`Patto: ${ENEMIES[a.def].name}, Lealtà ${a.lealta}`}>
              <span class="shape">{ENEMIES[a.def].name.split(' ').pop()?.slice(0, 3)}</span><span class="plus">{a.lealta}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function DeckList({ run, onPick, pickLabel, filter }: { run: RunState; onPick?: (uid: number) => void; pickLabel?: string; filter?: (uid: number) => boolean }) {
  const groups = new Map<string, typeof run.deck>();
  for (const c of [...run.deck].sort((a, b) => ENEMIES[a.def].seme.localeCompare(ENEMIES[b.def].seme) || a.def.localeCompare(b.def))) {
    const k = `${c.def}|${c.owner}|${c.rancore}|${c.corrotto}|${c.bottino}|${c.lealta}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }
  return (
    <div class="decklist">
      {[...groups.values()].map((g) => {
        const c = g[0];
        const ok = !filter || filter(c.uid);
        return (
          <div class="deckrow" key={c.uid}>
            <DeckCardView def={c.def} owner={c.owner} lealta={c.lealta} corrotto={c.corrotto} rancore={c.rancore} bottino={c.bottino} />
            <div class="deckrow-info">
              <b>{g.length}× {ENEMIES[c.def].name}</b>
              <span>{c.owner === 'baro' ? `tuo Patto, Lealtà ${c.lealta}` : ''}{c.rancore ? ` Rancore +${c.rancore}` : ''}{c.corrotto ? ' Corrotto +2' : ''}{c.bottino ? ` porta il tuo ${DEFENSES[c.bottino].name}` : ''}{run.def.marked.includes(c.uid) ? ' · segnata' : ''}</span>
            </div>
            {onPick && <Btn small disabled={!ok} onClick={() => onPick(c.uid)}>{pickLabel ?? 'Scegli'}</Btn>}
          </div>
        );
      })}
    </div>
  );
}

function selectDef(id: string) {
  const s = get();
  if (s.run?.phase !== 'prep' && s.run?.phase !== 'offer') { set({ inspect: { kind: 'defense', id } }); return; }
  set({ selected: s.selected === id ? null : id });
}

// ------------------------------------------------------------------ Fila
export function Lane({ run, snap, ev, playing }: { run: RunState; snap: Snap | null; ev: Ev | null; playing: boolean }) {
  const s = useStore();
  const spec = run.wave?.spec;
  const L = snap ? snap.lane.length : spec?.L ?? 5;
  const off = L - 5;
  const names = slotNames(L);
  const segni: string[][] = snap ? snap.segni : Array.from({ length: L }, (_, i) => (i - off >= 0 ? run.def.segni[i - off] : []));
  const contro = new Set((spec?.contro ?? []).map((b) => b + off));
  const cards: { c: SnapCard; i: number }[] = [];
  if (snap) snap.lane.forEach((c, i) => c && cards.push({ c, i }));
  const vertical = s.settings.layout === 'verticale' || (s.settings.layout === 'auto' && typeof window !== 'undefined' && window.innerWidth < 560);
  const pb = s.playback;
  const clickSlot = (i: number) => {
    const b = i - off;
    if (pb?.assoMode) {
      if (pb.assoMode === 'scambia' && (i + 1 >= L || !snap?.lane[i] || !snap?.lane[i + 1])) { toast('Scegli una carta che ha un’altra carta subito davanti'); return; }
      if (pb.assoMode === 'trattieni' && !snap?.lane[i]) { toast('Scegli un Passo con una carta'); return; }
      useAsso(pb.assoMode, i);
      return;
    }
    if (playing) return;
    if (b < 0) return;
    if (s.pending && s.pending.family === 'segno') {
      sfx('pick');
      act({ t: 'pick', id: s.pending.id, slot: b });
      return;
    }
    if (s.selected && DEFENSES[s.selected].family === 'segno') {
      sfx('pick');
      act({ t: 'place', id: s.selected, slot: b });
    }
  };
  const target = !!(s.pending?.family === 'segno' || (s.selected && DEFENSES[s.selected]?.family === 'segno') || pb?.assoMode);
  return (
    <section class={`lane ${vertical ? 'v' : 'h'} ${target ? 'targeting' : ''}`} style={{ '--L': L } as never} aria-label="La Fila: i Passi verso la Soglia">
      {names.map((n, i) => {
        const hl = ev && ev.slot === i && ['segno', 'damage', 'block', 'freeze', 'burn', 'rimando', 'exile', 'silence'].includes(ev.k);
        return (
          <div key={i} class={`slot ${hl ? 'hl' : ''} ${i >= L - 1 ? 'uscio' : ''} ${contro.has(i) ? 'contro' : ''} ${i < off ? 'flood' : ''}`} style={{ '--i': i } as never}>
            <button type="button" class="slot-hit" onClick={() => clickSlot(i)} aria-label={`${n}${segni[i]?.length ? ', Segni: ' + segni[i].map((x) => DEFENSES[x].name).join(', ') : ''}`} />
            <span class="slot-name">{n}</span>
            <div class="slot-segni">
              {(segni[i] ?? []).map((sg) => (
                <DefChip key={sg} id={sg} plus={run.def.plus.includes(sg)} selected={s.selected === sg} contro={contro.has(i)} onClick={() => (playing ? set({ inspect: { kind: 'defense', id: sg } }) : selectDef(sg))} />
              ))}
              {i - off >= 0 && run.def.cap[i - off] > 1 && <span class="basamento" title="Basamento: 2 Segni">▣</span>}
            </div>
          </div>
        );
      })}
      <div class="lane-cards">
        {cards.map(({ c, i }) => (
          <div key={c.wid} class="lane-card" style={{ '--i': i } as never}>
            <CardView c={c} highlight={!!(ev && ev.wid === c.wid)} onClick={() => set({ inspect: { kind: 'enemy', id: c.def, why: s.playback?.out.why[c.wid] ?? s.review?.out.why[c.wid] } })} />
          </div>
        ))}
        {ev?.float && (
          <div key={`f${s.playback?.idx ?? s.review?.idx}`} class={`float ${ev.float.color}`} style={{ '--i': ev.float.slot } as never}>{ev.float.text}</div>
        )}
      </div>
      <div class={`door ${ev?.k === 'impact' ? 'hit' : ''}`} aria-hidden="true"><Art a={sceneArt('porta')} /></div>
    </section>
  );
}

// ------------------------------------------------------------------ Coda
export function Queue({ run, queue, playing, revealExtra }: { run: RunState; queue: SnapCard[]; playing: boolean; revealExtra?: number }) {
  const vis = Math.max(visibleQueue(run), revealExtra ?? 0);
  const showLast = run.def.trucchi.includes('oracolo');
  const rito = run.wave?.spec.bossRito ? { id: run.wave.spec.bossRito, imposed: true } : run.def.rito ? { id: run.def.rito.id, imposed: false } : null;
  const bambini = run.intel.bambini > 0 && !playing ? strongest(queue) : -1;
  return (
    <section class="queue" aria-label={`Coda: ${queue.length} carte`}>
      <div class="rito-slot">
        {rito ? <DefChip id={rito.id} plus={run.def.plus.includes(rito.id)} contro={rito.imposed} onClick={() => selectDef(rito.id)} /> : <span class="defchip cerchio empty"><span class="shape" /></span>}
        {run.def.rito?.seme && !rito?.imposed && <span class={`semebadge seme-${run.def.rito.seme}`}>{SEME_ASSET[run.def.rito.seme].glyph}</span>}
      </div>
      <div class="queue-cards">
        {queue.length === 0 && <span class="small-label">Coda vuota</span>}
        {queue.map((c, k) => {
          const shown = k < vis || (showLast && k === queue.length - 1) || k === bambini;
          return <div key={c.wid} class={`qslot ${k === bambini ? 'bambini' : ''}`}>{shown ? <CardView c={c} small /> : <CardBack />}</div>;
        })}
      </div>
      <span class="qcount">{queue.length}</span>
    </section>
  );
}

function strongest(q: SnapCard[]) {
  let b = -1;
  q.forEach((c, k) => { if (!c.ally && (b < 0 || c.forza > q[b].forza)) b = k; });
  return b;
}

// ------------------------------------------------------------------ vista di gioco
export function RunBoard() {
  const s = useStore();
  const run = s.run!;
  const pb = s.playback ?? s.review;
  const playing = !!pb;
  const ev = pb ? pb.out.events[Math.min(pb.idx, pb.out.events.length - 1)] : null;
  const preview = useMemo(() => {
    if (!run.wave || (run.phase !== 'prep' && run.phase !== 'offer' && run.phase !== 'forestiero')) return null;
    try {
      return new WaveSim(structuredClone(run), run.wave.spec, run.wave.seed, null, true).preview();
    } catch {
      return null;
    }
  }, [run]);
  const snap = ev?.snap ?? null;
  const queue = snap ? snap.queue : preview?.queue ?? [];
  return (
    <div class="board">
      <TopBar run={run} lumi={snap?.lumi} sp={snap?.sp} />
      {run.boss && <BossBanner run={run} />}
      {run.cfg.tutorial && run.phase !== 'summary' && <TutorialHint run={run} />}
      <DeckPanel run={run} />
      {s.showDeck && <div class="drawer"><DeckList run={run} /></div>}
      <Queue run={run} queue={queue} playing={playing} revealExtra={pb?.out.revealExtra} />
      <Lane run={run} snap={snap} ev={ev} playing={playing} />
      <div class="panel">
        {s.playback ? <PlaybackPanel /> : s.review ? <PlaybackPanel review /> : run.phase === 'offer' ? <OfferPanel /> : run.phase === 'prep' ? <PrepPanel /> : null}
      </div>
    </div>
  );
}

function BossBanner({ run }: { run: RunState }) {
  const b = run.boss!;
  const t = BOSS_TEXT[b.act];
  return (
    <div class="bossbanner">
      <Art a={sceneArt(t.id)} />
      <div>
        <b>{t.name}</b> · fase {b.phase + 1} di 3 · <i>“{t.rule}”</i>
        <div class="small-label">{t.ruleText}{run.cfg.sigillo >= 5 ? ' ' + t.variant : ''}</div>
      </div>
    </div>
  );
}

function TutorialHint({ run }: { run: RunState }) {
  const t = TUTORIAL[run.tutorialStep];
  if (!t) return null;
  return <div class="tuthint"><b>{t.title}.</b> {t.hint}</div>;
}

// ------------------------------------------------------------------ offerta 1 tra 3
function OfferPanel() {
  const s = useStore();
  const run = s.run!;
  const o = run.offer!;
  const deltas = useMemo(() => {
    if (s.settings.istinto || !run.wave || o.ids.length > 4) return null;
    try {
      const base = meanDamage(run, 16);
      const r: Record<string, number> = {};
      for (const id of o.ids) {
        const c = gainDefenseClone(run, id);
        r[id] = c ? meanDamage(c, 16) - base : 0;
      }
      return r;
    } catch {
      return null;
    }
  }, [run]);
  const pick = (id: string) => {
    const d = DEFENSES[id];
    if (d.family === 'segno' && id !== 'bastione') { set({ pending: { id, family: 'segno' } }); return; }
    if (d.family === 'trucco' && id !== 'rogoArchivio' && run.def.trucchi.length >= run.def.tsock) { set({ pending: { id, family: 'trucco' } }); return; }
    if (d.family === 'rito' && d.needsSeme) { set({ pending: { id, family: 'rito' } }); return; }
    sfx('pick');
    act({ t: 'pick', id });
  };
  const title = { ondata: 'Scegli una difesa', rara: 'Ricompensa dell’élite: una difesa rara', mazziere: 'Il Mazziere è battuto: scegli una difesa', evento: 'Scegli una difesa rara', tutorial: 'Prendi la difesa', forestiero: '' }[o.source];
  return (
    <div class="offer">
      <h3>{title}</h3>
      {s.pending ? (
        <PendingPlacement />
      ) : (
        <>
          <div class="offer-cards">
            {o.ids.map((id) => (
              <DefenseCard key={id} id={id} onClick={() => pick(id)} extra={deltas && deltas[id] !== undefined ? <Delta d={deltas[id]} /> : null} />
            ))}
          </div>
          <div class="row">
            {o.canSkip && <Btn onClick={() => act({ t: 'pick', id: null })}>Salta {o.source === 'ondata' ? '(+3 Spiccioli)' : ''}</Btn>}
            {o.source !== 'tutorial' && <Btn onClick={() => act({ t: 'reroll' })}>Rimescola ({run.freeRerolls > 0 ? 'gratis' : '3 ¢'})</Btn>}
          </div>
        </>
      )}
    </div>
  );
}

function Delta({ d }: { d: number }) {
  const v = Math.round(d * 10) / 10;
  return <div class={`delta ${v < 0 ? 'good' : v > 0 ? 'bad' : ''}`}>Δ previsione: {v > 0 ? '+' : ''}{v.toFixed(1)} Lumi persi</div>;
}

function PendingPlacement() {
  const s = useStore();
  const run = s.run!;
  const p = s.pending!;
  const d = DEFENSES[p.id];
  const cancel = <Btn kind="ghost" onClick={() => set({ pending: null })}>Annulla</Btn>;
  if (p.family === 'segno')
    return (
      <div class="pending">
        <p>Tocca un Passo della Fila per piazzare <b>{d.name}</b>. Se il Passo è pieno, il Segno che c’era va nel Deposito.</p>
        <div class="row">
          <Btn onClick={() => act({ t: 'pick', id: p.id })}>Piazza dove c’è posto</Btn>
          {cancel}
        </div>
      </div>
    );
  if (p.family === 'trucco')
    return (
      <div class="pending">
        <p>I posti Trucco sono pieni. Quale Trucco va nel Deposito?</p>
        <div class="row">
          {run.def.trucchi.map((t, k) => <Btn key={t} onClick={() => act({ t: 'pick', id: p.id, replace: k })}>Sostituisci {DEFENSES[t].name}</Btn>)}
          {cancel}
        </div>
      </div>
    );
  return (
    <div class="pending">
      <p>Scegli il seme per <b>{d.name}</b>:</p>
      <div class="row">
        {SEMI.map((se) => <Btn key={se} onClick={() => act({ t: 'pick', id: p.id, seme: se })}>{SEME_ASSET[se].glyph} {se}</Btn>)}
        {cancel}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Preparazione
function PrepPanel() {
  const s = useStore();
  const run = s.run!;
  const fc = useMemo(() => (s.settings.istinto ? null : forecast(run, 40)), [run, s.settings.istinto]);
  const sel = s.selected ? DEFENSES[s.selected] : null;
  const dep = run.def.deposito;
  const inDep = s.selected ? dep.includes(s.selected) : false;
  const truccCands = useMemo(() => (run.def.trucchi.includes('truccato') ? truccatoCandidates(run) : []), [run]);
  return (
    <div class="prep">
      {fc && (
        <div class={`forecast ${fc.exact ? 'exact' : ''}`} aria-live="polite">
          <b>Previsione:</b> {fc.exact ? `perderai ${fc.lo} Lumi` : fc.hi === 0 ? 'nessun Lume perso' : `da ${fc.lo} a ${fc.hi} Lumi persi`}
          {fc.warnings.length > 0 && <ul class="warns">{fc.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        </div>
      )}
      {sel && (
        <div class="selbar">
          <span>Selezionato: <b>{sel.name}</b>. {sel.family === 'segno' ? 'Tocca un Passo per spostarlo.' : ''}</span>
          <div class="row">
            {sel.family === 'trucco' && inDep && Array.from({ length: run.def.tsock }, (_, k) => (
              <Btn small key={k} onClick={() => act({ t: 'setTrucco', id: s.selected!, index: k })}>Nel posto {k + 1}{run.def.trucchi[k] ? ` (al posto di ${DEFENSES[run.def.trucchi[k]].name})` : ''}</Btn>
            ))}
            {sel.family === 'rito' && inDep && <Btn small onClick={() => act({ t: 'setRito', id: s.selected! })}>Usa questo Rito</Btn>}
            {!inDep && <Btn small onClick={() => act({ t: 'unplace', id: s.selected! })}>Metti nel Deposito</Btn>}
            <Btn small kind="ghost" onClick={() => set({ inspect: { kind: 'defense', id: s.selected! } })}>Dettagli</Btn>
            <Btn small kind="ghost" onClick={() => set({ selected: null })}>Annulla</Btn>
          </div>
        </div>
      )}
      {run.def.rito && DEFENSES[run.def.rito.id].needsSeme && (
        <div class="row seme-pick" aria-label="Seme del Rito">
          <span class="small-label">{DEFENSES[run.def.rito.id].name}:</span>
          {SEMI.map((se) => <Btn small key={se} kind={run.def.rito?.seme === se ? 'gold' : undefined} onClick={() => act({ t: 'setSeme', seme: se as Seme })}>{SEME_ASSET[se].glyph}</Btn>)}
        </div>
      )}
      {run.def.trucchi.includes('truccato') && truccCands.length > 0 && (
        <div class="truccato">
          <span class="small-label">Mazzo Truccato: le prossime carte in cima. Tocca quelle da mandare in fondo (max {run.def.plus.includes('truccato') ? 3 : 2}).</span>
          <div class="row">
            {truccCands.map((c) => {
              const on = (run.def.truccato ?? []).includes(c.uid);
              return <Btn small key={c.uid} kind={on ? 'gold' : undefined} onClick={() => {
                const cur = run.def.truccato ?? [];
                act({ t: 'truccato', uids: on ? cur.filter((x) => x !== c.uid) : [...cur, c.uid] });
              }}>{ENEMIES[c.def].name}</Btn>;
            })}
          </div>
        </div>
      )}
      {run.def.trucchi.includes('segnare') && (
        <div class="small-label">Segnare: {run.def.marked.map((u) => ENEMIES[run.deck.find((x) => x.uid === u)?.def ?? '']?.name).filter(Boolean).join(', ') || 'nessuna carta'}. <button type="button" class="chiplink" onClick={() => set({ showDeck: true })}>Cambia dal mazzo</button></div>
      )}
      {s.showDeck && run.def.trucchi.includes('segnare') && <DeckList run={run} onPick={(uid) => act({ t: 'mark', uid })} pickLabel="Segna" />}
      <div class="deposito" aria-label="Deposito">
        <span class="small-label">Deposito {dep.length ? '' : '(vuoto)'}</span>
        <div class="row">{dep.map((id) => <DefChip key={id} id={id} label plus={run.def.plus.includes(id)} selected={s.selected === id} onClick={() => selectDef(id)} />)}</div>
        {run.def.stolen.length > 0 && <div class="small-label">Rubati: {run.def.stolen.map((x) => DEFENSES[x.segno].name).join(', ')}</div>}
      </div>
      <div class="row main-actions">
        <Btn kind="primary" onClick={beginWave}>Avvia {run.boss ? `la fase ${run.boss.phase + 1}` : 'il rintocco'} ▶</Btn>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ riproduzione
const DUR: Record<string, number> = {
  start: 500, tick: 90, move: 260, enter: 240, segno: 170, damage: 170, block: 200, destroy: 260, impact: 520, fizzle: 120,
  freeze: 200, steal: 700, exile: 420, rimando: 380, ability: 260, copy: 220, herald: 380, heal: 220, coins: 110, burn: 180,
  silence: 360, collapse: 800, end: 600, asso: 500, info: 200, defeat: 1200,
};

function cue(e: Ev, L: number, combo: number) {
  switch (e.k) {
    case 'tick': sfx('pulse'); break;
    case 'move': sfx('step', { slot: Math.floor(L / 2), L }); break;
    case 'enter': sfx('enter', { slot: 0, L }); break;
    case 'damage': sfx('hit', { slot: e.slot, L, combo }); break;
    case 'block': sfx('block', { slot: e.slot, L }); break;
    case 'destroy': sfx('kill', { slot: e.slot, L, combo }); break;
    case 'impact': sfx('impact'); break;
    case 'steal': sfx('steal', { slot: e.slot, L }); break;
    case 'silence': sfx('silence'); break;
    case 'coins': sfx('coin'); break;
    case 'heal': sfx('heal'); break;
    case 'freeze': sfx('freeze', { slot: e.slot, L }); break;
    case 'burn': sfx('burn'); break;
    case 'herald': sfx('herald'); break;
    case 'asso': sfx('asso'); break;
    case 'exile': case 'rimando': sfx('kill', { slot: e.slot, L, combo: 7 }); break;
    case 'defeat': sfx('defeat'); break;
  }
}

function PlaybackPanel({ review }: { review?: boolean }) {
  const s = useStore();
  const run = s.run!;
  const pb = (review ? s.review : s.playback)!;
  const key = review ? 'review' : 'playback';
  const evs = pb.out.events;
  const ev = evs[Math.min(pb.idx, evs.length - 1)];
  const combo = useRef(0);
  const speed = s.settings.speed >= 99 ? 8 : s.settings.speed;
  const upd = (p: Partial<typeof pb>) => set({ [key]: { ...pb, ...p } } as never);
  const done = () => (review ? set({ review: null }) : finishWave());
  useEffect(() => {
    if (!pb.playing) return;
    if (pb.idx >= evs.length - 1) {
      const t = setTimeout(done, 700 / speed);
      return () => clearTimeout(t);
    }
    const cur = evs[pb.idx];
    let d = (DUR[cur.k] ?? 160) / speed;
    if (cur.important && speed <= 2) d += 120;
    if (s.settings.reduceMotion) d = Math.max(d, 120);
    const t = setTimeout(() => {
      const nx = evs[pb.idx + 1];
      if (nx.t !== cur.t) combo.current = 0;
      if (nx.k === 'damage' || nx.k === 'destroy') combo.current++;
      cue(nx, nx.snap.lane.length, combo.current);
      // pausa sugli eventi importanti nelle prime 3 ondate (max 3 per ondata)
      const pauseHere = !review && s.settings.pauseImportant && run.rintocco <= 3 && pb.pauses < 3 && ['impact', 'steal', 'herald', 'silence', 'copy'].includes(nx.k);
      upd({ idx: pb.idx + 1, playing: !pauseHere, pauses: pb.pauses + (pauseHere ? 1 : 0) });
    }, d);
    return () => clearTimeout(t);
  }, [pb.idx, pb.playing, speed]);
  const recent = evs.slice(Math.max(0, pb.idx - 5), pb.idx + 1).filter((e) => e.k !== 'tick' && e.k !== 'move');
  const assoAvail = !review && run.cfg.asso && !pb.asso && ev.k !== 'end' && ev.k !== 'defeat';
  return (
    <div class="playback">
      <div class="pb-status">Tick {ev.t} · {pb.playing ? 'in corso' : pb.pauses > 0 && ['impact', 'steal', 'herald', 'silence', 'copy'].includes(ev.k) ? 'pausa su un evento importante: guarda la Fila, poi premi ▶' : 'in pausa'}{pb.asso ? ' · Asso usato' : ''}</div>
      <ol class="log" aria-live="polite" aria-label="Registro dell'ondata">
        {recent.map((e, k) => <li key={k} class={`log-${e.k} ${e.important ? 'imp' : ''}`}>{e.msg}</li>)}
      </ol>
      {pb.assoMode && <div class="asso-hint">Asso nella manica: tocca {pb.assoMode === 'trattieni' ? 'il Passo della carta da trattenere' : 'la carta da scambiare con quella subito davanti'}. <button type="button" class="chiplink" onClick={() => upd({ assoMode: null })}>Annulla</button></div>}
      <div class="row controls">
        <Btn small onClick={() => upd({ idx: Math.max(0, prevTick(evs, pb.idx)), playing: false })} title="Tick indietro">⏮</Btn>
        <Btn small kind="gold" onClick={() => upd({ playing: !pb.playing })} title="Play/pausa">{pb.playing ? '⏸' : '▶'}</Btn>
        <Btn small onClick={() => upd({ idx: Math.min(evs.length - 1, nextTick(evs, pb.idx)), playing: false })} title="Tick avanti">⏭</Btn>
        {[1, 2, 4, 99].map((v) => (
          <Btn small key={v} kind={s.settings.speed === v ? 'gold' : undefined} onClick={() => set({ settings: { ...s.settings, speed: v } })}>{v === 99 ? '⚡' : `${v}×`}</Btn>
        ))}
        <Btn small onClick={done}>Fine ⏩</Btn>
      </div>
      {assoAvail && (
        <div class="row asso">
          <span class="small-label">Asso nella manica:</span>
          <Btn small onClick={() => upd({ playing: false, assoMode: 'trattieni' })}>✋ Trattieni</Btn>
          <Btn small onClick={() => upd({ playing: false, assoMode: 'scambia' })}>⇄ Scambia</Btn>
        </div>
      )}
    </div>
  );
}

function nextTick(evs: Ev[], i: number) {
  const t = evs[i].t;
  const k = evs.findIndex((e, j) => j > i && e.t > t);
  return k < 0 ? evs.length - 1 : k;
}
function prevTick(evs: Ev[], i: number) {
  const t = evs[i].t;
  for (let j = i - 1; j >= 0; j--) if (evs[j].t < t - 0 && evs[j].k === 'tick' && evs[j].t <= t - 1) return j;
  return 0;
}
