// API pubblica della simulazione di battaglia: CONTRATTO CONGELATO dal Lead (M1).
// Le firme qui sotto non cambiano; l'agente Fisica (A, ramo claude/m1-sim) sostituisce l'implementazione.
// ⚠ IMPLEMENTAZIONE SEGNAPOSTO: pirati che non cadono, colpo che esplode 150 px davanti. Serve solo perché
// render (B), HUD (D) e IA (E) abbiano qualcosa da far girare finché A non consegna.
//
// Regole del contratto (valgono anche per l'implementazione vera):
// - TypeScript puro: niente DOM, Pixi, Preact, Math.random, Date.now, Math.sin/cos/atan2/hypot/pow (core/trig.ts, core/rng.ts).
// - Lo stato è un oggetto semplice (core/tipi.ts StatoBattaglia), mutato sul posto da eseguiComando e avanzaTick.
// - Determinismo: stessa config + stessa mappa + stessi comandi agli stessi tick ⇒ stesso hashStato, su Node e sul telefono.
// - Gli eventi si AGGIUNGONO all'array passato (il chiamante lo svuota quando vuole).

import type {
  Comando, ConfigBattaglia, EsitoColpo, EventoBattaglia, MappaGenerata, PianoColpo, Pirata, Punto, StatoBattaglia,
} from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { semeIniziale, intero } from '../../core/rng';
import { coseno, seno, daGradi } from '../../core/trig';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { dotazioneIniziale } from '../../contenuti/armi';
import { T } from '../../testi/it';

/** Crea lo stato iniziale. La mappa arriva dal generatore (battaglia/gen). Il turno 1 parte in fase 'inquadra'. */
export function creaBattaglia(cfg: ConfigBattaglia, mappa: MappaGenerata): StatoBattaglia {
  const pirati: Pirata[] = [];
  let id = 0;
  for (const lato of [0, 1] as const) {
    const sq = cfg.squadre[lato];
    const vita = sq.ciurma === 'gelo' && sq.ruolo === 'difensore' ? BIL.pirata.pvGeloDifesa : BIL.pirata.pv;
    for (let i = 0; i < sq.pirati; i++) {
      const p = mappa.spawn[lato][i];
      pirati.push({
        id: id++, squadra: lato, nome: T.ciurme[sq.ciurma].pirati[i % 5],
        x: p.x, y: p.y - BIL.pirata.capsulaAltezza / 2, vx: 0, vy: 0, vita, vitaMax: vita,
        verso: lato === 0 ? 1 : -1, aTerra: true, stato: 'vivo', yInizioCaduta: p.y, dannoNelTurno: 0,
      });
    }
  }
  const sq = (lato: 0 | 1) => {
    const c = cfg.squadre[lato];
    return {
      indice: lato, ciurma: c.ciurma, ruolo: c.ruolo, controllo: c.controllo, livelloIa: c.livelloIa,
      munizioni: dotazioneIniziale(), ultimoPirata: -1,
      pvIniziali: pirati.filter((p) => p.squadra === lato).reduce((s, p) => s + p.vita, 0),
    };
  };
  const s: StatoBattaglia = {
    versioneRegole: cfg.versioneRegole, config: cfg, rng: semeIniziale(cfg.seme), tick: 0,
    terreno: { ...mappa.terreno, maschera: mappa.terreno.maschera.slice() },
    vento: 0, squadre: [sq(0), sq(1)], pirati, proiettili: [], prossimoId: 1,
    turno: {
      numero: 0, squadra: 1, pirata: -1, fase: 'inquadra', inizioFase: 0, timerAvviato: false, tickRimasti: 0,
      arma: 'cannone', mira: { mezziGradi: 90, potenza: BIL.mira.potenzaIniziale }, miccia: BIL.mira.micciaPredefinita,
      camminata: 0, sparato: false,
    },
    esito: null,
  };
  iniziaTurno(s, []);
  return s;
}

/** Applica un comando al pirata attivo nel tick corrente. I comandi fuori fase si ignorano. */
export function eseguiComando(s: StatoBattaglia, c: Comando): void {
  const t = s.turno;
  if (s.esito || (t.fase !== 'azione' && t.fase !== 'fuga')) return;
  const p = s.pirati.find((x) => x.id === t.pirata)!;
  if (!t.timerAvviato && t.fase === 'azione') t.timerAvviato = true;
  switch (c.t) {
    case 'muovi': t.camminata = c.dir; if (c.dir) p.verso = c.dir; break;
    case 'mira': if (t.fase === 'azione') t.mira = { mezziGradi: c.mezziGradi, potenza: c.potenza }; break;
    case 'ruotaMira': if (t.fase === 'azione') t.mira.mezziGradi = (t.mira.mezziGradi + c.delta * p.verso + 720) % 720; break;
    case 'arma': if (t.fase === 'azione' && s.squadre[t.squadra].munizioni[c.arma] !== undefined) t.arma = c.arma; break;
    case 'miccia': t.miccia = c.secondi; break;
    case 'fuoco':
      if (t.fase !== 'azione' || t.sparato) return;
      t.sparato = true;
      evts.push({ t: 'sparo', pirata: p.id, arma: t.arma });
      esplodi(s, p.x + coseno(t.mira.mezziGradi) * 150, p.y - seno(t.mira.mezziGradi) * 150, 50, 45, evts);
      cambiaFase(s, 'fuga', evts);
      break;
    default: break;
  }
}
// segnaposto: eventi generati da eseguiComando raccolti fino al prossimo avanzaTick
const evts: EventoBattaglia[] = [];

/** Avanza la simulazione di un tick (1/60 s). */
export function avanzaTick(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  eventi.push(...evts.splice(0));
  if (s.esito) return;
  s.tick++;
  const t = s.turno;
  const p = s.pirati.find((x) => x.id === t.pirata);
  if (p && t.camminata && (t.fase === 'azione' || t.fase === 'fuga')) p.x += t.camminata * BIL.pirata.camminata;
  const inFase = s.tick - t.inizioFase;
  if (t.fase === 'inquadra' && inFase >= BIL.camera.inquadraTick) cambiaFase(s, 'azione', eventi);
  else if (t.fase === 'azione') {
    if (!t.timerAvviato && inFase >= BIL.turno.avvioTimerTick) { t.timerAvviato = true; eventi.push({ t: 'timerAvviato' }); }
    if (t.timerAvviato && --t.tickRimasti <= 0) cambiaFase(s, 'risoluzione', eventi);
  } else if (t.fase === 'fuga' && inFase >= BIL.turno.fugaTick) cambiaFase(s, 'risoluzione', eventi);
  else if (t.fase === 'risoluzione' && inFase >= 30) iniziaTurno(s, eventi);
}

/** Hash dello stato (FNV-1a su numeri e maschera) per i replay d'oro. */
export function hashStato(s: StatoBattaglia): string {
  let h = 2166136261 >>> 0;
  const n = (x: number) => { h = Math.imul(h ^ (Math.round(x * 1000) | 0), 16777619) >>> 0; };
  n(s.tick); n(s.rng); n(s.vento); n(s.terreno.mare);
  for (const p of s.pirati) { n(p.x); n(p.y); n(p.vx); n(p.vy); n(p.vita); }
  for (let i = 0; i < s.terreno.maschera.length; i += 64) n(s.terreno.maschera[i]);
  return h.toString(16).padStart(8, '0');
}

/** Simula un tiro senza toccare `s` (per l'IA). Deve costare poco: niente copia della maschera. */
export function simulaColpo(s: StatoBattaglia, piano: PianoColpo): EsitoColpo {
  const p = s.pirati.find((x) => x.id === piano.pirata)!;
  const x = p.x + coseno(piano.mezziGradi) * 150, y = p.y - seno(piano.mezziGradi) * 150;
  const danni: Record<number, number> = {};
  const uccisi: number[] = [];
  for (const q of s.pirati) {
    if (q.stato !== 'vivo') continue;
    const d = Math.sqrt((q.x - x) ** 2 + (q.y - y) ** 2);
    if (d < 50) { const dn = Math.max(1, Math.floor(45 * (1 - d / 50))); danni[q.id] = dn; if (dn >= q.vita) uccisi.push(q.id); }
  }
  return { danni, uccisi, annegati: [], impatto: { x, y }, tick: 1 };
}

/** Punti della traiettoria prevista (linea tratteggiata): la usa il render. Non muta `s`. */
export function traiettoria(s: StatoBattaglia, maxPunti = 60): Punto[] {
  const p = s.pirati.find((x) => x.id === s.turno.pirata);
  if (!p) return [];
  const a = s.turno.mira.mezziGradi;
  const v = (BIL.fisica.velocitaMaxProiettile * s.turno.mira.potenza) / 100;
  const out: Punto[] = [];
  let x = p.x, y = p.y, vx = coseno(a) * v, vy = -seno(a) * v;
  for (let i = 0; i < maxPunti * 3; i++) {
    vy += BIL.fisica.gravita; x += vx; y += vy;
    if (i % 3 === 0) out.push({ x, y });
  }
  return out;
}

/** Il pirata attivo (o undefined a battaglia finita). */
export function pirataAttivo(s: StatoBattaglia): Pirata | undefined {
  return s.pirati.find((x) => x.id === s.turno.pirata && x.stato === 'vivo');
}

// ─── segnaposto interni ───

function cambiaFase(s: StatoBattaglia, f: StatoBattaglia['turno']['fase'], e: EventoBattaglia[]) {
  s.turno.fase = f; s.turno.inizioFase = s.tick; s.turno.camminata = 0; e.push({ t: 'fase', fase: f });
}

function iniziaTurno(s: StatoBattaglia, e: EventoBattaglia[]) {
  const t = s.turno;
  for (const sq of [0, 1] as const) if (!s.pirati.some((p) => p.squadra === sq && p.stato === 'vivo')) {
    const esito = { vincitore: (1 - sq) as 0 | 1, motivo: 'eliminazione' as const, superstiti: [0, 0] as [number, number], pvTotali: [0, 0] as [number, number], turni: t.numero, annegati: [0, 0] as [number, number] };
    s.esito = esito; t.fase = 'fine'; e.push({ t: 'fine', esito }); return;
  }
  t.numero++; t.squadra = (1 - t.squadra) as 0 | 1;
  const vivi = s.pirati.filter((p) => p.squadra === t.squadra && p.stato === 'vivo');
  const sq = s.squadre[t.squadra];
  sq.ultimoPirata = (sq.ultimoPirata + 1) % vivi.length;
  const p = vivi[sq.ultimoPirata];
  t.pirata = p.id; t.sparato = false; t.timerAvviato = false;
  t.tickRimasti = s.config.timerSecondi * TICK_AL_SECONDO;
  t.mira = { mezziGradi: p.verso === 1 ? daGradi(45) : daGradi(135), potenza: BIL.mira.potenzaIniziale };
  s.vento = intero(s, -BIL.ventoMax[s.config.bioma], BIL.ventoMax[s.config.bioma]);
  cambiaFase(s, 'inquadra', e);
  e.push({ t: 'turnoIniziato', numero: t.numero, squadra: t.squadra, pirata: p.id, vento: s.vento });
}

function esplodi(s: StatoBattaglia, x: number, y: number, r: number, danno: number, e: EventoBattaglia[]) {
  const { w, maschera } = s.terreno;
  for (let yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(s.terreno.h - 1, y + r); yy++)
    for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(w - 1, x + r); xx++)
      if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r && maschera[yy * w + xx] !== MATERIALE.ferro) maschera[yy * w + xx] = MATERIALE.aria;
  e.push({ t: 'esplosione', x, y, raggio: r, arma: 'cannone' }, { t: 'cratere', x, y, raggio: r });
  for (const q of s.pirati) {
    if (q.stato !== 'vivo') continue;
    const d = Math.sqrt((q.x - x) ** 2 + (q.y - y) ** 2);
    if (d >= r) continue;
    const dn = Math.max(1, Math.floor(danno * (1 - d / r)));
    q.vita = Math.max(0, q.vita - dn);
    e.push({ t: 'danno', pirata: q.id, quanto: dn, x: q.x, y: q.y - 20 });
    if (q.vita === 0) { q.stato = 'morto'; e.push({ t: 'morto', pirata: q.id, causa: 'pv' }); }
  }
}
