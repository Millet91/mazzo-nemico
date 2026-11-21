// Bari, Sigilli, Mazzieri (testi), eventi, frasi. GDD §5.4, §5.5, §8, §9.

export interface BaroDef {
  id: string;
  name: string;
  kit: { id: string; slot?: number }[];
  passive: string;
  unlock: string;
}

export const BARI: BaroDef[] = [
  { id: 'sottovento', name: 'Il Baro di Sottovento', kit: [{ id: 'brace', slot: 1 }, { id: 'taglio', slot: 2 }], passive: 'Il primo Basamento costa 0.', unlock: 'Iniziale' },
  { id: 'fattucchiera', name: 'La Fattucchiera', kit: [{ id: 'brace', slot: 2 }, { id: 'scartine' }, { id: 'esca' }], passive: '3 posti Trucco.', unlock: 'Supera il Vespro' },
  { id: 'notaio', name: 'Il Notaio', kit: [{ id: 'spina', slot: 1 }, { id: 'taglio', slot: 3 }, { id: 'scala' }], passive: 'Vedi le prime 4 carte della Coda; con l\'Oracolo vedi tutta la Coda.', unlock: 'Supera la Mezzanotte' },
  { id: 'bracconiera', name: 'La Bracconiera', kit: [{ id: 'brace', slot: 2 }, { id: 'gelo', slot: 1 }], passive: 'Inizia con un Patto (un Lupo); i Patti partono con Lealtà 5.', unlock: 'Vinci una run' },
];

export const SIGILLI: string[] = [
  'Nessun Sigillo',
  'Le élite hanno +1 Corazza e +2 Forza',
  'Il Fato annuncia 1 carta in più a ogni rintocco',
  'Il Riposo cura il 25% invece del 30%',
  'Prezzi del negozio +20%',
  'I Mazzieri usano la loro variante',
  'Lumi −5',
  "Vedi solo 1 carta della Coda; l'Annuncio mostra solo il seme",
  'Bonus della notte +1 in tutti gli atti',
  "L'Esilio parte da 20 Spiccioli",
  'La Notte Più Lunga: la Piena prende anche la regola di uno degli altri due Mazzieri, a caso',
];

export interface BossText {
  id: string;
  name: string;
  rule: string;
  ruleText: string;
  variant: string;
  intro: string;
  onRule: string;
  /** battute per fase (Narrative/Marketing): dopo la prima e la seconda fase, quando perde una carta, quando ti ferisce */
  phase2: string;
  phase3: string;
  hurt: string;
  win: string;
  defeat: string;
}

/** Introduzione d'atto (Narrative): una riga sotto il nome dell'ora. */
export const ACT_INTRO: Record<number, { line: string; family: string }> = {
  1: { line: 'Le campane suonano il Vespro. In paese si chiudono le imposte, e il Mazziere mescola.', family: 'Bestie e malanni: carte deboli, ma tante.' },
  2: { line: 'Mezzanotte. Chi bussa adesso non viene per chiedere il sale.', family: 'Ladri, fantasmi e debiti: carte che rubano e che tornano.' },
  3: { line: 'L’Ora Morta. Il fiume sale, e il gallo è ancora lontano.', family: 'Acque e disgrazie: carte forti, la Fila si allunga.' },
};

export const BOSS_TEXT: Record<number, BossText> = {
  1: {
    id: 'sagrestano', name: 'Il Sagrestano', rule: 'Tutto torna',
    ruleText: 'Le carte distrutte in una fase rientrano in fondo alla Coda della fase successiva.',
    variant: 'Variante: le carte che tornano hanno +1 Forza.',
    intro: 'Buonasera. Ho qui tutto scritto. Tutto torna, sa. Tutto.', onRule: 'Annotato.',
    phase2: 'Le ho rimesse in fila, vede? Non si perde niente, qui.', phase3: 'Ultima pagina del registro. La firmi pure col fiato.',
    hurt: 'Ehi! Quella era in ordine alfabetico.', win: 'Annotato: un Lume in meno.',
    defeat: 'Che disordine... qualcuno dovrà rimettere a posto.',
  },
  2: {
    id: 'forestiero', name: 'Il Forestiero', rule: 'Facciamo a metà',
    ruleText: 'A ogni fase ti offre 3 difese: una la tieni, una va a lui e si gira contro di te, la terza si scarta.',
    variant: 'Variante: ciò che gli dai vale doppio (Contro-segno su due Passi, +2 pescate, Discesa con +1 Forza).',
    intro: 'Finalmente un collega. Facciamo a metà?', onRule: 'Questa la tengo io, se non le spiace.',
    phase2: 'Un altro giro? Io la mia parte l’ho già messa in tasca.', phase3: 'L’ultima mano la paghiamo tutti e due. Io un po’ meno.',
    hurt: 'Non si strappano le carte di un collega.', win: 'Mi dispiace. Davvero, eh.',
    defeat: 'Lei bara meglio di me. Mi offenderei, se non fosse un complimento.',
  },
  3: {
    id: 'piena', name: 'La Piena', rule: 'Il fiume esce',
    ruleText: "A ogni fase la Fila si allunga di un Passo all'ingresso (5 → 6 → 7). Corrente: ogni 3 tick le carte nemiche avanzano di un Passo in più.",
    variant: 'Variante: la Corrente spinge ogni 2 tick.',
    intro: 'Il fiume ha smesso di ascoltare.', onRule: '…',
    phase2: 'L’acqua arriva al Cortile. Poi alla Scala.', phase3: 'Sette Passi. Nessuno ha mai contato fino a otto.',
    hurt: 'La corrente si spezza, e torna.', win: 'Il fiume prende quel che trova.',
    defeat: "L'acqua si ritira. Il gallo canta.",
  },
};

export interface EventDef { id: string; name: string; who: string; text: string }
export const EVENTS: EventDef[] = [
  { id: 'comare', name: 'La Comare', who: 'la Comare', text: 'La Comare sa sempre tutto prima degli altri. "Ti dico chi arriva, ma qualcosa in cambio lo voglio."' },
  { id: 'pozzo', name: 'Il Pozzo dei Desideri', who: 'il Pozzo', text: 'Un pozzo vecchio, con l’eco lunga. Si dice che esaudisca, metà delle volte.' },
  { id: 'prete', name: 'Il Prete', who: 'il Prete', text: '"Posso benedire una delle tue sventure e mandarla via. Ma i patti col nemico, anima mia, si sciolgono."' },
  { id: 'cartaio', name: 'Il Cartaio', who: 'il Cartaio', text: 'Il Cartaio stampa le carte del paese. "Dammi uno dei tuoi trucchi e ti tolgo due carte dal mazzo."' },
  { id: 'pegni', name: 'Il Banco dei pegni', who: 'il Banco', text: 'Al banco si impegna tutto. Anche un po’ di luce.' },
  { id: 'bambini', name: 'I Bambini sotto il Portico', who: 'i Bambini', text: 'I bambini giocano a carte sotto il portico. Vedono tutto, e per un regalo te lo dicono.' },
  { id: 'processione', name: 'La Processione', who: 'la Processione', text: 'Passa la processione con i santi e i debitori. Il prossimo rintocco sarà affollato.' },
  { id: 'gatto', name: 'Il Gatto Nero', who: 'il Gatto Nero', text: 'Un gatto nero ti taglia la strada e ti guarda. Tornare indietro, o proseguire?' },
  { id: 'vedova', name: 'La Vedova del Mugnaio', who: 'la Vedova', text: '"Ho perso il mulino e il marito. Sciogli uno dei tuoi patti con quelle creature e ti pago bene."' },
  { id: 'vicini', name: 'La Casa Accanto', who: 'i vicini', text: 'Dalla casa accanto arriva un rumore. Una loro sventura sta per entrare da te. In cambio, ti lasciano qualcosa.' },
];

export const FAMIGLIE = [
  ['Esposito', 'il fornaio e i suoi sei figli'], ['Ferrante', 'la levatrice che non dorme mai'],
  ['Colombo', 'il campanaro mezzo sordo'], ['Rinaldi', 'due sorelle che litigano da trent’anni'],
  ['Marchetti', 'il mugnaio nuovo, che nessuno conosce'], ['De Santis', 'una nonna che sa le preghiere storte'],
  ['Galli', 'il pastore e il suo cane zoppo'], ['Barbieri', 'la sarta che cuce di notte'],
  ['Fontana', 'il maestro con gli occhiali rotti'], ['Moretti', 'il ciabattino e la moglie cantante'],
];

export const DAWN_LINES = {
  perfect: 'Non ha perso un solo Lume. Non mi piace.',
  close: 'Una candela sola. Le è bastata. Anche stavolta.',
  patti: 'Metà del mio mazzo l’ha portata dalla sua parte. Ingrato, il mazzo.',
  exile: 'Mi ha alleggerito il mazzo come un borsaiolo. Complimenti, credo.',
  barehands: 'Ha vinto quasi a mani nude. Non mi piace.',
  generic: 'Il gallo ha cantato. Ci rivediamo il prossimo inverno.',
  lose: 'La candela si è spenta. Le carte, però, le tengo io.',
};

/** Varianti delle frasi dell'alba (Narrative N11): se ne sceglie una in base al seed. */
export const DAWN_ALT: Record<keyof typeof DAWN_LINES, string[]> = {
  perfect: ['Nemmeno una candela. Ricontrollerò il mazzo.', 'Pulita. Troppo pulita.'],
  close: ['Ha visto l’alba con un filo di fumo. Basta e avanza, a quanto pare.', 'Ancora un rintocco e la casa era mia.'],
  patti: ['Ha giocato con le mie carte meglio di me.', 'Le mie sventure le tengono la porta. Che vergogna.'],
  exile: ['Ha buttato via mezzo mazzo. E io dovrei ricomprarlo.', 'Carte sparite come spiccioli in chiesa.'],
  barehands: ['Quattro trucchi e un po’ di faccia tosta.', 'Pochi attrezzi, molta fortuna. O no?'],
  generic: ['Il gallo canta sempre troppo presto.', 'Per stanotte, ha vinto lei. Per stanotte.'],
  lose: ['Un’altra casa, un’altra candela. Il mazzo ringrazia.', 'Si è fatto buio prima del previsto, eh?'],
};

/** Righe d'ingresso delle élite (Narrative N14). */
export const ELITE_LINES: Record<string, string> = {
  spaventapasseri: 'Il campo è vuoto, ma qualcosa ha cambiato posto.',
  brigante: '«O la borsa o la vita. Anzi: tutte e due.»',
  strega: 'L’acqua del lago è salita fino al sentiero, e qualcuno ci cammina sopra.',
};
