// Hash di TUTTO lo stato della battaglia, maschera del terreno compresa (13 §2 L2, replay d'oro).
// Visita lo stato in modo generico (chiavi in ordine alfabetico, campi undefined saltati), così un campo nuovo
// nei tipi entra nell'hash da solo. I numeri entrano con tutti i loro bit (niente arrotondamenti): due stati
// con hash uguale sono davvero uguali. Due accumulatori a 32 bit → 16 cifre esadecimali.

const F64 = new Float64Array(1);
const U32 = new Uint32Array(F64.buffer);

class Hasher {
  a = 2166136261 >>> 0;
  b = 0x9747b28c >>> 0;
  parola(x: number): void {
    this.a = Math.imul(this.a ^ x, 16777619) >>> 0;
    let k = Math.imul(x, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    this.b = (Math.imul(this.b ^ Math.imul(k, 0x1b873593), 5) + 0xe6546b64) >>> 0;
    this.b = ((this.b << 13) | (this.b >>> 19)) >>> 0;
  }
  numero(n: number): void {
    if (n === 0) n = 0; // −0 e 0 sono lo stesso numero
    if (n !== n) { this.parola(0x7ff80000); this.parola(1); return; } // NaN
    F64[0] = n;
    this.parola(U32[0]); this.parola(U32[1]);
  }
  testo(s: string): void {
    this.parola(s.length);
    for (let i = 0; i < s.length; i++) this.parola(s.charCodeAt(i));
  }
  byte(v: Uint8Array): void {
    this.parola(v.length);
    const parole = v.length >>> 2;
    if (v.byteOffset % 4 === 0) {
      const u = new Uint32Array(v.buffer, v.byteOffset, parole);
      // ciclo stretto: la maschera è 2 MB
      let a = this.a, b = this.b;
      for (let i = 0; i < parole; i++) {
        const x = u[i];
        a = Math.imul(a ^ x, 16777619);
        b = Math.imul(b ^ x, 0x5bd1e995);
        b ^= b >>> 15;
      }
      this.a = a >>> 0; this.b = b >>> 0;
      for (let i = parole * 4; i < v.length; i++) this.parola(v[i]);
    } else {
      for (let i = 0; i < v.length; i++) this.parola(v[i]);
    }
  }
  valore(x: unknown): void {
    switch (typeof x) {
      case 'number': this.parola(1); this.numero(x); return;
      case 'string': this.parola(2); this.testo(x); return;
      case 'boolean': this.parola(x ? 3 : 4); return;
      case 'undefined': this.parola(5); return;
      default: break;
    }
    if (x === null) { this.parola(6); return; }
    if (x instanceof Uint8Array) { this.parola(7); this.byte(x); return; }
    if (Array.isArray(x)) {
      this.parola(8); this.parola(x.length);
      for (const e of x) this.valore(e);
      return;
    }
    if (typeof x === 'object') {
      this.parola(9);
      const o = x as Record<string, unknown>;
      const chiavi = Object.keys(o).filter((k) => o[k] !== undefined).sort();
      this.parola(chiavi.length);
      for (const k of chiavi) { this.testo(k); this.valore(o[k]); }
      return;
    }
    this.parola(10);
  }
  esadecimale(): string {
    return (this.a >>> 0).toString(16).padStart(8, '0') + (this.b >>> 0).toString(16).padStart(8, '0');
  }
}

export function hashDi(x: unknown): string {
  const h = new Hasher();
  h.valore(x);
  return h.esadecimale();
}
