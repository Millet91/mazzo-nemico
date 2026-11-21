// Numeri della carriera (round sulla mappa del mondo). Li tara Bilanciamento; le regole stanno in mondo/carriera/regole.ts.
// Base: 02 §3 (rinforzi, tetto), 15 §1.3 e PIANO §4.7 (stelle, limite di round), accordo con il Lead P2 sulla Marina.

export const CAMPAGNA = {
  /** rinforzi = max(minimo, ⌊isole/divisore⌋) + bonus delle regioni complete (02 §3.1) */
  rinforziMinimi: 3,
  rinforziDivisore: 3,
  /** tetto di pirati su un'isola ("una scialuppa ne porta 5") */
  tettoIsola: 5,
  /** pirati massimi che partono da un'isola: tutti meno questi (almeno 1 resta a casa) */
  restaACasa: 1,
  /** attacco unito: da quante isole al massimo */
  partenzeMax: 2,

  marina: {
    /** pirati che la Marina riceve a fine round (dopo i round protetti), sull'isola di confine più debole */
    rinforzi: 1,
    /** la Marina attacca se attaccanti / difensori ≥ soglia */
    sogliaAttacco: 1.5,
    /** attacchi massimi della Marina per round */
    attacchiPerRound: 1,
    /** isole che la Marina non attacca mai nel capitolo (Lead P2: perdere la base al cap. 1 è frustrante) */
    intoccabili: ['1A'] as readonly string[],
  },

  stelle: {
    /** ★★: vincere entro questo round */
    roundVeloce: 6,
    /** ★★★: pirati persi al massimo nelle battaglie Bandiera e Duello */
    perditeSfideMax: 0,
  },
} as const;
