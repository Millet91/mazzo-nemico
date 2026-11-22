// Capitolo 1 «Acque di Casa» (15 §2, progressione.md, PIANO §4). Dati di partenza congelati dal Lead P2.
// Chi li tocca: Scenario e livelli (mappa, bioma, trucco, pos se l'arte lo chiede), Campagna e narrativa (premi,
// scontri, pirati). Le ROTTE e gli ID non si cambiano senza il Lead P2 (le controlla tests/mondo/capitolo-1.test.ts).
// Semi: scelti col generatore di oggi da scripts/mappe/isole/scegli-semi.ts (studio-v2/livelli-cap1.md §3),
// ricontrollati da tests/mappe/isole-cap1.test.ts.
// Posizioni su mappa logica 3072×1728, distese in orizzontale per lo schermo del telefono (~2,2:1): Costa del
// Teschio a ovest, Lagune a est, Cala Pappagallo sul bordo sud.
import type { DefCapitolo, DefIsola } from '../core/carriera';

/** Cala Pappagallo: isola del Prologo. Sta sulla mappa (bordo sud) ma non fa parte del capitolo né delle rotte. */
export const CALA_PAPPAGALLO = {
  id: 'cala',
  nome: 'calaPappagallo',
  pos: { x: 1220, y: 1500 },
  raggio: 90,
} as const;

const isole: DefIsola[] = [
  {
    id: '1A', nome: 'portoTeschio', regione: 'costa', adiacenti: ['1B', '1C', '1E'],
    pos: { x: 1050, y: 930 }, raggio: 110, bioma: 'porto', mappa: { seme: 2991 }, trucco: 'palafitte',
    padroneIniziale: 'giocatore', piratiIniziali: 4, scontro: null, premi: [],
  },
  {
    id: '1B', nome: 'baiaDeiCorvi', regione: 'costa', adiacenti: ['1A', '1C', '1D'],
    pos: { x: 420, y: 640 }, raggio: 90, bioma: 'porto', mappa: { seme: 467 }, trucco: 'gru',
    padroneIniziale: 'giocatore', piratiIniziali: 2, scontro: null, premi: [],
  },
  {
    id: '1C', nome: 'forteRampino', regione: 'costa', adiacenti: ['1A', '1B', '1D', '1F'],
    pos: { x: 1420, y: 520 }, raggio: 100, bioma: 'porto', mappa: { seme: 650 }, trucco: 'bastione',
    padroneIniziale: 'marina', piratiIniziali: 2, scontro: { tipo: 'assalto' },
    premi: [{ t: 'arma', arma: 'rampino' }, { t: 'mossa', mossa: 'dondolo' }],
  },
  {
    id: '1D', nome: 'scoglioDellaVedetta', regione: 'costa', adiacenti: ['1B', '1C'],
    pos: { x: 800, y: 300 }, raggio: 75, bioma: 'isola', mappa: { seme: 2002 }, trucco: 'torre',
    padroneIniziale: 'marina', piratiIniziali: 1, scontro: { tipo: 'bandiera' },
    premi: [{ t: 'mossa', mossa: 'saltoAppoggio' }],
  },
  {
    id: '1E', nome: 'scogliDelRum', regione: 'lagune', adiacenti: ['1A', '1F', '1G', '1H'],
    pos: { x: 1760, y: 1120 }, raggio: 90, bioma: 'scogliera', mappa: { seme: 1103 }, trucco: 'archi',
    padroneIniziale: 'marina', piratiIniziali: 2, scontro: { tipo: 'assalto' },
    premi: [{ t: 'recluta', nome: 'Spugna', aspetto: 'bandanaVerde' }],
  },
  {
    id: '1F', nome: 'lagunaNera', regione: 'lagune', adiacenti: ['1C', '1E', '1G'],
    pos: { x: 2300, y: 740 }, raggio: 95, bioma: 'grotta', mappa: { seme: 334 }, trucco: 'stalattiti',
    padroneIniziale: 'marina', piratiIniziali: 2, scontro: { tipo: 'assalto', notte: true },
    premi: [{ t: 'arma', arma: 'ancora' }, { t: 'mossa', mossa: 'scivolata' }],
  },
  {
    id: '1G', nome: 'seccaDelBarile', regione: 'lagune', adiacenti: ['1E', '1F', '1H'],
    pos: { x: 2680, y: 1160 }, raggio: 85, bioma: 'isola', mappa: { seme: 1886 }, trucco: 'dune',
    padroneIniziale: 'marina', piratiIniziali: 1, scontro: { tipo: 'assalto', bariliExtra: 5 },
    premi: [{ t: 'recluta', nome: 'Bonaccia', aspetto: 'barbaRossa' }],
  },
  {
    id: '1H', nome: 'isolottoDelleCozze', regione: 'lagune', adiacenti: ['1E', '1G'],
    pos: { x: 2200, y: 1420 }, raggio: 70, bioma: 'isola', mappa: { seme: 165 }, trucco: 'palmaPonte',
    padroneIniziale: 'marina', piratiIniziali: 1, scontro: { tipo: 'duello', capo: 'Rigidini' },
    premi: [{ t: 'mossa', mossa: 'tuffo' }, { t: 'bandiera', id: 'teschioFumante' }],
  },
];

export const CAPITOLO_1: DefCapitolo = {
  id: 1,
  nome: 'acqueDiCasa',
  isole,
  regioni: [
    { id: 'costa', nome: 'costaDelTeschio', bonus: 2, isole: ['1A', '1B', '1C', '1D'] },
    { id: 'lagune', nome: 'lagune', bonus: 2, isole: ['1E', '1F', '1G', '1H'] },
  ],
  // 10 round (15 §1.2): con 8 il bot a Mozzo vinceva il capitolo solo nel 45-58% dei casi (studio-v2/campagna/bot-cap1.md)
  limiteRound: 10,
  roundProtetti: 1,
  partenzaViaggio: 'cala',
  piratiMaxPerLato: 5,
};

/** Dimensioni della mappa logica del mondo (mondo.md D10). */
export const MONDO_W = 3072;
export const MONDO_H = 1728;
