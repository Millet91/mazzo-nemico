import { generaMappa } from '../../../src/battaglia/gen';
import { superficie } from '../../../src/battaglia/gen/analisi';
const s = Number(process.argv[2]);
const m = generaMappa({ seme: s, bioma: 'isola', piratiPerLato: [5, 5] });
const sup = superficie(m.terreno.maschera);
console.log('spec', m.specchiata, 'spawn0', JSON.stringify(m.spawn[0]), 'spawn1', JSON.stringify(m.spawn[1]));
console.log('appigli', JSON.stringify(m.appigli), 'barili', JSON.stringify(m.barili));
console.log('decor', JSON.stringify(m.decorazioni.map(d=>[d.tipo,d.x,d.y])));
let r = ''; for (let x = 0; x < 2048; x += 16) r += `${x}:${sup[x]} `; console.log(r);
