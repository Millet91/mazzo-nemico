// Le righe audio di Impostazioni: due cursori, musica ed effetti (con voci e tasti). Da 0 a 100 a passi di 5.
import { T } from '../testi/it';
import { salvaPreferenzeAudio, volumeEffetti, volumeMusica } from './preferenze';
import { scattoCursore } from './index';
import type { Signal } from '@preact/signals-core';

function Cursore(p: { id: string; etichetta: string; nota: string; valore: Signal<number> }) {
  const percento = Math.round(p.valore.value * 100);
  const testo = T.impostazioni.volumeValore(percento);
  return (
    <label class="cursore" for={p.id}>
      <span class="testi"><span class="etichetta">{p.etichetta}</span><span class="nota">{p.nota}</span></span>
      <input type="range" id={p.id} min={0} max={100} step={5} value={percento} aria-valuetext={testo}
        onInput={(e) => {
          const v = Number((e.currentTarget as HTMLInputElement).value) / 100;
          if (v === p.valore.value) return;
          p.valore.value = v;
          scattoCursore();
        }}
        onChange={() => void salvaPreferenzeAudio()} />
      <span class="stato-interruttore" data-testid={`${p.id}-valore`}>{testo}</span>
    </label>
  );
}

export function RigheAudio() {
  return (
    <>
      <Cursore id="volume-musica" etichetta={T.impostazioni.volumeMusica} nota={T.impostazioni.volumeMusicaNota} valore={volumeMusica} />
      <Cursore id="volume-effetti" etichetta={T.impostazioni.volumeEffetti} nota={T.impostazioni.volumeEffettiNota} valore={volumeEffetti} />
    </>
  );
}
