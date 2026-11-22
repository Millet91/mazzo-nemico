// HUD di battaglia (00 §3 e §9.16, design M1 §6, m1-ritmo §1-3), sopra il canvas. Progettato a 800×360 CSS.
//
// [II] [PV + emblema A]   ⏱ timer  ~vento~   [PV + emblema B]
//                                                      [⌖] (solo col pirata fuori schermo)
//
//  (suggerimento)
//                                             [armi in fila: solo quelle che ho]
//      [balzo]                                              [miccia] [ARMA]
//   [◀]       [▶]  [sali][scendi]      ⚠ avviso · 45° · 60%         [FUOCO]  (in fuga: [FATTO])
//
// Comandi v3 (21/11, il proprietario ha bocciato i joystick: coprivano la visuale): niente joystick. Si mira
// trascinando il mirino oro attaccato al pirata, che è disegnato e toccato sul canvas (render/mirino.ts,
// render/input.ts). Qui restano pochi tasti piccoli e trasparenti ai bordi: frecce e salto a sinistra, FUOCO
// e ARMA a destra; [sali][scendi] compaiono solo vicino a una scala o liana. Tutto il resto dello schermo è
// della visuale. Nel turno del giocatore le frecce restano a schermo anche in volo (spente), così la fuga
// parte senza rialzare il dito. Fase 1: il salto è il Balzo, con l'icona di quello che farebbe adesso
// (VistaBattaglia.balzo); sali e scendi vanno "in un tocco"; in fuga FUOCO lascia il posto a FATTO.
// Con "Comandi classici": [◀][▶] … [▲][▼] [SALTA][FUOCO] come prima.
// Mancini: i due lati si scambiano. I tasti usano i pointer event (non click) così due pollici lavorano insieme.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { bus, type VistaBattaglia, type VistaSquadra } from '../../core/bus';
import { COLORI_CIURMA } from '../../core/palette';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import {
  alzo, balzoDi, barraVento, comandiVisibili, comandoBalzo, creaFrecce, creaGrilletto, creaGrillettoUnico, creaRipetitore,
  fattoVisibile, frazioneTimer, micciaSuccessiva, miraAttiva, PASSO_MIRA, usaMiccia, type Balzo,
} from './logica';
import { apriPausa, banner, cambiaVelocitaIa, grigliaAperta, invia, velocitaIa } from './stato';
import { EMBLEMA, ICONA_ARMA } from './segnaposto';
import { comandiClassici, mancini, mirinoUsato, segnaMirinoUsato } from '../preferenze';
import { suona } from '../../piattaforma/audio';
import { GrigliaArmi } from './GrigliaArmi';

/** Tasto di battaglia: `giu` al tocco, `su` al rilascio (anche se il dito scivola fuori o il sistema lo annulla). */
function Tasto(p: {
  id: string; label: string; cls?: string; disabilitato?: boolean; children: ComponentChildren;
  giu: () => void; su?: () => void;
}) {
  const fine = (e: PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    try { if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); } catch { /* niente */ }
    el.classList.remove('premuto');
    p.su?.();
  };
  return (
    <button type="button" id={p.id} data-testid={p.id} class={`tasto ${p.cls ?? ''}`} aria-label={p.label} disabled={p.disabilitato}
      onPointerDown={(e) => {
        if (p.disabilitato) return;
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
        try { el.setPointerCapture(e.pointerId); } catch { /* puntatore sintetico o già rilasciato */ }
        el.classList.add('premuto');
        tocco();
        suona('tocco');
        p.giu();
      }}
      onPointerUp={fine} onPointerCancel={fine} onLostPointerCapture={(e) => (e.currentTarget as HTMLElement).classList.remove('premuto')}
      onContextMenu={(e) => e.preventDefault()}>
      {p.children}
    </button>
  );
}

function BarraSquadra({ sq, lato }: { sq: VistaSquadra; lato: 0 | 1 }) {
  const c = COLORI_CIURMA[sq.ciurma];
  const f = sq.pvIniziali > 0 ? Math.max(0, sq.pvTotali / sq.pvIniziali) : 0;
  const nome = T.ciurme[sq.ciurma].nome;
  return (
    <div class={`squadra lato-${lato}`} data-testid={`squadra-${lato}`} role="img" aria-label={T.battaglia.ciurmaPv(nome, sq.pvTotali, sq.vivi)}>
      <span class="emblema" style={{ background: c.colore, borderColor: c.scuro }}>{EMBLEMA[sq.ciurma]}</span>
      <span class="barra-pv">
        <span class="riempi" style={{ width: `${f * 100}%`, background: c.colore }} />
      </span>
      <span class="pv-numero">{sq.pvTotali}</span>
    </div>
  );
}

function Timer({ v, totale }: { v: VistaBattaglia; totale: number }) {
  const f = frazioneTimer(v.secondiRimasti, totale);
  const urgente = v.timerAvviato && v.secondiRimasti <= 5;
  return (
    <div class={`timer ${v.timerAvviato ? '' : 'fermo'} ${urgente ? 'urgente' : ''}`} data-testid="timer" role="timer" aria-label={T.battaglia.timer}
      style={{ '--f': `${f * 360}deg` } as Record<string, string>}>
      <span>{v.secondiRimasti}</span>
    </div>
  );
}

function Vento({ v }: { v: VistaBattaglia }) {
  const { verso, frazione } = barraVento(v.vento, v.ventoMax);
  return (
    <div class="vento" data-testid="vento" role="img" aria-label={`${T.battaglia.vento} ${v.vento}`}>
      <span class={`freccia verso-${verso}`}>{verso === 0 ? '•' : verso > 0 ? '➜' : '➜'}</span>
      <span class="barra-vento">
        <span class="riempi" style={{ width: `${frazione * 50}%`, [verso < 0 ? 'right' : 'left']: '50%' }} />
        <span class="centro" />
      </span>
    </div>
  );
}

/** ARMA: icona grande dell'arma su un cerchio nel colore della ciurma (m1-ritmo §2). */
function TastoArma({ v, attivo }: { v: VistaBattaglia; attivo: boolean }) {
  const c = COLORI_CIURMA[v.squadre[v.squadraDiTurno].ciurma];
  return (
    <Tasto id="tasto-arma" label={T.battaglia.armaAiuto} cls="arma" disabilitato={!attivo}
      giu={() => (grigliaAperta.value = !grigliaAperta.value)}>
      <span class="cerchio-arma" style={{ background: c.colore, borderColor: c.scuro }}>
        <span class="icona-arma">{ICONA_ARMA[v.arma]}</span>
      </span>
    </Tasto>
  );
}

function ChipMiccia({ v, attivo }: { v: VistaBattaglia; attivo: boolean }) {
  return (
    <Tasto id="chip-miccia" label={T.battaglia.micciaAiuto} cls="chip" disabilitato={!attivo}
      giu={() => invia({ t: 'miccia', secondi: micciaSuccessiva(v.miccia, v.arma) })}>
      ⏲ {T.battaglia.miccia(v.miccia)}
    </Tasto>
  );
}

const ICONE = {
  sinistra: 'M15 5 7 12l8 7z',
  destra: 'M9 5l8 7-8 7z',
  su: 'M5 15l7-8 7 8z',
  giu: 'M5 9l7 8 7-8z',
};
function Icona({ d }: { d: string }) {
  return <svg class="icona" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d={d} fill="currentColor" /></svg>;
}
/**
 * Icone del Balzo, una per quello che farebbe adesso. Salto: doppia freccia in su col suolo sotto (Lead design: la
 * freccia curva sembrava "ripeti"). Scavalca: arco sopra un muretto. Afferra: scala con la freccia che entra.
 * Stacca: freccia che esce dalla scala. Muro: parete a sinistra e freccia che se ne va in diagonale.
 */
const ICONE_BALZO: Record<Balzo, ComponentChildren> = {
  salto: <><path d="M6 11l6-6 6 6" /><path d="M6 17l6-6 6 6" /><path d="M8 21.5h8" stroke-width="2" opacity=".7" /></>,
  scavalca: <><path d="M3.5 17c1.5-8 8-11 13.5-7" /><path d="M13.5 6.5 17.5 10l-4.5 2.2" /><path d="M10 21.5v-6h6v6" stroke-width="2" opacity=".7" /></>,
  afferra: <><path d="M15 3v19M21 3v19M15 8h6M15 13.5h6M15 19h6" stroke-width="2" opacity=".7" /><path d="M2.5 13.5h9" /><path d="M8 10l3.5 3.5L8 17" /></>,
  stacca: <><path d="M3 3v19M9 3v19M3 8h6M3 13.5h6M3 19h6" stroke-width="2" opacity=".7" /><path d="M12 15.5 20 7.5" /><path d="M14.5 7h6v6" /></>,
  muro: <><path d="M4 2.5v19" stroke-width="3" opacity=".7" /><path d="M8 18 19 7" /><path d="M12 6.5h7.5V14" /></>,
};
function IconaBalzo({ b }: { b: Balzo }) {
  return (
    <svg class="icona" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      {ICONE_BALZO[b]}
    </svg>
  );
}

/** Un pirata sta sotto i tasti di quel gruppo (PIANO §2 n.10): il gruppo diventa quasi trasparente e lo lascia vedere. */
function sottoTasti(v: VistaBattaglia, gruppo: 'muovi' | 'tiro'): boolean {
  const s = v.pirataSottoTasti;
  if (!s) return false;
  if (s === 'entrambi') return true;
  // di norma il movimento sta a sinistra e il tiro a destra; coi mancini si scambiano
  return (s === 'sx') === ((gruppo === 'muovi') !== mancini.value);
}

/**
 * Movimento (comandi v3): ◀ ▶ piccole e trasparenti, Balzo sopra; vicino a una scala o liana compaiono sali e
 * scendi. `accesa` = la sim accetta il movimento (azione e fuga); spente restano a schermo e ricordano il dito.
 * Balzo, sali e scendi partono al tocco: la sim porta il pirata in cima o in fondo da sola ("in un tocco") e lo
 * ferma col tasto opposto, quindi al rilascio non si manda niente.
 */
function PadMovimento({ v, accesa }: { v: VistaBattaglia; accesa: boolean }) {
  const frecce = useMemo(() => creaFrecce(invia, () => bus.battaglia.peek()?.arrampicata === 'appeso'), []);
  const acc = useRef(accesa);
  acc.current = accesa;
  const arrampica = (dir: -1 | 1) => { if (acc.current) invia({ t: 'arrampica', dir }); };
  // il Balzo legge la vista del momento del tocco, non quella dell'ultimo disegno dell'HUD
  const balza = () => { if (acc.current) invia(comandoBalzo(balzoDi(bus.battaglia.peek()))); };
  useEffect(() => { frecce.attiva(accesa); }, [accesa]);
  const scala = (v.arrampicata ?? 'libero') !== 'libero';
  const coperto = sottoTasti(v, 'muovi');
  const b = balzoDi(v);
  // se il turno finisce col dito sopra, il pirata si ferma
  useEffect(() => () => { frecce.attiva(false); }, []);
  return (
    <div class={`pad-muovi ${accesa ? '' : 'spento'} ${scala ? 'con-scala' : ''} ${coperto ? 'sopra-pirata' : ''}`} data-testid="pad-muovi">
      <Tasto id="tasto-sinistra" label={T.battaglia.sinistra} cls="mini" giu={() => frecce.premi(-1)} su={() => frecce.rilascia(-1)}>
        <span class="disco"><Icona d={ICONE.sinistra} /></span>
      </Tasto>
      <Tasto id="tasto-destra" label={T.battaglia.destra} cls="mini" giu={() => frecce.premi(1)} su={() => frecce.rilascia(1)}>
        <span class="disco"><Icona d={ICONE.destra} /></span>
      </Tasto>
      <Tasto id="tasto-salta" label={T.battaglia.balzo[b]} cls={`mini balzo-${b}`} giu={balza}>
        <span class="disco" data-balzo={b}><IconaBalzo b={b} /></span>
      </Tasto>
      {scala && (
        <>
          <Tasto id="tasto-sali" label={T.battaglia.sali} cls="mini scala" giu={() => arrampica(-1)}>
            <span class="disco"><Icona d={ICONE.su} /></span>
          </Tasto>
          <Tasto id="tasto-scendi" label={T.battaglia.scendi} cls="mini scala" giu={() => arrampica(1)}>
            <span class="disco"><Icona d={ICONE.giu} /></span>
          </Tasto>
        </>
      )}
    </div>
  );
}

/**
 * FUOCO (comandi v3): spara al rilascio del dito dentro il tasto (scivolando fuori si annulla) e una volta sola
 * per turno. Con la tastiera (Invio o Spazio) spara subito.
 */
function TastoFuoco({ turno, avviso }: { turno: number; avviso?: 'vicino' | 'danno' }) {
  const [premuto, setPremuto] = useState(false);
  const g = useMemo(() => creaGrilletto(() => invia({ t: 'fuoco' })), []);
  const dentro = (e: PointerEvent): boolean => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) <= r.width / 2 + 10;
  };
  return (
    <button type="button" id="tasto-fuoco" data-testid="tasto-fuoco" class={`tasto fuoco testo ${premuto ? 'premuto' : ''} ${avviso ? `avviso-${avviso}` : ''}`}
      aria-label={avviso ? `${T.battaglia.fuoco}. ${T.battaglia.avvisoTiro[avviso]}` : T.battaglia.fuoco}
      onPointerDown={(e) => {
        e.preventDefault();
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* puntatore sintetico */ }
        g.premi();
        setPremuto(true);
        tocco();
      }}
      onPointerMove={(e) => { if (g.premuto) setPremuto(dentro(e)); }}
      onPointerUp={(e) => {
        if (g.rilascia(dentro(e), turno)) suona('tocco');
        setPremuto(false);
      }}
      onPointerCancel={() => { g.annulla(); setPremuto(false); }} onLostPointerCapture={() => setPremuto(false)}
      onClick={(e) => { if (e.detail === 0) { g.premi(); g.rilascia(true, turno); } }}
      onContextMenu={(e) => e.preventDefault()}>
      {T.battaglia.fuoco}
    </button>
  );
}

/**
 * FATTO (Fase 1): in fuga chiude subito il turno. Sta dove c'era FUOCO (stesso lato, stesso pollice), 64 px.
 * Nella fuga il dito è già lì perché ha appena sparato: un tocco e passa il turno.
 */
function BottoneFatto() {
  return <Tasto id="tasto-fatto" label={T.battaglia.fattoAiuto} cls="fatto testo" giu={() => invia({ t: 'fatto' })}>{T.battaglia.fatto}</Tasto>;
}
function TastoFatto({ coperto }: { coperto: boolean }) {
  return <div class={`pad-tiro ${coperto ? 'sopra-pirata' : ''}`} data-testid="pad-fatto"><BottoneFatto /></div>;
}

export function Hud({ v }: { v: VistaBattaglia }) {
  const cfg = bus.richiestaBattaglia.value;
  const vedi = comandiVisibili(v);
  // turno del giocatore, in qualunque fase: le frecce restano a schermo
  const mioTurno = v.tocca === 'umano' && !v.esito && v.fase !== 'fine';
  const mira = miraAttiva(v);

  // tasti a tempo: si creano una volta e si fermano quando il componente sparisce o il turno cambia
  const t = useMemo(() => ({
    su: creaRipetitore(() => invia({ t: 'ruotaMira', delta: PASSO_MIRA })),
    giu: creaRipetitore(() => invia({ t: 'ruotaMira', delta: -PASSO_MIRA })),
    fuoco: creaGrillettoUnico(() => invia({ t: 'fuoco' })),
  }), []);
  useEffect(() => () => { t.su.rilascia(); t.giu.rilascia(); }, [t]);
  useEffect(() => {
    if (!mira) { t.su.rilascia(); t.giu.rilascia(); }
  }, [mira, t]);

  // il suggerimento "trascina il mirino" sparisce per sempre alla prima mira
  useEffect(() => bus.comandi.ascolta((c) => { if (c.t === 'mira' && !mirinoUsato.value) void segnaMirinoUsato(); }), []);

  const fermaCammino = () => invia({ t: 'muovi', dir: 0 });
  const conMiccia = usaMiccia(v.arma);

  return (
    <div class={`hud ${mancini.value ? 'mancini' : ''}`} data-testid="hud">
      <div class="hud-alto">
        <button type="button" id="pausa" class="tasto-pausa" aria-label={T.battaglia.pausa}
          onClick={() => { tocco(); apriPausa(); }}>II</button>
        <BarraSquadra sq={v.squadre[0]} lato={0} />
        <div class="centro-alto">
          <div class="blocco-timer">
            <Timer v={v} totale={cfg?.timerSecondi ?? 30} />
            <span class="turno-piccolo" data-testid="turno">{T.battaglia.turno(v.numeroTurno, v.turnoLimite)}</span>
          </div>
          <Vento v={v} />
        </div>
        <BarraSquadra sq={v.squadre[1]} lato={1} />
      </div>

      {v.pirataFuoriVista && !v.esito && (
        <button type="button" id="ricentra" data-testid="ricentra" class="tasto-ricentra" aria-label={T.battaglia.ricentra}
          onClick={() => { tocco(); bus.azioni.invia({ t: 'ricentra' }); }}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      )}

      {banner.value && <div class="banner" role="status" data-testid="banner" key={banner.value}>{banner.value}</div>}

      {v.iaPensa && !v.esito && (
        <div class="medita" data-testid="medita" role="status">{T.battaglia.medita}</div>
      )}

      {vedi && <div class={`mira-info ${comandiClassici.value ? '' : 'v3'}`} data-testid="mira">{T.battaglia.mira(alzo(v.miraGradi), Math.round(v.potenza))}</div>}
      {mira && v.avvisoTiro && !grigliaAperta.value && (
        <div class={`avviso-tiro ${v.avvisoTiro} ${comandiClassici.value ? '' : 'v3'}`} data-testid="avviso-tiro" role="status">{T.battaglia.avvisoTiro[v.avvisoTiro]}</div>
      )}

      {mioTurno && !comandiClassici.value && (
        <>
          <PadMovimento v={v} accesa={vedi} />
          {mira && (
            <div class={`pad-tiro ${sottoTasti(v, 'tiro') ? 'sopra-pirata' : ''}`} data-testid="pad-tiro">
              {conMiccia && <ChipMiccia v={v} attivo={mira} />}
              <TastoArma v={v} attivo={mira} />
              <TastoFuoco turno={v.numeroTurno} avviso={v.avvisoTiro} />
            </div>
          )}
          {mira && !mirinoUsato.value && v.arma !== 'sciabola' && !grigliaAperta.value && (
            <div class="suggerimento-mirino" data-testid="suggerimento-mirino" role="status">
              {T.battaglia.suggerimentoMirino.map((r) => <span key={r}>{r}</span>)}
            </div>
          )}
        </>
      )}

      {vedi && comandiClassici.value && (
        <>
          <div class="gruppo gruppo-muovi">
            <Tasto id="tasto-sinistra" label={T.battaglia.sinistra} giu={() => invia({ t: 'muovi', dir: -1 })} su={fermaCammino}>◀</Tasto>
            <Tasto id="tasto-destra" label={T.battaglia.destra} giu={() => invia({ t: 'muovi', dir: 1 })} su={fermaCammino}>▶</Tasto>
          </div>

          <div class="gruppo gruppo-azione">
            <Tasto id="tasto-su" label={T.battaglia.su} disabilitato={!mira} giu={() => t.su.premi()} su={() => t.su.rilascia()}>▲</Tasto>
            <Tasto id="tasto-giu" label={T.battaglia.giu} disabilitato={!mira} giu={() => t.giu.premi()} su={() => t.giu.rilascia()}>▼</Tasto>
            <span class="spazio" />
            <div class="colonna">
              {conMiccia && <ChipMiccia v={v} attivo={mira} />}
              <Tasto id="tasto-salta" label={T.battaglia.balzo[balzoDi(v)]} cls="testo"
                giu={() => invia(comandoBalzo(balzoDi(bus.battaglia.peek())))}>{T.battaglia.salta}</Tasto>
            </div>
            <div class="colonna">
              <TastoArma v={v} attivo={mira} />
              {fattoVisibile(v) ? <BottoneFatto /> : (
                <Tasto id="tasto-fuoco" label={T.battaglia.fuoco} cls={`fuoco testo ${v.avvisoTiro ? `avviso-${v.avvisoTiro}` : ''}`} disabilitato={!mira}
                  giu={() => t.fuoco.tocca(v.numeroTurno)}>{T.battaglia.fuoco}</Tasto>
              )}
            </div>
          </div>
        </>
      )}

      {fattoVisibile(v) && !comandiClassici.value && <TastoFatto coperto={sottoTasti(v, 'tiro')} />}

      {v.tocca === 'ia' && !v.esito && (
        <div class="gruppo gruppo-azione">
          <Tasto id="tasto-veloce" label={T.battaglia.veloce} cls={`veloce testo ${velocitaIa.value === 2 ? 'acceso' : ''}`}
            giu={cambiaVelocitaIa}>{T.battaglia.velocita(2)}</Tasto>
        </div>
      )}

      {grigliaAperta.value && mira && <GrigliaArmi v={v} />}
    </div>
  );
}
