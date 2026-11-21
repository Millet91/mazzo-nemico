// Joystick virtuale (m1-ritmo §1, 00 §9.16): compare dove si appoggia il pollice nella metà bassa a sinistra
// (a destra con i mancini). Raggio 56, zona morta 12; manda `muovi` e `salta` come facevano ◀ ▶ SALTA.
// La logica sta in logica.ts (creaJoystick), qui solo i pointer event e il disegno.
import { useMemo, useRef, useState } from 'preact/hooks';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { creaJoystick, JOYSTICK, versoDaMira } from './logica';
import { invia } from './stato';
import { bus } from '../../core/bus';

/** il joystick non parte entro questi px dal bordo laterale (gesto indietro di Android) */
const MARGINE_BORDO = 24;

export function Joystick() {
  const [pos, setPos] = useState<{ cx: number; cy: number; x: number; y: number } | null>(null);
  const dito = useRef<number | null>(null);
  const centro = useRef({ cx: 0, cy: 0 });
  // verso del pirata: l'ultimo `muovi` di questo gesto o di prima, altrimenti quello della mira
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

  const fine = (e: PointerEvent) => {
    if (e.pointerId !== dito.current) return;
    dito.current = null;
    j.rilascia();
    setPos(null);
  };

  return (
    <div class="zona-joystick" data-testid="joystick" aria-label={T.battaglia.joystick} role="application"
      onPointerDown={(e) => {
        if (dito.current !== null) return;
        const zona = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (e.clientX < MARGINE_BORDO || e.clientX > window.innerWidth - MARGINE_BORDO) return;
        e.preventDefault();
        dito.current = e.pointerId;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* puntatore sintetico */ }
        // il cerchio resta tutto dentro la zona
        const r = JOYSTICK.raggio;
        const cx = Math.min(Math.max(e.clientX - zona.left, r), zona.width - r);
        const cy = Math.min(Math.max(e.clientY - zona.top, r), zona.height - r);
        centro.current = { cx: cx + zona.left, cy: cy + zona.top };
        tocco();
        const k = j.sposta(e.clientX - centro.current.cx, e.clientY - centro.current.cy);
        setPos({ cx, cy, ...k });
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== dito.current) return;
        const k = j.sposta(e.clientX - centro.current.cx, e.clientY - centro.current.cy);
        setPos((p) => (p ? { ...p, ...k } : p));
      }}
      onPointerUp={fine} onPointerCancel={fine}
      onContextMenu={(e) => e.preventDefault()}>
      {/* a riposo un joystick fantasma fermo fa capire che qui si cammina (design M1, giro di controllo) */}
      {!pos && (
        <div class="joystick fantasma" data-testid="joystick-fantasma" aria-hidden="true">
          <div class="pomello" />
        </div>
      )}
      {pos && (
        <div class="joystick" style={{ left: `${pos.cx}px`, top: `${pos.cy}px` }}>
          <div class="pomello" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />
        </div>
      )}
    </div>
  );
}
