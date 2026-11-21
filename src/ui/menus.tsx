import { useState } from 'preact/hooks';
import { act, get, set, startRun, resumeSave, updateProfile, updateSettings, useStore, toast } from './store';
import { Art, Btn, DefChip, DeckCardView, Modal, EnemyDetails, DefenseDetails } from './components';
import { defaultConfig, replay } from '../core/run';
import { BARI, SIGILLI, BOSS_TEXT, EVENTS } from '../content/meta';
import { ENEMIES } from '../content/enemies';
import { DEFENSES, ALL_DEFENSE_IDS, PACKS } from '../content/defenses';
import { sceneArt } from '../assets/registry';
import { loadSave, type Settings } from './profile';
import { replayLink, copy } from './screens';
import { CONTENT_VERSION } from '../content/config';
import type { RunState } from '../core/types';

export function Title() {
  const s = useStore();
  const save = loadSave();
  return (
    <div class="screen title">
      <div class="logo">
        <div class="logo-cards" aria-hidden="true">🂠🂡🂮</div>
        <h1>BARO</h1>
        <p class="hook">Il Fato ti dà le carte. Tu bari.</p>
      </div>
      <nav class="menu">
        {save && <Btn kind="primary" onClick={() => resumeSave()}>Continua la notte</Btn>}
        <Btn kind={save ? undefined : 'primary'} onClick={() => set({ screen: 'newrun' })}>Nuova notte</Btn>
        <Btn onClick={() => startRun(defaultConfig({ tutorial: true, seed: 'prova', asso: s.settings.asso }))}>Atto 0 · La Prova (tutorial)</Btn>
        <Btn onClick={() => set({ screen: 'rules' })}>Come si gioca</Btn>
        <Btn onClick={() => set({ screen: 'codex' })}>Il Codice</Btn>
        <Btn onClick={() => set({ screen: 'unlocks' })}>Sblocchi · {s.profile.inchiostro} Inchiostro</Btn>
        <Btn onClick={() => set({ screen: 'settings' })}>Impostazioni</Btn>
      </nav>
      <p class="small-label foot">Versione di prova {CONTENT_VERSION} · grafica provvisoria · run: {s.profile.runs}, vittorie: {s.profile.wins}</p>
    </div>
  );
}

export function NewRun() {
  const s = useStore();
  const p = s.profile;
  const [baro, setBaro] = useState(p.bari.includes('sottovento') ? 'sottovento' : p.bari[0]);
  const [sig, setSig] = useState(Math.min(p.maxSigillo, 0));
  const [seed, setSeed] = useState('');
  const unlockAll = s.settings.unlockAll;
  const maxSig = unlockAll ? 10 : p.maxSigillo;
  const go = () => {
    const cfg = defaultConfig({ baro, sigillo: sig, asso: s.settings.asso, packs: unlockAll ? ['*'] : p.packs, seed: seed.trim() || String(Math.floor(Math.random() * 1e9)) });
    startRun(cfg);
  };
  return (
    <div class="screen newrun">
      <h2>Nuova notte</h2>
      <h3>Scegli il Baro</h3>
      <div class="bari">
        {BARI.map((b) => {
          const ok = unlockAll || p.bari.includes(b.id);
          return (
            <button type="button" key={b.id} class={`baro ${baro === b.id ? 'sel' : ''}`} disabled={!ok} onClick={() => setBaro(b.id)} aria-pressed={baro === b.id}>
              <Art a={sceneArt('baro_' + b.id)} />
              <b>{b.name}</b>
              <span class="row">{b.kit.map((k) => <DefChip key={k.id} id={k.id} onClick={() => {}} />)}</span>
              <span class="small-label">{b.passive}</span>
              {!ok && <span class="lock">🔒 {b.unlock}</span>}
            </button>
          );
        })}
      </div>
      <h3>Sigillo (difficoltà)</h3>
      <div class="sigilli">
        {SIGILLI.map((t, k) => (
          <button type="button" key={k} class={`sig ${sig === k ? 'sel' : ''}`} disabled={k > maxSig} onClick={() => setSig(k)} aria-pressed={sig === k}>
            <b>{k}</b> <span>{k === 0 ? t : `${t}${k > 1 ? ' (+ i precedenti)' : ''}`}</span>
          </button>
        ))}
      </div>
      <label class="field">Seed (facoltativo, per rigiocare la stessa notte): <input value={seed} onInput={(e) => setSeed((e.target as HTMLInputElement).value)} placeholder="casuale" /></label>
      <label class="field"><input type="checkbox" checked={s.settings.asso} onChange={(e) => updateSettings({ asso: (e.target as HTMLInputElement).checked })} /> Asso nella manica (una mossa per ondata)</label>
      <div class="row main-actions">
        <Btn kind="ghost" onClick={() => set({ screen: 'title' })}>Indietro</Btn>
        <Btn kind="primary" onClick={go}>Inizia la Veglia ▶</Btn>
      </div>
    </div>
  );
}

export function Codex() {
  const s = useStore();
  const [tab, setTab] = useState<'sventure' | 'difese' | 'mazzieri' | 'eventi'>('sventure');
  const seenE = new Set(s.profile.seenEnemies);
  const seenD = new Set(s.profile.seenDefenses);
  const all = s.settings.unlockAll;
  return (
    <div class="screen codex">
      <h2>Il Codice</h2>
      <div class="tabs" role="tablist">
        {(['sventure', 'difese', 'mazzieri', 'eventi'] as const).map((t) => <button type="button" role="tab" aria-selected={tab === t} key={t} class={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
      {tab === 'sventure' && (
        <div class="codexgrid">
          {Object.values(ENEMIES).filter((d) => d.tier === 'n' || d.tier === 'e').filter((d) => d.id !== 'topo').map((d) => (
            all || seenE.has(d.id) ? <div key={d.id} class="codexitem"><DeckCardView def={d.id} onClick={() => set({ inspect: { kind: 'enemy', id: d.id } })} /><span class="small-label">{d.name}</span></div>
              : <div key={d.id} class="codexitem unknown"><span class="card back small"><span class="q">?</span></span><span class="small-label">Mai vista</span></div>
          ))}
        </div>
      )}
      {tab === 'difese' && (
        <div class="codexgrid">
          {ALL_DEFENSE_IDS.map((id) => (all || seenD.has(id)
            ? <div key={id} class="codexitem"><DefChip id={id} label /></div>
            : <div key={id} class="codexitem unknown"><span class="small-label">? {DEFENSES[id].pack ? '(pacchetto)' : ''}</span></div>))}
        </div>
      )}
      {tab === 'mazzieri' && (
        <div>{[1, 2, 3].map((a) => { const b = BOSS_TEXT[a]; return <div key={a} class="bosscard"><Art a={sceneArt(b.id)} /><div><b>{b.name}</b> · “{b.rule}”<p>{b.ruleText}</p><p class="small-label">{s.profile.bossesBeaten.includes(a) || all ? b.variant : 'Variante: battilo una volta per scoprirla.'}</p><p><i>“{b.intro}”</i></p></div></div>; })}</div>
      )}
      {tab === 'eventi' && <div>{EVENTS.map((e) => <div key={e.id} class="bosscard"><Art a={sceneArt('ev_' + e.id)} /><div><b>{e.name}</b><p>{e.text}</p></div></div>)}</div>}
      <div class="row main-actions"><Btn onClick={() => set({ screen: 'title' })}>Indietro</Btn></div>
    </div>
  );
}

export function Unlocks() {
  const s = useStore();
  const p = s.profile;
  return (
    <div class="screen unlocks">
      <h2>Sblocchi</h2>
      <p>Inchiostro: <b>{p.inchiostro}</b>. Lo guadagni a fine run in base al rintocco raggiunto. Sblocca varietà, mai potenza permanente.</p>
      {PACKS.map((pk) => {
        const has = p.packs.includes(pk.id);
        return (
          <div class="svc" key={pk.id}>
            <b>{pk.name}</b> <span class="small-label">{pk.text}</span>
            <Btn small kind={has ? 'gold' : undefined} disabled={has || p.inchiostro < pk.cost} onClick={() => updateProfile({ ...p, inchiostro: p.inchiostro - pk.cost, packs: [...p.packs, pk.id] })}>{has ? 'Sbloccato' : `${pk.cost} Inchiostro`}</Btn>
          </div>
        );
      })}
      <h3>Bari</h3>
      {BARI.map((b) => <div class="svc" key={b.id}><b>{b.name}</b> <span class="small-label">{p.bari.includes(b.id) ? 'Sbloccato' : `🔒 ${b.unlock}`}</span></div>)}
      <h3>Sigilli</h3>
      <p>Sigillo massimo sbloccato: {p.maxSigillo}. Vinci una notte al Sigillo più alto per sbloccare il successivo.</p>
      <h3>Ultime notti</h3>
      <ul class="small-label">{p.lastRuns.map((r, k) => <li key={k}>{r.date} · {BARI.find((b) => b.id === r.baro)?.name} · Sigillo {r.sigillo} · {r.won ? 'vinta' : `persa al rintocco ${r.rintocco}`} · seed {r.seed}</li>)}</ul>
      <div class="row main-actions"><Btn onClick={() => set({ screen: 'title' })}>Indietro</Btn></div>
    </div>
  );
}

export function SettingsScreen({ inRun }: { inRun?: boolean }) {
  const s = useStore();
  const st = s.settings;
  const chk = (k: keyof Settings, label: string) => (
    <label class="field"><input type="checkbox" checked={st[k] as boolean} onChange={(e) => updateSettings({ [k]: (e.target as HTMLInputElement).checked } as Partial<Settings>)} /> {label}</label>
  );
  return (
    <div class={inRun ? '' : 'screen settings'}>
      {!inRun && <h2>Impostazioni</h2>}
      <h3>Gioco</h3>
      {chk('asso', 'Asso nella manica (vale per le nuove notti)')}
      {chk('istinto', 'Modalità istinto: nasconde la previsione del danno')}
      {chk('pauseImportant', 'Pausa sugli eventi importanti nelle prime 3 ondate')}
      <label class="field">Velocità predefinita
        <select value={st.speed} onChange={(e) => updateSettings({ speed: Number((e.target as HTMLSelectElement).value) })}>
          <option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option><option value={99}>⚡ istantaneo</option>
        </select>
      </label>
      <h3>Audio</h3>
      {chk('audio', 'Audio attivo')}
      <label class="field">Volume <input type="range" min={0} max={1} step={0.05} value={st.volume} onInput={(e) => updateSettings({ volume: Number((e.target as HTMLInputElement).value) })} /></label>
      {chk('silentTick', 'Tick silenzioso')}
      <h3>Accessibilità</h3>
      <label class="field">Palette
        <select value={st.palette} onChange={(e) => updateSettings({ palette: (e.target as HTMLSelectElement).value as Settings['palette'] })}>
          <option value="standard">Standard</option><option value="deuter">Deuteranopia / protanopia</option><option value="trit">Tritanopia</option><option value="contrasto">Alto contrasto</option>
        </select>
      </label>
      <label class="field">Dimensione del testo
        <select value={st.textScale} onChange={(e) => updateSettings({ textScale: Number((e.target as HTMLSelectElement).value) })}>
          <option value={1}>100%</option><option value={1.15}>115%</option><option value={1.3}>130%</option><option value={1.5}>150%</option>
        </select>
      </label>
      {chk('reduceMotion', 'Riduci movimento')}
      <label class="field">Fila
        <select value={st.layout} onChange={(e) => updateSettings({ layout: (e.target as HTMLSelectElement).value as Settings['layout'] })}>
          <option value="auto">Automatica</option><option value="orizzontale">Orizzontale</option><option value="verticale">Verticale (telefono)</option>
        </select>
      </label>
      <h3>Test</h3>
      {chk('unlockAll', 'Sblocca tutto (Bari, Sigilli, pacchetti, Codice) per i test')}
      {chk('debug', 'Pannello debug nel menu di gioco')}
      {!inRun && (
        <div class="row">
          <Btn kind="danger" small onClick={() => { if (confirmReset()) { try { localStorage.clear(); } catch { /* */ } location.reload(); } }}>Azzera i progressi</Btn>
        </div>
      )}
      {!inRun && <div class="row main-actions"><Btn onClick={() => set({ screen: 'title' })}>Indietro</Btn></div>}
    </div>
  );
}

let resetArmed = 0;
function confirmReset() {
  if (Date.now() - resetArmed < 4000) return true;
  resetArmed = Date.now();
  toast('Tocca di nuovo entro 4 secondi per azzerare tutto');
  return false;
}

export function Rules() {
  return (
    <div class="screen rules">
      <h2>Come si gioca</h2>
      <p><b>Il Fato ti dà le carte. Tu bari.</b> Nel paese di Sottovento, nella notte più lunga, il Mazziere pesca sventure dal Mazzo del Fato e le manda lungo i <b>Cinque Passi</b> (Crocevia, Strada, Cortile, Scala, Uscio) fino alla tua porta. Ogni sventura che arriva alla <b>Soglia</b> spegne tanti <b>Lumi</b> quanta è la sua <b>Forza</b>. A 0 Lumi la notte è persa.</p>
      <p>Tu non giochi carte: <b>trucchi il mazzo e le regole</b>.</p>
      <ul>
        <li><b>Segni</b> (esagoni): stanno su un Passo e a ogni tick agiscono sulla carta che ci trovano. Uno per Passo, due con un Basamento. Li sposti gratis in Preparazione.</li>
        <li><b>Trucchi</b> (rombi): agiscono sulla pescata. Due posti.</li>
        <li><b>Riti</b> (cerchi): decidono l’ordine in cui le carte entrano. Uno solo attivo.</li>
        <li><b>Patti</b>: dopo un’élite o un Mazziere puoi far passare dalla tua parte una sventura distrutta. Resta nel mazzo, cammina con le altre ma combatte per te. Ha una Lealtà che scade: a 0 ti tradisce.</li>
      </ul>
      <h3>Un rintocco</h3>
      <ol>
        <li><b>Annuncio</b>: il Fato aggiunge carte al mazzo e te le mostra.</li>
        <li><b>Offerta</b>: scegli 1 difesa tra 3, oppure salti per 3 Spiccioli.</li>
        <li><b>Preparazione</b>: sposti Segni, scambi Trucchi e Rito con il Deposito, guardi la previsione.</li>
        <li><b>Risoluzione</b>: premi Avvia e guarda. Ogni tick: le carte avanzano (nessuno sorpassa), ne entra una nuova, i Segni agiscono dal Passo più vicino alla porta, poi le abilità nemiche, i Patti e il Brucia.</li>
      </ol>
      <p>La <b>Forza</b> è sia la vita sia il danno di una carta: ferirla riduce anche il danno che farà. La <b>Corazza</b> para il prossimo colpo o effetto dei tuoi, qualunque sia. Il mazzo è <b>persistente</b>: le carte distrutte tornano a fine ondata; escono per sempre solo con l’<b>Esilio</b>.</p>
      <p><b>Asso nella manica</b> (se attivo): una volta per ondata, durante la risoluzione, puoi Trattenere una carta per un tick o Scambiare due carte vicine.</p>
      <p>Ogni veglia (Vespro, Mezzanotte, Ora Morta) è una mappa di 7 livelli e finisce con un <b>Mazziere</b> in tre fasi. Batti la Piena e all’alba canta il gallo.</p>
      <p class="small-label">Tocca qualsiasi carta o sigillo per leggerne le regole. Nel riepilogo, “Rivedi ondata” ripete la risoluzione; nel dettaglio di una carta, “Perché?” spiega cosa le è successo.</p>
      <div class="row main-actions"><Btn onClick={() => set({ screen: get().run && !get().run!.ended ? 'run' : 'title' })}>Indietro</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ menu in partita e debug
export function GameMenu() {
  const s = useStore();
  const [view, setView] = useState<'menu' | 'settings' | 'debug'>('menu');
  const close = () => set({ menu: false });
  return (
    <Modal onClose={close} title={view === 'menu' ? 'Menu' : view === 'settings' ? 'Impostazioni' : 'Debug'}>
      {view === 'menu' && (
        <div class="choices">
          <Btn kind="primary" onClick={close}>Riprendi</Btn>
          <Btn onClick={() => setView('settings')}>Impostazioni</Btn>
          <Btn onClick={() => { close(); set({ screen: 'rules' }); }}>Come si gioca</Btn>
          <Btn onClick={() => copy(replayLink())}>Copia link del replay (seed + azioni)</Btn>
          {s.settings.debug && <Btn onClick={() => setView('debug')}>Pannello debug</Btn>}
          <Btn onClick={() => { close(); set({ screen: 'title', run: null, playback: null, review: null }); }}>Salva ed esci al titolo</Btn>
          <Btn kind="danger" onClick={() => abandon()}>Abbandona la notte</Btn>
        </div>
      )}
      {view === 'settings' && <SettingsScreen inRun />}
      {view === 'debug' && s.run && <Debug run={s.run} />}
    </Modal>
  );
}

let abandonArmed = 0;
function abandon() {
  if (Date.now() - abandonArmed > 4000) { abandonArmed = Date.now(); toast('Tocca di nuovo per abbandonare la notte'); return; }
  const r = get().run;
  if (r) {
    const run = structuredClone(r) as RunState;
    run.lumi = 0;
    set({ menu: false });
    // un abbandono conta come sconfitta: si registra nel profilo
    import('./profile').then(({ applyRunEnd, writeSave }) => {
      run.ended = true;
      run.won = false;
      run.phase = 'defeat';
      const { profile, news } = applyRunEnd(get().profile, run);
      updateProfile(profile);
      writeSave(null);
      set({ run, news });
    });
  }
}

function Debug({ run }: { run: RunState }) {
  const [card, setCard] = useState('lupo');
  const [def, setDef] = useState('brace');
  const mut = (f: (r: RunState) => void) => {
    const r = structuredClone(run);
    f(r);
    set({ run: r });
    toast('Modifica di debug applicata (non entra nel replay)');
  };
  return (
    <div class="debug">
      <p class="small-label">Seed: <code>{run.cfg.seed}</code> · fase: {run.phase} · azioni: {get().actions.length}</p>
      <div class="row">
        <select value={card} onChange={(e) => setCard((e.target as HTMLSelectElement).value)}>{Object.values(ENEMIES).filter((d) => d.tier === 'n').map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <Btn small onClick={() => mut((r) => { r.uidc++; r.deck.push({ uid: r.uidc, def: card, rancore: 0, owner: 'fato', lealta: 0, bottino: null, corrotto: false }); })}>Aggiungi al mazzo</Btn>
      </div>
      <div class="row">
        <select value={def} onChange={(e) => setDef((e.target as HTMLSelectElement).value)}>{ALL_DEFENSE_IDS.map((id) => <option key={id} value={id}>{DEFENSES[id].name}</option>)}</select>
        <Btn small onClick={() => mut((r) => { if (!r.def.deposito.includes(def)) r.def.deposito.push(def); })}>Metti nel Deposito</Btn>
      </div>
      <div class="row">
        <Btn small onClick={() => mut((r) => { r.lumi = r.maxLumi; })}>Lumi al massimo</Btn>
        <Btn small onClick={() => mut((r) => { r.sp += 50; })}>+50 Spiccioli</Btn>
        <Btn small onClick={() => mut((r) => { r.intel.fullOrder = 1; })}>Rivela la Coda</Btn>
        {run.phase === 'map' && <Btn small onClick={() => mut((r) => { r.level = r.map.length - 1; })}>Vai al Mazziere</Btn>}
      </div>
      <p class="small-label">Le modifiche di debug non sono salvate nel replay: dopo un ricaricamento la run torna allo stato registrato.</p>
      <Btn small onClick={() => act({ t: 'continue' })}>Forza “Continua”</Btn>
    </div>
  );
}

export function InspectModal() {
  const s = useStore();
  const i = s.inspect!;
  const run = s.run;
  return (
    <Modal onClose={() => set({ inspect: null })}>
      {i.kind === 'enemy' ? <EnemyDetails id={i.id} why={i.why} /> : <DefenseDetails id={i.id} plus={run?.def.plus.includes(i.id)} />}
      {i.extra && <p>{i.extra}</p>}
    </Modal>
  );
}

/** Replay da link: #replay=base64(json{c,a}) */
export function loadReplayFromHash(): boolean {
  try {
    const h = location.hash;
    if (!h.startsWith('#replay=')) return false;
    const data = JSON.parse(decodeURIComponent(escape(atob(h.slice(8)))));
    const run = replay(data.c, data.a);
    set({ screen: 'run', cfg: data.c, run, actions: data.a });
    toast('Replay caricato');
    return true;
  } catch {
    toast('Link di replay non valido');
    return false;
  }
}
