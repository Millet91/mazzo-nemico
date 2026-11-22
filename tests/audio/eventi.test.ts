// Quale suono per quale evento (P1-contratti §4: "ogni evento a un suono", "nessun altro modulo sceglie i suoni").
import { describe, it, expect } from 'vitest';
import type { EventoBattaglia, EsitoBattaglia } from '../../src/core/tipi';
import { MATERIALE } from '../../src/core/tipi';
import { memoriaNuova, MUTI_PER_SCELTA, PEZZO_GRANDE, PEZZO_PICCOLO, suoniPerEventi, suoniPerVista, vocePirata, type Richiesta } from '../../src/audio/eventi';
import { AUDIO, ID_SUONI } from '../../src/audio/registro';
import { PAN_MAX } from '../../src/audio/mix';
import { vistaFinta } from './copione';

const esito = (vincitore: 0 | 1): EsitoBattaglia => ({ vincitore, motivo: 'eliminazione', superstiti: [1, 0], pvTotali: [50, 0], turni: 9, annegati: [0, 0] });

// Un esempio per ogni evento dei contratti: se il Lead ne aggiunge uno, questa tabella non compila più finché non c'è.
const ESEMPI: { [K in EventoBattaglia['t']]: Extract<EventoBattaglia, { t: K }> } = {
  turnoIniziato: { t: 'turnoIniziato', numero: 1, squadra: 0, pirata: 0, vento: 2 },
  fase: { t: 'fase', fase: 'azione' },
  timerAvviato: { t: 'timerAvviato' },
  sparo: { t: 'sparo', pirata: 0, arma: 'cannone' },
  salto: { t: 'salto', pirata: 0 },
  atterrato: { t: 'atterrato', pirata: 0, dannoCaduta: 0 },
  rimbalzo: { t: 'rimbalzo', proiettile: 1, x: 100, y: 100 },
  esplosione: { t: 'esplosione', x: 1024, y: 500, raggio: 70, arma: 'cannone' },
  cratere: { t: 'cratere', x: 1024, y: 500, raggio: 70 },
  colpoPistola: { t: 'colpoPistola', da: { x: 10, y: 10 }, a: { x: 200, y: 10 } },
  colpoSciabola: { t: 'colpoSciabola', pirata: 0, colpiti: [] },
  danno: { t: 'danno', pirata: 1, quanto: 30, x: 500, y: 500 },
  morto: { t: 'morto', pirata: 1, causa: 'pv' },
  splash: { t: 'splash', x: 300, y: 900, grande: false },
  lapide: { t: 'lapide', pirata: 1, proiettile: 4 },
  mareSale: { t: 'mareSale', livello: 880 },
  cassaCaduta: { t: 'cassaCaduta', proiettile: 5, x: 700 },
  cassaAperta: { t: 'cassaAperta', proiettile: 5, pirata: 0, contenuto: 'rum' },
  aggrappato: { t: 'aggrappato', pirata: 0, appiglio: 2 },
  staccato: { t: 'staccato', pirata: 0 },
  appiglioRotto: { t: 'appiglioRotto', appiglio: 2, x: 400, yAlto: 300, yBasso: 380 },
  passo: { t: 'passo', pirata: 0, x: 500, y: 600, corsa: false, materiale: MATERIALE.sabbia },
  scavalco: { t: 'scavalco', pirata: 0 },
  scivola: { t: 'scivola', pirata: 0, inizio: true, materiale: MATERIALE.sabbia },
  bordo: { t: 'bordo', pirata: 0 },
  saltoMuro: { t: 'saltoMuro', pirata: 0 },
  fatto: { t: 'fatto', pirata: 0 },
  piolo: { t: 'piolo', pirata: 0, x: 0, y: 0, liana: false },
  crollo: { t: 'crollo', pezzo: 0, tipo: 'blocco', x: 0, y: 0, w: 10, h: 10, materiale: 4 },
  macerie: { t: 'macerie', pezzo: 0, x: 0, y: 0, inMare: false, materiale: 4 },
  maschera: { t: 'maschera', x0: 0, y0: 0, x1: 1, y1: 1 },
  fuoco: { t: 'fuoco', fuoco: 0, x: 0, y: 0, r: 10, inizio: true },
  frana: { t: 'frana', x: 0, y: 0 },
  ponteCalato: { t: 'ponteCalato', struttura: 0 },
  bandieraPresa: { t: 'bandieraPresa', pirata: 0 },
  fine: { t: 'fine', esito: esito(0) },
};

const suoni = (eventi: EventoBattaglia[], vista = vistaFinta(), mem = memoriaNuova(), ora = 0) => suoniPerEventi(eventi, vista, mem, ora);
const id = (r: Richiesta[]) => r.map((x) => x.id);

describe('Audio · ogni evento ha il suo suono', () => {
  it('nessun evento resta muto per dimenticanza', () => {
    const muti = Object.values(ESEMPI).filter((e) => suoni([e]).suoni.length === 0).map((e) => e.t).sort();
    expect(muti).toEqual(Object.keys(MUTI_PER_SCELTA).sort());
    for (const motivo of Object.values(MUTI_PER_SCELTA)) expect(motivo!.length).toBeGreaterThan(20);
  });

  it('ogni suono chiesto esiste nel registro', () => {
    const tutti = Object.values(ESEMPI).flatMap((e) => id(suoni([e]).suoni));
    expect(tutti.filter((x) => !(x in AUDIO))).toEqual([]);
  });

  it('niente "boing" e "sproing": salto e colpo preso sono stivali, stoffa e tonfi', () => {
    expect(ID_SUONI.filter((x) => /boing|sproing/.test(x))).toEqual([]);
    expect(id(suoni([ESEMPI.salto]).suoni)).toEqual(['salto']);
    expect(id(suoni([ESEMPI.danno]).suoni)).toContain('pirata_colpito');
  });
});

describe('Audio · esplosioni a tre strati', () => {
  const esplosione = (raggio: number, materiale?: number): EventoBattaglia => ({ t: 'esplosione', x: 1024, y: 500, raggio, arma: 'cannone', materiale });

  it('botto per dimensione + strato del materiale + coda di detriti', () => {
    expect(id(suoni([esplosione(70, MATERIALE.legno)]).suoni)).toEqual(['esp_media', 'imp_legno', 'esp_coda']);
    expect(id(suoni([esplosione(25)]).suoni)).toEqual(['esp_piccola', 'imp_sabbia', 'esp_coda']);
    expect(id(suoni([esplosione(85, MATERIALE.roccia)]).suoni)).toEqual(['esp_grande', 'imp_roccia', 'esp_coda']);
    expect(id(suoni([esplosione(64, MATERIALE.ghiaccio)]).suoni)[1]).toBe('imp_ghiaccio');
    expect(id(suoni([esplosione(64, MATERIALE.ferro)]).suoni)[1]).toBe('imp_ferro');
  });

  it('la terra è la sabbia più cupa; un materiale sconosciuto vale sabbia', () => {
    const terra = suoni([esplosione(64, MATERIALE.terra)]).suoni[1];
    expect(terra.id).toBe('imp_sabbia');
    expect(terra.intonazione).toBeLessThan(1);
    expect(suoni([esplosione(64, 99)]).suoni[1].id).toBe('imp_sabbia');
  });

  it('il botto grande abbassa la musica più del medio, il piccolo non la tocca', () => {
    expect(suoni([esplosione(85)]).suoni[0].attenua).toBe('botto_grande');
    expect(suoni([esplosione(70)]).suoni[0].attenua).toBe('botto_medio');
    expect(suoni([esplosione(25)]).suoni[0].attenua).toBeUndefined();
  });

  it('la coda arriva dopo il botto, e il pan segue la x', () => {
    const [botto, , coda] = suoni([{ t: 'esplosione', x: 2048, y: 0, raggio: 70, arma: 'cannone' }]).suoni;
    expect(coda.ritardo).toBeGreaterThan(botto.ritardo ?? 0);
    expect(coda.pan).toBeCloseTo(PAN_MAX);
    expect(suoni([{ t: 'esplosione', x: 0, y: 0, raggio: 70, arma: 'cannone' }]).suoni[2].pan).toBeCloseTo(-PAN_MAX);
  });

  it('più esplosioni nello stesso frame: suona solo la più grossa', () => {
    expect(id(suoni([esplosione(25), esplosione(85), esplosione(64)]).suoni)).toEqual(['esp_grande', 'imp_sabbia', 'esp_coda']);
  });
});

describe('Audio · movimento da pirata', () => {
  const passo = (materiale: number, corsa = false): EventoBattaglia => ({ t: 'passo', pirata: 0, x: 500, y: 600, corsa, materiale });

  it('il passo cambia col materiale sotto il piede', () => {
    expect(id(suoni([passo(MATERIALE.sabbia)]).suoni)).toEqual(['passo_sabbia']);
    expect(id(suoni([passo(MATERIALE.legno)]).suoni)).toEqual(['passo_legno']);
    expect(id(suoni([passo(MATERIALE.roccia)]).suoni)).toEqual(['passo_roccia']);
    expect(id(suoni([passo(MATERIALE.ghiaccio)]).suoni)).toEqual(['passo_ghiaccio']);
    expect(id(suoni([passo(MATERIALE.ferro)]).suoni)).toEqual(['passo_ferro']);
    expect(id(suoni([passo(MATERIALE.aria)]).suoni)).toEqual(['passo_sabbia']);
  });

  it('in corsa il passo è più forte e tintinnano le fibbie', () => {
    const cammina = suoni([passo(MATERIALE.legno)]).suoni;
    const corre = suoni([passo(MATERIALE.legno, true)]).suoni;
    expect(id(corre)).toEqual(['passo_legno', 'fibbia']);
    expect(corre[0].volume!).toBeGreaterThan(cammina[0].volume!);
  });

  it('al massimo due passi per frame', () => {
    expect(id(suoni([passo(1), passo(1), passo(1), passo(1)]).suoni)).toEqual(['passo_sabbia', 'passo_sabbia']);
  });

  it('la scivolata gira in ciclo finché dura, e si ferma col suo evento', () => {
    const inizio = suoni([{ t: 'scivola', pirata: 3, inizio: true, materiale: MATERIALE.ghiaccio }]);
    expect(inizio.suoni[0]).toMatchObject({ id: 'scivola_ciclo', ciclo: 'scivola:3' });
    expect(inizio.suoni[0].intonazione).toBeGreaterThan(1);
    const fine = suoni([{ t: 'scivola', pirata: 3, inizio: false, materiale: MATERIALE.ghiaccio }]);
    expect(fine.ferma).toEqual(['scivola:3']);
    expect(id(fine.suoni)).toEqual(['scivola_fine']);
  });

  it('scale e liane, scavalco, bordo e salto dal muro hanno ognuno il suo suono', () => {
    expect(id(suoni([ESEMPI.aggrappato]).suoni)).toEqual(['presa']);
    expect(id(suoni([ESEMPI.staccato]).suoni)).toEqual(['stacco']);
    expect(id(suoni([ESEMPI.scavalco]).suoni)).toEqual(['scavalco', 'vox_a_sforzo']);
    expect(id(suoni([ESEMPI.bordo]).suoni)).toEqual(['bordo', 'vox_a_sforzo']);
    expect(id(suoni([ESEMPI.saltoMuro]).suoni)).toEqual(['salto_muro', 'vox_a_sforzo']);
    expect(id(suoni([ESEMPI.piolo]).suoni)).toEqual(['piolo_legno']);
    expect(id(suoni([{ ...ESEMPI.piolo, liana: true }]).suoni)).toEqual(['piolo_corda']);
    expect(id(suoni([{ t: 'atterrato', pirata: 0, dannoCaduta: 12 }]).suoni)).toEqual(['caduta_tonfo']);
    expect(id(suoni([ESEMPI.atterrato]).suoni)).toEqual(['atterra']);
  });
});

describe('Audio · armi, turno e fine', () => {
  it('ogni arma ha il suo sparo; pistola e sciabola suonano col loro colpo', () => {
    expect(id(suoni([{ t: 'sparo', pirata: 0, arma: 'cannone' }]).suoni)).toEqual(['arma_cannone', 'vox_a_spara']);
    expect(id(suoni([{ t: 'sparo', pirata: 0, arma: 'granata' }]).suoni)[0]).toBe('arma_granata_lancio');
    expect(id(suoni([{ t: 'sparo', pirata: 0, arma: 'barile' }]).suoni)[0]).toBe('arma_generica');
    expect(id(suoni([{ t: 'sparo', pirata: 0, arma: 'pistola' }, ESEMPI.colpoPistola]).suoni)).toEqual(['arma_pistola', 'vox_a_spara']);
    expect(id(suoni([{ t: 'sparo', pirata: 0, arma: 'sciabola' }, { t: 'colpoSciabola', pirata: 0, colpiti: [2] }]).suoni))
      .toEqual(['arma_sciabola_fendente', 'arma_sciabola_colpo', 'vox_a_spara']);
    expect(id(suoni([ESEMPI.colpoSciabola]).suoni)).toEqual(['arma_sciabola_fendente']);
  });

  it('campana di bordo: due rintocchi se tocca a te, uno grave se tocca al nemico', () => {
    expect(id(suoni([ESEMPI.turnoIniziato]).suoni)[0]).toBe('turno_mio');
    expect(id(suoni([{ t: 'turnoIniziato', numero: 2, squadra: 1, pirata: 3, vento: 0 }]).suoni)[0]).toBe('turno_nemico');
  });

  it('tre pirati colpiti nello stesso frame: un tonfo solo e una voce sola', () => {
    const danni: EventoBattaglia[] = [1, 2, 3].map((p) => ({ t: 'danno', pirata: p, quanto: 20, x: 500, y: 500 }));
    expect(id(suoni(danni).suoni)).toEqual(['pirata_colpito', 'vox_b_colpito']);
  });

  it('morte: sbuffo, rintocco e voce; in mare il gorgoglio; le percussioni entrano per 8 battute', () => {
    const pv = suoni([ESEMPI.morto]);
    expect(id(pv.suoni)).toEqual(['pirata_morte', 'rintocco_morte', 'vox_b_morte']);
    expect(pv.musica).toEqual(['percussioni']);
    expect(id(suoni([{ t: 'morto', pirata: 2, causa: 'mare' }]).suoni)).toEqual(['annega', 'rintocco_morte', 'vox_a_morte']);
  });

  it('il mare che sale accende le percussioni fino alla fine', () => {
    const az = suoni([ESEMPI.mareSale]);
    expect(id(az.suoni)).toEqual(['mare_sale']);
    expect(az.musica).toEqual(['percussioniSempre']);
  });

  it('fine: jingle di vittoria o di sconfitta secondo chi è il giocatore, musica e cicli si fermano', () => {
    const vinta = suoni([ESEMPI.fine]);
    expect(id(vinta.suoni)).toEqual(['mus_vittoria', 'vox_a_vittoria']);
    expect(vinta.musica).toEqual(['fine']);
    expect(vinta.ferma).toEqual(['*']);
    expect(id(suoni([{ t: 'fine', esito: esito(1) }]).suoni)).toEqual(['mus_sconfitta']);
    // il giocatore è la squadra 1 (difensore): vince se vince la 1
    const difensore = vistaFinta();
    difensore.squadre[0].controllo = 'ia';
    difensore.squadre[1].controllo = 'umano';
    expect(id(suoni([{ t: 'fine', esito: esito(1) }], difensore).suoni)[0]).toBe('mus_vittoria');
  });

  it('casse: rum e trappola', () => {
    expect(id(suoni([ESEMPI.cassaCaduta]).suoni)).toEqual(['cassa_arriva']);
    expect(id(suoni([ESEMPI.cassaAperta]).suoni)).toEqual(['cassa_rum']);
    expect(id(suoni([{ t: 'cassaAperta', proiettile: 5, pirata: 0, contenuto: 'trappola' }]).suoni)).toEqual(['cassa_trappola']);
  });
});

describe('Audio · voci dei pirati', () => {
  it('ogni pirata ha il suo timbro e la sua intonazione', () => {
    expect(vocePirata(0, 'tocca').id).toBe('vox_a_tocca');
    expect(vocePirata(1, 'tocca').id).toBe('vox_b_tocca');
    expect(new Set([0, 2, 4, 6, 8].map((p) => vocePirata(p, 'tocca').intonazione)).size).toBeGreaterThan(2);
    for (let p = 0; p < 10; p++) expect(Math.abs(vocePirata(p, 'spara').intonazione - 1)).toBeLessThanOrEqual(0.051);
  });

  it('al massimo una voce ogni 1,5 secondi', () => {
    const mem = memoriaNuova();
    const v = vistaFinta();
    expect(id(suoniPerEventi([ESEMPI.sparo], v, mem, 1000).suoni)).toContain('vox_a_spara');
    expect(id(suoniPerEventi([ESEMPI.sparo], v, mem, 1800).suoni)).not.toContain('vox_a_spara');
    expect(id(suoniPerEventi([ESEMPI.sparo], v, mem, 2600).suoni)).toContain('vox_a_spara');
  });

  it('una voce più importante passa lo stesso: la morte copre lo sparo', () => {
    const mem = memoriaNuova();
    const v = vistaFinta();
    suoniPerEventi([ESEMPI.sparo], v, mem, 1000);
    expect(id(suoniPerEventi([ESEMPI.danno], v, mem, 1200).suoni)).toContain('vox_b_colpito');
    expect(id(suoniPerEventi([ESEMPI.morto], v, mem, 1400).suoni)).toContain('vox_b_morte');
    // ma due morti di fila non si accavallano
    expect(id(suoniPerEventi([{ t: 'morto', pirata: 2, causa: 'pv' }], v, mem, 1600).suoni)).not.toContain('vox_a_morte');
  });

  it('nello stesso frame parla solo il più importante', () => {
    expect(id(suoni([ESEMPI.sparo, ESEMPI.danno, ESEMPI.morto]).suoni).filter((x) => x.startsWith('vox_'))).toEqual(['vox_b_morte']);
  });
});

describe('Audio · suoni dalla VistaBattaglia', () => {
  it('tic-tac negli ultimi 5 secondi del turno del giocatore, un colpo al secondo', () => {
    const mem = memoriaNuova();
    let prima = vistaFinta({ secondiRimasti: 6 });
    const sentiti: Richiesta[] = [];
    for (const s of [6, 5, 5, 4, 3, 3, 2, 1, 0]) {
      const dopo = vistaFinta({ secondiRimasti: s });
      sentiti.push(...suoniPerVista(prima, dopo, mem, false));
      prima = dopo;
    }
    expect(id(sentiti)).toEqual(['timer_tic', 'timer_tic', 'timer_tic', 'timer_tic', 'timer_tic']);
    expect(sentiti.map((r) => r.variante)).toEqual([0, 1, 0, 1, 0]);
  });

  it('niente tic-tac nel turno dell\'IA, in pausa, a timer fermo o a battaglia finita', () => {
    const mem = memoriaNuova();
    const prima = vistaFinta({ secondiRimasti: 5 });
    expect(suoniPerVista(prima, vistaFinta({ secondiRimasti: 4, tocca: 'ia' }), mem, false)).toEqual([]);
    expect(suoniPerVista(prima, vistaFinta({ secondiRimasti: 4 }), mem, true)).toEqual([]);
    expect(suoniPerVista(prima, vistaFinta({ secondiRimasti: 4, timerAvviato: false }), mem, false)).toEqual([]);
    expect(suoniPerVista(prima, vistaFinta({ secondiRimasti: 4, fase: 'volo' }), mem, false)).toEqual([]);
    expect(suoniPerVista(prima, null, mem, false)).toEqual([]);
  });

  it('cambio arma: clic di ferro; avviso "ti fai male": due colpi di legno, una volta sola', () => {
    const mem = memoriaNuova();
    const a = vistaFinta({ arma: 'cannone' });
    expect(id(suoniPerVista(a, vistaFinta({ arma: 'granata' }), mem, false))).toEqual(['ui_arma']);
    // l'arma che cambia perché è cambiato il turno non fa clic
    expect(suoniPerVista(a, vistaFinta({ arma: 'granata', numeroTurno: 2 }), mem, false)).toEqual([]);
    const pericolo = vistaFinta({ avvisoTiro: 'danno' });
    expect(id(suoniPerVista(a, pericolo, mem, false))).toEqual(['ui_avviso']);
    expect(suoniPerVista(pericolo, vistaFinta({ avvisoTiro: 'danno' }), mem, false)).toEqual([]);
  });
});

describe('Audio · Fase 3: crolli, macerie, fuoco, frane e ponti', () => {
  const crollo = (materiale: number, w: number, h: number, tipo: 'blocco' | 'masso' = 'blocco', pezzo = 7): EventoBattaglia =>
    ({ t: 'crollo', pezzo, tipo, x: 900, y: 400, w, h, materiale });
  const macerie = (pezzo: number, materiale: number, inMare = false): EventoBattaglia => ({ t: 'macerie', pezzo, x: 950, y: 600, inMare, materiale });

  it('il pezzo che si stacca suona per materiale: legno, roccia (ghiaccio più acuto, ferro più cupo), sabbia (terra più cupa)', () => {
    const r = (m: number) => suoni([crollo(m, 30, 30)]).suoni[0];
    expect(r(MATERIALE.legno).id).toBe('crollo_legno');
    expect(r(MATERIALE.roccia).id).toBe('crollo_roccia');
    expect(r(MATERIALE.sabbia).id).toBe('crollo_sabbia');
    expect(r(MATERIALE.ghiaccio).id).toBe('crollo_roccia');
    expect(r(MATERIALE.ghiaccio).intonazione!).toBeGreaterThan(r(MATERIALE.roccia).intonazione!);
    expect(r(MATERIALE.ferro).intonazione!).toBeLessThan(r(MATERIALE.roccia).intonazione!);
    expect(r(MATERIALE.terra).id).toBe('crollo_sabbia');
    expect(r(MATERIALE.terra).intonazione!).toBeLessThan(r(MATERIALE.sabbia).intonazione!);
  });

  it('per grandezza: il pezzo grande è più cupo e più forte e abbassa la musica, il piccolo è più acuto e più piano', () => {
    const piccolo = suoni([crollo(MATERIALE.roccia, 20, 20)]).suoni[0];
    const medio = suoni([crollo(MATERIALE.roccia, 40, 40)]).suoni[0];
    const grande = suoni([crollo(MATERIALE.roccia, 60, 60)]).suoni[0];
    expect(20 * 20).toBeLessThan(PEZZO_PICCOLO);
    expect(60 * 60).toBeGreaterThanOrEqual(PEZZO_GRANDE);
    expect(piccolo.intonazione!).toBeGreaterThan(medio.intonazione!);
    expect(grande.intonazione!).toBeLessThan(medio.intonazione!);
    expect(piccolo.volume!).toBeLessThan(grande.volume!);
    expect(grande.attenua).toBe('botto_medio');
    expect(medio.attenua).toBeUndefined();
  });

  it('le macerie a terra suonano col materiale e la grandezza del pezzo; in mare un tuffo, grande se il pezzo era grande', () => {
    const mem = memoriaNuova();
    suoniPerEventi([crollo(MATERIALE.legno, 60, 60, 'blocco', 3), crollo(MATERIALE.roccia, 10, 10, 'blocco', 4)], vistaFinta(), mem, 0);
    const legno = suoniPerEventi([macerie(3, MATERIALE.legno)], vistaFinta(), mem, 100).suoni;
    expect(id(legno)).toEqual(['macerie_legno']);
    expect(legno[0].attenua).toBe('botto_medio');
    expect(id(suoniPerEventi([macerie(4, MATERIALE.roccia, true)], vistaFinta(), mem, 200).suoni)).toEqual(['splash_piccolo']);
    suoniPerEventi([crollo(MATERIALE.roccia, 70, 70, 'blocco', 5)], vistaFinta(), mem, 300);
    expect(id(suoniPerEventi([macerie(5, MATERIALE.roccia, true)], vistaFinta(), mem, 400).suoni)).toEqual(['splash_grande']);
    expect(mem.pezzi.size).toBe(0);
    // un pezzo che l'audio non ha visto staccarsi suona come uno piccolo, senza rompersi
    expect(id(suoniPerEventi([macerie(99, MATERIALE.sabbia)], vistaFinta(), memoriaNuova(), 0).suoni)).toEqual(['macerie_sabbia']);
  });

  it('dieci pezzi che arrivano giù nello stesso frame: un suono di macerie solo', () => {
    const ev = Array.from({ length: 10 }, (_, i) => macerie(i, MATERIALE.roccia));
    expect(id(suoni(ev).suoni)).toEqual(['macerie_roccia']);
  });

  it('il masso rotola in ciclo dal distacco fino alle sue macerie', () => {
    const mem = memoriaNuova();
    const via = suoniPerEventi([crollo(MATERIALE.roccia, 40, 40, 'masso', 8)], vistaFinta(), mem, 0);
    expect(id(via.suoni)).toEqual(['crollo_roccia', 'masso_rotola']);
    expect(via.suoni[1].ciclo).toBe('masso:8');
    const giu = suoniPerEventi([macerie(8, MATERIALE.roccia)], vistaFinta(), mem, 2000);
    expect(giu.ferma).toEqual(['masso:8']);
    expect(id(giu.suoni)).toEqual(['macerie_roccia']);
  });

  it('il fuoco: vampata e crepitio in ciclo finché dura; spento, si sbriciola', () => {
    const mem = memoriaNuova();
    const acceso = suoniPerEventi([{ t: 'fuoco', fuoco: 2, x: 600, y: 500, r: 40, inizio: true }], vistaFinta(), mem, 0);
    expect(id(acceso.suoni)).toEqual(['fuoco_accende', 'fuoco_ciclo']);
    expect(acceso.suoni[1].ciclo).toBe('fuoco:2');
    const spento = suoniPerEventi([{ t: 'fuoco', fuoco: 2, x: 600, y: 500, r: 40, inizio: false }], vistaFinta(), mem, 4000);
    expect(spento.ferma).toEqual(['fuoco:2']);
    expect(id(spento.suoni)).toEqual(['fuoco_spegne']);
  });

  it('a turno nuovo si fermano scivolata e masso, ma il fuoco continua (brucia anche nel turno dopo); a fine battaglia tutto', () => {
    const mem = memoriaNuova();
    suoniPerEventi([
      { t: 'fuoco', fuoco: 1, x: 600, y: 500, r: 40, inizio: true },
      crollo(MATERIALE.roccia, 40, 40, 'masso', 9),
      { t: 'scivola', pirata: 0, inizio: true, materiale: MATERIALE.sabbia },
    ], vistaFinta(), mem, 0);
    const turno = suoniPerEventi([ESEMPI.turnoIniziato], vistaFinta(), mem, 5000);
    expect(turno.ferma.sort()).toEqual(['masso:9', 'scivola:0']);
    expect([...mem.cicli]).toEqual(['fuoco:1']);
    const fine = suoniPerEventi([ESEMPI.fine], vistaFinta(), mem, 9000);
    expect(fine.ferma).toContain('*');
    expect(mem.cicli.size).toBe(0);
  });

  it('frana di sabbia e ponte che resta appeso a un capo', () => {
    expect(id(suoni([ESEMPI.frana]).suoni)).toEqual(['frana']);
    const ponte = suoni([ESEMPI.ponteCalato]).suoni;
    expect(id(ponte)).toEqual(['ponte_calato']);
    expect(ponte[0].attenua).toBe('botto_medio');
  });
});
