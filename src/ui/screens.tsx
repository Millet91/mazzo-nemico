import { useState } from 'preact/hooks';
import { act, set, useStore, get } from './store';
import { Art, Btn, DefChip, DefenseCard, DeckCardView } from './components';
import { DeckList, TopBar, DeckPanel } from './board';
import { allies, basamentoCost, eventChoices, ownedIds } from '../core/run';
import { minDeck } from '../core/wave';
import { ENEMIES } from '../content/enemies';
import { DEFENSES } from '../content/defenses';
import { ACT_NAMES, P, slotNames } from '../content/config';
import { BOSS_TEXT, DAWN_LINES, EVENTS } from '../content/meta';
import { MAP_NODE_ART, sceneArt } from '../assets/registry';
import { sfx } from '../assets/audio';
import type { RunState } from '../core/types';
import { inkFor } from './profile';

const NODE_LABEL: Record<string, string> = { ondata: 'Rintocco', elite: 'Élite', negozio: 'Il Mercante', riposo: 'Il Focolare', evento: 'Evento', mazziere: 'Mazziere' };

// ------------------------------------------------------------------ mappa
export function MapScreen() {
  const s = useStore();
  const run = s.run!;
  const bt = BOSS_TEXT[run.act];
  return (
    <div class="screen map">
      <TopBar run={run} />
      <DeckPanel run={run} />
      {s.showDeck && <div class="drawer"><DeckList run={run} /></div>}
      <h2 class="almanac">{run.cfg.tutorial ? ACT_NAMES[0] : `${ACT_NAMES[run.act]} · ${['', 'prima', 'seconda', 'terza'][run.act]} veglia`}</h2>
      {!run.cfg.tutorial && bt && (
        <div class="bossbanner"><Art a={sceneArt(bt.id)} /><div><b>Alla fine della veglia: {bt.name}</b> · <i>“{bt.rule}”</i><div class="small-label">{bt.ruleText}{run.cfg.sigillo >= 5 ? ' ' + bt.variant : ''}</div></div></div>
      )}
      <ol class="mapcol" reversed>
        {[...run.map].map((lv, li) => ({ lv, li })).reverse().map(({ lv, li }) => {
          const reachable = li === run.level;
          const past = li < run.level;
          return (
            <li key={li} class={`maplevel ${reachable ? 'now' : ''} ${past ? 'past' : ''}`}>
              <span class="lvn">{li + 1}</span>
              {lv.map((n) => (
                <button type="button" key={n.id} class={`mapnode k-${n.kind}`} disabled={!reachable} onClick={() => { sfx('ui'); act({ t: 'map', node: n.id }); }}
                  aria-label={`${NODE_LABEL[n.kind]}${n.eventId ? ': ' + EVENTS.find((e) => e.id === n.eventId)?.name : ''}`}>
                  <Art a={MAP_NODE_ART[n.kind]} />
                  <span>{NODE_LABEL[n.kind]}</span>
                  {(n.kind === 'ondata' || n.kind === 'elite') && !run.cfg.tutorial && <span class="small-label">+{(P.ADDS[run.act] ?? 2) + (run.cfg.sigillo >= 2 ? 1 : 0)} carte</span>}
                </button>
              ))}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ------------------------------------------------------------------ riepilogo d'ondata
export function SummaryScreen() {
  const s = useStore();
  const run = s.run!;
  const sm = run.lastSummary!;
  const mvp = sm.mvp ? DEFENSES[sm.mvp]?.name ?? sm.mvp : '—';
  return (
    <div class="screen summary">
      <TopBar run={run} />
      <h2>{sm.dmg === 0 ? 'Rintocco respinto!' : `Rintocco ${sm.rintocco}: −${sm.dmg} Lumi`}</h2>
      <div class="sumgrid">
        <div><span class="small-label">Lumi</span><b>{sm.lumiBefore} → {sm.lumiAfter}</b></div>
        <div><span class="small-label">Spiccioli guadagnati</span><b>+{sm.gained}</b></div>
        <div><span class="small-label">Distrutte</span><b>{sm.destroyed.length}</b></div>
        <div><span class="small-label">Arrivate alla Soglia</span><b>{sm.arrived.length}</b></div>
        <div><span class="small-label">MVP</span><b>{mvp}</b></div>
        <div><span class="small-label">Più pericolosa</span><b>{sm.dangerous ?? '—'}</b></div>
        <div><span class="small-label">Tick</span><b>{sm.ticks}</b></div>
      </div>
      {sm.stolen.length > 0 && <p class="bad">Perso: il Segno {sm.stolen.join(', ')} è stato rubato. Lo riprendi distruggendo o esiliando il ladro, o con il Riscatto al negozio.</p>}
      {sm.betrayed.length > 0 && <p class="bad">Tradimento: {sm.betrayed.join(', ')} torna dal Fato con +2 Forza.</p>}
      {sm.limit && <p class="bad">Il mazzo è collassato per il limite di tick (bug di design da segnalare).</p>}
      {sm.arrived.length > 0 && <p class="small-label">Alla Soglia: {sm.arrived.join(', ')}</p>}
      <div class="row main-actions">
        {s.lastOut && <Btn onClick={() => set({ review: { out: s.lastOut!, idx: 0, playing: true, asso: null, assoMode: null, pauses: 0 } })}>Rivedi ondata</Btn>}
        <Btn kind="primary" onClick={() => act({ t: 'continue' })}>Continua ▶</Btn>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Patto
export function PattoScreen() {
  const s = useStore();
  const run = s.run!;
  const [dissolve, setDissolve] = useState<number | null>(null);
  const al = allies(run);
  const full = al.length >= P.PATTI_MAX;
  const lealta = run.cfg.baro === 'bracconiera' ? 5 : P.LEALTA;
  return (
    <div class="screen patto">
      <TopBar run={run} />
      <h2>Il Momento del Patto</h2>
      <p>Scegli una sventura distrutta in questo rintocco: resta nel Mazzo del Fato ma combatte per te, come Infiltrato. Ha Lealtà {lealta}: perde 1 Lealtà a ogni ondata in cui è pescata, e a 0 ti tradisce con +2 Forza. Oppure prendi {P.PATTO_RIFIUTO} Spiccioli.</p>
      {full && (
        <div class="pending">
          <p>Hai già {P.PATTI_MAX} Patti: per stringerne un altro devi scioglierne uno.</p>
          <div class="row">{al.map((a) => <Btn key={a.uid} small kind={dissolve === a.uid ? 'gold' : undefined} onClick={() => setDissolve(a.uid)}>Sciogli {ENEMIES[a.def].name} (Lealtà {a.lealta})</Btn>)}</div>
        </div>
      )}
      <div class="cands">
        {(run.pattoCands ?? []).filter((c, k, arr) => arr.findIndex((x) => x.def === c.def) === k).map((c) => {
          const d = ENEMIES[c.def];
          return (
            <div class="cand" key={c.uid}>
              <DeckCardView def={c.def} owner="baro" lealta={lealta} />
              <div class="cand-info">
                <b>{d.name}</b>
                <div><b>Girata:</b> {d.girataText} All’Impatto ti cura 1 Lume.</div>
                <div class="small-label">Se tradisce: torna nemica con Forza {d.forza + 2} (Corrotta).</div>
                <Btn kind="gold" disabled={full && !dissolve} onClick={() => { sfx('patto'); act({ t: 'patto', uid: c.uid, dissolve: dissolve ?? undefined }); }}>Stringi il Patto</Btn>
              </div>
            </div>
          );
        })}
      </div>
      <div class="row main-actions"><Btn onClick={() => act({ t: 'patto', uid: null })}>Prendi {P.PATTO_RIFIUTO} Spiccioli</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ Forestiero
export function ForestieroScreen() {
  const s = useStore();
  const run = s.run!;
  const f = run.boss!.forestiero!;
  const [keep, setKeep] = useState<string | null>(null);
  const [give, setGive] = useState<string | null>(null);
  const turned = (id: string) => {
    const fam = DEFENSES[id].family;
    if (fam === 'trucco') return 'Girato: il Forestiero pesca 1 carta in più per fase.';
    if (fam === 'rito') return 'Girato: impone la Discesa al posto del tuo Rito.';
    const cnt = run.def.segni.map((x) => x.length);
    const order = [4, 3, 2, 1, 0].filter((i) => !run.boss!.contro.includes(i)).sort((x, y) => cnt[y] - cnt[x] || y - x);
    return `Girato: Contro-segno sul ${slotNames(5)[order[0] ?? 4]}, i tuoi Segni lì tacciono.`;
  };
  return (
    <div class="screen forestiero">
      <TopBar run={run} />
      <div class="bossbanner"><Art a={sceneArt('forestiero')} /><div><b>Il Forestiero</b>, fase {run.boss!.phase + 1}: <i>“Finalmente un collega. Facciamo a metà?”</i></div></div>
      <p>Una difesa la tieni per sempre, una va a lui per tutto lo scontro e si gira contro di te, la terza si scarta.</p>
      <div class="offer-cards">
        {f.ids.map((id) => (
          <div key={id} class="fcard">
            <DefenseCard id={id} selected={keep === id || give === id} />
            <div class="turned">{turned(id)}</div>
            <div class="row">
              <Btn small kind={keep === id ? 'gold' : undefined} onClick={() => { setKeep(id); if (give === id) setGive(null); }}>Tienila</Btn>
              <Btn small kind={give === id ? 'danger' : undefined} onClick={() => { setGive(id); if (keep === id) setKeep(null); }}>Dalla a lui</Btn>
            </div>
          </div>
        ))}
      </div>
      <div class="row main-actions"><Btn kind="primary" disabled={!keep || !give} onClick={() => act({ t: 'forestiero', keep: keep!, give: give! })}>Facciamo a metà</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ esilio a scelta
export function ExileScreen() {
  const s = useStore();
  const run = s.run!;
  const ep = run.exilePick!;
  return (
    <div class="screen exile">
      <TopBar run={run} />
      <h2>Esilia {ep.n} {ep.n === 1 ? 'carta' : 'carte'} ({ep.reason})</h2>
      <p class="small-label">Le carte esiliate escono per sempre dal Mazzo del Fato. Il mazzo non può scendere sotto {minDeck(run)} carte.</p>
      <DeckList run={run} onPick={(uid) => act({ t: 'exilePick', uid })} pickLabel="Esilia" filter={() => run.deck.length > minDeck(run)} />
      <div class="row main-actions"><Btn onClick={() => act({ t: 'exileDone' })}>Basta così</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ negozio
export function ShopScreen() {
  const s = useStore();
  const run = s.run!;
  const sh = run.shop!;
  const [tab, setTab] = useState<'difese' | 'mazzo' | 'servizi' | 'vendi'>('difese');
  const al = allies(run);
  const owned = ownedIds(run).filter((x) => !run.def.stolen.some((y) => y.segno === x));
  return (
    <div class="screen shop">
      <TopBar run={run} />
      <h2><Art a={sceneArt('negozio')} /> Il Mercante Ambulante</h2>
      <div class="tabs" role="tablist">
        {(['difese', 'mazzo', 'servizi', 'vendi'] as const).map((t) => <button type="button" role="tab" aria-selected={tab === t} key={t} class={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{{ difese: 'Difese', mazzo: 'Esilio', servizi: 'Servizi', vendi: 'Vendi' }[t]}</button>)}
      </div>
      {tab === 'difese' && (
        <div>
          <div class="offer-cards">
            {sh.items.map((it, k) => (
              <DefenseCard key={it.id + k} id={it.id} extra={<div class="row"><Btn small kind="gold" disabled={it.sold || run.sp < it.price} onClick={() => { sfx('coin'); act({ t: 'buy', index: k }); }}>{it.sold ? 'Venduta' : `Compra ${it.price} ¢`}</Btn></div>} />
            ))}
          </div>
          <p class="small-label">I Segni comprati vanno su un Passo libero o nel Deposito: li sposti in Preparazione.</p>
          <Btn small disabled={run.sp < P.REROLL} onClick={() => act({ t: 'shopReroll' })}>Rinnova la merce (3 ¢)</Btn>
        </div>
      )}
      {tab === 'mazzo' && (
        <div>
          <p>Esilio: {sh.exileCost} ¢ (sale di 5 a ogni uso). Minimo del mazzo: {minDeck(run)} carte.</p>
          <DeckList run={run} onPick={(uid) => act({ t: 'exile', uid })} pickLabel={`Esilia ${sh.exileCost} ¢`} filter={() => run.sp >= sh.exileCost && run.deck.length > minDeck(run)} />
        </div>
      )}
      {tab === 'servizi' && (
        <div class="services">
          <div class="svc"><b>Cura</b>: +{P.HEAL_AMT} Lumi <Btn small disabled={run.lumi >= run.maxLumi || run.sp < (run.cfg.sigillo >= 4 ? 12 : P.HEAL_COST)} onClick={() => act({ t: 'heal' })}>{run.cfg.sigillo >= 4 ? 12 : P.HEAL_COST} ¢</Btn></div>
          <div class="svc"><b>Basamento</b>: un secondo Segno su un Passo ({basamentoCost(run)} ¢)
            <div class="row">{slotNames(5).map((n, i) => <Btn small key={i} disabled={run.def.cap[i] > 1 || run.sp < basamentoCost(run)} onClick={() => act({ t: 'basamento', slot: i })}>{n}</Btn>)}</div>
          </div>
          {al.map((a) => (
            <div class="svc" key={a.uid}><b>{ENEMIES[a.def].name}</b> (Lealtà {a.lealta})
              <Btn small disabled={run.sp < P.RINSALDA} onClick={() => act({ t: 'rinsalda', uid: a.uid })}>Rinsalda +2 ({P.RINSALDA} ¢)</Btn>
              <Btn small kind="danger" onClick={() => act({ t: 'sciogli', uid: a.uid })}>Sciogli</Btn>
            </div>
          ))}
          {run.def.stolen.map((st) => (
            <div class="svc" key={st.segno}><b>Riscatto</b>: {DEFENSES[st.segno].name} <Btn small disabled={run.sp < P.RISCATTO} onClick={() => act({ t: 'riscatto', segno: st.segno })}>{P.RISCATTO} ¢</Btn></div>
          ))}
        </div>
      )}
      {tab === 'vendi' && (
        <div class="row wrap">
          {owned.map((id) => <div key={id} class="svc"><DefChip id={id} label plus={run.def.plus.includes(id)} /> <Btn small onClick={() => act({ t: 'sell', id })}>Vendi {Math.floor(P.PRICE[DEFENSES[id].rarity] / 2)} ¢</Btn></div>)}
        </div>
      )}
      <div class="row main-actions"><Btn kind="primary" onClick={() => act({ t: 'leave' })}>Riparti ▶</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ riposo
export function RestScreen() {
  const s = useStore();
  const run = s.run!;
  const [aff, setAff] = useState(false);
  const heal = Math.round(run.maxLumi * (run.cfg.sigillo >= 3 ? 0.2 : P.REST_HEAL));
  const owned = ownedIds(run).filter((x) => !run.def.plus.includes(x) && !run.def.stolen.some((y) => y.segno === x));
  return (
    <div class="screen rest">
      <TopBar run={run} />
      <h2><Art a={sceneArt('riposo')} /> Il Focolare</h2>
      {!aff ? (
        <div class="choices">
          <Btn kind="gold" onClick={() => act({ t: 'rest', choice: 'cura' })}>Curare: +{heal} Lumi</Btn>
          <Btn onClick={() => setAff(true)} disabled={!owned.length}>Affinare: una difesa diventa +</Btn>
          <Btn onClick={() => act({ t: 'rest', choice: 'studia' })}>Studiare: vedi le prime 5 carte della prossima Coda</Btn>
        </div>
      ) : (
        <div>
          <p>Quale difesa affini?</p>
          <div class="offer-cards">{owned.map((id) => <DefenseCard key={id} id={id} plus onClick={() => act({ t: 'rest', choice: 'affina', id })} />)}</div>
          <Btn kind="ghost" onClick={() => setAff(false)}>Indietro</Btn>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ eventi
export function EventScreen() {
  const s = useStore();
  const run = s.run!;
  const e = run.event!;
  const ev = EVENTS.find((x) => x.id === e.id)!;
  const [argFor, setArgFor] = useState<string | null>(null);
  const choices = eventChoices(run);
  const al = allies(run);
  const ch = choices.find((c) => c.id === argFor);
  const owned = ownedIds(run).filter((x) => !run.def.stolen.some((y) => y.segno === x));
  return (
    <div class="screen event">
      <TopBar run={run} />
      <h2><Art a={sceneArt('ev_' + e.id)} /> {ev.name}</h2>
      <p class="eventtext">{e.step === 1 ? 'Il pozzo ha ascoltato. Scegli con chi stringere il Patto.' : ev.text}</p>
      {!ch && (
        <div class="choices">
          {choices.map((c) => (
            <Btn key={c.id} kind={c.id === 'no' ? 'ghost' : undefined} disabled={!c.enabled} onClick={() => (c.arg ? setArgFor(c.id) : act({ t: 'event', choice: c.id }))}>{c.label}</Btn>
          ))}
        </div>
      )}
      {ch && (
        <div class="pending">
          {ch.arg === 'ally' && <div class="row">{al.map((a) => <Btn key={a.uid} onClick={() => act({ t: 'event', choice: ch.id, arg: a.uid })}>{ENEMIES[a.def].name} (Lealtà {a.lealta})</Btn>)}</div>}
          {ch.arg === 'defense' && <div class="row wrap">{owned.map((id) => <DefChip key={id} id={id} label onClick={() => act({ t: 'event', choice: ch.id, arg: id })} />)}</div>}
          {ch.arg === 'segnoDeposito' && <div class="row wrap">{run.def.deposito.filter((x) => DEFENSES[x].family === 'segno').map((id) => <DefChip key={id} id={id} label onClick={() => act({ t: 'event', choice: ch.id, arg: id })} />)}</div>}
          {ch.arg === 'slot' && <div class="row">{slotNames(5).map((n, i) => <Btn key={i} disabled={run.def.cap[i] > 1} onClick={() => act({ t: 'event', choice: ch.id, arg: i })}>{n}</Btn>)}</div>}
          {ch.arg === 'cand' && <div class="cands">{(e.data.cands as number[]).map((u) => { const c = run.deck.find((x) => x.uid === u); if (!c) return null; return <div class="cand" key={u}><DeckCardView def={c.def} /><div class="cand-info"><b>{ENEMIES[c.def].name}</b><div>{ENEMIES[c.def].girataText}</div><Btn kind="gold" onClick={() => act({ t: 'event', choice: ch.id, arg: u })}>Patto</Btn></div></div>; })}</div>}
          {e.step === 0 && <Btn kind="ghost" onClick={() => setArgFor(null)}>Indietro</Btn>}
        </div>
      )}
      {e.step === 1 && !ch && <Btn onClick={() => setArgFor('scegli')}>Scegli</Btn>}
    </div>
  );
}

// ------------------------------------------------------------------ fine run: il Quaderno della Notte
export function dawnLine(run: RunState): string {
  if (!run.won) return DAWN_LINES.lose;
  const lostAny = run.history.some((h) => h.dmg > 0);
  if (!lostAny) return DAWN_LINES.perfect;
  if (run.lumi <= 3) return DAWN_LINES.close;
  if (run.stats.patti >= 4) return DAWN_LINES.patti;
  if (run.stats.exiled >= 5) return DAWN_LINES.exile;
  if (ownedIds(run).length <= 6) return DAWN_LINES.barehands;
  return DAWN_LINES.generic;
}

export function EndScreen() {
  const s = useStore();
  const run = s.run!;
  const link = replayLink();
  return (
    <div class={`screen end ${run.won ? 'won' : 'lost'}`}>
      <h2>{run.cfg.tutorial ? 'La Prova è superata' : run.won ? 'All’alba il gallo canta' : 'L’ultimo Lume si è spento'}</h2>
      {!run.cfg.tutorial && <p class="dawn">Il Mazziere raccoglie le carte: <i>“{dawnLine(run)}”</i></p>}
      {s.news.length > 0 && <ul class="news">{s.news.map((n) => <li key={n}>{n}</li>)}</ul>}
      {!run.cfg.tutorial && (
        <>
          <div class="sumgrid">
            <div><span class="small-label">Rintocco</span><b>{run.rintocco}</b></div>
            <div><span class="small-label">Lumi</span><b>{run.lumi}/{run.maxLumi}</b></div>
            <div><span class="small-label">Sventure distrutte</span><b>{run.stats.killed}</b></div>
            <div><span class="small-label">Patti</span><b>{run.stats.patti}</b></div>
            <div><span class="small-label">Esiliate</span><b>{run.stats.exiled}</b></div>
            <div><span class="small-label">Inchiostro</span><b>+{inkFor(run)}</b></div>
          </div>
          <h3>Il Quaderno della Notte</h3>
          <div class="quaderno">{run.chronicle.map((c, k) => <p key={k}>{c.text}</p>)}</div>
          <p class="small-label">Seed: <code>{run.cfg.seed}</code> · <button type="button" class="chiplink" onClick={() => copy(link)}>Copia il link del replay</button></p>
        </>
      )}
      <div class="row main-actions">
        <Btn kind="primary" onClick={() => set({ screen: 'title', run: null, playback: null, review: null })}>Torna al titolo</Btn>
      </div>
    </div>
  );
}

export function replayLink(): string {
  const s = get();
  if (!s.cfg) return '';
  const data = btoa(unescape(encodeURIComponent(JSON.stringify({ c: s.cfg, a: s.actions }))));
  const base = typeof location !== 'undefined' ? location.href.split('#')[0].split('?')[0] : '';
  return `${base}#replay=${data}`;
}

export function copy(text: string) {
  try {
    void navigator.clipboard.writeText(text);
    set({ toast: 'Copiato' });
    setTimeout(() => set({ toast: null }), 1500);
  } catch {
    set({ toast: text });
  }
}
