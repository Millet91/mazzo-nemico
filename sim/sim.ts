// Simulatore di bilanciamento: tre giocatori finti giocano N partite.
//   casuale = gioca carte a caso (il giocatore distratto: deve perdere spesso)
//   medio   = colpisce chi è più vicino alla porta, ruba quando può
//   bravo   = prova ogni mossa e tiene quella che lascia la fila meno pericolosa
// Uso: npx tsx sim/sim.ts [partite]
import { CARTE, CartaId, TRUCCHI } from '../src/game/carte';
import { FILA, Stato, anteprima, fineTurno, gioca, nonGiocabile, nuovaPartita, scegli } from '../src/game/regole';
import { rand } from '../src/game/rng';

type Bot = 'casuale' | 'medio' | 'bravo';

function mosse(s: Stato): [number, number | undefined][] {
  const out: [number, number | undefined][] = [];
  for (const c of s.inMano) {
    if (CARTE[c.id].bersaglio === 'nessuno') {
      if (!nonGiocabile(s, c.uid)) out.push([c.uid, undefined]);
    } else {
      for (const n of s.fila) if (n && !nonGiocabile(s, c.uid, n.uid)) out.push([c.uid, n.uid]);
    }
  }
  return out;
}

/** Pericolo della fila: Forza pesata per vicinanza alla porta. */
function pericolo(s: Stato): number {
  let p = 0;
  s.fila.forEach((n, i) => {
    if (!n) return;
    const f = n.id === 'barile' && !n.smascherato ? 5 : n.forza;
    const scudo = (n.id === 'corazzato' || n.id === 'spettro') && !n.smascherato ? 1.5 : 1;
    p += f * scudo * (FILA + 1 - i) / FILA;
    if (n.id === 'oste' && !n.smascherato) p += 2;
    if (n.id === 'capobanda' && !n.smascherato) p += 1.5;
  });
  return p + anteprima(s).danno * 3 - s.vite * 0.5 - s.stats.rubati.length * 0.8;
}

function turno(s: Stato, bot: Bot, seed: number): [Stato, number] {
  let guard = 0;
  while (guard++ < 30) {
    const m = mosse(s);
    if (!m.length) break;
    if (bot === 'casuale') {
      let r: number; [r, seed] = rand(seed);
      if (r < 0.15) break; // a volte passa senza pensarci
      [r, seed] = rand(seed);
      const [c, b] = m[Math.floor(r * m.length)];
      s = gioca(s, c, b).stato;
      continue;
    }
    if (bot === 'medio') {
      // ruba se può, altrimenti colpisci il primo nemico colpibile
      const furto = m.find(([c]) => ['ruba', 'grandefurto'].includes(s.inMano.find((x) => x.uid === c)!.id));
      const scelta = furto ?? m.find(([c, b]) => b !== undefined && s.fila.findIndex((n) => n?.uid === b) === s.fila.findIndex(Boolean))
        ?? m.find(([c, b]) => b === undefined && !['ritirata', 'comando'].includes(s.inMano.find((x) => x.uid === c)!.id));
      if (!scelta) break;
      s = gioca(s, scelta[0], scelta[1]).stato;
      continue;
    }
    // bravo: greedy su pericolo
    let best = pericolo(s) - 0.01, mossa: [number, number | undefined] | null = null;
    for (const [c, b] of m) {
      const p = pericolo(gioca(s, c, b).stato);
      if (p < best) { best = p; mossa = [c, b]; }
    }
    if (!mossa) break;
    s = gioca(s, mossa[0], mossa[1]).stato;
  }
  return [s, seed];
}

function partita(seed: number, bot: Bot) {
  let s = nuovaPartita(seed);
  let r = seed * 7 + 1;
  let guard = 0;
  while (s.fase !== 'vinto' && s.fase !== 'perso' && guard++ < 400) {
    if (s.fase === 'premio') {
      let x: number; [x, r] = rand(r);
      const scelta: CartaId | 'riposo' = bot === 'casuale' ? s.offerta[Math.floor(x * 3)]
        : s.vite < 10 ? 'riposo' : [...s.offerta].sort((a, b) => TRUCCHI.indexOf(a) - TRUCCHI.indexOf(b))[0];
      s = scegli(s, scelta);
      continue;
    }
    [s, r] = turno(s, bot, r);
    if (s.fase !== "turno") continue;
    const passi = fineTurno(s);
    s = passi[passi.length - 1].stato;
  }
  return s;
}

const N = Number(process.argv[2] ?? 300);
if (N > 0) for (const bot of ['casuale', 'medio', 'bravo'] as Bot[]) {
  let vinte = 0, turni = 0, mano = [0, 0, 0, 0], vite = 0, rub = 0;
  for (let i = 1; i <= N; i++) {
    const s = partita(i * 9973, bot);
    if (s.fase === 'vinto') { vinte++; vite += s.vite; } else mano[s.mano]++;
    turni += s.stats.turni;
    rub += s.stats.rubati.length;
  }
  console.log(`${bot.padEnd(8)} vince ${(100 * vinte / N).toFixed(0)}%  turni ${(turni / N).toFixed(0)}  rubati ${(rub / N).toFixed(1)}  perse in mano 1/2/3: ${mano.slice(1).join('/')}  vite finali ${(vite / Math.max(1, vinte)).toFixed(1)}`);
}

if (process.env.TRACE) {
  let s = nuovaPartita(Number(process.env.TRACE));
  let r = 5;
  while (s.fase === 'turno' || s.fase === 'premio') {
    if (s.fase === 'premio') { s = scegli(s, s.offerta[0]); continue; }
    const f = s.fila.map((n) => n ? `${n.id.slice(0, 4)}${n.forza}` : '____').join(' ');
    const mano = s.inMano.map((c) => c.id).join(',');
    [s, r] = turno(s, (process.env.BOT ?? 'medio') as Bot, r);
    console.log(`M${s.mano} T${s.turno} V${s.vite} | ${f} | ${mano} -> ${s.fila.map((n) => n ? `${n.id.slice(0, 4)}${n.forza}` : '____').join(' ')} mazzo ${s.mazzoN.length}`);
    if (s.fase !== 'turno') continue;
    const p = fineTurno(s); s = p[p.length - 1].stato;
  }
  console.log(s.fase, s.vite);
}
