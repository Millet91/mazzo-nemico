// Copione di una battaglia finta di 40 secondi per il banco d'ascolto: due turni tuoi e uno della Marina, con
// passi, corsa, salto, cannonata su legno, granata, pistola, un morto, il mare che sale e la vittoria.
// Gli eventi hanno la forma vera di core/tipi (li controlla il compilatore), i tempi sono inventati.
import type { EventoBattaglia, EsitoBattaglia } from '../../src/core/tipi';
import { MATERIALE } from '../../src/core/tipi';
import type { VistaBattaglia } from '../../src/core/bus';

export interface PassoCopione { t: number; eventi: EventoBattaglia[]; vista?: Partial<VistaBattaglia> }

export function vistaFinta(p: Partial<VistaBattaglia> = {}): VistaBattaglia {
  const squadra = (controllo: 'umano' | 'ia') => ({ ciurma: controllo === 'umano' ? 'teschio' as const : 'marina' as const, controllo, pvTotali: 300, pvIniziali: 300, vivi: 3, iniziali: 3 });
  return {
    numeroTurno: 1, turnoLimite: 18, mareSaleDalTurno: 12, squadraDiTurno: 0, tocca: 'umano', fase: 'azione', secondiRimasti: 20,
    timerAvviato: true, vento: 3, ventoMax: 6, squadre: [squadra('umano'), squadra('ia')], arma: 'cannone', munizioni: {}, miccia: 3,
    miraGradi: 45, potenza: 60, iaPensa: false, puoArrendersi: false, esito: null, ...p,
  };
}

const esito: EsitoBattaglia = { vincitore: 0, motivo: 'eliminazione', superstiti: [3, 0], pvTotali: [240, 0], turni: 13, annegati: [0, 1] };

function passi(da: number, x0: number, quanti: number, ogni: number, corsa: boolean, materiale: number): PassoCopione[] {
  return Array.from({ length: quanti }, (_, i) => ({ t: da + i * ogni, eventi: [{ t: 'passo' as const, pirata: 0, x: x0 + i * 14, y: 600, corsa, materiale }] }));
}

export const COPIONE: PassoCopione[] = [
  // ── turno 1: tocca a te. Passi sulla sabbia, corsa sul pontile di legno, scavalco, salto, cannonata ──
  { t: 1.0, eventi: [{ t: 'turnoIniziato', numero: 1, squadra: 0, pirata: 0, vento: 3 }, { t: 'fase', fase: 'inquadra' }] },
  ...passi(2.6, 400, 4, 0.23, false, MATERIALE.sabbia),
  ...passi(3.6, 460, 8, 0.146, true, MATERIALE.legno),
  { t: 4.9, eventi: [{ t: 'scavalco', pirata: 0 }] },
  { t: 5.5, eventi: [{ t: 'salto', pirata: 0 }] },
  { t: 6.1, eventi: [{ t: 'atterrato', pirata: 0, dannoCaduta: 0 }] },
  { t: 7.6, eventi: [{ t: 'sparo', pirata: 0, arma: 'cannone' }, { t: 'fase', fase: 'volo' }] },
  { t: 8.9, eventi: [{ t: 'esplosione', x: 1500, y: 500, raggio: 70, arma: 'cannone', materiale: MATERIALE.legno }, { t: 'cratere', x: 1500, y: 500, raggio: 70 },
    { t: 'danno', pirata: 3, quanto: 48, x: 1490, y: 480 }, { t: 'danno', pirata: 4, quanto: 20, x: 1530, y: 480 }] },
  { t: 9.6, eventi: [{ t: 'atterrato', pirata: 3, dannoCaduta: 6 }] },
  ...passi(10.0, 560, 5, 0.146, true, MATERIALE.roccia),
  { t: 10.9, eventi: [{ t: 'fatto', pirata: 0 }] },
  // ── turno 2: la Marina. Una scala, la granata che rimbalza, una cassa dal cielo ──
  { t: 12.0, vista: { numeroTurno: 2, squadraDiTurno: 1, tocca: 'ia' }, eventi: [{ t: 'turnoIniziato', numero: 2, squadra: 1, pirata: 3, vento: -2 }] },
  { t: 13.2, vista: { numeroTurno: 2, squadraDiTurno: 1, tocca: 'ia' }, eventi: [{ t: 'aggrappato', pirata: 3, appiglio: 1 }] },
  { t: 14.0, vista: { numeroTurno: 2, squadraDiTurno: 1, tocca: 'ia' }, eventi: [{ t: 'staccato', pirata: 3 }] },
  { t: 14.8, vista: { numeroTurno: 2, squadraDiTurno: 1, tocca: 'ia' }, eventi: [{ t: 'sparo', pirata: 3, arma: 'granata' }] },
  { t: 15.7, vista: { numeroTurno: 2, squadraDiTurno: 1, tocca: 'ia' }, eventi: [{ t: 'rimbalzo', proiettile: 9, x: 700, y: 600 }] },
  { t: 16.2, vista: { numeroTurno: 2, squadraDiTurno: 1, tocca: 'ia' }, eventi: [{ t: 'rimbalzo', proiettile: 9, x: 640, y: 610 }] },
  { t: 17.3, vista: { numeroTurno: 2, squadraDiTurno: 1, tocca: 'ia' }, eventi: [{ t: 'esplosione', x: 600, y: 610, raggio: 64, arma: 'granata', materiale: MATERIALE.sabbia }, { t: 'danno', pirata: 0, quanto: 30, x: 580, y: 590 }] },
  { t: 18.6, vista: { numeroTurno: 2, squadraDiTurno: 1, tocca: 'ia' }, eventi: [{ t: 'cassaCaduta', proiettile: 10, x: 900 }] },
  // ── turno 12: il mare sale; tocca a te: pistola, barile che scoppia, un nemico muore, uno finisce in mare, vittoria ──
  { t: 20.5, vista: { numeroTurno: 12 }, eventi: [{ t: 'mareSale', livello: 900 }] },
  { t: 22.6, vista: { numeroTurno: 13 }, eventi: [{ t: 'turnoIniziato', numero: 13, squadra: 0, pirata: 1, vento: 5 }] },
  { t: 24.0, vista: { numeroTurno: 13 }, eventi: [{ t: 'cassaAperta', proiettile: 10, pirata: 1, contenuto: 'rum' }] },
  { t: 25.2, vista: { numeroTurno: 13, arma: 'pistola' }, eventi: [] },
  { t: 26.0, vista: { numeroTurno: 13, arma: 'pistola', secondiRimasti: 5 }, eventi: [] },
  { t: 27.0, vista: { numeroTurno: 13, arma: 'pistola', secondiRimasti: 4 }, eventi: [] },
  { t: 28.0, vista: { numeroTurno: 13, arma: 'pistola', secondiRimasti: 3 }, eventi: [] },
  { t: 28.6, vista: { numeroTurno: 13, arma: 'pistola', secondiRimasti: 3 }, eventi: [{ t: 'sparo', pirata: 1, arma: 'pistola' }, { t: 'colpoPistola', da: { x: 600, y: 600 }, a: { x: 1400, y: 500 } }] },
  { t: 28.95, vista: { numeroTurno: 13, arma: 'pistola', fase: 'volo' }, eventi: [{ t: 'colpoPistola', da: { x: 600, y: 600 }, a: { x: 1400, y: 500 } }] },
  { t: 29.4, vista: { numeroTurno: 13, fase: 'volo' }, eventi: [{ t: 'esplosione', x: 1400, y: 500, raggio: 85, arma: 'barile', materiale: MATERIALE.roccia },
    { t: 'danno', pirata: 3, quanto: 60, x: 1380, y: 480 }, { t: 'appiglioRotto', appiglio: 1, x: 1420, yAlto: 400, yBasso: 480 }] },
  { t: 30.6, vista: { numeroTurno: 13, fase: 'risoluzione' }, eventi: [{ t: 'splash', x: 1700, y: 900, grande: true }, { t: 'morto', pirata: 5, causa: 'mare' }] },
  { t: 32.2, vista: { numeroTurno: 13, fase: 'risoluzione' }, eventi: [{ t: 'morto', pirata: 3, causa: 'pv' }, { t: 'lapide', pirata: 3, proiettile: 11 }] },
  { t: 34.4, vista: { numeroTurno: 13, fase: 'fine' }, eventi: [{ t: 'fine', esito }] },
];
