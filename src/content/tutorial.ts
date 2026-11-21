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
    title: 'La Fila e i Lumi',
    add: [],
    draws: 3,
    offer: [],
    hint: 'Il Fato pesca le sventure e le manda lungo i Cinque Passi, dal Crocevia all’Uscio. Chi arriva alla porta spegne tanti Lumi quanta è la sua Forza. Ora non hai difese: premi Avvia e guarda.',
  },
  {
    title: 'I Segni',
    add: ['lupo'],
    draws: 4,
    offer: ['brace'],
    hint: 'I Segni sono le tue torri: stanno su un Passo e colpiscono a ogni tick la carta che ci trovano. Prendi la Brace e mettila su un Passo, poi Avvia. Puoi spostarla quando vuoi in Preparazione.',
  },
  {
    title: 'Le abilità nemiche',
    add: ['topi'],
    draws: 5,
    offer: ['tagliola'],
    hint: 'Ogni sventura può avere un’abilità. I Topi del Granaio hanno Sciame: quando entrano, una loro Copia si mette in testa alla Coda. Tocca una carta per leggere cosa fa.',
  },
  {
    title: 'I Trucchi e il mazzo',
    add: ['volpe'],
    draws: 5,
    offer: ['esca'],
    hint: 'I Trucchi non stanno sulla Fila: agiscono sulla pescata. Guarda il pannello del mazzo: vedi sempre com’è fatto e quali carte il Fato ha aggiunto. L’Esca indebolisce la prima carta che entra.',
  },
  {
    title: 'I Riti e la prima combo',
    add: ['lupo'],
    draws: 6,
    offer: ['scala'],
    give: [{ id: 'taglio', slot: 1 }],
    hint: 'I Riti decidono l’ordine della Coda. Con la Scala entrano prima le carte deboli, e il Taglio (te l’ho messo nella Strada) le distrugge appena hanno Forza 2 o meno. Prendi la Scala e guarda la combo.',
  },
];
