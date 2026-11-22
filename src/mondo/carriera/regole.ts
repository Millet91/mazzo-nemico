// Regole PURE del round della carriera (P2-contratti §2): rinforzi, attacco (anche unito), esito della battaglia,
// conquista e premi, turno della Marina, fine round, fine capitolo e stelle. Niente Pixi, niente Preact, niente bus:
// ogni funzione prende uno StatoCarriera e ne restituisce uno nuovo (quello passato non si tocca).
// Numeri in contenuti/campagna.ts. Test in tests/mondo/regole.test.ts.
import type {
  AttaccoInCorso, DefCapitolo, DefIsola, IdIsola, IdRegione, Padrone, Premio, StatoCarriera,
} from '../../core/carriera';
import { VERSIONE_SALVATAGGIO } from '../../core/carriera';
import { CAMPAGNA } from '../../contenuti/campagna';

/** Quello che è successo, per banner, scene e animazioni della mappa. */
export type EventoCampagna =
  | { t: 'rinforzo'; isola: IdIsola; da: number; a: number }
  | { t: 'conquista'; isola: IdIsola; premi: Premio[]; da: number; a: number }
  | { t: 'attaccoFallito'; isola: IdIsola; ritirata: boolean }
  | { t: 'difesaRiuscita'; isola: IdIsola }
  | { t: 'perdita'; isola: IdIsola }
  | { t: 'regioneCompleta'; regione: IdRegione }
  | { t: 'marinaRinforza'; isola: IdIsola; da: number; a: number }
  | { t: 'marinaAttacca'; da: IdIsola[]; verso: IdIsola }
  | { t: 'roundProtetto' }
  | { t: 'nuovoRound'; round: number }
  | { t: 'capitoloVinto'; stelle: number }
  | { t: 'capitoloPerso'; motivo: 'isole' | 'round' };

/** Risultato della battaglia che serve alla carriera (sottoinsieme di EsitoBattaglia). */
export interface EsitoPerCarriera {
  vincitore: 0 | 1;
  superstiti: [number, number];
  motivo: string;
}

export interface Risultato {
  stato: StatoCarriera;
  eventi: EventoCampagna[];
}

// ─── Utilità ─────────────────────────────────────────────────────────────────────────────────────

const copia = (s: StatoCarriera): StatoCarriera => JSON.parse(JSON.stringify(s)) as StatoCarriera;
const def = (cap: DefCapitolo, id: IdIsola): DefIsola => {
  const d = cap.isole.find((i) => i.id === id);
  if (!d) throw new Error(`isola sconosciuta: ${id}`);
  return d;
};
const conquisteRound = (s: StatoCarriera): IdIsola[] => s.conquisteRound ?? [];

export function isoleDi(cap: DefCapitolo, s: StatoCarriera, p: Padrone): IdIsola[] {
  return cap.isole.filter((i) => s.isole[i.id]?.padrone === p).map((i) => i.id);
}

export function regioniComplete(cap: DefCapitolo, s: StatoCarriera, p: Padrone = 'giocatore'): IdRegione[] {
  return cap.regioni.filter((r) => r.isole.every((id) => s.isole[id]?.padrone === p)).map((r) => r.id);
}

/** Posto libero sulle isole del giocatore (rispetto al tetto). */
function postoLibero(cap: DefCapitolo, s: StatoCarriera): number {
  return isoleDi(cap, s, 'giocatore').reduce((n, id) => n + Math.max(0, CAMPAGNA.tettoIsola - s.isole[id].pirati), 0);
}

/** Rinforzi del round per il giocatore: max(3, ⌊isole/3⌋) + bonus delle regioni complete (02 §3.1), senza il tetto. */
export function rinforziTeorici(cap: DefCapitolo, s: StatoCarriera): number {
  const isole = isoleDi(cap, s, 'giocatore').length;
  const bonus = regioniComplete(cap, s).reduce((n, r) => n + (cap.regioni.find((x) => x.id === r)?.bonus ?? 0), 0);
  return Math.max(CAMPAGNA.rinforziMinimi, Math.floor(isole / CAMPAGNA.rinforziDivisore)) + bonus;
}

/** Rinforzi da piazzare davvero: quelli che non trovano posto (tetto 5) si perdono (nel cap. 1 non ci sono dobloni). */
export function rinforziDelRound(cap: DefCapitolo, s: StatoCarriera): number {
  return Math.min(rinforziTeorici(cap, s), postoLibero(cap, s));
}

// ─── Inizio ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Carriera nuova sul capitolo. Da `precedente` si tengono gli sblocchi permanenti, le stelle, le scene viste e
 * l'acquisto (si usa anche per "Riprova il capitolo").
 */
export function nuovaCarriera(cap: DefCapitolo, precedente?: StatoCarriera | null): StatoCarriera {
  const isole: StatoCarriera['isole'] = {};
  for (const i of cap.isole) isole[i.id] = { padrone: i.padroneIniziale, pirati: i.piratiIniziali, presa: false };
  // le isole già prese in un tentativo precedente non ridanno il premio
  if (precedente && precedente.capitolo === cap.id) for (const i of cap.isole) {
    if (precedente.isole[i.id]?.presa) isole[i.id].presa = true;
  }
  const s: StatoCarriera = {
    versione: VERSIONE_SALVATAGGIO,
    capitolo: cap.id,
    round: 1,
    fase: 'rinforzi',
    isole,
    rinforzi: 0,
    attacco: null,
    armi: [...(precedente?.armi ?? [])],
    mosse: [...(precedente?.mosse ?? [])],
    reclute: [...(precedente?.reclute ?? [])],
    bandiere: [...(precedente?.bandiere ?? [])],
    stelle: { ...(precedente?.stelle ?? {}) },
    sceneViste: [...(precedente?.sceneViste ?? [])],
    completo: precedente?.completo ?? false,
    piratiPersi: 0,
    battaglieGiocate: 0,
    usate: [],
    perditeSfide: 0,
    conquisteRound: [],
  };
  s.rinforzi = rinforziDelRound(cap, s);
  return s;
}

// ─── Rinforzi ────────────────────────────────────────────────────────────────────────────────────

export function puoRinforzare(s: StatoCarriera, isola: IdIsola): boolean {
  const i = s.isole[isola];
  return s.fase === 'rinforzi' && s.rinforzi > 0 && !!i && i.padrone === 'giocatore' && i.pirati < CAMPAGNA.tettoIsola;
}

/** Isole dove si può piazzare un rinforzo adesso. */
export function isoleRinforzabili(cap: DefCapitolo, s: StatoCarriera): IdIsola[] {
  return isoleDi(cap, s, 'giocatore').filter((id) => puoRinforzare(s, id));
}

/** Piazza `quanti` pirati (fino al tetto e ai rinforzi rimasti). Se è finito il posto, passa da solo all'attacco. */
export function piazzaRinforzo(cap: DefCapitolo, s0: StatoCarriera, isola: IdIsola, quanti = 1): Risultato {
  if (!puoRinforzare(s0, isola)) return { stato: s0, eventi: [] };
  const s = copia(s0);
  const i = s.isole[isola];
  const n = Math.min(quanti, s.rinforzi, CAMPAGNA.tettoIsola - i.pirati);
  const da = i.pirati;
  i.pirati += n;
  s.rinforzi -= n;
  if (s.rinforzi > 0 && postoLibero(cap, s) === 0) s.rinforzi = 0;
  return { stato: s, eventi: [{ t: 'rinforzo', isola, da, a: i.pirati }] };
}

/** Chiude i rinforzi (solo quando non ne restano da piazzare) e apre gli attacchi. */
export function fineRinforzi(cap: DefCapitolo, s0: StatoCarriera): StatoCarriera {
  if (s0.fase !== 'rinforzi') return s0;
  if (s0.rinforzi > 0 && postoLibero(cap, s0) > 0) return s0;
  return { ...copia(s0), fase: 'attacco', rinforzi: 0 };
}

// ─── Attacco ─────────────────────────────────────────────────────────────────────────────────────

/** Pirati che possono partire da un'isola del giocatore in questo round (0 se non può attaccare). */
export function piratiDisponibili(s: StatoCarriera, isola: IdIsola): number {
  const i = s.isole[isola];
  if (!i || i.padrone !== 'giocatore' || s.usate.includes(isola)) return 0;
  return Math.max(0, i.pirati - CAMPAGNA.restaACasa);
}

/** Isole del giocatore da cui può partire un attacco verso `verso`. */
export function partenzePer(cap: DefCapitolo, s: StatoCarriera, verso: IdIsola): IdIsola[] {
  return def(cap, verso).adiacenti.filter((id) => piratiDisponibili(s, id) > 0);
}

/** Isole nemiche attaccabili ora (da almeno un'isola del giocatore). */
export function bersagli(cap: DefCapitolo, s: StatoCarriera): IdIsola[] {
  if (s.fase !== 'attacco') return [];
  return cap.isole.filter((i) => s.isole[i.id].padrone !== 'giocatore' && partenzePer(cap, s, i.id).length > 0).map((i) => i.id);
}

/** Isole nemiche attaccabili partendo da `da`. */
export function bersagliDa(cap: DefCapitolo, s: StatoCarriera, da: IdIsola): IdIsola[] {
  if (s.fase !== 'attacco' || piratiDisponibili(s, da) === 0) return [];
  return def(cap, da).adiacenti.filter((id) => s.isole[id].padrone !== 'giocatore');
}

/** Proposta d'imbarco: prima l'isola scelta (o quella con più pirati), poi l'altra fino a 5 in campo. */
export function imbarcoProposto(cap: DefCapitolo, s: StatoCarriera, verso: IdIsola, prima?: IdIsola): { isola: IdIsola; pirati: number }[] {
  const max = cap.piratiMaxPerLato;
  const partenze = partenzePer(cap, s, verso).sort((a, b) =>
    (a === prima ? -1 : b === prima ? 1 : 0) || piratiDisponibili(s, b) - piratiDisponibili(s, a) || a.localeCompare(b));
  const da: { isola: IdIsola; pirati: number }[] = [];
  let resto = max;
  for (const id of partenze.slice(0, CAMPAGNA.partenzeMax)) {
    const n = Math.min(piratiDisponibili(s, id), resto);
    if (n > 0) { da.push({ isola: id, pirati: n }); resto -= n; }
  }
  return da;
}

/** Controlla un attacco: '' se va bene, altrimenti il motivo (chiave di testo). */
export function controllaAttacco(cap: DefCapitolo, s: StatoCarriera, verso: IdIsola, da: { isola: IdIsola; pirati: number }[]): string {
  if (s.fase !== 'attacco' || s.attacco) return 'fase';
  const v = s.isole[verso];
  // un'isola di partenza ripresa dalla Marina (scontro null) si riattacca con un Assalto
  if (!v || v.padrone === 'giocatore') return 'bersaglio';
  const usate = da.filter((d) => d.pirati > 0);
  if (usate.length === 0) return 'nessuno';
  if (usate.length > CAMPAGNA.partenzeMax) return 'troppePartenze';
  if (new Set(usate.map((d) => d.isola)).size !== usate.length) return 'doppia';
  for (const d of usate) {
    if (!def(cap, verso).adiacenti.includes(d.isola)) return 'lontana';
    if (d.pirati > piratiDisponibili(s, d.isola)) return 'pochi';
  }
  if (usate.reduce((n, d) => n + d.pirati, 0) > cap.piratiMaxPerLato) return 'troppi';
  return '';
}

/** Segna l'attacco in corso (i pirati si spostano solo all'esito: se l'app si chiude, si torna a prima). */
export function preparaAttacco(cap: DefCapitolo, s0: StatoCarriera, verso: IdIsola, da: { isola: IdIsola; pirati: number }[]): StatoCarriera {
  if (controllaAttacco(cap, s0, verso, da)) return s0;
  const s = copia(s0);
  s.attacco = { verso, da: da.filter((d) => d.pirati > 0).map((d) => ({ ...d })), difesa: false };
  return s;
}

/** Battaglia lasciata a metà (Esci dalla pausa, app chiusa): l'attacco non è mai partito. */
export function annullaAttacco(s0: StatoCarriera): StatoCarriera {
  if (!s0.attacco) return s0;
  const s = copia(s0);
  const difesa = s.attacco!.difesa;
  s.attacco = null;
  // una difesa lasciata a metà si rigioca: il turno della Marina riparte da capo al prossimo "Fine turno"
  if (difesa) s.fase = 'attacco';
  return s;
}

/** Pirati in campo per lato: [attaccante, difensore]. Il Duello è sempre 1 contro 1. */
export function piratiInCampo(cap: DefCapitolo, s: StatoCarriera, a: AttaccoInCorso = s.attacco!): [number, number] {
  const scontro = a.difesa ? null : def(cap, a.verso).scontro;
  if (scontro?.tipo === 'duello') return [1, 1];
  const att = a.da.reduce((n, d) => n + d.pirati, 0);
  return [Math.min(att, cap.piratiMaxPerLato), Math.min(Math.max(1, s.isole[a.verso].pirati), cap.piratiMaxPerLato)];
}

// ─── Esito della battaglia ───────────────────────────────────────────────────────────────────────

function aggiungiPremi(s: StatoCarriera, premi: Premio[]) {
  for (const p of premi) {
    if (p.t === 'arma' && !s.armi.includes(p.arma)) s.armi.push(p.arma);
    else if (p.t === 'mossa' && !s.mosse.includes(p.mossa)) s.mosse.push(p.mossa);
    else if (p.t === 'recluta' && !s.reclute.some((r) => r.nome === p.nome)) s.reclute.push({ nome: p.nome, aspetto: p.aspetto });
    else if (p.t === 'bandiera' && !s.bandiere.includes(p.id)) s.bandiere.push(p.id);
  }
}

/** Rimanda i superstiti alle isole di partenza (ritirata), rispettando il tetto. */
function rimandaACasa(s: StatoCarriera, da: { isola: IdIsola; pirati: number }[], quanti: number) {
  let resto = quanti;
  for (const d of da) {
    const i = s.isole[d.isola];
    const n = Math.min(resto, d.pirati, CAMPAGNA.tettoIsola - i.pirati);
    i.pirati += n;
    resto -= n;
  }
}

/** Applica l'esito della battaglia all'attacco in corso (del giocatore o della Marina). */
export function applicaEsito(cap: DefCapitolo, s0: StatoCarriera, e: EsitoPerCarriera): Risultato {
  const a = s0.attacco;
  if (!a) return { stato: s0, eventi: [] };
  const s = copia(s0);
  const eventi: EventoCampagna[] = [];
  const regioniPrima = regioniComplete(cap, s);
  s.attacco = null;
  s.battaglieGiocate++;
  const imbarcati = a.da.reduce((n, d) => n + d.pirati, 0);
  for (const d of a.da) s.isole[d.isola].pirati -= d.pirati;
  const bersaglio = s.isole[a.verso];
  const vinceAttaccante = e.vincitore === 0;
  const [supA, supD] = e.superstiti;

  if (!a.difesa) {
    const scontro = def(cap, a.verso).scontro;
    const duello = scontro?.tipo === 'duello';
    const sfida = scontro?.tipo === 'duello' || scontro?.tipo === 'bandiera';
    for (const d of a.da) if (!s.usate.includes(d.isola)) s.usate.push(d.isola);
    let persi: number;
    if (vinceAttaccante) {
      // Duello: il capo cade e sbarcano tutti gli imbarcati. Altrimenti occupano i superstiti (almeno 1).
      const occupano = duello ? imbarcati : Math.max(1, Math.min(supA, imbarcati));
      persi = imbarcati - occupano;
      const primaVolta = !bersaglio.presa;
      const premi = primaVolta ? def(cap, a.verso).premi : [];
      const da = bersaglio.pirati;
      s.isole[a.verso] = { padrone: 'giocatore', pirati: Math.min(occupano, CAMPAGNA.tettoIsola), presa: true };
      if (!s.usate.includes(a.verso)) s.usate.push(a.verso);
      s.conquisteRound = [...conquisteRound(s), a.verso];
      aggiungiPremi(s, premi);
      eventi.push({ t: 'conquista', isola: a.verso, premi, da, a: s.isole[a.verso].pirati });
    } else {
      const ritirata = e.motivo === 'ritirata';
      // Duello perso: cade solo il duellante, gli altri tornano a casa. Ritirata: tornano i superstiti.
      const tornano = duello ? imbarcati - 1 : ritirata ? Math.min(supA, imbarcati) : 0;
      rimandaACasa(s, a.da, tornano);
      persi = imbarcati - tornano;
      // il difensore resta con i superstiti (almeno 1); nel Duello la Marina non perde nessuno se vince
      if (!duello) bersaglio.pirati = Math.max(1, Math.min(supD, bersaglio.pirati));
      eventi.push({ t: 'attaccoFallito', isola: a.verso, ritirata });
    }
    s.piratiPersi += persi;
    if (sfida) s.perditeSfide += persi;
  } else {
    // difesa: squadra 0 = Marina, squadra 1 = giocatore
    const difensori = bersaglio.pirati;
    if (vinceAttaccante) {
      s.piratiPersi += difensori;
      s.isole[a.verso] = { padrone: 'marina', pirati: Math.max(1, Math.min(supA, imbarcati, CAMPAGNA.tettoIsola)), presa: bersaglio.presa };
      eventi.push({ t: 'perdita', isola: a.verso });
    } else {
      const restano = Math.max(1, Math.min(supD, difensori));
      s.piratiPersi += difensori - restano;
      bersaglio.pirati = restano;
      eventi.push({ t: 'difesaRiuscita', isola: a.verso });
    }
  }

  for (const r of regioniComplete(cap, s)) if (!regioniPrima.includes(r)) eventi.push({ t: 'regioneCompleta', regione: r });
  eventi.push(...controllaFine(cap, s));
  // dopo la difesa il turno della Marina è finito: si chiude il round
  if (a.difesa && s.fase !== 'fine') {
    const r = chiudiRound(cap, s);
    return { stato: r.stato, eventi: [...eventi, ...r.eventi] };
  }
  return { stato: s, eventi };
}

// ─── Fine del capitolo e stelle ─────────────────────────────────────────────────────────────────

export function capitoloVinto(cap: DefCapitolo, s: StatoCarriera): boolean {
  return cap.isole.every((i) => s.isole[i.id]?.padrone === 'giocatore');
}

/** Stelle del capitolo vinto: ★ vittoria, ★★ entro il round 6, ★★★ nessun pirata perso nel Bandiera e nel Duello. */
export function stelleCapitolo(s: StatoCarriera): number {
  return 1 + (s.round <= CAMPAGNA.stelle.roundVeloce ? 1 : 0) + (s.perditeSfide <= CAMPAGNA.stelle.perditeSfideMax ? 1 : 0);
}

/** Se il capitolo è finito, porta lo stato in fase 'fine' (in place) e restituisce l'evento. */
function controllaFine(cap: DefCapitolo, s: StatoCarriera): EventoCampagna[] {
  if (s.fase === 'fine') return [];
  if (capitoloVinto(cap, s)) {
    const stelle = stelleCapitolo(s);
    s.fase = 'fine';
    s.attacco = null;
    s.stelle[cap.id] = Math.max(s.stelle[cap.id] ?? 0, stelle);
    return [{ t: 'capitoloVinto', stelle }];
  }
  if (isoleDi(cap, s, 'giocatore').length === 0) {
    s.fase = 'fine';
    s.attacco = null;
    return [{ t: 'capitoloPerso', motivo: 'isole' }];
  }
  return [];
}

/** Esito del capitolo finito: 'vinto', 'perso' o null se si gioca ancora. */
export function esitoCapitolo(cap: DefCapitolo, s: StatoCarriera): 'vinto' | 'perso' | null {
  if (s.fase !== 'fine') return null;
  return capitoloVinto(cap, s) ? 'vinto' : 'perso';
}

// ─── Turno della Marina ──────────────────────────────────────────────────────────────────────────

/** Isole della Marina che confinano con il giocatore. */
function confiniMarina(cap: DefCapitolo, s: StatoCarriera): IdIsola[] {
  return isoleDi(cap, s, 'marina').filter((id) => def(cap, id).adiacenti.some((a) => s.isole[a].padrone === 'giocatore'));
}

/** Bersagli che la Marina può attaccare: isole del giocatore non intoccabili e non conquistate in questo round. */
function bersagliMarina(cap: DefCapitolo, s: StatoCarriera): IdIsola[] {
  return isoleDi(cap, s, 'giocatore').filter((id) =>
    !CAMPAGNA.marina.intoccabili.includes(id) && !conquisteRound(s).includes(id));
}

/** Scelta dell'attacco della Marina (deterministica): il rapporto migliore ≥ soglia, a pari merito l'id più basso. */
export function sceltaMarina(cap: DefCapitolo, s: StatoCarriera): AttaccoInCorso | null {
  let migliore: { a: AttaccoInCorso; rapporto: number } | null = null;
  for (const verso of bersagliMarina(cap, s)) {
    const dif = s.isole[verso].pirati;
    for (const da of def(cap, verso).adiacenti) {
      const m = s.isole[da];
      if (m.padrone !== 'marina') continue;
      const att = Math.min(m.pirati - CAMPAGNA.restaACasa, cap.piratiMaxPerLato);
      if (att <= 0) continue;
      const rapporto = att / Math.max(1, dif);
      if (rapporto < CAMPAGNA.marina.sogliaAttacco) continue;
      if (!migliore || rapporto > migliore.rapporto) {
        migliore = { a: { verso, da: [{ isola: da, pirati: att }], difesa: true }, rapporto };
      }
    }
  }
  return migliore?.a ?? null;
}

/**
 * Il giocatore chiude gli attacchi: tocca alla Marina. Nei round protetti non fa niente; poi riceve un rinforzo
 * sull'isola di confine più debole e, se conviene, attacca un'isola del giocatore (difesa giocata: lo stato torna con
 * `attacco.difesa = true` e la UI avvia la battaglia). Se non attacca, il round si chiude subito.
 */
export function turnoMarina(cap: DefCapitolo, s0: StatoCarriera): Risultato {
  if (s0.fase !== 'attacco' || s0.attacco) return { stato: s0, eventi: [] };
  const s = copia(s0);
  s.fase = 'marina';
  const eventi: EventoCampagna[] = [];
  if (s.round <= cap.roundProtetti) {
    eventi.push({ t: 'roundProtetto' });
  } else {
    const confini = confiniMarina(cap, s).filter((id) => s.isole[id].pirati < CAMPAGNA.tettoIsola)
      .sort((a, b) => s.isole[a].pirati - s.isole[b].pirati || a.localeCompare(b));
    if (confini.length && CAMPAGNA.marina.rinforzi > 0) {
      const id = confini[0];
      const da = s.isole[id].pirati;
      s.isole[id].pirati = Math.min(CAMPAGNA.tettoIsola, da + CAMPAGNA.marina.rinforzi);
      eventi.push({ t: 'marinaRinforza', isola: id, da, a: s.isole[id].pirati });
    }
    const att = CAMPAGNA.marina.attacchiPerRound > 0 ? sceltaMarina(cap, s) : null;
    if (att) {
      s.attacco = att;
      eventi.push({ t: 'marinaAttacca', da: att.da.map((d) => d.isola), verso: att.verso });
      return { stato: s, eventi };
    }
  }
  const r = chiudiRound(cap, s);
  return { stato: r.stato, eventi: [...eventi, ...r.eventi] };
}

/** Fine del round: limite di round, poi round nuovo con i rinforzi. */
export function chiudiRound(cap: DefCapitolo, s0: StatoCarriera): Risultato {
  if (s0.fase === 'fine') return { stato: s0, eventi: [] };
  const s = copia(s0);
  const fine = controllaFine(cap, s);
  if (fine.length) return { stato: s, eventi: fine };
  if (s.round >= cap.limiteRound) {
    s.fase = 'fine';
    s.attacco = null;
    return { stato: s, eventi: [{ t: 'capitoloPerso', motivo: 'round' }] };
  }
  s.round++;
  s.fase = 'rinforzi';
  s.usate = [];
  s.conquisteRound = [];
  s.attacco = null;
  s.rinforzi = rinforziDelRound(cap, s);
  return { stato: s, eventi: [{ t: 'nuovoRound', round: s.round }] };
}

// ─── Salvataggio ─────────────────────────────────────────────────────────────────────────────────

/**
 * Rende valido uno stato letto dal salvataggio: campi mancanti, battaglia lasciata a metà (si torna a prima
 * dell'attacco), isole nuove o sparite nel capitolo. Restituisce null se il salvataggio non si può usare.
 */
export function ripristina(cap: DefCapitolo, grezzo: unknown): StatoCarriera | null {
  if (!grezzo || typeof grezzo !== 'object') return null;
  const g = grezzo as Partial<StatoCarriera>;
  if (typeof g.versione !== 'number' || g.versione > VERSIONE_SALVATAGGIO) return null;
  if (g.capitolo !== cap.id || !g.isole || typeof g.round !== 'number') {
    // capitolo diverso (es. Prologo): si tengono solo gli sblocchi
    return g.capitolo === undefined ? null : nuovaCarriera(cap, g as StatoCarriera);
  }
  const base = nuovaCarriera(cap);
  const s: StatoCarriera = { ...base, ...g, isole: { ...base.isole }, versione: VERSIONE_SALVATAGGIO } as StatoCarriera;
  for (const i of cap.isole) {
    const x = g.isole[i.id];
    if (x && (x.padrone === 'giocatore' || x.padrone === 'marina') && Number.isFinite(x.pirati)) {
      s.isole[i.id] = { padrone: x.padrone, pirati: Math.max(1, Math.min(CAMPAGNA.tettoIsola, Math.round(x.pirati))), presa: !!x.presa };
    }
  }
  s.usate = Array.isArray(g.usate) ? g.usate.filter((id) => id in s.isole) : [];
  s.conquisteRound = Array.isArray(g.conquisteRound) ? g.conquisteRound.filter((id) => id in s.isole) : [];
  s.perditeSfide = g.perditeSfide ?? 0;
  if (!['rinforzi', 'attacco', 'marina', 'fine'].includes(s.fase)) s.fase = 'rinforzi';
  const r = annullaAttacco(s);
  // il turno della Marina senza attacco in corso non è un punto di sosta: si rifà da "Fine turno"
  if (r.fase === 'marina') r.fase = 'attacco';
  return r;
}
