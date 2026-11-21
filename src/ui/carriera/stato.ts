// Regia della carriera nella UI: collega le regole pure (mondo/carriera/regole.ts) al bus, al salvataggio, ai
// pannelli Preact e alla battaglia. Chi scrive cosa (P2-contratti §2):
// - Campagna → bus.carriera, bus.evidenzaMondo, bus.animaMondo, bus.schermata, bus.battagliaCarriera, bus.richiestaBattaglia
// - scena del mondo → bus.isolaToccata, bus.mondoOccupato
// - battaglia → bus.battaglia.esito; "Continua" rimette richiestaBattaglia a null e qui si applica l'esito.
import { computed, effect, signal } from '@preact/signals';
import { bus } from '../../core/bus';
import type { DefCapitolo, DefIsola, IdIsola, Premio, StatoCarriera } from '../../core/carriera';
import type { EsitoBattaglia } from '../../core/tipi';
import { CAPITOLO_1 } from '../../contenuti/capitolo-1';
import { CAMPAGNA } from '../../contenuti/campagna';
import { T } from '../../testi/it';
import * as R from '../../mondo/carriera/regole';
import type { EventoCampagna } from '../../mondo/carriera/regole';
import { battagliaDaAttacco } from '../../mondo/carriera/battaglia';
import { cancellaCarriera, caricaCarriera, salvaCarriera } from '../../piattaforma/salvataggio';

/** Capitolo giocabile (Fase A: solo il cap. 1). */
export const CAP: DefCapitolo = CAPITOLO_1;

export const defIsola = (id: IdIsola): DefIsola => CAP.isole.find((i) => i.id === id)!;
export const nomeIsola = (id: IdIsola): string => T.carriera.isole[defIsola(id)?.nome ?? ''] ?? id;

// ─── Stato della UI ─────────────────────────────────────────────────────────────────────────────

/** salvataggio letto (per "Continua" nel menu) */
export const carrieraCaricata = signal(false);
/** isola del giocatore scelta come partenza (fase attacco) */
export const selezionata = signal<IdIsola | null>(null);
/** pannello d'attacco aperto: bersaglio e pirati che partono da ciascuna isola */
export const preparazione = signal<{ verso: IdIsola; da: { isola: IdIsola; pirati: number }[] } | null>(null);
/** scheda informativa di un'isola (cartello del Re, premio, perché non si può attaccare) */
export const schedaIsola = signal<{ isola: IdIsola; nota: string } | null>(null);

/** banner mostrato ora ('' = nessuno): una riga che sparisce da sola e non blocca i tocchi */
export const banner = signal('');
const codaBanner: string[] = [];
let timerBanner: ReturnType<typeof setTimeout> | undefined;

function mostraBanner(testo: string) {
  // niente arretrati: se ne arrivano tanti insieme si tengono gli ultimi due
  codaBanner.push(testo);
  while (codaBanner.length > 2) codaBanner.shift();
  if (!timerBanner) prossimoBanner();
}

function prossimoBanner() {
  const b = codaBanner.shift();
  banner.value = b ?? '';
  timerBanner = b === undefined ? undefined : setTimeout(prossimoBanner, 2000);
}

export type Avviso =
  | { t: 'premio'; isola: IdIsola; premi: Premio[] }
  | { t: 'scena'; chiave: string };
/** avvisi in fila: si mostra il primo */
export const avvisi = signal<Avviso[]>([]);
/** riga della scena di copione mostrata ora */
export const rigaScena = signal(0);

export const stato = computed(() => bus.carriera.value);

// ─── Salvataggio ─────────────────────────────────────────────────────────────────────────────────

/** Legge il salvataggio all'avvio (non cambia schermata). */
let lettura: Promise<void> | null = null;
export function preparaCarriera(): Promise<void> {
  lettura ??= caricaCarriera().then(({ principale, riserva }) => {
    bus.carriera.value = R.ripristina(CAP, principale) ?? R.ripristina(CAP, riserva);
    carrieraCaricata.value = true;
  });
  return lettura;
}

function imposta(s: StatoCarriera, eventi: EventoCampagna[] = []) {
  bus.carriera.value = s;
  void salvaCarriera(s);
  raccontaEventi(s, eventi);
  aggiornaEvidenza();
}

// ─── Entrata e uscita ────────────────────────────────────────────────────────────────────────────

/** Dal menu: continua la carriera salvata o ne comincia una nuova. */
export function entraInCarriera(): void {
  // finché il salvataggio non è letto si aspetta (si rischierebbe di sovrascriverlo con una carriera nuova)
  if (!carrieraCaricata.value) { void preparaCarriera().then(entraInCarriera); return; }
  let s = bus.carriera.value;
  const nuova = !s;
  if (!s) s = R.nuovaCarriera(CAP);
  azzeraUi();
  bus.schermata.value = 'mondo';
  imposta(s);
  if (nuova) bus.animaMondo.invia({ t: 'nebbia', capitolo: CAP.id });
  // zoom 1 = tutto il capitolo
  bus.animaMondo.invia({ t: 'centra', isola: '1A', zoom: 1 });
  mostraScena('c1.inizio');
}

export function tornaAlMenu(): void {
  azzeraUi();
  bus.schermata.value = 'menu';
}

/** Ricomincia il capitolo da capo, tenendo sblocchi, stelle e scene viste. */
export function riprovaCapitolo(): void {
  azzeraUi();
  imposta(R.nuovaCarriera(CAP, bus.carriera.value));
  bus.animaMondo.invia({ t: 'centra', isola: '1A', zoom: 1 });
}

/** Cancella tutto (prove): la prossima Carriera parte da zero. */
export async function cancellaTutto(): Promise<void> {
  await cancellaCarriera();
  bus.carriera.value = null;
  tornaAlMenu();
}

function azzeraUi() {
  selezionata.value = null;
  preparazione.value = null;
  schedaIsola.value = null;
  avvisi.value = [];
  rigaScena.value = 0;
  codaBanner.length = 0;
  clearTimeout(timerBanner);
  timerBanner = undefined;
  banner.value = '';
}

// ─── Scene e avvisi ──────────────────────────────────────────────────────────────────────────────

function accoda(a: Avviso) {
  avvisi.value = [...avvisi.value, a];
  if (avvisi.value.length === 1) apriAvviso();
}

function apriAvviso() {
  const a = avvisi.value[0];
  rigaScena.value = 0;
  if (a?.t === 'scena') bus.schermata.value = 'scena';
}

/** Chiude l'avviso in testa e passa al prossimo. */
export function chiudiAvviso(): void {
  const [a, ...resto] = avvisi.value;
  if (!a) return;
  if (a.t === 'scena') {
    const s = bus.carriera.value;
    if (s && !s.sceneViste.includes(a.chiave)) imposta({ ...s, sceneViste: [...s.sceneViste, a.chiave] });
    if (bus.schermata.value === 'scena') bus.schermata.value = 'mondo';
  }
  avvisi.value = resto;
  apriAvviso();
}

/** Riga dopo nella scena (o fine della scena). */
export function avantiScena(): void {
  const a = avvisi.value[0];
  if (a?.t !== 'scena') return;
  const righe = T.carriera.scene[a.chiave] ?? [];
  if (rigaScena.value + 1 < righe.length) rigaScena.value++;
  else chiudiAvviso();
}

/** Mostra una scena di copione se non è già stata vista. */
export function mostraScena(chiave: string): void {
  const s = bus.carriera.value;
  if (!T.carriera.scene[chiave] || s?.sceneViste.includes(chiave)) return;
  if (avvisi.value.some((a) => a.t === 'scena' && a.chiave === chiave)) return;
  accoda({ t: 'scena', chiave });
}

function raccontaEventi(s: StatoCarriera, eventi: EventoCampagna[]) {
  const banner = mostraBanner;
  for (const e of eventi) {
    switch (e.t) {
      case 'rinforzo': bus.animaMondo.invia({ t: 'pirati', isola: e.isola, da: e.da, a: e.a }); break;
      case 'conquista':
        bus.animaMondo.invia({ t: 'conquista', isola: e.isola });
        bus.animaMondo.invia({ t: 'pirati', isola: e.isola, da: e.da, a: e.a });
        banner(T.carriera.banner.conquista(nomeIsola(e.isola)));
        if (e.premi.length) accoda({ t: 'premio', isola: e.isola, premi: e.premi });
        break;
      case 'attaccoFallito':
        banner(e.ritirata ? T.carriera.banner.ritirata(nomeIsola(e.isola)) : T.carriera.banner.attaccoFallito(nomeIsola(e.isola)));
        break;
      case 'difesaRiuscita': banner(T.carriera.banner.difesa(nomeIsola(e.isola))); break;
      case 'perdita':
        bus.animaMondo.invia({ t: 'perdita', isola: e.isola });
        banner(T.carriera.banner.perdita(nomeIsola(e.isola)));
        break;
      case 'regioneCompleta': mostraScena('c1.meta'); break;
      case 'marinaRinforza':
        // solo il segnalino che cambia: un banner a ogni round sarebbe rumore
        bus.animaMondo.invia({ t: 'pirati', isola: e.isola, da: e.da, a: e.a });
        break;
      case 'marinaAttacca':
        bus.animaMondo.invia({ t: 'centra', isola: e.verso });
        bus.animaMondo.invia({ t: 'attacco', da: e.da, verso: e.verso });
        break;
      case 'roundProtetto': banner(T.carriera.banner.roundProtetto); break;
      case 'nuovoRound': banner(T.carriera.banner.nuovoRound(e.round)); break;
      case 'capitoloVinto':
        codaBanner.length = 0;
        banner(T.carriera.banner.capitolo);
        mostraScena('c1.fine');
        break;
      case 'capitoloPerso': break;
    }
  }
  void s;
}

// ─── Evidenze per la scena del mondo ─────────────────────────────────────────────────────────────

/** Isole toccabili ora (pulsano) secondo la fase. */
export function toccabiliOra(): IdIsola[] {
  const s = bus.carriera.value;
  if (!s || preparazione.value) return [];
  if (s.fase === 'rinforzi') return R.isoleRinforzabili(CAP, s);
  if (s.fase === 'attacco' && !s.attacco) {
    const sel = selezionata.value;
    if (sel) return R.bersagliDa(CAP, s, sel);
    const partenze = R.isoleDi(CAP, s, 'giocatore').filter((id) => R.bersagliDa(CAP, s, id).length > 0);
    return [...partenze, ...R.bersagli(CAP, s)];
  }
  return [];
}

function aggiornaEvidenza() {
  bus.evidenzaMondo.value = {
    selezionata: preparazione.value?.verso ?? selezionata.value,
    toccabili: toccabiliOra(),
  };
}

// ─── Tocchi sulla mappa ──────────────────────────────────────────────────────────────────────────

/** Tocco su un'isola (dalla scena Pixi del mondo o dalla carta di prova). */
export function toccaIsola(id: IdIsola): void {
  const s = bus.carriera.value;
  if (!s || bus.mondoOccupato.value || avvisi.value.length > 0 || preparazione.value) return;
  if (id === 'cala' || !s.isole[id]) return;
  schedaIsola.value = null;
  const mia = s.isole[id].padrone === 'giocatore';

  if (s.fase === 'rinforzi') {
    if (mia && R.puoRinforzare(s, id)) {
      const r = R.piazzaRinforzo(CAP, s, id);
      imposta(r.stato, r.eventi);
      // finiti i rinforzi si passa da soli all'attacco
      if (r.stato.rinforzi === 0) imposta(R.fineRinforzi(CAP, r.stato));
    } else if (!mia) schedaIsola.value = { isola: id, nota: '' };
    return;
  }
  if (s.fase !== 'attacco' || s.attacco) return;

  if (mia) {
    if (R.bersagliDa(CAP, s, id).length > 0) {
      selezionata.value = selezionata.value === id ? null : id;
      bus.animaMondo.invia({ t: 'centra', isola: id });
    } else {
      selezionata.value = null;
      schedaIsola.value = { isola: id, nota: s.usate.includes(id) ? T.carriera.giaUsata : '' };
    }
    aggiornaEvidenza();
    return;
  }
  if (R.bersagli(CAP, s).includes(id)) {
    const prima = selezionata.value && defIsola(id).adiacenti.includes(selezionata.value) ? selezionata.value : undefined;
    preparazione.value = { verso: id, da: R.imbarcoProposto(CAP, s, id, prima) };
    aggiornaEvidenza();
    return;
  }
  const vicinaMia = defIsola(id).adiacenti.some((a) => s.isole[a].padrone === 'giocatore');
  schedaIsola.value = { isola: id, nota: vicinaMia ? T.carriera.vicineStanche : T.carriera.nonRaggiungibile };
}

export function chiudiScheda(): void { schedaIsola.value = null; }

/** Fine dei rinforzi a mano (quando non c'è più posto). */
export function confermaRinforzi(): void {
  const s = bus.carriera.value;
  if (s) imposta(R.fineRinforzi(CAP, s));
}

// ─── Preparazione dell'attacco ───────────────────────────────────────────────────────────────────

/** Partenze possibili per il bersaglio aperto, con i pirati scelti (0 se non parte nessuno da lì). */
export const partenzeAperte = computed(() => {
  const s = bus.carriera.value;
  const p = preparazione.value;
  if (!s || !p) return [];
  return R.partenzePer(CAP, s, p.verso).map((isola) => ({
    isola,
    pirati: p.da.find((d) => d.isola === isola)?.pirati ?? 0,
    max: R.piratiDisponibili(s, isola),
  }));
});

export function cambiaImbarco(isola: IdIsola, delta: 1 | -1): void {
  const s = bus.carriera.value;
  const p = preparazione.value;
  if (!s || !p) return;
  const attuali = partenzeAperte.value;
  const tot = attuali.reduce((n, d) => n + d.pirati, 0);
  const qui = attuali.find((d) => d.isola === isola);
  if (!qui) return;
  if (delta > 0) {
    if (qui.pirati >= qui.max || tot >= CAP.piratiMaxPerLato) return;
    const attive = attuali.filter((d) => d.pirati > 0 && d.isola !== isola).length;
    if (qui.pirati === 0 && attive >= CAMPAGNA.partenzeMax) return;
  } else if (qui.pirati <= 0) return;
  const da = attuali.map((d) => ({ isola: d.isola, pirati: d.isola === isola ? d.pirati + delta : d.pirati })).filter((d) => d.pirati > 0);
  preparazione.value = { verso: p.verso, da };
}

export function annullaPreparazione(): void {
  preparazione.value = null;
  aggiornaEvidenza();
}

/** "All'arrembaggio!": segna l'attacco, salva e avvia la battaglia. */
export function lanciaAttacco(): string {
  const s = bus.carriera.value;
  const p = preparazione.value;
  if (!s || !p) return '';
  const errore = R.controllaAttacco(CAP, s, p.verso, p.da);
  if (errore) return T.carriera.erroriAttacco[errore] ?? errore;
  const nuovo = R.preparaAttacco(CAP, s, p.verso, p.da);
  preparazione.value = null;
  selezionata.value = null;
  imposta(nuovo);
  bus.animaMondo.invia({ t: 'attacco', da: p.da.map((d) => d.isola), verso: p.verso });
  avviaBattaglia();
  return '';
}

/** "Fine turno": tocca alla Marina. Se attacca, il pannello di difesa avvia la battaglia. */
export function fineTurno(): void {
  const s = bus.carriera.value;
  if (!s || s.fase !== 'attacco' || s.attacco) return;
  selezionata.value = null;
  schedaIsola.value = null;
  const r = R.turnoMarina(CAP, s);
  imposta(r.stato, r.eventi);
}

/** Pannello "La Marina attacca": il giocatore difende. */
export function difendi(): void {
  if (bus.carriera.value?.attacco?.difesa) avviaBattaglia();
}

// ─── Battaglia ───────────────────────────────────────────────────────────────────────────────────

let esitoVisto: EsitoBattaglia | null = null;

function semeCasuale(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function avviaBattaglia() {
  const s = bus.carriera.value;
  if (!s?.attacco) return;
  const b = battagliaDaAttacco(CAP, s, semeCasuale());
  if (!b) return;
  esitoVisto = null;
  // prima lo scontro, poi la richiesta (contratto bus.battagliaCarriera)
  bus.battagliaCarriera.value = b.carriera;
  bus.richiestaBattaglia.value = b.config;
}

/** Fine della battaglia (richiestaBattaglia tornata a null): applica l'esito o annulla l'attacco. */
function battagliaChiusa() {
  const s = bus.carriera.value;
  bus.battagliaCarriera.value = null;
  bus.schermata.value = 'mondo';
  if (!s?.attacco) return;
  const e = esitoVisto;
  esitoVisto = null;
  if (!e) { imposta(R.annullaAttacco(s)); return; }
  const r = R.applicaEsito(CAP, s, e);
  imposta(r.stato, r.eventi);
}

/** Collega la carriera al bus (una volta all'avvio dell'app). */
export function avviaAscoltoCarriera(): () => void {
  const fuori: (() => void)[] = [];
  fuori.push(bus.isolaToccata.ascolta(toccaIsola));
  fuori.push(effect(() => {
    const e = bus.battaglia.value?.esito;
    if (e && bus.battagliaCarriera.peek()) esitoVisto = e;
  }));
  let cera = false;
  fuori.push(effect(() => {
    const c = bus.richiestaBattaglia.value !== null;
    if (cera && !c && bus.battagliaCarriera.peek()) battagliaChiusa();
    cera = c;
  }));
  fuori.push(effect(() => { void bus.carriera.value; void selezionata.value; void preparazione.value; void avvisi.value; aggiornaEvidenza(); }));
  return () => fuori.forEach((f) => f());
}

/** Tasto indietro di Android fuori dalla battaglia. false = niente da chiudere qui. */
export function indietroCarriera(): boolean {
  if (bus.schermata.value === 'menu') return false;
  if (avvisi.value[0]) { chiudiAvviso(); return true; }
  if (schedaIsola.value) { schedaIsola.value = null; return true; }
  if (preparazione.value) { annullaPreparazione(); return true; }
  if (selezionata.value) { selezionata.value = null; return true; }
  tornaAlMenu();
  return true;
}
