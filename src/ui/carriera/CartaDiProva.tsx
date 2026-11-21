// Carta di PROVA del cap. 1 in SVG: serve finché la scena Pixi del Tavolo del Timone (agente Mondo e mappa,
// src/mondo/scena/) non c'è. Legge le stesse cose della scena vera (bus.carriera, bus.evidenzaMondo) e manda gli
// stessi tocchi (bus.isolaToccata). La scena vera la spegne con `cartaDiProva.value = false` quando parte.
import { signal } from '@preact/signals';
import { bus } from '../../core/bus';
import { CALA_PAPPAGALLO, MONDO_H, MONDO_W } from '../../contenuti/capitolo-1';
import { T } from '../../testi/it';
import { CAP, nomeIsola } from './stato';
import { iconaPremio } from './premi';

export const cartaDiProva = signal(true);

/** raggio del bersaglio di tocco in px logici (≥ 56 px CSS a 800 px di larghezza: 110 × 800/3072 × 2 ≈ 57) */
const RAGGIO_TOCCO = 110;

export function CartaDiProva() {
  const s = bus.carriera.value;
  if (!s) return null;
  const ev = bus.evidenzaMondo.value;
  const rotte = new Set<string>();
  const linee: [number, number, number, number][] = [];
  for (const i of CAP.isole) for (const a of i.adiacenti) {
    const k = [i.id, a].sort().join('-');
    if (rotte.has(k)) continue;
    rotte.add(k);
    const b = CAP.isole.find((x) => x.id === a)!;
    linee.push([i.pos.x, i.pos.y, b.pos.x, b.pos.y]);
  }
  const att = s.attacco;
  return (
    <svg class="car-carta" viewBox={`0 0 ${MONDO_W} ${MONDO_H}`} preserveAspectRatio="xMidYMid meet" data-testid="car-carta" role="img">
      <rect x="0" y="0" width={MONDO_W} height={MONDO_H} class="car-mare" />
      {linee.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} class="car-rotta" />)}
      {att && att.da.map((d) => {
        const a = CAP.isole.find((x) => x.id === d.isola)!.pos;
        const b = CAP.isole.find((x) => x.id === att.verso)!.pos;
        return <line key={d.isola} x1={a.x} y1={a.y} x2={b.x} y2={b.y} class="car-freccia" />;
      })}
      <g class="car-cala">
        <circle cx={CALA_PAPPAGALLO.pos.x} cy={CALA_PAPPAGALLO.pos.y} r={CALA_PAPPAGALLO.raggio} />
        <text x={CALA_PAPPAGALLO.pos.x} y={CALA_PAPPAGALLO.pos.y + CALA_PAPPAGALLO.raggio + 56}>{T.carriera.isole.calaPappagallo}</text>
      </g>
      {CAP.isole.map((i) => {
        const st = s.isole[i.id];
        const mia = st.padrone === 'giocatore';
        const toccabile = ev.toccabili.includes(i.id);
        const scelta = ev.selezionata === i.id;
        const premio = !st.presa && i.premi[0];
        return (
          <g key={i.id} class={`car-isola ${mia ? 'mia' : 'marina'} ${toccabile ? 'toccabile' : ''} ${scelta ? 'scelta' : ''}`}
            data-isola={i.id} onPointerUp={() => bus.isolaToccata.invia(i.id)}>
            <circle cx={i.pos.x} cy={i.pos.y} r={Math.max(RAGGIO_TOCCO, i.raggio + 30)} class="car-tocco" />
            {scelta && <circle cx={i.pos.x} cy={i.pos.y} r={i.raggio + 26} class="car-anello" />}
            <circle cx={i.pos.x} cy={i.pos.y} r={i.raggio} class="car-terra" />
            <text x={i.pos.x} y={i.pos.y + i.raggio + 60} class="car-nome-isola">{nomeIsola(i.id)}</text>
            <g class="car-segnalino">
              <circle cx={i.pos.x} cy={i.pos.y} r={46} />
              <text x={i.pos.x} y={i.pos.y + 20}>{st.pirati}</text>
            </g>
            {premio && <text x={i.pos.x + i.raggio * 0.8} y={i.pos.y - i.raggio * 0.7} class="car-icona-premio">{iconaPremio(premio)}</text>}
          </g>
        );
      })}
    </svg>
  );
}
