// Joystick virtuale (m1-ritmo §1, 00 §9.16): compare dove si appoggia il pollice in basso a sinistra
// (a destra con i mancini). Raggio 56, zona morta 12; manda `muovi` e `salta` come facevano ◀ ▶ SALTA.
// La logica sta in logica.ts (creaJoystick), qui solo i pointer event e il disegno.
//
// La zona NON prende i tocchi (pointer-events none): li ascolta da window in cattura e li tiene solo se
// non sono sull'anello di mira del pirata (toccoSullaFionda di B) né su un tasto. Così "trascina indietro
// dal pirata" arriva sempre al canvas anche quando il pirata sta in basso a sinistra.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { creaJoystick, JOYSTICK, versoDaMira } from './logica';
import { invia, toccoSullaFionda } from './stato';
import { bus } from '../../core/bus';

/** il joystick non parte entro questi px dal bordo laterale (gesto indietro di Android) */
const MARGINE_BORDO = 24;

export function Joystick() {
  const [pos, setPos] = useState<{ cx: number; cy: number; x: number; y: number } | null>(null);
  const zonaRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const giu = (e: PointerEvent) => {
      const el = zonaRef.current;
      if (!el || dito.current !== null) return;
      const zona = el.getBoundingClientRect();
      const { clientX: x, clientY: y } = e;
      if (x < zona.left || x > zona.right || y < zona.top || y > zona.bottom) return;
      if (x < MARGINE_BORDO || x > window.innerWidth - MARGINE_BORDO) return;
      // i tasti e i pannelli dell'HUD restano loro; l'anello di mira va alla fionda sul canvas
      const t = e.target as Element | null;
      if (t?.closest?.('button, [role="dialog"], .scrim-griglia, .griglia-armi')) return;
      if (toccoSullaFionda(x, y)) return;
      e.preventDefault();
      e.stopPropagation();
      dito.current = e.pointerId;
      // il cerchio resta tutto dentro la zona
      const r = JOYSTICK.raggio;
      const cx = Math.min(Math.max(x - zona.left, r), zona.width - r);
      const cy = Math.min(Math.max(y - zona.top, r), zona.height - r);
      centro.current = { cx: cx + zona.left, cy: cy + zona.top };
      tocco();
      const k = j.sposta(x - centro.current.cx, y - centro.current.cy);
      setPos({ cx, cy, ...k });
    };
    const muovi = (e: PointerEvent) => {
      if (e.pointerId !== dito.current) return;
      e.stopPropagation();
      const k = j.sposta(e.clientX - centro.current.cx, e.clientY - centro.current.cy);
      setPos((p) => (p ? { ...p, ...k } : p));
    };
    const fine = (e: PointerEvent) => {
      if (e.pointerId !== dito.current) return;
      e.stopPropagation();
      dito.current = null;
      j.rilascia();
      setPos(null);
    };
    window.addEventListener('pointerdown', giu, true);
    window.addEventListener('pointermove', muovi, true);
    window.addEventListener('pointerup', fine, true);
    window.addEventListener('pointercancel', fine, true);
    return () => {
      window.removeEventListener('pointerdown', giu, true);
      window.removeEventListener('pointermove', muovi, true);
      window.removeEventListener('pointerup', fine, true);
      window.removeEventListener('pointercancel', fine, true);
      if (dito.current !== null) { dito.current = null; j.rilascia(); }
    };
  }, [j]);

  return (
    <div ref={zonaRef} class="zona-joystick" data-testid="joystick" aria-label={T.battaglia.joystick} role="application">
      {/* a riposo un joystick fantasma fermo fa capire che qui si cammina (design M1, giro di controllo) */}
      {!pos && (
        <div class="joystick fantasma" data-testid="joystick-fantasma" aria-hidden="true">
          <div class="pomello" />
        </div>
      )}
      {pos && (
        <div class="joystick" style={{ left: `${pos.cx}px`, top: `${pos.cy}px` }}>
          <div class="pomello" />
        </div>
      )}
    </div>
  );
}
