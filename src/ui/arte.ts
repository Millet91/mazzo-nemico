// Registro della grafica provvisoria. Quando arrivano le illustrazioni (Magnific),
// qui si restituisce un <img> al posto dell'emoji: il resto dell'interfaccia non cambia.
import { CARTE, CartaId, NEMICI, NemicoId } from '../game/carte';

export const arteNemico = (id: NemicoId): string => NEMICI[id].icona;
export const arteCarta = (id: CartaId): string => CARTE[id].icona;
