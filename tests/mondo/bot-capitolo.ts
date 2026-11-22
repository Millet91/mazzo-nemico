// Bot del cap. 1 (QA §3.10, Lead P2): gioca il capitolo dall'inizio alla fine con le regole vere della carriera
// (mondo/carriera/regole.ts) e BATTAGLIE VERE nel simulatore (battaglia/sim, IA della Marina a Mozzo).
// Il giocatore è l'IA con un livello a scelta più un errore di mira "umano" (seme della partita), così partite
// diverse danno battaglie diverse. Misura: battaglie, vittorie al primo tentativo, round, stelle, tempo stimato.
//
//   npx tsx tests/mondo/bot-capitolo.ts [partite=20] [livello=mozzo|nostromo|capitano] [file-rapporto.md]
//
// Tempo stimato (a mano, in gioco vero): tick della sim / 60 + per ogni turno del giocatore il tempo di mira di una
// persona (SECONDI_MIRA) + per ogni turno dell'IA l'attesa di "il capitano medita" + mappa e scene (15 §1.4).
import { writeFileSync } from 'node:fs';
import type { Comando, EsitoBattaglia, LivelloIa, StatoBattaglia } from '../../src/core/tipi';
import type { StatoCarriera } from '../../src/core/carriera';
import { casuale, semeIniziale, type ConRng } from '../../src/core/rng';
import { creaBattaglia, eseguiComando, avanzaTick } from '../../src/battaglia/sim';
import { decidi } from '../../src/battaglia/ia';
import { BIL, TICK_AL_SECONDO } from '../../src/contenuti/bilanciamento';
import { CAPITOLO_1 as C } from '../../src/contenuti/capitolo-1';
import * as R from '../../src/mondo/carriera/regole';
import { battagliaDaAttacco } from '../../src/mondo/carriera/battaglia';
import { mappaPer, TICK_MAX } from '../qa/banco';

/** errore di mira del giocatore in mezzi gradi e punti di potenza (RUMORE=0 per un giocatore perfetto come l'IA) */
export const RUMORE = Number(process.env.RUMORE ?? 8);
/** secondi che una persona passa a muovere e mirare nel suo turno (il bot spara subito) */
export const SECONDI_MIRA = 10;
/** minuti per round sulla mappa (rinforzi, scelte, animazioni) e per le scene del capitolo (15 §1.4) */
export const MINUTI_ROUND = 1.5;
export const MINUTI_SCENE = 3;
/** minuti massimi per una battaglia (QA §3.10) */
export const MINUTI_BATTAGLIA_MAX = 4;

export interface Battaglia {
  isola: string;
  difesa: boolean;
  scontro: string;
  pirati: [number, number];
  vinta: boolean;
  motivo: string;
  turni: number;
  tick: number;
  turniGiocatore: number;
  minuti: number;
  bloccata: boolean;
}

export interface Partita {
  vinta: boolean;
  round: number;
  stelle: number;
  battaglie: Battaglia[];
  minuti: number;
}

/** Il giocatore: l'IA del livello scelto, con un errore di mira suo (seminato), così ogni partita è diversa. */
function pilotaGiocatore(livello: LivelloIa, r: ConRng, squadra: 0 | 1) {
  let fatto = -1;
  return (s: StatoBattaglia): Comando[] => {
    if (s.turno.fase !== 'azione' || fatto === s.turno.numero) return [];
    fatto = s.turno.numero;
    const umano = s.turno.squadra === squadra;
    const p = decidi(s, umano ? livello : s.squadre[s.turno.squadra].livelloIa ?? 'mozzo');
    let mezzi = p.mezziGradi, potenza = p.potenza;
    if (umano) {
      // ±4° e ±8% di potenza: una persona non è precisa come la simulazione
      mezzi = Math.round(mezzi + (casuale(r) * 2 - 1) * RUMORE);
      potenza = Math.max(5, Math.min(100, Math.round(potenza + (casuale(r) * 2 - 1) * RUMORE)));
    }
    const c: Comando[] = [{ t: 'arma', arma: p.arma }, { t: 'mira', mezziGradi: mezzi, potenza }];
    if (p.miccia) c.push({ t: 'miccia', secondi: p.miccia });
    c.push({ t: 'fuoco' });
    return c;
  };
}

/** Gioca la battaglia dell'attacco in corso e restituisce l'esito per la carriera. */
export function giocaBattaglia(s: StatoCarriera, livello: LivelloIa, r: ConRng): { esito: EsitoBattaglia | null; info: Battaglia } {
  const b = battagliaDaAttacco(C, s, 0)!;
  const cfg = b.config;
  const umano: 0 | 1 = cfg.squadre[0].controllo === 'umano' ? 0 : 1;
  const st = creaBattaglia(cfg, mappaPer(cfg));
  const pilota = pilotaGiocatore(livello, r, umano);
  const eventi: unknown[] = [];
  const turniVisti = new Set<number>();
  let turniGiocatore = 0, turniIa = 0;
  while (!st.esito && st.tick < TICK_MAX) {
    if (st.turno.fase === 'azione' && !turniVisti.has(st.turno.numero)) {
      turniVisti.add(st.turno.numero);
      if (st.turno.squadra === umano) turniGiocatore++; else turniIa++;
    }
    for (const c of pilota(st)) eseguiComando(st, c);
    avanzaTick(st, eventi as never);
    eventi.length = 0;
  }
  const e = st.esito;
  const vinta = !!e && e.vincitore === umano;
  const secondi = st.tick / TICK_AL_SECONDO + turniGiocatore * SECONDI_MIRA
    + turniIa * (BIL.ia.pensieroMinimoMs + BIL.ia.animazioneMiraMs) / 1000;
  return {
    esito: e,
    info: {
      isola: s.attacco!.verso, difesa: s.attacco!.difesa, scontro: b.carriera.scontro.tipo,
      pirati: [cfg.squadre[0].pirati, cfg.squadre[1].pirati], vinta, motivo: e?.motivo ?? 'bloccata',
      turni: e?.turni ?? st.turno.numero, tick: st.tick, turniGiocatore, minuti: secondi / 60, bloccata: !e,
    },
  };
}

/** Strategia della mappa: rinforzi sulle isole di confine più deboli, poi attacca dove ha più pirati del difensore. */
function rinforza(s0: StatoCarriera): StatoCarriera {
  let s = s0;
  for (let g = 0; g < 30 && s.fase === 'rinforzi'; g++) {
    const opz = R.isoleRinforzabili(C, s);
    if (!opz.length) { s = R.fineRinforzi(C, s); break; }
    const confine = (id: string) => C.isole.find((i) => i.id === id)!.adiacenti.some((a) => s.isole[a].padrone !== 'giocatore');
    opz.sort((a, b) => Number(confine(b)) - Number(confine(a)) || s.isole[a].pirati - s.isole[b].pirati || a.localeCompare(b));
    s = R.piazzaRinforzo(C, s, opz[0]).stato;
    if (s.rinforzi === 0) s = R.fineRinforzi(C, s);
  }
  return s;
}

export function giocaCapitolo(seme: number, livello: LivelloIa = 'mozzo'): Partita {
  const r: ConRng = { rng: semeIniziale(seme) };
  let s = R.nuovaCarriera(C);
  const battaglie: Battaglia[] = [];
  const combatti = () => {
    const { esito, info } = giocaBattaglia(s, livello, r);
    battaglie.push(info);
    s = esito ? R.applicaEsito(C, s, esito).stato : R.annullaAttacco(s);
    if (!esito && s.attacco === null && s.fase === 'attacco' && info.difesa) s = R.chiudiRound(C, s).stato;
  };
  for (let giro = 0; giro < 40 && s.fase !== 'fine'; giro++) {
    s = rinforza(s);
    // attacchi: il bersaglio con il rapporto migliore, finché ce ne sono con almeno un pirato in più del difensore
    for (let n = 0; n < 8 && s.fase === 'attacco'; n++) {
      const scelte = R.bersagli(C, s).map((v) => {
        const da = R.imbarcoProposto(C, s, v);
        const att = da.reduce((k, d) => k + d.pirati, 0);
        return { v, da, att, dif: s.isole[v].pirati };
      }).filter((x) => x.att > x.dif || (C.isole.find((i) => i.id === x.v)!.scontro?.tipo === 'duello' && x.att >= 1))
        .sort((a, b) => b.att / b.dif - a.att / a.dif || a.v.localeCompare(b.v));
      if (!scelte.length) break;
      const motivo = R.controllaAttacco(C, s, scelte[0].v, scelte[0].da);
      if (motivo) throw new Error(`attacco proposto non valido verso ${scelte[0].v} (${motivo}): ${JSON.stringify(scelte[0].da)} stato ${JSON.stringify(s.isole)}`);
      s = R.preparaAttacco(C, s, scelte[0].v, scelte[0].da);
      combatti();
    }
    if (s.fase !== 'attacco') continue;
    s = R.turnoMarina(C, s).stato;
    if (s.attacco?.difesa) combatti();
  }
  const vinta = R.esitoCapitolo(C, s) === 'vinto';
  const minuti = battaglie.reduce((k, b) => k + b.minuti, 0) + s.round * MINUTI_ROUND + MINUTI_SCENE;
  return { vinta, round: s.round, stelle: vinta ? R.stelleCapitolo(s) : 0, battaglie, minuti };
}

// ─── Rapporto ────────────────────────────────────────────────────────────────────────────────────

const f1 = (x: number) => x.toFixed(1).replace('.', ',');
const pc = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export function rapporto(partite: Partita[], livello: LivelloIa): string {
  const tutte = partite.flatMap((p) => p.battaglie);
  const attacchi = tutte.filter((b) => !b.difesa);
  // prima volta che si attacca ogni isola, per partita
  let primi = 0, primiVinti = 0;
  for (const p of partite) {
    const visti = new Set<string>();
    for (const b of p.battaglie) if (!b.difesa && !visti.has(b.isola)) { visti.add(b.isola); primi++; if (b.vinta) primiVinti++; }
  }
  const perIsola = new Map<string, Battaglia[]>();
  for (const b of attacchi) perIsola.set(b.isola, [...(perIsola.get(b.isola) ?? []), b]);
  const minuti = partite.map((p) => p.minuti).sort((a, b) => a - b);
  const med = minuti[Math.floor(minuti.length / 2)] ?? 0;
  const lunghe = tutte.filter((b) => b.minuti > MINUTI_BATTAGLIA_MAX).length;
  const righe = [
    `# Bot del cap. 1 «Acque di Casa»`,
    ``,
    `${partite.length} partite, giocatore = IA ${livello} con errore di mira umano (±${RUMORE / 2}°, ±${RUMORE}%), Marina a Mozzo, battaglie vere nel simulatore.`,
    `Tempo stimato = tick/60 + ${SECONDI_MIRA} s di mira per ogni turno del giocatore + pensiero dell'IA + ${MINUTI_ROUND} min per round + ${MINUTI_SCENE} min di scene.`,
    ``,
    `| Misura | Valore | Obiettivo (QA §3.10) |`,
    `|---|---|---|`,
    `| Capitoli vinti | ${partite.filter((p) => p.vinta).length}/${partite.length} (${pc(partite.filter((p) => p.vinta).length, partite.length)}%) | ~95% |`,
    `| Vittorie al primo tentativo per isola | ${primiVinti}/${primi} (${pc(primiVinti, primi)}%) | ~95% |`,
    `| Durata del capitolo (mediana, min-max) | ${f1(med)} min (${f1(minuti[0] ?? 0)}-${f1(minuti.at(-1) ?? 0)}) | 35-45 min |`,
    `| Battaglie per capitolo (media) | ${f1(tutte.length / partite.length)} | 6-7 |`,
    `| Battaglie oltre ${MINUTI_BATTAGLIA_MAX} min | ${lunghe}/${tutte.length} | 0 |`,
    `| Battaglie bloccate (senza esito) | ${tutte.filter((b) => b.bloccata).length} | 0 |`,
    `| Fine delle battaglie | ${['eliminazione', 'tempo', 'ritirata', 'bandiera'].map((m) => `${m} ${tutte.filter((b) => b.motivo === m).length}`).join(' · ')} | — |`,
    `| Difese giocate (media) | ${f1(tutte.filter((b) => b.difesa).length / partite.length)} | — |`,
    `| Round (media) · stelle (media) | ${f1(partite.reduce((k, p) => k + p.round, 0) / partite.length)} · ${f1(partite.reduce((k, p) => k + p.stelle, 0) / partite.length)} | ≤ 6 per ★★ |`,
    ``,
    `| Isola | Scontro | Attacchi | Vinti | Minuti medi | Turni medi |`,
    `|---|---|---|---|---|---|`,
    ...C.isole.filter((i) => perIsola.has(i.id)).map((i) => {
      const bs = perIsola.get(i.id)!;
      return `| ${i.id} | ${bs[0].scontro} | ${bs.length} | ${pc(bs.filter((b) => b.vinta).length, bs.length)}% | ${f1(bs.reduce((k, b) => k + b.minuti, 0) / bs.length)} | ${f1(bs.reduce((k, b) => k + b.turni, 0) / bs.length)} |`;
    }),
  ];
  return righe.join('\n') + '\n';
}

// ─── Riga di comando ─────────────────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('bot-capitolo.ts')) {
  const n = Number(process.argv[2] ?? 20);
  const livello = (process.argv[3] ?? 'mozzo') as LivelloIa;
  const t0 = Date.now();
  const partite: Partita[] = [];
  for (let i = 1; i <= n; i++) {
    const p = giocaCapitolo(i, livello);
    partite.push(p);
    console.error(`partita ${i}: ${p.vinta ? 'vinta' : 'persa'} al round ${p.round}, ${p.battaglie.length} battaglie, ${f1(p.minuti)} min stimati`);
  }
  const testo = rapporto(partite, livello) + `\n_Calcolato in ${Math.round((Date.now() - t0) / 1000)} s._\n`;
  console.log(testo);
  if (process.argv[4]) writeFileSync(process.argv[4], testo);
}
