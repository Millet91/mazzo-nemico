// Tabella trigonometrica a 0,5° (00 §1.2: niente Math.sin/Math.cos nella simulazione).
// I valori si calcolano con la serie di Taylor usando solo + − × ÷, che IEEE 754 rende identici su ogni
// motore JS (Node, WebView Android): così il replay dà lo stesso hash ovunque. Math.sqrt è ammesso
// (è arrotondato correttamente per standard); Math.atan2, Math.hypot, Math.pow, Math.exp NO.
//
// Convenzione degli angoli: in MEZZI GRADI interi, 0..719. 0 = verso destra, 180 (90°) = verso l'alto,
// 360 (180°) = verso sinistra. Lo schermo ha la y che cresce verso il basso, quindi un proiettile sparato
// con angolo a ha velocità (cos(a)·v, −sin(a)·v).
// Contratto congelato dal Lead (M1).

export const MEZZI_GRADI_GIRO = 720;

function senoTaylor(x: number): number {
  // x in [−π/2, π/2]: 12 termini bastano per la precisione double
  let termine = x;
  let somma = x;
  const x2 = x * x;
  for (let n = 1; n < 12; n++) {
    termine = (-termine * x2) / ((2 * n) * (2 * n + 1));
    somma += termine;
  }
  return somma;
}

const PI = 3.141592653589793;
const SENI = new Float64Array(MEZZI_GRADI_GIRO);
for (let i = 0; i < MEZZI_GRADI_GIRO; i++) {
  // riduzione a [−90°, 90°] con le simmetrie del seno, in mezzi gradi interi (esatta)
  let a = i; // 0..719
  let segno = 1;
  if (a >= 360) { a -= 360; segno = -1; }      // sin(x+180°) = −sin(x)
  if (a > 180) a = 360 - a;                    // sin(180°−x) = sin(x)
  SENI[i] = segno * senoTaylor((a * PI) / 360);
}
SENI[0] = 0; SENI[180] = 1; SENI[360] = 0; SENI[540] = -1;

/** Porta un angolo in mezzi gradi in 0..719 (accetta negativi e valori grandi). */
export function normalizza(mezziGradi: number): number {
  const a = Math.round(mezziGradi) % MEZZI_GRADI_GIRO;
  return a < 0 ? a + MEZZI_GRADI_GIRO : a;
}

export function seno(mezziGradi: number): number {
  return SENI[normalizza(mezziGradi)];
}

export function coseno(mezziGradi: number): number {
  return SENI[normalizza(mezziGradi + 180)];
}

/** Gradi (anche con decimali, per la UI) → mezzi gradi interi della simulazione. */
export function daGradi(gradi: number): number {
  return normalizza(gradi * 2);
}

/** Mezzi gradi → gradi per mostrarli nella UI. */
export function inGradi(mezziGradi: number): number {
  return normalizza(mezziGradi) / 2;
}
