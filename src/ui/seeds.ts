// Seed leggibili (Marketing): PAROLA-PAROLA-NN, facili da dettare e condividere.
declare const __BUILD__: string;
export const BUILD: string = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';

const A = ['LUPO', 'VOLPE', 'GAZZA', 'CORVO', 'MULO', 'TOPO', 'GATTO', 'STREGA', 'PRETE', 'COMARE', 'BRIGANTE', 'NEBBIA', 'BRACE', 'CAMPANA', 'LANTERNA', 'FALCE'];
const B = ['POZZO', 'MULINO', 'PORTICO', 'CROCEVIA', 'CORTILE', 'FIUME', 'SAGRATO', 'GRANAIO', 'FIENILE', 'FORNO', 'PONTE', 'VIGNA', 'BOSCO', 'CAMINO', 'ORTO', 'MERCATO'];

export function readableSeed(rand: () => number = Math.random): string {
  const p = (arr: string[]) => arr[Math.floor(rand() * arr.length)];
  return `${p(A)}-${p(B)}-${String(Math.floor(rand() * 90) + 10)}`;
}

/** Lo stesso seed per tutti nella stessa settimana (lunedì-domenica). */
export function weeklySeed(d = new Date()): string {
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  let x = Math.floor(monday.getTime() / 86400000) >>> 0;
  const rand = () => { x = (Math.imul(x ^ (x >>> 15), 2246822507) + 0x9e3779b9) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  return readableSeed(rand);
}
