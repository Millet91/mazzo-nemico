// Genera i replay d'oro della M1 (piano QA §2 L2): npx tsx tests/replay/genera.ts
// Gioca molte battaglie candidate (IA contro IA e comandi casuali) e sceglie le 10 che insieme coprono
// COPERTURA_M1, preferendo le più corte. Un hash cambiato per un cambio voluto si rigenera così, in un commit
// separato con il motivo (13 §2 L2). Proprietario: Lead test/QA.
import { writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import type { ComandoRegistrato, ConfigBattaglia } from '../../src/core/tipi';
import { generaMappa } from '../../src/battaglia/gen';
import { creaReplay, giocaComandi } from '../../src/battaglia/sim/replay';
import { configCaso, gioca, pilotaCasuale, pilotaIa, type Pilota } from '../qa/banco';
import { BIL } from '../../src/contenuti/bilanciamento';
import { Copertura, COPERTURA_M1, COPERTURA_FACOLTATIVA } from './copertura';

const CARTELLA = 'tests/replay';
const QUANTI = 10;

interface Candidato { nome: string; cfg: ConfigBattaglia; comandi: ComandoRegistrato[]; tag: Set<string>; tick: number }

export const mappaDi = (cfg: ConfigBattaglia) =>
  generaMappa({ seme: cfg.seme, bioma: cfg.bioma, variante: cfg.variante, piratiPerLato: [cfg.squadre[0].pirati, cfg.squadre[1].pirati] });

function candidato(nome: string, cfg: ConfigBattaglia, pilota: Pilota): Candidato {
  const p = gioca(cfg, pilota, false);
  const cop = new Copertura();
  const { stato } = giocaComandi(cfg, mappaDi(cfg), p.comandi, { suEventi: (s, e) => cop.osserva(s, e) });
  return { nome, cfg, comandi: p.comandi, tag: cop.tag, tick: stato.tick };
}

/** IA per una squadra, comandi casuali per l'altra: battaglie lunghe che arrivano al limite. */
function misto(seme: number): Pilota {
  const ia = pilotaIa(), caso = pilotaCasuale(seme);
  return (s) => (s.turno.squadra === 1 ? ia(s) : caso(s));
}

/** L'attaccante si ritira appena può (dal turno di BIL.battaglia.ritirataDalTurno). */
function ritirata(): Pilota {
  const ia = pilotaIa();
  return (s) => (s.turno.squadra === 0 && s.turno.fase === 'azione' && s.turno.numero >= BIL.battaglia.ritirataDalTurno ? [{ t: 'ritirata' }] : ia(s));
}

const candidati: Candidato[] = [];
// Ritirata: in attesa della correzione di A (un comando al tick finale non si rigiocava), poi si riaccende.
if (process.env.CON_RITIRATA) for (let seme = 1; seme <= 5; seme++) candidati.push(candidato(`ritirata-3v3-${seme}`, configCaso(seme + 3000, [3, 3]), ritirata()));
for (let seme = 1; seme <= 60; seme++) {
  for (const n of [3, 5] as const) {
    candidati.push(candidato(`ia-${n}v${n}-${seme}`, configCaso(seme, [n, n]), pilotaIa()));
    candidati.push(candidato(`misto-${n}v${n}-${seme}`, configCaso(seme + 1000, [n, n]), misto(seme)));
  }
  candidati.push(candidato(`caso-${seme}`, configCaso(seme + 2000), pilotaCasuale(seme)));
}

// scelta golosa: a ogni passo il candidato che copre più tag mancanti; a parità il più corto
const mancanti = new Set<string>([...COPERTURA_M1, ...COPERTURA_FACOLTATIVA.filter((t) => t !== 'fine:ritirata' || process.env.CON_RITIRATA)]);
const scelti: Candidato[] = [];
while (scelti.length < QUANTI) {
  let migliore: Candidato | undefined, voto = -1;
  for (const c of candidati) {
    if (scelti.includes(c)) continue;
    const nuovi = [...c.tag].filter((t) => mancanti.has(t));
    // prima i tag mancanti; quando non ne restano, le battaglie più varie (più tag in tutto)
    const v = nuovi.filter((t) => (COPERTURA_M1 as readonly string[]).includes(t)).length * 100 + nuovi.length * 10 + (mancanti.size ? 0 : c.tag.size);
    if (v > voto || (v === voto && migliore && c.tick < migliore.tick)) { voto = v; migliore = c; }
  }
  if (!migliore) break;
  scelti.push(migliore);
  for (const t of migliore.tag) mancanti.delete(t);
}

for (const f of readdirSync(CARTELLA)) if (/^oro-.*\.json$/.test(f)) unlinkSync(`${CARTELLA}/${f}`);
scelti.forEach((c, i) => {
  const replay = creaReplay(c.cfg, mappaDi(c.cfg), c.comandi);
  const copre = [...c.tag].filter((t) => (COPERTURA_M1 as readonly string[]).includes(t) || (COPERTURA_FACOLTATIVA as readonly string[]).includes(t)).sort();
  const file = `${CARTELLA}/oro-${String(i + 1).padStart(2, '0')}-${c.nome}.json`;
  writeFileSync(file, JSON.stringify({ descrizione: `Replay d'oro M1 (${c.nome}), ${replay.tickFinale} tick`, copre, ...replay }) + '\n');
  console.log(`${file}: ${replay.tickFinale} tick, ${c.comandi.length} comandi, copre ${copre.join(', ')}`);
});
const mancaObbl = COPERTURA_M1.filter((t) => mancanti.has(t));
console.log(mancaObbl.length ? `⚠ non coperti: ${mancaObbl.join(', ')}` : '✓ copertura M1 completa');
console.log(`facoltativi non trovati: ${COPERTURA_FACOLTATIVA.filter((t) => mancanti.has(t)).join(', ') || 'nessuno'}`);
