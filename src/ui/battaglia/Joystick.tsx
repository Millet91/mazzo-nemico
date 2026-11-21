// Doppio joystick fisso (scelta del proprietario 21/11, 00 §9.16, design/comandi/doppio-joystick.md).
// A sinistra il joystick di movimento, a destra quello di mira; FUOCO è un tasto a parte accanto alla mira.
// A riposo sono piccoli (72 e 80 px) e si allargano a 120 e 150 quando li tocchi (prova del proprietario 21/11).
// Ogni tocco appartiene al controllo dove comincia e non lo cambia finché il dito non si alza: ogni controllo
// è un cerchio DOM (base + 16 px) che prende il dito con la pointer capture, il resto dello schermo è della
// camera di B (pinch, trascinamento, doppio tocco). I mancini scambiano i due joystick (solo CSS).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { creaJoystick, creaJoystickMira, limitaPomello, pomelloDaMira, versoDaMira } from './logica';
import { invia } from './stato';
import { bus, type VistaBattaglia } from '../../core/bus';

/**
 * Controllo che prende un dito solo: `giu` col punto relativo al centro, poi `muovi` e `su`. A riposo è piccolo
 * (non copre la mappa) e si allarga quando lo tocchi; il centro resta fermo. Il cerchio di tocco è la base
 * più 16 px di margine, sia piccola sia grande.
 */
function Zona(p: {
  testid: string; cls: string; label: string; children: ComponentChildren; attivo: boolean;
  giu: (dx: number, dy: number, e: PointerEvent) => boolean; muovi: (dx: number, dy: number) => void; su: () => void;
}) {
  const dito = useRef<number | null>(null);
  const centro = useRef({ x: 0, y: 0 });
  const fine = (e: PointerEvent) => {
    if (e.pointerId !== dito.current) return;
    dito.current = null;
    p.su();
  };
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
          if (!p.giu(dx, dy, e)) return;
          e.preventDefault();
          dito.current = e.pointerId;
          try { el.setPointerCapture(e.pointerId); } catch { /* puntatore sintetico */ }
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== dito.current) return;
          p.muovi(e.clientX - centro.current.x, e.clientY - centro.current.y);
        }}
        onPointerUp={fine} onPointerCancel={fine}
        onContextMenu={(e) => e.preventDefault()} />
      {p.children}
    </div>
  );
}

/** Joystick di movimento: sinistra/destra cammina, in alto salta (all'indietro = salto alto). */
export function JoystickMovimento() {
  const [k, setK] = useState({ x: 0, y: 0 });
  const [attivo, setAttivo] = useState(false);
  // verso del pirata: l'ultimo `muovi` di questo turno, altrimenti quello della mira
  const ultimoVerso = useRef<{ turno: number; verso: 1 | -1 } | null>(null);
  const j = useMemo(() => creaJoystick((c) => {
    if (c.t === 'muovi' && c.dir !== 0) ultimoVerso.current = { turno: bus.battaglia.peek()?.numeroTurno ?? 0, verso: c.dir };
    invia(c);
  }, () => {
    const v = bus.battaglia.peek();
    if (!v) return 0;
    const u = ultimoVerso.current;
    return u && u.turno === v.numeroTurno ? u.verso : versoDaMira(v.miraGradi);
  }), []);
  // se il joystick sparisce col dito sopra (fine della fase), il pirata si ferma
  useEffect(() => () => j.rilascia(), [j]);
  return (
    <Zona testid="joystick-movimento" cls="zona-movimento" label={T.battaglia.joystick} attivo={attivo}
      giu={(dx, dy) => { tocco(); setAttivo(true); setK(j.sposta(dx, dy)); return true; }}
      muovi={(dx, dy) => setK(j.sposta(dx, dy))}
      su={() => { j.rilascia(); setK({ x: 0, y: 0 }); setAttivo(false); }}>
      <div class="base-joystick movimento">
        <div class="pomello" style={{ transform: `translate(${k.x}px, ${k.y}px)` }} />
      </div>
    </Zona>
  );
}

/**
 * Joystick di mira. Il pomello oro resta dove lo lasci; quando non lo tieni segue la mira del turno (45°, 60%
 * all'inizio). FUOCO è un tasto separato (prova del proprietario 21/11: al centro si premeva per sbaglio).
 */
export function JoystickMira({ v }: { v: VistaBattaglia }) {
  const [trascino, setTrascino] = useState<{ x: number; y: number } | null>(null);
  const j = useMemo(() => creaJoystickMira((c) => invia(c)), []);
  const inizio = useRef({ x: 0, y: 0 });
  const k = trascino ?? pomelloDaMira(v.miraGradi, v.potenza);
  return (
    <Zona testid="joystick-mira" cls="zona-mira" label={T.battaglia.joystickMira} attivo={trascino !== null}
      giu={(dx, dy) => {
        tocco();
        const m0 = pomelloDaMira(v.miraGradi, v.potenza);
        const p = limitaPomello(m0.x, m0.y);
        j.inizia(p);
        inizio.current = { x: dx, y: dy };
        setTrascino(p);
        return true;
      }}
      muovi={(dx, dy) => setTrascino(j.sposta(dx - inizio.current.x, dy - inizio.current.y))}
      su={() => setTrascino(null)}>
      <div class="base-joystick mira">
        <div class="centro-mira" />
        <div class="pomello-mira" data-testid="pomello-mira" style={{ transform: `translate(${k.x}px, ${k.y}px)` }} />
      </div>
    </Zona>
  );
}
