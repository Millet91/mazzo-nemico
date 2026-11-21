// Tutti i testi del gioco (00 §1.5: "tutti i testi stanno in un file di stringhe fin da subito").
// Regole: chiavi in italiano, raggruppate per schermata; niente testo scritto a mano nei componenti.
// Le funzioni servono per i testi con valori variabili. L'inglese (en.ts) avrà lo stesso tipo `Testi`.

export const it = {
  gioco: {
    titolo: 'Kaboom Ahoy!',
    sottotitolo: 'Isole Spezzate',
  },
  home: {
    lavoriInCorso: 'Cantiere navale aperto: la ciurma sta montando le vele.',
    impostazioni: 'Impostazioni',
  },
  impostazioni: {
    titolo: 'Impostazioni',
    chiudi: 'Chiudi',
    indietro: 'Indietro',
    info: 'Info',
    contatoreFps: 'Contatore FPS',
    acceso: 'Acceso',
    spento: 'Spento',
  },
  info: {
    titolo: 'Info',
    versione: 'Versione',
    build: 'Build',
    commit: 'Commit',
    ramo: 'Ramo',
    data: 'Data della build',
    grafica: 'Grafica',
    schermo: 'Schermo',
    suggerimento: 'Nelle segnalazioni scrivi sempre il numero di build.',
    fpsAttivato: 'Contatore FPS attivato',
    fpsDisattivato: 'Contatore FPS disattivato',
    tocchiMancanti: (n: number) => (n === 1 ? 'Ancora 1 tocco' : `Ancora ${n} tocchi`),
  },
  // Nomi delle 16 armi (00 §1.3, con 00 §9.6: arma 7 = Rum incendiario). Chiave = IdArma.
  armi: {
    cannone: 'Cannone a mano',
    granata: 'Granata di bordo',
    pistola: 'Pistola a pietra focaia',
    sciabola: 'Sciabola',
    barile: 'Barile di polvere',
    mina: 'Mina a conchiglia',
    rum: 'Rum incendiario',
    pallaSpezzata: 'Palla spezzata',
    pappagallo: 'Pappagallo postino',
    scimmia: 'Scimmia con la miccia',
    ancora: "Ancora d'abisso",
    bordata: 'Bordata del galeone',
    rampino: 'Rampino',
    vanga: 'Vanga del bucaniere',
    bussola: 'Bussola stregata',
    kraken: 'Ira del Kraken',
  },
  // Nomi delle ciurme e dei pirati (00 §2.1). I nomi dei pirati sono segnaposto finché 07 non dà le liste.
  ciurme: {
    teschio: { nome: 'Teschio Rosso', turno: 'Turno del Teschio Rosso', pirati: ['Scarlatta', 'Uncino', 'Fumo', 'Brace', 'Miccia'] },
    gelo: { nome: 'Corsari del Gelo', turno: 'Turno dei Corsari del Gelo', pirati: ['Barbabrina', 'Bottone', 'Brina', 'Gelone', 'Fiocco'] },
    oro: { nome: "Fratellanza dell'Oro", turno: "Turno della Fratellanza dell'Oro", pirati: ['Dobloncino', 'Zecchino', 'Scudo', 'Ducato', 'Fiorino'] },
    marea: { nome: 'Dannati della Marea', turno: 'Turno dei Dannati della Marea', pirati: ['Morgana', 'Alga', 'Scoglio', 'Risacca', 'Corallo'] },
    marina: { nome: 'Marina Reale', turno: 'Turno della Marina Reale', pirati: ['Ceralacca', 'Bottoni', 'Cadetto', 'Alabarda', 'Trombetta'] },
  },
  fps: {
    etichetta: (medio: number, minimo: number) => `${medio} fps · min ${minimo}`,
  },
  errori: {
    webgl2Titolo: 'Grafica non supportata',
    webgl2Testo:
      'Questo telefono non offre WebGL2, che serve per disegnare il gioco. Prova ad aggiornare «Android System WebView» dal Play Store e riapri il gioco.',
    avvioGrafica: 'La grafica non è partita. Chiudi e riapri il gioco.',
  },
} as const;

export type Testi = typeof it;
export const T: Testi = it;
