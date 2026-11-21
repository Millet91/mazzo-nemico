// PNG minimo (RGBA 8 bit, senza interlacciamento) per gli script delle mappe: niente dipendenze.
import { deflateSync, inflateSync } from 'node:zlib';

const TAB = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc(b: Uint8Array): number { let c = -1; for (const v of b) c = TAB[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function blocco(tipo: string, dati: Uint8Array): Buffer {
  const t = Buffer.from(tipo, 'ascii');
  const out = Buffer.alloc(12 + dati.length);
  out.writeUInt32BE(dati.length, 0); t.copy(out, 4); Buffer.from(dati).copy(out, 8);
  out.writeUInt32BE(crc(Buffer.concat([t, Buffer.from(dati)])), 8 + dati.length);
  return out;
}
export function scriviPng(w: number, h: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blocco('IHDR', ihdr), blocco('IDAT', deflateSync(raw, { level: 9 })), blocco('IEND', new Uint8Array())]);
}
/** Legge un PNG RGB/RGBA 8 bit (filtri 0-4). */
export function leggiPng(buf: Buffer): { w: number; h: number; rgba: Uint8Array } {
  let p = 8, w = 0, h = 0, tipo = 0; const idat: Buffer[] = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); tipo = d[9]; if (d[8] !== 8) throw new Error('solo 8 bit'); }
    if (t === 'IDAT') idat.push(d);
    p += 12 + n;
  }
  const cpp = tipo === 6 ? 4 : tipo === 2 ? 3 : 0; if (!cpp) throw new Error('solo RGB/RGBA');
  const raw = inflateSync(Buffer.concat(idat)), riga = w * cpp, out = new Uint8Array(w * h * 4);
  let prec = new Uint8Array(riga), cur = new Uint8Array(riga);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (riga + 1)], s = raw.subarray(y * (riga + 1) + 1, (y + 1) * (riga + 1));
    for (let i = 0; i < riga; i++) {
      const a = i >= cpp ? cur[i - cpp] : 0, b = prec[i], c = i >= cpp ? prec[i - cpp] : 0;
      let v = s[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; out[k] = cur[x * cpp]; out[k + 1] = cur[x * cpp + 1]; out[k + 2] = cur[x * cpp + 2]; out[k + 3] = cpp === 4 ? cur[x * cpp + 3] : 255; }
    [prec, cur] = [cur, prec];
  }
  return { w, h, rgba: out };
}
