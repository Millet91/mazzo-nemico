// HUD di battaglia (00 §3, design M1 §6), sopra il canvas. Progettato a 800×360 CSS.
//
// [II] [PV + emblema A]   ⏱ timer  ~vento~   [PV + emblema B]
//                                                 [ARMA]
// [ ◀ ][ ▶ ]                           [▲][▼]   [SALTA][ FUOCO ]
//
// I tasti usano i pointer event (non click) così due pollici lavorano insieme (caso 22).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import { bus, type VistaBattaglia, type VistaSquadra } from '../../core/bus';
import { COLORI_CIURMA } from '../../core/palette';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import {
  alzo, barraVento, comandiVisibili, creaDoppioTocco, creaGrillettoUnico, creaRipetitore, frazioneTimer,
  micciaSuccessiva, miraAttiva, PASSO_MIRA, usaMiccia,
} from './logica';
import { apriPausa, banner, grigliaAperta, invia } from './stato';
import { EMBLEMA, ICONA_ARMA } from './segnaposto';
import { mancini } from '../preferenze';
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
    <button type="button" id={p.id} class={`tasto ${p.cls ?? ''}`} aria-label={p.label} disabled={p.disabilitato}
      onPointerDown={(e) => {
        if (p.disabilitato) return;
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
        try { el.setPointerCapture(e.pointerId); } catch { /* puntatore sintetico o già rilasciato */ }
        el.classList.add('premuto');
        tocco();
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

export function Hud({ v }: { v: VistaBattaglia }) {
  const cfg = bus.richiestaBattaglia.value;
  const vedi = comandiVisibili(v);
  const mira = miraAttiva(v);

  // tasti a tempo: si creano una volta e si fermano quando il componente sparisce o il turno cambia
  const t = useMemo(() => ({
    su: creaRipetitore(() => invia({ t: 'ruotaMira', delta: PASSO_MIRA })),
    giu: creaRipetitore(() => invia({ t: 'ruotaMira', delta: -PASSO_MIRA })),
    salta: creaDoppioTocco(() => invia({ t: 'salta', indietro: false }), () => invia({ t: 'salta', indietro: true })),
    fuoco: creaGrillettoUnico(() => invia({ t: 'fuoco' })),
  }), []);
  useEffect(() => () => { t.su.rilascia(); t.giu.rilascia(); t.salta.annulla(); }, [t]);
  useEffect(() => {
    if (!mira) { t.su.rilascia(); t.giu.rilascia(); }
    if (!vedi) t.salta.annulla();
  }, [mira, vedi, t]);

  const fermaCammino = () => invia({ t: 'muovi', dir: 0 });
  const conMiccia = usaMiccia(v.arma);

  return (
    <div class={`hud ${mancini.value ? 'mancini' : ''}`} data-testid="hud">
      <div class="hud-alto">
        <button type="button" id="pausa" class="tasto-pausa" aria-label={T.battaglia.pausa}
          onClick={() => { tocco(); apriPausa(); }}>II</button>
        <BarraSquadra sq={v.squadre[0]} lato={0} />
        <div class="centro-alto">
          <Timer v={v} totale={cfg?.timerSecondi ?? 30} />
          <Vento v={v} />
        </div>
        <BarraSquadra sq={v.squadre[1]} lato={1} />
      </div>

      {banner.value && <div class="banner" role="status" data-testid="banner" key={banner.value}>{banner.value}</div>}

      {v.tocca === 'ia' && !v.esito && (
        <div class="medita" data-testid="medita" role="status">{T.battaglia.medita}</div>
      )}

      {vedi && (
        <>
          <div class="mira-info" data-testid="mira">{T.battaglia.mira(alzo(v.miraGradi), Math.round(v.potenza))}</div>

          <div class="gruppo gruppo-muovi">
            <Tasto id="tasto-sinistra" label={T.battaglia.sinistra} giu={() => invia({ t: 'muovi', dir: -1 })} su={fermaCammino}>◀</Tasto>
            <Tasto id="tasto-destra" label={T.battaglia.destra} giu={() => invia({ t: 'muovi', dir: 1 })} su={fermaCammino}>▶</Tasto>
          </div>

          <div class="gruppo gruppo-azione">
            <Tasto id="tasto-su" label={T.battaglia.su} disabilitato={!mira} giu={() => t.su.premi()} su={() => t.su.rilascia()}>▲</Tasto>
            <Tasto id="tasto-giu" label={T.battaglia.giu} disabilitato={!mira} giu={() => t.giu.premi()} su={() => t.giu.rilascia()}>▼</Tasto>
            <span class="spazio" />
            <div class="colonna">
              {conMiccia && (
                <Tasto id="chip-miccia" label={T.battaglia.micciaAiuto} cls="chip" disabilitato={!mira}
                  giu={() => invia({ t: 'miccia', secondi: micciaSuccessiva(v.miccia, v.arma) })}>
                  ⏲ {T.battaglia.miccia(v.miccia)}
                </Tasto>
              )}
              <Tasto id="tasto-salta" label={T.battaglia.saltaAiuto} cls="testo" giu={() => t.salta.tocca()}>{T.battaglia.salta}</Tasto>
            </div>
            <div class="colonna">
              <Tasto id="tasto-arma" label={T.battaglia.armaAiuto} cls="arma" disabilitato={!mira}
                giu={() => (grigliaAperta.value = !grigliaAperta.value)}>
                <span class="icona-arma">{ICONA_ARMA[v.arma]}</span>
              </Tasto>
              <Tasto id="tasto-fuoco" label={T.battaglia.fuoco} cls="fuoco testo" disabilitato={!mira}
                giu={() => t.fuoco.tocca(v.numeroTurno)}>{T.battaglia.fuoco}</Tasto>
            </div>
          </div>
        </>
      )}

      {grigliaAperta.value && mira && <GrigliaArmi v={v} />}
    </div>
  );
}
