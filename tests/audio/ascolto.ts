// BANCO D'ASCOLTO: `npx tsx tests/audio/ascolto.ts` (non è un test, serve a sentire i suoni senza il telefono).
// Impacchetta il motore con esbuild, lo fa girare in Chromium senza schermo e scrive in test-results/audio/:
//   suoni/<id>_<variante>.wav   ogni suono del registro
//   battaglia.wav               40 s di battaglia finta (tests/audio/copione.ts) con musica, mare ed effetti
//   menu.wav                    20 s della musica del menu
//   livelli.txt                 tabella dei livelli, per tarare i volumi del registro
// Con PW_CHROME=/opt/pw-browsers/chromium si usa un Chromium già installato.
import { mkdirSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import type { Misura } from './ascolto-pagina';

const USCITA = 'test-results/audio';

function wav(canali: Float32Array[], freq: number): Buffer {
  const n = canali[0].length, c = canali.length;
  const b = Buffer.alloc(44 + n * c * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * c * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(c, 22); b.writeUInt32LE(freq, 24); b.writeUInt32LE(freq * c * 2, 28);
  b.writeUInt16LE(c * 2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * c * 2, 40);
  for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, canali[k][i])) * 32767), 44 + (i * c + k) * 2);
  return b;
}

async function main(): Promise<void> {
  mkdirSync(`${USCITA}/suoni`, { recursive: true });
  const pacco = await build({ entryPoints: ['tests/audio/ascolto-pagina.ts'], bundle: true, write: false, format: 'iife', target: 'es2022', logLevel: 'silent' });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
  const pagina = await browser.newPage();
  pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[pagina]', m.text()); });
  await pagina.goto('about:blank');
  await pagina.addScriptTag({ content: pacco.outputFiles[0].text });

  const t0 = Date.now();
  const { misure, dati } = await pagina.evaluate(() => (window as unknown as { banco: { tuttiISuoni(): Promise<{ misure: Misura[]; dati: Record<string, number[]> }> } }).banco.tuttiISuoni());
  const msSintesi = Date.now() - t0;
  for (const [nome, d] of Object.entries(dati)) writeFileSync(`${USCITA}/suoni/${nome}.wav`, wav([Float32Array.from(d)], 32000));

  const righe = [`${misure.length} suoni sintetizzati in ${msSintesi} ms (compreso il passaggio dei dati) · ${misure.reduce((s, m) => s + m.durata, 0).toFixed(1)} s in tutto`,
    '', 'id'.padEnd(28) + 'canale   dur   vol   forte(dB)  nel mix(dB)  rms(dB)  centro(Hz)'];
  for (const m of misure) {
    const nelMix = m.fortiDb + 20 * Math.log10(m.volume);
    righe.push(`${(m.id + '_' + m.variante).padEnd(28)}${m.canale.padEnd(8)} ${m.durata.toFixed(2)}  ${m.volume.toFixed(2)}  ${m.fortiDb.toFixed(1).padStart(8)}  ${nelMix.toFixed(1).padStart(10)}  ${m.rmsDb.toFixed(1).padStart(7)}  ${String(m.centroideHz).padStart(8)}`);
  }

  type Scena = { sinistra: number[]; destra: number[]; misura: { picco: number; rmsDb: number; fortiDb: number }; suoni: string[]; msCalcolo: number };
  for (const [nome, brano, secondi, copione] of [['battaglia', 'battaglia', 40, true], ['menu', 'menu', 20, false]] as const) {
    const s = await pagina.evaluate(([b, sec, c]) => (window as unknown as { banco: { scena(b: string, s: number, c: boolean): Promise<Scena> } }).banco.scena(b, sec, c), [brano, secondi, copione] as const);
    writeFileSync(`${USCITA}/${nome}.wav`, wav([Float32Array.from(s.sinistra), Float32Array.from(s.destra)], 44100));
    righe.push('', `${nome}.wav: picco ${s.misura.picco.toFixed(3)} · rms ${s.misura.rmsDb.toFixed(1)} dB · tratto più forte ${s.misura.fortiDb.toFixed(1)} dB · ${s.suoni.length} suoni · calcolata in ${Math.round(s.msCalcolo)} ms (${(s.msCalcolo / secondi / 10).toFixed(1)}% di un processore se fosse dal vivo)`);
    if (s.suoni.length) righe.push('  ' + s.suoni.join(' '));
  }
  const note = await pagina.evaluate(() => (window as unknown as { banco: { note(): { quante: number; byte: number } } }).banco.note());
  righe.push('', `note della musica pronte: ${note.quante}, ${(note.byte / 1024 / 1024).toFixed(1)} MB`);
  writeFileSync(`${USCITA}/livelli.txt`, righe.join('\n') + '\n');
  console.log(righe.join('\n'));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
