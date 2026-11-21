// Il Quaderno della Notte come immagine da condividere (Narrative N16, Marketing): disegnato su canvas, nessun servizio esterno.
import type { RunState } from '../core/types';
import { PALETTE } from '../assets/registry';

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

export function quadernoImage(run: RunState, dawn: string): string | null {
  try {
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = PALETTE.feltro; g.fillRect(0, 0, W, H);
    g.fillStyle = PALETTE.avorio; g.fillRect(60, 60, W - 120, H - 120);
    g.strokeStyle = PALETTE.oro; g.lineWidth = 6; g.strokeRect(80, 80, W - 160, H - 160);
    g.fillStyle = PALETTE.seppia; g.textAlign = 'center';
    g.font = 'bold 64px Georgia, serif'; g.fillText('BARO', W / 2, 180);
    g.font = 'italic 34px Georgia, serif'; g.fillText('Il Quaderno della Notte', W / 2, 235);
    g.font = 'bold 40px Georgia, serif';
    g.fillStyle = run.won ? '#8a6420' : '#9a2a30';
    g.fillText(run.won ? 'All’alba il gallo canta' : 'L’ultimo Lume si è spento', W / 2, 315);
    g.textAlign = 'left'; g.fillStyle = PALETTE.seppia; g.font = 'italic 30px Georgia, serif';
    let y = 390;
    for (const entry of run.chronicle.slice(-14)) {
      for (const l of wrap(g, entry.text, W - 260)) { if (y > H - 260) break; g.fillText(l, 130, y); y += 40; }
      y += 10;
    }
    g.textAlign = 'center'; g.font = 'italic 30px Georgia, serif'; g.fillStyle = '#5a4030';
    for (const [k, l] of wrap(g, `«${dawn}»`, W - 300).entries()) g.fillText(l, W / 2, H - 200 + k * 36);
    g.font = '26px Georgia, serif'; g.fillStyle = '#6a5a4a';
    g.fillText(`Seed ${run.cfg.seed} · Sigillo ${run.cfg.sigillo} · rintocco ${run.rintocco} di 15`, W / 2, H - 110);
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}
