// Pausa (anche dal tasto indietro di Android) ed esito della battaglia (pannello pergamena 60% × 75%).
import { bus, type VistaBattaglia } from '../../core/bus';
import { BIL } from '../../contenuti/bilanciamento';
import { COLORI_CIURMA } from '../../core/palette';
import { T } from '../../testi/it';
import { tocco } from '../../piattaforma/haptics';
import { arrenditi, esci, rigioca, riprendi } from './stato';
import { squadraUmana } from './logica';
import { EMBLEMA } from './segnaposto';

function Bottone(p: { id: string; tipo: 'primario' | 'secondario' | 'pericolo'; onClick: () => void; disabilitato?: boolean; children: string }) {
  return (
    <button type="button" id={p.id} class={`btn ${p.tipo}`} disabled={p.disabilitato}
      onClick={() => { tocco(); p.onClick(); }}>{p.children}</button>
  );
}

export function Pausa({ v }: { v: VistaBattaglia | null }) {
  if (!bus.battagliaInPausa.value) return null;
  const puo = !!v?.puoArrendersi;
  return (
    <div class="scrim-battaglia" data-testid="pausa">
      <section class="pannello-abisso" role="dialog" aria-modal="true" aria-labelledby="titolo-pausa">
        <h2 id="titolo-pausa">{T.pausa.titolo}</h2>
        {v && <p class="sotto">{T.pausa.turno(v.numeroTurno, v.turnoLimite)}</p>}
        <div class="voci">
          <Bottone id="riprendi" tipo="primario" onClick={riprendi}>{T.pausa.riprendi}</Bottone>
          {v?.squadre[squadraUmana(v)].controllo === 'umano' && (
            <>
              <Bottone id="arrenditi" tipo="pericolo" disabilitato={!puo} onClick={arrenditi}>{T.pausa.arrenditi}</Bottone>
              {!puo && <p class="nota">{T.pausa.arrenditiDa(BIL.battaglia.ritirataDalTurno)}</p>}
            </>
          )}
          <Bottone id="esci" tipo="secondario" onClick={esci}>{T.pausa.esci}</Bottone>
        </div>
      </section>
    </div>
  );
}

export function Esito({ v }: { v: VistaBattaglia }) {
  const e = v.esito;
  if (!e) return null;
  const io = squadraUmana(v);
  const vinto = e.vincitore === io;
  const motivo = e.motivo === 'tempo' ? T.esito.tempo : e.motivo === 'ritirata' ? T.esito.ritirata
    : vinto ? T.esito.eliminazione : T.esito.eliminazioneSubita;
  return (
    <div class="scrim-battaglia" data-testid="esito">
      <section class={`pergamena ${vinto ? 'vinto' : 'perso'}`} role="dialog" aria-modal="true" aria-labelledby="titolo-esito">
        <h2 id="titolo-esito">{vinto ? T.esito.vittoria : T.esito.sconfitta}</h2>
        <p class="motivo">{motivo}</p>
        <div class="superstiti">
          <span class="etichetta">{T.esito.superstiti}</span>
          {([0, 1] as const).map((lato) => {
            const sq = v.squadre[lato];
            const c = COLORI_CIURMA[sq.ciurma];
            return (
              <div class="riga" key={lato} data-testid={`superstiti-${lato}`}>
                <span class="emblema" style={{ background: c.colore, borderColor: c.scuro }}>{EMBLEMA[sq.ciurma]}</span>
                <span class="nome">{T.ciurme[sq.ciurma].nome}</span>
                <span class="numero">{e.superstiti[lato]} / {sq.iniziali}</span>
              </div>
            );
          })}
          <span class="turni">{T.esito.turni(e.turni)}</span>
        </div>
        <div class="azioni">
          <Bottone id="menu" tipo="secondario" onClick={esci}>{T.esito.menu}</Bottone>
          <Bottone id="rigioca" tipo="primario" onClick={rigioca}>{T.esito.rigioca}</Bottone>
        </div>
      </section>
    </div>
  );
}
