// Ciclo del turno (studio v2, Fase 1): inquadra → azione → fuga → volo → risoluzione (→ fine).
// La fuga parte allo sparo: ci si muove mentre il colpo vola. Dura BIL.ritmo.fugaTick e si chiude prima col comando
// `fatto` o se il pirata resta fermo per BIL.ritmo.fermoFugaTick. Il volo c'è solo se alla fine della fuga qualcosa
// vola ancora. Timer per sparo: scorre solo in 'azione'.
// Timer che parte al primo comando o dopo 2 s, rotazione dei pirati vivi, vento nuovo a ogni turno, mare che
// sale dal turno 12, fine a tempo al turno 18 (parità al difensore), eliminazione, ritirata dell'attaccante,
// lapide-barilotto a fine risoluzione, risoluzione forzata dopo 10 s (caso 8).

import type { EsitoBattaglia, EventoBattaglia, FaseTurno, MotivoFine, Pirata, Proiettile, StatoBattaglia } from '../../core/tipi';
import { intero } from '../../core/rng';
import { daGradi } from '../../core/trig';
import { ARMA } from '../../contenuti/armi';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { annega, fermo, inAcqua, inGioco } from './pirata';
import { aggiornaPirata, balzo } from './movimento';
import { esplodi, tiroVicino } from './esplosione';
import { regoleScontro } from './scontro';
import { bersagliDi, colpoIstantaneo, durataColpi, fisicaDi, spara, tickColpo } from './armi';
import { muoviProiettile } from './proiettili';
import { aggiornaPezzi, frantumaTutti, pezziInCaduta } from './pezzi';
import { MICCIA_LAPIDE_TICK, VITA_MAX_PROIETTILE } from './costanti';
import { apriCassa, attivo as proiettileAttivo, bersagliOggetti, centroOggetto, eOggetto, forseCassa, scendiCassa } from './oggetti';

export function pirataDelTurno(s: StatoBattaglia): Pirata | undefined {
  return s.pirati.find((p) => p.id === s.turno.pirata);
}

export function cambiaFase(s: StatoBattaglia, f: FaseTurno, eventi: EventoBattaglia[]): void {
  const t = s.turno;
  t.fase = f; t.inizioFase = s.tick; t.camminata = 0; t.arrampicata = 0; t.fermoDa = -1;
  eventi.push({ t: 'fase', fase: f });
}

/** Indice della squadra attaccante (in M1 la 0). */
export function squadraAttaccante(s: StatoBattaglia): 0 | 1 {
  return s.squadre[1].ruolo === 'attaccante' && s.squadre[0].ruolo !== 'attaccante' ? 1 : 0;
}

export function squadraDifensore(s: StatoBattaglia): 0 | 1 {
  return (1 - squadraAttaccante(s)) as 0 | 1;
}

/** Mira di inizio turno: 45° davanti al pirata, potenza 60%. */
export function miraIniziale(verso: 1 | -1): { mezziGradi: number; potenza: number } {
  const g = BIL.mira.angoloInizialeGradi;
  return { mezziGradi: daGradi(verso === 1 ? g : 180 - g), potenza: BIL.mira.potenzaIniziale };
}

export function iniziaTurno(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  const t = s.turno;
  t.numero++;
  t.squadra = t.numero === 1 ? squadraAttaccante(s) : ((1 - t.squadra) as 0 | 1);
  const sq = s.squadre[t.squadra];
  const membri = s.pirati.filter((p) => p.squadra === t.squadra); // in ordine di id
  let scelto = -1;
  for (let k = 1; k <= membri.length; k++) {
    const j = (sq.ultimoPirata + k + membri.length) % membri.length;
    if (inGioco(membri[j])) { scelto = j; break; }
  }
  // (non succede: la fine si controlla prima) — per sicurezza resta sul primo
  if (scelto < 0) scelto = 0;
  sq.ultimoPirata = scelto;
  const p = membri[scelto];
  for (const q of s.pirati) { q.dannoNelTurno = 0; if (q.macerieNelTurno) q.macerieNelTurno = 0; }
  t.pirata = p.id;
  t.sparato = false;
  t.timerAvviato = false;
  t.tickRimasti = s.config.timerSecondi * TICK_AL_SECONDO;
  t.arma = 'cannone';
  t.mira = miraIniziale(p.verso);
  t.miccia = BIL.mira.micciaPredefinita;
  const max = BIL.ventoMax[s.config.bioma];
  s.vento = max > 0 ? intero(s, -max, max) : 0;
  eventi.push({ t: 'turnoIniziato', numero: t.numero, squadra: t.squadra, pirata: p.id, vento: s.vento });
  cambiaFase(s, 'inquadra', eventi);
  forseCassa(s, eventi);
}

function contaVivi(s: StatoBattaglia, sq: 0 | 1): number {
  let n = 0;
  for (const p of s.pirati) if (p.squadra === sq && inGioco(p)) n++;
  return n;
}

function pvTotali(s: StatoBattaglia, sq: 0 | 1): number {
  let n = 0;
  for (const p of s.pirati) if (p.squadra === sq && inGioco(p)) n += p.vita;
  return n;
}

function esitoDi(s: StatoBattaglia, vincitore: 0 | 1, motivo: MotivoFine): EsitoBattaglia {
  const annegati: [number, number] = [0, 0];
  for (const p of s.pirati) if (p.stato === 'annegato') annegati[p.squadra]++;
  const esito: EsitoBattaglia = {
    vincitore, motivo,
    superstiti: [contaVivi(s, 0), contaVivi(s, 1)],
    pvTotali: [pvTotali(s, 0), pvTotali(s, 1)],
    turni: s.turno.numero,
    annegati,
  };
  return esito;
}

export function concludi(s: StatoBattaglia, vincitore: 0 | 1, motivo: MotivoFine, eventi: EventoBattaglia[]): void {
  s.esito = esitoDi(s, vincitore, motivo);
  chiudiBattaglia(s, eventi);
}

/** Porta la battaglia in fase 'fine' (anche dopo una ritirata decisa da eseguiComando). */
function chiudiBattaglia(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  s.proiettili = s.proiettili.filter((p) => !proiettileAttivo(p));
  frantumaTutti(s, eventi);
  s.turno.camminata = 0;
  cambiaFase(s, 'fine', eventi);
  eventi.push({ t: 'fine', esito: s.esito! });
}

/** Controlla eliminazione e limite di turni; se la battaglia continua parte il turno successivo. */
function fineTurno(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  const b = BIL.battaglia;
  if (s.turno.numero >= b.mareSaleDalTurno) {
    s.terreno.mare -= b.mareSalePx;
    eventi.push({ t: 'mareSale', livello: s.terreno.mare });
    for (const p of s.pirati) if (p.stato === 'vivo' && inAcqua(p, s.terreno.mare)) annega(p, eventi);
  }
  const v0 = contaVivi(s, 0), v1 = contaVivi(s, 1);
  const dif = squadraDifensore(s);
  if (v0 === 0 && v1 === 0) return concludi(s, dif, 'eliminazione', eventi);
  if (v0 === 0) return concludi(s, 1, 'eliminazione', eventi);
  if (v1 === 0) return concludi(s, 0, 'eliminazione', eventi);
  if (s.turno.numero >= b.turnoLimite) {
    const pv0 = pvTotali(s, 0), pv1 = pvTotali(s, 1);
    const vince = pv0 === pv1 ? dif : pv0 > pv1 ? 0 : 1;
    return concludi(s, vince, 'tempo', eventi);
  }
  iniziaTurno(s, eventi);
}

/** I pirati a terra con 0 PV diventano lapidi-barilotto. Restituisce quante ne sono nate. */
function creaLapidi(s: StatoBattaglia, eventi: EventoBattaglia[]): number {
  let n = 0;
  for (const p of s.pirati) {
    if (p.stato !== 'vivo' || p.vita > 0) continue;
    p.stato = 'morto';
    p.appeso = -1;
    p.vx = 0; p.vy = 0;
    eventi.push({ t: 'morto', pirata: p.id, causa: 'pv' });
    const id = s.prossimoId++;
    s.proiettili.push({
      id, tipo: 'lapide', arma: 'lapide', x: p.x, y: p.y, vx: 0, vy: 0,
      tickEsplosione: s.tick + MICCIA_LAPIDE_TICK, lanciatore: -1, fermo: false,
    });
    eventi.push({ t: 'lapide', pirata: p.id, proiettile: id });
    n++;
  }
  return n;
}

/** Un'esplosione in risoluzione allunga il tetto dei 10 s (le catene di lapidi e barili hanno il loro tempo). */
function dopoEsplosione(s: StatoBattaglia): void {
  if (s.turno.fase === 'risoluzione') s.turno.inizioFase = s.tick;
}

/** Ciurma di chi ha lanciato il proiettile (per il tratto del Teschio), o null. */
function ciurmaDi(s: StatoBattaglia, pr: Proiettile) {
  if (pr.lanciatore < 0) return null;
  const p = s.pirati.find((q) => q.id === pr.lanciatore);
  return p ? s.squadre[p.squadra].ciurma : null;
}

/** Fa scoppiare un proiettile (arma, lapide, barile o cassa). `suTerreno` = è scoppiato urtando il terreno. */
function scoppia(s: StatoBattaglia, pr: Proiettile, x: number, y: number, eventi: EventoBattaglia[], suTerreno = false): void {
  if (pr.tipo === 'cassa') {
    const c = centroOggetto(pr);
    esplodi(s, c.x, c.y, 'cassa', null, eventi, BIL.casse.esplosione);
  } else if (pr.tipo === 'barile') {
    const c = centroOggetto(pr);
    esplodi(s, c.x, c.y, 'barile', null, eventi);
  } else {
    // tiro vicino: chi spara contro il pendio accanto non si fa male, se il colpo non raggiunge nessun altro
    const chi = suTerreno && pr.lanciatore >= 0 ? s.pirati.find((q) => q.id === pr.lanciatore && q.stato === 'vivo') : undefined;
    const risparmia = chi && tiroVicino(pr.arma, chi.x, chi.y, x, y) ? chi.id : -1;
    esplodi(s, x, y, pr.arma, ciurmaDi(s, pr), eventi, undefined, risparmia);
  }
  dopoEsplosione(s);
}

/** Un tick per tutti i proiettili: volo, rimbalzi, urti, miccia, mare, casse col paracadute e casse aperte. */
function aggiornaProiettili(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  if (s.proiettili.length === 0) return;
  const bersagli = [...bersagliDi(s), ...bersagliOggetti(s.proiettili)];
  const tolti = new Set<number>();
  // si scorre una copia: le esplosioni possono accendere altri oggetti, ma non aggiungere proiettili
  for (const pr of s.proiettili.slice()) {
    if (tolti.has(pr.id)) continue;
    if (pr.tipo === 'cassa') {
      if (pr.tickEsplosione < 0) {
        const r = scendiCassa(s.terreno, s.terreno.mare, s.vento, pr);
        if (r === 'mare') { eventi.push({ t: 'splash', x: pr.x, y: s.terreno.mare, grande: false }); tolti.add(pr.id); continue; }
        if (apriCassa(s, pr, eventi, (x, y) => { esplodi(s, x, y, 'cassa', null, eventi, BIL.casse.trappola); dopoEsplosione(s); })) {
          tolti.add(pr.id); continue;
        }
      }
    } else if (!(pr.tipo === 'barile' && pr.fermo && pr.tickEsplosione < 0) || !solidoSotto(s, pr)) {
      const urto = muoviProiettile(s.terreno, s.terreno.mare, s.vento, pr, fisicaDi(pr.arma), pr.tipo === 'barile' ? null : bersagli);
      if (urto) {
        if (urto.tipo === 'mare') { eventi.push({ t: 'splash', x: urto.x, y: urto.y, grande: false }); tolti.add(pr.id); continue; }
        if (urto.tipo === 'rimbalzo') eventi.push({ t: 'rimbalzo', proiettile: pr.id, x: urto.x, y: urto.y });
        else { tolti.add(pr.id); scoppia(s, pr, urto.x, urto.y, eventi, urto.tipo === 'terreno'); continue; }
      }
    }
    if (pr.tickEsplosione >= 0 && s.tick >= pr.tickEsplosione) { tolti.add(pr.id); scoppia(s, pr, pr.x, pr.y, eventi); continue; }
    // rete di sicurezza: niente proiettili eterni (es. uscito di lato e mai ricaduto)
    if (!eOggetto(pr) && pr.tickEsplosione < 0 && s.tick - s.turno.inizioFase > VITA_MAX_PROIETTILE) tolti.add(pr.id);
  }
  if (tolti.size) s.proiettili = s.proiettili.filter((p) => !tolti.has(p.id));
}

function solidoSotto(s: StatoBattaglia, pr: Proiettile): boolean {
  const t = s.terreno, x = Math.floor(pr.x), y = Math.floor(pr.y) + 1;
  return x >= 0 && y >= 0 && x < t.w && y < t.h && t.maschera[y * t.w + x] !== 0;
}

/** Avanza di un tick. */
export function avanza(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  const t = s.turno;
  if (s.esito) {
    // ritirata: eseguiComando ha deciso l'esito, qui escono fase ed evento
    if (t.fase !== 'fine') chiudiBattaglia(s, eventi);
    return;
  }
  if (s.tick === 0) {
    // eventi del turno 1 (creaBattaglia non ha un array di eventi)
    eventi.push({ t: 'turnoIniziato', numero: t.numero, squadra: t.squadra, pirata: t.pirata, vento: s.vento }, { t: 'fase', fase: t.fase });
  }
  s.tick++;
  const attivo = pirataDelTurno(s);
  // richiesta lasciata da eseguiComando (Balzo o "fatto"): si applica adesso e si cancella
  const richiesta = t.richiesta;
  t.richiesta = undefined;
  if ((richiesta === 'balzo' || richiesta === 'balzoMuro') && attivo && inGioco(attivo) && (t.fase === 'azione' || t.fase === 'fuga')) {
    balzo(s, attivo, richiesta === 'balzoMuro', eventi); // prima dello sparo, se sono arrivati insieme
  }
  if (t.fase === 'azione' && t.sparato && attivo && inGioco(attivo)) {
    // fuoco chiesto da eseguiComando: il colpo parte adesso, e con lui la fuga
    const mun = s.squadre[t.squadra].munizioni;
    const m = mun[t.arma] ?? 0;
    if (m > 0) mun[t.arma] = m - 1;
    eventi.push({ t: 'sparo', pirata: attivo.id, arma: t.arma });
    cambiaFase(s, 'fuga', eventi);
    t.inizioFase = s.tick;
    spara(s, attivo, eventi);
  }
  // in fuga ci si muove solo quando l'arma ha finito di sparare (la pistola spara due colpi da fermo)
  const puoMuoversi = attivo !== undefined && inGioco(attivo)
    && (t.fase === 'azione' || (t.fase === 'fuga' && s.tick - t.inizioFase >= durataColpi(t.arma)));

  for (const p of s.pirati) {
    const mio = p === attivo && puoMuoversi;
    aggiornaPirata(s, p, mio ? t.camminata : 0, eventi, mio ? t.arrampicata : 0);
  }
  aggiornaProiettili(s, eventi);
  aggiornaPezzi(s, eventi);

  const inFase = s.tick - t.inizioFase;
  const attivoInGioco = attivo !== undefined && inGioco(attivo);
  switch (t.fase) {
    case 'inquadra':
      if (inFase >= BIL.camera.inquadraTick) cambiaFase(s, 'azione', eventi);
      break;
    case 'azione':
      if (!attivoInGioco) { cambiaFase(s, 'risoluzione', eventi); break; }
      if (!t.timerAvviato && inFase >= BIL.turno.avvioTimerTick) t.timerAvviato = true;
      // il timer è appena partito (dopo 2 s o per un comando): l'evento esce una volta sola, col timer ancora pieno
      if (t.timerAvviato && t.tickRimasti === s.config.timerSecondi * TICK_AL_SECONDO) eventi.push({ t: 'timerAvviato' });
      if (t.timerAvviato && --t.tickRimasti <= 0) { t.tickRimasti = 0; cambiaFase(s, 'risoluzione', eventi); }
      break;
    case 'fuga': {
      // colpi successivi delle armi a più colpi (pistola): partono da dove il pirata ha sparato il primo
      const a = ARMA[t.arma];
      if (a.tipo === 'istantanea' && attivoInGioco) {
        for (let k = 1; k < (a.colpi ?? 1); k++) if (inFase === tickColpo(t.arma, k)) colpoIstantaneo(s, attivo!, eventi);
      }
      if (inFase < durataColpi(t.arma)) {
        if (richiesta === 'fatto') t.richiesta = 'fatto'; // la pistola spara ancora: il "fatto" vale appena ha finito
        break;
      }
      let chiudi = !attivoInGioco || inFase >= BIL.ritmo.fugaTick;
      if (!chiudi && richiesta === 'fatto') { eventi.push({ t: 'fatto', pirata: attivo!.id }); chiudi = true; }
      if (!chiudi) {
        // pirata fermo senza comandi: dopo fermoFugaTick il turno passa da solo
        if (t.camminata === 0 && t.arrampicata === 0 && fermo(attivo!)) {
          if (t.fermoDa < 0) t.fermoDa = s.tick;
          if (s.tick - t.fermoDa >= BIL.ritmo.fermoFugaTick) chiudi = true;
        } else t.fermoDa = -1;
      }
      if (chiudi) cambiaFase(s, s.proiettili.some(proiettileAttivo) || pezziInCaduta(s) ? 'volo' : 'risoluzione', eventi);
      break;
    }
    case 'volo':
      // il colpo vola ancora dopo la fuga: si aspetta, il pirata non si muove più
      if (!s.proiettili.some(proiettileAttivo) && !pezziInCaduta(s)) cambiaFase(s, 'risoluzione', eventi);
      break;
    case 'risoluzione': {
      // passa appena tutto è fermo da BIL.turno.risoluzioneFermoTick (m1-ritmo §3)
      let tuttoFermo = !s.proiettili.some(proiettileAttivo) && !pezziInCaduta(s) && s.pirati.every(fermo);
      if (!tuttoFermo && inFase >= BIL.turno.risoluzioneMaxTick) {
        // caso 8: chi vibra si ferma d'ufficio, i proiettili in volo spariscono (barili e casse restano)
        for (const p of s.pirati) if (p.stato === 'vivo') { p.vx = 0; p.vy = 0; p.aTerra = p.appeso < 0; p.yInizioCaduta = p.y; }
        s.proiettili = s.proiettili.filter((p) => !proiettileAttivo(p));
        frantumaTutti(s, eventi);
        tuttoFermo = true;
        t.fermoDa = s.tick - BIL.turno.risoluzioneFermoTick;
      }
      if (!tuttoFermo) { t.fermoDa = -1; break; }
      if (t.fermoDa < 0) t.fermoDa = s.tick;
      if (s.tick - t.fermoDa < BIL.turno.risoluzioneFermoTick) break;
      if (creaLapidi(s, eventi) > 0) { t.inizioFase = s.tick; t.fermoDa = -1; break; } // si aspetta che le lapidi esplodano
      fineTurno(s, eventi);
      break;
    }
    default:
      break;
  }
  // regole del tipo di scontro (P2: Bandiera), a battaglia non finita
  if (!s.esito) regoleScontro(s, eventi, (vincitore, motivo) => concludi(s, vincitore, motivo, eventi));
}

/** Ritirata (resa) dell'attaccante, dal turno 4: vince il difensore. */
export function ritirata(s: StatoBattaglia): void {
  if (s.esito || s.turno.numero < BIL.battaglia.ritirataDalTurno) return;
  s.esito = esitoDi(s, squadraDifensore(s), 'ritirata');
}
