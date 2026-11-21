// Atto 0 · La Prova (GDD §12.6): cinque rintocchi guidati, una regola nuova per rintocco.

export interface TutorialStep {
  title: string;
  add: string[];
  draws: number;
  offer: string[];
  /** difese regalate (Segno sul Passo indicato) */
  give?: { id: string; slot: number }[];
  hint: string;
}

export const TUTORIAL: TutorialStep[] = [
  {
    title: 'La Nonna: «Guarda la Fila»',
    add: [],
    draws: 3,
    offer: [],
    give: [{ id: 'brace', slot: 2 }],
    hint: '«Stanotte il Fato bussa, nipote. Vedi le carte a sinistra? È la Coda: le sventure che entreranno. Accanto c’è la Fila, cinque Passi fino alla nostra porta, là a destra. Ti ho messo una Brace nel Cortile: brucia 2 di Forza a chi ci passa. Premi Avvia e guarda: chi arriva alla porta ci spegne i Lumi.»',
  },
  {
    title: 'La Nonna: «Scegli e piazza»',
    add: ['lupo'],
    draws: 4,
    offer: ['tagliola'],
    hint: '«Dopo ogni rintocco puoi prendere una difesa. La Tagliola è un Segno, la forma a esagono: toccala, poi tocca un Passo. Il numero verde sul Passo dice dove ti fa perdere meno Lumi. I Segni si possono spostare prima di ogni rintocco.»',
  },
  {
    title: 'La Nonna: «Leggi le carte»',
    add: ['topi'],
    draws: 5,
    offer: ['taglio'],
    hint: '«Ogni sventura ha la sua malizia. I Topi del Granaio hanno Sciame: quando entrano, una loro Copia si mette in testa alla Coda. Tocca una carta per leggere cosa fa. Il Taglio fa sparire subito chi ha Forza 2 o meno: mettilo davanti, così i topi non arrivano.»',
  },
  {
    title: 'La Nonna: «I Trucchi stanno sul mazzo»',
    add: ['volpe'],
    draws: 5,
    offer: ['esca'],
    hint: '«I Trucchi, a rombo, non stanno sulla Fila: lavorano sul mazzo del Fato. L’Esca toglie Forza alla prima carta che entra. In alto vedi sempre quante carte ha il Fato e quali ha aggiunto: il suo mazzo cresce, e tu devi crescere più in fretta.»',
  },
  {
    title: 'La Nonna: «Il Rito ordina la Coda»',
    add: ['lupo'],
    draws: 6,
    offer: ['scala'],
    hint: '«Ultima cosa, poi ti lascio. Il Rito, a cerchio, decide in che ordine entrano le carte. Con la Scala entrano prima le più deboli, e il tuo Taglio le spazza via. Quando due difese lavorano insieme vedi la Combo. Ecco, ora sai barare.»',
  },
];
