// Doppio joystick fisso (scelta del proprietario 21/11, 00 §9.16, design/comandi/doppio-joystick.md), riscritto
// dall'agente Comandi dopo l'analisi (docs/tecnica/comandi-v2.md). A sinistra la leva di movimento (cammina,
// salta, scale e liane), a destra la leva di mira; FUOCO è un tasto a parte e spara al rilascio.
// A riposo le leve sono piccole (72 e 80 px) e si allargano a 120 e 150 quando le tocchi.
// Ogni tocco appartiene al controllo dove comincia e non lo cambia finché il dito non si alza: ogni controllo
// è un cerchio DOM (base + 16 px) che prende il dito con la pointer capture; il resto dello schermo è della
// camera (pinch, trascinamento, doppio tocco). I mancini scambiano le due leve (solo CSS).
// I pomelli si muovono scrivendo lo stile direttamente (niente ridisegno di Preact a ogni movimento del dito).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { suona } from '../../piattaforma/audio';
import { creaGrilletto, creaLevaMira, creaLevaMovimento, pomelloDaMira, type ModoArrampicata } from './leve';
import { invia } from './stato';
import { bus, type VistaBattaglia } from '../../core/bus';

/** Il pirata attivo è vicino a una scala o liana, o appeso? Lo dice la vista (VistaBattaglia.arrampicata). */
export function modoArrampicata(v: VistaBattaglia | null): ModoArrampicata {
  return v?.arrampicata ?? 'libero';
}

const sposta = (el: HTMLElement | null, k: { x: number; y: number }) => {
  if (el) el.style.transform = `translate(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px)`;
};

/**
 * Controllo che prende un dito solo: `giu` col punto relativo al centro, poi `muovi` e `su`. A riposo è piccolo
 * (non copre la mappa) e si allarga quando lo tocchi; il centro resta fermo. Il cerchio di tocco è la base
 * più 16 px di margine, sia piccola sia grande. `su` arriva sempre: dito alzato, tocco annullato dal sistema,
 * presa persa o app in secondo piano.
 */
function Zona(p: {
  testid: string; cls: string; label: string; children: ComponentChildren; attivo: boolean;
  giu: (dx: number, dy: number, e: PointerEvent) => void; muovi: (dx: number, dy: number, e: PointerEvent) => void; su: () => void;
}) {
  const dito = useRef<number | null>(null);
  const centro = useRef({ x: 0, y: 0 });
  const su = useRef(p.su);
  su.current = p.su;
  const molla = () => {
    if (dito.current === null) return;
    dito.current = null;
    su.current();
  };
  const fine = (e: PointerEvent) => { if (e.pointerId === dito.current) molla(); };
  useEffect(() => {
    const nascosta = () => { if (document.visibilityState !== 'visible') molla(); };
    document.addEventListener('visibilitychange', nascosta);
    window.addEventListener('blur', molla);
    return () => { document.removeEventListener('visibilitychange', nascosta); window.removeEventListener('blur', molla); };
  }, []);
  return (
    <div class={`zona-comando ${p.cls} ${p.attivo ? 'attivo' : ''}`}>
      <div class="cerchio-tocco" data-testid={p.testid} data-zona-comando="cerchio" role="application" aria-label={p.label}
        onPointerDown={(e) => {
          if (dito.current !== null) return;
          const el = e.currentTarget as HTMLElement;
          const r = el.getBoundingClientRect();
          centro.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          const dx = e.clientX - centro.current.x, dy = e.clientY - centro.current.y;
          if (Math.hypot(dx, dy) > r.width / 2) return; // angolo del riquadro fuori dal cerchio
          e.preventDefault();
          dito.current = e.pointerId;
          try { el.setPointerCapture(e.pointerId); } catch { /* puntatore sintetico */ }
          p.giu(dx, dy, e);
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== dito.current) return;
          p.muovi(e.clientX - centro.current.x, e.clientY - centro.current.y, e);
        }}
        onPointerUp={fine} onPointerCancel={fine} onLostPointerCapture={fine}
        onContextMenu={(e) => e.preventDefault()} />
      {p.children}
    </div>
  );
}

/**
 * Leva di movimento. `accesa` = la sim accetta i comandi (azione e fuga); spenta resta a schermo al 50% e
 * ricorda il pollice, così la fuga parte appena comincia senza rialzare il dito (analisi, punto 5).
 */
export function JoystickMovimento({ accesa, modo }: { accesa: boolean; modo: ModoArrampicata }) {
  const [attivo, setAttivo] = useState(false);
  const pomello = useRef<HTMLDivElement>(null);
  const leva = useMemo(() => creaLevaMovimento(invia, () => modoArrampicata(bus.battaglia.peek())), []);
  useEffect(() => { leva.attiva(accesa); }, [leva, accesa]);
  useEffect(() => { leva.rivaluta(); }, [leva, modo]);
  // se la leva sparisce col dito sopra (fine del turno), il pirata si ferma
  useEffect(() => () => leva.rilascia(), [leva]);
  const scala = modo !== 'libero';
  return (
    <Zona testid="joystick-movimento" cls={`zona-movimento ${accesa ? '' : 'spenta'}`} label={T.battaglia.joystick} attivo={attivo}
      giu={(dx, dy) => { tocco(); setAttivo(true); sposta(pomello.current, leva.giu(dx, dy)); }}
      muovi={(dx, dy) => sposta(pomello.current, leva.sposta(dx, dy))}
      su={() => { leva.rilascia(); sposta(pomello.current, { x: 0, y: 0 }); setAttivo(false); }}>
      <div class={`base-joystick movimento ${modo}`}>
        {scala
          ? <><span class="freccia-scala su" aria-hidden="true">▲</span><span class="freccia-scala giu" aria-hidden="true">▼</span></>
          : <span class="guida-salto" aria-hidden="true">▲</span>}
        <div class="pomello" ref={pomello} />
      </div>
    </Zona>
  );
}

/**
 * Leva di mira. Il pomello oro resta dove lo lasci; quando non lo tieni segue la mira del turno (45°, 60%
 * all'inizio). Il trascinamento è relativo: piano = preciso, veloce = ampio. FUOCO è un tasto separato.
 */
export function JoystickMira({ v }: { v: VistaBattaglia }) {
  const [trascino, setTrascino] = useState(false);
  const pomello = useRef<HTMLDivElement>(null);
  const leva = useMemo(() => creaLevaMira((c) => invia(c)), []);
  const ultimo = useRef({ x: 0, y: 0, t: 0 });
  const k = trascino ? leva.pomello : pomelloDaMira(v.miraGradi, v.potenza);
  return (
    <Zona testid="joystick-mira" cls="zona-mira" label={T.battaglia.joystickMira} attivo={trascino}
      giu={(dx, dy, e) => {
        tocco();
        const ora = bus.battaglia.peek() ?? v;
        leva.inizia(pomelloDaMira(ora.miraGradi, ora.potenza));
        ultimo.current = { x: dx, y: dy, t: e.timeStamp };
        setTrascino(true);
      }}
      muovi={(dx, dy, e) => {
        const u = ultimo.current;
        sposta(pomello.current, leva.sposta(dx - u.x, dy - u.y, e.timeStamp - u.t));
        ultimo.current = { x: dx, y: dy, t: e.timeStamp };
      }}
      su={() => setTrascino(false)}>
      <div class="base-joystick mira">
        <div class="pomello-mira" data-testid="pomello-mira" ref={pomello} style={{ transform: `translate(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px)` }} />
      </div>
    </Zona>
  );
}

/**
 * FUOCO: staccato dalla leva di mira, spara al rilascio del dito dentro il tasto (scivolando fuori si annulla)
 * e una volta sola per turno. Con la tastiera (Invio o Spazio) spara subito.
 */
export function TastoFuoco({ turno, disabilitato }: { turno: number; disabilitato?: boolean }) {
  const [premuto, setPremuto] = useState(false);
  const g = useMemo(() => creaGrilletto(() => invia({ t: 'fuoco' })), []);
  const dentro = (e: PointerEvent): boolean => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) <= r.width / 2 + 10;
  };
  const annulla = () => { g.annulla(); setPremuto(false); };
  return (
    <button type="button" id="tasto-fuoco" data-testid="tasto-fuoco" class={`tasto fuoco testo ${premuto ? 'premuto' : ''}`}
      aria-label={T.battaglia.fuoco} disabled={disabilitato}
      onPointerDown={(e) => {
        if (disabilitato) return;
        e.preventDefault();
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* puntatore sintetico */ }
        g.premi();
        setPremuto(true);
        tocco();
      }}
      onPointerMove={(e) => { if (g.premuto) setPremuto(dentro(e)); }}
      onPointerUp={(e) => {
        if (g.rilascia(dentro(e), turno)) suona('tocco');
        setPremuto(false);
      }}
      onPointerCancel={annulla} onLostPointerCapture={() => setPremuto(false)}
      onClick={(e) => { if (e.detail === 0 && !disabilitato) { g.premi(); g.rilascia(true, turno); } }}
      onContextMenu={(e) => e.preventDefault()}>
      {T.battaglia.fuoco}
    </button>
  );
}
