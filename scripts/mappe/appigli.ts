// Controlla gli appigli della forma sulla maschera: cima alla quota del piano entro 14 px, fondo sul suolo.
//   npx tsx scripts/mappe/appigli.ts
import { MATERIALE } from '../../src/core/tipi';
import { costruisciMaschera, W, appigliDi } from './cala-pappagallo-forma';

const { m } = costruisciMaschera();
const pieno = (x: number, y: number) => m[y * W + x] !== MATERIALE.aria;
for (const a of appigliDi(m)) {
  // piano in cima: colonna più vicina all'asse con suolo esattamente a yAlto (pieno sotto, aria sopra)
  let bordo = -1;
  for (let d = 0; d <= 14 && bordo < 0; d++) for (const x of [a.x - d, a.x + d]) if (pieno(x, a.yAlto) && !pieno(x, a.yAlto - 1)) { bordo = d; break; }
  let suolo = a.yAlto + 1; while (suolo < 1000 && !pieno(a.x, suolo)) suolo++;
  let asseLibero = true;
  for (let y = a.yAlto; y < a.yBasso; y++) if (pieno(a.x, y)) asseLibero = false;
  console.log(`${a.tipo} x ${a.x}: lungo ${a.yBasso - a.yAlto}, piano a ${bordo} px, suolo sotto a ${suolo} (yBasso ${a.yBasso}), asse ${asseLibero ? 'libero' : 'NEL SOLIDO'}`);
}
