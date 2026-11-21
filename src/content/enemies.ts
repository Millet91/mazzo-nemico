// Carte nemiche (GDD §5.1). Valori identici al simulatore di design.
// Le keyword sono id di sistema; il testo visibile viene da KEYWORDS (generato dai parametri).

export type Seme = 'Bastoni' | 'Coppe' | 'Spade' | 'Denari' | 'Neutra' | 'Mazziere';
export const SEMI: Seme[] = ['Bastoni', 'Coppe', 'Spade', 'Denari'];

export type Kw =
  | 'sciame' | 'corazza' | 'ladro' | 'silenzio' | 'araldo' | 'rapido' | 'lento' | 'tenace' | 'ritorno'
  | 'esplosivo' | 'sobilla' | 'branco' | 'ingordo' | 'spinta' | 'etereo' | 'velo' | 'lamento' | 'forgia'
  | 'stonatura' | 'riscossione' | 'esazione' | 'richiamo' | 'fretta' | 'profezia' | 'furia' | 'innocua'
  | 'corvi' | 'imitatore';

export type Tier = 'n' | 'e' | 'b' | 't'; // normale, élite, Mazziere, gettone

/** Abilità "girate" dei Patti (GDD §5.1, colonna Girata). */
export type Girata =
  | 'morso' | 'morso2' | 'copiaTua' | 'staffetta' | 'ingordoAlleato' | 'lento' | 'ritornoAlleato' | 'divora'
  | 'barile' | 'borseggio' | 'falsoAnnuncio' | 'sobillaAlleato' | 'carica' | 'purifica' | 'nebbia' | 'prefica'
  | 'lentoCura2' | 'scardina' | 'campana' | 'creditori' | 'esattore' | 'orologio' | 'profeta' | 'none';

export interface EnemyDef {
  id: string;
  name: string;
  seme: Seme;
  forza: number;
  kw: Partial<Record<Kw, number>>;
  act: 0 | 1 | 2 | 3;
  tier: Tier;
  girata: Girata;
  girataText: string;
  role: string;
  flavor: string;
}

const MORSO = 'Morso: a ogni tick, −1 Forza alla carta nemica nel Passo davanti.';

export const ENEMIES: Record<string, EnemyDef> = {};
function e(d: EnemyDef) {
  ENEMIES[d.id] = d;
}

// ---------------- Atto I · Vespro
e({ id: 'topi', name: 'I Topi del Granaio', seme: 'Bastoni', forza: 1, kw: { sciame: 1 }, act: 1, tier: 'n', girata: 'copiaTua', girataText: 'Anche la Copia è tua.', role: 'Riempie la Fila, insegna lo Sciame', flavor: 'Dove ne vedi uno, ce ne sono due.' });
e({ id: 'lupo', name: 'Il Lupo', seme: 'Bastoni', forza: 3, kw: {}, act: 1, tier: 'n', girata: 'morso', girataText: MORSO, role: 'Il nemico base', flavor: 'Il lupo perde il pelo, ma non la strada di casa.' });
e({ id: 'volpe', name: 'La Volpe Bianca', seme: 'Bastoni', forza: 2, kw: { rapido: 1 }, act: 1, tier: 'n', girata: 'staffetta', girataText: 'Staffetta: quando entra, la prima carta nemica della Coda va in fondo alla Coda.', role: 'Salta i Segni', flavor: 'Bianca come la neve, svelta come la paura.' });
e({ id: 'ingordo', name: "L'Ingordo", seme: 'Bastoni', forza: 1, kw: { ingordo: 1 }, act: 1, tier: 'n', girata: 'ingordoAlleato', girataText: 'Quando entra, toglie le Scartine dalla Coda e cura 1 Lume per ciascuna.', role: 'Contraccolpo delle Scartine', flavor: 'Mangia tutto, anche gli avanzi del Fato.' });
e({ id: 'mulo', name: 'Il Mulo Ostinato', seme: 'Bastoni', forza: 4, kw: { corazza: 1, lento: 1 }, act: 1, tier: 'n', girata: 'lento', girataText: 'Resta Lento: chi è dietro aspetta e prende più colpi.', role: 'Crea ingorghi, insegna la Corazza', flavor: 'Non si sposta. Poi si sposta.' });
e({ id: 'affogata', name: "L'Affogata", seme: 'Coppe', forza: 2, kw: { ritorno: 1 }, act: 1, tier: 'n', girata: 'ritornoAlleato', girataText: 'Ritorno: la prima volta che fa Impatto torna in fondo alla Coda e cura di nuovo.', role: 'Uccidere non basta', flavor: 'Il fiume restituisce sempre quello che prende.' });
e({ id: 'bocca', name: 'La Bocca del Pozzo', seme: 'Coppe', forza: 2, kw: { silenzio: 1, rapido: 1 }, act: 1, tier: 'n', girata: 'divora', girataText: 'Divora: una volta per ondata, quando entra, distrugge la carta nemica davanti se ha Forza ≤ 3.', role: 'Zittisce i Segni', flavor: 'Chi guarda dentro, non si sente più.' });
e({ id: 'falce', name: 'La Falce Sola', seme: 'Spade', forza: 3, kw: { corazza: 1 }, act: 1, tier: 'n', girata: 'morso', girataText: 'Falciata: a ogni tick −1 alla carta nemica davanti.', role: 'Insegna Spina e ordine dei Segni', flavor: 'Nessuno la impugna. Taglia lo stesso.' });
e({ id: 'barile', name: 'Il Barile di Polvere', seme: 'Spade', forza: 2, kw: { esplosivo: 2 }, act: 1, tier: 'n', girata: 'barile', girataText: "Quando arriva all'Uscio, −2 a tutte le carte nemiche in Fila.", role: 'Va distrutto presto', flavor: 'Basta una scintilla, e non è mai la tua.' });
e({ id: 'gazza', name: 'La Gazza', seme: 'Denari', forza: 2, kw: { ladro: 1 }, act: 1, tier: 'n', girata: 'borseggio', girataText: "Borseggio: all'Impatto dà 4 Spiccioli invece di curare.", role: 'Ciò che passa costa', flavor: 'Quel che luccica, vola via.' });
e({ id: 'banditore', name: 'Il Banditore', seme: 'Denari', forza: 1, kw: { araldo: 1 }, act: 1, tier: 'n', girata: 'falsoAnnuncio', girataText: 'Falso annuncio: quando entra, la prima carta nemica della Coda torna in fondo al mazzo.', role: 'Accelera la pescata, rompe i Riti', flavor: 'Udite, udite: arriva altra gente.' });
e({ id: 'sobillatore', name: 'Il Sobillatore', seme: 'Denari', forza: 1, kw: { sobilla: 2 }, act: 1, tier: 'n', girata: 'sobillaAlleato', girataText: 'Quando entra, la prima carta nemica della Coda perde 2 Forza.', role: 'Ucciderlo ha un costo', flavor: 'Muore gridando, e qualcuno lo ascolta.' });

// ---------------- Atto II · Mezzanotte
e({ id: 'branco', name: 'Il Branco', seme: 'Bastoni', forza: 2, kw: { branco: 2 }, act: 2, tier: 'n', girata: 'morso', girataText: MORSO, role: 'Punisce Raggruppa sui Bastoni', flavor: 'Da soli sono cani. Insieme, no.' });
e({ id: 'cinghiale', name: 'Il Cinghiale', seme: 'Bastoni', forza: 4, kw: { spinta: 1 }, act: 2, tier: 'n', girata: 'carica', girataText: 'Quando entra, −3 alla carta nemica nella Strada.', role: 'Rompe i tempi dei Segni', flavor: 'Non gira intorno alle cose.' });
e({ id: 'lamento', name: 'Il Lamento', seme: 'Coppe', forza: 2, kw: { etereo: 1 }, act: 2, tier: 'n', girata: 'purifica', girataText: 'Le carte nemiche nei Passi adiacenti perdono Etereo e Rapido.', role: 'Rende inutili i Segni da 1', flavor: 'Lo senti, ma non lo tocchi.' });
e({ id: 'nebbia', name: 'La Nebbia', seme: 'Coppe', forza: 3, kw: { velo: 1 }, act: 2, tier: 'n', girata: 'nebbia', girataText: 'Quando entra, le prime 4 carte della Coda diventano visibili.', role: 'Protegge la carta dietro', flavor: 'Nasconde chi la segue.' });
e({ id: 'prefica', name: 'La Prefica', seme: 'Coppe', forza: 3, kw: { lamento: 1 }, act: 2, tier: 'n', girata: 'prefica', girataText: 'Quando entra, −1 a tutte le carte nemiche in Fila.', role: 'Bersaglio prioritario', flavor: 'Piange per tutti, e tutti si fanno forza.' });
e({ id: 'carro', name: 'Il Carro senza Cavalli', seme: 'Spade', forza: 5, kw: { corazza: 1, lento: 1 }, act: 2, tier: 'n', girata: 'lentoCura2', girataText: "Lento, e all'Impatto cura 2.", role: 'Muro di Forza', flavor: 'Cigola anche quando è fermo.' });
e({ id: 'incudine', name: "L'Incudine", seme: 'Spade', forza: 2, kw: { forgia: 1 }, act: 2, tier: 'n', girata: 'scardina', girataText: 'A ogni tick toglie 1 Corazza alla carta nemica davanti.', role: 'Supporto da eliminare per primo', flavor: 'Batte il ferro finché è caldo.' });
e({ id: 'campana', name: 'La Campana Rotta', seme: 'Spade', forza: 3, kw: { stonatura: 1 }, act: 2, tier: 'n', girata: 'campana', girataText: 'Finché è in Fila, i tuoi Segni fanno +1 danno.', role: 'Indebolisce tutta la tua macchina', flavor: 'Suona storto, e storto va tutto.' });
e({ id: 'processione', name: 'La Processione', seme: 'Denari', forza: 1, kw: { sciame: 1, tenace: 1 }, act: 2, tier: 'n', girata: 'copiaTua', girataText: 'Anche la Copia è tua.', role: 'Sciame resistente', flavor: 'Uno dietro l’altro, fino in fondo.' });
e({ id: 'creditori', name: 'I Creditori', seme: 'Denari', forza: 2, kw: { riscossione: 1 }, act: 2, tier: 'n', girata: 'creditori', girataText: "All'Impatto, +1 Spicciolo ogni 10 che hai (max +3).", role: 'Punisce chi accumula', flavor: 'Sanno quanto hai. Sempre.' });
e({ id: 'esattore', name: "L'Esattore", seme: 'Denari', forza: 3, kw: { esazione: 5 }, act: 2, tier: 'n', girata: 'esattore', girataText: "All'Impatto, +5 Spiccioli.", role: "Colpisce l'economia", flavor: 'Bussa una volta sola.' });

// ---------------- Atto III · Ora Morta
e({ id: 'mannaro', name: 'Il Lupo Mannaro', seme: 'Bastoni', forza: 5, kw: { tenace: 1, rapido: 1 }, act: 3, tier: 'n', girata: 'morso2', girataText: 'Morso 2: a ogni tick, −2 alla carta nemica davanti.', role: 'Forte, sfuggente, chiede Gelo', flavor: 'Di giorno ti saluta in piazza.' });
e({ id: 'morto', name: 'Il Morto che Parla', seme: 'Coppe', forza: 4, kw: { richiamo: 1 }, act: 3, tier: 'n', girata: 'morso', girataText: MORSO, role: 'Fa tornare i caduti', flavor: 'Chiama per nome chi è appena caduto.' });
e({ id: 'fatuo', name: 'Il Fuoco Fatuo', seme: 'Coppe', forza: 2, kw: { rapido: 1, etereo: 1 }, act: 3, tier: 'n', girata: 'morso', girataText: MORSO, role: 'Sfugge ai Segni deboli', flavor: 'Seguilo, se hai fretta di perderti.' });
e({ id: 'macina', name: 'La Macina', seme: 'Spade', forza: 6, kw: { corazza: 2, lento: 1 }, act: 3, tier: 'n', girata: 'lentoCura2', girataText: "Lenta, e all'Impatto cura 2.", role: 'Muro finale', flavor: 'Gira piano. Gira sempre.' });
e({ id: 'orologio', name: "L'Orologio del Campanile", seme: 'Spade', forza: 3, kw: { fretta: 1 }, act: 3, tier: 'n', girata: 'orologio', girataText: 'Le carte nemiche dietro di lui sono Lente.', role: 'Rompe il tempo', flavor: 'Batte le ore che non ci sono.' });
e({ id: 'profeta', name: 'Il Profeta', seme: 'Denari', forza: 2, kw: { profezia: 1 }, act: 3, tier: 'n', girata: 'profeta', girataText: 'Quando entra, riapplica il tuo Rito alla Coda.', role: 'Counter dei Riti', flavor: 'L’aveva detto. Lo dice sempre.' });
e({ id: 'folla', name: 'La Folla Inferocita', seme: 'Denari', forza: 1, kw: { furia: 1 }, act: 3, tier: 'n', girata: 'morso', girataText: MORSO, role: 'Punisce il massacro dei Denari', flavor: 'Più ne cadono, più ne arrivano.' });

// ---------------- Élite
e({ id: 'spaventapasseri', name: 'Lo Spaventapasseri', seme: 'Bastoni', forza: 6, kw: { corazza: 2, corvi: 2 }, act: 0, tier: 'e', girata: 'none', girataText: '', role: 'Élite del Vespro', flavor: 'Non spaventa i passeri. Li comanda.' });
e({ id: 'brigante', name: 'Il Brigante', seme: 'Denari', forza: 8, kw: { ladro: 1, tenace: 1 }, act: 0, tier: 'e', girata: 'none', girataText: '', role: 'Élite di Mezzanotte', flavor: 'O la borsa, o il Segno.' });
e({ id: 'strega', name: 'La Strega del Lago', seme: 'Coppe', forza: 7, kw: { silenzio: 1, ritorno: 1 }, act: 0, tier: 'e', girata: 'none', girataText: '', role: "Élite dell'Ora Morta", flavor: 'Il lago è calmo perché lei lo vuole.' });

// ---------------- Mazzieri
e({ id: 'sagrestano', name: 'Il Sagrestano', seme: 'Mazziere', forza: 10, kw: { corazza: 1, lento: 1 }, act: 0, tier: 'b', girata: 'none', girataText: '', role: 'Mazziere del Vespro', flavor: 'Ho qui tutto scritto.' });
e({ id: 'forestiero', name: 'Il Forestiero', seme: 'Mazziere', forza: 12, kw: { lento: 1, imitatore: 1 }, act: 0, tier: 'b', girata: 'none', girataText: '', role: 'Mazziere di Mezzanotte', flavor: 'Facciamo a metà?' });
e({ id: 'piena', name: 'La Piena', seme: 'Mazziere', forza: 14, kw: { lento: 1 }, act: 0, tier: 'b', girata: 'none', girataText: '', role: "Mazziere dell'Ora Morta", flavor: 'Il fiume ha smesso di ascoltare.' });

// ---------------- Gettoni
e({ id: 'copia', name: 'Copia', seme: 'Neutra', forza: 1, kw: {}, act: 0, tier: 't', girata: 'none', girataText: '', role: 'Gettone dello Sciame', flavor: '' });
e({ id: 'scartina', name: 'Scartina', seme: 'Neutra', forza: 1, kw: { innocua: 1 }, act: 0, tier: 't', girata: 'none', girataText: '', role: 'Gettone dei Trucchi', flavor: 'Carta da niente.' });
e({ id: 'corvo', name: 'Il Corvo', seme: 'Bastoni', forza: 1, kw: { rapido: 1 }, act: 0, tier: 't', girata: 'none', girataText: '', role: 'Gettone dello Spaventapasseri', flavor: '' });
e({ id: 'disperazione', name: 'Disperazione', seme: 'Neutra', forza: 1, kw: {}, act: 0, tier: 't', girata: 'none', girataText: '', role: 'Mazzo esaurito', flavor: '' });
// solo tutorial (Atto 0)
e({ id: 'topo', name: 'Il Topo', seme: 'Bastoni', forza: 1, kw: {}, act: 0, tier: 'n', girata: 'morso', girataText: MORSO, role: 'Tutorial', flavor: 'Piccolo, ma la porta la trova.' });

export const ELITE_BY_ACT: Record<number, string> = { 1: 'spaventapasseri', 2: 'brigante', 3: 'strega' };
export const BOSS_BY_ACT: Record<number, string> = { 1: 'sagrestano', 2: 'forestiero', 3: 'piena' };

export const NORMAL_BY_ACT: Record<number, string[]> = { 1: [], 2: [], 3: [] };
for (const d of Object.values(ENEMIES)) if (d.tier === 'n' && d.act >= 1) NORMAL_BY_ACT[d.act].push(d.id);

export interface KwInfo { name: string; icon: string; text: (n: number) => string }
export const KEYWORDS: Record<Kw, KwInfo> = {
  sciame: { name: 'Sciame', icon: '❖', text: () => 'Quando entra, una Copia (Forza base, senza Sciame) va in testa alla Coda.' },
  corazza: { name: 'Corazza', icon: '⛨', text: (n) => `${n} cariche: ognuna annulla il prossimo colpo o effetto negativo dei tuoi.` },
  ladro: { name: 'Ladro', icon: '✋', text: () => "All'Impatto ruba il tuo Segno più vicino all'Uscio (senza Segni: 3 Spiccioli)." },
  silenzio: { name: 'Silenzio', icon: '∅', text: () => 'I tuoi Segni nel suo Passo non agiscono.' },
  araldo: { name: 'Araldo', icon: '📯', text: () => 'Quando entra pesca 1 carta e la mette in testa alla Coda (max 2 per ondata).' },
  rapido: { name: 'Rapido', icon: '»', text: () => 'Avanza di 2 se entrambi i Passi davanti sono liberi.' },
  lento: { name: 'Lento', icon: '◔', text: () => 'Avanza un tick sì e uno no, partendo da fermo.' },
  tenace: { name: 'Tenace', icon: '♥', text: () => 'La prima volta che verrebbe distrutta resta a Forza 1.' },
  ritorno: { name: 'Ritorno', icon: '↺', text: () => 'La prima volta che è distrutta torna in fondo alla Coda con la Forza base.' },
  esplosivo: { name: 'Esplosivo', icon: '✸', text: (n) => `Alla morte ${n} danni alle carte adiacenti. All'Impatto +${n}.` },
  sobilla: { name: 'Sobilla', icon: '⇡', text: (n) => `Alla morte la carta nemica davanti guadagna +${n} Forza.` },
  branco: { name: 'Branco', icon: '⋈', text: (n) => `A ogni tick, se la carta davanti è un Bastoni nemico, +1 Forza (max +${n}).` },
  ingordo: { name: 'Ingordo', icon: '◉', text: () => 'Quando entra, +1 Forza per ogni Scartina pescata.' },
  spinta: { name: 'Spinta', icon: '⇥', text: () => 'Quando entra spinge la carta nella Strada nel Cortile, se libero.' },
  etereo: { name: 'Etereo', icon: '≈', text: () => 'Ignora i colpi da esattamente 1.' },
  velo: { name: 'Velo', icon: '☁', text: () => 'La carta subito dietro di lei non può essere colpita dai Segni.' },
  lamento: { name: 'Lamento funebre', icon: '♫', text: () => 'Quando entra, +1 Forza a tutte le carte nemiche in Fila.' },
  forgia: { name: 'Forgia', icon: '⚒', text: () => 'A ogni tick dà Corazza 1 alla carta nemica davanti, se non ne ha.' },
  stonatura: { name: 'Stonatura', icon: '♭', text: () => 'Finché è in Fila i tuoi Segni fanno 1 danno in meno.' },
  riscossione: { name: 'Riscossione', icon: '¢', text: () => 'Quando entra, +1 Forza ogni 10 Spiccioli che hai (max +3).' },
  esazione: { name: 'Esazione', icon: '−¢', text: (n) => `All'Impatto ti toglie ${n} Spiccioli.` },
  richiamo: { name: 'Richiamo', icon: '☊', text: () => "Alla morte rimette in testa alla Coda l'ultima carta nemica distrutta (1 volta)." },
  fretta: { name: 'Fretta', icon: '⏱', text: () => 'Le carte nemiche davanti a lei sono Rapide.' },
  profezia: { name: 'Profezia', icon: '⁂', text: () => 'Quando entra rimescola la Coda: il tuo Rito non vale più.' },
  furia: { name: 'Furia', icon: '✊', text: () => 'Quando entra, +1 Forza per ogni Denari distrutta in questa ondata (max +5).' },
  innocua: { name: 'Innocua', icon: '○', text: () => 'Non fa danno.' },
  corvi: { name: 'Corvi', icon: '🐦', text: (n) => `Alla morte mette ${n} Corvi (1, Rapido) in testa alla Coda.` },
  imitatore: { name: 'Imitatore', icon: '⧉', text: () => 'Quando entra copia le keyword della carta nella Strada.' },
};

export function kwText(kw: Kw, n: number): string {
  const k = KEYWORDS[kw];
  return `${k.name}${n > 1 && ['corazza', 'esplosivo', 'sobilla', 'branco', 'esazione', 'corvi'].includes(kw) ? ' ' + n : ''}: ${k.text(n)}`;
}

/** Testo completo della girata: aggiunge la cura all'Impatto quando la girata non la sostituisce. */
export function girataFull(id: string): string {
  const d = ENEMIES[id];
  if (!d?.girataText) return '';
  const own = ['borseggio', 'creditori', 'esattore', 'lentoCura2', 'ritornoAlleato'].includes(d.girata);
  return own ? d.girataText : `${d.girataText} All'Impatto ti cura 1 Lume.`;
}
