// Maschera delle mappe fatte a mano compressa a corse (run-length) in base64: valore (1 byte) + lunghezza (2 byte LE).
// Codice puro: lo usano lo script di costruzione e il caricatore (anche nel worker dell'IA e nei test).

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function aBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return s;
}

function daBase64(s: string): Uint8Array {
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((s.length / 4) * 3 - pad);
  for (let i = 0, j = 0; i < s.length; i += 4) {
    const n = (B64.indexOf(s[i]) << 18) | (B64.indexOf(s[i + 1]) << 12) | ((B64.indexOf(s[i + 2]) & 63) << 6) | (B64.indexOf(s[i + 3]) & 63);
    if (j < out.length) out[j++] = (n >> 16) & 255;
    if (j < out.length) out[j++] = (n >> 8) & 255;
    if (j < out.length) out[j++] = n & 255;
  }
  return out;
}

export function codificaMaschera(m: Uint8Array): string {
  const corse: number[] = [];
  for (let i = 0; i < m.length;) {
    const v = m[i];
    let n = 1;
    while (i + n < m.length && m[i + n] === v && n < 65535) n++;
    corse.push(v, n & 255, n >> 8);
    i += n;
  }
  return aBase64(Uint8Array.from(corse));
}

export function decodificaMaschera(s: string, lunghezza: number): Uint8Array {
  const b = daBase64(s);
  const m = new Uint8Array(lunghezza);
  let p = 0;
  for (let i = 0; i + 2 < b.length; i += 3) {
    const n = b[i + 1] | (b[i + 2] << 8);
    m.fill(b[i], p, p + n);
    p += n;
  }
  if (p !== lunghezza) throw new Error(`maschera di ${p} px invece di ${lunghezza}`);
  return m;
}
