// Una sola schermata orizzontale. Disegnata su una tela di 844×390 (un telefono in orizzontale)
// e scalata per riempire lo schermo; in verticale la tela ruota da sola.
import { useEffect, useLayoutEffect, useMemo, useState } from 'preact/hooks';
import { CARTE, CartaId, NEMICI, NemicoId } from '../game/carte';
import {
  BONUS_MANO, FICHE, FILA, MANI, Nemico, Passo, Stato, anteprima, bloccoFurto, dannoPrevisto,
  fineTurno, forzaBase, gioca, nonGiocabile, nuovaPartita, ritmo, scegli, tuttoIlMazzo,
} from '../game/regole';
import { CartaMia, CartaNemico } from './Carte';
import { buzz } from './haptics';

const W = 844, H = 390;
const SLOT_W = 104, SLOT_G = 8;
const slotX = (i: number) => i * (SLOT_W + SLOT_G);

type Fantasma = { key: number; tipo: 'morto' | 'esce' | 'rubato' | 'rimandato'; n: Nemico; slot: number; danno?: number; parato?: boolean };
type Numero = { key: number; slot: number | 'porta' | 'vite'; testo: string; tipo: 'danno' | 'cura' | 'buff' | 'immune' | 'info' };

let K = 1;

// ---------- suggerimenti: una riga, sempre visibile, cambia con la situazione ----------
const VISTI_KEY = 'baro.nucleo.visti';
function caricaVisti(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(VISTI_KEY) ?? '[]')); } catch { return new Set(); }
}
function salvaVisti(v: Set<string>) {
  try { localStorage.setItem(VISTI_KEY, JSON.stringify([...v])); } catch { /* niente */ }
}

export function App() {
  const [s, setS] = useState<Stato | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [fantasmi, setFantasmi] = useState<Fantasma[]>([]);
  const [numeri, setNumeri] = useState<Numero[]>([]);
  const [avviso, setAvviso] = useState<{ testo: string; key: number } | null>(null);
  const [info, setInfo] = useState<{ tipo: 'nemico'; n: Nemico | { id: NemicoId; forza: number } } | { tipo: 'mazzo' } | { tipo: 'regole' } | { tipo: 'tuo' } | null>(null);
  const [nuove, setNuove] = useState<Set<number>>(new Set());
  const [visti] = useState(caricaVisti);
  const [scala, setScala] = useState({ k: 1, ruota: false });
  const [scossa, setScossa] = useState(0);

  // ---------- adatta la tela allo schermo ----------
  useLayoutEffect(() => {
    const fit = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const ruota = vh > vw * 1.1;
      const [w, h] = ruota ? [vh, vw] : [vw, vh];
      setScala({ k: Math.min(w / W, h / H), ruota });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // tasto Indietro di Android: chiude i pannelli
  useEffect(() => {
    const back = () => { setInfo(null); setSel(null); };
    document.addEventListener('backbutton', back);
    return () => document.removeEventListener('backbutton', back);
  }, []);

  const segna = (k: string) => { if (!visti.has(k)) { visti.add(k); salvaVisti(visti); } };

  const dire = (testo: string) => setAvviso({ testo, key: K++ });
  useEffect(() => {
    if (!avviso) return;
    const t = setTimeout(() => setAvviso(null), 2200);
    return () => clearTimeout(t);
  }, [avviso]);

  // ---------- effetti visivi dagli eventi ----------
  function applica(prima: Stato, passo: Passo) {
    const dopo = passo.stato;
    const slotDi = (st: Stato, uid: number) => st.fila.findIndex((n) => n?.uid === uid);
    const nemDi = (uid: number) => prima.fila.find((n) => n?.uid === uid) ?? dopo.fila.find((n) => n?.uid === uid);
    const f: Fantasma[] = [];
    const nu: Numero[] = [];
    for (const e of passo.eventi) {
      switch (e.t) {
        case 'danno': {
          const slot = slotDi(prima, e.uid) >= 0 ? slotDi(prima, e.uid) : slotDi(dopo, e.uid);
          if (slot >= 0) nu.push({ key: K++, slot, testo: e.immune ? 'Immune!' : `−${e.n}`, tipo: e.immune ? 'immune' : 'danno' });
          if (!e.immune) buzz('colpo');
          break;
        }
        case 'buff': {
          const slot = slotDi(dopo, e.uid);
          if (slot >= 0) nu.push({ key: K++, slot, testo: '+1', tipo: 'buff' });
          break;
        }
        case 'morto': case 'rubato': case 'rimandato': {
          const n = nemDi(e.uid);
          const slot = slotDi(prima, e.uid);
          if (n && slot >= 0) f.push({ key: K++, tipo: e.t, n: { ...n, forza: Math.max(0, n.forza) }, slot });
          if (e.t === 'rubato') {
            const nuova = dopo.inMano[dopo.inMano.length - 1];
            if (nuova) setNuove((x) => new Set(x).add(nuova.uid));
          }
          break;
        }
        case 'esce': {
          const n = nemDi(e.uid);
          const slot = slotDi(prima, e.uid);
          if (n) f.push({ key: K++, tipo: 'esce', n, slot: Math.max(0, slot), danno: e.n, parato: e.parato });
          nu.push({ key: K++, slot: 'vite', testo: e.parato ? 'Parato!' : `−${e.n}`, tipo: e.parato ? 'info' : 'danno' });
          if (!e.parato) { buzz('ferita'); setScossa((x) => x + 1); }
          break;
        }
        case 'cura': nu.push({ key: K++, slot: 'vite', testo: `+${e.n}`, tipo: 'cura' }); break;
        case 'fiche': dire(`+${e.n} fiche`); break;
        case 'parata': dire('La prossima uscita non ti farà danno'); break;
        case 'fermi': dire('Fermi tutti! La fila resta ferma'); break;
        case 'vinto': buzz('vinto'); break;
        case 'perso': buzz('perso'); break;
      }
    }
    if (f.length) {
      setFantasmi((x) => [...x, ...f]);
      setTimeout(() => setFantasmi((x) => x.filter((g) => !f.includes(g))), 900);
    }
    if (nu.length) {
      setNumeri((x) => [...x, ...nu]);
      setTimeout(() => setNumeri((x) => x.filter((g) => !nu.includes(g))), 1100);
    }
    setS(dopo);
  }

  // ---------- azioni ----------
  function nuova() {
    const st = nuovaPartita();
    setS(st);
    setSel(null);
    setNuove(new Set());
    setFantasmi([]);
    setNumeri([]);
  }

  function giocaCarta(cartaUid: number, bersaglio?: number) {
    if (!s) return;
    const motivo = nonGiocabile(s, cartaUid, bersaglio);
    if (motivo) { dire(motivo); return; }
    const carta = s.inMano.find((c) => c.uid === cartaUid)!;
    buzz('tap');
    const passo = gioca(s, cartaUid, bersaglio);
    if (CARTE[carta.id].id === 'ruba' || carta.id === 'grandefurto') segna('furto');
    segna('giocato');
    setSel(null);
    applica(s, passo);
  }

  function toccaCarta(uid: number) {
    if (!s || occupato) return;
    const carta = s.inMano.find((c) => c.uid === uid);
    if (!carta) return;
    const def = CARTE[carta.id];
    setNuove((x) => { if (!x.has(uid)) return x; const y = new Set(x); y.delete(uid); return y; });
    if (sel === uid) {
      if (def.bersaglio === 'nessuno') giocaCarta(uid);
      else setSel(null);
      return;
    }
    if (def.costo > s.fiche) { dire(`${def.costo === 1 ? 'Serve 1 fiche' : `Servono ${def.costo} fiche`}: ${s.fiche === 0 ? 'le hai finite' : `te ne resta${s.fiche === 1 ? '' : 'no'} ${s.fiche}`}`); return; }
    if (def.bersaglio === 'nessuno') {
      const m = nonGiocabile(s, uid);
      if (m) { dire(m); return; }
    }
    buzz('tap');
    setSel(uid);
  }

  function toccaNemico(n: Nemico) {
    if (!s || occupato) return;
    if (sel !== null) {
      const carta = s.inMano.find((c) => c.uid === sel);
      if (carta && CARTE[carta.id].bersaglio === 'nemico') { giocaCarta(sel, n.uid); return; }
    }
    setInfo({ tipo: 'nemico', n });
  }

  async function finisci() {
    if (!s || occupato || s.fase !== 'turno') return;
    setSel(null);
    setOccupato(true);
    segna('fineturno');
    const passi = fineTurno(s);
    let prima = s;
    for (const p of passi) {
      const vuoto = p.eventi.length === 0;
      applica(prima, p);
      prima = p.stato;
      await new Promise((r) => setTimeout(r, vuoto ? 120 : 520));
    }
    setOccupato(false);
  }

  function premio(scelta: CartaId | 'riposo') {
    if (!s) return;
    buzz('tap');
    setS(scegli(s, scelta));
    setSel(null);
  }

  // per i test automatici: lo stato è leggibile (non modificabile) dalla console
  (window as any).__baro = { s, occupato };

  // ---------- calcoli per il disegno ----------
  const prev = useMemo(() => (s && s.fase === 'turno' && !occupato ? anteprima(s) : { danno: 0, escono: new Set<number>() }), [s, occupato]);
  const cartaSel = s && sel !== null ? s.inMano.find((c) => c.uid === sel) ?? null : null;
  const hoRuba = !!s?.inMano.some((c) => c.id === 'ruba' || c.id === 'grandefurto');

  function etichetta(n: Nemico): { stato: '' | 'ok' | 'no' | 'esce'; testo: string | null } {
    if (!s) return { stato: '', testo: null };
    if (cartaSel && CARTE[cartaSel.id].bersaglio === 'nemico') {
      const motivo = nonGiocabile(s, cartaSel.uid, n.uid);
      if (motivo) return { stato: 'no', testo: null };
      const id = cartaSel.id;
      const t =
        id === 'colpo' ? `−${dannoPrevisto(n, 2)}` :
        id === 'mazzata' ? `−${dannoPrevisto(n, 5)}` :
        id === 'coltello' ? `−${dannoPrevisto(n, 1)}` :
        id === 'randello' ? `−${dannoPrevisto(n, 4)}` :
        id === 'brivido' ? `−${Math.floor(n.forza / 2)}` :
        id === 'esplosivo' ? `−${dannoPrevisto(n, 2)} e vicini` :
        id === 'ruba' || id === 'grandefurto' ? '🫳 Rubalo!' :
        id === 'spingi' ? '↔ Scambia' :
        id === 'rimanda' ? '↩ Rimanda' :
        id === 'smaschera' ? '🎭 Smaschera' :
        id === 'veleno' ? '🧪 Avvelena' : '✓';
      return { stato: 'ok', testo: t };
    }
    if (prev.escono.has(n.uid)) return { stato: 'esce', testo: null };
    return { stato: '', testo: null };
  }

  const rubabile = (n: Nemico) => !!s && hoRuba && s.inMano.some((c) => (c.id === 'ruba' || c.id === 'grandefurto') && !bloccoFurto(s, n, c.id));

  // ---------- la riga di suggerimento ----------
  const suggerimento = useMemo(() => {
    if (!s || s.fase !== 'turno') return null;
    if (occupato) return 'Tocca al Mazziere…';
    if (cartaSel) {
      const def = CARTE[cartaSel.id];
      if (def.bersaglio === 'nessuno') return `Tocca di nuovo “${def.nome}” per giocarla`;
      if (cartaSel.id === 'ruba' || cartaSel.id === 'grandefurto') return 'Tocca il nemico da rubare: diventerà una tua carta';
      return `Ora tocca un nemico: ${def.testo.toLowerCase()}`;
    }
    const nemici = s.fila.filter(Boolean) as Nemico[];
    if (nemici.some((n) => n.id === 'spettro' && !n.smascherato) && !visti.has('furto')) return 'Lo Spettro è immune ai danni. Rubalo: tocca “Ruba”, poi lo Spettro';
    if (nemici.some(rubabile) && !visti.has('furto')) return 'Un nemico con Forza 2 o meno si può RUBARE: diventa una tua carta';
    if (!visti.has('giocato')) return 'Tocca una tua carta, poi un nemico nella fila';
    if (nemici.length === 0) return `Fila vuota: premi Fine turno e il Mazziere gira ${ritmo(s)} carte`;
    if (s.fiche === 0 || !s.inMano.some((c) => CARTE[c.id].costo <= s.fiche)) return 'Niente più mosse: premi Fine turno';
    if (prev.danno > 0 && !visti.has('fineturno')) return `Se finisci ora, chi esce dalla fila ti toglie ${prev.danno} Vite`;
    if (prev.danno > 0) return `Attento: a fine turno perdi ${prev.danno} Vite`;
    return null;
  }, [s, cartaSel, occupato, prev]);

  // ---------- disegno ----------
  const stile = scala.ruota
    ? { width: W, height: H, transform: `translate(-50%, -50%) rotate(90deg) scale(${scala.k})` }
    : { width: W, height: H, transform: `translate(-50%, -50%) scale(${scala.k})` };

  return (
    <div class="schermo">
      <div class={`tela ${scossa % 2 ? 'scossa-a' : scossa ? 'scossa-b' : ''}`} style={stile}>
        {!s ? <Titolo onGioca={nuova} onRegole={() => setInfo({ tipo: 'regole' })} /> : (
          <>
            {/* barra in alto */}
            <div class="barra">
              <div class="vite">
                <span class="cuore">❤</span>
                <div class="vite-barra"><div style={{ width: `${(100 * s.vite) / s.viteMax}%` }} /></div>
                <b>{s.vite}</b><span class="dim">/{s.viteMax}</span>
                {numeri.filter((x) => x.slot === 'vite').map((x) => <span key={x.key} class={`num num-${x.tipo} num-vite`}>{x.testo}</span>)}
              </div>
              <div class="mani">
                {Array.from({ length: MANI }, (_, i) => <span key={i} class={`pallino ${i + 1 < s.mano ? 'fatto' : i + 1 === s.mano ? 'ora' : ''}`} />)}
                <span>Mano {s.mano} di {MANI}</span>
              </div>
              <button class="tondo" onClick={() => setInfo({ tipo: 'regole' })} aria-label="Regole">?</button>
            </div>

            {suggerimento && <div class="consiglio" key={suggerimento}>{suggerimento}</div>}

            {/* tavolo: porta, fila, mazzo del Mazziere */}
            <div class="porta">
              <div class={`porta-ico ${prev.danno > 0 ? 'minaccia' : ''}`}>🚪</div>
              <div class="porta-lbl">La tua porta</div>
              {prev.danno > 0 && <div class="porta-danno">−{prev.danno} ❤</div>}
            </div>

            <div class="fila">
              {Array.from({ length: FILA }, (_, i) => (
                <div key={i} class="casella" style={{ left: slotX(i) }}>
                  <span>{i === 0 ? '◀ esce' : '◀'}</span>
                </div>
              ))}
              {s.fila.map((n, i) => n && (
                <div key={n.uid} class="posto" style={{ left: slotX(i) }}>
                  {(() => { const e = etichetta(n); return (
                    <CartaNemico n={n} stato={e.stato} etichetta={e.testo} rubabile={!cartaSel && rubabile(n)} onClick={() => toccaNemico(n)} />
                  ); })()}
                  {numeri.filter((x) => x.slot === i).map((x) => <span key={x.key} class={`num num-${x.tipo}`}>{x.testo}</span>)}
                </div>
              ))}
              {fantasmi.map((g) => (
                <div key={g.key} class={`posto fantasma f-${g.tipo}`} style={{ left: slotX(g.slot) }}>
                  <CartaNemico n={g.n} />
                  {g.tipo === 'rubato' && <span class="num num-info">È tua!</span>}
                </div>
              ))}
            </div>

            <div class="mazzo-n" onClick={() => setInfo({ tipo: 'mazzo' })}>
              <div class="mazzo-lbl">Mazzo del Mazziere</div>
              {s.mazzoN.length > 0 ? (
                <div class="pila">
                  <div class="dorso d2" /><div class="dorso d1" />
                  <CartaNemico n={{ id: s.mazzoN[0], forza: forzaBase(s, s.mazzoN[0]) }} piccola />
                </div>
              ) : <div class="pila vuota">Vuoto</div>}
              <div class="mazzo-info"><b>{s.mazzoN.length}</b> carte · ne entrano <b>{ritmo(s)}</b> a turno</div>
            </div>

            {/* in basso: fiche, mano, fine turno */}
            <div class="fiche">
              <div class="fiche-lbl">Fiche</div>
              <div class="gettoni">
                {Array.from({ length: Math.max(FICHE, s.fiche) }, (_, i) => <span key={i} class={`gettone ${i < s.fiche ? '' : 'speso'}`} />)}
              </div>
              <div class="fiche-num">{s.fiche}</div>
              <button class="tuo-mazzo" onClick={() => setInfo({ tipo: 'tuo' })}>Il tuo mazzo · {tuttoIlMazzo(s).length}</button>
            </div>

            <Mano s={s} sel={sel} nuove={nuove} onTocca={toccaCarta} />

            <button class={`fine ${prev.danno > 0 ? 'pericolo' : ''} ${s.fiche === 0 ? 'invita' : ''}`} disabled={occupato || s.fase !== 'turno'} onClick={finisci}>
              <span class="fine-t">Fine turno</span>
              <span class="fine-s">{occupato ? 'attendi…' : prev.danno > 0 ? `perdi ${prev.danno} ❤` : 'nessun danno'}</span>
            </button>

            {avviso && <div class="avviso" key={avviso.key}>{avviso.testo}</div>}

            {s.fase === 'premio' && <Premio s={s} onScegli={premio} />}
            {(s.fase === 'vinto' || s.fase === 'perso') && <Fine s={s} onAncora={nuova} />}
          </>
        )}
        {info && <Info info={info} s={s} onChiudi={() => setInfo(null)} />}
      </div>
    </div>
  );
}

function Titolo({ onGioca, onRegole }: { onGioca: () => void; onRegole: () => void }) {
  return (
    <div class="titolo">
      <div class="titolo-carte">
        <CartaNemico n={{ id: 'scagnozzo', forza: 4 }} piccola />
        <CartaNemico n={{ id: 'mazziere', forza: 16 }} />
        <CartaNemico n={{ id: 'spettro', forza: 2 }} piccola />
      </div>
      <h1>BARO</h1>
      <p>Il Mazziere manda le sue carte contro la tua porta.<br />Tu colpisci, sposti e <b>rubi</b>: ogni nemico rubato diventa una tua carta.</p>
      <button class="grosso" onClick={onGioca}>Gioca</button>
      <button class="link" onClick={onRegole}>Come si gioca</button>
      <div class="versione">nucleo · {__BUILD__}</div>
    </div>
  );
}

function Mano({ s, sel, nuove, onTocca }: { s: Stato; sel: number | null; nuove: Set<number>; onTocca: (uid: number) => void }) {
  const n = s.inMano.length;
  const largo = 520, cw = 98;
  const passo = n <= 1 ? 0 : Math.min(cw + 8, (largo - cw) / (n - 1));
  const tot = cw + passo * (n - 1);
  return (
    <div class="mano" style={{ width: largo }}>
      {s.inMano.map((c, i) => {
        const def = CARTE[c.id];
        const spenta = def.costo > s.fiche;
        return (
          <CartaMia
            key={c.uid}
            id={c.id}
            sel={sel === c.uid}
            spenta={spenta}
            nuova={nuove.has(c.uid)}
            onClick={() => onTocca(c.uid)}
            style={{ left: (largo - tot) / 2 + i * passo, zIndex: sel === c.uid ? 50 : i }}
          />
        );
      })}
      {n === 0 && s.fase === 'turno' && <div class="mano-vuota">Tocca al Mazziere…</div>}
    </div>
  );
}

function Premio({ s, onScegli }: { s: Stato; onScegli: (c: CartaId | 'riposo') => void }) {
  const conteggio = new Map<NemicoId, number>();
  for (const id of s.annuncio) conteggio.set(id, (conteggio.get(id) ?? 0) + 1);
  return (
    <div class="velo">
      <div class="premio">
        <div class="premio-sx">
          <h2>Mano {s.mano} superata!</h2>
          <p>Scegli un trucco da aggiungere al tuo mazzo</p>
          <div class="offerta">
            {s.offerta.map((id) => <CartaMia key={id} id={id} grande onClick={() => onScegli(id)} />)}
          </div>
          <button class="riposo" onClick={() => onScegli('riposo')}>Oppure riposa: +6 ❤ <span class="dim">({s.vite}/{s.viteMax})</span></button>
        </div>
        <div class="premio-dx">
          <h3>Il Mazziere risponde</h3>
          <p>Aggiunge al suo mazzo:</p>
          <div class="annuncio">
            {[...conteggio].map(([id, k]) => (
              <div key={id} class="ann">
                <span class="ann-ico">{NEMICI[id].icona}</span>
                <span>{k > 1 ? `${k}× ` : ''}{NEMICI[id].nome}</span>
              </div>
            ))}
          </div>
          <p class="minaccia-t">Mano {s.mano + 1}: i nemici entrano con <b>+{BONUS_MANO[s.mano + 1]} Forza</b>{s.mano + 1 === MANI ? ', e in fondo c’è il Mazziere in persona' : ''}.</p>
          <p class="dim">Hai rubato {s.stats.rubati.length} carte: non torneranno più nel suo mazzo.</p>
        </div>
      </div>
    </div>
  );
}

function Fine({ s, onAncora }: { s: Stato; onAncora: () => void }) {
  const vinto = s.fase === 'vinto';
  return (
    <div class="velo">
      <div class={`fine-box ${vinto ? 'v' : 'p'}`}>
        <h2>{vinto ? 'Hai battuto il Mazziere!' : 'Ti hanno scoperto'}</h2>
        <p>{vinto ? `Con ${s.vite} Vite rimaste.` : `Sei caduto alla mano ${s.mano} di ${MANI}.`}</p>
        <div class="stat">
          <div><b>{s.stats.uccisi}</b><span>nemici battuti</span></div>
          <div><b>{s.stats.rubati.length}</b><span>carte rubate</span></div>
          <div><b>{s.stats.turni}</b><span>turni</span></div>
        </div>
        <button class="grosso" onClick={onAncora}>Gioca ancora</button>
      </div>
    </div>
  );
}

function Info({ info, s, onChiudi }: { info: any; s: Stato | null; onChiudi: () => void }) {
  let corpo: any = null;
  if (info.tipo === 'nemico') {
    const n = info.n as Nemico;
    const def = NEMICI[n.id];
    corpo = (
      <div class="info-nemico">
        <CartaNemico n={n} />
        <div class="info-testo">
          <h3>{def.nome}</h3>
          <p><b>Forza {n.forza}</b>: se esce dalla fila ti toglie {n.id === 'barile' && !n.smascherato ? 5 : n.forza} Vite. I danni gli tolgono Forza; a 0 è battuto.</p>
          {def.abil && <p><b>Abilità</b>: {def.abil}{n.smascherato ? ' (smascherato: non vale più)' : ''}.</p>}
          {def.tua ? (
            <div class="info-tua">
              <p>Se lo <b>rubi</b> diventa questa carta, tua per sempre{n.id === 'spettro' ? ' (lo Spettro si ruba con qualsiasi Forza)' : n.forza > 2 ? `. Con “Ruba” serve Forza 2 o meno: ora ha ${n.forza}, indeboliscilo prima` : ''}:</p>
              <CartaMia id={def.tua} />
            </div>
          ) : <p>Non si può rubare.</p>}
        </div>
      </div>
    );
  } else if (info.tipo === 'mazzo' && s) {
    const conta = new Map<NemicoId, number>();
    for (const id of s.mazzoN) conta.set(id, (conta.get(id) ?? 0) + 1);
    corpo = (
      <div class="info-mazzo">
        <h3>Mazzo del Mazziere · {s.mazzoN.length} carte</h3>
        <p>Da baro vedi la prima carta. Ecco cosa c’è ancora dentro (l’ordine è segreto):</p>
        <div class="annuncio">
          {[...conta].map(([id, k]) => <div key={id} class="ann"><span class="ann-ico">{NEMICI[id].icona}</span><span>{k}× {NEMICI[id].nome}</span></div>)}
        </div>
        <p class="dim">I nemici battuti tornano nel suo mazzo alla mano dopo. Quelli rubati no.</p>
      </div>
    );
  } else if (info.tipo === 'tuo' && s) {
    const tutte = tuttoIlMazzo(s);
    const conta = new Map<CartaId, number>();
    for (const c of tutte) conta.set(c.id, (conta.get(c.id) ?? 0) + 1);
    corpo = (
      <div class="info-mazzo">
        <h3>Il tuo mazzo · {tutte.length} carte</h3>
        <p>Ogni turno peschi 5 carte e hai 3 fiche da spendere.</p>
        <div class="annuncio">
          {[...conta].map(([id, k]) => <div key={id} class="ann"><span class="ann-ico">{CARTE[id].icona}</span><span>{k}× {CARTE[id].nome}: {CARTE[id].testo}</span></div>)}
        </div>
      </div>
    );
  } else {
    corpo = (
      <div class="info-regole">
        <h3>Come si gioca</h3>
        <ol>
          <li>Il Mazziere gira le sue carte nella <b>fila</b>. A ogni fine turno la fila avanza di una casella verso la tua porta.</li>
          <li>Il nemico che <b>esce</b> dalla fila ti toglie tante <b>Vite</b> quanta è la sua <b>Forza</b> (il numero rosso).</li>
          <li>Ogni turno hai <b>5 carte</b> e <b>3 fiche</b>. Tocca una carta, poi un nemico. Il numero giallo è il costo.</li>
          <li><b>Ruba</b>: un nemico con Forza 2 o meno diventa una tua carta, per sempre. Indebolisci i forti, poi rubali.</li>
          <li>Superi una mano quando il mazzo del Mazziere è vuoto. Dopo 3 mani hai vinto.</li>
        </ol>
      </div>
    );
  }
  return (
    <div class="velo chiudibile" onClick={onChiudi}>
      <div class="info" onClick={(e) => e.stopPropagation()}>
        {corpo}
        <button class="chiudi" onClick={onChiudi}>Chiudi</button>
      </div>
    </div>
  );
}

