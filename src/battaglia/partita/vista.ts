// StatoBattaglia → VistaBattaglia (quello che l'HUD mostra). Funzioni pure, testate senza Pixi.
import type { VistaBattaglia, VistaSquadra } from '../../core/bus';
import type { StatoBattaglia } from '../../core/tipi';
import { inGradi } from '../../core/trig';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { appiglioSotto, appiglioVicino } from '../sim/appigli';
import { avvisoTiro, balzoPossibile } from '../sim';

// L'avviso sul tiro costa una simulazione del colpo: si ricalcola solo quando cambia qualcosa che lo decide.
let chiaveAvviso = '';
let ultimoAvviso: 'vicino' | 'danno' | null = null;
function avviso(s: StatoBattaglia): 'vicino' | 'danno' | undefined {
  const t = s.turno;
  const p = s.pirati.find((x) => x.id === t.pirata);
  if (!p || s.esito || t.fase !== 'azione' || s.squadre[t.squadra].controllo !== 'umano') return undefined;
  // mentre si mira il terreno e gli altri pirati non cambiano: bastano il turno, la mira e dove sta chi tira
  const chiave = `${s.config.seme}|${t.numero}|${t.arma}|${t.mira.mezziGradi}|${t.mira.potenza}|${t.miccia}|${s.vento}|${Math.floor(p.x)}|${Math.floor(p.y)}|${p.aTerra}`;
  if (chiave !== chiaveAvviso) {
    chiaveAvviso = chiave;
    ultimoAvviso = avvisoTiro(s);
  }
  return ultimoAvviso ?? undefined;
}

/**
 * Fase 1: icona del tasto Balzo e tasto "fatto". Solo nel turno del giocatore (all'IA non servono tasti).
 * `balzo` è undefined quando il Balzo non farebbe niente (a metà scavalco, sbalzato in volo): il tasto mostra il salto.
 */
function balzoEFatto(s: StatoBattaglia): Pick<VistaBattaglia, 'balzo' | 'puoFinire'> {
  const t = s.turno;
  // chiavi sempre presenti: visteUguali confronta le chiavi della vista nuova
  if (s.esito || s.squadre[t.squadra].controllo !== 'umano') return { balzo: undefined, puoFinire: false };
  return { balzo: balzoPossibile(s), puoFinire: t.fase === 'fuga' };
}

export function creaVista(s: StatoBattaglia, iaPensa: boolean): VistaBattaglia {
  const t = s.turno;
  const sq = s.squadre[t.squadra];
  const umano = s.squadre.findIndex((x) => x.controllo === 'umano');
  const attivo = s.pirati.find((p) => p.id === t.pirata);
  const arrampicata = !attivo || attivo.stato !== 'vivo' ? 'libero'
    : attivo.appeso >= 0 ? 'appeso'
    // vicino = può aggrapparsi: lungo l'appiglio, oppure dal piano in cima ("scendi" lo porta sull'asse)
    : appiglioVicino(s, attivo.x, attivo.y) || appiglioSotto(s, attivo) ? 'vicino' : 'libero';
  const squadra = (i: 0 | 1): VistaSquadra => {
    const pirati = s.pirati.filter((p) => p.squadra === i);
    const vivi = pirati.filter((p) => p.stato === 'vivo');
    return {
      ciurma: s.squadre[i].ciurma,
      controllo: s.squadre[i].controllo,
      pvTotali: vivi.reduce((a, p) => a + Math.max(0, p.vita), 0),
      pvIniziali: s.squadre[i].pvIniziali,
      vivi: vivi.length,
      iniziali: pirati.length,
    };
  };
  return {
    numeroTurno: t.numero,
    turnoLimite: BIL.battaglia.turnoLimite,
    mareSaleDalTurno: BIL.battaglia.mareSaleDalTurno,
    squadraDiTurno: t.squadra,
    tocca: sq.controllo,
    fase: t.fase,
    secondiRimasti: Math.max(0, Math.ceil(t.tickRimasti / TICK_AL_SECONDO)),
    timerAvviato: t.timerAvviato,
    vento: s.vento,
    ventoMax: BIL.ventoMax[s.config.bioma],
    squadre: [squadra(0), squadra(1)],
    arma: t.arma,
    munizioni: { ...sq.munizioni },
    miccia: t.miccia,
    miraGradi: inGradi(t.mira.mezziGradi),
    potenza: t.mira.potenza,
    iaPensa,
    puoArrendersi: umano >= 0 && s.squadre[umano].ruolo === 'attaccante' && t.numero >= BIL.battaglia.ritirataDalTurno && !s.esito,
    arrampicata,
    avvisoTiro: avviso(s),
    ...balzoEFatto(s),
    esito: s.esito,
  };
}

/** true se le due viste mostrano le stesse cose (per non svegliare l'HUD a ogni frame). */
export function visteUguali(a: VistaBattaglia | null, b: VistaBattaglia): boolean {
  if (!a) return false;
  for (const k of Object.keys(b) as (keyof VistaBattaglia)[]) {
    if (k === 'squadre' || k === 'munizioni') continue;
    if (a[k] !== b[k]) return false;
  }
  for (const i of [0, 1] as const) {
    const x = a.squadre[i], y = b.squadre[i];
    if (x.pvTotali !== y.pvTotali || x.vivi !== y.vivi || x.ciurma !== y.ciurma || x.controllo !== y.controllo) return false;
  }
  const ka = Object.keys(a.munizioni), kb = Object.keys(b.munizioni);
  if (ka.length !== kb.length) return false;
  for (const k of kb as (keyof typeof b.munizioni)[]) if (a.munizioni[k] !== b.munizioni[k]) return false;
  return true;
}
