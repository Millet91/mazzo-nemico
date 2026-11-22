// QUALE SUONO PER QUALE EVENTO. Funzioni pure: eventi della sim e VistaBattaglia → richieste di suono.
// È l'unico posto del gioco dove si sceglie un suono (P1-contratti §4). Niente WebAudio qui: si prova con Vitest.
import type { EventoBattaglia, IdArma } from '../core/tipi';
import { MATERIALE } from '../core/tipi';
import type { VistaBattaglia } from '../core/bus';
import type { IdSuono } from './registro';
import type { IdVerso } from './ricette/voci';
import { panDaX, RAGGIO_GRANDE, RAGGIO_PICCOLA, VOCE_OGNI_MS, type IdAttenua } from './mix';

export interface Richiesta {
  id: IdSuono;
  /** −1 (sinistra) .. 1 (destra) */
  pan?: number;
  /** moltiplica il volume del registro */
  volume?: number;
  /** secondi di ritardo */
  ritardo?: number;
  /** moltiplica l'intonazione (1 = normale) */
  intonazione?: number;
  /** variante fissa (il tic e il tac); senza, è scelta a caso */
  variante?: number;
  /** abbassa la musica mentre suona */
  attenua?: IdAttenua;
  /** suono in ciclo: parte con questa chiave e gira finché la chiave non viene fermata */
  ciclo?: string;
}

/** Cosa deve fare la musica dopo questi eventi. */
export type AzioneMusica =
  /** percussioni per 8 battute (è morto un pirata) */
  | 'percussioni'
  /** percussioni fino alla fine (il mare sale) */
  | 'percussioniSempre'
  /** la battaglia è finita: la musica sfuma e parte il jingle */
  | 'fine';

export interface AzioniAudio {
  suoni: Richiesta[];
  /** chiavi dei suoni in ciclo da fermare */
  ferma: string[];
  musica: AzioneMusica[];
}

/** Quello che l'audio ricorda da un frame all'altro. */
export interface MemoriaAudio {
  /** quando è partita l'ultima voce di pirata (ms) e quanto era importante */
  ultimaVoceMs: number;
  ultimaVocePriorita: number;
  /** il prossimo ticchettio è un "tac" */
  tac: boolean;
  /** Fase 3: grandezza (px del rettangolo) dei pezzi che stanno cadendo, per il suono delle loro macerie */
  pezzi: Map<number, number>;
  /** suoni in ciclo accesi da qui (scivolata, masso, fuoco): a turno nuovo si fermano tutti tranne i fuochi */
  cicli: Set<string>;
}

export function memoriaNuova(): MemoriaAudio {
  return { ultimaVoceMs: -Infinity, ultimaVocePriorita: 0, tac: false, pezzi: new Map(), cicli: new Set() };
}

/**
 * Eventi che restano muti PER SCELTA, col motivo. Tutti gli altri devono dare almeno un suono:
 * lo controlla tests/audio/eventi.test.ts, così un evento nuovo della sim non resta in silenzio per dimenticanza.
 */
export const MUTI_PER_SCELTA: Partial<Record<EventoBattaglia['t'], string>> = {
  fase: 'cambio di fase interno: i momenti che contano hanno già il loro evento (sparo, turnoIniziato, fine)',
  timerAvviato: 'il timer parte in silenzio; suona solo negli ultimi 5 secondi (tic-tac dalla VistaBattaglia)',
  cratere: 'serve al disegno del terreno: il botto è già nell\'evento esplosione',
  maschera: 'serve al disegno del terreno: il suono è già negli eventi crollo, fuoco e frana',
};

const PASSI: Record<number, { id: IdSuono; intonazione?: number }> = {
  [MATERIALE.sabbia]: { id: 'passo_sabbia' },
  [MATERIALE.terra]: { id: 'passo_sabbia', intonazione: 0.8 },
  [MATERIALE.legno]: { id: 'passo_legno' },
  [MATERIALE.roccia]: { id: 'passo_roccia' },
  [MATERIALE.ghiaccio]: { id: 'passo_ghiaccio' },
  [MATERIALE.ferro]: { id: 'passo_ferro' },
};

const IMPATTI: Record<number, { id: IdSuono; intonazione?: number }> = {
  [MATERIALE.sabbia]: { id: 'imp_sabbia' },
  [MATERIALE.terra]: { id: 'imp_sabbia', intonazione: 0.7 },
  [MATERIALE.legno]: { id: 'imp_legno' },
  [MATERIALE.roccia]: { id: 'imp_roccia' },
  [MATERIALE.ghiaccio]: { id: 'imp_ghiaccio' },
  [MATERIALE.ferro]: { id: 'imp_ferro' },
};

/** Fase 3: le tre famiglie di suono dei crolli. Ghiaccio e ferro suonano come roccia più acuta o più cupa, la terra come sabbia cupa. */
type Famiglia = 'legno' | 'roccia' | 'sabbia';
function famiglia(materiale: number): { f: Famiglia; intonazione: number } {
  switch (materiale) {
    case MATERIALE.legno: return { f: 'legno', intonazione: 1 };
    case MATERIALE.roccia: return { f: 'roccia', intonazione: 1 };
    case MATERIALE.ghiaccio: return { f: 'roccia', intonazione: 1.35 };
    case MATERIALE.ferro: return { f: 'roccia', intonazione: 0.85 };
    case MATERIALE.terra: return { f: 'sabbia', intonazione: 0.8 };
    default: return { f: 'sabbia', intonazione: 1 };
  }
}

/** px del rettangolo di un pezzo: sotto PEZZO_PICCOLO è piccolo, da PEZZO_GRANDE è grande (pezzoMaxPx è 6000) */
export const PEZZO_PICCOLO = 800;
export const PEZZO_GRANDE = 3000;
/** grandezza → intonazione e volume: i pezzi grandi suonano più cupi e più forti, e abbassano la musica */
function taglia(area: number): { intonazione: number; volume: number; attenua?: IdAttenua } {
  if (area >= PEZZO_GRANDE) return { intonazione: 0.82, volume: 1, attenua: 'botto_medio' };
  if (area >= PEZZO_PICCOLO) return { intonazione: 1, volume: 0.85 };
  return { intonazione: 1.18, volume: 0.65 };
}

/** Suono dello sparo per arma. Pistola e sciabola suonano con i loro eventi (colpoPistola, colpoSciabola). */
function suonoSparo(arma: IdArma): IdSuono | null {
  switch (arma) {
    case 'cannone': return 'arma_cannone';
    case 'granata': return 'arma_granata_lancio';
    case 'pistola': case 'sciabola': return null;
    default: return 'arma_generica';
  }
}

/** Ogni pirata ha la sua voce: timbro dal numero (pari = basso burbero, dispari = tenore) e una sua intonazione. */
export function vocePirata(pirata: number, verso: IdVerso): { id: IdSuono; intonazione: number } {
  const timbro = pirata % 2 === 0 ? 'a' : 'b';
  return { id: `vox_${timbro}_${verso}`, intonazione: 1 + ((((pirata * 37) % 5) + 5) % 5 - 2) * 0.025 };
}

/** L'indice della squadra del giocatore (come squadraUmana dell'HUD). */
function squadraUmana(v: VistaBattaglia): 0 | 1 {
  return v.squadre[1].controllo === 'umano' && v.squadre[0].controllo !== 'umano' ? 1 : 0;
}

interface VoceCandidata { pirata: number; verso: IdVerso; priorita: number; ritardo: number }

/**
 * Gli eventi di un frame → suoni. `oraMs` serve solo a non far parlare i pirati uno sopra l'altro.
 * Nello stesso frame lo stesso suono parte una volta sola (tre pirati colpiti = un tonfo, non tre).
 */
export function suoniPerEventi(eventi: readonly EventoBattaglia[], vista: VistaBattaglia | null, mem: MemoriaAudio, oraMs: number): AzioniAudio {
  const az: AzioniAudio = { suoni: [], ferma: [], musica: [] };
  const fatti = new Set<string>();
  /** aggiunge il suono se in questo frame non c'è già (i passi possono essere due) */
  const una = (r: Richiesta, massimo = 1): void => {
    const n = [...fatti].filter((k) => k.startsWith(r.id + '#')).length;
    if (n >= massimo) return;
    fatti.add(`${r.id}#${n}`);
    az.suoni.push(r);
  };
  const voci: VoceCandidata[] = [];
  const parla = (pirata: number, verso: IdVerso, priorita: number, ritardo = 0) => voci.push({ pirata, verso, priorita, ritardo });

  // più esplosioni nello stesso frame: suona la più grossa
  let botto: Extract<EventoBattaglia, { t: 'esplosione' }> | null = null;

  for (const e of eventi) {
    switch (e.t) {
      case 'turnoIniziato': {
        const mio = vista ? vista.squadre[e.squadra].controllo === 'umano' : e.squadra === 0;
        // rete di sicurezza: a turno nuovo nessun suono in ciclo (scivolata, masso) resta acceso. I fuochi sì: bruciano
        // anche nel turno dopo e si spengono col loro evento
        for (const k of [...mem.cicli]) if (!k.startsWith('fuoco:')) { az.ferma.push(k); mem.cicli.delete(k); }
        mem.pezzi.clear();
        una({ id: mio ? 'turno_mio' : 'turno_nemico', attenua: 'segnale' });
        parla(e.pirata, 'tocca', 1, 0.45);
        break;
      }
      case 'sparo': {
        const id = suonoSparo(e.arma);
        if (id) una({ id });
        parla(e.pirata, 'spara', 1);
        break;
      }
      case 'salto': una({ id: 'salto' }); break;
      case 'saltoMuro':
        // la spinta sul muro è una prodezza: il pirata la accompagna col suo "hup!" (le voci restano distanziate)
        una({ id: 'salto_muro' });
        parla(e.pirata, 'sforzo', 1);
        break;
      case 'atterrato': una({ id: e.dannoCaduta > 0 ? 'caduta_tonfo' : 'atterra' }); break;
      case 'rimbalzo': una({ id: 'arma_granata_rimbalzo', pan: panDaX(e.x) }); break;
      case 'esplosione': if (!botto || e.raggio > botto.raggio) botto = e; break;
      case 'colpoPistola': una({ id: 'arma_pistola', pan: panDaX(e.da.x) }); break;
      case 'colpoSciabola':
        una({ id: 'arma_sciabola_fendente' });
        if (e.colpiti.length) una({ id: 'arma_sciabola_colpo', ritardo: 0.05 });
        break;
      case 'danno':
        una({ id: 'pirata_colpito', pan: panDaX(e.x), volume: Math.min(1, 0.6 + e.quanto / 100) });
        parla(e.pirata, 'colpito', 2, 0.04);
        break;
      case 'morto':
        if (e.causa === 'mare') una({ id: 'annega', ritardo: 0.3 });
        else una({ id: 'pirata_morte' });
        una({ id: 'rintocco_morte', ritardo: e.causa === 'mare' ? 0.6 : 0.25, attenua: 'segnale' });
        parla(e.pirata, 'morte', 3);
        az.musica.push('percussioni');
        break;
      case 'splash': una({ id: e.grande ? 'splash_grande' : 'splash_piccolo', pan: panDaX(e.x) }); break;
      case 'lapide': una({ id: 'lapide' }); break;
      case 'mareSale':
        una({ id: 'mare_sale', attenua: 'botto_medio' });
        az.musica.push('percussioniSempre');
        break;
      case 'cassaCaduta': una({ id: 'cassa_arriva', pan: panDaX(e.x) }); break;
      case 'cassaAperta': una({ id: e.contenuto === 'rum' ? 'cassa_rum' : 'cassa_trappola' }); break;
      case 'aggrappato': una({ id: 'presa' }); break;
      case 'staccato': una({ id: 'stacco' }); break;
      case 'appiglioRotto': una({ id: 'appiglio_rotto', pan: panDaX(e.x) }); break;
      case 'passo': {
        const p = PASSI[e.materiale] ?? PASSI[MATERIALE.sabbia];
        una({ id: p.id, pan: panDaX(e.x), intonazione: p.intonazione, volume: e.corsa ? 1 : 0.75 }, 2);
        // in corsa tintinnano le fibbie: è un marinaio con gli stivali, non un verme
        if (e.corsa) una({ id: 'fibbia', pan: panDaX(e.x), ritardo: 0.03 });
        break;
      }
      // su per la scala o la liana: un colpetto ogni piolo (la sim ne manda uno ogni 20 px), così la salita non è muta
      case 'piolo': una({ id: e.liana ? 'piolo_corda' : 'piolo_legno', pan: panDaX(e.x) }); break;
      case 'scavalco':
        una({ id: 'scavalco' });
        parla(e.pirata, 'sforzo', 0);
        break;
      case 'scivola': {
        const chiave = `scivola:${e.pirata}`;
        if (e.inizio) {
          const intonazione = e.materiale === MATERIALE.ghiaccio ? 1.35 : e.materiale === MATERIALE.roccia ? 1.12 : 1;
          una({ id: 'scivola_ciclo', ciclo: chiave, intonazione });
          mem.cicli.add(chiave);
        } else {
          az.ferma.push(chiave);
          mem.cicli.delete(chiave);
          una({ id: 'scivola_fine' });
        }
        break;
      }
      case 'bordo':
        una({ id: 'bordo' });
        parla(e.pirata, 'sforzo', 2);
        break;
      case 'fatto': una({ id: 'ui_fatto' }); break;
      // ── Fase 3: il campo si spezza ──
      case 'crollo': {
        const area = e.w * e.h;
        mem.pezzi.set(e.pezzo, area);
        const m = famiglia(e.materiale), g = taglia(area);
        const pan = panDaX(e.x + e.w / 2);
        una({ id: `crollo_${m.f}`, pan, intonazione: m.intonazione * g.intonazione, volume: g.volume, attenua: g.attenua });
        if (e.tipo === 'masso') {
          const chiave = `masso:${e.pezzo}`;
          una({ id: 'masso_rotola', ciclo: chiave, pan, ritardo: 0.1 });
          mem.cicli.add(chiave);
        }
        break;
      }
      case 'macerie': {
        const area = mem.pezzi.get(e.pezzo) ?? PEZZO_PICCOLO;
        mem.pezzi.delete(e.pezzo);
        const chiave = `masso:${e.pezzo}`;
        if (mem.cicli.delete(chiave)) az.ferma.push(chiave);
        const pan = panDaX(e.x);
        if (e.inMare) una({ id: area >= PEZZO_GRANDE ? 'splash_grande' : 'splash_piccolo', pan });
        else {
          const m = famiglia(e.materiale), g = taglia(area);
          una({ id: `macerie_${m.f}`, pan, intonazione: m.intonazione * g.intonazione, volume: g.volume, attenua: g.attenua });
        }
        break;
      }
      case 'fuoco': {
        const chiave = `fuoco:${e.fuoco}`;
        const pan = panDaX(e.x);
        if (e.inizio) {
          una({ id: 'fuoco_accende', pan });
          una({ id: 'fuoco_ciclo', ciclo: chiave, pan, ritardo: 0.15 }, 3);
          mem.cicli.add(chiave);
        } else {
          az.ferma.push(chiave);
          mem.cicli.delete(chiave);
          una({ id: 'fuoco_spegne', pan });
        }
        break;
      }
      case 'frana': una({ id: 'frana', pan: panDaX(e.x) }); break;
      case 'ponteCalato': una({ id: 'ponte_calato', attenua: 'botto_medio' }); break;
      case 'bandieraPresa': una({ id: 'bandiera_presa', attenua: 'segnale' }); break;
      case 'fine': {
        const vinta = vista ? e.esito.vincitore === squadraUmana(vista) : e.esito.vincitore === 0;
        una({ id: vinta ? 'mus_vittoria' : 'mus_sconfitta', ritardo: 0.35 });
        az.musica.push('fine');
        az.ferma.push('*');
        mem.cicli.clear();
        mem.pezzi.clear();
        break;
      }
      case 'fase': case 'timerAvviato': case 'cratere': case 'maschera': break;
      default: {
        // un evento nuovo nei contratti deve passare da qui: il compilatore si ferma su questa riga
        const mai: never = e;
        void mai;
      }
    }
  }

  if (botto) {
    const taglia = botto.raggio > RAGGIO_GRANDE ? 'grande' : botto.raggio >= RAGGIO_PICCOLA ? 'media' : 'piccola';
    const pan = panDaX(botto.x);
    // 1. il botto, per dimensione
    az.suoni.push({ id: `esp_${taglia}`, pan: pan * 0.5, attenua: taglia === 'grande' ? 'botto_grande' : taglia === 'media' ? 'botto_medio' : undefined });
    // 2. lo strato del materiale colpito
    const imp = IMPATTI[botto.materiale ?? MATERIALE.sabbia] ?? IMPATTI[MATERIALE.sabbia];
    az.suoni.push({ id: imp.id, pan, intonazione: imp.intonazione, volume: taglia === 'piccola' ? 0.7 : 1, ritardo: 0.02 });
    // 3. la coda di detriti che ricadono
    az.suoni.push({ id: 'esp_coda', pan, volume: taglia === 'grande' ? 1 : taglia === 'media' ? 0.8 : 0.5, ritardo: 0.12 });
  }

  // le voci: una sola per frame (la più importante), e non più di una ogni 1,5 s salvo che conti di più dell'ultima
  if (voci.length) {
    const scelta = voci.reduce((a, b) => (b.priorita > a.priorita ? b : a));
    const libera = oraMs - mem.ultimaVoceMs >= VOCE_OGNI_MS;
    if (libera || scelta.priorita > mem.ultimaVocePriorita) {
      const v = vocePirata(scelta.pirata, scelta.verso);
      az.suoni.push({ id: v.id, intonazione: v.intonazione, ritardo: scelta.ritardo, attenua: 'voce' });
      mem.ultimaVoceMs = oraMs;
      mem.ultimaVocePriorita = scelta.priorita;
    }
  }
  // l'urlo di vittoria della ciurma, dopo il jingle
  const fine = eventi.find((e) => e.t === 'fine');
  if (fine && fine.t === 'fine' && vista && fine.esito.vincitore === squadraUmana(vista)) {
    const v = vocePirata(0, 'vittoria');
    az.suoni.push({ id: v.id, ritardo: 0.9, intonazione: v.intonazione });
    mem.ultimaVoceMs = oraMs + 900;
    mem.ultimaVocePriorita = 3;
  }
  return az;
}

/**
 * Suoni che nascono dalla VistaBattaglia (non da un evento della sim): tic-tac degli ultimi 5 secondi,
 * clic del cambio arma, avviso "così ti fai male".
 */
export function suoniPerVista(prima: VistaBattaglia | null, dopo: VistaBattaglia | null, mem: MemoriaAudio, inPausa: boolean): Richiesta[] {
  const suoni: Richiesta[] = [];
  if (!dopo || dopo.esito || inPausa) return suoni;
  const mio = dopo.tocca === 'umano' && dopo.fase === 'azione';
  // tic-tac: un colpo a ogni secondo che scende, da 5 a 1
  if (mio && dopo.timerAvviato && dopo.secondiRimasti > 0 && dopo.secondiRimasti <= 5
    && (!prima || prima.secondiRimasti !== dopo.secondiRimasti || prima.numeroTurno !== dopo.numeroTurno)) {
    suoni.push({ id: 'timer_tic', variante: mem.tac ? 1 : 0, volume: dopo.secondiRimasti <= 2 ? 1 : 0.8 });
    mem.tac = !mem.tac;
  }
  if (!mio) mem.tac = false;
  if (prima && mio && prima.numeroTurno === dopo.numeroTurno && prima.arma !== dopo.arma) suoni.push({ id: 'ui_arma' });
  if (mio && dopo.avvisoTiro === 'danno' && prima?.avvisoTiro !== 'danno') suoni.push({ id: 'ui_avviso' });
  return suoni;
}
