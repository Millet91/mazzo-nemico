// Mostra un asset del registro nella UI Preact: l'immagine definitiva se c'è, altrimenti il segnaposto.
// Gli animati usano lo sheet a una riga come sfondo e un'animazione CSS a scatti (steps).
// In sviluppo il segnaposto ha un puntino magenta nell'angolo (11 §5): si vede subito cosa manca.
import type { VisualAsset } from './registry';

export function Art({ a, cls = '', label, scala = 1 }: { a: VisualAsset; cls?: string; label?: string; scala?: number }) {
  const w = a.w * scala;
  const h = a.h * scala;
  if (a.image && a.tipo === 'anim' && a.anim) {
    const { frames, fps, loop, cols } = a.anim;
    const style = {
      width: `${w}px`, height: `${h}px`,
      backgroundImage: `url(${a.image})`, backgroundSize: `${cols * w}px ${h}px`,
      animation: `art-sheet ${frames / fps}s steps(${frames}) ${loop ? 'infinite' : '1 forwards'}`,
      '--art-fine': `${-cols * w}px`,
    } as Record<string, string>;
    return <span class={`art anim ${cls}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'} style={style} />;
  }
  if (a.image && a.tipo !== 'video') {
    return (
      <img class={`art ${cls}`} src={a.image} srcset={a.image2x ? `${a.image} 1x, ${a.image2x} 2x` : undefined}
        width={w} height={h} alt={label ?? ''} draggable={false} />
    );
  }
  return (
    <span class={`art glyph ${import.meta.env.DEV ? 'segnaposto' : ''} ${cls}`} aria-hidden="true"
      style={{ width: `${w}px`, height: `${h}px`, fontSize: `${Math.min(w, h) * 0.7}px` }}>
      {a.glyph}
    </span>
  );
}
