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
