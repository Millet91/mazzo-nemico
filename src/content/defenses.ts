// Difese del giocatore (GDD §5.3): 18 Segni, 11 Trucchi, 8 Riti.

export type Family = 'segno' | 'trucco' | 'rito';
export type Rarity = 'C' | 'NC' | 'R';

export interface DefenseDef {
  id: string;
  name: string;
  family: Family;
  rarity: Rarity;
  text: string;
  plus: string;
  backlash?: string;
  /** Rito che richiede la scelta di un seme */
  needsSeme?: boolean;
  /** pacchetto della meta-progressione che lo sblocca (assente = base) */
  pack?: string;
  flavor: string;
}

export const DEFENSES: Record<string, DefenseDef> = {};
function d(x: DefenseDef) {
  DEFENSES[x.id] = x;
}

// ---- Segni
d({ id: 'brace', name: 'Brace', family: 'segno', rarity: 'C', text: '−2 alla carta nel Passo.', plus: '−3.', flavor: 'Un tizzone sul sentiero.' });
d({ id: 'spina', name: 'Spina', family: 'segno', rarity: 'C', text: 'Toglie 1 Corazza, poi −1.', plus: 'Toglie 1 Corazza, poi −2.', flavor: 'Trova la fessura.' });
d({ id: 'taglio', name: 'Taglio', family: 'segno', rarity: 'C', text: 'Distrugge la carta se ha Forza ≤ 2 (non i Mazzieri).', plus: 'Forza ≤ 3.', flavor: 'Netto.' });
d({ id: 'gelo', name: 'Gelo', family: 'segno', rarity: 'C', text: 'La carta non avanza al prossimo tick (una volta per carta per ondata).', plus: 'Due tick.', flavor: 'La brina ferma anche il Fato.' });
d({ id: 'lanterna', name: 'Lanterna', family: 'segno', rarity: 'C', text: 'Toglie Etereo; −3 alle Coppe, −1 alle altre.', plus: '−4 alle Coppe.', flavor: 'Gli spettri odiano la luce.' });
d({ id: 'bastione', name: 'Bastione', family: 'segno', rarity: 'C', text: "Solo sull'Uscio. La carta che esce da qui fa 1 danno in meno.", plus: '2 in meno.', flavor: 'La porta tiene.' });
d({ id: 'tagliola', name: 'Tagliola', family: 'segno', rarity: 'C', text: '−1. Se la carta muore in questo Passo, +1 Spicciolo.', plus: '−2.', flavor: 'Scatta e paga.' });
d({ id: 'trappola', name: 'Trappola per Lupi', family: 'segno', rarity: 'NC', text: '−3 ai Bastoni, e toglie loro Rapido.', plus: '−4.', pack: 'ferri', flavor: 'Denti di ferro per denti di bestia.' });
d({ id: 'calamita', name: 'Calamita', family: 'segno', rarity: 'NC', text: 'Toglie tutta la Corazza; −3 alle Spade.', plus: '−4 alle Spade.', flavor: 'Il ferro viene a lei.' });
d({ id: 'moneta', name: 'Moneta Falsa', family: 'segno', rarity: 'NC', text: '−2 ai Denari; un Denari che muore qui dà +2 Spiccioli.', plus: '−3.', pack: 'ferri', flavor: 'Pesa giusta, suona storta.' });
d({ id: 'rimando', name: 'Rimando', family: 'segno', rarity: 'NC', text: 'La prima carta che passa di qui in ogni ondata torna in fondo al mazzo con Rancore +1 (non i Mazzieri).', plus: 'Le prime due.', flavor: 'Non oggi. Domani, forse.' });
d({ id: 'catena', name: 'Catena', family: 'segno', rarity: 'NC', text: 'Quando una carta muore in questo Passo, −2 alla carta nel Passo dietro.', plus: '−3.', pack: 'ferri', flavor: 'Un anello tira l’altro.' });
d({ id: 'malocchio', name: 'Malocchio', family: 'segno', rarity: 'NC', text: "La carta perde tutte le keyword per il resto dell'ondata (una volta per carta).", plus: 'Ignora la Corazza.', pack: 'ferri', flavor: 'Due dita e uno sguardo.' });
d({ id: 'corno', name: 'Corno', family: 'segno', rarity: 'NC', text: '−1 qui e −1 alla carta nel Passo dietro.', plus: '−2 qui.', pack: 'ferri', flavor: 'Rosso, storto, appuntito.' });
d({ id: 'rogo', name: 'Rogo', family: 'segno', rarity: 'R', text: 'Brucia +1 (max 2): a fine tick la carta perde Forza pari al suo Brucia.', plus: 'Max 3.', flavor: 'Una volta acceso, non chiede permesso.' });
d({ id: 'specchio', name: 'Specchio', family: 'segno', rarity: 'R', text: 'La carta qui infligge la sua Forza alla carta nemica nel Passo davanti.', plus: 'Anche metà alla carta dietro.', pack: 'ferri', flavor: 'Si vede per quello che è.' });
d({ id: 'pozzo', name: 'Pozzo', family: 'segno', rarity: 'R', text: "Una volta per ondata: se la carta ha Forza ≤ 3 è esiliata per sempre (non élite né Mazzieri).", plus: 'Forza ≤ 4.', pack: 'antichi', flavor: 'Quel che cade nel pozzo resta al pozzo.' });
d({ id: 'campanaMorto', name: 'Campana a Morto', family: 'segno', rarity: 'R', text: 'Quando una carta muore in questo Passo, −1 a tutte le carte nemiche in Fila.', plus: 'Scatta anche per le morti nei Passi adiacenti.', pack: 'antichi', flavor: 'Suona per uno, trema per tutti.' });

// ---- Trucchi
d({ id: 'scartine', name: 'Scartine', family: 'trucco', rarity: 'C', text: "A ogni ondata mescola 2 Scartine nel mazzo, solo per quell'ondata.", backlash: "L'Ingordo cresce con le Scartine.", plus: '3 Scartine.', flavor: 'Carte da niente, nel posto giusto.' });
d({ id: 'setaccio', name: 'Setaccio', family: 'trucco', rarity: 'C', text: 'Scarta le prime 2 Bastoni pescate (contano nella pescata).', backlash: 'Le altre Bastoni in Coda +1 Forza.', plus: 'Senza contraccolpo.', flavor: 'Passa il grano, resta la bestia.' });
d({ id: 'esca', name: 'Esca', family: 'trucco', rarity: 'C', text: 'La prima carta nemica della Coda entra con −2 Forza.', backlash: 'La Corazza la para.', plus: '−3.', flavor: 'Un boccone avvelenato.' });
d({ id: 'oracolo', name: 'Oracolo', family: 'trucco', rarity: 'C', text: "Vedi le prime 4 carte della Coda e l'ultima.", backlash: 'Occupa un posto senza fare danno.', plus: 'Prime 6.', flavor: 'Sapere è già barare.' });
d({ id: 'bavaglio', name: 'Bavaglio', family: 'trucco', rarity: 'NC', text: 'Gli Araldi non pescano.', backlash: 'Gli Araldi +2 Forza.', plus: '+1 Forza soltanto.', flavor: 'Zitto e cammina.' });
d({ id: 'contrabbando', name: 'Contrabbando', family: 'trucco', rarity: 'NC', text: '+2 Spiccioli per ogni carta scartata, rimandata o esiliata dalle tue difese.', backlash: 'Occupa un posto.', plus: '+3.', pack: 'segnate', flavor: 'Ogni carta ha un prezzo.' });
d({ id: 'segnare', name: 'Segnare', family: 'trucco', rarity: 'NC', text: 'In Preparazione segni una carta del mazzo: se viene pescata entra per ultima.', plus: 'Due carte.', pack: 'segnate', flavor: 'Un’unghiata sul bordo.' });
d({ id: 'censura', name: 'Censura', family: 'trucco', rarity: 'R', text: 'Pescata −1.', backlash: 'Il Fato annuncia 1 carta in più a ogni rintocco.', plus: 'Pescata −2, annuncio +2.', pack: 'segnate', flavor: 'Quel che non si dice non arriva.' });
d({ id: 'avara', name: 'Pescata Avara', family: 'trucco', rarity: 'R', text: 'Pescata −3.', backlash: 'Le carte pescate +1 Forza.', plus: 'Pescata −4.', pack: 'segnate', flavor: 'Meno carte, più rabbia.' });
d({ id: 'truccato', name: 'Mazzo Truccato', family: 'trucco', rarity: 'R', text: 'Delle prime 5 carte che verranno pescate, ne metti in fondo fino a 2.', plus: 'Fino a 3.', pack: 'segnate', flavor: 'Il polso giusto al momento giusto.' });
d({ id: 'rogoArchivio', name: "Rogo dell'Archivio", family: 'trucco', rarity: 'R', text: 'Si consuma subito: esilia 2 carte a scelta dal mazzo. Non occupa posti.', plus: '3 carte.', pack: 'segnate', flavor: 'Quel che brucia non torna.' });

// ---- Riti
d({ id: 'scala', name: 'Scala', family: 'rito', rarity: 'C', text: 'Le carte entrano in ordine di Forza crescente.', plus: 'E la prima carta entra con −1 Forza.', flavor: 'Prima i piccoli.' });
d({ id: 'discesa', name: 'Discesa', family: 'rito', rarity: 'C', text: 'Le carte entrano in ordine di Forza decrescente.', plus: 'E la prima carta entra con −1 Forza.', flavor: 'Prima i grossi, finché sei fresco.' });
d({ id: 'avanguardia', name: 'Avanguardia', family: 'rito', rarity: 'C', text: 'Scegli un seme: le sue carte entrano per prime.', plus: 'E la prima carta entra con −1 Forza.', needsSeme: true, flavor: 'Avanti voi.' });
d({ id: 'retroguardia', name: 'Retroguardia', family: 'rito', rarity: 'C', text: 'Scegli un seme: le sue carte entrano per ultime.', plus: 'E la prima carta entra con −1 Forza.', needsSeme: true, flavor: 'Voi aspettate.' });
d({ id: 'raggruppa', name: 'Raggruppa', family: 'rito', rarity: 'NC', text: 'Le carte dello stesso seme entrano una dopo l’altra.', plus: 'E la prima carta entra con −1 Forza.', pack: 'antichi', flavor: 'Ognuno con i suoi.' });
d({ id: 'alternanza', name: 'Alternanza', family: 'rito', rarity: 'NC', text: 'Alterna la più forte e la più debole rimaste.', plus: 'E la prima carta entra con −1 Forza.', pack: 'antichi', flavor: 'Uno grosso, uno piccolo.' });
d({ id: 'riserva', name: 'Riserva', family: 'rito', rarity: 'NC', text: 'La carta più forte della pescata non entra: torna in fondo al mazzo con Rancore +1.', plus: 'E la prima carta entra con −1 Forza.', flavor: 'Tu no. Tu dopo.' });
d({ id: 'cadenzato', name: 'Passo Cadenzato', family: 'rito', rarity: 'R', text: "Dopo ogni ingresso, un tick senza ingresso.", plus: 'E la prima carta entra con −1 Forza.', pack: 'antichi', flavor: 'Uno, due. Uno, due.' });

export const ALL_DEFENSE_IDS = Object.keys(DEFENSES);

export interface PackDef { id: string; name: string; cost: number; text: string }
export const PACKS: PackDef[] = [
  { id: 'ferri', name: 'Ferri del mestiere', cost: 15, text: 'Trappola per Lupi, Moneta Falsa, Catena, Malocchio, Corno, Specchio' },
  { id: 'segnate', name: 'Carte segnate', cost: 25, text: "Contrabbando, Segnare, Censura, Pescata Avara, Mazzo Truccato, Rogo dell'Archivio" },
  { id: 'antichi', name: 'Riti antichi', cost: 35, text: 'Raggruppa, Alternanza, Passo Cadenzato, Pozzo, Campana a Morto' },
];
