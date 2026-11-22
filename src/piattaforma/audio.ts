// Ponte verso il motore audio (src/audio, studio v2). Qui resta solo quello che serve a chi sta fuori dall'audio:
// - `suona('tocco')`: i tasti dell'HUD che reagiscono alla pressione chiedono "il suono del tasto"; quale suono sia
//   lo decide il motore (P1-contratti §4: nessun altro modulo sceglie i suoni);
// - `sbloccaAudio()`: browser e WebView fanno partire l'audio solo dopo un tocco.
// I suoni della battaglia NON passano più da qui: il motore ascolta da solo `bus.eventiBattaglia`.
import { sbloccaAudio, suonaTasto } from '../audio';

export type Suono = 'tocco';

export function suona(_s: Suono): void { suonaTasto(); }

export { sbloccaAudio };
