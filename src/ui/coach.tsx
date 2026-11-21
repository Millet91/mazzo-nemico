// Guida a riflettori (coach marks): la prima volta illumina un pezzo del tavolo alla volta, con una frase sola.
import { useEffect, useState } from 'preact/hooks';
import { markTip, tipSeen } from './store';
import { buzz } from './haptics';

const STEPS: { id: string; title: string; text: string }[] = [
  { id: 'coach-queue', title: 'Arrivano da qui', text: 'Le sventure del Fato aspettano in fila. Entrano una alla volta, da sinistra.' },
  { id: 'coach-lane', title: 'Camminano verso la tua porta', text: 'Ogni tick avanzano di un Passo. I tuoi Segni (esagoni dorati) colpiscono chi passa sul loro Passo.' },
  { id: 'coach-lumi', title: 'Proteggi i Lumi', text: 'Chi arriva alla porta spegne tanti Lumi quanta è la sua Forza, il numero grande sulla carta. A zero hai perso.' },
  { id: 'coach-forecast', title: 'Guarda la previsione', text: 'Ti dice quanti Lumi rischi. Sposta i Segni toccandoli, poi toccando un Passo.' },
  { id: 'coach-go', title: 'Poi avvia e guarda', text: 'Non giochi carte: prepari il tavolo e lasci correre il rintocco. Dopo, scegli una difesa nuova.' },
];

export function Coach() {
  const [k, setK] = useState(0);
  const [r, setR] = useState<DOMRect | null>(null);
  const done = tipSeen('coach');
  const step = STEPS[k];
  useEffect(() => {
    if (done || !step) return;
    const find = () => {
      const el = document.getElementById(step.id === 'coach-lumi' ? 'coach-lumi' : step.id) ?? (step.id === 'coach-lumi' ? document.querySelector('.lumi-chip') : null);
      setR(el ? el.getBoundingClientRect() : null);
    };
    find();
    window.addEventListener('resize', find);
    return () => window.removeEventListener('resize', find);
  }, [k, done]);
  if (done || !step) return null;
  const next = () => {
    buzz('tap');
    if (k + 1 >= STEPS.length) markTip('coach');
    setK(k + 1);
  };
  const pad = 8;
  const hole = r ? { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 } : null;
  const W = window.innerWidth, H = window.innerHeight, TW = Math.min(320, W - 24), TH = 150;
  let tipStyle: Record<string, string> = { left: '50%', top: '40%', transform: 'translateX(-50%)' };
  if (hole) {
    const clampX = (x: number) => `${Math.max(12, Math.min(W - TW - 12, x))}px`;
    const clampY = (y: number) => `${Math.max(8, Math.min(H - TH - 8, y))}px`;
    if (hole.top + hole.height + TH + 12 < H) tipStyle = { left: clampX(hole.left + hole.width / 2 - TW / 2), top: `${hole.top + hole.height + 12}px` };
    else if (hole.top - TH - 12 > 0) tipStyle = { left: clampX(hole.left + hole.width / 2 - TW / 2), bottom: `${H - hole.top + 12}px` };
    else if (hole.left + hole.width + TW + 16 < W) tipStyle = { left: `${hole.left + hole.width + 12}px`, top: clampY(hole.top + hole.height / 2 - TH / 2) };
    else if (hole.left - TW - 16 > 0) tipStyle = { left: `${hole.left - TW - 12}px`, top: clampY(hole.top + hole.height / 2 - TH / 2) };
    else tipStyle = { left: clampX(hole.left + hole.width / 2 - TW / 2), top: clampY(hole.top + hole.height / 2 - TH / 2) };
  }
  return (
    <div class="coach" onClick={next} role="dialog" aria-label={step.title}>
      {hole && <div class="coach-hole" style={{ left: `${hole.left}px`, top: `${hole.top}px`, width: `${hole.width}px`, height: `${hole.height}px` }} />}
      <div class="coach-tip" style={tipStyle} key={k}>
        <span class="coach-n">{k + 1}/{STEPS.length}</span>
        <b>{step.title}</b>
        <p>{step.text}</p>
        <div class="coach-actions">
          <button type="button" class="chiplink" onClick={(e) => { e.stopPropagation(); markTip('coach'); setK(STEPS.length); }}>Salta</button>
          <button type="button" class="btn primary small" onClick={(e) => { e.stopPropagation(); next(); }}>{k + 1 >= STEPS.length ? 'Ho capito' : 'Avanti'}</button>
        </div>
      </div>
    </div>
  );
}
