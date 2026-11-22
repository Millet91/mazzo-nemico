// Foglio di contatto del pirata a pezzi: tutte le pose, ferme, per guardarle e fotografarle (vedi index.html).
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { IdCiurma } from '../../../src/core/tipi';
import { PezziPirata } from '../../../src/battaglia/render/pirata-rig';
import { bersaglio, risolvi, type ArmaPosa, type StatoPosa } from '../../../src/battaglia/render/pirata-posa';

const q = new URLSearchParams(location.search);
const scala = Number(q.get('scala') ?? 4);
const tempo = Number(q.get('tempo') ?? 0);
const CIURME: IdCiurma[] = ['teschio', 'gelo', 'oro', 'marea', 'marina'];

const base: StatoPosa = {
  mossa: 'fermo', ciurma: 'teschio', cammino: 0, salita: 0, tempo, daMs: 1000, sfasa: 0, mira: null,
  sparo: -1, colpito: -1, atterrato: -1, sbalzato: false, suolo: true, ko: false, morte: -1, annegato: false,
};
const mira = (gradi: number, potenza: number, arma: ArmaPosa) => ({ alzo: (gradi * Math.PI) / 180, potenza, arma });

type Cella = [string, Partial<StatoPosa>];
const POSE: Cella[] = [
  ['riposo', {}],
  // le 6 foto della QA: una ogni 150 ms a 60 px/s = 9 px
  ...[0, 9, 18, 27, 36, 45].map((c, i): Cella => [`passo ${i + 1}`, { mossa: 'passo', cammino: c }]),
  ...[0, 7, 14, 21].map((c, i): Cella => [`corsa ${i + 1}`, { mossa: 'corsa', cammino: c }]),
  ['frenata', { mossa: 'frenata' }],
  ['stacco', { mossa: 'salto', daMs: 20, suolo: false }],
  ['salto', { mossa: 'salto', suolo: false }],
  ['caduta', { mossa: 'caduta', daMs: 100, suolo: false }],
  ['caduta lunga', { mossa: 'caduta', daMs: 900, tempo: tempo + 130, suolo: false }],
  ['atterra', { atterrato: 40 }],
  ['colpito', { colpito: 40 }],
  ['sbalzato', { mossa: 'aTerra', suolo: false }],
  ['steso', { mossa: 'aTerra' }],
  ['a 0 PV', { ko: true }],
  ['cannone 35°', { mira: mira(35, 0.6, 'cannone') }],
  ['cannone 80°', { mira: mira(80, 1, 'cannone') }],
  ['cannone giù', { mira: mira(-30, 0.2, 'cannone') }],
  ['rinculo', { mira: mira(35, 0.6, 'cannone'), sparo: 30 }],
  ['pistola', { mira: mira(10, 0.5, 'pistola') }],
  ['granata', { mira: mira(50, 0.8, 'granata') }],
  ['lancio', { mira: mira(50, 0.8, 'granata'), sparo: 100 }],
  ['sciabola', { mira: mira(0, 0.5, 'sciabola') }],
  ['fendente', { mira: mira(0, 0.5, 'sciabola'), sparo: 140 }],
  ['passo armato', { mossa: 'passo', cammino: 9, mira: mira(35, 0.6, 'cannone') }],
  ['scala 1', { mossa: 'scala', salita: 4, suolo: false }],
  ['scala 2', { mossa: 'scala', salita: 12, suolo: false }],
  ['scala e mira', { mossa: 'scala', salita: 4, suolo: false, mira: mira(20, 0.5, 'pistola') }],
  ['liana 1', { mossa: 'liana', salita: 4, suolo: false }],
  ['liana 2', { mossa: 'liana', salita: 12, suolo: false }],
  ['scavalco', { mossa: 'scavalco', daMs: 90 }],
  ['scivolata', { mossa: 'scivolata' }],
  ['bordo', { mossa: 'bordo', suolo: false }],
  ['morte', { morte: 0.35 }],
  ['annegato', { morte: 0.3, annegato: true }],
];
const CONFRONTO: Cella[] = [POSE[0], POSE[2], POSE[4], POSE[8], POSE[13], POSE[20], POSE[26], POSE[29], POSE[33], POSE[19]];

const app = new Application();
const ciurme = q.has('tutte') ? CIURME : [(q.get('ciurma') ?? 'teschio') as IdCiurma];
const pose = q.has('tutte') ? CONFRONTO : POSE;
const PER_RIGA = q.has('tutte') ? pose.length : 12;
const LW = 36, LH = 58;
const righe = q.has('tutte') ? ciurme.length : Math.ceil(pose.length / PER_RIGA);
await app.init({ width: PER_RIGA * LW * scala, height: righe * LH * scala, background: '#6EC6F0', resolution: 2, autoDensity: true, antialias: true });
document.body.appendChild(app.canvas);
const pezzi = new PezziPirata(app.renderer);
const mondo = new Container();
mondo.scale.set(scala);
app.stage.addChild(mondo);
const sfondo = new Graphics();
mondo.addChild(sfondo);

ciurme.forEach((ciurma, r) => pose.forEach(([nome, stato], i) => {
  const col = i % PER_RIGA, riga = q.has('tutte') ? r : Math.floor(i / PER_RIGA);
  const x = col * LW + LW / 2, y = riga * LH + LH - 10;
  // mezzo cielo, mezzo terreno: il contorno bianco deve leggersi su tutti e due
  sfondo.rect(col * LW, riga * LH, LW, LH).fill((col + riga) % 2 ? 0x8a5a3a : 0x6ec6f0);
  sfondo.rect(col * LW, y, LW, 10).fill(0x5a3b28);
  const st: StatoPosa = { ...base, ciurma, sfasa: 2, ...stato };
  const rig = pezzi.pupazzo(ciurma);
  rig.applica(risolvi(bersaglio(st), st.mira?.arma ?? null), q.has('sinistra') ? -1 : 1, st.mira?.arma ?? null, st.suolo);
  rig.radice.position.set(x, y);
  mondo.addChild(rig.radice);
  const t = new Text({ text: nome, style: { fontFamily: 'sans-serif', fontSize: 11, fill: 0xffffff, stroke: { color: 0x000000, width: 3 } }, resolution: 2 });
  t.anchor.set(0.5, 0);
  t.position.set(x * scala, (riga * LH + 1) * scala);
  app.stage.addChild(t);
}));
if (q.has('sagoma')) ciurme.forEach((c, r) => { const s = pezzi.sagoma(c); s.position.set(LW / 2, r * LH + LH - 10); s.scale.set(0.5); mondo.addChild(s); });
(window as unknown as { pronto: boolean }).pronto = true;
